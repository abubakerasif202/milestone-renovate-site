// Milestone Renovate — shared motion system (loaded on every page, paired with css/motion.css).
//
// Contract: content is never hidden unless this script is running. Elements already on screen at start-up are
// left alone; only then is `html.motion-ready` added, and the CSS hides nothing without that class. Users who
// prefer reduced motion never get the class, so they see the complete static page.
// Everything animates transform / opacity / clip-path only.

(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;

  // Clear the entrance once interaction starts; retain the state so moving focus cannot replay it.
  const heroCopy = document.querySelector('.hero-copy');
  heroCopy?.addEventListener('focusin', () => heroCopy.classList.add('opening-interacted'), { once: true });

  // Blocks that rise in on first view. Siblings that share a parent are staggered.
  const REVEAL = [
    '.reveal', '.section-header', '.intro-grid > div', '.service-tile', '.journey-list', '.tool-card',
    '.platform-card', '.value-grid article', '.principles > div', '.inspo-card', '.gallery-card', '.faq-list details',
    '.team-card', '.service-row', '.cta-panel', '.footer-top > div', '.philosophy-media', '.compare',
    '.contact-grid > div', '.case-study',
  ].join(',');
  // Headings revealed through a mask: the text rises out of its own line box.
  const MASKED = 'main .section h2, .footer h2';
  const SKIP = '.hero, .inner-hero, [hidden], .wizard, .form-success';
  const STAGGER_CAP = 6;

  // Measuring every block forces layout, so do it once the first paint is out of the way.
  const init = () => {
    const fold = window.innerHeight * 0.92;
    const order = new Map();
    const targets = [];
    document.querySelectorAll(`${REVEAL},${MASKED}`).forEach((el) => {
      if (el.closest(SKIP) || el.parentElement.closest(REVEAL)) return; // its block already animates as a whole
      if (el.getBoundingClientRect().top < fold) return; // on screen at start-up: never hidden
      el.classList.add(el.matches(REVEAL) ? 'm-reveal' : 'm-mask');
      const index = order.get(el.parentElement) ?? 0;
      order.set(el.parentElement, index + 1);
      if (index) el.dataset.mStep = String(Math.min(index, STAGGER_CAP));
      targets.push(el);
    });

    const reveal = (el) => {
      if (el.classList.contains('is-in')) return;
      el.classList.add('is-in'); // the arrival animation is pure CSS from here
    };
    // Watch a masked heading through its parent block, so the heading lands as its section comes into view.
    const watched = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const arrived = watched.get(entry.target) || [];
        arrived.forEach(reveal);
        // A fast scroll, End key or anchor jump can skip blocks entirely; anything above the arrival is off-screen
        // by now, so show it too rather than leave a hidden gap behind the reader.
        const last = Math.max(...arrived.map((el) => targets.indexOf(el)));
        targets.slice(0, last).forEach(reveal);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    targets.forEach((el) => {
      const sentinel = el.classList.contains('m-mask') ? el.parentElement : el;
      watched.set(sentinel, [...(watched.get(sentinel) || []), el]);
      io.observe(sentinel);
    });
    root.classList.add('motion-ready');

    // Switching to reduced motion mid-session shows everything at once.
    reduced.addEventListener?.('change', (e) => {
      if (!e.matches) return;
      targets.forEach((el) => el.classList.add('is-in'));
      root.classList.remove('motion-ready');
    });

    // Scroll-linked depth: each [data-parallax] layer drifts by up to its value in px (negative = against the scroll).
    // The work runs in one rAF per scroll frame, only for layers that are on screen, and only on wider screens.
    document.querySelectorAll('.inner-hero-image img').forEach((img) => { img.dataset.parallax ??= '34'; });
    const layers = [...document.querySelectorAll('[data-parallax]')];
    if (!layers.length) return;
    const wide = window.matchMedia('(min-width: 761px)');
    // Offsets go through one constructable stylesheet rule per layer (CSP-safe: no inline style attributes).
    const sheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    const rules = new Map();
    layers.forEach((el, i) => {
      el.dataset.parallaxId = String(i);
      rules.set(el, sheet.cssRules[sheet.insertRule(`[data-parallax-id="${i}"]{--py:0px}`, sheet.cssRules.length)]);
    });
    const onScreen = new Set();
    let frame = 0;
    const tick = () => {
      frame = 0;
      const vh = window.innerHeight;
      onScreen.forEach((el) => {
        let offset = 0;
        if (wide.matches) {
          const r = el.getBoundingClientRect();
          // 0 while the layer's centre sits mid-viewport; ±1 as it reaches the top or bottom edge.
          const progress = Math.max(-1, Math.min(1, (vh / 2 - (r.top + r.height / 2)) / (vh / 2 + r.height / 2)));
          offset = progress * Number(el.dataset.parallax);
        }
        rules.get(el).style.setProperty('--py', `${offset.toFixed(1)}px`);
      });
    };
    const request = () => { if (!frame && onScreen.size) frame = requestAnimationFrame(tick); };
    const watch = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
      request();
    });
    layers.forEach((el) => watch.observe(el));
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(init, { timeout: 1200 });
  else setTimeout(init, 200);
})();
