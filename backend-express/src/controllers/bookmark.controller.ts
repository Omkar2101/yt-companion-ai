import { Request, Response } from "express";
import prisma from "../config/prisma";

export const createBookmark = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, youtubeId, title, timeInSec, note, autoDelete } = req.body;

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

    // 3. Compute 24-hr expiration if autoDelete is requested
    const expiresAt = autoDelete
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null;

    // 4. Create the new timestamp under this bookmark
    const newTimestamp = await prisma.timestamp.create({
      data: {
        bookmarkId: bookmark.id,
        timeInSec: parseFloat(timeInSec),
        note: note || null,
        expiresAt,
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

export const getBookmarks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, youtubeId } = req.query;

    // Validation: We need at least the user's email to find their bookmarks
    if (!email) {
      res
        .status(400)
        .json({ error: "Missing required query parameter: email" });
      return;
    }

    const now = new Date();

    // 1. Find the user and include active bookmarks & non-expired timestamps
    const user = await prisma.user.findUnique({
      where: { email: String(email) },
      include: {
        bookmarks: {
          // If a youtubeId is provided in query params, filter for just that video; otherwise fetch all
          where: youtubeId ? { youtubeId: String(youtubeId) } : undefined,
          include: {
            timestamps: {
              where: {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: now } },
                ],
              },
              orderBy: { timeInSec: "asc" }, // Sort timestamps from start to finish of the video
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Filter out bookmarks that have 0 remaining valid timestamps
    const activeBookmarks = user.bookmarks.filter(
      (b) => b.timestamps.length > 0
    );

    res.status(200).json({
      success: true,
      bookmarks: activeBookmarks,
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    res
      .status(500)
      .json({ error: "Internal server error while fetching bookmarks" });
  }
};

export const deleteTimestamp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: "Missing timestamp ID" });
      return;
    }

    const timestampId = Array.isArray(id) ? id[0] : id;

    await prisma.timestamp.delete({
      where: { id: timestampId },
    });

    res.status(200).json({
      success: true,
      message: "Timestamp deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting timestamp:", error);
    res
      .status(500)
      .json({ error: "Internal server error while deleting timestamp" });
  }
};

export const toggleAutoDelete = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { autoDelete } = req.body;

    if (!id) {
      res.status(400).json({ error: "Missing timestamp ID" });
      return;
    }

    const timestampId = Array.isArray(id) ? id[0] : id;

    // Calculate 24-hr expiration from current time or disable it
    const expiresAt = autoDelete
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null;

    const updatedTimestamp = await prisma.timestamp.update({
      where: { id: timestampId },
      data: { expiresAt },
    });

    res.status(200).json({
      success: true,
      message: autoDelete
        ? "Auto-delete set for 24 hours"
        : "Auto-delete disabled",
      timestamp: updatedTimestamp,
    });
  } catch (error) {
    console.error("Error toggling auto-delete:", error);
    res
      .status(500)
      .json({ error: "Internal server error while toggling auto-delete" });
  }
};


