(() => {
  'use strict';
  const menuButton = document.querySelector('[data-menu]');
  const nav = document.querySelector('#navigation');

  function setMenu(open) {
    nav?.classList.toggle('open', open);
    menuButton?.setAttribute('aria-expanded', String(open));
    menuButton?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }

  menuButton?.addEventListener('click', () => {
    const open = !nav?.classList.contains('open');
    setMenu(open);
    // The menu sits before the toggle in tab order, so hand focus to it; otherwise Tab skips the links just revealed.
    if (open) nav?.querySelector('a')?.focus();
  });
  nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav?.classList.contains('open')) {
      setMenu(false);
      menuButton?.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (nav?.classList.contains('open') && !e.target.closest('.nav-inner')) setMenu(false);
  });

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
