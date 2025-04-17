import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  expiresAt: { type: Date }, // This handles duration-based expiry
});


roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Room", roomSchema);
