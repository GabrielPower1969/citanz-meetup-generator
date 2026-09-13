*Post date suggestion: `{{publish_date}} {{city}}` — prepend to LinkedIn_Post_Draft.md as usual.*

---

{{copy.linkedin.intro}}

Join {{org_name_en}} in {{city}} on {{date_short}} for **{{title_plain}}** — {{copy.linkedin.session_line}}

{{copy.linkedin.speaker_para}}

In this session, we will explore:

{{#each copy.linkedin.bullets}}🔹 {{.}}
{{/each}}
{{copy.linkedin.closing}}

📅 Date: {{date}}
📍 Venue: {{venue_inline}}
🕕 Time: {{time_long}}
🎤 Language: {{language_en}}
💻 Format: {{format_en}}

RSVP here: {{rsvp_url}}

{{fee_en}}
{{#if sponsor_thanks_en}}
{{sponsor_thanks_en}}
{{/if}}
{{linkedin_outro}}

{{hashtags_linkedin}}
