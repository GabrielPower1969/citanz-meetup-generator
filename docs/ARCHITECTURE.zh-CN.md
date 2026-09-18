# 架构说明

[English](ARCHITECTURE.md)

这页给要**改**工具的人看，不只是用的人。回答四个问题：谁调用谁、数据长什么样、为什么这样设计、改完怎么验证。

## 1. 思维导图

```mermaid
mindmap
  root((citanz-meetup-generator))
    输入
      events/*.json
        事实字段
        zh 中文块
        copy 文案块
      assets/speakers/
    固定
      config/citanz.json
      templates/posters
      templates/copy
      assets/brand + fonts
      design/ 规格
    流水线
      src/build.js
        1 渲染海报
        2 校验海报
        3 生成文案
      src/lib/event.js
    输出
      output/活动/
        海报
        linkedin/
        xiaohongshu/
        meetup/
        wechat/
        teams/
    AI 助手
      CLAUDE.md
      skills: poster · copy · publish
```

## 2. 调用关系

```mermaid
flowchart TD
  CLI["npm run build events/x.json"] --> B["src/build.js<br/>• Node ≥ 20？<br/>• 没 node_modules → npm ci<br/>• 没 Chromium → playwright install<br/>• 字体在不在？"]
  B -->|spawn| S1["src/steps/1-render-posters.js"]
  S1 -->|exit 0| S2["src/steps/2-validate-posters.js"]
  S2 -->|exit 0| S3["src/steps/3-write-copy.js"]
  S1 & S2 & S3 --> L["src/lib/event.js + src/lib/template.js<br/>loadEvent（slug、照片）· dataUri · fill/plainText 模板引擎"]
  S1 --> T1["templates/posters/&lt;名字&gt;/template.html + meta.json"]
  S1 --> FJ["templates/posters/fit.js<br/>注入页面"]
  S1 --> PW[("Playwright 无头 Chromium<br/>只允许 file://，其他请求一律拦截")]
  S2 --> PW
  S3 --> CF["config/citanz.json + config/platforms.json"]
  S3 --> T2["templates/copy/*.md<br/>{{var}} · {{#if}} · {{#each}}"]
  S1 --> O1["output/&lt;slug&gt;/&lt;slug&gt;.&lt;名字&gt;.html + .png"]
  S3 --> O2["output/&lt;slug&gt;/&lt;渠道&gt;/…"]
```

三步都是独立脚本，参数相同（`events/<活动>.json`），可以单独重跑：`npm run render|validate|copy events/x.json`。

## 3. 数据模型（ERD）

```mermaid
erDiagram
  EVENT ||--|| SPEAKER : "有一位"
  EVENT ||--o{ SPONSOR : "列出"
  EVENT ||--o| ZH : "中文变体"
  EVENT ||--|| COPY : "各渠道正文"
  COPY ||--|| LINKEDIN : ""
  COPY ||--|| XIAOHONGSHU : ""
  COPY ||--|| MEETUP : ""
  COPY ||--|| WECHAT : ""
  COPY ||--|| TEAMS : ""
  CONFIG ||--o{ EVENT : "作用于每一场"
  EVENT ||--o{ POSTER : "渲染出"
  EVENT ||--o{ HANDOFF_FOLDER : "产出"
  POSTER_TEMPLATE ||--o{ POSTER : "每种尺寸一张"
  DESIGN_SPEC ||--|| POSTER_TEMPLATE : "量测自"

  EVENT {
    string slug PK "日期-主题-讲者"
    string topic "决定文案文件名"
    string title "英文，\n 手动断行"
    string date
    string time
    string venue "短版，上海报"
    string venue_full "完整地址，进文案"
    string online_url
    string rsvp_url
    string qr_url
  }
  SPEAKER { string name  string org  string photo "必填" }
  SPONSOR { string name  string legal_name  string logo  bool thank }
  ZH { string title  string date_time  string date_time_short  string venue }
  CONFIG { string fee_en  string fee_zh  string bank  json schedule  json hashtags  json handoff  json handoff_naming }
  POSTER_TEMPLATE { string name PK "landscape | portrait"  int width  int height  string lang }
  DESIGN_SPEC { json elements "每个元素的 x y w h 字体" }
  POSTER { string file "slug.name.png" }
  HANDOFF_FOLDER { string channel PK  string owner  string poster_kind  string copy_file "渠道-post-主题-日期.md" }
```

