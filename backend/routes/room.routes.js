import express from "express";
import { addMessage, createRoom, getRoomDetails, joinRoom } from "../controllers/room.controller.js";

const router = express.Router();

router.post("/create", createRoom);
router.post("/join", joinRoom);
router.get('/:roomId', getRoomDetails);
router.post("/:roomId/messages", addMessage);

export default router;
