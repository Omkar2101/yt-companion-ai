import express from "express";
import { processVideo } from "../controllers/videoController";

const router = express.Router();

// POST /api/videos/process
router.post("/process", processVideo);

export default router;
