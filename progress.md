# Project Progress Tracker (yt-companion-ai)

A centralized, day-wise progress log across all modules to monitor tasks, completed features, and next steps.

---

## 🧭 Module Overview & Status

| Module | Tracker File | Purpose | Tech Stack | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`extension/`** | [extension/progress.md](file:///c:/Users/omiit/Desktop/Projects/yt-companion-ai/extension/progress.md) | Chrome Extension frontend & UI overlay | React, Vite, TypeScript, SCSS, Manifest V3 | 🟡 In Progress |
| **`backend-express/`** | [backend-express/progress.md](file:///c:/Users/omiit/Desktop/Projects/yt-companion-ai/backend-express/progress.md) | Core API for bookmarks, user auth & database | Node.js, Express, TypeScript, Prisma, PostgreSQL | 🟡 In Progress |
| **`backend-ai/`** | [backend-ai/progress.md](file:///c:/Users/omiit/Desktop/Projects/yt-companion-ai/backend-ai/progress.md) | AI/RAG service for transcripts & Q&A | Python, FastAPI, SentenceTransformers, Vector Search | 🟢 Active |

---

## 📅 Day-Wise Progress Log

### **Day 7 — 2026-10-04**
- **`backend-express/` & `backend-ai/`**
  - Integrated `SentenceTransformer("all-MiniLM-L6-v2")` in FastAPI microservice for local vector embeddings.
  - Implemented auto-indexing in [searchService.ts](file:///c:/Users/omiit/Desktop/Projects/yt-companion-ai/backend-express/src/services/searchService.ts) to automatically transcribe & vectorize videos if not yet in PostgreSQL.
  - Added video indexing status checker (`GET /api/videos/status/:youtubeId`).
  - Added ranked multi-match cosine similarity (best match + top matches).
  - Mounted search routes under `/api/videos` and `/api/search`.
- **`extension/`**
  - Built [SemanticSearchTab.tsx](file:///c:/Users/omiit/Desktop/Projects/yt-companion-ai/extension/src/components/SemanticSearchTab.tsx) and [SemanticSearchTab.scss](file:///c:/Users/omiit/Desktop/Projects/yt-companion-ai/extension/src/components/SemanticSearchTab.scss).
  - Added primary navigation tabs (Bookmarks vs AI Search) in [BookmarkPage.tsx](file:///c:/Users/omiit/Desktop/Projects/yt-companion-ai/extension/src/pages/BookmarkPage.tsx).
  - Added video selection (active YouTube tab, saved videos dropdown, custom URL/ID input).
  - Implemented 1-click **Jump to Time** in player, **Copy Shareable Link**, and **Save to Bookmarks**.
  - Verified end-to-end vector generation and cosine similarity search.

### **Day 6 — 2026-09-30**
- **`extension/`**
  - Implemented `BookmarkPage.tsx` with list view, add timestamp modal, search, and delete actions.
  - Added `src/services/youtube.ts` for Chrome tabs integration (active video detection & timestamp seeking).
  - Added `src/services/api.ts` connecting frontend to Express backend endpoints.
  - Created `Header.tsx` component and SCSS styling.
- **`backend-express/`**
  - Configured Prisma schema with `User`, `Bookmark`, and `Timestamp` models.
  - Built `bookmark.controller.ts` with complete CRUD handlers for bookmarks and timestamps.
  - Configured `/api/bookmarks` routes and enabled CORS.
  - Verified API endpoints with extension client.
- **`backend-ai/`**
  - Documented service architecture for transcript extraction, chunking, and RAG pipelines.
- **Next Steps:**
  - Build transcript viewer and summary UI in extension.
  - Initialize FastAPI service with `youtube-transcript-api` in `backend-ai/`.

---

### **Day 5 — 2026-09-29**
- **`extension/`**
  - Set up Chrome extension project with Manifest V3 and Vite.
- **`backend-express/`**
  - Configured database connection and initial project structure.
