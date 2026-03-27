import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReelQueueOverlay from './ReelQueueOverlay';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeReelUrl(href) {
  try {
    const u = new URL(href);
    // Only instagram.com reel or post URLs
    if (!u.hostname.includes('instagram.com')) return null;
    if (!/\/(reel|p)\/[A-Za-z0-9_-]+/.test(u.pathname)) return null;
    return u.origin + u.pathname.replace(/\/?$/, '/');
  } catch { return null; }
}

function isDMConversation(url) {
  return url.includes('/direct/t/');
}

function isReelUrl(url) {
  return /\/(reel|p)\/[A-Za-z0-9_-]+/.test(url);
}

// ─── Per-app CSS ──────────────────────────────────────────────────────────────

const INJECT_CSS = {
  instagram: `
    /* Hide bottom nav items except DMs */
    nav[role="navigation"] a[href="/"],
    nav[role="navigation"] a[href*="/explore"],
    nav[role="navigation"] a[href*="/reels"],
    a[href="/"] svg[aria-label="Home"],
    a[href*="/explore"] svg,
    a[href*="/reels"] svg { display: none !important; }

    /* Hide main feed, stories, suggested posts */
    main > div > div:first-child > div[style*="overflow"],
    div[data-pagelet="FeedStories"],
    section > div > div > div > ul,
    article[data-media-type="GraphSuggestedUserFeedUnit"] { display: none !important; }

    /* In reel view: hide Instagram's next-reel nav and suggested carousel */
    div[class*="ReelsRootContainerNextButton"],
    div[class*="_ac7v"][style*="snap"] ~ div { display: none !important; }

    /* Hide explore page */
    main[role="main"] header ~ section { display: none !important; }

    /* Queue mode: hide Instagram's native reel action buttons so our overlay is the only UI */
    body.om-queue-mode [aria-label="Next"],
    body.om-queue-mode [aria-label="Previous"],
    body.om-queue-mode div[class*="ReelActions"],
    body.om-queue-mode section > div[class*="Overlay"] { display: none !important; }
  `,

  twitter: `
    nav[aria-label="Primary"] a[href="/home"],
    nav[aria-label="Primary"] a[href="/explore"],
    nav[aria-label="Primary"] a[href="/notifications"],
    nav[aria-label="Primary"] a[href="/i/bookmarks"],
    nav[aria-label="Primary"] a[href*="/lists"],
    nav[aria-label="Primary"] a[href*="/communities"],
    nav[aria-label="Primary"] a[href*="/premium"],
    nav[aria-label="Primary"] a[href*="/verified-orgs"],
    nav[aria-label="Primary"] div[data-testid="AppTabBar_Home_Link"],
    nav[aria-label="Primary"] div[data-testid="AppTabBar_Explore_Link"],
    [data-testid="sidebarColumn"],
    aside[aria-label="Who to follow"],
    [data-testid="trend"],
    [data-testid="TimelineBecomeSuperFollower"],
    [data-testid="placementTracking"] { display: none !important; }
  `,

  linkedin: `
    .scaffold-layout__aside,
    .feed-follows-module,
    .news-module,
    .ad-banner-container,
    [data-ad-banner],
    .sponsored-content,
    .scaffold-layout__main > div > div[class*="feed"],
    .jobs-home-upsell,
    .global-nav__content li:not(:has(a[href*="/messaging"])):not(:has(a[href*="/mynetwork"])),
    .scaffold-layout__main .feed-following-sort-by-relevance-nudge,
    .scaffold-layout__main .share-box-feed-entry__top-bar,
    .core-rail { display: none !important; }
  `,
};

// ─── Per-app JS ───────────────────────────────────────────────────────────────

