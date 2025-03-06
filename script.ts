import { error } from "console";
import * as net from "net";

let Server = net.createServer();
Server.listen({ host: "127.0.0.1", port: 1234 });

function newConn(socket: net.Socket): void {
  console.log("New Connection", socket.remoteAddress, socket.remotePort);
}

let server = net.createServer();
server.on("connection", newConn);
server.listen({ host: "127.0.0.1", port: 1234 });
server.on("error", (err: Error) => {
  throw error;
});
