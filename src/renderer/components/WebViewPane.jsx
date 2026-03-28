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
    /* ── Left nav: hide everything except the Messages (DM) link ── */
    /* Hide Home */
    a[href="/"] { display: none !important; }
    /* Hide Explore */
    a[href*="/explore"] { display: none !important; }
    /* Hide Reels */
    a[href*="/reels"] { display: none !important; }
    /* Hide Threads */
    a[href*="threads.net"] { display: none !important; }

    /* Hide nav items by aria-label (stable across redesigns) */
    [aria-label="Home"],
    [aria-label="Explore"],
    [aria-label="Reels"],
    [aria-label="Marketplace"],
    [aria-label="Facebook"] { display: none !important; }

    /* Hide the main home feed article list */
    main[role="main"] > div > div > div > div > article,
    main[role="main"] > div > div > div > div > div > article { display: none !important; }

    /* Hide suggested posts / feed section outside DMs */
    [data-pagelet="FeedStories"],
    [data-pagelet="Feed"] { display: none !important; }

    /* In reel view: hide next-reel overlays and suggested carousel */
    [aria-label="Next reel"],
    [aria-label="Previous reel"] { display: none !important; }

    /* Hide explore grid */
    main[role="main"] header ~ section { display: none !important; }

    /* Queue mode: hide Instagram's own reel action bar */
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
  const DM = '/direct/inbox/';

  // ── 1. URL watchdog — catches everything including React internal navigation ──
  function isBlocked(p) {
    return p === '/'
      || p.startsWith('/explore')
      || p.startsWith('/reels')
      || p.startsWith('/stories')
      || p.startsWith('/marketplace')
      || p.startsWith('/gaming');
  }

  function maybeRedirect() {
    if (isBlocked(location.pathname)) location.replace(DM);
  }

  maybeRedirect();
  setInterval(maybeRedirect, 400); // poll every 400ms — catches React router misses

  // Also patch history API as a fast path
  ['pushState','replaceState'].forEach(fn => {
    const orig = history[fn].bind(history);
    history[fn] = (...a) => { orig(...a); maybeRedirect(); };
  });
  window.addEventListener('popstate', maybeRedirect);

  // ── 2. Click interception — block before navigation starts ───────────────────
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    try {
      if (isBlocked(new URL(a.href, location.origin).pathname)) {
        e.preventDefault(); e.stopPropagation(); maybeRedirect();
      }
    } catch {}
  }, true);

  // ── 3. Persistent <style> tag — survives React re-renders ───────────────────
  // Inline style changes get wiped by React reconciliation.
  // A <style> tag in <head> is owned by us and React never touches it.
  function ensureBlockStyle() {
    if (document.getElementById('om-block')) return;
    const s = document.createElement('style');
    s.id = 'om-block';
    s.textContent = \`
      a[href="/"],
      li:has(> a[href="/"]),
      a[href="/explore/"], a[href="/explore"],
      li:has(> a[href*="/explore"]),
      a[href="/reels/"], a[href="/reels"],
      li:has(> a[href*="/reels"]),
      [aria-label="Home"],
      [aria-label="Explore"],
      [aria-label="Reels"]
      { display: none !important; }
    \`;
    (document.head || document.documentElement).appendChild(s);
  }

  ensureBlockStyle();
  // Re-inject if React ever removes our <style> tag
  new MutationObserver(ensureBlockStyle).observe(document.documentElement, { childList: true });

  // ── 4. Badge polling ─────────────────────────────────────────────────────────
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

// ─── Per-app conversation scraping JS ─────────────────────────────────────────

const SCRAPE_CONVS_JS = {
  // ── WhatsApp & WhatsApp Business ──────────────────────────────────────────
  whatsapp: `
(function() {
  function scrape() {
    const seen = new Set();
    const result = [];

    // Primary: only the title cell, NOT message preview spans
    // [data-testid="cell-frame-title"] is scoped to contact name only
    document.querySelectorAll('#pane-side [data-testid="cell-frame-title"]').forEach(el => {
      const span = el.querySelector('span[title]') || el.querySelector('span') || el;
      const name = (span.getAttribute ? span.getAttribute('title') : null)?.trim()
                || span.textContent?.trim();
      if (!name || name.length < 2 || seen.has(name)) return;
      seen.add(name);
      const row = el.closest('[data-testid="cell-frame-container"]') || el.closest('li');
      const isGroup = row ? !!row.querySelector('span[data-icon*="group"]') : false;
      result.push({ name, type: isGroup ? 'group' : 'dm' });
    });

    // Fallback: aria-label on list items — WhatsApp sets these as "Contact Name, preview, time"
    if (result.length === 0) {
      document.querySelectorAll('#pane-side [role="listitem"]').forEach(el => {
        const label = el.getAttribute('aria-label');
        if (!label) return;
        const name = label.split(',')[0].trim();
        if (!name || name.length < 2 || seen.has(name)) return;
        seen.add(name);
        const isGroup = !!el.querySelector('span[data-icon*="group"]');
        result.push({ name, type: isGroup ? 'group' : 'dm' });
      });
    }

    if (result.length > 0) window.__omConversations = result.slice(0, 40);
    return result.length;
  }

  // Retry every 800ms for up to 30s until we get results
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (scrape() > 0 || attempts > 37) clearInterval(timer);
  }, 800);
  scrape(); // immediate first attempt

  // Keep updating on DOM changes
  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scrape, 300); })
    .observe(document.body, { childList: true, subtree: true });
})();
`,

  // ── Instagram ─────────────────────────────────────────────────────────────
  instagram: `
