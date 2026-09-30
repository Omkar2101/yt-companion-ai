from youtube_transcript_api import YouTubeTranscriptApi

def get_video_transcript(youtube_id: str):
    try:
        # Fetch transcript using the library (defaults to English)
        ytt_api = YouTubeTranscriptApi()
        fetched_data = ytt_api.fetch(youtube_id)
        
        # Format the fetched timeline into a single concatenated text block for embedding
        full_text = " ".join([entry["text"] for entry in fetched_data])
        
        return {
            "success": True,
            "raw_transcript": fetched_data,
            "full_text": full_text
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }