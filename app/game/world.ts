export type Vec = { x: number; z: number };
export type Prop = Vec & {
  kind: string;
  w: number;
  d: number;
  rotation?: number;
  solid?: boolean;
};
export type Person = {
  name: string;
  role: string;
  color: string;
  skin: string;
  hair: string;
  style: 'beanie' | 'cap' | 'bun' | 'glasses' | 'bald' | 'headphones';
  speed: number;
  awareness: number;
  route: Vec[];
  lines: string[];
};
export type Objective = Vec & {
  id: string;
  name: string;
  detail: string;
  kind: string;
};
export type Level = {
  name: string;
  subtitle: string;
  description: string;
  color: string;
  floor: string;
  background: string;
  start: Vec;
  exit: Vec;
  exitName: string;
  props: Prop[];
  quiet: (Vec & { name: string; radius: number })[];
  objectives: Objective[];
  npcs: Person[];
  tip: string;
  ending: string;
};
const v = (x: number, z: number): Vec => ({ x, z });
const prop = (
  kind: string,
  x: number,
  z: number,
  w = 1,
  d = 1,
  solid = true,
): Prop => ({ kind, x, z, w, d, solid });
function person(
  name: string,
  role: string,
  style: Person['style'],
  color: string,
  route: Vec[],
  lines: string[],
  speed = 0.8,
  awareness = 2.5,
): Person {
  const i = name.length % 4;
  return {
    name,
    role,
    style,
    color,
    route,
    lines,
    speed,
    awareness,
    skin: ['#a86a43', '#efc39d', '#70462f', '#d79b70'][i],
    hair: ['#342b32', '#9a5d3c', '#efe1bc', '#46352d'][i],
  };
}
export const LEVELS: Level[] = [
  {
    name: 'A walk in the park',
    subtitle: '01 / THE GREAT OUTSIDE',
    description:
      'Just you, the trees, and an entirely reasonable desire to sit quietly.',
    color: '#8fd6a2',
    floor: '#91b67f',
    background: '#dce9db',
    start: v(2, 11.6),
    exit: v(13.5, 2.8),
    exitName: 'The quiet bench',
    props: [
      prop('tree', 2, 2, 1.2, 1.2),
      prop('tree', 5.3, 1.8, 1.2, 1.2),
      prop('tree', 1.2, 6, 1.2, 1.2),
      prop('tree', 14.5, 10.8, 1.3, 1.3),
      prop('tree', 11.9, 12, 1.2, 1.2),
      prop('pond', 7.6, 6.8, 3.4, 2.8),
      prop('bench', 13.5, 1.7, 2.2, 0.7),
      prop('bench', 3.4, 7.2, 2.1, 0.7),
      prop('planter', 11, 2, 1.1, 1.1),
      prop('bin', 5, 11.3, 0.6, 0.6),
      prop('lamp', 5.6, 4, 0.4, 0.4),
      prop('lamp', 11.7, 8.9, 0.4, 0.4),
      prop('flowers', 4, 3, 1.6, 0.8, false),
      prop('flowers', 12.8, 11.7, 1.8, 0.6, false),
      prop('sign', 1.4, 10.4, 0.4, 0.4),
    ],
    quiet: [{ ...v(3.3, 6), name: 'A little shade', radius: 1.1 }],
    objectives: [],
    npcs: [
      person(
        'Rosa',
        'Neighbour · stops to chat',
        'bun',
        '#e2a256',
        [v(5, 9.8), v(6.1, 9.8), v(6, 11.7)],
        [
          'Oh! Lovely to see you.',
          'The ducks have opinions today.',
          'No rush. Enjoy your walk.',
        ],
        0.65,
      ),
      person(
        'Theo',
        'Jogger · follows the path',
        'cap',
        '#f17862',
        [v(10.3, 4), v(13, 6), v(10.3, 9.2), v(5, 9), v(4.5, 4.4)],
        [
          'Morning! On your left.',
          'Only twelve more laps. Allegedly.',
          'Taking the scenic route?',
        ],
        1.25,
        1.8,
      ),
      person(
        'Mina',
        'Reader · happy in her own world',
        'glasses',
        '#7476b5',
        [v(10.5, 10.7), v(9, 11)],
        [
          'This chapter is excellent.',
          'Quiet company is good company.',
          'I was just leaving, too.',
        ],
        0.5,
        1.7,
      ),
      person(
        'Arthur',
        'Birdwatcher · easily distracted',
        'beanie',
        '#518b8c',
        [v(9.7, 3), v(8.5, 2), v(7.7, 4)],
        [
          'Was that a warbler?',
          'Even the pigeons look busy.',
          'Lovely day for a bit of quiet.',
        ],
        0.6,
        2.2,
      ),
    ],
    tip: 'People notice you gradually. Soft circles show their personal space. Trees and furniture block their view.',
    ending:
      'The bench has no follow-up questions. A perfect conversationalist.',
  },
  {
    name: 'The small errand',
    subtitle: '02 / THE SUPERMARKET',
    description:
      'Three things on the list. You have rehearsed “no bag, thanks” exactly enough.',
    color: '#eac470',
    floor: '#dedacc',
    background: '#eee4d2',
    start: v(2, 11.8),
    exit: v(13.5, 11.2),
    exitName: 'Self-checkout',
    props: [
      prop('shelf', 4.7, 4.9, 1.3, 4.2),
      prop('shelf', 8, 4.9, 1.3, 4.2),
      prop('shelf', 11.3, 4.9, 1.3, 4.2),
      prop('produce', 3.1, 9.1, 2, 1.1),
      prop('freezer', 2.6, 1.1, 3.8, 0.8),
      prop('freezer', 8, 1.1, 3.8, 0.8),
      prop('checkout', 13.5, 9.4, 1.4, 1.1),
      prop('checkout', 10.3, 11.5, 1.3, 1),
      prop('plant', 14.5, 1.2, 0.7, 0.7),
      prop('cart', 1, 9.7, 0.6, 1),
      prop('sign', 6, 10.7, 0.4, 0.4),
    ],
    quiet: [
      { ...v(1.7, 5.8), name: 'The very quiet freezer aisle', radius: 1.05 },
    ],
    objectives: [
      {
        ...v(2.8, 2.4),
        id: 'milk',
        name: 'Oat milk',
        detail: 'One carton. No brand debate.',
        kind: 'milk',
      },
      {
        ...v(6.3, 4.3),
        id: 'bread',
        name: 'Bread',
        detail: 'A loaf with no small talk.',
        kind: 'bread',
      },
      {
        ...v(3.1, 10.5),
        id: 'apples',
        name: 'Apples',
        detail: 'An apple a day. A quiet aisle, ideally.',
        kind: 'apple',
      },
    ],
    npcs: [
      person(
        'Jules',
        'Shopper · browsing the shelves',
        'beanie',
        '#d49b4b',
        [v(6.3, 7), v(6.3, 2.2), v(9.5, 2.2), v(9.5, 7.8)],
        [
          'Do you know where the tahini is?',
          'They moved the tea. Again.',
          'Thanks! Have a peaceful shop.',
        ],
        0.8,
        2.3,
      ),
      person(
        'Bea',
        'Neighbour · recognises your face',
        'bun',
        '#ab71a2',
        [v(8.1, 9.2), v(6.2, 11.7), v(7, 8.4)],
        [
          'Fancy seeing you here!',
          'A very exciting day for bread.',
          'I’ll let you get on.',
        ],
        0.8,
        2.8,
      ),
      person(
        'Sam',
        'Staff · genuinely wants to help',
        'cap',
        '#4f9690',
        [v(13.4, 3), v(13.4, 7), v(12.7, 8)],
        [
          'Finding everything okay?',
          'Self-checkout is just over there.',
          'No worries. Take your time.',
        ],
        0.75,
        2.6,
      ),
      person(
        'Anika',
        'Shopper · checking a very long list',
        'glasses',
        '#6386b6',
        [v(9.6, 5.7), v(9.6, 8.4), v(6.3, 8.4)],
        [
          'Was it baking soda or powder?',
          'I came for one thing.',
          'A list is a beautiful boundary.',
        ],
        0.65,
        1.9,
      ),
      person(
        'Leo',
        'Shopper · in a mild hurry',
        'headphones',
        '#c57658',
        [v(4.6, 12), v(8.5, 12), v(8.5, 9.8)],
        [
          'Excuse me, just slipping past.',
          'Forgot the actual dinner.',
          'After you!',
        ],
        1,
        1.8,
      ),
    ],
    tip: 'Shelves block sight. Collect the glowing groceries in any order, then use self-checkout. E gives a polite “just passing!”',
    ending:
      'All three things. No bonus commitments. Receipt responsibly recycled.',
  },
  {
    name: 'A brief appearance',
    subtitle: '03 / THE PARTY',
    description:
      'Bring a gift. Find a little fresh air. An excellent evening has many definitions.',
    color: '#c1a1ec',
    floor: '#bc9278',
    background: '#ded5e9',
    start: v(2, 11.7),
    exit: v(14, 2.1),
    exitName: 'The balcony',
    props: [
      prop('sofa', 4.5, 4.9, 3, 1),
      prop('sofa', 1.6, 4, 1, 2.5),
      prop('coffee', 4, 2.9, 1.8, 1.1),
      prop('rug', 4.3, 4, 5.5, 4.8, false),
      prop('buffet', 8.1, 1.2, 3.5, 0.9),
      prop('giftTable', 11.4, 10.8, 2, 1.1),
      prop('speaker', 6.3, 1.3, 0.6, 0.6),
      prop('speaker', 10.4, 1.3, 0.6, 0.6),
      prop('plant', 14.7, 6.8, 0.8, 0.8),
      prop('plant', 6.5, 11.8, 0.8, 0.8),
      prop('lamp', 1.3, 1.3, 0.4, 0.4),
      prop('table', 10.5, 5, 1.2, 1.2),
      prop('table', 4.1, 9, 1.2, 1.2),
      prop('balcony', 14, 1.5, 2.8, 2.7, false),
      prop('balloons', 13.8, 12, 0.3, 0.3, false),
    ],
    quiet: [
      { ...v(2.3, 7), name: 'The plant appreciation corner', radius: 1.1 },
    ],
    objectives: [
      {
        ...v(11.4, 9.3),
        id: 'gift',
        name: 'Drop off your gift',
        detail: 'A thoughtful gift, thoughtfully delivered.',
        kind: 'gift',
      },
    ],
    npcs: [
      person(
        'Iris',
        'Host · gives excellent welcomes',
        'bun',
        '#d17191',
        [v(8.2, 10), v(10, 8.1), v(12.8, 8)],
        [
          'You made it! I’m so glad.',
          'Thank you for coming. Really.',
          'The balcony is lovely tonight.',
        ],
        0.9,
        2.9,
      ),
      person(
        'Omar',
        'Connector · knows absolutely everyone',
        'glasses',
        '#d0a055',
        [v(7.1, 6.5), v(9, 7), v(7.7, 8.5)],
        [
          'Have you met… oh, one moment!',
          'We should all do brunch.',
          'Of course. Enjoy your evening.',
        ],
        0.85,
        3.1,
      ),
      person(
        'Liv',
        'Dancer · follows the music',
        'headphones',
        '#6c9da4',
        [v(8, 3.3), v(9.2, 3.2), v(8.8, 4.7)],
        [
          'This song is a very good song.',
          'No dancing obligation!',
          'I’ll be right here. Dancing.',
        ],
        1,
        1.9,
      ),
      person(
        'Noah',
        'Storyteller · one more thing',
        'bald',
        '#7d83ba',
        [v(5.4, 6.7), v(5.4, 8), v(6.5, 7.3)],
        [
          'Long story short… well, medium.',
          'Anyway, that’s how I met the cat.',
          'We can pick this up another time.',
        ],
        0.7,
        2.7,
      ),
      person(
        'Freya',
        'Guest · also taking a breather',
        'beanie',
        '#758d6a',
        [v(12.6, 3.5), v(12.5, 5.5)],
        [
          'The balcony? Excellent choice.',
          'Silence is very underrated.',
          'I get it. Enjoy the fresh air.',
        ],
        0.65,
        1.8,
      ),
      person(
        'Max',
        'Food critic · inspecting the snacks',
        'cap',
        '#c97b59',
        [v(7, 2.6), v(10.1, 2.6), v(11.5, 3.2)],
        [
          'These tiny pastries are serious.',
          'The dip has a backstory.',
          'I’ll save you a good one.',
        ],
        0.65,
        2.2,
      ),
      person(
        'Ada',
        'Old friend · a warm hello',
        'glasses',
        '#aa7094',
        [v(3.2, 2), v(5.5, 2), v(5.7, 3.7)],
        [
          'A small party, they said.',
          'You look like you found the exit.',
          'Always lovely, even briefly.',
        ],
        0.7,
        2.3,
      ),
    ],
    tip: 'Minglers approach only after noticing you. A polite boundary sends them back to their evening. The quiet corner helps you recover.',
    ending:
      'Gift delivered. Fresh air acquired. You showed up in a way that worked for you.',
  },
];

