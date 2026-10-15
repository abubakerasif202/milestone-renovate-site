# Homepage logo intro

The Python generator includes `public/js/opening-intro.js` and `public/css/opening-intro.css` only on the homepage. The existing homepage remains server-rendered underneath a modal dialog. No production deployment or configuration changes are required.

The supplied 1280x720, 24 fps source is 10 seconds long. Both delivered variants are 8 seconds, with 1.25x speed baked in, no audio, and no cropping. JavaScript playbackRate stays at 1. H.264 MP4 uses faststart, CRF 23 and yuv420p. VP9 WebM uses CRF 34. Assets have versioned names for the existing immutable cache policy.

Reproduce from the supplied original (FFmpeg):

```powershell
ffmpeg -i gemini_generated_video_3c7fac79.mp4 -an -vf 'setpts=PTS/1.25' -r 30 -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart milestone-opening-125-v1.mp4
ffmpeg -i milestone-opening-125-v1.mp4 -an -c:v libvpx-vp9 -crf 34 -b:v 0 -deadline good -cpu-used 3 milestone-opening-125-v1.webm
```

MP4: 1,170,106 bytes. WebM: 865,215 bytes. Supporting browsers select WebM before requesting media; others select MP4. Neither file is preloaded in HTML. Repeat tab sessions, reduced motion, fragment deep links, storage failures and unsupported dialogs bypass playback. Skip/escape/end fades take 600 ms; failures and a 3 second startup or 12 second total watchdog remove the modal immediately. The modal keeps focus out of the underlying page during playback. No-JavaScript visitors see the normal homepage.

Run `npm run build:site`, `npm test` and `npx playwright test tests/e2e/logo-intro.spec.js tests/e2e/opening.spec.js tests/e2e/forms.spec.js tests/e2e/calculator.spec.js` for focused validation. Local screenshots are saved to `.tmp/intro-*.png`. Real iPhone/Android hardware and production Lighthouse require separate validation; desktop browser emulation does not prove those results.
