# citanz-meetup-generator

Generates CITANZ (Chinese IT Association of New Zealand) meetup publicity material from one JSON event file.
Done: two poster templates (landscape EN 1200×628, portrait ZH 1587×2244) and four copy templates (LinkedIn, meetup.com, 小红书, WeChat 群) assembled into per-channel hand-off folders.
Later: 接龙 publishing schedule, post-event hand-off (photos/feedback) to marketing.

## Commands
```bash
npm run example                                  # full pipeline on data/example.json: render -> validate -> copy
npm run build data/<event>.json                  # self-installs deps + Chromium if missing, then render -> validate -> copy
                                                 # -> output/<slug>/ (PNGs) + output/<slug>/{linkedin,xiaohongshu,meetup,wechat}/
docker compose run --rm build data/<event>.json  # same inside the Playwright image (Linux path)
node src/render.js data/<event>.json             # renders every template (--template landscape|portrait to pick one, --scale 2 default)
node src/validate.js data/<event>.json           # overflow / clipping / missing-asset checks; exit 1 on failure
node src/copy.js data/<event>.json               # fill templates/copy/*.md, copy posters into hand-off folders; exit 1 on [TODO]
```

## Directory map
```
data/            one JSON per event (schema: data/schema.json; start from example.json). `copy.*` = LLM-written prose.
                 Real event files and speaker photos are git-ignored; only example.json / scott.png are shared.
config/citanz.json  org constants: fee text, bank account, base hashtags, WeChat group variants, hand-off owners
assets/brand/    CITANZ logo, watermark, QR, circuit lines, avatar ring  (locked design elements)
assets/sponsors/ sponsor logos          assets/speakers/  speaker photos (square, cropped to circle)
assets/fonts/    Arimo (Latin) + Noto Sans SC (CJK) — OFL/Apache, self-hosted, embedded as data URIs
templates/<name>/template.html + meta.json   HTML+CSS with {{vars}}; meta gives canvas size + lang. templates/fit.js is shared (auto-shrink)
templates/copy/*.md   Markdown copy templates ({{var}}, {{#if}}, {{#each}}) — fixed wording lives here
specs/           poster_*_spec.json — element positions/type scale extracted from Canva (source of truth for the template)
reference/       design-analysis.md (how the spec was measured, evidence table)
src/render.js    JSON -> HTML (self-contained, data URIs) -> PNG via Playwright
src/validate.js  post-render checks
src/copy.js      copy templates -> output/<slug>/<channel>/ (+ poster copied in)
scripts/build.js render + validate + copy in one go
output/          generated files, git-ignored; output/<slug>/ is the hand-off pack
.claude/skills/meetup-poster/SKILL.md   poster workflow for LLM agents
.claude/skills/meetup-copy/SKILL.md     copy-writing rules per channel + hand-off
.claude/skills/meetup-publish/SKILL.md  click-by-click meetup.com publishing recipe (browser)
```

## Invariants
- **Poster generation is fully offline.** No Canva, no installed Chrome, no network: templates are local HTML, fonts/images are embedded as data URIs, rendering uses Playwright's bundled headless Chromium, and `render.js`/`validate.js` abort any non-`file://` request. Canva and the Chrome DOM were used exactly once, to measure the design into `specs/`.
- Per event only four things change on a poster: speaker photo, title, speaker name/organisation, venue (+ date/time and sponsor logos from the same JSON). Everything else is locked brand layout.
- Each template must stay pixel-faithful to its `specs/poster_<name>_spec.json`; change the spec first, then the template.
- `{{title}}`, `{{venue}}`, `{{date_time}}` resolve to `ev.zh.*` in templates whose meta.lang is `zh`, falling back to the English fields.
- Text is real text (never baked into images). Dynamic blocks carry `data-max-lines`; the in-page script shrinks font to fit, `validate.js` fails if it still doesn't.
- Typography rules (all posters, enforced by validate.js): every line of a wrapped block ≥ 40% as wide as the widest (`ORPHAN_MIN`); auto-fit may shrink a block by at most 15% (`SHRINK_MIN`). Fix by rewording / moving `\n` / shortening, never by squeezing.
- House schedule (config/citanz.json `schedule`): doors 18:00, talk and online stream 18:30, end 20:00. Copy templates state it explicitly; WeChat/Teams must say 线上 18:30 开始.
- Every event needs a speaker photo (`speaker.photo`, enforced in lib.js). Slug = `<date>-<topic>-<speaker>` (enforced).
- Fixed process = code, not prompts. Anything an LLM would otherwise re-derive each time (env setup, rendering, validation, hand-off layout) lives in `scripts/` + `src/`; skills only describe judgement calls.
- Fonts and images are inlined as data URIs so `output/*.html` opens anywhere with no server.
- Fonts are self-hosted only (Arimo for Latin, Noto Sans SC for CJK). Never rely on system fonts.
- `assets/brand/*` are locked design elements — do not swap or restyle without a design decision.
- QR: if `qr_url` is present it is generated at render time; otherwise the static `assets/brand/citanz-qr.png` is used.
- Copy: prose is authored in the event JSON (`copy.*`), never in `output/`. Fixed wording (fee, bank account, agenda, thanks) comes from `config/` + `templates/copy/`; a missing field renders as `[TODO field]` and fails the build.
- Public copy file naming (global rule): `<channel>-post-<topic>-<date>.md` — e.g. `小红书-post-agent-security-2026-09-17.md`, `领英-post-…`, `微信-会员群-post-…`, `微信-非会员群-post-…`, `meetup-post-…` (+ `.txt`), `Teams-post-…`. Labels live in `config/citanz.json` `handoff_naming`; `topic` comes from the event JSON.
- Hand-off ownership: LinkedIn and 小红书 are posted by CITANZ marketing (they receive `output/<slug>/linkedin|xiaohongshu/`); meetup.com and WeChat are posted by the organiser.

## How to verify a change
1. `npm run example` must end with `wrote output/2026-08-26-blockchain/{…}` and no `TODO` list.
2. Open both `output/2026-08-26-blockchain.*.png` and compare against the Canva references (links in README). Check title position and wrapping, avatar, pill sizes, sponsor row alignment.
3. Try a long title (`data/example.json` with ~85 chars) — it must shrink, not overflow.
