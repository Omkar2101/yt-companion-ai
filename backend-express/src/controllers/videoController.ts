import { Request, Response } from "express";
import { getOrProcessVideoTranscript } from "../services/videoService";

export async function processVideo(req: Request, res: Response) {
  try {
    const { youtubeId } = req.body;

    if (!youtubeId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: youtubeId",
      });
    }

    const result = await getOrProcessVideoTranscript(youtubeId);
    console.log(result, "result");

    return res.status(200).json({
      success: true,
      source: result.source,
      videoId: result.video.id,
      youtubeId: result.video.youtubeId,
      totalChunks: result.video.chunks.length,
      chunks: result.video.chunks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Controller Error:", message);
    return res.status(500).json({
      success: false,
      message,
    });
  }
}
