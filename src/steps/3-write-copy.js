// Fill the copy templates from an event JSON and build hand-off folders:
//   output/<slug>/linkedin/     post.md + landscape poster   -> marketing (LinkedIn)
//   output/<slug>/xiaohongshu/  post.md + portrait poster    -> marketing (小红书)
//   output/<slug>/meetup/       event.md + landscape poster  -> organiser (meetup.com)
//   output/<slug>/wechat/       member.md, public.md + portrait poster -> organiser (WeChat)
//   output/<slug>/teams/        webinar.md (Title + Description) + landscape poster -> organiser (Teams)
// STEP 3 — Usage: node src/steps/3-write-copy.js events/<event>.json   (run step 1 first so the posters exist)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadEvent, readJson } from '../lib/event.js';
import { fill as fillTpl, plainText } from '../lib/template.js';

const eventArg = process.argv[2];
const ev = loadEvent(eventArg);
const eventRel = path.relative(ROOT, path.resolve(ROOT, eventArg));
const cfg = readJson('config/citanz.json');

const missing = new Set();
const fill = (tpl, ctx, file) => fillTpl(tpl, ctx, (k) => { missing.add(`${file}: {{${k}}}`); return `[TODO ${k}]`; });
const platforms = readJson('config/platforms.json');

// ---------- derived fields ----------
const zh = ev.zh || {};
const thanked = (ev.sponsors || []).filter(s => s.thank).map(s => s.legal_name || s.name);   // only sponsors with thank:true get the thank-you line
const sponsorsEn = thanked, sponsorsZh = thanked;
const joinEn = (a) => a.length < 2 ? a[0] : a.slice(0, -1).join(', ') + ' and ' + a.at(-1);
const dateShort = ev.date.replace(/\s+\d{4}$/, '');               // "Wednesday, 26 August"
const publishDate = ev.publish_date || '';
const ctx = {
  ...ev,
  org_name_en: cfg.org_name_en, org_name_zh: cfg.org_name_zh, city: cfg.city,
  title_plain: ev.title.replace(/\n/g, ' '),
  title_zh: (zh.title || ev.title).replace(/\n/g, ''),   // poster title may carry a manual break; social titles are one line
  date_short: dateShort,
  publish_date: publishDate,
  time_long: ev.time_long || cfg.schedule.en_time_long,
  date_time_zh: zh.date_time || `${ev.date} ${ev.time}`,
  date_time_wechat: `${zh.date_time_short || zh.date_time || ev.date} · ${cfg.schedule.wechat_time_suffix}`,
  start_note_zh: zh.start_note || cfg.schedule.zh_start_note,
  wechat_online_line: cfg.schedule.wechat_online_line,
  teams_title: ev.copy?.teams?.title || '',
  teams_description: ev.copy?.teams?.description || ev.copy?.wechat?.body || '',
  venue_lines: ev.venue_full || ev.venue,
  venue_inline: (ev.venue_full || ev.venue).replace(/\n/g, ', '),
  venue_zh_lines: (zh.venue || ev.venue).replace(/\n/g, '\n　　　'),
  venue_short: ev.venue_short || ev.venue.split('\n')[0],
  language_en: ev.language_en || 'Mandarin',
  language_zh: ev.language_zh || '中文',
  format_en: ev.online_url ? 'In person and online' : 'In person',
  format_zh: ev.online_url ? '线下 + 线上同步' : '线下',
  format_details_en: ev.online_url
    ? `This is a hybrid event held in ${cfg.city}, with an online option available.`
    : `This is an in-person event held in ${cfg.city}.`,
  fee_en: cfg.fee.en, fee_zh: cfg.fee.zh, fee_meetup: cfg.fee.meetup_block,
  refreshments_en: cfg.refreshments.en, refreshments_zh: cfg.refreshments.zh,
  online_note_en: cfg.online_note_en,
  linkedin_outro: cfg.linkedin_outro,
  sponsor_thanks_en: sponsorsEn.length ? `We would also like to thank ${joinEn(sponsorsEn)} for their continued support of ${cfg.org_name_en} and our community.` : '',
  sponsor_thanks_zh: sponsorsZh.length ? `感谢${ev.sponsor_tier_zh ? ev.sponsor_tier_zh : ''}赞助商 ${sponsorsZh.join('、')} 一直以来对 CITA 的支持 ❤️` : '',
  hashtags_linkedin: [...new Set([...cfg.hashtags.linkedin_base, ...(ev.hashtags_en || [])])].map(t => `\\#${t}`).join(' '),
  hashtags_xiaohongshu: [...new Set([...cfg.hashtags.xiaohongshu_base, ...(ev.hashtags_zh || [])])].map(t => `#${t}`).join(' '),
  rsvp_url: ev.rsvp_url || ev.qr_url || '',
  agenda: ev.agenda || cfg.schedule.agenda_en,
  organiser_name: ev.organiser_name || 'Gabriel',
};