(function() {
  function scrape() {
    const seen = new Set();
    const result = [];

    // Strategy 1: DM conversation links
    document.querySelectorAll('a[href*="/direct/t/"]').forEach(el => {
      // Get the deepest text node that's a real name (not icon/button text)
      const allSpans = [...el.querySelectorAll('span')].filter(s =>
        !s.querySelector('span') && s.textContent.trim().length > 1
      );
      // Try aria-label on the link first (most reliable)
      const ariaLabel = el.getAttribute('aria-label')?.trim();
      const name = ariaLabel || allSpans[0]?.textContent?.trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      const isGroup = el.querySelectorAll('img[alt]').length > 1;
      result.push({ name, type: isGroup ? 'group' : 'dm' });
    });

    // Strategy 2: conversation list items (fallback for new IG layout)
    if (result.length === 0) {
      document.querySelectorAll('[role="listitem"] a, [class*="thread"] a').forEach(el => {
        if (!el.href?.includes('/direct/')) return;
        const name = el.getAttribute('aria-label')?.trim()
                  || el.querySelector('span')?.textContent?.trim();
        if (!name || name.length < 2 || seen.has(name)) return;
        seen.add(name);
        result.push({ name, type: 'dm' });
      });
    }

    if (result.length > 0) window.__omConversations = result.slice(0, 40);
    return result.length;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (scrape() > 0 || attempts > 37) clearInterval(timer);
  }, 800);
  scrape();

  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scrape, 300); })
    .observe(document.body, { childList: true, subtree: true });
})();
`,

  // ── Twitter / X ───────────────────────────────────────────────────────────
  twitter: `
(function() {
  function scrape() {
    const seen = new Set();
    const result = [];

    // Strategy 1: conversation items in DM list
    document.querySelectorAll('[data-testid="conversation"]').forEach(el => {
      const name = [...el.querySelectorAll('span[dir="ltr"]')]
        .map(s => s.textContent.trim())
        .find(t => t.length > 1 && !t.startsWith('@') && !/^\\d/.test(t));
      if (!name || seen.has(name)) return;
      seen.add(name);
      const isGroup = el.querySelectorAll('[data-testid*="UserAvatar"]').length > 1
                   || (el.getAttribute('aria-label') || '').toLowerCase().includes('group');
      result.push({ name, type: isGroup ? 'group' : 'dm' });
    });

    // Strategy 2: cell in messages list (fallback)
    if (result.length === 0) {
      document.querySelectorAll('[aria-label*="Direct Messages"] [role="listitem"]').forEach(el => {
        const name = el.querySelector('span[dir="ltr"]')?.textContent?.trim();
        if (!name || name.length < 2 || seen.has(name)) return;
        seen.add(name);
        result.push({ name, type: 'dm' });
      });
    }

    if (result.length > 0) window.__omConversations = result.slice(0, 40);
    return result.length;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (scrape() > 0 || attempts > 37) clearInterval(timer);
  }, 800);
  scrape();

  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scrape, 300); })
    .observe(document.body, { childList: true, subtree: true });
})();
`,

  // ── LinkedIn ──────────────────────────────────────────────────────────────
  linkedin: `