`events/schema.json` 是 `EVENT` 的机器可读版本。

## 4. 一场活动的时序

```mermaid
sequenceDiagram
  participant O as 组织者
  participant AI as AI 助手（可选）
  participant B as build.js
  participant R as 1-render
  participant V as 2-validate
  participant C as 3-write-copy
  participant M as 营销同事

  O->>AI: 讲者摘要、照片、日期、地点
  AI->>AI: 写 events/<slug>.json（事实 + copy.*）
  AI->>B: npm run build events/<slug>.json
  B->>R: 渲染横版 + 竖版
  R-->>B: PNG + 排版报告（行数、缩放）
  B->>V: 检查溢出 / 孤行 / 缩字 / 图片
  alt FAIL
    V-->>AI: "title：有一行只有最宽行的 19% … 改措辞"
    AI->>AI: 改 JSON 文字，重跑
  else OK
    B->>C: 填 5 个文案模板，把海报拷进各文件夹
    C-->>O: output/<slug>/ 带 README
  end
  O->>M: linkedin/ + xiaohongshu/
  O->>O: meetup/（发布，用 meetup-publish skill）· teams/ · wechat/ 接龙 ×3 天
```

## 5. 设计决策

| 决定 | 放弃的方案 | 原因 |
|---|---|---|
| 海报是 HTML，用自带的无头浏览器渲染 | Canva API / Pillow 画图 | 真文字能换行、缩放、量宽；不要账号不联网；每台机器结果一致 |
| 几何数据放 `design/*.json`，从 Canva 一次性量出 | 看截图目测 | 有证据的数字胜过猜测；模板是誊抄，不是再设计 |
| 排版规则是校验失败，不是建议 | 让 LLM 自己判断 | 规则客观（40% / 15%），build 失败没法忽略 |
| 固定措辞在 `config/` + `templates/copy/`，正文在活动 JSON | LLM 写整篇 | 银行账号、费用、时间永不漂移；LLM 只写真正会变的部分 |
| 输出**按接收人**分组，文件名 `<渠道>-post-<主题>-<日期>` | 按类型分组 | 一个文件夹转给一个人；文件被单独下载后名字仍然自解释 |
| `build.js` 自动装环境 | README 写安装步骤 | AI 助手不该把 token 花在装环境上 |
| 真实活动和讲者照片不入库 | 全部提交 | 仓库公开；只有示例是公开的 |

## 6. 改完怎么验证

| 你改了 | 跑 | 看 |
|---|---|---|
| 海报模板或 `design/` 规格 | `npm run example` | `docs/images` 对比 `output/2026-08-26-blockchain/*.png`；校验必须 OK |
| `fit.js` 或校验器 | `npm run example` + 故意塞一个超长标题 | FAIL 信息必须点名是哪个块、什么原因 |
| 文案模板或 `config/` | `npm run copy events/example.json` | 没有 `[TODO …]`；diff Markdown |
| `build.js` | 删掉 `node_modules` 再 `npm run example` | 它要能自己装回来并跑完 |

## 7. 扩展

- **新海报尺寸**：加 `templates/posters/<名字>/{template.html,meta.json}`，会被自动发现（`listTemplates`）。先把规格量进 `design/`。
- **新渠道**：加 `templates/copy/<渠道>.md`，在 `config/citanz.json` 加 `handoff.<渠道>` 和 `handoff_naming.channel_labels.<渠道>`，在 `3-write-copy.js` 加一对 `write(...)`/`attach(...)`。
- **新组织规则**：写进 `config/citanz.json`，在 `3-write-copy.js` 读取；在 `CLAUDE.md` 的不变量里记一笔。
