# Landscape poster — design analysis

Source: Canva design `DAHVGU6iS7o` ("CITANZ-automation-poster-横版", Facebook Ad preset, 1200×628 px).
Extracted 2026-09-14 by reading the Canva editor DOM (bounding rects, computed styles, layer panel, colour panel) — not by eyeballing a screenshot.

| Item | Value | Evidence |
|---|---|---|
| Canvas | 1200 × 628 px, landscape | page ratio 862/451 = 1.911 = 1200/628; preset name "Facebook Ad" |
| Background | `#008FFE` solid | Canva colour panel "Colours in this design" first swatch; page div computed background |
| Font | Arimo (Regular 400 / Bold 700) | toolbar shows "Arimo" for every text box |
| Title | 31.8 pt (= 42.4 px), bold, lh 55, ls 1.27, Canva **Glow** effect intensity 50 | toolbar + Effects panel |
| Speaker name | 19 pt (25.3 px) regular | toolbar |
| Date / time | 19 pt (25.3 px) bold | toolbar |
| Body (org, venue) | 14 pt (18.7 px) regular | toolbar |
| Labels | 12 pt (16 px) uppercase, "Background" text effect → pill `rgba(169,217,254,.5)`, radius ≈5, height 24 | SVG path fill + fill-opacity |
| ORGANISED BY pill | `rgba(217,217,217,.5)` | same |
| Watermark | CITANZ logo 800×800 PNG at (966,−36) 211×211, opacity 0.2 — bleeds off the top edge | layer panel + computed opacity |
| Circuit lines | 1120×393 PNG at (633,138) 694×243, opacity 0.2 | same |
| Avatar | circle frame 184×184 at (485,203) + decorative ring 216×211 at (468,190) | layer panel |
| Sponsors row | logos 102 px tall from x=520, gap 9 | rects |
| Organiser | white 102×102 box with logo 101×66, QR 102×102 at x=1022 | rects |

Other document colours listed by Canva: `#a9d9fe` (pill), `#9ac8ff`, `#f9f7e8` (circuit lines), `#ffffff`, `#d9d9d9`, `#000000`.

## Gotchas learned while extracting
- Canva renders text at design size and scales the whole page with a CSS transform, so `getComputedStyle().fontSize` is already in design px; only bounding rects need the zoom factor.
- Elements that bleed off the page (the watermark) are outside the page rect — search by layer, not by viewport region.
- A hidden 1438×560 stock landscape image sits behind the avatar frame in the Canva file. It is not visible and is ignored.
- Canva's text glow has no exact CSS equivalent; `text-shadow: 0 0 6px rgba(255,255,255,.35)` is the approximation used.

## Remaining differences vs Canva (accepted)
- Glow rendering differs slightly.
- Venue line break depends on the comma character (Canva file uses a full-width "，").

---

# Portrait poster — design analysis

Source: Canva design `DAHVGvP64E8` ("CITANZ-automation-poster-竖版", Poster preset 42×59.4 cm = 1587×2244 px). Extracted 2026-09-14, same method.

| Item | Value | Evidence |
|---|---|---|
| Canvas | 1587 × 2244 px | page rect 358.5×507 at 23% zoom; Canva Poster preset |
| Background | `#008FFF` solid | Canva colour panel first swatch |
| Title | 63.5 pt (84.6 px) bold, lh 109, ls 2.5, 3 lines, CJK breaks mid-word | toolbar + rect of the 🔗 span |
| Speaker name | 68.5 pt (91.3 px) | toolbar; text boxes in this file are group-scaled, so computed sizes were multiplied by the accumulated CSS transform |
| Org | 72 px; venue 42 px; date 53.3 px bold | transform-corrected computed styles |
| Labels | 演讲者 / 地点 in Chinese; ORGANISED BY / SPONSORS English uppercase 37.1 px, grey pill text `#F9F7E8` | rects + computed color |
| Decorations | circuit corner 645×718 at (0,0), watermark 453×453 at (1123,45), big circle 1025×1025 at (−254,1426) — all opacity 0.3 | rects + opacity chain |
| Shared with landscape | watermark PNG, avatar, CITANZ logo, sponsor logos (byte-identical); avatar ring is a different asset (249×244) | `cmp` |
| Not present | QR code, English date/time | layer list |

Gotcha: this file's text boxes sit inside CSS-transformed groups, so `getComputedStyle().fontSize` had to be multiplied by the product of ancestor `transform` scales (see `reference/` notes in the memory file). Cross-checked against toolbar pt × 1.333.