(function() {
  function scrape() {
    const seen = new Set();
    const result = [];

    // Strategy 1: conversation list items
    document.querySelectorAll('.msg-conversation-listitem__link, [class*="conversation-listitem"]').forEach(el => {
      const name = el.querySelector('[class*="participant-names"] span, [class*="ConversationTitle"], h3, strong')
                    ?.textContent?.trim()
                || el.getAttribute('aria-label')?.trim();
      if (!name || name.length < 2 || seen.has(name)) return;
      seen.add(name);
      const isGroup = name.includes(',') || !!el.querySelector('[class*="group-indicator"]');
      result.push({ name, type: isGroup ? 'group' : 'dm' });
    });

    // Strategy 2: li items in messaging sidebar
    if (result.length === 0) {
      document.querySelectorAll('.msg-conversations-container__conversations-list li').forEach(el => {
        const name = el.querySelector('h3, [class*="name"]')?.textContent?.trim();
        if (!name || name.length < 2 || seen.has(name)) return;
        seen.add(name);
        result.push({ name, type: 'dm' });
      });
    }

    if (result.length > 0) window.__omConversations = result.slice(0, 40);
    return result.length;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (scrape() > 0 || attempts > 37) clearInterval(timer);
  }, 800);
  scrape();

  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scrape, 300); })
    .observe(document.body, { childList: true, subtree: true });
})();
`,

  // ── Microsoft Teams ───────────────────────────────────────────────────────
  teams: `
(function() {
  function scrape() {
    const result = [];
    const seen   = new Set();

    // ── Chats (DMs & group chats) ──────────────────────────────────────────
    // Strategy 1: data-tid attributes (stable in Teams)
    document.querySelectorAll('[data-tid="chat-list-item"]').forEach(el => {
      const name = el.querySelector('[data-tid="chat-list-item-title"], [class*="itemTitle"], [class*="displayName"]')
                    ?.textContent?.trim()
                || el.getAttribute('aria-label')?.split(',')[0]?.trim();
      if (!name || name.length < 2 || seen.has(name)) return;
      seen.add(name);
      const isGroup = el.querySelectorAll('[class*="avatar"], [class*="Avatar"]').length > 1 || name.includes(',');
      result.push({ name, type: isGroup ? 'group' : 'dm' });
    });

    // Strategy 2: generic chat list items
    if (result.length === 0) {
      document.querySelectorAll('[aria-label*="chat list"] [role="listitem"], [class*="chatList"] li').forEach(el => {
        const name = el.querySelector('[class*="title"], [class*="name"], span[title]')
                      ?.textContent?.trim()
                  || el.getAttribute('aria-label')?.split(',')[0]?.trim();
        if (!name || name.length < 2 || seen.has(name)) return;
        seen.add(name);
        result.push({ name, type: 'dm' });
      });
    }

    // ── Channels ──────────────────────────────────────────────────────────
    document.querySelectorAll('[data-tid="channel-list-item"], [class*="channelItem"]').forEach(el => {
      const name = el.querySelector('[class*="channelName"], span[title], [class*="name"]')
                    ?.textContent?.trim()
                || el.getAttribute('aria-label')?.trim()
                || el.querySelector('span')?.textContent?.trim();
      if (!name || name.length < 2 || seen.has(name)) return;
      seen.add(name);
      result.push({ name, type: 'channel' });
    });

    if (result.length > 0) window.__omConversations = result.slice(0, 50);
    return result.length;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (scrape() > 0 || attempts > 37) clearInterval(timer);
  }, 800);
  scrape();

  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scrape, 400); })
    .observe(document.body, { childList: true, subtree: true });
})();
`,

  // ── Google Classroom ──────────────────────────────────────────────────────
  classroom: `
