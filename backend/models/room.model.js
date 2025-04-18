import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  expiresAt: { type: Date, required: true }, // This handles duration-based expiry
  name: { type: String, required: true },
  participants: [
    {
      name: { type: String, required: true },
      socketId: { type: String },
      joinedAt: { type: Date, default: Date.now },
      leftAt: { type: Date }
    },
  ],
  messages: [
    {
      sender: { type: String, required: true },
      content: { type: String, required: true },
      isReaction: { type: Boolean, default: false },
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Room", roomSchema);