// ---------- platform limits (config/platforms.json) — a violation fails the build like a missing field ----------
function checkLimits(label, platform, { title, body }) {
  const lim = platforms[platform].copy;
  if (title != null && lim.title_max_chars && [...title].length > lim.title_max_chars) missing.add(`${label}: title is ${[...title].length} chars, ${platform} allows ${lim.title_max_chars}`);
  if (body != null) {
    const n = [...body].length, max = lim.body_max_chars || lim.post_max_chars;
    if (max && n > max) missing.add(`${label}: body is ${n} chars, ${platform} allows ${max}`);
    if (lim.recap_house_limit && label.includes('recap') && n > lim.recap_house_limit) missing.add(`${label}: ${n} chars, house limit ${lim.recap_house_limit} — cut it`);
    const topics = (body.match(/(^|\s)#[^\s#]+/g) || []).length;
    if (lim.topics_max && topics > lim.topics_max) missing.add(`${label}: ${topics} topics, ${platform} allows ${lim.topics_max}`);
  }
}

// ---------- write hand-off folders ----------
const outRoot = path.join(ROOT, 'output', ev.slug);
// Global naming rule for public copy: <channel>-post-<topic>-<date>.md (config/citanz.json handoff_naming)
const evDate = ev.slug.slice(0, 10);
const topic = ev.topic || ev.slug.replace(/^\d{4}-\d{2}-\d{2}-/, '');
const nameFor = (channelKey, ext = 'md') => cfg.handoff_naming.pattern
  .replace('{channel}', cfg.handoff_naming.channel_labels[channelKey])
  .replace('{topic}', topic).replace('{date}', evDate).replace(/\.md$/, '.' + ext);
const tpl = (n) => fs.readFileSync(path.join(ROOT, 'templates/copy', n), 'utf8');
const poster = (kind) => path.join(outRoot, `${ev.slug}.${kind}.png`);
// Channel folders are rebuilt from scratch every run so a renamed or removed file can never linger with stale content
// (e.g. an old venue). Posters at the top level of output/<slug>/ are left alone — step 1 owns them.
for (const channel of Object.keys(cfg.handoff)) fs.rmSync(path.join(outRoot, channel), { recursive: true, force: true });
const write = (channel, file, text) => {
  const dir = path.join(outRoot, channel); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, file), text.replace(/\n{3,}/g, '\n\n').trim() + '\n');
};
const attach = (channel) => {
  const kind = cfg.handoff[channel].poster, src = poster(kind);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outRoot, channel, `${ev.slug}.${kind}.png`));
  else missing.add(`${channel}: poster ${path.relative(ROOT, src)} not found — run render.js first`);
};

