const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

app.use(cors());

let rooms = {}; // { roomCode: { users: [username], password: "1234" } }

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle room creation (always allows creation)
  socket.on("create_room", ({ roomCode, username, password }) => {
    rooms[roomCode] = { users: [], password }; // No check for existing room
    rooms[roomCode].users.push(username);
    socket.join(roomCode);
    io.to(roomCode).emit("update_users", rooms[roomCode].users);
  });

  // Handle joining a room
  socket.on("join_room", ({ roomCode, username, password }) => {
    if (!rooms[roomCode]) {
      socket.emit("error", "Room does not exist. Please create a new room.");
      return;
    }
    if (rooms[roomCode].password !== password) {
      socket.emit("error", "Incorrect room password.");
      return;
    }
    rooms[roomCode].users.push(username);
    socket.join(roomCode);
    io.to(roomCode).emit("update_users", rooms[roomCode].users);
  });

  // Handle sending messages
  socket.on("send_message", ({ roomCode, username, message }) => {
    const timestamp = new Date().toLocaleTimeString();
    const messageData = { username, message, timestamp };
    console.log(`[${timestamp}] ${username} in room ${roomCode}: ${message}`
    io.to(roomCode).emit("receive_message", messageData);
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((roomCode) => {
      rooms[roomCode].users = rooms[roomCode].users.filter(
        (user) => user !== socket.username
      );
      if (rooms[roomCode].users.length === 0) {
        delete rooms[roomCode]; // Remove room if no users left
      } else {
        io.to(roomCode).emit("update_users", rooms[roomCode].users);
      }
    });
  });
});

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});
