import { Router } from "express";
import { handleSearch } from "../controllers/searchController";

const router = Router();

// POST /api/search/semantic-search
router.post("/semantic-search", handleSearch);

export default router;
