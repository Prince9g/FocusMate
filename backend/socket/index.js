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
    let currentRoomId = null;

    // Helper function to get participant count
    const getParticipantCount = async (roomId) => {
      const room = await Room.findOne({ roomId });
      return room ? room.participants.filter(p => !p.leftAt).length : 0;
    };

    // ======================
    // 1. Room Joining Logic
    // ======================
    socket.on("join-room", async ({ roomId, name, password }) => {
      try {
        currentRoomId = roomId;
        
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
        
        // Check if name is taken by active participant
        const nameExists = room.participants.some(
          p => p.name === name && !p.leftAt && p.socketId !== socket.id
        );
        if (nameExists) {
          socket.emit("join-error", "Name already taken in this room");
          return;
        }

        // Join the socket room
        socket.join(roomId);

        // Add/update participant
        let participant = room.participants.find(p => p.name === name);
        if (participant) {
          // Reconnecting user - update socket ID and clear leftAt
          participant.socketId = socket.id;
          participant.leftAt = undefined;
        } else {
          // New user
          participant = {
            name,
            socketId: socket.id,
            joinedAt: new Date(),
            isMuted: false,
            isCameraOff: false
          };
          room.participants.push(participant);
        }

        await room.save();

        // Get updated participant list
        const participants = room.participants
          .filter(p => !p.leftAt)
          .map(p => ({
            socketId: p.socketId,
            name: p.name,
            isMuted: p.isMuted || false,
            isCameraOff: p.isCameraOff || false
          }));

        // Notify others in the room about the new user
        socket.to(roomId).emit("user-connected", {
          socketId: socket.id,
          name,
          isMuted: participant.isMuted,
          isCameraOff: participant.isCameraOff
        });

        // Send full room state to the new user
        socket.emit("room-details", {
          roomId: room.roomId,
          name: room.name,
          expiresAt: room.expiresAt,
          participants,
          messages: room.messages
        });

        // Log activity
        await RoomActivity.create({
          socketId: socket.id,
          roomId,
          userIP: socket.handshake.address,
          joinedAt: new Date()
        });

      } catch (err) {
        console.error("Join room error:", err);
        socket.emit("join-error", "Server error joining room");
      }
    });

    // ======================
    // 2. WebRTC Signaling
    // ======================
    socket.on("signal", ({ to, signal }) => {
      // Forward WebRTC signaling data to the target user
      if (to && signal) {
        io.to(to).emit("signal", { from: socket.id, signal });
      }
    });

    // ======================
    // 3. Chat Messaging
    // ======================
    socket.on("send-message", async ({ roomId, sender, content, isReaction }) => {
      try {
        if (!roomId || !sender || !content) {
          console.error("Invalid message data");
          return;
        }

        const newMessage = {
          sender,
          content,
          isReaction: !!isReaction,
          timestamp: new Date()
        };

        // Save message to database
        await Room.findOneAndUpdate(
          { roomId },
          { $push: { messages: newMessage } },
          { new: true }
        );

        // Broadcast to all in the room including sender
        io.to(roomId).emit("new-message", newMessage);

      } catch (err) {
        console.error("Message send error:", err);
      }
    });

    // ======================
    // 4. User Status Updates
    // ======================
    socket.on("user-update", async ({ roomId, isMuted, isCameraOff }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room) return;

        const participant = room.participants.find(
          p => p.socketId === socket.id && !p.leftAt
        );
        if (!participant) return;

        if (isMuted !== undefined) participant.isMuted = isMuted;
        if (isCameraOff !== undefined) participant.isCameraOff = isCameraOff;

        await room.save();

        // Broadcast update to room
        socket.to(roomId).emit("user-updated", {
          socketId: socket.id,
          isMuted,
          isCameraOff
        });

      } catch (err) {
        console.error("User update error:", err);
      }
    });

    // ======================
    // 5. Disconnection Handling
    // ======================
    const handleDisconnect = async () => {
      console.log("❌ Client disconnected:", socket.id);

      try {
        if (!currentRoomId) return;

        const room = await Room.findOne({ roomId: currentRoomId });
        if (!room) return;

        // Mark participant as left
        const participant = room.participants.find(
          p => p.socketId === socket.id && !p.leftAt
        );

        if (participant) {
          participant.leftAt = new Date();
          await room.save();

          // Notify room
          io.to(currentRoomId).emit("user-disconnected", {
            socketId: socket.id,
            name: participant.name
          });
        }

        // Update activity log
        await RoomActivity.findOneAndUpdate(
          { socketId: socket.id, leftAt: { $exists: false } },
          { leftAt: new Date() }
        );

      } catch (err) {
        console.error("Disconnect handling error:", err);
      }
    };

    socket.on("disconnect", handleDisconnect);
    socket.on("leave-room", handleDisconnect);

    // ======================
    // 6. Room Status Checks
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
          participantCount: room.participants.filter(p => !p.leftAt).length,
        });

      } catch (err) {
        console.error("Room check error:", err);
        callback({ error: "Server error checking room status" });
      }
    });
  });
};