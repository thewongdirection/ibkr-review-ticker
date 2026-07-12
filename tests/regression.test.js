#!/usr/bin/env node
/*
 * Regression suite for the ibkr-review-ticker skill.
 * Runs 50 tests against the skill's executable artifact (the dashboard
 * template's embedded JS: probability math, CONFIG-driven rendering),
 * its documentation invariants, and the committed sample output.
 *
 * No dependencies — run with:  node tests/regression.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ---------- harness ---------- */
let passed = 0, failed = 0, idx = 0;
const failures = [];
function test(name, fn) {
  idx++;
  try {
    fn();
    passed++;
    console.log(`  ok ${String(idx).padStart(2)} - ${name}`);
  } catch (e) {
    failed++;
    failures.push({ idx, name, msg: e.message });
    console.log(`NOT OK ${String(idx).padStart(2)} - ${name}\n         ${e.message}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function approx(a, b, tol, msg) {
  if (Math.abs(a - b) > tol) throw new Error(`${msg || 'approx'}: ${a} != ${b} (±${tol})`);
}
function count(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

/* ---------- load template & split script ---------- */
const template = read('assets/dashboard_template.html');

function extractScript(html) {
  const lines = html.split('\n');
  const s = lines.findIndex(l => l.trim() === '<script>');
  const e = lines.findIndex(l => l.trim() === '</script>');
  if (s < 0 || e < 0 || e <= s) throw new Error('script block not found');
  return lines.slice(s + 1, e).join('\n');
}
const script = extractScript(template);
const renderMark = script.indexOf('RENDER — do not edit');
const renderStart = script.lastIndexOf('/*', renderMark);
const renderCode = script.slice(renderStart);

/* ---------- DOM stub ---------- */
function makeDOM() {
  const app = { innerHTML: '' };
  const doc = {
    title: '',
    getElementById: id => (id === 'app' ? app : null),
    querySelectorAll: () => []
  };
  return { app, doc };
}
function runScript(code) {
  const { app, doc } = makeDOM();
  const ctx = vm.createContext({
    document: doc,
    requestAnimationFrame: fn => { fn(); },
    Math, console
  });
  vm.runInContext(code, ctx);
  return { ctx, app, doc, get: expr => vm.runInContext(expr, ctx) };
}
function runWithConfig(cfg) {
  return runScript('const CONFIG = ' + JSON.stringify(cfg) + ';\n' + renderCode);
}

/* ---------- a minimal valid CONFIG for behavior tests ---------- */
function baseConfig() {
  return {
    ticker: 'TEST', name: 'Test Corp', meta: 'Test · snapshot', price: '$100.00',
    dayChange: { txt: '▼1.0%', cls: 'dn' },
    headChips: [{ t: 'YTD −10%', cls: 'dn' }, { t: 'IV 30%', cls: 'warn' }],
    statusHTML: 'Test status.',
    vitals: [{ lab: 'Market cap', val: '$1B', tag: 'test', tagcls: '' }],
    options: [
      { lab: 'IV', val: '30%', tag: 'x', tagcls: 'warn' },
      { lab: 'Walls', val: '$90p / $110c', tag: 'y', tagcls: '', sm: true }
    ],
    recoverySignals: ['<b>up</b> one'], declineSignals: ['<b>down</b> one'],
    dist: {
      spot: 100, sigma: 0.3, T: 0.5, r: 0.045, domain: [50, 180],
      bounds: [80, 95, 110, 130],
      zoneLabels: [
        { at: 65, txt: 'DECLINE', c: '#fb6f8e' },
        { at: 102, txt: 'BASE', c: '#f6b13e' },
        { at: 155, txt: 'RECOVERY', c: '#45d6c6' }
      ]
    },
    distStats: [{ l: 'Median', v: '~$100', sub: '' }],
    scenarios: [
      { b: 'Bear', r: 'below $80', p: 20, c: '#fb6f8e', t: 'a' },
      { b: 'Base', r: '$80 – $110', p: 50, c: '#f6b13e', t: 'b' },
      { b: 'Bull', r: 'above $110', p: 30, c: '#5fd699', t: 'c' }
    ],
    distCaption: 'Test caption.',
    profitability: [
      { l: 'Gross margin', v: 0, n: 'zero case' },
      { l: 'Net margin', v: 140, n: 'clamp case' },
      { l: 'FCF margin', v: 50, n: 'mid case' }
    ],
    peerOrder: ['TEST', 'AAA', 'BBB'],
    rails: [
      { name: 'GrowthBest', sub: 'higher wins', unit: '%', higherBetter: true, v: { TEST: 90, AAA: 10, BBB: 50 } },
      { name: 'ValBest', sub: 'lower wins', unit: '×', higherBetter: false, v: { TEST: 5, AAA: 50, BBB: 20 } },
      { name: 'ValWorst', sub: 'lower wins', unit: '×', higherBetter: false, v: { TEST: 99, AAA: 50, BBB: 20 } }
    ],
    railNoteHTML: '<b style="color:var(--amber)">' + 'MSFT' + ' in amber</b>; peers in grey.',
    income: [
      { bl: 'Revenue', pct: 100, bv: '$10B' },
      { bl: 'CapEx', pct: 30, bv: '$3B', amber: true }
    ],
    incomeNoteHTML: 'Income note.',
    balance: [{ lab: 'Cash', val: '$1B', tag: 'ok', tagcls: 'good' }],
    analyst: { low: 100, cur: 150, avg: 200, high: 300, pill: 'Buy · 10', txt: 'txt' },
    events: [
      { when: 'Aug 1', sub: 'AMC', title: 'Earnings', key: true, badge: 'Pivotal', body: 'big' },
      { when: 'Ongoing', sub: 'reg', title: 'Probe', badge: 'Reg. risk', badgeCls: 'risk', body: 'risk' },
      { when: 'Later', sub: 'minor', title: 'NoBadge', body: 'plain' }
    ],
    footerHTML: 'Informational dashboard, not investment advice.'
  };
}

console.log('# ibkr-review-ticker regression suite');

/* ================= A. static & documentation (1-8) ================= */
const skillMd = read('SKILL.md');
const readme = read('README.md');
const refDoc = read('references/data_and_model.md');

test('template exists and is non-trivial', () => {
  assert(template.length > 10000, `template too small: ${template.length}`);
});
test('template <title> carries the __TICKER__ placeholder', () => {
  assert(/<title>__TICKER__/.test(template), '__TICKER__ missing from <title>');
});
test('template embeds a single CONFIG-driven script', () => {
  assert(script.includes('const CONFIG'), 'const CONFIG missing');
  assert(count(script, 'const CONFIG') === 1, 'CONFIG must appear exactly once');
});
test('SKILL.md frontmatter name matches the skill folder', () => {
  const m = skillMd.match(/^name:\s*(\S+)/m);
  assert(m && m[1] === 'ibkr-review-ticker', `frontmatter name: ${m && m[1]}`);
});
test('SKILL.md documents prerequisites incl. IBKR account + auth', () => {
  assert(/## Prerequisites/.test(skillMd), 'Prerequisites section missing');
  assert(/Interactive Brokers account/i.test(skillMd), 'IBKR account not documented');
  assert(/OAuth/i.test(skillMd), 'authentication flow not documented');
  assert(/never places orders/i.test(skillMd), 'read-only guarantee not documented');
});
test('README documents prerequisites incl. IBKR account + auth + fallback', () => {
  assert(/## Prerequisites/.test(readme), 'Prerequisites section missing');
  assert(/Interactive Brokers account/i.test(readme), 'IBKR account not documented');
  assert(/OAuth/i.test(readme), 'OAuth not documented');
  assert(/delayed data/i.test(readme), 'delayed-data note missing');
  assert(/falls back to web-sourced/i.test(readme), 'fallback behavior missing');
});
test('SKILL.md keeps the web-search fallback instruction', () => {
  assert(/fall back to\s+web/i.test(skillMd.replace(/\n/g, ' ').replace(/\s+/g, ' ')) ||
         /fall back to web/i.test(skillMd), 'fallback instruction missing');
});
test('reference doc lists the price-snapshot field set', () => {
  ['implied_vol_underlying', 'historical_vol', 'implied_volatility_percentile',
   'underlying_today_option_volume', 'misc_statistics'].forEach(f =>
    assert(refDoc.includes(f), `field ${f} missing from reference doc`));
});

/* ================= B. probability math (9-18) ================= */
const tpl = runScript(script); // full template run (MSFT example CONFIG)

// normCDF is Abramowitz-Stegun 26.2.17 — documented max error ~7.5e-8
test('normCDF(0) = 0.5 (within A-S accuracy)', () => approx(tpl.get('normCDF(0)'), 0.5, 1e-6, 'Φ(0)'));
test('normCDF(1.96) ≈ 0.975', () => approx(tpl.get('normCDF(1.96)'), 0.975, 1e-3, 'Φ(1.96)'));
test('normCDF(−1.96) ≈ 0.025', () => approx(tpl.get('normCDF(-1.96)'), 0.025, 1e-3, 'Φ(−1.96)'));
test('normCDF(3) ≈ 0.99865', () => approx(tpl.get('normCDF(3)'), 0.99865, 5e-4, 'Φ(3)'));
test('normCDF symmetry Φ(z)+Φ(−z)=1', () => {
  [0.5, 1.0, 1.7, 2.5].forEach(z =>
    approx(tpl.get(`normCDF(${z}) + normCDF(${-z})`), 1, 2e-4, `z=${z}`));
});
test('normCDF is monotonically increasing', () => {
  const vals = [-2, -1, 0, 0.1, 0.2, 1, 2].map(z => tpl.get(`normCDF(${z})`));
  for (let i = 1; i < vals.length; i++) assert(vals[i] > vals[i - 1], `not increasing at step ${i}`);
});
test('lognormPDF is 0 for x ≤ 0', () => {
  assert(tpl.get('lognormPDF(0, Math.log(100), 0.3)') === 0, 'pdf(0) != 0');
  assert(tpl.get('lognormPDF(-5, Math.log(100), 0.3)') === 0, 'pdf(-5) != 0');
});
test('lognormPDF is positive for x > 0', () => {
  [1, 50, 100, 500].forEach(x =>
    assert(tpl.get(`lognormPDF(${x}, Math.log(100), 0.3)`) > 0, `pdf(${x}) <= 0`));
});
test('lognormPDF integrates to ≈ 1', () => {
  const integral = tpl.get(`(() => {
    const m = Math.log(100), s = 0.3; let sum = 0, dx = 0.25;
    for (let x = dx / 2; x < 1000; x += dx) sum += lognormPDF(x, m, s) * dx;
    return sum;
  })()`);
  approx(integral, 1, 0.01, 'pdf integral');
});
test('reference worked example: P(S<320 | S0=368, σ=.30, T=.5, μ=.03) ≈ 26.6%', () => {
  const p = tpl.get(`(() => {
    const S0 = 368, sig = 0.30, T = 0.5, mu = 0.03;
    const m = Math.log(S0) + (mu - 0.5 * sig * sig) * T, s = sig * Math.sqrt(T);
    return normCDF((Math.log(320) - m) / s);
  })()`);
  approx(p, 0.266, 0.01, 'worked example P(S<320)');
});

/* ================= C. distribution rendering (19-24) ================= */
test('distSVG returns an <svg> with a viewBox', () => {
  const svg = tpl.get('distSVG()');
  assert(svg.startsWith('<svg'), 'not an svg');
  assert(svg.includes('viewBox='), 'viewBox missing');
});
test('distSVG marks the spot price', () => {
  assert(tpl.get('distSVG()').includes('spot $368'), 'spot marker missing');
});
test('distSVG draws one divider per zone bound', () => {
  assert(count(tpl.get('distSVG()'), 'stroke-dasharray="2 4"') === 4, 'expected 4 bound lines');
});
test('distSVG renders the DECLINE / BASE / RECOVERY zone labels', () => {
  const svg = tpl.get('distSVG()');
  ['DECLINE', 'BASE', 'RECOVERY'].forEach(z => assert(svg.includes(z), `${z} missing`));
});
test('bucket probabilities over the bounds partition to 1', () => {
  const total = tpl.get(`(() => {
    const d = CONFIG.dist, s = d.sigma * Math.sqrt(d.T);
    const m = Math.log(d.spot) + (d.r - 0.5 * d.sigma * d.sigma) * d.T;
    const P = K => normCDF((Math.log(K) - m) / s);
    const cuts = d.bounds.map(P);
    let sum = cuts[0];
    for (let i = 1; i < cuts.length; i++) sum += cuts[i] - cuts[i - 1];
    sum += 1 - cuts[cuts.length - 1];
    return sum;
  })()`);
  approx(total, 1, 1e-9, 'bucket partition');
});
test('drift exactly offsetting vol drag ⇒ P(S<S0) = 0.5', () => {
  const p = tpl.get(`(() => {
    const S0 = 100, sig = 0.4, T = 0.5, mu = 0.5 * sig * sig;
    const m = Math.log(S0) + (mu - 0.5 * sig * sig) * T, s = sig * Math.sqrt(T);
    return normCDF((Math.log(S0) - m) / s);
  })()`);
  approx(p, 0.5, 1e-6, 'neutral drift median');
});

/* ================= D. full template render (25-34) ================= */
test('render() populates the app container', () => {
  assert(tpl.app.innerHTML.length > 5000, `innerHTML only ${tpl.app.innerHTML.length} chars`);
});
test('document.title is derived from CONFIG.ticker', () => {
  assert(tpl.doc.title === 'MSFT — Fundamentals & Outlook', `title: ${tpl.doc.title}`);
});
test('header shows the CONFIG price', () => {
  assert(tpl.app.innerHTML.includes('$367.59'), 'price missing from header');
});
test('cell count = vitals + options + balance (8+6+4)', () => {
  assert(count(tpl.app.innerHTML, '<div class="lab">') === 18, 'expected 18 label cells');
});
test('one scenario row per CONFIG scenario (5)', () => {
  assert(count(tpl.app.innerHTML, 'class="srow"') === 5, 'expected 5 scenario rows');
});
test('one gauge per profitability entry (6)', () => {
  assert(count(tpl.app.innerHTML, 'class="gauge"') === 6, 'expected 6 gauges');
});
test('one rail per CONFIG rail (4)', () => {
  assert(count(tpl.app.innerHTML, 'class="rail"') === 4, 'expected 4 rails');
});
test('one event row per CONFIG event; key event highlighted', () => {
  const rows = count(tpl.app.innerHTML, '<div class="ev"') + count(tpl.app.innerHTML, '<div class="ev key"');
  assert(rows === 5, `expected 5 event rows, got ${rows}`);
  assert(tpl.app.innerHTML.includes('class="ev key"'), 'key event not highlighted');
});
test('template example ranks MSFT correctly on its own rails', () => {
  // P/E rail (lower better): GOOGL 20 < MSFT 21.5 → MSFT #2 of 6
  assert(tpl.app.innerHTML.includes('MSFT #2 of 6'), 'P/E rank #2 missing');
  // FCF rail: NVDA 45, AAPL 25, META 25, MSFT 23 → #4 of 6
  assert(tpl.app.innerHTML.includes('MSFT #4 of 6'), 'FCF rank #4 missing');
});
test('footer carries the not-investment-advice disclaimer', () => {
  assert(/not investment advice/i.test(tpl.app.innerHTML), 'disclaimer missing');
});

/* ================= E. CONFIG-driven behaviors (35-49) ================= */
const t35 = runWithConfig(baseConfig());
test('minimal CONFIG renders without throwing; title follows ticker', () => {
  assert(t35.doc.title === 'TEST — Fundamentals & Outlook', `title: ${t35.doc.title}`);
  assert(t35.app.innerHTML.length > 1000, 'render too small');
});
test('rail note substitutes the subject ticker for the MSFT placeholder', () => {
  assert(t35.app.innerHTML.includes('TEST in amber'), 'subject not substituted');
  assert(!t35.app.innerHTML.includes('MSFT in amber'), 'placeholder leaked');
});
test('subject peer point is highlighted with the subj class', () => {
  assert(count(t35.app.innerHTML, 'class="pt subj"') === 3, 'subject point missing on a rail');
});
test('higherBetter=true: subject with max value ranks #1 best', () => {
  assert(t35.app.innerHTML.includes('TEST #1 best'), 'growth rail rank wrong');
});
test('higherBetter=false: subject with min value ranks #1 best', () => {
  assert(count(t35.app.innerHTML, 'TEST #1 best') >= 2, 'valuation rail rank wrong');
});
test('higherBetter=false: subject with max value ranks last', () => {
  assert(t35.app.innerHTML.includes('TEST #3 of 3'), 'worst-case rank wrong');
});
test('rail scale ends orient by higherBetter', () => {
  // higherBetter=true → left end = min (10%), right end = max (90%)
  assert(t35.app.innerHTML.includes('<span>10%</span><span>90%</span>'), 'ends wrong for higherBetter');
  // higherBetter=false → left end = max (50×), right end = min (5×)
  assert(t35.app.innerHTML.includes('<span>50×</span><span>5×</span>'), 'ends wrong for lowerBetter');
});
test('scenario bars scale to the largest probability (data-w=100)', () => {
  assert(t35.app.innerHTML.includes('data-w="100"'), 'max scenario not full width');
  assert(t35.app.innerHTML.includes('data-w="40"'), '20% vs 50% should be width 40');
});
test('scenario bar colors come from CONFIG', () => {
  assert(t35.app.innerHTML.includes('#fb6f8e'), 'scenario color missing');
});
test('gauge v=0 renders an empty arc (offset = circumference)', () => {
  assert(t35.app.innerHTML.includes('data-off="188.5"'), 'zero gauge offset wrong');
});
test('gauge v>100 clamps to a full arc (offset 0)', () => {
  assert(t35.app.innerHTML.includes('data-off="0.0"'), 'clamped gauge offset wrong');
});
test('analyst markers are positioned proportionally', () => {
  assert(t35.app.innerHTML.includes('left:25.0%'), 'cur marker misplaced');
  assert(t35.app.innerHTML.includes('left:50.0%'), 'avg marker misplaced');
});
test('analyst edge case cur < low renders (marker just off-track) without throwing', () => {
  const cfg = baseConfig();
  cfg.analyst = { low: 400, cur: 388, avg: 561, high: 870, pill: 'Buy', txt: 'x' };
  const t = runWithConfig(cfg);
  assert(t.app.innerHTML.includes('left:-2.6%'), 'expected small negative offset');
});
test('event badges: present renders (risk class applied), absent renders none', () => {
  const html = t35.app.innerHTML;
  assert(html.includes('class="badge "') || html.includes('class="badge"'), 'plain badge missing');
  assert(html.includes('class="badge risk"'), 'risk badge missing');
  const noBadgeRow = html.split('class="ev').find(seg => seg.includes('NoBadge'));
  assert(noBadgeRow && !noBadgeRow.includes('class="badge'), 'badge rendered where none configured');
});
test('sm cells and amber income bars honor their flags', () => {
  assert(t35.app.innerHTML.includes('class="val sm"'), 'sm cell class missing');
  assert(t35.app.innerHTML.includes('class="bfill amber"'), 'amber income bar missing');
});

/* ================= F. committed sample (50) ================= */
test('committed PLTR sample renders end-to-end from its own CONFIG', () => {
  const sample = read('samples/pltr-dashboard.html');
  assert(!sample.includes('__TICKER__'), 'placeholder left in sample title');
  const s = runScript(extractScript(sample));
  assert(s.doc.title === 'PLTR — Fundamentals & Outlook', `title: ${s.doc.title}`);
  assert(s.app.innerHTML.includes('$132.35'), 'sample spot price missing');
  assert(/not investment advice/i.test(s.app.innerHTML), 'sample disclaimer missing');
});

/* ================= G. credential & session-isolation invariants (51-52) ================= */
test('no session-bound identifiers or secrets in any tracked file', () => {
  const files = ['SKILL.md', 'README.md', 'assets/dashboard_template.html',
    'references/data_and_model.md', 'samples/pltr-dashboard.html', 'tests/regression.test.js'];
  const NAMESPACED_TOOL = new RegExp('mcp' + '__[0-9a-f-]{8,}', 'i'); // split so this test file can't match itself
  const badPatterns = [
    [NAMESPACED_TOOL, 'session-namespaced MCP tool name'],
    [/\b(ghp|gho|ghs)_[A-Za-z0-9]{20,}/, 'GitHub token'],
    [/\bAKIA[0-9A-Z]{16}\b/, 'AWS key'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
    [/\b(U|DU)[0-9]{6,8}\b/, 'IBKR account id'],
    [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, 'UUID (connector/session id)']
  ];
  for (const f of files) {
    const body = read(f);
    for (const [re, label] of badPatterns) {
      assert(!re.test(body), `${label} found in ${f}`);
    }
  }
});
test('SKILL.md forbids account-bound data in outputs; tools referenced generically', () => {
  assert(/Never write account-bound data/i.test(skillMd), 'account-data guardrail missing');
  assert(/generic name/i.test(skillMd), 'generic tool-name rule missing');
});

/* ---------- summary ---------- */
console.log(`\n# ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed) {
  failures.forEach(f => console.log(`#   FAIL ${f.idx}: ${f.name} — ${f.msg}`));
  process.exit(1);
}