(function() {
  function scrape() {
    const result = [];
    const seen   = new Set();

    // Strategy 1: class cards on home screen
    document.querySelectorAll('[class*="courseCardContent"], [jscontroller][jsaction*="click"]').forEach(el => {
      const name = el.querySelector('h2, h3, [class*="courseName"], [class*="className"]')
                    ?.textContent?.trim();
      if (!name || name.length < 2 || seen.has(name)) return;
      seen.add(name);
      result.push({ name, type: 'class' });
    });

    // Strategy 2: left nav class links
    if (result.length === 0) {
      document.querySelectorAll('[aria-label*="class"] a, nav a[href*="/c/"]').forEach(el => {
        const name = el.textContent?.trim();
        if (!name || name.length < 2 || seen.has(name)) return;
        seen.add(name);
        result.push({ name, type: 'class' });
      });
    }

    // Strategy 3: page title when inside a class
    if (result.length === 0) {
      const title = document.querySelector('h1')?.textContent?.trim()
                 || document.title?.replace(/ - Google Classroom$/, '').trim();
      if (title && title.length > 2 && title !== 'Google Classroom') {
        result.push({ name: title, type: 'class' });
      }
    }

    if (result.length > 0) window.__omConversations = result.slice(0, 30);
    return result.length;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (scrape() > 0 || attempts > 37) clearInterval(timer);
  }, 800);
  scrape();

  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scrape, 400); })
    .observe(document.body, { childList: true, subtree: true });
})();
`,
};

// Add whatsapp-business as alias for whatsapp scraper
SCRAPE_CONVS_JS['whatsapp-business'] = SCRAPE_CONVS_JS['whatsapp'];

export default function WebViewPane({ app, isActive, theme, onBadge, onConversations, onRegisterControls, pendingReply, onPendingReplyDone }) {
  const wvRef    = useRef(null);
  const isDark   = theme === 'dark';

  // Lazy-load: mount immediately if active, otherwise after 4s (background load for contact scraping)
  const [everActivated, setEverActivated] = useState(false);
  useEffect(() => {
    if (isActive && !everActivated) { setEverActivated(true); return; }
    // Background: activate all apps after 4s so contacts index without user visiting each app
    const t = setTimeout(() => setEverActivated(true), 4000);
    return () => clearTimeout(t);
  }, [isActive]);

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

  // ── Register topbar controls when active ────────────────────────────────────
  useEffect(() => {
    if (!isActive || !onRegisterControls) return;
    onRegisterControls({
      back:    () => wvRef.current?.goBack(),
      forward: () => wvRef.current?.goForward(),
      reload:  () => wvRef.current?.reload(),
    });
  }, [isActive, onRegisterControls]);

  // ── Re-inject conversation scraper when switching to this tab ────────────────
  useEffect(() => {
    if (!isActive || !everActivated) return;
    const wv = wvRef.current;
    if (!wv) return;
    const convJs = SCRAPE_CONVS_JS[app.id];
    if (convJs) {
      // Small delay to let the webview settle after tab switch
      const t = setTimeout(() => { wv.executeJavaScript(convJs).catch(() => {}); }, 500);
      return () => clearTimeout(t);
    }
  }, [isActive, everActivated, app.id]);

  // ── Main webview event wiring ────────────────────────────────────────────────
  useEffect(() => {
    const wv = wvRef.current;
    if (!wv) return;

    let stopPolling = null;

    // ── will-navigate: fires BEFORE page renders — best place to block ─────────
    const onWillNavigate = (e) => {
      if (app.id !== 'instagram') return;
      try {
        const path = new URL(e.url).pathname;
        if (
          path === '/' ||
          path.startsWith('/explore') ||
          path.startsWith('/reels') ||
          path.startsWith('/stories') ||
          path.startsWith('/marketplace')
        ) {
          wv.loadURL('https://www.instagram.com/direct/inbox/');
        }
      } catch {}
    };
    wv.addEventListener('will-navigate', onWillNavigate);

    // ── new-window: keep navigation inside the webview ────────────────────────
    const onNewWindow = (e) => {
      const url = e.url;
      if (!url || url === 'about:blank') return;
      // Google auth popups need to open (they communicate back to opener for OAuth)
      if (/accounts\.google\.com/.test(url)) return;
      // Instagram: redirect non-DM new windows back to inbox
      if (app.id === 'instagram') {
        try {
          const path = new URL(url).pathname;
          if (!path.includes('/direct')) { wv.loadURL('https://www.instagram.com/direct/inbox/'); return; }
        } catch {}
      }
      // Everything else: load within the same webview
      wv.loadURL(url);
    };
    wv.addEventListener('new-window', onNewWindow);

    const onDomReady = () => {
      setLoadState('ready');

      // Inject CSS & JS
      const css = INJECT_CSS[app.id];
      if (css) wv.insertCSS(css).catch(() => {});
      const js  = INJECT_JS[app.id];
      if (js)  wv.executeJavaScript(js).catch(() => {});

      // Instagram: if on a DM conversation, inject reel scraper
      if (app.id === 'instagram') {
        const url = wv.getURL?.() || '';
        if (isDMConversation(url)) {
          wv.executeJavaScript(INSTA_SCRAPE_JS).catch(() => {});
          if (stopPolling) stopPolling();
          stopPolling = pollConversationReels();
        }
      }

      // Inject conversation scraper for search modal
      const convJs = SCRAPE_CONVS_JS[app.id];
      if (convJs) wv.executeJavaScript(convJs).catch(() => {});

      // Badge polling
      startBadgePolling();
    };

    const INSTA_BLOCKED_PATHS = ['/', '/explore/', '/reels/', '/explore', '/reels'];

    const handleNavigation = (e) => {
      const url = e.url;
      if (!url || url === 'about:blank') return;

      if (app.id === 'instagram') {
        // Renderer-level redirect — catches full-page navigations that bypass injected JS
        try {
          const path = new URL(url).pathname;
          const blocked = INSTA_BLOCKED_PATHS.includes(path)
            || path.startsWith('/explore')
            || path.startsWith('/reels')
            || path.startsWith('/stories')
            || path.startsWith('/marketplace');
          if (blocked) {
            wvRef.current?.loadURL('https://www.instagram.com/direct/inbox/');
            return;
          }
        } catch {}

        if (isDMConversation(url)) {
          setConversationUrl(url);
          if (queueMode) {
            setQueueMode(false);
            setFrozenQueue([]);
            setQueueIndex(-1);
          }
        } else if (isReelUrl(url) && !isSending) {
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
      wv.removeEventListener('will-navigate',        onWillNavigate);
      wv.removeEventListener('new-window',           onNewWindow);
      wv.removeEventListener('dom-ready',            onDomReady);
      wv.removeEventListener('did-navigate',         handleNavigation);
      wv.removeEventListener('did-navigate-in-page', handleNavigation);
      wv.removeEventListener('did-fail-load',        onFailLoad);
      wv.removeEventListener('did-start-loading',    onStartLoad);
      wv.removeEventListener('did-finish-load',      onFinishLoad);
      window.removeEventListener('keydown', keyHandler);
      if (stopPolling) stopPolling();
    };
  }, [app.id, isActive, queueMode, isSending, enterQueue, pollConversationReels, everActivated]);

  // ── Badge polling ────────────────────────────────────────────────────────────
  const startBadgePolling = useCallback(() => {
    const wv = wvRef.current;
    if (!wv) return;
    if (wv._badgeInterval) clearInterval(wv._badgeInterval);
    wv._badgeInterval = setInterval(async () => {
      try {
        const count = await wv.executeJavaScript(`
          (() => {
            // 1. App-specific badge var set by injected JS
            if (window.__omBadge) return window.__omBadge;
            // 2. WhatsApp: unread count elements
            const wa = document.querySelector('[data-testid="icon-unread-count"]');
            if (wa) return parseInt(wa.textContent) || 0;
            // 3. Generic fallback: "(N)" in page title — works for WhatsApp, Teams, etc.
            const m = document.title.match(/\\((\\d+)\\)/);
            if (m) return parseInt(m[1]);
            return 0;
          })()
        `);
        onBadge(app.id, parseInt(count) || 0);
      } catch {}
    }, 4000);
  }, [app.id, onBadge]);

  // ── Poll scraped conversations for search modal ──────────────────────────────
  useEffect(() => {
    if (!onConversations || !everActivated) return;
    const wv = wvRef.current;
    if (!wv) return;

    // Immediate read when pane becomes active
    const readNow = async () => {
      try {
        const convs = await wv.executeJavaScript('window.__omConversations || []');
        if (Array.isArray(convs) && convs.length > 0) onConversations(app.id, convs);
      } catch {}
    };

    if (isActive) readNow();

    const id = setInterval(readNow, 1500);
    return () => clearInterval(id);
  }, [app.id, onConversations, everActivated, isActive]);

  // ── Inject pending quick reply ────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingReply || !everActivated) return;
    const wv = wvRef.current;
    if (!wv) return;

    const inject = async () => {
      try {
        await new Promise(r => setTimeout(r, 600));
        await wv.executeJavaScript(buildReplyJS(pendingReply));
      } catch {}
      onPendingReplyDone?.();
    };

    const url = wv.getURL?.() || '';
    if (url && url !== 'about:blank') {
      inject();
    } else {
      const onReady = () => { wv.removeEventListener('dom-ready', onReady); inject(); };
      wv.addEventListener('dom-ready', onReady);
    }
  }, [pendingReply, everActivated]);

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

      {/* Webview — only mounted after first activation (lazy load) */}
      {everActivated && (
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <webview
            ref={wvRef}
            src={app.url}
            partition={app.partition}
            useragent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            allowpopups="true"
            webpreferences="contextIsolation=no"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: queueMode ? 'calc(100% - 108px)' : '100%',
              border: 'none',
              visibility: loadState === 'error' ? 'hidden' : 'visible',
            }}
          />
        </div>
      )}

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
