import { Request, Response } from "express";
import prisma from "../config/prisma";

export const createBookmark = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, youtubeId, title, timeInSec, note } = req.body;

    // Validation: Ensure required fields are present
    if (!email || !youtubeId || !title || timeInSec === undefined) {
      res
        .status(400)
        .json({
          error: "Missing required fields: email, youtubeId, title, timeInSec",
        });
      return;
    }

    // 1. Find or create a default user based on email
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email } });
    }

    // 2. Find or create the bookmark for this video & user
    let bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_youtubeId: {
          userId: user.id,
          youtubeId,
        },
      },
    });

    if (!bookmark) {
      bookmark = await prisma.bookmark.create({
        data: {
          userId: user.id,
          youtubeId,
          title,
        },
      });
    }

    // 3. Create the new timestamp under this bookmark
    const newTimestamp = await prisma.timestamp.create({
      data: {
        bookmarkId: bookmark.id,
        timeInSec: parseFloat(timeInSec),
        note: note || null,
      },
    });

    res.status(201).json({
      message: "Bookmark timestamp saved successfully!",
      data: {
        bookmark,
        timestamp: newTimestamp,
      },
    });
  } catch (error) {
    console.error("Error saving bookmark:", error);
    res
      .status(500)
      .json({ error: "Internal server error while saving bookmark" });
  }
};
