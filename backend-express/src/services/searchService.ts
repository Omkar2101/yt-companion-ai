import axios from "axios";
import prisma from "../config/prisma";
import { config } from "../config/env";
import { getOrProcessVideoTranscript } from "./videoService";
import type { VideoWithChunks } from "./videoServicesTypes";

// Mathematical helper: Calculate Cosine Similarity between two vectors
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function checkVideoIndexed(youtubeId: string): Promise<boolean> {
  const count = await prisma.video.count({
    where: {
      youtubeId,
      chunks: { some: {} },
    },
  });
  return count > 0;
}

export async function searchVideoTranscript(
  youtubeId: string,
  searchQuery: string,
  clientTranscript?: { start: number; text: string }[]
) {
  // 1. Find video in PostgreSQL or auto-process if missing
  let video: VideoWithChunks | null = (await prisma.video.findUnique({
    where: { youtubeId },
    include: { chunks: { orderBy: { start: "asc" } } },
  })) as VideoWithChunks | null;

  if (!video || video.chunks.length === 0) {
    console.log(`[Semantic Search] Video ${youtubeId} not in DB. Auto-indexing now...`);
    const processed = await getOrProcessVideoTranscript(youtubeId, clientTranscript);
    video = processed.video;
  }

  if (!video || video.chunks.length === 0) {
    throw new Error("No transcript chunks could be retrieved or indexed for this video.");
  }

  // 2. Call Python FastAPI microservice to vectorize the user's search query
  const aiResponse = await axios.post(`${config.fastApiUrl}/vectorize-query`, {
    query: searchQuery,
  });

  if (!aiResponse.data.success) {
    throw new Error("Failed to generate embedding for the search query.");
  }

  const queryEmbedding: number[] = aiResponse.data.embedding;

  // 3. Compare query embedding against every chunk embedding using Cosine Similarity
  const rankedChunks = video.chunks.map((chunk) => {
    const chunkEmbedding = chunk.embedding as number[];
    const score = calculateCosineSimilarity(queryEmbedding, chunkEmbedding);
    return {
      id: chunk.id,
      timestamp: chunk.start,
      text: chunk.text,
      matchScore: Math.round(score * 1000) / 1000,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);

  const bestMatch = rankedChunks[0] || null;
  const topMatches = rankedChunks.slice(0, 3);

  return {
    query: searchQuery,
    youtubeId,
    videoTitle: video.title,
    matchScore: bestMatch ? bestMatch.matchScore : 0,
    timestamp: bestMatch ? bestMatch.timestamp : 0,
    matchedText: bestMatch ? bestMatch.text : "",
    bestMatch,
    topMatches,
    totalChunks: video.chunks.length,
  };
}
