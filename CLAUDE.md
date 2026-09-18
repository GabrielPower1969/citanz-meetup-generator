# citanz-meetup-generator — map for agents

One event JSON → two posters + five channel announcements + per-recipient hand-off folders. Full design: `docs/ARCHITECTURE.md`. User docs: `README.md` / `README.zh-CN.md`.

## Commands
```bash
npm run build events/<event>.json    # THE command. Self-installs deps + Chromium if missing, then: 1 render → 2 validate → 3 write copy → output/<slug>/
npm run example                      # same on events/example.json (smoke test — must end OK with no TODO list)
npm run render|validate|copy events/<event>.json   # run one step alone
npm run report events/<event>.json   # STEP 4, post-event: `results` block → output/<slug>/report/复盘-post-<topic>-<date>.md
docker compose run --rm build events/<event>.json  # same pipeline in the Playwright image
```

## Where things are (folder order = data flow)
```
events/            INPUT. One JSON per event, name = slug = <date>-<topic>-<speaker>. schema.json = field reference, example.json = full sample.
                   Real events + speaker photos are git-ignored; only example.json / assets/speakers/scott.png are public.
config/citanz.json Org constants: fee, bank, hashtags, house schedule (18:00 doors / 18:30 talk+stream / 20:00), channel owners, copy file naming.
assets/            brand/ (locked) · fonts/ (Arimo + Noto Sans SC, self-hosted) · sponsors/ · speakers/
templates/posters/ <name>/template.html + meta.json ({{vars}}, absolute px on a fixed canvas; meta.exports = extra platform canvases, e.g. portrait → .xhs.png 3:4) · fit.js
templates/copy/    linkedin · xiaohongshu · meetup · wechat · teams · linkedin-recap · report .md ({{var}} {{#if}} {{#each}})
design/            poster_<name>_spec.json (measured from Canva, source of truth) · how-the-canva-design-was-measured.md
src/build.js       entry: env check, then spawns src/steps/1-render-posters.js → 2-validate-posters.js → 3-write-copy.js (stop on first failure)
src/steps/4-write-report.js   post-event, run separately: events/<slug>.json `results` → 复盘 report (templates/copy/report.md)
src/lib/event.js   ROOT, loadEvent (enforces slug format + speaker photo), dataUri, esc, readJson
output/<slug>/     <slug>.landscape.png, <slug>.portrait.png, <slug>.portrait.xhs.png, README.md, linkedin/ xiaohongshu/ meetup/ wechat/ teams/ report/
.claude/skills/    meetup-poster (facts → posters) · meetup-copy (notes → announcements + pack) · meetup-publish (meetup.com) · xiaohongshu-publish (小红书) · event-analytics (复盘: numbers + comments → report) · linkedin-recap (transcript + photos → ≤900-char recap → post)
```

## Invariants (do not break)
- **Fully offline rendering.** No Canva, no installed Chrome, no network. Fonts/images are data URIs; render and validate abort any non-`file://` request. Canva/Chrome DOM were used once, to measure `design/`.
- **Per event only these change on a poster:** speaker photo, title, name/org, venue (+ date/time, sponsor logos) — all from the event JSON. Everything else is locked brand layout.
- **Templates are transcriptions of `design/*.json`.** Change the spec first, then the template. Never edit a template for one event.
- **Typography is validated, not advised:** every line of a wrapped block ≥ 40 % of the widest (`ORPHAN_MIN`); auto-fit shrink ≤ 15 % (`SHRINK_MIN`); no overflow/overlap/photo collision. Fix = reword or move `\n`.
- **Speaker photo mandatory; slug format enforced** (`lib/event.js`).
- **Fixed wording lives in code, prose lives in the event JSON.** `config/` + `templates/copy/` hold fee, bank, agenda, thanks, hashtags, schedule lines; `copy.*` holds only what changes. A missing field renders `[TODO field]` and fails the build.
- **Public copy files are named `<channel>-post-<topic>-<date>.md`** (labels in `config.handoff_naming`): 领英 / 小红书 (+.txt) / meetup (+.txt) / 微信-本地会员群 / 微信-本地非会员群 / 微信-CITANZ大群 / Teams.
- **WeChat group variants come from `config.wechat_groups`, never from separate prose:** local groups get `#接龙` as line 1 (WeChat needs it to start a 接龙) and the venue; the nationwide 大群 gets no `#接龙`, no address, online emphasis.
- **Platform image standards are exports, not re-designs:** `meta.exports` pads the finished poster onto the platform's canvas (小红书 3:4) with the brand colour; never rescale or crop.
- **Channel folders are wiped and rebuilt on every copy run** so a renamed/removed file can't survive with stale content (e.g. an old venue).
- **Hand-off ownership:** LinkedIn + 小红书 → CITANZ marketing (they get `linkedin/`, `xiaohongshu/`); meetup.com, WeChat, Teams → organiser.
- **LinkedIn recap ≤ 900 chars:** hook + 3 takeaways + 1 quote; thanks/hashtags come from the template. `recap` block in the event JSON; photos in `assets/photos/<slug>/` (git-ignored), first = lead.
- **Every post-event number carries `checked` + `source`** (results block); the report prints them. No number without provenance.
- **Fixed process = code, judgement = skill.** Never re-derive setup/render/validate in prompts.

## Verify a change
1. `npm run example` prints `OK: …` and `wrote output/2026-08-26-blockchain/{…}` with no TODO list.
2. Compare `output/2026-08-26-blockchain/*.png` with `docs/images/*` (regenerate those previews if the design legitimately changed).
3. Poster/fit/validator changes: also try an ~85-char title and a 3-line venue — the FAIL message must name the block and say *reword*.
4. Copy/config changes: `npm run copy events/example.json`, diff the Markdown.
