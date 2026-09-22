---
name: meetup-copy
description: Write the four CITANZ meetup announcements (LinkedIn EN, meetup.com EN, 小红书 ZH, WeChat 群 ZH) from a chat with the speaker, then build the hand-off pack with posters. Use when the user shares talk notes / a speaker conversation and wants 文案, posts, or the "hand-off to marketing".
---

# Meetup copy

Fixed parts (date, venue, fee, bank account, agenda, sponsor thanks, hashtags, online-link wording) are filled by `src/steps/3-write-copy.js` from `config/citanz.json` + the event JSON. **You write only the prose** into `copy.*` of `events/<event>.json`, then run the build. Reference example: `events/example.json` (blockchain talk, Aug 2026) — match its length and voice.

## Workflow
1. Make sure the event JSON exists with title / speaker / date / time / venue / sponsors (see `meetup-poster`). Add `online_url`, `rsvp_url` (`"[预留]"` if the meetup.com event isn't created yet), `time_long`, `venue_short`, `publish_date`, `hashtags_en/zh`.
2. From the speaker conversation, write the `copy` block (fields and limits below). Keep speaker facts to what they actually said — never invent credentials.
3. `npm run build events/<event>.json` (self-installing; also renders + validates the posters) → `output/<slug>/` with one folder per recipient; `[TODO …]` in a file = a field you forgot. Fix the JSON, rebuild; don't hand-edit outputs.
4. Show the user the four texts for approval, then point them at the hand-off folders:
   - `linkedin/` (`领英-post-<topic>-<date>.md` + landscape PNG) → marketing colleague who posts on LinkedIn
   - `xiaohongshu/` (`小红书-post-<topic>-<date>.md` + portrait PNG) → marketing colleague who posts on 小红书
   - `meetup/` (`meetup-post-<topic>-<date>.md` / `.txt` + landscape PNG) → the organiser publishes on meetup.com
   - `wechat/` (three files + portrait PNG) → the organiser's WeChat posts:
     `微信-本地会员群-post-…` and `微信-本地非会员群-post-…` start with `#接龙` (WeChat turns the first line into a 接龙 thread) and carry the venue;
     `微信-CITANZ大群-post-…` is for the nationwide group: no `#接龙`, no address, online-first ("线下朋友建议去本地 CITANZ 群接龙").

## Voice per channel
**LinkedIn (`copy.linkedin`)** — professional, no hype, third person. `intro` = 2 sentences framing the topic; `session_line` = who the speaker is, ends with a full stop; `speaker_para` = career facts + what this talk does differently; `bullets` = 4–7 "how/why/when" outcomes, no trailing period; `closing` = what happens in the room + any caveats (e.g. "technology only, no prices"). Sentence case, British spelling.

**meetup.com (`copy.meetup`)** — the long, structured version. `notice` (optional) = a "Please note:" caveat, starts lowercase. `abstract` = 3–4 short paragraphs; `cover` = 5–6 bullets each starting with a **bold label:**; `audience` = one "whether you are … this session is for you" sentence; `bio` = 2–3 paragraphs, third person, mentions "presenting in a personal capacity" when relevant.

**小红书 (`copy.xiaohongshu`)** — 标题 ≤ 20 字、正文 ≤ 1000 字（含话题）、话题 ≤ 10 个；不写 markdown（`.txt` 会去掉 `**`）。口语、有情绪、每段带一个 emoji，正文用 **粗体小标题** 分块，多用"说实话 / 提前说清楚 / 最有价值的部分"这种带观点的句子。`hook` = 开头两段（谁来、为什么这次不一样）；`body` = 🎯 有什么不一样 + 👥 适合谁来；`signoff` = 一句收尾（"周三傍晚见！🚀"）。不写时间地点费用——脚本会加。

**WeChat 群 (`copy.wechat`)** — 最短。`headline` = `CITANZ ✖️<赞助商/合作方>：<主题>`；`body` = 一句定位（点名讲者，如"这次由 UC 的 He Ke 老师系统地讲一遍！"）+ 一个引子问题 + 5 个短横线要点 + 一句收尾。不超过 12 行。三个群版本（本地会员 / 本地非会员 / 全国大群）的差异——`#接龙` 首行、费用行、是否显示地址——全部由 `config/citanz.json` `wechat_groups` 控制，正文只写一份。

## Don't write these — they are automatic
The call-to-action asking readers for next topics and for speakers is appended to every announcement and recap from `config/citanz.json` → `cta`. So are the fee line, thanks, agenda, schedule and hashtags. Writing your own version duplicates them.

## Don'ts
- Don't put prices/investment/project recommendations in any channel for finance-adjacent topics; say explicitly that the session is technical.
- Don't translate LinkedIn → 小红书 literally; 小红书 is rewritten for a Chinese-speaking, casual audience.
- Don't change `config/citanz.json` for a single event (that's org-wide: fee, bank account, base hashtags).
