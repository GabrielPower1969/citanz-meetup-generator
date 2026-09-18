// Minimal Markdown template engine shared by the copy and report steps.
// Supports {{a.b}}, {{#if a.b}}…{{/if}}, {{#each list}}{{.}} or {{field}}{{/each}}.
export const get = (obj, keyPath) => keyPath === '.' ? obj['.'] : keyPath.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

/**
 * Fill a template. `onMissing(key)` decides what a missing value renders as (copy step: "[TODO key]" + record; report: "—").
 */
export function fill(tpl, ctx, onMissing = (k) => `[TODO ${k}]`) {
  tpl = tpl.replace(/\{\{#each ([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, k, body) =>
    (get(ctx, k) || []).map(item => fill(body, typeof item === 'object' ? { ...ctx, ...item, '.': item } : { ...ctx, '.': item }, onMissing)).join(''));
  tpl = tpl.replace(/\{\{#if ([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, k, body) => (get(ctx, k) ? fill(body, ctx, onMissing) : ''));
  return tpl.replace(/\{\{([\w.]+)\}\}/g, (_, k) => {
    const v = get(ctx, k);
    return v === undefined || v === null || v === '' ? onMissing(k) : String(v);
  });
}

/** Strip markdown for platforms whose composer is plain text: leading **title** line, \# escapes, bold markers, editor notes. */
export const plainText = (md) => md
  .replace(/^\*.*\*\n\n---\n\n/s, '')          // "*Post date suggestion…*" editor note (LinkedIn)
  .replace(/^\*\*.+\*\*\n\n?/, '')             // bold title line (小红书 has a separate title field)
  .replace(/\\#/g, '#')
  .replace(/\*\*(.+?)\*\*/g, '$1');
