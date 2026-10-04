import axios from "axios";
import prisma from "../config/prisma";
import { config } from "../config/env";

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

export async function searchVideoTranscript(
  youtubeId: string,
  searchQuery: string,
) {
  // 1. Find the video and all its chunks in PostgreSQL
  const video = await prisma.video.findUnique({
    where: { youtubeId },
    include: { chunks: true },
  });

  if (!video || video.chunks.length === 0) {
    throw new Error(
      "Video or transcript chunks not found in database. Please process the video first.",
    );
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
  let bestMatch = null;
  let highestScore = -1;

  for (const chunk of video.chunks) {
    const chunkEmbedding = chunk.embedding as number[];
    const score = calculateCosineSimilarity(queryEmbedding, chunkEmbedding);

    if (score > highestScore) {
      highestScore = score;
      bestMatch = chunk;
    }
  }

  return {
    query: searchQuery,
    matchScore: highestScore, // Confidence score (closer to 1.0 is a stronger match)
    timestamp: bestMatch?.start,
    matchedText: bestMatch?.text,
  };
}