const INJECT_JS = {
  instagram: `
(function() {
  const DM_PATH = '/direct/inbox/';

  function maybeRedirect() {
    const p = location.pathname;
    if (p === '/' || p.startsWith('/explore') || p === '/reels/') {
      location.replace(DM_PATH); return;
    }
    if (p.match(/^\\/stories\\/[^/]+\\/?$/)) location.replace(DM_PATH);
  }

  maybeRedirect();

  // MutationObserver: remove next-reel overlays
  new MutationObserver(() => {
    document.querySelectorAll('[aria-label="Next"]').forEach(btn => {
      if (btn.closest('[role="dialog"]')) btn.style.display = 'none';
    });
  }).observe(document.body, { childList: true, subtree: true });

  // Badge polling
  setInterval(() => {
    const el = document.querySelector('a[href="/direct/inbox/"] span[title]') ||
               document.querySelector('[data-testid="badge"]');
    window.__omBadge = el ? (parseInt(el.textContent) || 0) : 0;
  }, 3000);
})();
`,

  twitter: `
(function() {
  const DM = '/messages';
  function redirect() {
    const p = location.pathname;
    if (p === '/' || p === '/home' || p.startsWith('/explore') || p.startsWith('/i/trending'))
      location.replace(DM);
  }
  redirect();
  const orig = history.pushState.bind(history);
  history.pushState = (...a) => { orig(...a); redirect(); };
  window.addEventListener('popstate', redirect);

  new MutationObserver(() => {
    const col = document.querySelector('[data-testid="primaryColumn"] [aria-label*="Timeline"]');
    if (!col || !location.pathname.match(/\\/[^/]+\\/status\\//)) return;
    let past = false;
    col.querySelectorAll('[data-testid="cellInnerDiv"]').forEach(c => {
      if (c.querySelector('[data-testid="tweet"]') && !past) { past = true; return; }
      if (past && !c.querySelector('[data-testid="tweet"]')) c.style.display = 'none';
    });
  }).observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    const el = document.querySelector('[data-testid="dmButton"] [data-testid="badge"]');
    window.__omBadge = el ? (parseInt(el.textContent) || 0) : 0;
  }, 3000);
})();
`,

  linkedin: `
(function() {
  const MSG = '/messaging/';
  function redirect() {
    const p = location.pathname;
    if ((p === '/' || p.startsWith('/feed')) && !p.startsWith('/feed/update/'))
      history.replaceState(null, '', MSG);
  }
  redirect();
  const orig = history.pushState.bind(history);
  history.pushState = (...a) => { orig(...a); redirect(); };
  window.addEventListener('popstate', redirect);

  new MutationObserver(() => {
    document.querySelectorAll('.scaffold-layout__aside,[data-ad-banner],.sponsored-content')
      .forEach(el => el.style.display = 'none');
  }).observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    const el = document.querySelector('.msg-overlay-bubble-header__badge,.notification-badge');
    window.__omBadge = el ? (parseInt(el.textContent) || 0) : 0;
  }, 3000);
})();
`,
};

// JS injected into an Instagram DM conversation page to scrape reel URLs
const INSTA_SCRAPE_JS = `
(function() {
  function scrape() {
    const urls = [...document.querySelectorAll('a[href]')]
      .filter(a => /\\/(reel|p)\\/[A-Za-z0-9_-]+/.test(a.href))
      .map(a => {
        try {
          const u = new URL(a.href);
          return u.origin + u.pathname.replace(/\\/?$/, '/');
        } catch { return null; }
      })
      .filter(Boolean);
    window.__omConversationReels = [...new Set(urls)];
  }
  scrape();
  new MutationObserver(scrape).observe(document.body, { childList: true, subtree: true });
})();
`;

