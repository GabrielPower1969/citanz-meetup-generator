---
name: event-analytics
description: Post-event 复盘 for a CITANZ meetup — collect the numbers and comments from LinkedIn, meetup.com, 小红书, WeChat and Teams into the event JSON `results` block, then build output/<slug>/report/复盘-post-<topic>-<date>.md. Use when the user says "复盘" / "看看数据" / "分析这场活动" / "领英 analytics" / "评论分析", before or after the event.
---

# Event analytics (复盘)

Numbers live in `events/<slug>.json` → `results` (schema: `events/schema.json`). `npm run report events/<slug>.json` renders them. **Every number must carry `checked` (date) and `source` (the page it was read from)** — the report prints both, so a stale or invented figure is visible.

The point of the report is section 5, **下次选题方向**. Numbers are only the evidence.

## Where each number comes from (browser, user's logged-in Chrome)
| Channel | Page | Read |
|---|---|---|
| LinkedIn | the post → **View analytics** (`/analytics/post-summary/urn:li:activity:…`) | impressions, reactions, comments, reposts; the "Discovery" breakdown (followers vs non-followers) and top viewer job titles are worth one sentence in observations |
| LinkedIn comments | the post itself | copy each substantive comment verbatim into `results.feedback` with `who` = name as shown, `channel` = 领英 |
| meetup.com | event → **Attendees** → **Manage** | `rsvps` = Going count; after the event, `attended` = people ticked as attended (organiser marks them) |
| 小红书 | creator.xiaohongshu.com → 笔记管理 → the note → 数据 | views (浏览), likes (点赞), saves (收藏), comments (评论); comments page for quotes |
| WeChat | the 接龙 threads | count names per group into `signups_member` / `signups_public`; quotes only if someone wrote more than a name |
| Teams | Teams calendar → the webinar → Attendance/Registration report | `registered`, `joined` |

**Always collect the announcement post's numbers too**, into `linkedin_announcement` / `xiaohongshu_announcement`. Announcement-vs-recap is the comparison that tells you what each channel is actually for (2026-09-23: LinkedIn recap 692 impressions vs announcement 301, and the announcement drove **1** click to meetup — so LinkedIn does not bring RSVPs).

**Also collect a benchmark from the same account** into `benchmark_xiaohongshu`: the best-performing few notes that are *not* about a meetup. Without it you cannot tell "the post did badly" from "this platform's audience doesn't want this subject" (2026-09-23: tech notes 115–118 views vs the same account's career notes 375–493 / 24 saves).

Browser gotchas (2026-09-23): LinkedIn analytics only exist for the author — check `linkedin.com/in/me/` first, and `switch_browser` if the Chrome in use is signed into someone else. 小红书 comments **cannot** be read on the web (`xiaohongshu.com/explore/<id>` returns 当前笔记暂时无法浏览) — the creator platform shows the count only, so ask the user to copy the comment text from the phone app. meetup's 到场 is only real if someone used check-in on the night.

Before the event, the same skill answers "how is promotion going": fill what exists so far and run the report; `attended` stays empty.

## Mining the transcript for topic signals (do this before touching the numbers)
The questions the audience asked out loud are the strongest next-topic evidence there is, and they are already on disk in the transcript. Pull the Q&A section, write each question into `results.qa_questions` with a one-word `theme`, then count the themes. On 2026-09-17, 3 of 7 questions were about using AI safely with company data — that, not the view counts, is what picked the next topic.

## Writing the analysis (this is the part only you do)
1. **Quotes first.** Paste comments verbatim; never paraphrase them into positivity. Tag each with a `theme` (e.g. 互动开场有效 / 时间太晚 / 想要录像).
2. **Observations = number + interpretation + evidence.** "244 impressions / 4 reactions: reach fine, hook weak — the first line is a topic statement, not a question." One line each, ≤ 5 lines.
3. **Actions are testable.** "Post LinkedIn at 8 am Tuesday next time" is an action; "improve engagement" is not.
4. Compare with the previous event's report in `output/<previous-slug>/report/` when it exists; say what moved.
5. `photos_folder`: where the photos/feedback went for the marketing team's post-event LinkedIn — a path or link, not a promise.
6. **`next_topics`: 2–3 candidates, each with `why` and `evidence`.** `evidence` must point at a field in this results block or at a numbered question in `qa_questions` — a candidate with no evidence is a hunch, and the report says so. Rank them; say which one you would run next and what it would cost (a normal talk vs a workshop).

## Steps
1. Read `events/<slug>.json`; add/refresh `results` (browser reads above; `checked` = today).
2. Mine the transcript Q&A into `results.qa_questions`.
3. `npm run report events/<slug>.json` → `output/<slug>/report/复盘-post-<topic>-<date>.md` (7 sections; 数字 · 反馈 · 现场问题 · 观察 · 选题方向 · 行动 · 交接).
4. Show the user the observations / topic candidates for approval; they are judgement, not data.

## Don'ts
- No numbers without a `source`; no "about 200"; if a page can't be read, leave the field out and say so.
- Don't count the organiser's own reaction/RSVP as engagement.
- Don't post replies to comments from this skill — that is a message on the user's behalf; ask first.
