import * as net from "net";

let Server = net.createServer();
Server.listen({ host: "127.0.0.1", port: 1234 });
