import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { SemanticSearchTab } from '../components/SemanticSearchTab';
import { checkTabCaptions } from '../services/transcriptExtractor';
import {
  getYouTubeVideoInfo,
  getYouTubeCurrentTime,
  seekYouTubeVideo,
  formatTime,
  type YouTubeVideoInfo,
} from '../services/youtube';
import {
  saveBookmark,
  getBookmarks,
  deleteTimestamp,
  type BookmarkItem,
} from '../services/api';
import './BookmarkPage.scss';

export function BookmarkPage() {
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('yt_companion_email') || 'omkar@example.com';
  });
  const [tempEmail, setTempEmail] = useState(email);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  // Top Nav Tab: 'bookmarks' | 'search'
  const [navTab, setNavTab] = useState<'bookmarks' | 'search'>('bookmarks');
  const [hasCaptions, setHasCaptions] = useState<boolean | null>(null);

  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [note, setNote] = useState('');

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'all'>('current');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [refreshingTime, setRefreshingTime] = useState(false);
  const [fetchingBookmarks, setFetchingBookmarks] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Persist email changes
  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tempEmail.trim();
    if (!trimmed) return;
    setEmail(trimmed);
    localStorage.setItem('yt_companion_email', trimmed);
    setIsEditingEmail(false);
    setStatus({ type: 'info', text: `Switched account to ${trimmed}` });
  };

  // Sync current video info & time from YouTube
  const syncCurrentVideo = useCallback(async () => {
    try {
      const info = await getYouTubeVideoInfo();
      setVideoInfo(info);
      const time = await getYouTubeCurrentTime(info.tabId);
      setCurrentTime(time);

      // Check caption availability in active tab
      const captionRes = await checkTabCaptions(info.tabId);
      setHasCaptions(captionRes.hasCaptions);
    } catch {
      setVideoInfo(null);
      setHasCaptions(null);
    }
  }, []);

  // Fetch bookmarks from backend
  const loadBookmarks = useCallback(async () => {
    if (!email) return;
    setFetchingBookmarks(true);
    try {
      const data = await getBookmarks(
        email,
        activeTab === 'current' && videoInfo ? videoInfo.youtubeId : undefined
      );
      setBookmarks(data);
    } catch (err: unknown) {
      console.error('Failed to fetch bookmarks:', err);
    } finally {
      setFetchingBookmarks(false);
    }
  }, [email, activeTab, videoInfo]);

  // Initial load
  useEffect(() => {
    syncCurrentVideo();
  }, [syncCurrentVideo]);

  // Re-fetch bookmarks when activeTab, videoInfo, or email changes
  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // Refresh current playback time
  const handleRefreshTime = async () => {
    if (!videoInfo) return;
    setRefreshingTime(true);
    try {
      const time = await getYouTubeCurrentTime(videoInfo.tabId);
      setCurrentTime(time);
    } catch {
      // Ignore
    } finally {
      setTimeout(() => setRefreshingTime(false), 300);
    }
  };

  // Handle saving a timestamp bookmark
  const handleBookmark = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!videoInfo) {
      setStatus({ type: 'error', text: 'Please open a YouTube video first.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // Read latest timestamp directly from player
      const timeInSec = await getYouTubeCurrentTime(videoInfo.tabId);
      setCurrentTime(timeInSec);

      await saveBookmark({
        email,
        youtubeId: videoInfo.youtubeId,
        title: videoInfo.title,
        timeInSec,
        note: note.trim() || undefined,
      });

      setStatus({
        type: 'success',
        text: `Saved timestamp at ${formatTime(timeInSec)}!`,
      });
      setNote('');
      await loadBookmarks();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStatus({ type: 'error', text: err.message });
      } else {
        setStatus({ type: 'error', text: 'Could not connect to backend server.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Seek video player to timestamp
  const handleSeek = async (timeInSec: number) => {
    if (!videoInfo) return;
    try {
      await seekYouTubeVideo(videoInfo.tabId, timeInSec);
      setStatus({ type: 'info', text: `Jumped to ${formatTime(timeInSec)}` });
      setTimeout(() => setStatus(null), 2500);
    } catch {
      setStatus({ type: 'error', text: 'Failed to seek video in active tab.' });
    }
  };

  // Copy shareable link
  const handleCopyLink = (youtubeId: string, timeInSec: number, id: string) => {
    const url = `https://youtu.be/${youtubeId}?t=${Math.floor(timeInSec)}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Delete a timestamp
  const handleDeleteTimestamp = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTimestamp(id);
      setBookmarks((prev) =>
        prev
          .map((b) => ({
            ...b,
            timestamps: b.timestamps.filter((t) => t.id !== id),
          }))
          .filter((b) => b.timestamps.length > 0)
      );
      setStatus({ type: 'success', text: 'Timestamp deleted.' });
      setTimeout(() => setStatus(null), 2000);
    } catch (err: unknown) {
      setStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete timestamp',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filter timestamps for search query
  const allTimestamps = bookmarks.flatMap((b) =>
    b.timestamps.map((t) => ({
      ...t,
      videoTitle: b.title,
      youtubeId: b.youtubeId,
    }))
  );

  const filteredTimestamps = searchQuery.trim()
    ? allTimestamps.filter(
        (t) =>
          (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
          t.videoTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          formatTime(t.timeInSec).includes(searchQuery)
      )
    : allTimestamps;

  // Universal Seek: active tab or open in new tab
  const handleUniversalSeek = async (timeInSec: number, targetYoutubeId?: string) => {
    if (videoInfo && (!targetYoutubeId || targetYoutubeId === videoInfo.youtubeId)) {
      await handleSeek(timeInSec);
    } else if (targetYoutubeId) {
      chrome.tabs.create({
        url: `https://www.youtube.com/watch?v=${targetYoutubeId}&t=${Math.floor(timeInSec)}s`,
      });
      setStatus({ type: 'info', text: `Opened video at ${formatTime(timeInSec)}` });
      setTimeout(() => setStatus(null), 2500);
    }
  };

  return (
    <div className="bookmark-page">
      <Header
        email={email}
        isConnected={!!videoInfo}
        onEditEmail={() => {
          setTempEmail(email);
          setIsEditingEmail(!isEditingEmail);
        }}
      />

      {/* Top Primary Navigation Bar */}
      <div className="nav-tabs-bar">
        <button
          className={`nav-tab-item ${navTab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setNavTab('bookmarks')}
          type="button"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>Bookmarks</span>
        </button>

        <button
          className={`nav-tab-item ${navTab === 'search' ? 'active' : ''} ${hasCaptions === false ? 'no-captions' : ''}`}
          onClick={() => setNavTab('search')}
          type="button"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span>AI Search</span>
          {hasCaptions === false ? (
            <span className="no-captions-badge">No Captions</span>
          ) : (
            <span className="ai-badge">AI</span>
          )}
        </button>
      </div>

      {/* Quick Email Switcher Drawer */}
      {isEditingEmail && (
        <form className="email-drawer" onSubmit={handleSaveEmail}>
          <input
            className="email-input"
            type="email"
            value={tempEmail}
            onChange={(e) => setTempEmail(e.target.value)}
            placeholder="Enter your email"
            autoFocus
          />
          <button className="save-email-btn" type="submit">
            Save
          </button>
        </form>
      )}

      {/* Main Content Area */}
      <div className="main-content">
        {navTab === 'search' ? (
          <SemanticSearchTab
            activeVideo={videoInfo}
            email={email}
            savedBookmarks={bookmarks}
            hasCaptions={hasCaptions}
            onSeek={handleUniversalSeek}
            onBookmarkSaved={loadBookmarks}
            onSwitchToBookmarks={() => setNavTab('bookmarks')}
          />
        ) : (
          <>
            {/* Active Video Status Banner */}
        {videoInfo ? (
          <div className="video-banner">
            <div className="video-info">
              <div className="video-label">Active YouTube Video</div>
              <div className="video-title" title={videoInfo.title}>
                {videoInfo.title}
              </div>
            </div>

            <button
              className="time-sync-btn"
              onClick={handleRefreshTime}
              title="Click to sync current playback time"
            >
              <svg
                className={`sync-icon ${refreshingTime ? 'spinning' : ''}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{formatTime(currentTime)}</span>
            </button>
          </div>
        ) : (
          <div className="offline-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Open a YouTube video to bookmark moments live.</span>
          </div>
        )}

        {/* Capture Timestamp Form Card */}
        <form className="capture-card" onSubmit={handleBookmark}>
          <div>
            <div className="form-header">
              <label className="form-label">Timestamp Note</label>
              {videoInfo && (
                <span className="current-time-tag">
                  At <strong>{formatTime(currentTime)}</strong>
                </span>
              )}
            </div>

            <input
              className="note-input"
              type="text"
              placeholder="e.g., Key concept explained, formula, bug fix"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!videoInfo || loading}
            />
          </div>

          <button className="submit-btn" type="submit" disabled={!videoInfo || loading}>
            {loading ? (
              <>
                <svg
                  className="btn-spinner"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                <span>Saving Timestamp...</span>
              </>
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span>Bookmark Moment</span>
              </>
            )}
          </button>
        </form>

        {/* Status Toast / Alert */}
        {status && (
          <div className={`status-alert ${status.type}`}>
            <span>{status.text}</span>
            <button className="dismiss-btn" onClick={() => setStatus(null)}>
              ×
            </button>
          </div>
        )}

        {/* Timestamps Section */}
        <div className="timestamps-section">
          <div className="section-header">
            <div className="title-group">
              <h2 className="section-title">Saved Timestamps</h2>
              <span className="count-badge">{filteredTimestamps.length}</span>
            </div>

            <div className="actions-group">
              {/* Segmented View Switcher */}
              <div className="segmented-switcher">
                <button
                  className={`tab-btn ${activeTab === 'current' ? 'active' : ''}`}
                  onClick={() => setActiveTab('current')}
                >
                  This Video
                </button>
                <button
                  className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All Videos
                </button>
              </div>

              {/* Refresh button */}
              <button
                className="refresh-btn"
                onClick={loadBookmarks}
                title="Refresh timestamps"
              >
                <svg
                  className={`refresh-icon ${fetchingBookmarks ? 'spinning' : ''}`}
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search field */}
          {allTimestamps.length > 3 && (
            <div className="search-container">
              <input
                className="search-field"
                type="text"
                placeholder="Search notes or timestamps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Timestamps List */}
          <div className="timestamps-list">
            {fetchingBookmarks && filteredTimestamps.length === 0 ? (
              <div className="loading-state">Loading timestamps...</div>
            ) : filteredTimestamps.length > 0 ? (
              filteredTimestamps.map((item) => {
                const isCurrentVideoTab = videoInfo && videoInfo.youtubeId === item.youtubeId;

                return (
                  <div className="timestamp-card" key={item.id}>
                    <div className="card-top">
                      <button
                        className="time-badge"
                        onClick={() => {
                          if (isCurrentVideoTab) {
                            handleSeek(item.timeInSec);
                          } else {
                            chrome.tabs.create({
                              url: `https://www.youtube.com/watch?v=${item.youtubeId}&t=${Math.floor(item.timeInSec)}s`,
                            });
                          }
                        }}
                        title={
                          isCurrentVideoTab
                            ? 'Click to jump to this moment in video'
                            : 'Open video in new tab at this timestamp'
                        }
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>{formatTime(item.timeInSec)}</span>
                      </button>

                      <div className="item-actions">
                        <button
                          className={`action-btn ${copiedId === item.id ? 'copied' : ''}`}
                          onClick={() => handleCopyLink(item.youtubeId, item.timeInSec, item.id)}
                          title="Copy YouTube URL at timestamp"
                        >
                          {copiedId === item.id ? (
                            <>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>Copied</span>
                            </>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>

                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteTimestamp(item.id)}
                          disabled={deletingId === item.id}
                          title="Delete timestamp"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className={`note-content ${!item.note ? 'empty' : ''}`}>
                      {item.note || 'No note attached'}
                    </div>

                    {activeTab === 'all' && (
                      <div className="video-origin-tag">
                        📺 {item.videoTitle}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <div className="empty-icon-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="empty-title">No timestamps saved yet</div>
                <div className="empty-subtitle">
                  {videoInfo
                    ? 'Click "Bookmark Moment" above to save your first timestamp.'
                    : 'Open a YouTube video to capture timestamps.'}
                </div>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
