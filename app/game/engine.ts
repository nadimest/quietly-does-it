import {
  LEVELS,
  distance,
  findPath,
  isBlocked,
  lineOfSight,
  type Vec,
} from './world';

export type Mode = 'intro' | 'playing' | 'paused' | 'failed' | 'won';
export type NpcState = {
  pos: Vec;
  heading: number;
  waypoint: number;
  path: Vec[];
  rethink: number;
  wait: number;
  notice: number;
  cooldown: number;
  state: 'patrol' | 'notice' | 'approach' | 'respect';
  walked: number;
  lineIndex: number;
};
export type Bubble = { text: string; npc: number; until: number };
export type GameState = {
  level: number;
  mode: Mode;
  player: Vec;
  heading: number;
  walked: number;
  moving: boolean;
  sneaking: boolean;
  npcs: NpcState[];
  pressure: number;
  maxPressure: number;
  breath: number;
  boundary: number;
  shield: number;
  time: number;
  collected: string[];
  contacts: number;
  breaks: number;
  bubble: Bubble | null;
  message: string;
  messageTime: number;
  event: {
    id: number;
    kind: 'pickup' | 'breath' | 'boundary' | 'win' | 'fail' | 'hello';
  } | null;
  quiet: string | null;
  cozy: boolean;
};
export type Input = { x: number; y: number; sneak: boolean };

