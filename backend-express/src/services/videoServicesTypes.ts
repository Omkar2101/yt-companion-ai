/** A single transcript chunk returned by the Python AI service. */
export interface AIChunk {
  start: number;
  text: string;
  embedding: number[];
}

export interface AISuccessResponse {
  success: true;
  total_chunks: number;
  chunks: AIChunk[];
}

export interface AIErrorResponse {
  success: false;
  message?: string;
  error?: string;
}

export type AIProcessResponse = AISuccessResponse | AIErrorResponse;

/** Transcript chunk as stored in PostgreSQL. */
export interface StoredChunk {
  id: string;
  videoId: string;
  start: number;
  text: string;
  embedding: unknown;
  createdAt: Date;
}

/** Video row with its transcript chunks. */
export interface VideoWithChunks {
  id: string;
  youtubeId: string;
  title: string | null;
  createdAt: Date;
  chunks: StoredChunk[];
}

export interface ProcessVideoResult {
  source: "database" | "ai-service-and-persisted";
  video: VideoWithChunks;
}
