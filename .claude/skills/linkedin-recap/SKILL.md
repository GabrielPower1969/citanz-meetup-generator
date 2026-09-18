---
name: linkedin-recap
description: After a CITANZ meetup — turn the recording transcript (Teams .docx/.txt) plus 1–2 photos into a short LinkedIn recap, get the user's approval, then publish it from their logged-in Chrome (claude-in-chrome). Use when the user says "写 recap" / "领英总结" / "post the recap" and gives a transcript or photos.
---

# LinkedIn recap (post-event)

What the user gets: `output/<slug>/linkedin/领英-recap-<topic>-<date>.md` (+ `.txt` to paste) and the photos copied in order, then — after a **yes** — the post live on LinkedIn.

## 1. Inputs
- Transcript: Teams exports a `.docx` with 6–8 giant paragraphs. Extract text with `unzip -p file.docx word/document.xml`, pull `<w:t>` runs, split on speaker turns (`Name   m:ss`). Keep only the speaker's substantive turns; skip the pre-talk chatter.
- Photos: the user says which is the lead. Save EXIF-corrected, ≤ 2048 px long side, to `assets/photos/<slug>/01-….jpg`, `02-….jpg` (git-ignored). LinkedIn shows the **first** photo largest; 4:3 displays in full.

## 2. Write the recap (the only judgement step)
Put prose into `events/<slug>.json` → `recap`:
```json
"recap": {
  "photos": ["assets/photos/<slug>/01-group.jpg", "assets/photos/<slug>/02-speaker.jpg"],
  "linkedin": { "hook": "…", "thanks_speaker": "Three things I took home:", "takeaways": ["…","…","…"], "closing": "\"…\" — Speaker" }
}
```
House style (learned 2026-09-18 — the first draft at 2,500 chars was rejected as "too long, no focus"):
- **≤ 900 characters total.** One question-style hook naming the speaker and CITANZ. **Three** takeaways, each one sentence. One verbatim quote from the speaker as the closer. That's it.
- Everything else (thanks to CITANZ + sponsors + attendees, hashtags) comes from `templates/copy/linkedin-recap.md` / `config/citanz.json` — do not write it.
- Takeaways come from the transcript only. Leave out the speaker's offhand jokes and opinions about named companies; a recap in the organiser's name must not put words in the speaker's mouth.
- `npm run copy events/<slug>.json` → files appear in `linkedin/`. Send the `.md` + photos to the user and **wait for approval**.

## 3. Publish (browser recipe, verified 2026-09-18)
1. `linkedin.com/feed` → **Start a post** (the composer is a modal; its editor is a Quill `.ql-editor` **inside a shadow root** — `document.querySelector` won't see it, walk `shadowRoot`s).
2. **Photos.** The Photo button opens the OS file picker (no `<input type=file>` in the DOM), which the extension cannot drive. Bridge instead:
   - JS: append your own `<input type="file" multiple id="claude-bridge-upload" aria-label="claude bridge upload">` to `document.body`;
   - `find` "file input 'claude bridge upload'" → `file_upload` both photos (lead first);
   - JS: build a `DataTransfer` from `input.files`, dispatch `dragenter`/`dragover`/`drop` (bubbles, composed) on the `.ql-editor` found via shadow-root walk. `drop.defaultPrevented === true` means LinkedIn took them; wait 4 s and screenshot — thumbnails appear in upload order.
3. **Text.** Click the editor, `type` the `.txt` file. Do **not** press Escape afterwards — it opens "Save this post as a draft?"; if it appears, close it with its own × (never *Discard*).
4. Verify with JS (`innerText.length` ≈ file length, starts/ends right) and one scroll-through screenshot showing text above, photos below.
5. Click **Post** (bottom-right of the modal; `find` does not see it — use coordinates from the screenshot). Composer closes and the feed shows "New posts".
6. Confirm on `linkedin.com/in/me/recent-activity/all/` — top post, both photos. Read `[data-urn^="urn:li:activity"]` for the id; the URL is `linkedin.com/feed/update/<urn>/`. Write it into `results.linkedin.url` for the analytics skill.

## Don'ts
- Don't post without the user's explicit "发" / "post" on the final text.
- Don't tag people (`@`) or the speaker — the speaker may not want the visibility; ask.
- Don't try computer-use on the file picker: Chrome is read-only there.
