import Room from "../models/room.model.js";
import RoomActivity from "../models/activity.model.js";

export const setupSockets = (io) => {
  io.use((socket, next) => {
    try {
      const { roomId, name } = socket.handshake.auth;
      
      if (!roomId || !name) {
        return next(new Error("Authentication failed"));
      }
      
      socket.roomId = roomId;
      socket.userName = name;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);
    
    // Store roomId to use it in disconnect handler
    const currentRoomId = socket.roomId;
    const currentUserName = socket.userName;

    // ======================
    // 1. Room Joining Logic
    // ======================
    socket.on("join-room", async ({ roomId, name }) => {
      try {
        // Validate room exists
        const room = await Room.findOne({ roomId });
        
        if (!room) {
          socket.emit("join-error", "Invalid room ID");
          return;
        }

        if (room.expiresAt < new Date()) {
          socket.emit("join-error", "This room has expired");
          return;
        }
        
        // Join the socket room
        socket.join(roomId);
        
        // Find or create participant
        let participant = room.participants.find(p => p.name === name && !p.leftAt);
        
        if (participant) {
          // Update existing participant
          participant.socketId = socket.id;
        } else {
          // Check for existing participant that left
          let rejoiningParticipant = room.participants.find(p => p.name === name && p.leftAt);
          
          if (rejoiningParticipant) {
            // Participant is rejoining
            rejoiningParticipant.socketId = socket.id;
            rejoiningParticipant.leftAt = undefined;
          } else {
            // New participant
            room.participants.push({
              name,
              socketId: socket.id,
              joinedAt: new Date(),
              isMuted: false,
              isCameraOff: false
            });
          }
        }

        await room.save();

        // Get active participants
        const activeParticipants = room.participants
          .filter(p => !p.leftAt)
          .map(p => ({
            socketId: p.socketId,
            name: p.name,
            isMuted: p.isMuted || false,
            isCameraOff: p.isCameraOff || false
          }));

        // Notify others about the new user
        socket.to(roomId).emit("user-connected", {
          socketId: socket.id,
          name,
          isMuted: false,
          isCameraOff: false
        });

        // Send room details to the new user
        socket.emit("room-details", {
          roomId: room.roomId,
          name: room.name,
          expiresAt: room.expiresAt,
          participants: activeParticipants,
          messages: room.messages || []
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
      if (!to || !signal) {
        console.warn("Invalid signal:", { to, signalType: signal?.type });
        return;
      }
      
      console.log(`Signal from ${socket.id} to ${to}: ${signal.type}`);
      
      // Forward the signal
      io.to(to).emit("signal", { 
        from: socket.id, 
        signal 
      });
    });

    // Add heartbeat to keep connections alive
    socket.on("heartbeat", () => {
      socket.emit("heartbeat-ack");
    });

    // Add user speaking notification
    socket.on("speaking", ({ roomId, isSpeaking }) => {
      socket.to(roomId).emit("user-speaking", {
        socketId: socket.id,
        isSpeaking
      });
    });

    // ======================
    // 3. Chat Messaging
    // ======================
    socket.on("send-message", async ({ roomId, sender, content, isReaction }) => {
      try {
        if (!roomId || !sender || !content) return;

        const newMessage = {
          sender,
          content,
          isReaction: !!isReaction,
          timestamp: new Date()
        };

        await Room.findOneAndUpdate(
          { roomId },
          { $push: { messages: newMessage } },
          { new: true }
        );

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
    const handleDisconnection = async () => {
      try {
        if (!currentRoomId) return;

        const room = await Room.findOne({ roomId: currentRoomId });
        if (!room) return;

        const participant = room.participants.find(
          p => p.socketId === socket.id && !p.leftAt
        );

        if (participant) {
          participant.leftAt = new Date();
          await room.save();

          // Notify other users
          socket.to(currentRoomId).emit("user-disconnected", {
            socketId: socket.id,
            name: participant.name
          });
        }

        // Update activity log
        await RoomActivity.findOneAndUpdate(
          { socketId: socket.id, leftAt: { $exists: false } },
          { leftAt: new Date() }
        );

        // Leave the socket room
        socket.leave(currentRoomId);
      } catch (err) {
        console.error("Disconnect handling error:", err);
      }
    };

    // Handle both voluntary leave and disconnect
    socket.on("leave-room", handleDisconnection);
    socket.on("disconnect", handleDisconnection);

    // ======================
    // 6. Room Status Checks
    // ======================
    socket.on("check-room", async ({ roomId }, callback) => {
      try {
        const room = await Room.findOne({ roomId });
        callback({
          exists: !!room,
          requiresPassword: room?.password ? true : false,
          name: room?.name,
          participantCount: room?.participants.filter(p => !p.leftAt).length || 0,
        });
      } catch (err) {
        console.error("Room check error:", err);
        callback({ error: "Server error checking room status" });
      }
    });

    // ======================
    // 7. Debugging WebRTC
    // ======================
    socket.on("webrtc-debug", ({ roomId, message, data }) => {
      console.log(`WebRTC Debug [${roomId}:${socket.id}]: ${message}`, data);
      // Optionally broadcast to other room participants for debugging
      // socket.to(roomId).emit("webrtc-debug", { from: socket.id, message, data });
    });

    // ======================
    // 8. Error Handling
    // ======================
    socket.on("error", (err) => {
      console.error("Socket error:", err);
    });
  });
};