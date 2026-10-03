from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict # 1. Import ConfigDict if needed
from app.services import process_youtube_transcript

app = FastAPI(title="YT Context Hub - AI Microservice")

# If you need configuration on a model in Pydantic v2, use model_config = ConfigDict(...)
class VideoIdRequest(BaseModel):
    youtubeId: str
    
    model_config = ConfigDict(protected_namespaces=())

@app.get("/health")
def health_check():
    return {"status": "AI Service is running"}

@app.post("/process-transcript")
def get_transcript_embeddings(payload: VideoIdRequest):
    result = process_youtube_transcript(payload.youtubeId)
    
    if not result["success"]:
        return {
            "success": False,
            "message": "Transcripts are disabled, restricted, or unavailable for this video.",
            "error": result["error"]
        }
        
    return result