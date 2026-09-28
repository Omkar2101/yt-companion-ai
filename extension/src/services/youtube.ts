export interface YouTubeVideoInfo {
  tabId: number;
  youtubeId: string;
  title: string;
}

/**
 * Validates and extracts the YouTube Video ID and Tab info from the active browser tab.
 */
export const getYouTubeVideoInfo = async (): Promise<YouTubeVideoInfo> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id || !tab.url?.includes('youtube.com/watch')) {
    throw new Error('Please open a YouTube video page to view and add bookmarks.');
  }

  const url = new URL(tab.url);
  const youtubeId = url.searchParams.get('v');

  if (!youtubeId) {
    throw new Error('Could not find YouTube Video ID.');
  }

  // Clean title: remove " - YouTube" suffix if present
  let cleanTitle = tab.title || 'YouTube Video';
  cleanTitle = cleanTitle.replace(/ - YouTube$/i, '').trim();

  return {
    tabId: tab.id,
    youtubeId,
    title: cleanTitle,
  };
};

/**
 * Injects a script to get current video playback time from YouTube player.
 */
export const getYouTubeCurrentTime = async (tabId: number): Promise<number> => {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      return videoElement ? videoElement.currentTime : 0;
    },
  });

  return results[0]?.result || 0;
};

/**
 * Seeks the active YouTube tab to a specific timestamp in seconds.
 */
export const seekYouTubeVideo = async (tabId: number, timeInSec: number): Promise<void> => {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (targetTime: number) => {
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      if (videoElement) {
        videoElement.currentTime = targetTime;
        videoElement.play().catch(() => {});
      }
    },
    args: [timeInSec],
  });
};

/**
 * Formats time in seconds into MM:SS or HH:MM:SS.
 */
export const formatTime = (timeInSec: number): string => {
  const totalSeconds = Math.max(0, Math.floor(timeInSec));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

