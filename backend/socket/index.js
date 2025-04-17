import RoomActivity from "../models/activity.model.js";

export const setupSockets = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    socket.on("join-room", async ({ roomId }) => {
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", socket.id);

      // Log join to DB
      try {
        await RoomActivity.create({
          socketId: socket.id,
          roomId,
          userIP: socket.handshake.address,
        });
      } catch (err) {
        console.error("Error logging activity:", err.message);
      }
    });

    socket.on("send-message", ({ roomId, message }) => {
      io.to(roomId).emit("receive-message", { message, sender: socket.id });
    });

    socket.on("send-voice", ({ roomId, audioBlob }) => {
      socket.to(roomId).emit("receive-voice", { audioBlob, sender: socket.id });
    });

    socket.on("signal", ({ roomId, data }) => {
      socket.to(roomId).emit("signal", { data, from: socket.id });
    });

    socket.on("disconnect", async () => {
      console.log("❌ Client disconnected:", socket.id);

      // Update leftAt in DB
      try {
        await RoomActivity.findOneAndUpdate(
          { socketId: socket.id, leftAt: { $exists: false } },
          { leftAt: new Date() }
        );
      } catch (err) {
        console.error("Error updating leave time:", err.message);
      }
    });
  });
};
