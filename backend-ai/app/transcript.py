from youtube_transcript_api import YouTubeTranscriptApi

def get_video_transcript(youtube_id: str):
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(youtube_id)
        
        # Try finding English or Hindi first, otherwise pick the first available track
        try:
            transcript = transcript_list.find_transcript(['en', 'en-US', 'hi', 'hi-Latn'])
        except Exception:
            transcript = next(iter(transcript_list))
            
        fetched_data = transcript.fetch()
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