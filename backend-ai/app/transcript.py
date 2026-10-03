from youtube_transcript_api import YouTubeTranscriptApi

def get_video_transcript(youtube_id: str):
    try:
        # Fetch transcript using the library (defaults to English)
        ytt_api = YouTubeTranscriptApi()
        fetched_data = ytt_api.fetch(youtube_id)
        raw_data = fetched_data.to_raw_data()
        
        # Format the fetched timeline into a single concatenated text block for embedding
        full_text = " ".join([entry["text"] for entry in raw_data])
        
        return {
            "success": True,
            "raw_transcript": raw_data,
            "full_text": full_text
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }