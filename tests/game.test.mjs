import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Run the real pure game modules without a browser or generated files.
const cache = new Map();
function gameModule(name) {
  if (cache.has(name)) return cache.get(name);
  const source = readFileSync(new URL('../app/game/' + name + '.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  const load = id => { if (!id.startsWith('./')) throw new Error('Unexpected import: ' + id); return gameModule(id.slice(2)); };
  runInNewContext('(function(exports, require, module) {' + code + '\n})', {})(mod.exports, load, mod);
  cache.set(name, mod.exports);
  return mod.exports;
}
const { LEVELS, findPath, isBlocked, distance, lineOfSight } = gameModule('world');
const { newGame, step, breathe, boundary, rating } = gameModule('engine');
const idle = { x: 0, y: 0, sneak: false };

for (let level = 0; level < LEVELS.length; level++) {
  const cfg = LEVELS[level];
  test(`${cfg.name}: spawn safety and reachable objectives, exits, quiet spots, and patrols`, () => {
    assert.ok(!isBlocked(cfg, cfg.start));
    for (const p of [...cfg.objectives, cfg.exit, ...cfg.quiet]) {
      assert.ok(!isBlocked(cfg, p), `Blocked destination: ${JSON.stringify(p)}`);
      assert.ok(findPath(cfg, cfg.start, p).length > 0, `No path to ${JSON.stringify(p)}`);
    }
    cfg.npcs.forEach(n => {
      assert.ok(distance(n.route[0], cfg.start) > 2.6, `${n.name} starts too close`);
      n.route.forEach((p, i) => {
        assert.ok(!isBlocked(cfg, p, .27), `${n.name} has blocked waypoint ${i}`);
        assert.ok(findPath(cfg, p, n.route[(i + 1) % n.route.length]).length, `${n.name} has unreachable waypoint ${i}`);
      });
    });
  });
  test(`${cfg.name}: NPCs remain in walkable space through two minutes of patrol`, () => {
    const s = newGame(level); s.mode = 'playing';
    for (let t = 0; t < 120 * 30; t++) {
      step(s, idle, 1 / 30);
      s.npcs.forEach((n, i) => assert.ok(!isBlocked(cfg, n.pos, .26), `${cfg.npcs[i].name} entered an obstacle`));
    }
    assert.ok(s.npcs.every((n, i) => distance(n.pos, cfg.npcs[i].route[0]) > .01), 'Every NPC should be able to leave its start');
  });
  test(`${cfg.name}: complete actual route using movement and normal abilities`, () => {
    const s = newGame(level); s.mode = 'playing';
    for (const target of [...cfg.objectives, cfg.exit]) {
      const path = findPath(cfg, s.player, target);
      for (const point of path) {
        let frames = 0;
        while (distance(s.player, point) > .12 && s.mode === 'playing' && frames++ < 240) {
          const dx = point.x - s.player.x, dz = point.z - s.player.z, len = Math.hypot(dx, dz);
          if (s.pressure > 25) breathe(s);
          if (s.npcs.some(n => n.notice > .6 && distance(n.pos, s.player) < 2.5)) boundary(s);
          step(s, { x: (dx - dz) * Math.SQRT1_2 / len, y: (dx + dz) * Math.SQRT1_2 / len, sneak: false }, 1 / 60);
        }
        assert.ok(frames < 240, `Stuck at ${JSON.stringify(point)}`);
      }
    }
    assert.equal(s.mode, 'won'); assert.equal(s.collected.length, cfg.objectives.length);
  });
}
test('pause freezes all gameplay; breath is charged once and cooldown is enforced', () => {
  const s = newGame(); s.mode = 'playing'; s.pressure = 60;
  assert.equal(breathe(s), true); assert.equal(s.pressure, 32); assert.equal(breathe(s), false);
  s.mode = 'paused'; const before = JSON.stringify(s); step(s, {x:1,y:1,sneak:false}, .1); assert.equal(JSON.stringify(s), before);
});
test('polite boundary causes visible nearby NPCs to give space', () => {
  const s = newGame(2); s.mode = 'playing'; s.player = {x:8,z:9.5}; s.npcs[0].pos = {x:8.2,z:10};
  assert.ok(boundary(s)); assert.equal(s.npcs[0].state, 'respect'); assert.equal(s.npcs[0].cooldown, 9); assert.ok(s.bubble); assert.equal(boundary(s), false);
});
test('full pressure loses; incomplete errands do not win at the exit', () => {
  const s = newGame(1); s.mode = 'playing'; s.player = {...LEVELS[1].exit}; step(s,idle,1/60); assert.equal(s.mode,'playing');
  s.shield = 0; s.pressure = 99; s.npcs[0].pos = {...s.player}; s.npcs[0].cooldown = 0; step(s,idle,1/60); assert.equal(s.mode,'failed');
});
test('shelves block sight and diagonal input cannot increase speed', () => {
  assert.equal(lineOfSight(LEVELS[1], {x:3.5,z:4},{x:6.3,z:4}),false);
  const a=newGame(),b=newGame();a.mode=b.mode='playing';a.player={x:7,z:11};b.player={...a.player};
  const origin={...a.player};step(a,{x:1,y:0,sneak:false},.04);step(b,{x:1,y:1,sneak:false},.04);
  assert.ok(Math.abs(distance(a.player,origin)-distance(b.player,origin))<1e-6);
  assert.equal(rating(a),3);
});

