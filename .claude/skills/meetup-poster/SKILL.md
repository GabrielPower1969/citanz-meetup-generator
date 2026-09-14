---
name: meetup-poster
description: Generate CITANZ meetup posters (landscape EN 1200x628 for meetup.com/LinkedIn, portrait ZH 1587x2244 for 小红书) from event details. Use when the user gives a talk title, speaker, date, time, venue and asks for a meetup poster / 海报.
---

# Meetup poster

## Inputs to collect (ask only for what is missing)
- title (≤ ~85 chars; may contain `\n` for a deliberate line break)
- speaker: name, organisation, **photo (mandatory — ask for one if missing)**; save it as `assets/speakers/<first-last>.jpg`, square, face centred
- date (`Wednesday, 26 August 2026`), time (`6 PM – 8 PM NZDT` — use NZST May–Sep, NZDT Oct–Apr)
- venue (one line, wraps to two)
- sponsors: list of `{name, logo}` — logos go in `assets/sponsors/`; omit the array if none
- optional `qr_url` (meetup.com event URL); otherwise the CITANZ QR is used (landscape only)
- `zh.title` (Chinese title, ≤ 36 chars ≈ 3 lines of 12), `zh.date_time` (e.g. `8 月 26 日（周三）18:00 – 20:00`); write them yourself from the English if the user doesn't supply them, and show them for approval

## Steps
1. Write `events/<yyyy-mm-dd>-<topic>-<speaker>.json` (slug = same string, e.g. `2026-10-15-agent-security-ke-he`) following `events/schema.json` (copy `events/example.json`).
2. Run `npm run build events/<file>.json` — it installs anything missing on first use, renders both posters, validates, and builds the hand-off pack. Don't run npm install / playwright install yourself.
3. If it fails on typography (`orphan / ragged wrap`, `needs N lines`): reword the text or move the `\n` so every line is at least ~40% as wide as the widest — never squeeze font size and never edit the template for one event. Rules of thumb: EN landscape title ≤ 2 lines of ~26 chars; ZH portrait title ≤ 3 lines of 12 chars.
4. Open both PNGs and check them visually (title within 2 lines EN / 3 lines ZH, nothing overlapping the avatar, sponsor logos not cropped).
5. Everything lands in `output/<slug>/`: the two PNGs at the top level, and one sub-folder per recipient (`linkedin/`, `xiaohongshu/` for marketing; `meetup/`, `wechat/` for the organiser).

## Don'ts
- Don't change `templates/` or `design/` for a single event.
- Don't put Chinese in the landscape template or English-only copy in the portrait one; the fields are separate on purpose.
- Don't scale a PNG up for print; re-render with `--scale 4` instead.
