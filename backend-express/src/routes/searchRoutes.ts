import { Router } from "express";
import { handleSearch, handleCheckStatus } from "../controllers/searchController";

const router = Router();

// POST /semantic-search
router.post("/semantic-search", handleSearch);

// GET /status/:youtubeId
router.get("/status/:youtubeId", handleCheckStatus);

export default router;
