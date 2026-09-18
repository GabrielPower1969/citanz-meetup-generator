# Skills — the lifecycle of one meetup

Read in this order; each skill says what it needs from the previous one. Fixed process lives in `src/` (run `npm run …`); a skill only holds the judgement calls and the click-by-click platform recipes.

| # | When | Skill | In → Out |
|---|---|---|---|
| 1 | speaker confirmed | `meetup-poster` | facts + photo → `events/<slug>.json` → two posters |
| 2 | same day | `meetup-copy` | speaker notes → `copy.*` prose → `npm run build` → `output/<slug>/` hand-off pack (5 channels) |
| 3 | pack approved | `meetup-publish` | `meetup/` → event live on meetup.com (create, announce, change venue) |
| 4 | pack approved | `xiaohongshu-publish` | `xiaohongshu/` → note live (3:4 image, 20/1000/10 limits) |
| 5 | day after | `event-recap` | transcript + photos → `recap.*` → LinkedIn + 小红书 recaps → posted |
| 6 | a few days after | `event-analytics` | numbers + quotes → `results.*` → `npm run report` → 复盘 |

Where to look for a fact: `CLAUDE.md` → "Where to look". Platform limits: `config/platforms.json`. House rules: `config/citanz.json`.