// JS to send a reply message in an Instagram DM conversation
function buildReplyJS(text) {
  return `
(async function() {
  const text = ${JSON.stringify(text)};
  const input = document.querySelector('div[contenteditable="true"][role="textbox"]') ||
                document.querySelector('textarea[placeholder]');
  if (!input) return false;
  input.focus();
  if (input.tagName === 'TEXTAREA') {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')
      .set.call(input, text);
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
  } else {
    document.execCommand('selectAll', false);
    document.execCommand('insertText', false, text);
  }
  await new Promise(r => setTimeout(r, 250));
  const send = document.querySelector('[aria-label="Send"]') ||
               [...document.querySelectorAll('button')].find(b => /send/i.test(b.textContent));
  if (send) { send.click(); return true; }
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, keyCode: 13 }));
  return true;
})();
`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WebViewPane({ app, isActive, theme, onBadge }) {
  const wvRef    = useRef(null);
  const isDark   = theme === 'dark';

  // General webview state
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'ready' | 'error'

  // ── Instagram reel queue state ──────────────────────────────────────────────
  const [watchedUrls,      setWatchedUrls]      = useState(new Set());
  const [conversationUrl,  setConversationUrl]  = useState(null);
  const [conversationReels,setConversationReels]= useState([]); // all reels scraped from DM
  const [queueMode,        setQueueMode]        = useState(false);
  const [frozenQueue,      setFrozenQueue]      = useState([]); // snapshot of unread at queue entry
  const [queueIndex,       setQueueIndex]       = useState(-1); // index in frozenQueue
  const [isSending,        setIsSending]        = useState(false);

  // Ref to avoid stale closures in event listeners
  const stateRef = useRef({});
  stateRef.current = { conversationUrl, conversationReels, watchedUrls, frozenQueue, queueIndex };

  // ── Load watched reels from disk on mount ───────────────────────────────────
  useEffect(() => {
    if (app.id !== 'instagram') return;
    window.electronAPI.getWatchedReels().then(urls => {
      setWatchedUrls(new Set(urls));
    });
  }, [app.id]);

  // ── Poll scraped reels out of the Instagram webview ─────────────────────────
  const pollConversationReels = useCallback(() => {
    const wv = wvRef.current;
    if (!wv || app.id !== 'instagram') return;
    const id = setInterval(async () => {
      try {
        const reels = await wv.executeJavaScript('window.__omConversationReels || []');
        if (Array.isArray(reels) && reels.length > 0) {
          setConversationReels(reels);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [app.id]);

  // ── Enter queue mode ─────────────────────────────────────────────────────────
  const enterQueue = useCallback((reelUrl) => {
    const { conversationReels: reels, watchedUrls: watched } = stateRef.current;

    // Snapshot of unread reels at this moment
    const unread = reels.filter(u => !watched.has(u));
    const idx    = unread.indexOf(reelUrl);

    // Mark this reel as watched
    window.electronAPI.markReelWatched(reelUrl);
    setWatchedUrls(prev => new Set([...prev, reelUrl]));

    setFrozenQueue(unread);
    setQueueIndex(idx);   // -1 if reel isn't in unread list (already watched / solo view)
    setQueueMode(true);

    // Tell Instagram to enter queue-mode CSS class
    wvRef.current?.executeJavaScript("document.body.classList.add('om-queue-mode')").catch(() => {});
  }, []);

  // ── Exit queue mode ──────────────────────────────────────────────────────────
  const exitQueue = useCallback(() => {
    setQueueMode(false);
    setFrozenQueue([]);
    setQueueIndex(-1);
    wvRef.current?.executeJavaScript("document.body.classList.remove('om-queue-mode')").catch(() => {});

    const dest = stateRef.current.conversationUrl || 'https://www.instagram.com/direct/inbox/';
    wvRef.current?.loadURL(dest);
  }, []);

  // ── Navigate within queue ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    const { frozenQueue: q, queueIndex: i } = stateRef.current;
    const nextIdx = i + 1;
    if (nextIdx >= q.length) {
      // End of queue → return to conversation
      exitQueue();
      return;
    }
    const nextUrl = q[nextIdx];
    window.electronAPI.markReelWatched(nextUrl);
    setWatchedUrls(prev => new Set([...prev, nextUrl]));
    setQueueIndex(nextIdx);
    wvRef.current?.loadURL(nextUrl);
  }, [exitQueue]);

  const goPrev = useCallback(() => {
    const { frozenQueue: q, queueIndex: i } = stateRef.current;
    const prevIdx = i - 1;
    if (prevIdx < 0) return;
    const prevUrl = q[prevIdx];
    // Re-watching a previous one — mark watched again (no-op if already stored)
    window.electronAPI.markReelWatched(prevUrl);
    setQueueIndex(prevIdx);
    wvRef.current?.loadURL(prevUrl);
  }, []);

  // ── Reply to conversation ───────────────────────────────────────────────────
  const handleReply = useCallback(async (text) => {
    const wv = wvRef.current;
    if (!wv || !text.trim()) return;
    setIsSending(true);

    const dest = stateRef.current.conversationUrl || 'https://www.instagram.com/direct/inbox/';

    // Navigate to conversation, wait for ready, inject reply
    wv.loadURL(dest);
    const onReady = async () => {
      wv.removeEventListener('dom-ready', onReady);
      try {
        await new Promise(r => setTimeout(r, 800)); // let React render
        await wv.executeJavaScript(buildReplyJS(text));
      } catch {}
      setIsSending(false);
      setQueueMode(false);
      setFrozenQueue([]);
      setQueueIndex(-1);
    };
    wv.addEventListener('dom-ready', onReady);
  }, []);

  // ── Main webview event wiring ────────────────────────────────────────────────
  useEffect(() => {
    const wv = wvRef.current;
    if (!wv) return;

    let stopPolling = null;

    const onDomReady = () => {
      setLoadState('ready');

      // Inject CSS & JS
      const css = INJECT_CSS[app.id];
      if (css) wv.insertCSS(css).catch(() => {});
      const js  = INJECT_JS[app.id];
      if (js)  wv.executeJavaScript(js).catch(() => {});

      // Instagram: if on a DM conversation, inject scraper
      if (app.id === 'instagram') {
        const url = wv.getURL?.() || '';
        if (isDMConversation(url)) {
          wv.executeJavaScript(INSTA_SCRAPE_JS).catch(() => {});
          if (stopPolling) stopPolling();
          stopPolling = pollConversationReels();
        }
      }

      // Badge polling
      startBadgePolling();
    };

    const handleNavigation = (e) => {
      const url = e.url;
      if (!url || url === 'about:blank') return;

      if (app.id === 'instagram') {
        if (isDMConversation(url)) {
          // Entered a DM conversation
          setConversationUrl(url);
          if (queueMode) {
            setQueueMode(false);
            setFrozenQueue([]);
            setQueueIndex(-1);
          }
          // Scrape will be triggered on dom-ready
        } else if (isReelUrl(url) && !isSending) {
          // Only enter queue if we navigated here naturally (not via our own loadURL from reply)
          enterQueue(normalizeReelUrl(url) || url);
        }
      }
    };

    const onFailLoad = (e) => {
      // Ignore sub-resource failures (errorCode > -100 are aborts/cancels)
      if (e.errorCode > -100 && e.isMainFrame) setLoadState('error');
    };
    const onStartLoad = () => setLoadState('loading');
    const onFinishLoad = () => setLoadState('ready');

    wv.addEventListener('dom-ready',            onDomReady);
    wv.addEventListener('did-navigate',         handleNavigation);
    wv.addEventListener('did-navigate-in-page', handleNavigation);
    wv.addEventListener('did-fail-load',        onFailLoad);
    wv.addEventListener('did-start-loading',    onStartLoad);
    wv.addEventListener('did-finish-load',      onFinishLoad);

    // Keyboard shortcuts forwarded into webview
    const keyHandler = (e) => {
      if (!isActive || !e.metaKey) return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); wv.reload(); }
      // Don't intercept [ ] when in queue mode (we use ArrowLeft/Right instead)
      if (!queueMode) {
        if (e.key === '[') { e.preventDefault(); wv.goBack(); }
        if (e.key === ']') { e.preventDefault(); wv.goForward(); }
      }
    };
    window.addEventListener('keydown', keyHandler);

    return () => {
      wv.removeEventListener('dom-ready',            onDomReady);
      wv.removeEventListener('did-navigate',         handleNavigation);
      wv.removeEventListener('did-navigate-in-page', handleNavigation);
      wv.removeEventListener('did-fail-load',        onFailLoad);
      wv.removeEventListener('did-start-loading',    onStartLoad);
      wv.removeEventListener('did-finish-load',      onFinishLoad);
      window.removeEventListener('keydown', keyHandler);
      if (stopPolling) stopPolling();
    };
  }, [app.id, isActive, queueMode, isSending, enterQueue, pollConversationReels]);

  // ── Badge polling ────────────────────────────────────────────────────────────
  const startBadgePolling = useCallback(() => {
    const wv = wvRef.current;
    if (!wv) return;
    if (wv._badgeInterval) clearInterval(wv._badgeInterval);
    wv._badgeInterval = setInterval(async () => {
      try {
        const count = await wv.executeJavaScript('window.__omBadge || 0');
        onBadge(app.id, parseInt(count) || 0);
      } catch {}
    }, 4000);
  }, [app.id, onBadge]);

  const handleRetry = () => {
    setLoadState('loading');
    wvRef.current?.reload();
  };

  // ── Derived queue display values ─────────────────────────────────────────────
  const hasPrev = queueIndex > 0;
  const hasNext = queueIndex >= 0 && queueIndex < frozenQueue.length - 1;

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ display: isActive ? 'flex' : 'none' }}
      role="region"
      aria-label={app.label}
    >
      {/* Loading bar */}
      {loadState === 'loading' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 z-10 overflow-hidden" aria-hidden>
          <div className="h-full animate-pulse" style={{ background: '#3b82f6', width: '60%' }} />
        </div>
      )}

      {/* Error screen */}
      {loadState === 'error' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20"
          style={{ background: isDark ? '#1a1a1a' : '#f5f5f5' }}
          role="alert"
        >
          <div className="text-5xl" aria-hidden>⚠️</div>
          <p className="text-base font-medium" style={{ color: isDark ? '#ccc' : '#333' }}>
            Could not load {app.label}
          </p>
          <p className="text-sm" style={{ color: isDark ? '#888' : '#666' }}>
            Check your internet connection and try again.
          </p>
          <button
            onClick={handleRetry}
            className="mt-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
            style={{ background: '#3b82f6' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Webview */}
      <webview
        ref={wvRef}
        src={app.url}
        partition={app.partition}
        useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        allowpopups="true"
        webpreferences="contextIsolation=no"
        style={{
          flex: 1,
          width: '100%',
          border: 'none',
          visibility: loadState === 'error' ? 'hidden' : 'visible',
          // Make room for overlay at bottom when in queue mode
          paddingBottom: queueMode ? 108 : 0,
        }}
      />

      {/* Reel queue overlay — Instagram only */}
      {app.id === 'instagram' && queueMode && (
        <ReelQueueOverlay
          currentIndex={queueIndex}
          total={frozenQueue.length}
          hasPrev={hasPrev}
          hasNext={hasNext}
          theme={theme}
          isSending={isSending}
          onPrev={goPrev}
          onNext={goNext}
          onClose={exitQueue}
          onReply={handleReply}
        />
      )}
    </div>
  );
}
