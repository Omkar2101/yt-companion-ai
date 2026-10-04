import prisma from "../config/prisma";

/**
 * Deletes all timestamp bookmarks that have passed their 24-hour expiration date.
 * Also cleans up any parent Bookmark records that are left with zero timestamps.
 */
export const deleteExpiredTimestamps = async (): Promise<number> => {
  try {
    const now = new Date();

    // 1. Delete all timestamps where expiresAt is less than or equal to current time
    const result = await prisma.timestamp.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });

    if (result.count > 0) {
      console.log(`[Auto-Delete] Purged ${result.count} expired timestamp(s) at ${now.toISOString()}`);

      // 2. Clean up empty parent bookmarks if they have no remaining timestamps
      const orphanCleanup = await prisma.bookmark.deleteMany({
        where: {
          timestamps: {
            none: {},
          },
        },
      });

      if (orphanCleanup.count > 0) {
        console.log(`[Auto-Delete] Cleaned up ${orphanCleanup.count} empty bookmark container(s)`);
      }
    }

    return result.count;
  } catch (error) {
    console.error("[Auto-Delete] Error deleting expired timestamps:", error);
    return 0;
  }
};

/**
 * Initializes a background recurring cleanup scheduler that checks for expired bookmarks.
 * Default interval: every 10 minutes.
 */
export const initAutoDeleteScheduler = (intervalMinutes = 10): NodeJS.Timeout => {
  // Run once immediately on startup
  deleteExpiredTimestamps();

  // Run periodically
  const timer = setInterval(() => {
    deleteExpiredTimestamps();
  }, intervalMinutes * 60 * 1000);

  return timer;
};
