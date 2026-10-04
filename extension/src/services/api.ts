const BACKEND_URL = 'http://localhost:5000';

export interface BookmarkPayload {
  email: string;
  youtubeId: string;
  title: string;
  timeInSec: number;
  note?: string;
}

export interface TimestampItem {
  id: string;
  timeInSec: number;
  note: string | null;
  bookmarkId: string;
  createdAt: string;
}

export interface BookmarkItem {
  id: string;
  youtubeId: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  timestamps: TimestampItem[];
}

/**
 * Sends timestamp bookmark data to Express backend.
 */
export const saveBookmark = async (payload: BookmarkPayload) => {
  const response = await fetch(`${BACKEND_URL}/api/bookmarks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to save bookmark');
  }

  return data;
};

/**
 * Fetches user bookmarks and timestamps from Express backend.
 */
export const getBookmarks = async (
  email: string,
  youtubeId?: string
): Promise<BookmarkItem[]> => {
  const params = new URLSearchParams({ email });
  if (youtubeId) {
    params.append('youtubeId', youtubeId);
  }

  const response = await fetch(`${BACKEND_URL}/api/bookmarks?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(data.error || 'Failed to fetch bookmarks');
  }

  return data.bookmarks || [];
};

/**
 * Deletes a timestamp by its ID.
 */
export const deleteTimestamp = async (id: string): Promise<void> => {
  const response = await fetch(`${BACKEND_URL}/api/bookmarks/timestamps/${id}`, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete timestamp');
  }
};

export interface SearchMatchItem {
  id: string;
  timestamp: number;
  text: string;
  matchScore: number;
}

export interface SemanticSearchResult {
  query: string;
  youtubeId: string;
  videoTitle?: string;
  matchScore: number;
  timestamp: number;
  matchedText: string;
  bestMatch: SearchMatchItem | null;
  topMatches: SearchMatchItem[];
  totalChunks: number;
}

/**
 * Executes semantic search query against a YouTube video transcript.
 * Automatically triggers indexing on backend if not already indexed.
 */
export const searchSemantic = async (
  youtubeId: string,
  query: string
): Promise<SemanticSearchResult> => {
  const response = await fetch(`${BACKEND_URL}/api/videos/semantic-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ youtubeId, query }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Semantic search failed.');
  }

  return data.result;
};

/**
 * Checks if a video is already indexed in the database.
 */
export const checkVideoStatus = async (youtubeId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/videos/status/${youtubeId}`);
    const data = await response.json();
    return !!data.isIndexed;
  } catch {
    return false;
  }
};


