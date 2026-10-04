import { Request, Response } from "express";
import { searchVideoTranscript, checkVideoIndexed } from "../services/searchService";

export async function handleSearch(req: Request, res: Response) {
  try {
    const { youtubeId, query } = req.body;

    if (!youtubeId || !query) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: youtubeId and query are required.",
      });
    }

    const searchResult = await searchVideoTranscript(youtubeId, query);

    return res.status(200).json({
      success: true,
      result: searchResult,
    });
  } catch (error: any) {
    console.error("Search Controller Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function handleCheckStatus(req: Request, res: Response) {
  try {
    const youtubeId = (req.params.youtubeId as string) || "";
    if (!youtubeId) {
      return res.status(400).json({ success: false, message: "youtubeId is required" });
    }
    const isIndexed = await checkVideoIndexed(youtubeId);
    return res.status(200).json({
      success: true,
      youtubeId,
      isIndexed,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

