---
name: event-recap
description: After a CITANZ meetup — turn the recording transcript (Teams .docx/.txt) plus 1–2 photos into short recaps for LinkedIn (EN) and 小红书 (ZH), get the user's approval, then publish each from their logged-in Chrome (claude-in-chrome). Use when the user says "写 recap" / "总结" / "post the recap" / "发一版 recap" and gives a transcript or photos.
---

# Event recap (post-event, LinkedIn + 小红书)

What the user gets: `output/<slug>/linkedin/领英-recap-<topic>-<date>.md/.txt`, `output/<slug>/xiaohongshu/小红书-recap-<topic>-<date>.md/.txt`, photos copied into both folders in order — then, after a **yes** per platform, the posts live. Limits come from `config/platforms.json`; the build fails if a recap exceeds them.

## 1. Inputs
- Transcript: Teams exports a `.docx` with 6–8 giant paragraphs. Extract text with `unzip -p file.docx word/document.xml`, pull `<w:t>` runs, split on speaker turns (`Name   m:ss`). Keep only the speaker's substantive turns; skip the pre-talk chatter.
- Photos: the user says which is the lead. Save EXIF-corrected, ≤ 2048 px long side, to `assets/photos/<slug>/01-….jpg`, `02-….jpg` (git-ignored). LinkedIn shows the **first** photo largest; 4:3 displays in full.

## 2. Write the recaps (the only judgement step)
Put prose into `events/<slug>.json` → `recap`:
```json
"recap": {
  "photos": ["assets/photos/<slug>/01-group.jpg", "assets/photos/<slug>/02-speaker.jpg"],
  "linkedin":    { "hook": "…", "thanks_speaker": "Three things I took home:", "takeaways": ["…","…","…"], "closing": "\"…\" — Speaker" },
  "xiaohongshu": { "title": "≤20 字", "hook": "…", "body": "…", "signoff": "…" }
}
```
**LinkedIn** (learned 2026-09-18 — a 2,500-char draft was rejected as "too long, no focus"): **≤ 900 chars**. One question-style hook naming the speaker and CITANZ, **three** one-sentence takeaways, one verbatim speaker quote as closer. Thanks/hashtags come from the template — don't write them.

**小红书** (learned 2026-09-18 — "要 local 一点，fancy 一点"): title ≤ 20 chars as a question or a claim; hook names the venue/suburb and the speaker casually (「UC 的 Ke He 老师」); body = ✨ 三句话带走 with one emoji per point + 💬 one quote + a Q&A teaser line; signoff is a local, slightly cheeky line (「这种周四晚上，比刷手机值 🌙」). No markdown. Count with Python `len()` — the platform counts code points, not bytes. Body ≤ 1000 incl. topics, topics ≤ 10.

Both: takeaways come from the transcript only. Leave out the speaker's offhand jokes and opinions about named companies; a recap in the organiser's name must not put words in the speaker's mouth.

`npm run copy events/<slug>.json` → files appear in `linkedin/` and `xiaohongshu/`; the build **fails** on any limit breach. Send the `.md` files + photos to the user and **wait for approval per platform**.

## 3a. Publish on LinkedIn (verified 2026-09-18)
1. `linkedin.com/feed` → **Start a post** (the composer is a modal; its editor is a Quill `.ql-editor` **inside a shadow root** — `document.querySelector` won't see it, walk `shadowRoot`s).
2. **Photos.** The Photo button opens the OS file picker (no `<input type=file>` in the DOM), which the extension cannot drive. Bridge instead:
   - JS: append your own `<input type="file" multiple id="claude-bridge-upload" aria-label="claude bridge upload">` to `document.body`;
   - `find` "file input 'claude bridge upload'" → `file_upload` both photos (lead first);
   - JS: build a `DataTransfer` from `input.files`, dispatch `dragenter`/`dragover`/`drop` (bubbles, composed) on the `.ql-editor` found via shadow-root walk. `drop.defaultPrevented === true` means LinkedIn took them; wait 4 s and screenshot — thumbnails appear in upload order.
   - **Video (checked 2026-09-20):** the drop bridge is refused for `video/mp4` (`drop.defaultPrevented === false`). Instead patch `HTMLInputElement.prototype.click` to swallow file-input clicks and record the element, click the composer's **Video** button, then `file_upload` into the recorded `<input accept="video/*">`; the "Editor" modal loads the clip → **Next**. The composer is now tiptap/ProseMirror (`.tiptap.ProseMirror`), not Quill.
3. **Text.** Click the editor, `type` the `.txt` file. Do **not** press Escape afterwards — it opens "Save this post as a draft?"; if it appears, close it with its own × (never *Discard*).
4. Verify with JS (`innerText.length` ≈ file length, starts/ends right) and one scroll-through screenshot showing text above, photos below.
5. Click **Post** (bottom-right of the modal; `find` does not see it — use coordinates from the screenshot). Composer closes and the feed shows "New posts".
6. Confirm on `linkedin.com/in/me/recent-activity/all/` — top post, both photos. Read `[data-urn^="urn:li:activity"]` for the id; the URL is `linkedin.com/feed/update/<urn>/`. Write it into `results.linkedin.url` for the analytics skill.

## 3b. Publish on 小红书 (verified 2026-09-18)
Same page as `xiaohongshu-publish` (上传图文 → `file_upload` both photos into the `input[type=file]`, lead first → title → body from `.txt` without the hashtag line). Differences learned today:
- **Topics: use the toolbar 「话题」 button, not a typed `#`.** Typed `#tag` + Return silently produced plain text this time (spaces were swallowed). Recipe per topic: click 「话题」 (`find` "话题 button") → `type` the name → wait 4–5 s (the picker shows 加载中 first) → **click the first row by coordinate** from a screenshot (`ref` clicks on the rows do not register). Verify after each with JS: `.tiptap-topic` count inside the editor whose rect width > 100.
- If plain `#text` sneaks in, `Backspace` it out at the caret and check `textContent` — chips are single atomic nodes, plain text is not.
- 发布 → 发布成功 → note shows as 审核中 under 笔记管理; no public link until review passes.

## Don'ts
- Don't post without the user's explicit "发" / "post" on the final text.
- Don't tag people (`@`) or the speaker — the speaker may not want the visibility; ask.
- Don't try computer-use on the file picker: Chrome is read-only there.
- Don't post the 小红书 recap as a straight translation of the LinkedIn one — different audience, different voice.
