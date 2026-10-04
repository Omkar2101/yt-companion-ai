import React, { useState, useEffect } from 'react';
import {
  searchSemantic,
  checkVideoStatus,
  saveBookmark,
  type SemanticSearchResult,
  type SearchMatchItem,
  type BookmarkItem,
} from '../services/api';
import { formatTime, type YouTubeVideoInfo } from '../services/youtube';
import { extractTranscriptFromTab } from '../services/transcriptExtractor';
import './SemanticSearchTab.scss';

interface SemanticSearchTabProps {
  activeVideo: YouTubeVideoInfo | null;
  email: string;
  savedBookmarks: BookmarkItem[];
  hasCaptions?: boolean | null;
  onSeek: (timeInSec: number, targetYoutubeId?: string) => void;
  onBookmarkSaved?: () => void;
  onSwitchToBookmarks?: () => void;
}

export function SemanticSearchTab({
  activeVideo,
  email,
  savedBookmarks,
  hasCaptions,
  onSeek,
  onBookmarkSaved,
  onSwitchToBookmarks,
}: SemanticSearchTabProps) {
  // Video Selection
  const [selectedYoutubeId, setSelectedYoutubeId] = useState<string>(
    activeVideo?.youtubeId || ''
  );
  const [selectedTitle, setSelectedTitle] = useState<string>(
    activeVideo?.title || 'Current Video'
  );
  const [isCustomVideo, setIsCustomVideo] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Status & Search States
  const [isIndexed, setIsIndexed] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SemanticSearchResult | null>(null);

  // Interaction feedback states
  const [copiedTimeId, setCopiedTimeId] = useState<string | null>(null);
  const [savingBookmarkId, setSavingBookmarkId] = useState<string | null>(null);
  const [savedBookmarkSuccess, setSavedBookmarkSuccess] = useState<string | null>(null);

  // Sync with active video when it changes, if not in custom mode
  useEffect(() => {
    if (activeVideo && !isCustomVideo) {
      setSelectedYoutubeId(activeVideo.youtubeId);
      setSelectedTitle(activeVideo.title);
    }
  }, [activeVideo, isCustomVideo]);

  // Check if selected video is already indexed
  useEffect(() => {
    let isCancelled = false;
    if (!selectedYoutubeId) {
      setIsIndexed(null);
      return;
    }

    checkVideoStatus(selectedYoutubeId)
      .then((indexed) => {
        if (!isCancelled) setIsIndexed(indexed);
      })
      .catch(() => {
        if (!isCancelled) setIsIndexed(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedYoutubeId]);

  // Helper to extract YouTube ID from input or URL
  const extractYoutubeId = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    try {
      if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
        const url = new URL(trimmed);
        if (url.searchParams.has('v')) return url.searchParams.get('v')!;
        const parts = url.pathname.split('/').filter(Boolean);
        return parts[parts.length - 1] || trimmed;
      }
    } catch {
      // not a standard URL, assume raw ID
    }
    return trimmed;
  };

  // Switch to custom video ID/URL
  const handleApplyCustomVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYoutubeId(customInput);
    if (!id) {
      setError('Please enter a valid YouTube Video ID or URL.');
      return;
    }
    setSelectedYoutubeId(id);
    setSelectedTitle(`YouTube Video (${id})`);
    setIsCustomVideo(true);
    setSearchResult(null);
    setError(null);
  };

  // Perform Semantic Search
  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const searchQuery = (overrideQuery ?? query).trim();
    if (!searchQuery) return;
    if (!selectedYoutubeId) {
      setError('Please open a YouTube video or enter a video ID first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Primary Path: If searching active tab video and not indexed yet, extract transcript directly in browser
      let clientTranscript = null;
      if (activeVideo && activeVideo.youtubeId === selectedYoutubeId && !isIndexed) {
        try {
          clientTranscript = await extractTranscriptFromTab(activeVideo.tabId);
          console.log(`[TranscriptExtractor] Extracted ${clientTranscript?.length || 0} chunks from active tab`);
        } catch {
          // If client extract fails or is unavailable, backend fallback will handle it
        }
      }

      const result = await searchSemantic(selectedYoutubeId, searchQuery, clientTranscript);
      setSearchResult(result);
      setIsIndexed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Semantic search failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Jump to timestamp
  const handleJump = (timeInSec: number) => {
    onSeek(timeInSec, selectedYoutubeId);
  };

  // Copy direct YouTube URL
  const handleCopy = (timeInSec: number, key: string) => {
    const url = `https://youtu.be/${selectedYoutubeId}?t=${Math.floor(timeInSec)}`;
    navigator.clipboard.writeText(url);
    setCopiedTimeId(key);
    setTimeout(() => setCopiedTimeId(null), 1800);
  };

  // Save AI search result as a bookmark
  const handleSaveAsBookmark = async (match: SearchMatchItem) => {
    setSavingBookmarkId(match.id);
    try {
      await saveBookmark({
        email,
        youtubeId: selectedYoutubeId,
        title: selectedTitle,
        timeInSec: match.timestamp,
        note: `AI Search: "${query}" - ${match.text.slice(0, 100)}...`,
      });

      setSavedBookmarkSuccess(match.id);
      if (onBookmarkSaved) onBookmarkSaved();
      setTimeout(() => setSavedBookmarkSuccess(null), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save bookmark.');
    } finally {
      setSavingBookmarkId(null);
    }
  };

  const sampleSuggestions = [
    'Summary or conclusion',
    'Key concept explained',
    'Steps or instructions',
    'Example or demo',
  ];

  // Graceful UX Fallback when active video has no captions
  if (!isCustomVideo && hasCaptions === false) {
    return (
      <div className="semantic-search-tab">
        <div className="no-captions-fallback-card">
          <div className="fallback-badge">
            <span className="dot warning" />
            <span>Captions Disabled on YouTube</span>
          </div>

          <div className="fallback-icon-wrapper">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M7 15h4M15 15h2M7 11.5h10" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          </div>

          <h3 className="fallback-heading">AI Search Unavailable for this Video</h3>
          <p className="fallback-description">
            Closed captions or subtitles are disabled or unavailable for this video on YouTube.
            You can still capture and manage manual timestamp notes!
          </p>

          <div className="fallback-actions">
            {onSwitchToBookmarks && (
              <button className="primary-fallback-btn" onClick={onSwitchToBookmarks} type="button">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span>Go to Bookmarks</span>
              </button>
            )}

            <button
              className="secondary-fallback-btn"
              onClick={() => setIsCustomVideo(true)}
              type="button"
            >
              Search Another Video
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="semantic-search-tab">
      {/* Target Video Selector Card */}
      <div className="target-video-card">
        <div className="video-card-top">
          <div className="label-row">
            <span className="section-eyebrow">Search Target</span>
            {isIndexed !== null && (
              <span className={`status-pill ${isIndexed ? 'indexed' : 'pending'}`}>
                <span className="dot" />
                {isIndexed ? 'Indexed (Instant)' : 'Auto-indexes on search'}
              </span>
            )}
          </div>
          <div className="video-title-row">
            <div className="video-title" title={selectedTitle}>
              {selectedTitle || 'No YouTube video detected'}
            </div>
            <button
              className="change-video-btn"
              onClick={() => setIsCustomVideo(!isCustomVideo)}
              type="button"
            >
              {isCustomVideo ? 'Use Active Tab' : 'Change Video'}
            </button>
          </div>
        </div>

        {/* Change Video Drawer */}
        {isCustomVideo && (
          <div className="custom-video-panel">
            {savedBookmarks.length > 0 && (
              <div className="saved-video-select">
                <label className="input-hint">Or choose from your saved videos:</label>
                <select
                  className="dropdown-select"
                  value={selectedYoutubeId}
                  onChange={(e) => {
                    const found = savedBookmarks.find((b) => b.youtubeId === e.target.value);
                    if (found) {
                      setSelectedYoutubeId(found.youtubeId);
                      setSelectedTitle(found.title);
                      setSearchResult(null);
                      setError(null);
                    }
                  }}
                >
                  <option value="">Select a saved video...</option>
                  {savedBookmarks.map((b) => (
                    <option key={b.id} value={b.youtubeId}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form className="custom-input-form" onSubmit={handleApplyCustomVideo}>
              <input
                className="url-input"
                type="text"
                placeholder="Paste YouTube URL or Video ID"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
              />
              <button className="apply-btn" type="submit">
                Set
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      <form className="search-bar-card" onSubmit={(e) => handleSearch(e)}>
        <div className="input-wrapper">
          <svg
            className="search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="semantic-input"
            type="text"
            placeholder="Search spoken content (e.g. formula, bug fix, conclusion)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          {query && (
            <button
              className="clear-btn"
              type="button"
              onClick={() => {
                setQuery('');
                setSearchResult(null);
              }}
            >
              ✕
            </button>
          )}
        </div>

        <button
          className="search-btn"
          type="submit"
          disabled={loading || !query.trim() || !selectedYoutubeId}
        >
          {loading ? (
            <>
              <svg className="spinning" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <span>Searching...</span>
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Find Moment</span>
            </>
          )}
        </button>
      </form>

      {/* Suggestion Chips */}
      {!searchResult && !loading && (
        <div className="suggestion-chips">
          <span className="chips-label">Quick prompts:</span>
          {sampleSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              className="chip-btn"
              type="button"
              onClick={() => {
                setQuery(suggestion);
                handleSearch(undefined, suggestion);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="error-banner">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="error-text">{error}</div>
          <button className="error-close" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Loading State with Pulse */}
      {loading && (
        <div className="loading-card">
          <div className="pulse-glow" />
          <svg className="spinner-large" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <div className="loading-text">
            <strong>Semantic AI Engine is analyzing...</strong>
            <span>Vectorizing query & finding best cosine match</span>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResult && !loading && (
        <div className="results-container">
          <div className="results-header">
            <span className="header-title">Top Matching Moment</span>
            <span className="chunks-badge">{searchResult.totalChunks} chunks searched</span>
          </div>

          {searchResult.bestMatch ? (
            <div className="best-match-card">
              <div className="match-card-top">
                {/* Playable timestamp button */}
                <button
                  className="time-seek-pill"
                  onClick={() => handleJump(searchResult.bestMatch!.timestamp)}
                  title="Click to jump to this moment in YouTube"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>{formatTime(searchResult.bestMatch.timestamp)}</span>
                </button>

                {/* Score Pill */}
                <div className="score-badge">
                  <span className="score-dot" />
                  <span>{Math.round(searchResult.bestMatch.matchScore * 100)}% Match</span>
                </div>
              </div>

              {/* Matched spoken quote */}
              <div className="quote-box">
                <svg className="quote-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="quote-text">{searchResult.bestMatch.text}</p>
              </div>

              {/* Action buttons */}
              <div className="card-actions">
                <button
                  className="jump-btn"
                  onClick={() => handleJump(searchResult.bestMatch!.timestamp)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Jump to Time</span>
                </button>

                <button
                  className={`sub-btn ${copiedTimeId === 'best' ? 'copied' : ''}`}
                  onClick={() => handleCopy(searchResult.bestMatch!.timestamp, 'best')}
                  title="Copy shareable link"
                >
                  {copiedTimeId === 'best' ? (
                    <span>Copied!</span>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  className={`sub-btn bookmark-action ${savedBookmarkSuccess === searchResult.bestMatch.id ? 'saved' : ''}`}
                  onClick={() => handleSaveAsBookmark(searchResult.bestMatch!)}
                  disabled={savingBookmarkId === searchResult.bestMatch.id}
                  title="Save as bookmark in your library"
                >
                  {savedBookmarkSuccess === searchResult.bestMatch.id ? (
                    <span>Saved!</span>
                  ) : savingBookmarkId === searchResult.bestMatch.id ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>+ Bookmark</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="no-match-state">
              No matching transcript moments found for "{searchResult.query}".
            </div>
          )}

          {/* Alternative Mentions (Top matches 2 & 3) */}
          {searchResult.topMatches && searchResult.topMatches.length > 1 && (
            <div className="alternative-matches">
              <div className="alt-title">Other Relevant Mentions</div>
              {searchResult.topMatches.slice(1).map((match, idx) => (
                <div className="alt-card" key={match.id || idx}>
                  <div className="alt-left">
                    <button
                      className="alt-time-btn"
                      onClick={() => handleJump(match.timestamp)}
                    >
                      <span>{formatTime(match.timestamp)}</span>
                    </button>
                    <p className="alt-text" title={match.text}>
                      {match.text}
                    </p>
                  </div>

                  <div className="alt-right">
                    <span className="alt-score">
                      {Math.round(match.matchScore * 100)}%
                    </span>
                    <button
                      className="alt-icon-btn"
                      onClick={() => handleSaveAsBookmark(match)}
                      title="Bookmark this moment"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
