# promo/ — launch video for the generator

`index.html` is a 42 s, seekable HTML animation (Web Animations API). Open it in a browser and it plays; `render.mjs` drives it frame-by-frame through Playwright and pipes PNGs into ffmpeg, so the output is deterministic (no dropped frames, no screen recording).

```bash
node promo/render.mjs --gif                 # 1080×1350 (4:5, LinkedIn) MP4 + half-size GIF preview
node promo/render.mjs --h 1920              # 1080×1920 (9:16, 小红书)
node promo/render.mjs --stills 2.5,15.8,39  # PNG frames at given seconds, for design checks
node promo/render.mjs --from 1.3            # start once the first headline is up, so the platform's auto-thumbnail is not a blank canvas
```

Outputs land in `promo/out/` (git-ignored). Needs `ffmpeg` on PATH; Playwright's Chromium is the one the poster pipeline already installs.

Edit the storyboard in `index.html`: every element carries `data-in="<seconds>"` (+ optional `data-fx`, `data-out`, `data-strike`, `data-ok`, `data-count`, `data-grow`); cursors are `cursor(id, [[t,x,y],…])` waypoints at the bottom of the script. Layout is a fixed 1080×1350 safe box centred in whatever viewport you render, so 9:16 gets the same content letterboxed on the brand gradient.

Fonts (OFL, self-hosted in `fonts/`): Space Grotesk (display), Inter (body), JetBrains Mono (code); Chinese glyphs fall back to the pipeline's Noto Sans SC. Posters in `assets/` are down-scaled copies of `output/2026-08-26-blockchain/`.

`index.v1-dark.html` is the first draft (dark navy / Space Grotesk), kept for comparison; `copy/` holds the LinkedIn + 小红书 post text used on 2026-09-20.
