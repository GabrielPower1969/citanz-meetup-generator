---
name: event-analytics
description: Post-event 复盘 for a CITANZ meetup — collect the numbers and comments from LinkedIn, meetup.com, 小红书, WeChat and Teams into the event JSON `results` block, then build output/<slug>/report/复盘-post-<topic>-<date>.md. Use when the user says "复盘" / "看看数据" / "分析这场活动" / "领英 analytics" / "评论分析", before or after the event.
---

# Event analytics (复盘)

Numbers live in `events/<slug>.json` → `results` (schema: `events/schema.json`). `npm run report events/<slug>.json` renders them. **Every number must carry `checked` (date) and `source` (the page it was read from)** — the report prints both, so a stale or invented figure is visible.

## Where each number comes from (browser, user's logged-in Chrome)
| Channel | Page | Read |
|---|---|---|
| LinkedIn | the post → **View analytics** (`/analytics/post-summary/urn:li:activity:…`) | impressions, reactions, comments, reposts; the "Discovery" breakdown (followers vs non-followers) and top viewer job titles are worth one sentence in observations |
| LinkedIn comments | the post itself | copy each substantive comment verbatim into `results.feedback` with `who` = name as shown, `channel` = 领英 |
| meetup.com | event → **Attendees** → **Manage** | `rsvps` = Going count; after the event, `attended` = people ticked as attended (organiser marks them) |
| 小红书 | creator.xiaohongshu.com → 笔记管理 → the note → 数据 | views (浏览), likes (点赞), saves (收藏), comments (评论); comments page for quotes |
| WeChat | the 接龙 threads | count names per group into `signups_member` / `signups_public`; quotes only if someone wrote more than a name |
| Teams | Teams calendar → the webinar → Attendance/Registration report | `registered`, `joined` |

Before the event, the same skill answers "how is promotion going": fill what exists so far and run the report; `attended` stays empty.

## Writing the analysis (this is the part only you do)
1. **Quotes first.** Paste comments verbatim; never paraphrase them into positivity. Tag each with a `theme` (e.g. 互动开场有效 / 时间太晚 / 想要录像).
2. **Observations = number + interpretation + evidence.** "244 impressions / 4 reactions: reach fine, hook weak — the first line is a topic statement, not a question." One line each, ≤ 5 lines.
3. **Actions are testable.** "Post LinkedIn at 8 am Tuesday next time" is an action; "improve engagement" is not.
4. Compare with the previous event's report in `output/<previous-slug>/report/` when it exists; say what moved.
5. `photos_folder`: where the photos/feedback went for the marketing team's post-event LinkedIn — a path or link, not a promise.

## Steps
1. Read `events/<slug>.json`; add/refresh `results` (browser reads above; `checked` = today).
2. `npm run report events/<slug>.json` → `output/<slug>/report/复盘-post-<topic>-<date>.md`.
3. Show the user the observations/actions for approval; they are judgement, not data.

## Don'ts
- No numbers without a `source`; no "about 200"; if a page can't be read, leave the field out and say so.
- Don't count the organiser's own reaction/RSVP as engagement.
- Don't post replies to comments from this skill — that is a message on the user's behalf; ask first.
