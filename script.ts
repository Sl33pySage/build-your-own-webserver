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
while (need_more_data()) {
  buf = Buffer.concat([buffer, data()])
}
buf = Buffer.concat([buf, data])
// A dynamic sized buffer
type DynBuff = {
  data: Buffer,
  length: number,
};

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
