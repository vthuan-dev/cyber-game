import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import { routes } from "./route";
import { Server } from "socket.io";
import http from "http";
import { connection } from "./database";
import orderRoomDetailRouter from "./route/order/order-room-detail";

dotenv.config();
const PORT = process.env.PORT;
const CLIENT_URL = process.env.CLIENT_URL;
const app = express();

// Tạo HTTP server
const server = http.createServer(app);

// Khởi tạo Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Thêm ngay sau khi khởi tạo io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
routes.forEach((item) =>
  item.routes.forEach((route) =>
    app.use("/api" + item.prefix + route.path, route.route)
  )
);

// Đăng ký route
app.use('/api/order-room-detail', orderRoomDetailRouter);

// Socket.IO events
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join room khi user vào conversation
  socket.on("join_conversation", (conversation_id) => {
    socket.join(`conversation_${conversation_id}`);
    console.log(`User ${socket.id} joined conversation ${conversation_id}`);
  });

  // Xử lý tin nhắn mới
  socket.on("send_message", async (messageData) => {
    try {
      const { conversation_id, sender_id, message } = messageData;
      
      // Lưu tin nhắn vào database
      const [result] = await connection.promise().query(
        `INSERT INTO messages (conversation_id, sender_id, message)
         VALUES (?, ?, ?)`,
        [conversation_id, sender_id, message]
      );

      const newMessage = {
        id: result.insertId,
        ...messageData,
        created_at: new Date()
      };

      // Gửi tin nhắn đến tất cả users trong conversation
      io.to(`conversation_${conversation_id}`).emit("receive_message", newMessage);
      
      console.log(`Message sent in conversation ${conversation_id}`);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });


  // Xử lý typing status
  socket.on("typing", (data) => {
    const { conversation_id, username } = data;
    socket.to(`conversation_${conversation_id}`).emit("user_typing", username);
  });

  // Xử lý stop typing
  socket.on("stop_typing", (conversation_id) => {
    socket.to(`conversation_${conversation_id}`).emit("user_stop_typing");
  });

  // Thêm handler cho extend request
  socket.on("extend_request", (data) => {
    // Broadcast to all admins
    io.emit("new_extend_request", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
server.listen(PORT || 3000, () => {
  console.log("Server running on port:", PORT);
});

export default app;
