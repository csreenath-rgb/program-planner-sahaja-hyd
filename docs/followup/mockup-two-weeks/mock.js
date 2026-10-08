// Mock-up only: the Follow-up page with two weeks in the calendar (scratch copy; the repository is not changed).
// Run: node docs/followup/mockup-two-weeks/mock.js (needs playwright-core; see HANDOFF "Start here"). Chromium path as in the tests.
const REPO = require('path').resolve(__dirname, '../../..'), OUT = __dirname;
const { chromium } = require(REPO + '/test/node_modules/playwright-core');
const { load, makeSheet } = require(REPO + '/test/harness');
const SHIM = `window.google = { script: { get run() {
  let ok = () => {}, fail = () => {};
  const r = new Proxy({}, { get: (_, k) => k === 'withSuccessHandler' ? (f => (ok = f, r)) : k === 'withFailureHandler' ? (f => (fail = f, r))
    : (...a) => window.gsCall(k, a).then(x => x.err ? fail(new Error(x.err)) : ok(x.ok)) });
  return r; } } };`;
const P2 = ['Line ID', 'Day of the Week', 'Start Time', 'End Time', 'Frequency', 'Week of month', 'Day of month', 'Institution Name', 'Address',
  'Google map', 'Volunteers Needed', 'From', 'Until', 'Principal Contact', 'Sahaji Contact', 'Notes'];
const S2 = ['Slot ID', 'Date', 'Day', 'Start Time', 'End Time', 'Institution Name', 'Address', 'Map', 'Principal Contact', 'Sahaji Contact',
  'Volunteers Needed', 'Status', 'Volunteers', 'Still needed', 'Cancellation notice sent', 'Notes'];
const row = o => P2.map(h => o[h] == null ? '' : o[h]);
const plan = makeSheet('Program plan', 1, [P2,
  row({ 'Day of the Week': 'Saturday', 'Start Time': '6:30 PM', 'End Time': '7:30 PM', Frequency: 'Weekly', 'Institution Name': 'Ameerpet Centre', 'Volunteers Needed': '4', From: '2026-10-01', Until: '2026-12-31' }),
  row({ 'Day of the Week': 'Every day', 'Start Time': '7:00 AM', 'End Time': '7:45 AM', Frequency: 'Daily', 'Institution Name': 'Kukatpally Centre', 'Volunteers Needed': '2', From: '2026-10-12', Until: '2026-10-25' }),
  row({ 'Start Time': '6:30 PM', 'End Time': '7:30 PM', Frequency: 'Daily, weekdays only (Mon-Fri)', 'Institution Name': 'Dilsukhnagar Centre', 'Volunteers Needed': '2', From: '2026-10-12', Until: '2026-11-30' }),
  row({ 'Day of the Week': 'Sunday', 'Start Time': '10:00 AM', 'End Time': '11:00 AM', Frequency: 'Every 2 weeks', 'Institution Name': 'Secunderabad Centre', 'Volunteers Needed': '3', From: '2026-10-04' }),
  row({ 'Day of the Week': 'Saturday', 'Start Time': '4:00 PM', 'End Time': '5:30 PM', Frequency: 'Monthly, same weekday', 'Week of month': '2nd', 'Institution Name': 'Gachibowli Centre', 'Volunteers Needed': '5', From: '2026-10-01', Until: '2027-03-31' })]);
const slots = makeSheet('Slots', 2, [S2]);
const gs = load([plan, slots], new Date(Date.UTC(2026, 8 + 1, 8, 9, 0)), 'followup/Code.gs');
gs.generateSlots();
['Asha Rao', 'Ravi Kumar', 'Gita Sharma', 'Sreenath'].forEach((n, i) => gs.registerSlots(['P1-20261010'], 1, n, '900000000' + i));
gs.registerSlots(['P3-20261012'], 1, 'Sreenath', '9000000003');

