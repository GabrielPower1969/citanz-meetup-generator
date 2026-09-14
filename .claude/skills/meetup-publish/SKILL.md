---
name: meetup-publish
description: Publish a CITANZ event on meetup.com from the built hand-off pack, using the user's already-logged-in Chrome (claude-in-chrome). Use when the user says "发布到 meetup" / "publish on meetup.com" and output/<slug>/meetup/ exists.
---

# Publish on meetup.com

Precondition: `npm run build events/<event>.json` has produced `output/<slug>/meetup/meetup-post-<topic>-<date>.txt` and `output/<slug>/<slug>.landscape.png`. The user must be logged in to meetup.com in the Chrome that claude-in-chrome controls. Publishing is public and irreversible — do it only when the user asked for it in chat.

## Recipe (verified 2026-09-14)
1. Open `https://www.meetup.com/home/` → left sidebar → **Create event** under the CITANZ group. Group slug: `wellington-chinese-it-professionals`.
2. "Start from" dialog → **Duplicate last event**. This carries over venue, topics, hosts and comment settings.
3. Title: `find` "event name text input" → `form_input` with the EN title (single line).
4. Date: click **Open date picker**, click the day; time input (`type=time`) should already read `18:00`; duration 2 hours.
5. Description: the editor is ProseMirror. Focus it with JS (`[contenteditable=true]` whose rect width > 100), press cmd+a, Delete, then `type` the whole `.txt` file. Typing ~2.6k chars can take 30–60 s and the CDP call may report a timeout — wait 8 s and check `textContent.length` before retyping.
6. Photo: click the pencil button on the featured image → **Replace** → a `input[type=file]` appears → `file_upload` the landscape PNG → **Save** in the crop dialog.
7. Location: keep **In person** (Hybrid is a Meetup Pro feature and shows an upsell). The Teams link stays out of the description; the template already says the link is sent to registrants.
8. Scroll through once and confirm: title, Thu date, 18:00, new photo, venue, topics. Then click **Publish**.
9. On "Your event is live — Announce it now": click **Do it later**. Announcing emails every member; ask the user before ever clicking it. When they say yes: open the event page → organizer toolbar → **Announce** (one click, no confirmation dialog; the button then turns into "Attendees" and a toast says "Email notifications are being sent").
10. Read the new event URL from the tab (`/events/<id>/`), write it into `rsvp_url` in the event JSON, rerun `npm run build`, and tell the user the link.

## Don'ts
- Don't paste markdown (`###`, `**`) into meetup — use the `.txt` file, which is the plain-text variant.
- Don't click "Announce it now", "Make event paid", or change hosts/topics.
- Don't create the event from scratch when a previous event exists; duplicating avoids re-entering the venue.
