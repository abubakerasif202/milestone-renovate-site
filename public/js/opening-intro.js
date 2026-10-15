(() => {
  'use strict';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sessionKey = 'milestone-opening-seen-v1';
  if (motion.matches || window.location.hash || !('HTMLDialogElement' in window)) return;
  // Storage failure bypasses the intro rather than replaying on every visit.
  try {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');
  } catch { return; }
  const intro = document.createElement('dialog');
  intro.className = 'opening-intro';
  intro.setAttribute('aria-label', 'Milestone Renovate opening animation');
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'none';
  video.setAttribute('aria-hidden', 'true');
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = 'Skip Intro';
  intro.append(video, skip);
  document.body.append(intro);
  let finished = false;
  let startupTimer;
  let safetyTimer;
  let removalTimer;
  const previousFocus = document.activeElement;
  const remove = () => {
    clearTimeout(removalTimer);
    video.pause();
    video.removeAttribute('src');
    video.load();
    intro.close();
    intro.remove();
    motion.removeEventListener('change', motionChanged);
    if (previousFocus instanceof HTMLElement && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
  };
  const finish = (immediate = false) => {
    if (finished) return;
    finished = true;
    clearTimeout(startupTimer);
    clearTimeout(safetyTimer);
    if (immediate || motion.matches) { remove(); return; }
    intro.classList.add('is-leaving');
    removalTimer = setTimeout(remove, 650);
  };
  function motionChanged() { if (motion.matches) finish(true); }
  skip.addEventListener('click', () => finish());
  intro.addEventListener('cancel', (event) => { event.preventDefault(); finish(); });
  video.addEventListener('ended', () => finish(), { once: true });
  video.addEventListener('error', () => finish(true), { once: true });
  video.addEventListener('playing', () => clearTimeout(startupTimer), { once: true });
  motion.addEventListener('change', motionChanged);
  startupTimer = setTimeout(() => finish(true), 3000);
  safetyTimer = setTimeout(() => finish(true), 12000);
  try {
    intro.showModal();
    video.src = video.canPlayType('video/webm; codecs="vp9"')
      ? '/assets/video/milestone-opening-125-v1.webm'
      : '/assets/video/milestone-opening-125-v1.mp4';
    video.play().catch(() => finish(true));
  } catch { finish(true); }
})();