const liMd = fill(tpl('linkedin.md'), ctx, 'linkedin');
write('linkedin', nameFor('linkedin'), liMd); attach('linkedin');
write('linkedin', nameFor('linkedin', 'txt'), plainText(liMd));
checkLimits('linkedin post', 'linkedin', { body: plainText(liMd) });
const xhsMd = fill(tpl('xiaohongshu.md'), ctx, 'xiaohongshu');
write('xiaohongshu', nameFor('xiaohongshu'), xhsMd); attach('xiaohongshu');
// 小红书 has a separate title field and no markdown: .txt = body only, bold markers stripped (paste as-is)
write('xiaohongshu', nameFor('xiaohongshu', 'txt'), plainText(xhsMd));
checkLimits('小红书 post', 'xiaohongshu', { title: ctx.title_zh, body: plainText(xhsMd) });
const meetupMd = fill(tpl('meetup.md'), ctx, 'meetup');
write('meetup', nameFor('meetup'), meetupMd); attach('meetup');
// meetup.com's editor is plain text: strip markdown so the file can be pasted as-is
write('meetup', nameFor('meetup', 'txt'), meetupMd
  .replace(/^### Presentation Title\n\n\*\*(.+)\*\*\n/m, '')          // title goes in its own field
  .replace(/^### (.+)$/gm, (_, h) => h.toUpperCase())
  .replace(/\*\*(.+?)\*\*/g, '$1')
  .replace(/^\* /gm, '• '));
for (const [g, spec] of Object.entries(cfg.wechat_groups)) {
  if (g.startsWith('$')) continue;
  const gctx = {
    ...ctx,
    fee_line: spec.fee_line,
    hashtag_line: spec.hashtag ? '#接龙' : '',
    // local groups: date · time rule · venue; national group: date · "go to your local group" (no address)
    wechat_when_where: spec.show_venue
      ? `${ctx.date_time_wechat} · ${ctx.venue_short}`
      : `${zh.date_time_short || zh.date_time || ev.date} · ${spec.venue_replacement || ''}`,
    show_rsvp: spec.show_venue && ctx.rsvp_url ? ctx.rsvp_url : '',
  };
  write('wechat', nameFor(`wechat_${g}`), fill(tpl('wechat.md'), gctx, `wechat/${g}`));
}
attach('wechat');
write('teams', nameFor('teams'), fill(tpl('teams.md'), ctx, 'teams')); attach('teams');

// Post-event LinkedIn recap (optional): events/<slug>.json `recap` → linkedin/领英-recap-<topic>-<date>.md + the photos, in order.
if (ev.recap?.linkedin) {
  const thanked = (ev.sponsors || []).filter(s => s.thank).map(s => s.legal_name || s.name);
  const rctx = { ...ctx, recap: ev.recap,
    sponsor_thanks_recap: thanked.length ? joinEn(thanked) : '',
    venue_short_en: ev.venue_short_en || (ev.venue_full || ev.venue).split('\n')[0],
    recap_next_line: ev.recap.next_line || cfg.recap.next_line };
  const recapName = cfg.handoff_naming.recap_pattern.replace('{channel}', cfg.handoff_naming.channel_labels.linkedin).replace('{topic}', topic).replace('{date}', evDate);
  const recapMd = fill(tpl('linkedin-recap.md'), rctx, 'linkedin-recap');
  write('linkedin', recapName, recapMd);
  write('linkedin', recapName.replace(/\.md$/, '.txt'), plainText(recapMd));
  checkLimits('linkedin recap', 'linkedin', { body: plainText(recapMd) });
  if (ev.recap.xiaohongshu) {
    const xr = fill(tpl('xiaohongshu-recap.md'), rctx, 'xiaohongshu-recap');
    const xrName = recapName.replace(cfg.handoff_naming.channel_labels.linkedin, cfg.handoff_naming.channel_labels.xiaohongshu);
    write('xiaohongshu', xrName, xr);
    write('xiaohongshu', xrName.replace(/\.md$/, '.txt'), plainText(xr));
    checkLimits('小红书 recap', 'xiaohongshu', { title: ev.recap.xiaohongshu.title, body: plainText(xr) });
  }
  (ev.recap.photos || []).forEach((src, i) => {
    const abs = path.resolve(ROOT, src);
    if (!fs.existsSync(abs)) { missing.add(`recap photo not found: ${src}`); return; }
    for (const ch of ['linkedin', 'xiaohongshu']) fs.copyFileSync(abs, path.join(outRoot, ch, `recap-${String(i + 1).padStart(2, '0')}-${path.basename(src)}`));
  });
}

const readme = `# ${ctx.title_plain} — hand-off pack

| Folder | Give to | Contains |
|---|---|---|
${Object.entries(cfg.handoff).map(([c, h]) => `| \`${c}/\` | ${h.owner} | copy + ${h.poster} poster |`).join('\n')}

Generated ${new Date().toLocaleDateString('en-CA')} from \`${eventRel}\`. Re-run \`npm run build ${eventRel}\` after edits.
`;
fs.writeFileSync(path.join(outRoot, 'README.md'), readme);

console.log(`wrote output/${ev.slug}/{linkedin,xiaohongshu,meetup,wechat,teams}/`);
if (missing.size) { console.error('TODO (left as [TODO …] in the files):\n - ' + [...missing].join('\n - ')); process.exit(1); }
