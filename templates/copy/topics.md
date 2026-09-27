# 选题清单 · {{org_name_zh}}

赛道 **{{track}}**　·　生成于 {{report_date}}　·　来源：`topics/backlog.json` + {{event_count}} 场活动的 `results`{{#if profile_window}} + `topics/profile.json`{{/if}}　·　权重：`config/topics.json`
{{#if profile_window}}
自我信号窗口：{{profile_window}}
{{/if}}

> 规则和事后数字一样：**没有可核实证据的选题不进排名**。
> 证据写成 `<活动 slug>:<results 里的路径>` 或 `me:<profile 里的路径>`，本工具逐条解析——
> **A** = 解析到了且该数据块带 `checked`+`source`；**B** = 解析到了但数据块没有出处字段；**D** = 解析不到。

## 1. 推荐做的（前 {{top_n}}）
{{#each top}}
### {{rank}}. {{topic}}　`{{total}} 分`
{{#if angle}}**角度**：{{angle}}
{{/if}}**形式**：{{format}}　·　**讲者**：{{speaker_line}}
{{#if blockers_line}}**缺什么**：{{blockers_line}}
{{/if}}
| 项 | 原始分 | ×权重 | = | 依据 |
|---|---|---|---|---|
{{#each components}}| {{label}} | {{raw}} | {{weight}} | {{points}} | {{note}} |
{{/each}}

**证据**
{{#each evidence}}- `{{grade}}` {{ref}}
  > {{text}}{{#if checked}}　`核实 {{checked}}`{{/if}}
{{/each}}
{{/each}}
## 2. 其余候选
{{#if no_rest}}
_没有其它在排候选。_
{{/if}}
{{#each rest}}- **{{topic}}**　`{{total}} 分`　{{format}}　·　讲者 {{speaker_line}}　·　证据 {{verified_count}} 条{{#if blockers_line}}　·　缺：{{blockers_line}}{{/if}}
{{/each}}

## 3. {{unranked_title}}
{{#if no_unranked}}
_没有——池子里每个候选都至少有一条能解析的证据。_
{{/if}}
{{#each unranked}}### {{topic}}
证据全部无法核实，因此不参与排名：
{{#each evidence}}- `{{grade}}` {{ref}} — {{text}}
{{/each}}
**要做的**：去 `events/<slug>.json` 的 `results` 里找到真实出处（现场问题、评论、数字），写成 `<slug>:<path>` 再重跑；找不到就说明这是拍脑袋，删掉。

{{/each}}
## 4. 听众真实问过的问题（第一手信号）
{{#each questions}}- {{q}}{{#if theme}}　`{{theme}}`{{/if}}　— {{event}}
{{/each}}{{#if no_questions}}
_还没有录入任何现场问题。跑完活动用 `event-analytics` 把 Q&A 抄进 `results.qa_questions`——这是选题最强的信号。_
{{/if}}
## 5. 我们面对的到底是谁（用于判断「受众匹配」）
| 活动 | 数据块 | 指标 | 数值 | 核实 | 来源 |
|---|---|---|---|---|---|
{{#each audience}}| {{event}} | {{block}} | {{metric}} | {{value}} | {{checked}} | {{source}} |
{{/each}}{{#if no_audience}}
_还没有受众数据。`event-analytics` 跑一次，把领英受众画像和 meetup 的首次参加人数填进 `results`。_
{{/if}}
## 6. 讲者储备（真正的瓶颈）
{{#each speakers}}- **{{name}}**{{#if org}}（{{org}}）{{/if}}　`{{status}}`{{#if topics_line}}　·　能讲：{{topics_line}}{{/if}}{{#if source}}　·　来源：{{source}}{{/if}}
{{/each}}{{#if no_speakers}}
_储备是空的。每场活动的 CTA 都在问「想不想自己讲一场」（`config.cta`），把留言的人记进 `topics/backlog.json` 的 `speakers`。_
{{/if}}
## 7. 已交付 / 已放弃（重复惩罚的依据）
{{#each delivered}}- {{topic}}　`{{status}}`{{#if event}}　→ `{{event}}`{{/if}}{{#if outcome}}
  {{outcome}}{{/if}}{{#if dropped_why}}
  放弃原因：{{dropped_why}}{{/if}}
{{/each}}{{#if no_delivered}}
_还没有已交付记录。_
{{/if}}
---

**下一步**：挑定一个 → 把 `topics/backlog.json` 里它的 `status` 改成 `scheduled` 并填上 `event` slug → 按 `.claude/skills/meetup-poster/SKILL.md` 建 `events/<slug>.json` → `npm run build`。
活动结束后 `event-analytics` 填 `results`，再跑一次 `npm run topics`，这一轮的数字就成了下一轮选题的证据。
