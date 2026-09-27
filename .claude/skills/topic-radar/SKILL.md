---
name: topic-radar
description: Decide what the next meetup (or the next personal post) should be about, using evidence instead of taste. Collects signals into topics/backlog.json, refreshes topics/profile.json from watch history and projects, then runs `npm run topics` to rank. Use when the user says "选题" / "下一场讲什么" / "我该做什么内容" / "topic ideas" / "backlog", or right after a 复盘 is written.
---

# Topic radar (step 0 — where the loop closes)

The pipeline is a circle: **选题 → 发布 → 分析 → 选题**. `event-analytics` closes the far side by writing
`results.next_topics`; this skill is the near side — it turns scattered signals into a ranked, arguable shortlist.

Fixed process is code: `npm run topics` (meetup) / `npm run topics -- --track personal` (my own content).
Judgement is here.

## The one rule

**A topic with no resolvable evidence is not a topic, it is a mood.**
Evidence is `<event-slug>:<path-into-results>` or `me:<path-into-topics/profile.json>`; the ranker resolves
every ref and grades it A / B / D (see `topics/schema.json`). D-only candidates are printed in their own
section and never ranked. Never "fix" a low score by inventing evidence — go and find a real signal, or drop it.

## Where signals actually come from

| Signal | Where | Worth |
|---|---|---|
| Live Q&A | transcript → `results.qa_questions` | **Highest.** People paid attention and still had to ask. |
| Comments / 接龙 replies | LinkedIn, 小红书, WeChat | High when specific ("can you cover X"), noise when "nice". |
| Channel benchmarks | `results.benchmark_*` | Tells you which *angle* a channel will carry, not what to teach. |
| Audience profile | `results.audience_linkedin`, `meetup.first_time_attendees` | Sets the level. 38 % Entry + 32 % first-timers ⇒ on-ramp required. |
| Speaker offers | the CTA in `config.cta` | The bottleneck. Log every "I could talk about…" into `backlog.speakers`. |
| My own consumption | `topics/profile.json` (`me:` refs) | For the `personal` track: what I finish, not what I click. |

## Judgement the tool cannot make

1. **Volume ≠ interest. Completion is interest.** In the 2026-09 profile, 计算机技术 was watched 62 times but
   finished 24 % of the time, while 职业职场 was watched 147 times and finished 69 %. Rank by what gets finished.
2. **Consumption ≠ qualification.** Watching 96 management videos does not make a management talk honest.
   If there is no first-hand experience, say so in `audience_fit_why` and score it low — or reshape the topic
   into the angle you *can* own ("a learner's notes", "an engineer's view of X").
3. **Separate the household.** A shared YouTube account contains kids' and family content. Strip it before
   drawing any conclusion, and write the caveat into the profile file.
4. **One event, one topic.** Do not merge two candidates into a "combined" session to satisfy both.
5. **`audience_fit` / `channel_pull` are yours, not the tool's.** Each needs a `_why` that a stranger could argue
   with; the test suite fails if one is set without a reason.

## Refreshing the self-profile (`personal` track)

Only when it is stale (> 3 months) or the user asks. Browser work, user's own logged-in Chrome, data stays local.

- **B站**: `api.bilibili.com/x/web-interface/history/cursor?ps=30&type=archive`, page by cursor until a page is empty.
  Retention is ~3 months — do not promise more.
- **YouTube**: `youtube.com/feed/history` → `ytInitialData` for the first screen. Deeper needs real scrolling
  (`computer` scroll — synthetic wheel events are untrusted and do nothing, and a background tab is paused).
  Row-level export is blocked both ways (Chrome private-network → localhost, Brave auto-download), so store
  aggregates and say so. **Full history = Google Takeout, nothing else.**
- Then rewrite `topics/profile.json`: every block carries `checked` + `source`, same as post-event numbers.
- `topics/profile/` and `topics/profile.json` are git-ignored. Keep it that way.

## Steps

1. Read the newest `output/<slug>/report/复盘-*.md` and any fresh comments.
2. Add or update candidates in `topics/backlog.json` — every one with `evidence`, `audience_fit_why`,
   `channel_pull_why`, and an honest `speaker.status`.
3. `npm run topics` (and `-- --track personal` for my own content) → `output/topics/选题-<track>-<date>.md`.
4. Read the console tail: it names any `next_topics` from a 复盘 that never made it into the backlog. Add them.
5. Show the user the top 3 **with their blockers**. The blocker is usually "no speaker" — that is the real work.
6. When one is chosen: set its `status` to `scheduled` and fill `event`; then `meetup-poster` builds the event JSON.
7. After the event, `event-analytics` fills `results`; set the candidate to `done` and write `outcome`. The loop is closed.

## Don'ts

- Don't rank a topic because it is interesting to you; rank it because a named signal asked for it.
- Don't let a dropped candidate vanish — set `status: dropped` + `dropped_why`, so the same idea does not come back in six months.
- Don't copy watch-history titles into a public post. That data is private.
- Don't claim a date range the platform does not actually retain.