export const WORLD = { w: 16, d: 14 };
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.z - b.z);
export function isBlocked(level: Level, p: Vec, radius = 0.25): boolean {
  if (
    p.x < 0.5 + radius ||
    p.z < 0.5 + radius ||
    p.x > WORLD.w - 0.5 - radius ||
    p.z > WORLD.d - 0.5 - radius
  )
    return true;
  return level.props.some(
    (o) =>
      o.solid !== false &&
      Math.abs(p.x - o.x) < o.w / 2 + radius &&
      Math.abs(p.z - o.z) < o.d / 2 + radius,
  );
}
export function lineOfSight(level: Level, a: Vec, b: Vec): boolean {
  const steps = Math.ceil(distance(a, b) * 5);
  for (let i = 1; i < steps; i++)
    if (
      isBlocked(
        level,
        {
          x: a.x + ((b.x - a.x) * i) / steps,
          z: a.z + ((b.z - a.z) * i) / steps,
        },
        0.04,
      )
    )
      return false;
  return true;
}

// Half-metre navigation grid. Both patrol and approach routes use the same collision map.
export function findPath(level: Level, from: Vec, to: Vec): Vec[] {
  const cell = 0.5,
    cols = 33,
    key = (x: number, z: number) => z * cols + x;
  // An exact destination can be clear while its rounded grid cell is inside a prop.
  // Snap to the nearest clear cell, then finish at the actual destination when possible.
  const snap = (p: Vec) => {
    const x = Math.round(p.x / cell),
      z = Math.round(p.z / cell);
    const candidates: { x: number; z: number }[] = [];
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++) {
        if (!isBlocked(level, { x: (x + dx) * cell, z: (z + dz) * cell }, 0.27))
          candidates.push({ x: x + dx, z: z + dz });
      }
    candidates.sort(
      (a, b) =>
        distance({ x: a.x * cell, z: a.z * cell }, p) -
        distance({ x: b.x * cell, z: b.z * cell }, p),
    );
    return candidates[0] ?? { x, z };
  };
  const { x: sx, z: sz } = snap(from),
    { x: tx, z: tz } = snap(to);
  const start = key(sx, sz),
    goal = key(tx, tz),
    open = [start],
    parent = new Map<number, number>(),
    cost = new Map([[start, 0]]);
  const point = (id: number) => ({
    x: (id % cols) * cell,
    z: Math.floor(id / cols) * cell,
  });
  let found = false,
    iterations = 0;
  while (open.length && iterations++ < 1100) {
    open.sort(
      (a, b) =>
        cost.get(a)! +
        distance(point(a), to) -
        (cost.get(b)! + distance(point(b), to)),
    );
    const current = open.shift()!;
    if (current === goal) {
      found = true;
      break;
    }
    const p = point(current);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: p.x + dx * cell, z: p.z + dz * cell };
      if (isBlocked(level, n, 0.27)) continue;
      const id = key(Math.round(n.x / cell), Math.round(n.z / cell)),
        g = cost.get(current)! + cell;
      if (g < (cost.get(id) ?? Infinity)) {
        parent.set(id, current);
        cost.set(id, g);
        if (!open.includes(id)) open.push(id);
      }
    }
  }
  if (!found) return [];
  const path: Vec[] = [];
  let k = goal;
  while (k !== start) {
    path.unshift(point(k));
    k = parent.get(k)!;
  }
  const end = path[path.length - 1] ?? from;
  const steps = Math.max(1, Math.ceil(distance(end, to) * 10));
  const clearFinish = Array.from({ length: steps }, (_, i) => ({
    x: end.x + ((to.x - end.x) * (i + 1)) / steps,
    z: end.z + ((to.z - end.z) * (i + 1)) / steps,
  })).every((p) => !isBlocked(level, p, 0.27));
  if (clearFinish) path.push({ ...to });
  return path;
}
