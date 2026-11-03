/* Node test suite: node tests/run_tests.js */
'use strict';
const path = require('path');
const root = path.join(__dirname, '..');
for (const f of ['logic', 'ics', 'board', 'sim', 'analog', 'refbuild', 'experiments', 'checks', 'verilog']) {
  try { require(path.join(root, 'core', f + '.js')); } catch (e) { if (f !== 'verilog' || e.code !== 'MODULE_NOT_FOUND') throw e; }
}
const DSD = globalThis.DSD;
let fails = 0;
const ok = (c, msg) => { if (!c) { fails++; console.log('  FAIL', msg); } };

console.log('IC models vs datasheet:');
for (const id of Object.keys(DSD.LIB)) {
  const r = DSD.verifyIC(id);
  console.log(`  ${id.padEnd(7)} ${r.skipped ? 'switch-level / analog' : r.vectors + ' vectors'} ${r.pass ? 'ok' : 'FAIL ' + JSON.stringify(r.first)}`);
  ok(r.pass, id);
}

console.log('Reference builds:');
for (const part of DSD.allParts()) {
  if (!part.ref) continue;
  const build = DSD.RefBuild.build(part.ref);
  const ex = DSD.Board.extract(build, true);
  ok(!ex.issues.length, part.key + ' issues ' + JSON.stringify(ex.issues));
  const { eng } = DSD.Checks.freshEngine(build);
  const diag = DSD.Checks.diagnose(part, ex, eng).filter((d) => d.sev !== 'info');
  ok(!diag.length, part.key + ' diagnostics ' + JSON.stringify(diag));
  const app = DSD.Checks.apparatusStatus(part, build);
  ok(app.ok && !app.extra.length, part.key + ' apparatus');
  const t0 = Date.now();
  const v = DSD.Checks.verify(part, build);
  for (const r of v.results) {
    const extra = r.width ? ` width ${DSD.fmtTime(r.width)} (theory ${DSD.fmtTime(r.theory)})` : r.meas ? ` f ${DSD.fmtFreq(r.meas.f)} (theory ${DSD.fmtFreq(r.theory.f)}) duty ${(r.meas.duty * 100).toFixed(1)}%` : '';
    console.log(`  ${part.key.padEnd(18)} ${r.task.id.padEnd(8)} ${r.pass ? 'pass' : 'FAIL ' + JSON.stringify(r.fails.slice(0, 2))}${extra}`);
    ok(r.pass, part.key + '/' + r.task.id);
  }
  // removing any single non-power wire must break at least one task (the checker is not blind)
  if (!part.tasks.some((t) => t.kind === 'mono' || t.kind === 'astable')) {
    const wires = build.parts.filter((p) => p.kind === 'wire' && !p.optional);
    let blind = 0;
    for (const w of wires) {
      const b2 = { parts: build.parts.filter((p) => p !== w) };
      if (DSD.Checks.verify(part, b2).pass) blind++;
    }
    ok(blind === 0, `${part.key}: ${blind} of ${wires.length} wires can be removed without failing verification`);
    console.log(`  ${''.padEnd(18)} ${wires.length} wires, each one removed is caught: ${blind === 0 ? 'yes' : 'NO (' + blind + ')'}  [${Date.now() - t0} ms]`);
  }
}

console.log('Engine behaviours:');
{
  // reversed chip power
  const part = DSD.partByKey('half/hs');
  const b = DSD.RefBuild.build(part.ref);
  const ic1 = b.parts.find((p) => p.ref === 'IC1'); ic1.rot = 180;
  const ex = DSD.Board.extract(b, true);
  const { eng } = DSD.Checks.freshEngine(b);
  ok(eng.chips.find((c) => c.ref === 'IC1').power !== 'ok', 'rotated chip must not be powered');
  // JK race-around with clock held high
  const jk = DSD.partByKey('ff/jkff'), bj = DSD.RefBuild.build(jk.ref);
  const r = DSD.Checks.freshEngine(bj);
  r.eng.setInput('IN1', 1); r.eng.setInput('IN0', 1); r.eng.setInput('PLS', 1);
  const st = r.eng.settle(), l = r.eng.leds();
  const race = st.oscillating || l.OUT1 === l.OUT0;
  ok(race, 'JK with J=K=1 and CLK held HIGH must not give a clean toggle');
  console.log('  JK clock held HIGH, J=K=1:', st.oscillating ? 'oscillates' : `Q=${l.OUT1} Q'=${l.OUT0} (race-around)`, '| rotated chip unpowered: ok');
  // dead short
  const bs = { parts: [{ id: 'w', kind: 'wire', h1: 'VCC:0', h2: 'GND:0' }] };
  ok(DSD.Board.extract(bs, true).short, 'dead short detection');
}
if (DSD.Verilog) require('./verilog_tests.js')(DSD, ok);
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL TESTS PASSED');
process.exit(fails ? 1 : 0);
