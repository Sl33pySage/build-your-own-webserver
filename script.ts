import * as net from "net";

function newConn(socket: net.Socket): void {
  console.log("New Connection", socket.remoteAddress, socket.remotePort);

  socket.on("end", () => {
    //FIN recieved. The connection will be closed automatically.
    console.log("EOF.");
  });
  socket.on("data", (data: Buffer) => {
    console.log("Data: ", data);
    socket.write(data); // Echo back the data.

    // Actively closes the connection if the data contains 'q'
    if (data.includes("q")) {
      console.log("Closing connection...");
      socket.end(); // This will send FIN and close the connection.
    }
  });
}

let server = net.createServer();
server.on("error", (err: Error) => {
  throw err;
});
server.on("connection", newConn);
server.listen({ host: "127.0.0.1", port: 1234 });
