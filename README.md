# YouTube Companion AI (yt-companion-ai)

An AI-powered YouTube companion for real-time video transcript exploration, bookmarking, smart summaries, and interactive RAG-based Q&A.

## Project Structure

```text
yt-companion-ai/
├── extension/          # Frontend: Chrome Extension (Manifest V3, React, TypeScript)
├── backend-express/    # Core Backend: Node.js, Express, TypeScript (Bookmarks, Auth, DB)
└── backend-ai/         # AI Service: Python, FastAPI (Transcripts, Vector Embeddings, RAG)
```

## Services Overview

- **[extension/](file:///c:/Users/omiit/Desktop/Projects/yt-companion-ai/extension)**: Chrome Extension frontend built with Manifest V3, React, and TypeScript.
- **[backend-express/](file:///c:/Users/omiit/Desktop/Projects/yt-companion-ai/backend-express)**: Core API service managing user authentication, bookmarks, history, and relational persistence.
- **[backend-ai/](file:///c:/Users/omiit/Desktop/Projects/yt-companion-ai/backend-ai)**: High-performance AI service handling transcript retrieval, chunking, vector embeddings, and RAG query processing.
