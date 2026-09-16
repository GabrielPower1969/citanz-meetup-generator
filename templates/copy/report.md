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
{{/each}}
{{#if no_feedback}}
_尚未录入任何评论。到各平台把有信息量的评论原话抄进 `results.feedback`，再重跑。_
{{/if}}
## 3. 观察
{{#each results.observations}}- {{.}}
{{/each}}
{{#if no_observations}}
_由填写 results 的人写：什么有效、什么没效、下次改什么。数字只是证据，判断在这里。_
{{/if}}
## 4. 下次行动
{{#each results.actions}}- [ ] {{.}}
{{/each}}

## 5. 交接
- 照片 / 反馈素材：`{{results.photos_folder}}`（给营销同事做会后领英）
- 本报告：`output/{{slug}}/report/`
