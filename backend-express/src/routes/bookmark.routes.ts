import { Router } from "express";
import {
  createBookmark,
  getBookmarks,
  deleteTimestamp,
} from "../controllers/bookmark.controller";

const router = Router();

// GET /api/bookmarks - List bookmarks & timestamps (optionally filtered by email & youtubeId)
router.get("/", getBookmarks);

// POST /api/bookmarks - Save a new timestamp/bookmark
router.post("/", createBookmark);

// DELETE /api/bookmarks/timestamps/:id - Delete a specific timestamp
router.delete("/timestamps/:id", deleteTimestamp);

export default router;

