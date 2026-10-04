export interface ExtractedChunk {
  start: number;
  text: string;
}

export interface CaptionCheckResult {
  hasCaptions: boolean;
  language?: string;
}

/**
 * Checks if the active YouTube tab has subtitles/captions enabled or available.
 * Uses world: 'MAIN' to inspect YouTube's player response and player state.
 */
export async function checkTabCaptions(tabId: number): Promise<CaptionCheckResult> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        try {
          const win = window as any;

          // 1. Check window.ytInitialPlayerResponse
          const tracks = win.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          if (Array.isArray(tracks) && tracks.length > 0) {
            return {
              hasCaptions: true,
              language: tracks[0]?.languageCode || 'en',
            };
          }

          // 2. Check movie_player JS API
          const player = (document.getElementById('movie_player') || document.querySelector('.html5-video-player')) as any;
          if (player?.getOption) {
            const tracklist = player.getOption('captions', 'tracklist');
            if (Array.isArray(tracklist) && tracklist.length > 0) {
              return {
                hasCaptions: true,
                language: tracklist[0]?.languageCode || 'en',
              };
            }
          }

          // 3. Check CC Button in player controls
          const ccBtn = document.querySelector('.ytp-subtitles-button') as HTMLElement;
          if (ccBtn && ccBtn.style.display !== 'none' && ccBtn.getAttribute('aria-hidden') !== 'true') {
            return { hasCaptions: true };
          }

          return { hasCaptions: false };
        } catch {
          return { hasCaptions: false };
        }
      },
    });

    return results[0]?.result || { hasCaptions: false };
  } catch {
    // If scripting is restricted, assume true so backend can attempt fallback
    return { hasCaptions: true };
  }
}

export interface TrackItem {
  baseUrl: string;
  languageCode: string;
  name?: string;
}

/**
 * 1. Grabs available caption track URLs directly from the active YouTube player state.
 * Runs inside world: 'MAIN' to read the page's player object and returns plain JSON.
 */
export async function getTrackListFromTab(
  tabId: number
): Promise<TrackItem[] | null> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        try {
          const win = window as any;
          const player = (document.getElementById('movie_player') || document.querySelector('.html5-video-player')) as any;

          // 1. Check movie_player getPlayerResponse() - active video state on modern YouTube
          let tracks = player?.getPlayerResponse?.()?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

          // 2. Fallback: window.ytInitialPlayerResponse
          if (!tracks || tracks.length === 0) {
            tracks = win.ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          }

          // 3. Fallback: ytd-watch-flexy playerData
          if (!tracks || tracks.length === 0) {
            const watchFlexy = document.querySelector('ytd-watch-flexy') as any;
            tracks = watchFlexy?.playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          }

          // 4. Fallback: ytd-app data
          if (!tracks || tracks.length === 0) {
            const ytdApp = document.querySelector('ytd-app') as any;
            tracks = ytdApp?.data?.playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          }

          if (!Array.isArray(tracks) || tracks.length === 0) {
            return null;
          }

          return tracks
            .map((t: any) => ({
              baseUrl: t.baseUrl || '',
              languageCode: t.languageCode || 'en',
              name: t.name?.simpleText || t.name?.runs?.[0]?.text || t.languageCode || 'Unknown',
            }))
            .filter((t: any) => Boolean(t.baseUrl));
        } catch {
          return null;
        }
      },
    });

    return results[0]?.result || null;
  } catch (err) {
    console.error('[TranscriptExtractor] Error getting tracks:', err);
    return null;
  }
}

/**
 * Parses XML transcript format (<text start="..." dur="...">words</text>).
 */
function parseXmlTranscript(xmlContent: string): ExtractedChunk[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  const textNodes = xmlDoc.querySelectorAll('text');
  const segments: ExtractedChunk[] = [];

  textNodes.forEach((node) => {
    const start = parseFloat(node.getAttribute('start') || '0');
    const rawText = node.textContent || '';
    const cleanText = rawText
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanText) {
      segments.push({
        start: Math.round(start * 100) / 100,
        text: cleanText,
      });
    }
  });

  return segments;
}

/**
 * 2. Fetches and parses the timed transcript using the extension's privileged network access.
 * Runs in the extension context with host_permissions ("https://www.youtube.com/*") so it is never
 * blocked by page CSP, credentials, or cloud IP limits.
 */
export async function extractTranscriptFromTab(
  tabId: number,
  preferredLang = 'en'
): Promise<ExtractedChunk[] | null> {
  try {
    const tracks = await getTrackListFromTab(tabId);
    if (!tracks || tracks.length === 0) {
      console.log('[TranscriptExtractor] No tracks found in tab');
      return null;
    }

    const lang = preferredLang.toLowerCase();

    // Prefer selected language (e.g., 'hi' or 'en'), then fallback to alternatives
    const selectedTrack =
      tracks.find((t) => t.languageCode === lang || t.languageCode.startsWith(lang)) ||
      tracks.find((t) => t.languageCode === 'en' || t.languageCode.startsWith('en')) ||
      tracks.find((t) => t.languageCode === 'hi' || t.languageCode.startsWith('hi')) ||
      tracks[0];

    if (!selectedTrack?.baseUrl) {
      return null;
    }

    // 1. Try fetching with fmt=json3 for clean JSON
    const jsonUrl = selectedTrack.baseUrl.includes('fmt=')
      ? selectedTrack.baseUrl
      : `${selectedTrack.baseUrl}&fmt=json3`;

    try {
      const res = await fetch(jsonUrl);
      if (res.ok) {
        const textData = await res.text();
        try {
          const jsonData = JSON.parse(textData);
          if (Array.isArray(jsonData.events)) {
            const chunks: ExtractedChunk[] = [];
            for (const ev of jsonData.events) {
              if (ev.segs && Array.isArray(ev.segs)) {
                const text = ev.segs.map((s: any) => s.utf8 || '').join(' ').trim();
                const start = (ev.tStartMs || 0) / 1000;
                if (text && text !== '\n') {
                  chunks.push({
                    start: Math.round(start * 100) / 100,
                    text: text.replace(/\s+/g, ' '),
                  });
                }
              }
            }
            if (chunks.length > 0) {
              console.log(`[TranscriptExtractor] Parsed ${chunks.length} chunks via json3`);
              return chunks;
            }
          }
        } catch {
          // If not valid JSON, try XML parser on textData
          const xmlChunks = parseXmlTranscript(textData);
          if (xmlChunks.length > 0) return xmlChunks;
        }
      }
    } catch (e) {
      console.warn('[TranscriptExtractor] json3 fetch failed, trying original URL', e);
    }

    // 2. Fallback to original baseUrl XML
    const fallbackRes = await fetch(selectedTrack.baseUrl);
    if (!fallbackRes.ok) return null;
    const xmlText = await fallbackRes.text();
    const chunks = parseXmlTranscript(xmlText);
    console.log(`[TranscriptExtractor] Parsed ${chunks.length} chunks via XML`);
    return chunks.length > 0 ? chunks : null;
  } catch (err) {
    console.error('[TranscriptExtractor] Failed to extract transcript:', err);
    return null;
  }
}
