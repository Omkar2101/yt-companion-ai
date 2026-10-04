from youtube_transcript_api import YouTubeTranscriptApi
from sentence_transformers import SentenceTransformer
from app.transcript import get_video_transcript

# Load multilingual model once into memory (supports English, Hindi, and 50+ languages)
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

def process_youtube_transcript(youtube_id: str, client_transcript: list = None):
    try:
        # 1. Primary: Use client-provided transcript if available; Secondary: Fallback to backend library
        if client_transcript and len(client_transcript) > 0:
            print(f"[AI Service] Using client-extracted transcript for {youtube_id} ({len(client_transcript)} segments)")
            fetched_data = client_transcript
        else:
            print(f"[AI Service] Falling back to backend youtube-transcript-api for {youtube_id}")
            transcript_data = get_video_transcript(youtube_id)
            if not transcript_data["success"]:
                return transcript_data
            fetched_data = transcript_data["raw_transcript"]
        
        # 2. Smart Chunking Algorithm
        # We group text segments together until a chunk reaches roughly ~500 characters,
        # while keeping track of the start timestamp of the first line in that chunk.
        chunks = []
        current_chunk_text = ""
        current_chunk_start = fetched_data[0]["start"] if fetched_data else 0.0

        for entry in fetched_data:
            current_chunk_text += " " + entry["text"]
            
            # When chunk size exceeds 500 characters, save it and start a new chunk
            if len(current_chunk_text) >= 500:
                chunks.append({
                    "start": round(current_chunk_start, 2),
                    "text": current_chunk_text.strip()
                })
                current_chunk_text = ""
                current_chunk_start = entry["start"]

        # Don't forget the leftover tail chunk
        if current_chunk_text.strip():
            chunks.append({
                "start": round(current_chunk_start, 2),
                "text": current_chunk_text.strip()
            })

        # 3. Generate Vector Embeddings for each chunk locally
        processed_chunks = []
        for chunk in chunks:
            vector = model.encode(chunk["text"]).tolist()
            processed_chunks.append({
                "start": chunk["start"],
                "text": chunk["text"],
                "embedding": vector
            })

        return {
            "success": True,
            "total_chunks": len(processed_chunks),
            "chunks": processed_chunks
        }

    except Exception as e:
        # Graceful degradation: catch if captions are disabled or unavailable
        return {
            "success": False,
            "error": str(e)
        }


def vectorize_query(query_text: str):
    try:
        vector = model.encode(query_text).tolist()
        return {"success": True, "embedding": vector}
    except Exception as e:
        return {"success": False, "error": str(e)}