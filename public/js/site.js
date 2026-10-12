(() => {
  'use strict';
  const root = document.documentElement;
  const header = document.querySelector('#header');
  const menuButton = document.querySelector('[data-menu]');
  const nav = document.querySelector('#navigation');
  const mobile = window.matchMedia('(max-width: 870px)');

  function setMenu(open) {
    nav?.classList.toggle('open', open);
    root.classList.toggle('menu-open', open);
    menuButton?.setAttribute('aria-expanded', String(open));
    menuButton?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }
  const isOpen = () => Boolean(nav?.classList.contains('open'));

  menuButton?.addEventListener('click', () => {
    const open = !isOpen();
    setMenu(open);
    // The menu sits before the toggle in tab order, so hand focus to it; otherwise Tab skips the links just revealed.
    if (open) nav?.querySelector('a')?.focus();
  });
  nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      setMenu(false);
      menuButton?.focus();
      return;
    }
    // While the full-height menu is open, Tab cycles through its links and the close button only.
    if (e.key === 'Tab' && menuButton) {
      const stops = [...nav.querySelectorAll('a'), menuButton];
      const at = stops.indexOf(document.activeElement);
      const next = e.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : (at === -1 || at === stops.length - 1 ? 0 : at + 1);
      e.preventDefault();
      stops[next].focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (isOpen() && !e.target.closest('.nav-inner')) setMenu(false);
  });
  mobile.addEventListener?.('change', (e) => { if (!e.matches && isOpen()) setMenu(false); });

  // Masthead gains a shadow once the page has scrolled. Only the shadow changes, so the layout never jumps.
  if (header) {
    let ticking = false;
    const update = () => {
      ticking = false;
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // Offline illustration fallback for remotely hosted reference images (CSP forbids inline onerror).
  document.querySelectorAll('img[data-fallback]').forEach((img) => {
    const swap = () => {
      img.addEventListener('error', () => {}, { once: true });
      img.src = img.dataset.fallback;
      img.removeAttribute('data-fallback');
    };
    img.addEventListener('error', swap, { once: true });
    if (img.complete && img.naturalWidth === 0) swap();
  });
})();
