import * as net from "net";

async function newConn(socket: net.Socket): Promise<void> {
  console.log("New Connection", socket.remoteAddress, socket.remotePort);

  try {
    await serveClient(socket);
  } catch (exc) {
    console.error("exception", exc);
  } finally {
    socket.destroy();
  }
}

// echo server
async function serveClient(socket: net.Socket): Promise<void> {
  const conn: TCPConn = soInit(socket);
  while (true) {
    const data = await soRead(conn);
    if (data.length === 0) {
      console.log("End Connection");
      break;
    }
    console.log("data", data);
    await soWrite(conn, data);
  }
}

type TCPListener = {
  socket: net.Socket;
  // ...


};

function soListen(...): TCPListener;
function soAccept(listener: TCPListener): Promise<TCPConn>;


// PSEUDO CODE AND BUFFER EXAMPLES! BAD!
// while (need_more_data()) {
//   buf = Buffer.concat([buffer, data()])
// }
// buf = Buffer.concat([buf, data])
// A dynamic sized buffer
type DynBuf = {
  data: Buffer,
  length: number,
};

// append data to Dynbuf
function bufPush(buf: DynBuf, data: Buffer): void {
  const newLen = buf.length + data.length;
  if (buf.data.length < newLen) {
    //grow the capacity by the power of two
    let cap = Math.max(buf.data.length, 32);
    while (cap < newLen) {
      cap *= 2;
    }
    const grown = Buffer.alloc(cap);
    buf.data.copy(grown, 0, 0);
  }
  data.copy(buf.data, buf.length, 0);
  buf.length = newLen;
}


// 5.3 Implemeting a Message Protocol
// Step 1: The Server Loop
// At a high level, the server should be a loop
// TODO 1: Parse and remove a complete message from the incoming byte stream. Append some data to the buffer. Continue the loop if the message is incomplete.
// TODO 2: Handle the message.
// TODO 3: Send the response.
async function serveClient(socket: net.Socket): Promise<void> {
  const conn: TCPConn = soInit(socket);
  const buf: DynBuf = { data: Buffer.alloc(0), length: 0 };
  while (true) {
    // try to get 1 message from the buffer
    const msg: null | Buffer = cutMessage(buf);
    if (!msg) {
      // need more data
      const data: Buffer = await soRead(conn);
      bufPush(buf, data);
      // EOF?
      if (data.length === 0) {
        // omitted ...
        return;
      }
      // got some data, try it again
      continue;
    }
    // omitted. Process the message and send the response ...
  } // loop for messages
}


function cutMessage(buf: DynBuf): null | Buffer {
  // messages are seperated by "\n"
  
}


const server = net.createServer({
  pauseOnConnect: true, // Required by 'TCPConn'
});
server.on("error", (err: Error) => {
  throw err;
});
server.on("connection", newConn);
server.listen({ host: "127.0.0.1", port: 1234 });

function soRead(conn: TCPConn): Promise<Buffer>;
function soWrite(conn: TCPConn, data: Buffer): Promise<void>;

// A Promise-Based API for TCP sockets.
type TCPConn = {
  // the JS Socket Object
  socket: net.Socket;
  // from the 'error' event
  err: null | Error;
  // EOF, from the 'end' event
  ended: boolean;
  // the callbacks of a promise of the current read
  reader: null | {
    resolve: (value: Buffer) => void;
    reject: (reason: Error) => void;
  };
};

// Create a wrapper from net.Socket
function soInit(socket: net.Socket): TCPConn {
  const conn: TCPConn = {
    socket: socket,
    err: null,
    ended: false,
    reader: null,
  };

  socket.on("data", (data: Buffer) => {
    console.assert(conn.reader);
    //pause the 'data' event until the next read.
    conn.socket.pause();
    //fulfill the promise of the current read.
    conn.reader!.resolve(data);
    conn.reader = null;
  });
  socket.on("end", () => {
    // this also fulfills the current read.
    conn.ended = true;
    if (conn.reader) {
      conn.reader.resolve(Buffer.from("")); // EOF
      conn.reader = null;
    }
  });
  socket.on("error", (err: Error) => {
    // errors are also delivered to the current read.
    conn.err = err;
    if (conn.reader) {
      conn.reader.reject(err);
      conn.reader = null;
    }
  });
  return conn;
}

// Returns an empty 'Buffer' after EOF.
function soRead(conn: TCPConn): Promise<Buffer> {
  console.assert(!conn.reader); // no concurrent calls
  return new Promise((resolve, reject) => {
    // If the connection is not readable, complete the promise now.
    if (conn.err) {
      reject(conn.err);
      return;
    }
    if (conn.ended) {
      resolve(Buffer.from("")); // EOF
      return;
    }
    // Save the promise callbacks.
    conn.reader = { resolve: resolve, reject: reject };
    // and resume the 'data' event to fulfill the promise later.
    conn.socket.resume();
  });
}

function soWrite(conn: TCPConn, data: Buffer): Promise<void> {
  console.assert(data.length > 0);
  return new Promise((resolve, reject) => {
    if (conn.err) {
      reject(conn.err);
      return;
    }

    conn.socket.write(data, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
