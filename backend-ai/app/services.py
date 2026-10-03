from youtube_transcript_api import YouTubeTranscriptApi
from sentence_transformers import SentenceTransformer
from app.transcript import get_video_transcript

# Load our local model once into memory
model = SentenceTransformer("all-MiniLM-L6-v2")

def process_youtube_transcript(youtube_id: str):
    try:
        # 1. Fetch the transcript (this is the list of dictionaries with 'text', 'start', 'duration')
        transcript_data = get_video_transcript(youtube_id)
        #add log
        print(transcript_data)
        
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