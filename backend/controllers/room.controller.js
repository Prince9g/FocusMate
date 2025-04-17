import Room from "../models/room.model.js";
import crypto from "crypto";

export const createRoom = async (req, res) => {
    try {
      let { duration } = req.body; // duration in minutes
  
      if (!duration || duration <= 0 || duration > 360) {
        return res
          .status(400)
          .json({ error: "Duration must be between 1 and 360 minutes" });
      }
  
      const roomId = crypto.randomBytes(4).toString("hex");
      const password = crypto.randomBytes(3).toString("hex");
      const expiresAt = new Date(Date.now() + duration * 60 * 1000);
  
      const room = await Room.create({ roomId, password, expiresAt });
  
      res.status(201).json({ roomId, password, expiresAt });
    } catch (err) {
      res.status(500).json({ error: "Failed to create room" });
    }
  };
  

export const joinRoom = async (req, res) => {
  const { roomId, password } = req.body;
  try {
    const room = await Room.findOne({ roomId, password });
    if (!room) {
      return res.status(404).json({ success:false, error: "Room not found or password incorrect" });
    }
    res.status(200).json({ success:true, message: "Room joined" });
  } catch (err) {
    res.status(500).json({ error: "Failed to join room" });
  }
};
