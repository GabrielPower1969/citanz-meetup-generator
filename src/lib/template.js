// Minimal Markdown template engine shared by the copy and report steps.
// Supports {{a.b}}, {{#if a.b}}…{{/if}}, {{#each list}}{{.}} or {{field}}{{/each}}.
export const get = (obj, keyPath) => keyPath === '.' ? obj['.'] : keyPath.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/**
 * Fill a template. `onMissing(key)` decides what a missing value renders as (copy step: "[TODO key]" + record; report: "—").
 */
export function fill(tpl, ctx, onMissing = (k) => `[TODO ${k}]`) {
  for (;;) {
    const each = cutBlock(tpl, 'each'), iff = cutBlock(tpl, 'if');
    const b = !each ? iff : !iff ? each : (each.start < iff.start ? each : iff);
    if (!b) break;
    const body = tpl.slice(b.afterOpen, b.bodyEnd);
    const out = b.tag === 'each'
      ? (get(ctx, b.key) || []).map(item => fill(body, item !== null && typeof item === 'object' ? { ...ctx, ...item, '.': item } : { ...ctx, '.': item }, onMissing)).join('')
      : (get(ctx, b.key) ? fill(body, ctx, onMissing) : '');
    tpl = tpl.slice(0, b.start) + out + tpl.slice(b.end);
  }
  return tpl.replace(/\{\{([\w.]+)\}\}/g, (_, k) => {
    const v = get(ctx, k);
    return v === undefined || v === null || v === '' ? onMissing(k) : String(v);
  });
}

/** First {{#tag key}}…{{/tag}} block, matched to its OWN closing tag so blocks can nest. */
function cutBlock(tpl, tag) {
  const open = new RegExp(`\\{\\{#${tag} ([\\w.]+)\\}\\}`).exec(tpl);
  if (!open) return null;
  const afterOpen = open.index + open[0].length;
  const scan = new RegExp(`\\{\\{#${tag} [\\w.]+\\}\\}|\\{\\{\\/${tag}\\}\\}`, 'g');
  scan.lastIndex = afterOpen;
  for (let depth = 1, m; (m = scan.exec(tpl));) {
    depth += m[0][2] === '#' ? 1 : -1;
    if (depth === 0) return { tag, key: open[1], start: open.index, afterOpen, bodyEnd: m.index, end: m.index + m[0].length };
  }
  return null;
}

/** Strip markdown for platforms whose composer is plain text: leading **title** line, \# escapes, bold markers, editor notes. */
export const plainText = (md) => md
  .replace(/^\*.*\*\n\n---\n\n/s, '')          // "*Post date suggestion…*" editor note (LinkedIn)
  .replace(/^\*\*.+\*\*\n\n?/, '')             // bold title line (小红书 has a separate title field)
  .replace(/\\#/g, '#')
  .replace(/\*\*(.+?)\*\*/g, '$1');