// The change being shown: two weeks, each with a small heading and its own "N open" box.
const PATCH_CSS = `  .wkhead { grid-column:1 / -1; margin:6px 0 -2px; font-weight:700; color:var(--navy); }
  .wkhead span { font-weight:400; color:var(--muted); }
  #calGrid .wkhead:first-child { margin-top:0; }
`;
function patch(html) {
  html = html.replace('  .dbox.week {', PATCH_CSS + '  .dbox.week {');
  const a = html.indexOf('  function renderCalendar() {'), b = html.indexOf('\n  }\n', a) + 4;
  const fn = `  function renderCalendar() {
    var today = state.today, last = addDays(weekStart, 13), m1 = +weekStart.slice(5, 7) - 1, m2 = +last.slice(5, 7) - 1;
    var rng = function (a, b) { return Number(a.slice(8)) + ' ' + t('months')[+a.slice(5, 7) - 1] + ' – ' + Number(b.slice(8)) + ' ' + t('months')[+b.slice(5, 7) - 1]; };
    $('calMonth').textContent = t('monthsLong')[m1] + (m2 !== m1 ? ' – ' + t('monthsLong')[m2] : '') + ' ' + last.slice(0, 4);
    $('calRange').textContent = rng(weekStart, last);
    $('prevWeek').disabled = weekStart <= monday(today);
    var html = '';
    for (var w = 0; w < 2; w++) {
      var ws = addDays(weekStart, 7 * w), weekOpen = 0;
      var name = ws === monday(today) ? 'This week' : ws === addDays(monday(today), 7) ? 'Next week' : 'Week of ' + Number(ws.slice(8)) + ' ' + t('months')[+ws.slice(5, 7) - 1];
      html += '<div class="wkhead">' + name + ' <span>· ' + rng(ws, addDays(ws, 6)) + '</span></div>';
      for (var i = 0; i < 7; i++) {
        var k = addDays(ws, i), day = slots().filter(function (s) { return s.date === k; });
        var open = day.filter(selectable).length, past = k < today, cls = 'dbox', st;
        weekOpen += past ? 0 : open;
        if (past) { cls += ' past'; st = t('past'); }
        else if (!day.length) st = k > rangeEnd ? '…' : t('none');
        else if (open) st = t('open', open);
        else { cls += ' full'; st = t('full'); }
        if (k === today) cls += ' today';
        html += '<button class="' + cls + '" data-date="' + k + '"' + (past ? ' disabled' : '') + '><span class="wd">' +
          (k === today ? t('today') : t('days')[wd(k)]) + '</span><span class="dn">' + Number(k.slice(8)) +
          (k.slice(8) === '01' || i === 0 ? '<span class="mt">' + t('months')[+k.slice(5, 7) - 1] + '</span>' : '') + '</span>' +
          '<span class="st">' + esc(st) + '</span>' + (day.some(mine) ? '<span class="you">' + t('you') + '</span>' : '') + '</button>';
      }
      html += '<div class="dbox week"><span class="wd">' + name + '</span><span class="dn">' + weekOpen + '</span><span class="st">' + t('openWord') + '</span></div>';
    }
    $('calGrid').innerHTML = html;
  }
`;
  return html.slice(0, a) + fn + html.slice(b);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  for (const [w, h, file] of [[390, 1100, 'mock-phone.png'], [1280, 900, 'mock-laptop.png']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1 });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.exposeFunction('gsCall', (fn, a) => { try { return { ok: JSON.parse(JSON.stringify(gs[fn](...a))) }; } catch (e) { return { err: e.message }; } });
    await p.addInitScript(SHIM);
    await p.addInitScript(() => { try { localStorage.setItem('fu.name', 'Sreenath'); } catch (e) {} });
    await p.route('http://app.test/', r => r.fulfill({ contentType: 'text/html', body: patch(gs.doGet().getContent()) }));
    await p.goto('http://app.test/');
    await p.waitForSelector('#calGrid .wkhead');
    await p.screenshot({ path: OUT + '/' + file, fullPage: false });
    console.log(file, 'week heads:', await p.locator('#calGrid .wkhead').allInnerTexts(), 'errors:', errs);
    await ctx.close();
  }
  await browser.close();
})();
