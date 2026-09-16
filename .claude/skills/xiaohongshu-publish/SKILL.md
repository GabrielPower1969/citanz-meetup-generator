---
name: xiaohongshu-publish
description: Publish the CITANZ meetup note on 小红书 (Xiaohongshu / RedNote) from the built hand-off pack, using the user's already-logged-in Chrome (claude-in-chrome) on creator.xiaohongshu.com. Use when the user says "发小红书" / "publish on Xiaohongshu" and output/<slug>/xiaohongshu/ exists.
---

# Publish on 小红书

Precondition: `npm run build events/<event>.json` has produced `output/<slug>/xiaohongshu/` containing
`小红书-post-<topic>-<date>.txt` (plain body, no markdown) and `<slug>.portrait.xhs.png` (the poster on a 3:4 canvas).
The user must be logged in to creator.xiaohongshu.com in the Chrome that claude-in-chrome controls.
Publishing is public — do it only when the user asked for it in chat.

## Platform limits (checked 2026-09-17, creator.xiaohongshu.com web)
| Field | Limit | Where it comes from |
|---|---|---|
| Image | jpg/png/webp ≤ 32 MB, **3:4 to 2:1 recommended**, ≥ 720×960; > 1280p keeps quality | `templates/posters/portrait/meta.json` `exports` → `.xhs.png` is exactly 3:4 |
| Title | ≤ 20 chars | `title_zh` in `3-write-copy.js` strips the poster's manual `\n` |
| Body | ≤ 1000 chars incl. topics; **no markdown** | the `.txt` file (bold markers stripped) |
| Topics | **max 10**, must be picked from the `#` dropdown to count | `hashtags_xiaohongshu` (config base + event `hashtags_zh`) — keep the first 10 |

The build already guarantees the first three. The skill's job is the clicks.

## Recipe
1. Open `https://creator.xiaohongshu.com/publish/publish?source=official` → tab **上传图文** (2nd tab, ~x=343,y=80 at 1536 wide).
2. `find` "file input accepting images" → `file_upload` the `.xhs.png`. Wait 5 s; the phone preview on the right shows it. Dismiss the "图片可以编辑啦" tip (**我知道了**).
3. Title: `find` textbox "填写标题会有更多赞哦" → click → `type` the first line of the `.md` without `**`. Counter must read ≤ 20/20.
4. Body: click the body textbox (tiptap contenteditable under the title) → `type` the whole `.txt` **without the hashtag line**. ~900 chars types in a few seconds here (unlike meetup's ProseMirror).
5. Topics, one at a time, at the end of the body: `type` ` #词` → wait 2 s (dropdown appears) → key `Return`. Verify with JS: `document.querySelector('[contenteditable=true]').querySelectorAll('.tiptap-topic').length`. Stop at 10 — the 11th shows "最多添加10个话题" and later ones may still render as chips but will fail on publish.
   Fixing a mistake: put the caret at the end (JS range collapse) and `Backspace` — each chip is one atomic node; count from the JS check, not the screen.
6. Check with JS: 10 topics, body length ≤ 1000, title text. Then click **发布** (bottom centre, ~x=769,y=728 at 1568 wide; `find` does not see it — use coordinates from a screenshot).
7. Success page says **发布成功** and bounces back to the publish page. The note appears under **笔记管理** as **审核中**; the public link exists only after review — tell the user to check later rather than inventing a URL.

## Gotchas
- Deleting the only image fails ("发布笔记需要至少一张图片"): upload the replacement first, then hover the old thumbnail → **×**.
- The page has two contenteditable regions (editor + preview); JS queries must take the one whose rect width > 100, and topic counts appear doubled when querying `document` — query the editor element only.
- External links in the body (meetup.com RSVP) published fine on 2026-09-17; if a future note is held back in review, the link is the first suspect — move it to a comment.
- Don't use 文字配图 (auto-generated cover) or any 小红书 filter/crop on the poster; the `.xhs.png` is already final.
