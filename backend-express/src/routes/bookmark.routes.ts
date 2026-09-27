import { Router } from "express";
import { createBookmark } from "../controllers/bookmark.controller";

const router = Router();

// POST /api/bookmarks - Save a new timestamp/bookmark
router.post("/", createBookmark);

export default router;
