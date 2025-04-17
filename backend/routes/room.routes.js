import express from "express";
import { createRoom, joinRoom } from "../controllers/room.controller.js";

const router = express.Router();

router.post("/create", createRoom);
router.post("/join", joinRoom);

export default router;
