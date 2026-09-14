// Shared by every template.
// 1. Shrink [data-max-lines] blocks until they fit (min 70% of the original size).
// 2. Measure how the text actually wrapped and expose it for validate.js:
//    data-lines, data-last-line-ratio (last line width / widest line). A short last line
//    ("orphan") is a typography failure — the fix is to reword, never to squeeze.
function lineBoxes(el) {
  const range = document.createRange(); range.selectNodeContents(el);
  const rows = [];
  for (const r of range.getClientRects()) {
    if (r.width < 1) continue;
    const row = rows.find(x => Math.abs(x.top - r.top) < r.height * 0.5);
    if (row) { row.left = Math.min(row.left, r.left); row.right = Math.max(row.right, r.right); }
    else rows.push({ top: r.top, left: r.left, right: r.right });
  }
  return rows.map(x => x.right - x.left);
}
function measure(el) {
  const widths = lineBoxes(el);
  el.dataset.lines = widths.length;
  const widest = Math.max(...widths);
  el.dataset.lastLineRatio = widths.length > 1 ? (widths.at(-1) / widest).toFixed(2) : '1';
  el.dataset.minLineRatio = widths.length > 1 ? (Math.min(...widths) / widest).toFixed(2) : '1';
}
function fitLines(el) {
  const max = +el.dataset.maxLines || 99;
  const cs = getComputedStyle(el);
  const lh = parseFloat(cs.lineHeight), fs0 = parseFloat(cs.fontSize);
  let fs = fs0;
  const lines = () => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
  while (lines() > max && fs > fs0 * 0.7) {
    fs -= 1;
    el.style.fontSize = fs + 'px';
    el.style.lineHeight = (lh * fs / fs0) + 'px';
  }
  el.dataset.fontSize = fs;
  el.dataset.shrink = (fs / fs0).toFixed(2);
}
document.fonts.ready.then(() => {
  document.querySelectorAll('[data-max-lines]').forEach(fitLines);
  document.querySelectorAll('[data-block]').forEach(measure);
  document.body.dataset.ready = '1';
});