export function newGame(level = 0, cozy = false): GameState {
  const c = LEVELS[level];
  return {
    level,
    mode: 'intro',
    player: { ...c.start },
    heading: -Math.PI / 2,
    walked: 0,
    moving: false,
    sneaking: false,
    npcs: c.npcs.map((n, i) => ({
      pos: { ...n.route[0] },
      heading: Math.atan2(
        n.route[1].x - n.route[0].x,
        n.route[1].z - n.route[0].z,
      ),
      waypoint: 1,
      path: [],
      rethink: 0,
      wait: i * 0.23,
      notice: 0,
      cooldown: 0,
      state: 'patrol',
      walked: i * 0.4,
      lineIndex: 0,
    })),
    pressure: 0,
    maxPressure: 0,
    breath: 0,
    boundary: 0,
    shield: 2,
    time: 0,
    collected: [],
    contacts: 0,
    breaks: 0,
    bubble: null,
    message: 'You’re the one with mint headphones. Take it at your own pace.',
    messageTime: 6,
    event: null,
    quiet: null,
    cozy,
  };
}
export function emit(
  s: GameState,
  kind: NonNullable<GameState['event']>['kind'],
) {
  s.event = { id: (s.event?.id ?? 0) + 1, kind };
}
export function say(s: GameState, text: string, duration = 4) {
  s.message = text;
  s.messageTime = duration;
}
export function breathe(s: GameState): boolean {
  if (s.mode !== 'playing' || s.breath > 0) return false;
  s.pressure = Math.max(0, s.pressure - 28);
  s.shield = 2.6;
  s.breath = 8;
  s.breaks++;
  say(s, 'A slow breath. Shoulders down. You have time.');
  emit(s, 'breath');
  return true;
}
export function boundary(s: GameState): boolean {
  if (s.mode !== 'playing' || s.boundary > 0) return false;
  s.boundary = 6;
  s.shield = Math.max(s.shield, 1.2);
  s.npcs.forEach((n, i) => {
    if (
      distance(n.pos, s.player) < 3.4 &&
      lineOfSight(LEVELS[s.level], n.pos, s.player)
    ) {
      n.cooldown = 9;
      n.notice = 0;
      n.state = 'respect';
      n.path = [];
      n.rethink = 0;
      s.bubble = {
        text: LEVELS[s.level].npcs[i].lines[2],
        npc: i,
        until: s.time + 3.3,
      };
    }
  });
  say(s, '“Lovely to see you — I’m just on my way!”');
  emit(s, 'boundary');
  return true;
}
function slide(s: GameState, p: Vec, dx: number, dz: number, r = 0.25) {
  const c = LEVELS[s.level];
  if (!isBlocked(c, { x: p.x + dx, z: p.z }, r)) p.x += dx;
  if (!isBlocked(c, { x: p.x, z: p.z + dz }, r)) p.z += dz;
}
export function step(s: GameState, input: Input, dt: number) {
  if (s.mode !== 'playing') return;
  dt = Math.min(0.05, Math.max(0, dt));
  s.time += dt;
  s.breath = Math.max(0, s.breath - dt);
  s.boundary = Math.max(0, s.boundary - dt);
  s.shield = Math.max(0, s.shield - dt);
  s.messageTime -= dt;
  if (s.bubble && s.bubble.until < s.time) s.bubble = null;
  const cfg = LEVELS[s.level];
  // Orthographic screen directions, so the stick and arrows follow the screen.
  const length = Math.hypot(input.x, input.y),
    scale = length > 1 ? 1 / length : 1;
  const dx = (input.x + input.y) * Math.SQRT1_2 * scale,
    dz = (-input.x + input.y) * Math.SQRT1_2 * scale;
  s.moving = length > 0.08;
  s.sneaking = input.sneak;
  if (s.moving) {
    const speed = input.sneak ? 1.45 : 2.9;
    slide(s, s.player, dx * speed * dt, dz * speed * dt);
    s.heading = Math.atan2(dx, dz);
    s.walked += dt * speed * 3;
  }
  s.quiet =
    cfg.quiet.find((q) => distance(s.player, q) < q.radius)?.name ?? null;
  let proximity = 0;
  s.npcs.forEach((n, i) => {
    const person = cfg.npcs[i],
      d = distance(n.pos, s.player);
    n.cooldown = Math.max(0, n.cooldown - dt);
    n.wait = Math.max(0, n.wait - dt);
    n.rethink -= dt;
    const visible =
      d < person.awareness * (s.sneaking ? 0.65 : 1) &&
      lineOfSight(cfg, n.pos, s.player);
    const facing =
      ((s.player.x - n.pos.x) * Math.sin(n.heading) +
        (s.player.z - n.pos.z) * Math.cos(n.heading)) /
        Math.max(0.01, d) >
      -0.15;
    if (
      visible &&
      (facing || d < 1.1) &&
      n.cooldown === 0 &&
      !s.quiet &&
      s.shield === 0
    )
      n.notice = Math.min(1, n.notice + dt * (s.level === 2 ? 0.7 : 0.47));
    else n.notice = Math.max(0, n.notice - dt * 0.65);
    n.state =
      n.cooldown > 0
        ? 'respect'
        : n.notice >= 0.95
          ? 'approach'
          : n.notice > 0.15
            ? 'notice'
            : 'patrol';
    // Short approaches, never permanent pursuit; joggers and readers stay on their routes.
    const canApproach =
      s.level > 0 && !['headphones', 'beanie'].includes(person.style);
    if (n.state === 'approach' && !canApproach) n.state = 'notice';
    if (
      d < 1.25 &&
      n.cooldown === 0 &&
      s.shield === 0 &&
      !s.quiet &&
      lineOfSight(cfg, n.pos, s.player)
    ) {
      proximity += (1.25 - d) * (s.level === 2 ? 25 : 19);
      if (d < 0.8) {
        s.contacts++;
        s.pressure += s.cozy ? 8 : 15;
        n.cooldown = 5;
        n.notice = 0;
        n.path = [];
        n.rethink = 0;
        s.bubble = {
          text: person.lines[n.lineIndex++ % 2],
          npc: i,
          until: s.time + 3.4,
        };
        emit(s, 'hello');
        say(
          s,
          'A small hello. No disaster. Make a little room when you’re ready.',
        );
      }
    }
    const target = n.state === 'approach' ? s.player : person.route[n.waypoint];
    if (distance(n.pos, target) < 0.3) {
      if (n.state !== 'approach') {
        n.waypoint = (n.waypoint + 1) % person.route.length;
        n.wait = person.style === 'cap' ? 0.5 : 1.5 + (i % 3);
        n.path = [];
      }
    }
    if (n.rethink <= 0) {
      n.path = findPath(cfg, n.pos, target);
      n.rethink = n.state === 'approach' ? 0.9 : 2.5;
    }
    if (n.path.length && n.wait <= 0) {
      const next = n.path[0],
        pd = distance(n.pos, next);
      if (pd < 0.1) n.path.shift();
      else {
        let mx = (next.x - n.pos.x) / pd,
          mz = (next.z - n.pos.z) / pd;
        // Local separation prevents all characters collapsing into a single pile.
        s.npcs.forEach((other, j) => {
          const od = distance(n.pos, other.pos);
          if (i !== j && od > 0.01 && od < 0.65) {
            mx += ((n.pos.x - other.pos.x) / od) * 0.85;
            mz += ((n.pos.z - other.pos.z) / od) * 0.85;
          }
        });
        const ml = Math.max(1, Math.hypot(mx, mz)),
          speed = person.speed * (s.cozy ? 0.8 : 1);
        slide(s, n.pos, (mx / ml) * speed * dt, (mz / ml) * speed * dt, 0.27);
        n.heading = Math.atan2(mx, mz);
        n.walked += dt * speed * 5;
      }
    }
  });
  if (s.shield === 0 && !s.quiet)
    s.pressure += proximity * dt * (s.cozy ? 0.5 : 1);
  if (s.quiet || s.shield > 0 || proximity === 0)
    s.pressure -= dt * (s.quiet ? 18 : s.shield > 0 ? 8 : 5);
  s.pressure = Math.max(0, Math.min(100, s.pressure));
  s.maxPressure = Math.max(s.maxPressure, s.pressure);
  for (const objective of cfg.objectives) {
    if (
      !s.collected.includes(objective.id) &&
      distance(s.player, objective) < 0.75
    ) {
      s.collected.push(objective.id);
      say(s, objective.detail);
      emit(s, 'pickup');
    }
  }
  if (s.pressure >= 100) {
    s.mode = 'failed';
    emit(s, 'fail');
    return;
  }
  if (distance(s.player, cfg.exit) < 0.8) {
    if (s.collected.length === cfg.objectives.length) {
      s.mode = 'won';
      emit(s, 'win');
    } else
      say(
        s,
        `${cfg.objectives.length - s.collected.length} thing${cfg.objectives.length - s.collected.length === 1 ? '' : 's'} left before a graceful exit.`,
        1,
      );
  }
}
export const rating = (s: GameState) =>
  1 + Number(s.maxPressure < 70) + Number(s.contacts < 3);
export function snapshot(s: GameState) {
  const nearest = s.npcs
    .map((n, i) => ({
      ...LEVELS[s.level].npcs[i],
      distance: distance(n.pos, s.player),
      state: n.state,
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  return {
    level: s.level,
    mode: s.mode,
    pressure: Math.round(s.pressure),
    breath: Math.ceil(s.breath),
    boundary: Math.ceil(s.boundary),
    time: Math.floor(s.time),
    collected: [...s.collected],
    contacts: s.contacts,
    breaks: s.breaks,
    maxPressure: s.maxPressure,
    player: { ...s.player },
    people: s.npcs.map((n) => ({ ...n.pos })),
    nearby:
      nearest && nearest.distance < 4
        ? {
            name: nearest.name,
            role: nearest.role,
            color: nearest.color,
            state: nearest.state,
          }
        : null,
    quiet: s.quiet,
    message: s.messageTime > 0 ? s.message : LEVELS[s.level].tip,
    stars: rating(s),
    cozy: s.cozy,
  };
}
export type Snapshot = ReturnType<typeof snapshot>;
