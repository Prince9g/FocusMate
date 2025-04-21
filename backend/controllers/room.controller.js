import Room from "../models/room.model.js";
import crypto from "crypto";

export const createRoom = async (req, res) => {
    try {
      let { duration, name } = req.body; // duration in minutes
  
      if (!duration || duration <= 0 || duration > 360) {
        return res
          .status(400)
          .json({ error: "Duration must be between 1 and 360 minutes" });
      }
  
      const roomId = crypto.randomBytes(4).toString("hex");
      const password = crypto.randomBytes(3).toString("hex");
      const expiresAt = new Date(Date.now() + duration * 60 * 1000);
  
      const room = await Room.create({ roomId, password, expiresAt, name, participants: [{
        name,
        socketId: null, // Initially, no participants are connected
        joinedAt: Date.now(),
      }] });
  
      res.status(201).json({ roomId, password, expiresAt });
    } catch (err) {
      res.status(500).json({ error: "Failed to create room" });
    }
  };
  
  


export const joinRoom = async (req, res) => {
  const { roomId, password, name} = req.body;
  try {
    const room = await Room.findOne({ roomId, password});
    if (!room) {
      return res.status(404).json({ success:false, message: "Room not found or password incorrect" });
    }
    const participant = room.participants.find(p => p.name === name);
    if (participant) {
      return res.status(400).json({ success:false, message: "Name already taken" });
    }
    room.participants.push({
      name,
      socketId: null, // Initially, no socketId is assigned
      joinedAt: Date.now(),
    });
    await room.save();
    res.status(200).json({ success:true, message: "Room joined" , room });
  } catch (err) {
    res.status(500).json({ error: "Failed to join room" });
  }
};

export const getRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    
    res.status(200).json({
      roomId: room.roomId,
      name: room.name,
      expiresAt: room.expiresAt,
      participants: room.participants,
      messages: room.messages,
      password: room.password,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch room details" });
  }
};

export const addMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { sender, content, isReaction } = req.body;
    
    const room = await Room.findOneAndUpdate(
      { roomId },
      { $push: { messages: { sender, content, isReaction } } },
      { new: true }
    );
    
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to add message" });
  }
};