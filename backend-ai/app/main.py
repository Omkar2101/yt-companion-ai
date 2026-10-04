from app.services import vectorize_query
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict
from app.services import process_youtube_transcript

app = FastAPI(title="YT Context Hub - AI Microservice")

# If you need configuration on a model in Pydantic v2, use model_config = ConfigDict(...)
class VideoIdRequest(BaseModel):
    youtubeId: str
    transcript: list[dict] | None = None
    
    model_config = ConfigDict(protected_namespaces=())

class SearchQueryRequest(BaseModel):
    query: str
    model_config = ConfigDict(protected_namespaces=())

@app.get("/health")
def health_check():
    return {"status": "AI Service is running"}

@app.post("/process-transcript")
def get_transcript_embeddings(payload: VideoIdRequest):
    result = process_youtube_transcript(payload.youtubeId, payload.transcript)
    
    if not result["success"]:
        return {
            "success": False,
            "message": "Transcripts are disabled, restricted, or unavailable for this video.",
            "error": result.get("error", "No transcript found")
        }
        
    return result


@app.post("/vectorize-query")
def get_query_embedding(payload: SearchQueryRequest):
    result = vectorize_query(payload.query)
    if not result["success"]:
        raise HTTPException(status_code=500, error=result["error"])
    return result