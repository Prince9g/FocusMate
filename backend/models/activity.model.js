import mongoose from "mongoose";

const roomActivitySchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date },
  userIP: { type: String },
});

export default mongoose.model("RoomActivity", roomActivitySchema);
