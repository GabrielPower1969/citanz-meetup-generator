# 活动复盘 · {{title_plain}}

**{{date}}** · {{venue_inline}} · 讲者 {{speaker_name}}（{{speaker_org}}）
生成于 {{report_date}}，数据截至各平台「核实日期」列。

## 1. 数字

| 渠道 | 指标 | 数值 | 核实日期 | 来源 |
|---|---|---|---|---|
{{#each metrics}}| {{channel}} | {{metric}} | {{value}} | {{checked}} | {{source}} |
{{/each}}
{{#if results.meetup.attended}}
**到场率**：{{results.meetup.attended}} / {{results.meetup.rsvps}} RSVP = {{attendance_rate}}%（meetup 报名 → 实际到场）
{{/if}}
## 2. 评论与反馈（原话）
{{#each results.feedback}}> {{quote}}
> — {{who}}，{{channel}}{{#if theme}}　·　主题：{{theme}}{{/if}}

{{/each}}{{#if no_feedback}}
_尚未录入任何评论。到各平台把有信息量的评论原话抄进 `results.feedback`，再重跑。_
{{/if}}
## 3. 现场问了什么（选题的第一手信号）
{{#each results.qa_questions}}- {{q}}{{#if theme}}　`{{theme}}`{{/if}}
{{/each}}{{#if no_questions}}
_从逐字稿的 Q&A 段落把问题抄进 `results.qa_questions`——听众主动问的，比任何数字都更能说明下次该讲什么。_
{{/if}}
## 4. 观察
{{#each results.observations}}- {{.}}
{{/each}}{{#if no_observations}}
_由填写 results 的人写：什么有效、什么没效、下次改什么。数字只是证据，判断在这里。_
{{/if}}
## 5. 下次选题方向
{{#each results.next_topics}}### {{topic}}
**为什么**：{{why}}
**证据**：`{{evidence}}`

{{/each}}{{#if no_next_topics}}
_把候选选题写进 `results.next_topics`，每个都要有「为什么」和指向 results 里某条数据或某个现场问题的「证据」。没有证据的选题就是拍脑袋。_
{{/if}}
## 6. 下次行动
{{#each results.actions}}- [ ] {{.}}
{{/each}}

## 7. 交接
- 照片 / 反馈素材：`{{results.photos_folder}}`（给营销同事做会后领英）
- 本报告：`output/{{slug}}/report/`
