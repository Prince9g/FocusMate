import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./utils/db.js";
import roomRoutes from "./routes/room.routes.js";
import { setupSockets } from "./socket/index.js";
import analyticsRoutes from "./routes/activity.routes.js";
import path from "path";



dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "https://focusmate-bay5.onrender.com/", 
    methods: ["GET", "POST"],
    credentials: true  // Add this
  },
  transports: ['websocket', 'polling'],  // Keep this
  connectionStateRecovery: {  // Add this
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  }
});

const _dirname = path.resolve();

app.use(cors());
app.use(express.json());
app.use("/api/rooms", roomRoutes);

app.use("/analytics", analyticsRoutes);
app.use(express.static(path.join(_dirname, "/frontend/dist")));
// app.get('*', (_, res)=>{
//   res.send(path.resolve(_dirname, "frontend", "dist", "index.html"));
// });

setupSockets(io);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
