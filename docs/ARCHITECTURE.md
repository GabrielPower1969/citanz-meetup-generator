# Architecture

[中文版](ARCHITECTURE.zh-CN.md)

This page is for anyone who needs to change the tool, not just use it. It answers four questions: what calls what, what the data looks like, what the design decisions were, and how to verify a change.

## 1. Mind map

```mermaid
mindmap
  root((citanz-meetup-generator))
    Inputs
      events/*.json
        facts
        zh block
        copy block
      assets/speakers/
    Fixed
      config/citanz.json
      templates/posters
      templates/copy
      assets/brand + fonts
      design/ specs
    Pipeline
      src/build.js
        1 render posters
        2 validate posters
        3 write copy
      src/lib/event.js
    Outputs
      output/event/
        posters
        linkedin/
        xiaohongshu/
        meetup/
        wechat/
        teams/
    Agents
      CLAUDE.md
      skills: poster · copy · publish
```

## 2. Call graph

```mermaid
flowchart TD
  CLI["npm run build events/x.json"] --> B["src/build.js<br/>• Node ≥ 20?<br/>• node_modules? → npm ci<br/>• Chromium? → playwright install<br/>• fonts present?"]
  B -->|spawn| S1["src/steps/1-render-posters.js"]
  S1 -->|exit 0| S2["src/steps/2-validate-posters.js"]
  S2 -->|exit 0| S3["src/steps/3-write-copy.js"]
  S1 & S2 & S3 --> L["src/lib/event.js + src/lib/template.js<br/>loadEvent (slug, photo) · dataUri · fill/plainText engine"]
  S1 --> T1["templates/posters/&lt;name&gt;/template.html + meta.json"]
  S1 --> FJ["templates/posters/fit.js<br/>injected into the page"]
  S1 --> PW[("Playwright headless Chromium<br/>file:// only — every other request is aborted")]
  S2 --> PW
  S3 --> CF["config/citanz.json + config/platforms.json"]
  S3 --> T2["templates/copy/*.md<br/>{{var}} · {{#if}} · {{#each}}"]
  S1 --> O1["output/&lt;slug&gt;/&lt;slug&gt;.&lt;name&gt;.html + .png"]
  S3 --> O2["output/&lt;slug&gt;/&lt;channel&gt;/…"]
```

Each step is a standalone script with the same argument (`events/<event>.json`), so any step can be re-run alone: `npm run render|validate|copy events/x.json`.

## 3. Data model (ERD)

```mermaid
erDiagram
  EVENT ||--|| SPEAKER : has
  EVENT ||--o{ SPONSOR : lists
  EVENT ||--o| ZH : "Chinese variants"
  EVENT ||--|| COPY : "prose per channel"
  COPY ||--|| LINKEDIN : ""
  COPY ||--|| XIAOHONGSHU : ""
  COPY ||--|| MEETUP : ""
  COPY ||--|| WECHAT : ""
  COPY ||--|| TEAMS : ""
  CONFIG ||--o{ EVENT : "applies to every"
  EVENT ||--o{ POSTER : renders
  EVENT ||--o{ HANDOFF_FOLDER : produces
  POSTER_TEMPLATE ||--o{ POSTER : "one per size"
  DESIGN_SPEC ||--|| POSTER_TEMPLATE : "measured from"

  EVENT {
    string slug PK "date-topic-speaker"
    string topic "names the copy files"
    string title "EN, \n for manual break"
    string date
    string time
    string venue "short, for posters"
    string venue_full "postal, for copy"
    string online_url
    string rsvp_url
    string qr_url
  }
  SPEAKER { string name  string org  string photo "required" }
  SPONSOR { string name  string legal_name  string logo  bool thank }
  ZH { string title  string date_time  string date_time_short  string venue }
  CONFIG { string fee_en  string fee_zh  string bank  json schedule  json hashtags  json handoff  json handoff_naming }
  POSTER_TEMPLATE { string name PK "landscape | portrait"  int width  int height  string lang }
  DESIGN_SPEC { json elements "x y w h font per element" }
  POSTER { string file "slug.name.png" }
  HANDOFF_FOLDER { string channel PK  string owner  string poster_kind  string copy_file "channel-post-topic-date.md" }
```

`events/schema.json` is the machine-readable version of `EVENT`.

## 4. Sequence per event

```mermaid
sequenceDiagram
  participant O as Organiser
  participant AI as AI assistant (optional)
  participant B as build.js
  participant R as 1-render
  participant V as 2-validate
  participant C as 3-write-copy
  participant M as Marketing

  O->>AI: speaker abstract, photo, date, venue
  AI->>AI: write events/<slug>.json (facts + copy.*)
  AI->>B: npm run build events/<slug>.json
  B->>R: render landscape + portrait
  R-->>B: PNGs + fit report (lines, shrink)
  B->>V: check overflow / ragged lines / shrink / images
  alt FAIL
    V-->>AI: "title: one line is 19% as wide … reword"
    AI->>AI: edit JSON text, rebuild
  else OK
    B->>C: fill 5 copy templates, copy posters into folders
    C-->>O: output/<slug>/ with README
  end
  O->>M: linkedin/ + xiaohongshu/
  O->>O: meetup/ (publish, skill: meetup-publish) · teams/ · wechat/ 接龙 ×3 days
```

## 5. Design decisions

| Decision | Alternative rejected | Why |
|---|---|---|
| Posters are HTML rendered by a bundled headless browser | Canva API / Pillow drawing | real text wraps, shrinks and can be measured; no account, no network; identical on every machine |
| Geometry lives in `design/*.json`, measured once from Canva | eyeballing a screenshot | numbers with evidence beat guesses; the template is a transcription, not a design |
| Typography rules are validator failures, not advice | let the LLM judge | the rule is objective (40 % / 15 %) and a failed build is impossible to ignore |
| Fixed wording in `config/` + `templates/copy/`, prose in the event JSON | LLM writes whole posts | bank account, fee, schedule never drift; the LLM only writes what actually changes |
| Output grouped **by recipient**, files named `<channel>-post-<topic>-<date>` | grouped by type | a folder is forwarded to one person; the file name survives being downloaded out of context |
| `build.js` self-installs | README instructions | an AI assistant should not spend tokens on setup |
| Real events and speaker photos are git-ignored | commit everything | the repo is shared publicly; only the example is public |

## 6. How to verify a change

| You changed | Run | Look at |
|---|---|---|
| a poster template or `design/` spec | `npm run example` | `docs/images` vs `output/2026-08-26-blockchain/*.png`; validator must print OK |
| `fit.js` or the validator | `npm run example` plus a deliberately long title | the FAIL message must name the block and the reason |
| a copy template or `config/` | `npm run copy events/example.json` | no `[TODO …]`; diff the Markdown |
| `build.js` | delete `node_modules`, run `npm run example` | it reinstalls and finishes |

## 7. Extending

- **New poster size**: add `templates/posters/<name>/{template.html,meta.json}`; it is picked up automatically (`listTemplates`). Measure its spec into `design/` first.
- **New channel**: add `templates/copy/<channel>.md`, a `handoff.<channel>` entry and a `handoff_naming.channel_labels.<channel>` label in `config/citanz.json`, and one `write(...)`/`attach(...)` pair in `3-write-copy.js`.
- **New house rule**: put it in `config/citanz.json` and read it in `3-write-copy.js`; document it in `CLAUDE.md` invariants.
