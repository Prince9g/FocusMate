import express from "express";
import { Rooms, SingleRoom } from "../controllers/activity.controller.js";

const router = express.Router();

// GET /analytics/room/:roomId
router.get("/room/:roomId", SingleRoom);

// Get analytics for all rooms
router.get("/rooms", Rooms);
  

export default router;
