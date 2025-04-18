import Room from "../models/room.model.js";
import RoomActivity from "../models/activity.model.js";

export const setupSockets = (io) => {
  io.use((socket, next) => {
    try {
      const { roomId, name } = socket.handshake.auth;
      if (!roomId || !name) {
        return next(new Error("Authentication failed"));
      }
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });
  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    // ======================
    // 1. Room Joining Logic
    // ======================
    socket.on("join-room", async ({ roomId, name, password }) => {
      try {
        // Verify room exists and password matches
        const room = await Room.findOne({ roomId, password });
        if (!room) {
          socket.emit("join-error", "Invalid room ID or password");
          return;
        }

        // Check if room is expired
        if (room.expiresAt < new Date()) {
          socket.emit("join-error", "This room has expired");
          return;
        }
        
        // Check if name is taken
        const nameExists = room.participants.some(
          (p) => p.name === name && !p.leftAt
        );
        if (nameExists) {
          socket.emit("join-error", "Name already taken in this room");
          return;
        }

        // Join the socket room
        socket.join(roomId);

        // Add/update participant
        let participant = room.participants.find((p) => p.name === name);
        if (participant) {
          // Reconnecting user
          participant.socketId = socket.id;
          participant.leftAt = undefined;
        } else {
          // New user
          room.participants.push({
            name,
            socketId: socket.id,
            joinedAt: new Date(),
          });
        }

        await room.save();

        // Notify others in the room
        socket.to(roomId).emit("user-connected", {
          socketId: socket.id,
          name,
        });

        // Send full room state to the new user
        const updatedRoom = await Room.findOne({ roomId });
        socket.emit("room-details", {
          roomId: updatedRoom.roomId,
          name: updatedRoom.name,
          expiresAt: updatedRoom.expiresAt,
          participants: updatedRoom.participants.filter((p) => !p.leftAt),
          messages: updatedRoom.messages,
        });

        // Log activity
        await RoomActivity.create({
          socketId: socket.id,
          roomId,
          userIP: socket.handshake.address,
        });

      } catch (err) {
        console.error("Join room error:", err);
        socket.emit("join-error", "Server error joining room");
      }
    });

    // ======================
    // 2. WebRTC Signaling
    // ======================
    socket.on("signal", ({ to, from, signal }) => {
      // Forward WebRTC signaling data to the target user
      io.to(to).emit("signal", { from, signal });
    });

    // ======================
    // 3. Chat Messaging
    // ======================
    socket.on("send-message", async ({ roomId, sender, content, isReaction }) => {
      try {
        // Save message to database
        await Room.findOneAndUpdate(
          { roomId },
          {
            $push: {
              messages: {
                sender,
                content,
                isReaction,
                timestamp: new Date(),
              },
            },
          }
        );

        // Broadcast to all in the room
        io.to(roomId).emit("new-message", {
          sender,
          content,
          isReaction,
          timestamp: new Date(),
        });

      } catch (err) {
        console.error("Message send error:", err);
      }
    });

    // ======================
    // 4. Disconnection Handling
    // ======================
    socket.on("disconnect", async () => {
      console.log("❌ Client disconnected:", socket.id);

      try {
        // Find which room this socket was in
        const room = await Room.findOne({ "participants.socketId": socket.id });

        if (room) {
          // Mark participant as left
          const participant = room.participants.find(
            (p) => p.socketId === socket.id && !p.leftAt
          );

          if (participant) {
            participant.leftAt = new Date();
            await room.save();

            // Notify room
            io.to(room.roomId).emit("user-disconnected", {
              socketId: socket.id,
              name: participant.name,
            });
          }
        }

        // Update activity log
        await RoomActivity.findOneAndUpdate(
          { socketId: socket.id, leftAt: { $exists: false } },
          { leftAt: new Date() }
        );

      } catch (err) {
        console.error("Disconnect handling error:", err);
      }
    });

    // ======================
    // 5. Room Status Checks
    // ======================
    socket.on("check-room", async ({ roomId }, callback) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room) {
          return callback({ exists: false });
        }

        callback({
          exists: true,
          requiresPassword: true,
          name: room.name,
          participantCount: room.participants.filter((p) => !p.leftAt).length,
        });

      } catch (err) {
        console.error("Room check error:", err);
        callback({ error: "Server error checking room status" });
      }
    });
  });
};