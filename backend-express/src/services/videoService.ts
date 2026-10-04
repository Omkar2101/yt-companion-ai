import prisma from "../config/prisma";
import config from "../config/env";
import type {
  AIProcessResponse,
  ProcessVideoResult,
} from "./videoServicesTypes";

const withChunks = {
  chunks: { orderBy: { start: "asc" as const } },
};

/**
 * Returns a video's transcript chunks from PostgreSQL, or fetches and
 * vectorizes them via the Python AI service and persists the result.
 */
export async function getOrProcessVideoTranscript(
  youtubeId: string,
  clientTranscript?: { start: number; text: string }[]
): Promise<ProcessVideoResult> {
  const cached = await prisma.video.findUnique({
    where: { youtubeId },
    include: withChunks,
  });

  if (cached) {
    console.log(`[Cache Hit] Video ${youtubeId} found in database.`);
    return { source: "database", video: cached };
  }

  console.log(`[Cache Miss] Requesting transcript from AI service for ${youtubeId}...`);

  const url = `${config.fastApiUrl}/process-transcript`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      youtubeId,
      transcript: clientTranscript && clientTranscript.length > 0 ? clientTranscript : undefined,
    }),
  }).catch((err: Error & { cause?: { code?: string } }) => {
    throw new Error(`Cannot reach AI service at ${url} (${err.cause?.code ?? err.message})`);
  });

  if (!response.ok) {
    throw new Error(`AI service responded with HTTP ${response.status}`);
  }

  const data = (await response.json()) as AIProcessResponse;

  if (!data.success) {
    throw new Error(data.message || data.error || "AI service failed to process transcript.");
  }

  const video = await prisma.video.create({
    data: {
      youtubeId,
      title: `YouTube Video (${youtubeId})`,
      chunks: {
        create: data.chunks.map(({ start, text, embedding }) => ({
          start,
          text,
          embedding,
        })),
      },
    },
    include: withChunks,
  });

  return { source: "ai-service-and-persisted", video };
}
