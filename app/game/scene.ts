import * as THREE from 'three';
import { LEVELS, distance, type Person, type Prop } from './world';
import type { GameState } from './engine';

type Avatar = {
  root: THREE.Group;
  body: THREE.Group;
  arms: THREE.Group[];
  legs: THREE.Group[];
  halo: THREE.Mesh;
  notice: THREE.Mesh;
  label: THREE.Sprite;
};
export class Diorama {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-12, 12, 10, -10, 0.1, 100);
  world = new THREE.Group();
  avatars: Avatar[] = [];
  player!: Avatar;
  markers: { id: string; root: THREE.Group }[] = [];
  exit!: THREE.Group;
  materials = new Map<string, THREE.MeshStandardMaterial>();
  observer: ResizeObserver;
  currentLevel = -1;
  width = 1;
  height = 1;
  zoom = 1;
  center = new THREE.Vector3(8, 0, 7);
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  bubbleAnchor = { x: 0, y: 0 };
  constructor(public container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.domElement.setAttribute(
      'aria-label',
      '3D isometric game. Move with arrow keys or the touch joystick.',
    );
    this.renderer.domElement.setAttribute('role', 'img');
    container.appendChild(this.renderer.domElement);
    this.scene.add(this.world);
    const hemisphere = new THREE.HemisphereLight('#fff6df', '#728986', 2.4);
    const sun = new THREE.DirectionalLight('#fff1d4', 3.5);
    sun.position.set(-7, 22, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.bias = -0.001;
    sun.shadow.normalBias = 0.06;
    sun.target.position.set(8, 0, 7);
    this.scene.add(hemisphere, sun, sun.target);
    const fill = new THREE.DirectionalLight('#d8e5ff', 1);
    fill.position.set(15, 8, -12);
    this.scene.add(fill);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
  }
  material(color: string, roughness = 0.85) {
    const key = color + roughness;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness, flatShading: true }),
      );
    return this.materials.get(key)!;
  }
  mesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    color: string,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const m = new THREE.Mesh(geometry, this.material(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  box(
    parent: THREE.Object3D,
    color: string,
    w: number,
    h: number,
    d: number,
    x = 0,
    y = h / 2,
    z = 0,
  ) {
    return this.mesh(parent, new THREE.BoxGeometry(w, h, d), color, x, y, z);
  }
  ball(
    parent: THREE.Object3D,
    color: string,
    r: number,
    x = 0,
    y = 0,
    z = 0,
    detail = 1,
  ) {
    return this.mesh(
      parent,
      new THREE.IcosahedronGeometry(r, detail),
      color,
      x,
      y,
      z,
    );
  }
  cylinder(
    parent: THREE.Object3D,
    color: string,
    r: number,
    h: number,
    x = 0,
    y = h / 2,
    z = 0,
    top = r,
    segments = 12,
  ) {
    return this.mesh(
      parent,
      new THREE.CylinderGeometry(top, r, h, segments),
      color,
      x,
      y,
      z,
    );
  }
  ring(
    parent: THREE.Object3D,
    color: string,
    radius: number,
    thickness = 0.04,
  ) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const m = new THREE.Mesh(
      new THREE.RingGeometry(radius - thickness, radius, 48),
      material,
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.04;
    parent.add(m);
    return m;
  }
  text(
    parent: THREE.Object3D,
    text: string,
    color: string,
    x: number,
    y: number,
    z: number,
    size = 0.7,
    background = '#203b36',
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = background;
    ctx.beginPath();
    ctx.roundRect(4, 4, 504, 120, 28);
    ctx.fill();
    ctx.font = '600 45px Arial';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 65, 470);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map, depthTest: false, transparent: true }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.set(size * 4, size, 1);
    parent.add(sprite);
    return sprite;
  }
  resize() {
    this.width = Math.max(1, this.container.clientWidth);
    this.height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(this.width, this.height);
    this.updateCamera();
  }
  updateCamera(player?: GameState['player']) {
    const aspect = this.width / this.height;
    const half = Math.max(9.2, 12 / aspect) / this.zoom;
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    const target =
      player && this.zoom > 1.1
        ? new THREE.Vector3(player.x, 0.3, player.z)
        : new THREE.Vector3(8, 0.1, 7);
    this.center.lerp(target, 0.06);
    this.camera.position.copy(this.center).add(new THREE.Vector3(22, 27, 22));
    this.camera.lookAt(this.center);
    this.camera.updateProjectionMatrix();
  }
  clearWorld() {
    this.world.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
      if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: THREE.Material & { map?: THREE.Texture | null }) => {
          m.map?.dispose();
          m.dispose();
        });
      }
    });
    this.world.clear();
    this.materials.clear();
    this.avatars = [];
    this.markers = [];
  }
  load(level: number) {
    this.clearWorld();
    this.currentLevel = level;
    this.center.set(8, 0, 7);
    const c = LEVELS[level];
    this.scene.background = new THREE.Color(c.background);
    this.box(
      this.world,
      level === 2 ? '#806657' : '#73816d',
      16.2,
      0.6,
      14.2,
      8,
      -0.42,
      7,
    );
    this.box(this.world, c.floor, 16, 0.15, 14, 8, -0.08, 7);
    // Raised miniature on a softly shadowed tabletop.
    this.box(this.world, c.background, 150, 0.2, 150, 8, -0.87, 7);
    if (level === 0) {
      const path = '#d9c49b';
      this.box(this.world, path, 2.1, 0.015, 11, 4.1, 0.015, 6.6);
      this.box(this.world, path, 10.2, 0.018, 1.7, 8.2, 0.016, 9.1);
      this.box(this.world, path, 1.8, 0.016, 8, 12.3, 0.017, 5.9);
      this.box(this.world, path, 9.1, 0.02, 1.5, 8, 0.018, 3.5);
      for (let i = 0; i < 42; i++) {
        const x = 0.9 + ((i * 17) % 140) / 10,
          z = 0.8 + ((i * 31) % 120) / 10;
        if (
          Math.abs(x - 4) < 1.2 ||
          Math.abs(z - 9) < 1 ||
          Math.abs(x - 12.3) < 1 ||
          Math.abs(z - 3.5) < 0.8
        )
          continue;
        this.box(
          this.world,
          '#719960',
          0.035,
          0.13,
          0.04,
          x,
          0.07,
          z,
        ).rotation.z = 0.2;
      }
      // Low fence on the far edges keeps the whole playable space visible.
      for (let x = 0.5; x < 16; x += 1.2)
        this.box(this.world, '#e1debc', 0.1, 0.65, 0.1, x, 0.32, 0.28);
      this.box(this.world, '#e1debc', 15, 0.09, 0.08, 8, 0.5, 0.28);
      for (const [x, z] of [
        [7, 6.6],
        [8.4, 7.1],
      ]) {
        const duck = new THREE.Group();
        duck.position.set(x, 0.1, z);
        this.ball(duck, '#f3e5b8', 0.18, 0, 0.12, 0);
        this.ball(duck, '#386b5b', 0.1, 0.13, 0.27, 0);
        this.box(duck, '#efa844', 0.12, 0.05, 0.08, 0.22, 0.25, 0);
        this.world.add(duck);
      }
    } else if (level === 1) {
      for (let x = 0; x < 16; x++)
        for (let z = 0; z < 14; z++)
          if ((x + z) % 2 === 0)
            this.box(
              this.world,
              '#ede9dd',
              0.985,
              0.012,
              0.985,
              x + 0.5,
              0.01,
              z + 0.5,
            );
      this.box(this.world, '#6c9c93', 16, 1.7, 0.14, 8, 0.85, 0.12);
      this.box(this.world, '#efd89f', 16, 0.14, 0.18, 8, 1.55, 0.12);
      this.text(
        this.world,
        'GOOD DAY GROCER',
        '#ffffff',
        8,
        2.25,
        0.2,
        0.6,
        '#3d786c',
      );
      this.box(this.world, '#7c9286', 3.1, 0.02, 1.1, 2, 0.018, 12.4);
    } else {
      for (let x = 0; x < 16; x += 0.8)
        this.box(
          this.world,
          x % 1.6 < 0.1 ? '#bd947d' : '#c99e80',
          0.77,
          0.015,
          14,
          x + 0.4,
          0.01,
          7,
        );
      this.box(this.world, '#baaaa8', 12, 1.7, 0.15, 6, 0.85, 0.1);
      // Garland with little warm bulbs, and framed prints.
      for (let i = 0; i < 13; i++) {
        const x = 0.8 + i * 0.9;
        this.ball(
          this.world,
          i % 2 ? '#ffdc97' : '#d29bc0',
          0.07,
          x,
          2.45 - Math.sin((i / 12) * Math.PI) * 0.35,
          0.16,
        );
      }
      for (const x of [2.5, 4.7]) {
        this.box(this.world, '#785e51', 1.2, 1.15, 0.08, x, 1.15, 0.24);
        this.box(
          this.world,
          x === 2.5 ? '#cf997d' : '#839b87',
          1.04,
          0.99,
          0.09,
          x,
          1.15,
          0.3,
        );
        this.cylinder(
          this.world,
          '#ebcc9d',
          0.27,
          0.025,
          x,
          1.25,
          0.37,
        ).rotation.x = Math.PI / 2;
      }
    }
    c.props.forEach((p) => this.buildProp(p));
    c.quiet.forEach((q) => {
      const g = new THREE.Group();
      g.position.set(q.x, 0, q.z);
      this.ring(g, '#73e3c0', q.radius, 0.065);
      this.text(g, 'QUIET SPOT', '#c8f5e3', 0, 0.25, 0, 0.28);
      this.world.add(g);
    });
    c.objectives.forEach((o) => {
      const root = new THREE.Group();
      root.position.set(o.x, 0.4, o.z);
      this.ring(root, '#ffe5a0', 0.48, 0.07);
      const shape = new THREE.Group();
      shape.position.y = 0.4;
      root.add(shape);
      this.item(shape, o.kind);
      this.text(
        root,
        o.name.toUpperCase(),
        '#fff4cf',
        0,
        1.3,
        0,
        0.25,
        '#80633f',
      );
      this.world.add(root);
      this.markers.push({ id: o.id, root });
    });
    this.exit = new THREE.Group();
    this.exit.position.set(c.exit.x, 0.04, c.exit.z);
    this.ring(this.exit, '#effed8', 0.78, 0.09);
    this.text(
      this.exit,
      level === 0 ? 'QUIET BENCH' : level === 1 ? 'CHECKOUT' : 'BALCONY',
      '#f4ffe3',
      0,
      0.35,
      0,
      0.3,
    );
    this.world.add(this.exit);
    this.avatars = c.npcs.map((n) => this.avatar(n));
    this.player = this.avatar(
      {
        name: 'YOU',
        role: '',
        style: 'headphones',
        color: '#294953',
        skin: '#d99e73',
        hair: '#3b2e32',
        speed: 0,
        awareness: 0,
        route: [],
        lines: [],
      },
      true,
    );
  }
  item(g: THREE.Group, kind: string) {
    if (kind === 'milk') {
      this.box(g, '#f6edd3', 0.28, 0.4, 0.24);
      this.box(g, '#79b7a4', 0.285, 0.14, 0.245, 0, 0.22);
      this.cylinder(g, '#f9faf0', 0.05, 0.05, 0.07, 0.43);
    }
    if (kind === 'bread') {
      const m = this.ball(g, '#d9a251', 0.25, 0, 0.2);
      m.scale.set(1, 0.75, 0.65);
      for (let i = -1; i <= 1; i++)
        this.box(g, '#f0c882', 0.035, 0.02, 0.22, i * 0.1, 0.36);
    }
    if (kind === 'apple') {
      this.ball(g, '#d66e56', 0.2, 0, 0.17);
      this.box(g, '#614b36', 0.03, 0.1, 0.03, 0, 0.37);
      this.ball(g, '#698547', 0.07, 0.06, 0.37);
    }
    if (kind === 'gift') {
      this.box(g, '#dd9b88', 0.45, 0.4, 0.4);
      this.box(g, '#f6d391', 0.08, 0.405, 0.405);
      this.box(g, '#f6d391', 0.46, 0.06, 0.41, 0, 0.39);
      this.ball(g, '#f6d391', 0.08, -0.08, 0.48);
      this.ball(g, '#f6d391', 0.08, 0.08, 0.48);
    }
  }
  buildProp(p: Prop) {
    const g = new THREE.Group();
    g.position.set(p.x, 0, p.z);
    this.world.add(g);
    const wood = '#a4774e',
      metal = '#394e4b';
    if (p.kind === 'tree') {
      this.cylinder(g, '#866147', 0.16, 1.5, 0, 0.75, 0, 0.11);
      const limb = this.cylinder(g, '#866147', 0.065, 0.7, -0.16, 1.3);
      limb.rotation.z = 0.65;
      for (const [x, y, z, r] of [
        [0, 2.2, 0, 0.88],
        [-0.45, 1.8, 0.18, 0.63],
        [0.5, 1.9, -0.13, 0.7],
        [0.1, 2.65, 0.1, 0.58],
      ])
        this.ball(
          g,
          y > 2.2 ? '#8aaa66' : x < 0 ? '#597f55' : '#6d965c',
          r,
          x,
          y,
          z,
        );
    } else if (p.kind === 'pond') {
      const rim = this.cylinder(g, '#b1ac86', 1, 0.09);
      rim.scale.set(p.w / 1.85, 1, p.d / 1.8);
      const water = this.cylinder(g, '#74b6b9', 1, 0.04, 0, 0.09);
      water.scale.set(p.w / 2, 1, p.d / 2);
      water.material = this.material('#74b6b9', 0.2);
      for (let i = 0; i < 5; i++) {
        const stone = this.ball(
          g,
          '#c6c5a9',
          0.23,
          Math.sin(i * 1.5) * 1.72,
          0.09,
          Math.cos(i * 1.5) * 1.35,
        );
        stone.scale.y = 0.5;
      }
      this.cylinder(g, '#658b6c', 0.21, 0.02, -0.7, 0.13, 0.55);
      this.ball(g, '#efd7bb', 0.08, -0.7, 0.16, 0.55);
    } else if (p.kind === 'bench') {
      for (const x of [-0.78, 0.78]) {
        this.box(g, metal, 0.09, 0.48, 0.5, x, 0.24);
        this.box(g, metal, 0.08, 0.8, 0.07, x, 0.45, -0.24);
      }
      for (let i = 0; i < 4; i++)
        this.box(g, wood, 2.1, 0.07, 0.12, 0, 0.52, -0.22 + i * 0.15);
      for (let i = 0; i < 3; i++)
        this.box(g, wood, 2.1, 0.12, 0.07, 0, 0.67 + i * 0.15, -0.26);
    } else if (['plant', 'planter'].includes(p.kind)) {
      this.cylinder(g, '#c68665', 0.32, 0.53, 0, 0.26, 0, 0.38);
      this.cylinder(g, '#584f3b', 0.33, 0.035, 0, 0.53);
      for (let i = 0; i < 5; i++) {
        const leaf = this.ball(
          g,
          i % 2 ? '#5e8e6f' : '#769b71',
          0.28,
          Math.sin(i * 2) * 0.22,
          0.95 + (i % 2) * 0.2,
          Math.cos(i * 2) * 0.22,
        );
        leaf.scale.set(0.7, 1.7, 0.6);
        leaf.rotation.z = Math.sin(i * 2) * 0.4;
      }
    } else if (p.kind === 'flowers') {
      for (let i = 0; i < 10; i++) {
        const x = ((i % 5) - 2) * 0.3,
          z = Math.floor(i / 5) * 0.3;
        this.box(g, '#638c51', 0.025, 0.22, 0.025, x, 0.11, z);
        this.ball(
          g,
          ['#f4df9d', '#e5a494', '#e7d7b7'][i % 3],
          0.08,
          x,
          0.25,
          z,
        );
      }
    } else if (p.kind === 'shelf') {
      this.box(g, '#66877e', p.w, 0.12, p.d);
      for (const side of [-1, 1])
        this.box(g, '#66877e', p.w, 1.6, 0.08, 0, 0.8, side * (p.d / 2 - 0.04));
      this.box(g, '#d6d7bb', 0.08, 1.62, p.d, 0);
      for (const side of [-1, 1])
        for (let tier = 0; tier < 3; tier++) {
          this.box(g, '#e1d6b7', 0.6, 0.07, p.d, side * 0.38, 0.2 + tier * 0.5);
          for (let j = 0; j < 8; j++) {
            const color = [
              '#d1a950',
              '#c97c64',
              '#8fac91',
              '#7698ab',
              '#e6d2a7',
            ][(j + tier) % 5];
            if (tier === 0)
              this.cylinder(
                g,
                color,
                0.12,
                0.26,
                side * 0.4,
                0.36,
                -1.7 + j * 0.46,
              );
            else
              this.box(
                g,
                color,
                0.22,
                0.3 + (j % 2) * 0.06,
                0.24,
                side * 0.4,
                0.4 + tier * 0.5,
                -1.7 + j * 0.46,
              );
          }
        }
    } else if (p.kind === 'produce') {
      this.box(g, wood, p.w, 0.7, p.d);
      for (let i = 0; i < 21; i++)
        this.ball(
          g,
          i % 3 ? '#bb664f' : '#81a45a',
          0.14,
          -0.8 + (i % 7) * 0.27,
          0.8,
          -0.3 + Math.floor(i / 7) * 0.28,
        );
    } else if (p.kind === 'freezer') {
      this.box(g, '#d4e0d6', p.w, 1.55, p.d);
      this.box(g, '#739c9d', p.w - 0.1, 1.28, 0.06, 0, 0.82, 0.44);
      for (let i = -1; i <= 1; i++) {
        this.box(g, '#e9ede0', 0.035, 1.35, 0.06, i * 1.1, 0.82, 0.48);
        this.box(g, '#eff4e9', 0.04, 0.4, 0.05, i * 1.1 + 0.4, 0.8, 0.53);
      }
    } else if (p.kind === 'checkout') {
      this.box(g, '#7caaa0', p.w, 0.85, p.d);
      this.box(g, '#3b5550', p.w, 0.08, p.d, 0, 0.87);
      this.box(g, '#c2d6c3', 0.12, 0.5, 0.12, -0.22, 1.12);
      this.box(g, '#334d4b', 0.55, 0.42, 0.1, -0.22, 1.44);
      this.box(g, '#c4e6c9', 0.46, 0.32, 0.02, -0.22, 1.44, 0.07);
      this.box(g, '#ecdfbe', 0.34, 0.18, 0.32, 0.32, 0.97);
    } else if (p.kind === 'cart') {
      this.box(g, '#74968e', 0.6, 0.09, 0.8, 0, 0.44);
      for (const x of [-0.3, 0.3])
        this.box(g, '#9faf9f', 0.06, 0.45, 0.8, x, 0.66);
      this.box(g, '#9faf9f', 0.6, 0.45, 0.05, 0, 0.66, -0.4);
      for (const x of [-0.22, 0.22])
        for (const z of [-0.3, 0.3]) this.ball(g, '#435b52', 0.09, x, 0.1, z);
    } else if (p.kind === 'sofa') {
      this.box(g, '#708d89', p.w, 0.48, p.d, 0, 0.28);
      this.box(g, '#66817e', p.w, 0.7, 0.2, 0, 0.57, -p.d / 2 + 0.1);
      const count = p.w > 2 ? 3 : 1;
      for (let i = 0; i < count; i++)
        this.box(
          g,
          '#8fa69a',
          p.w / count - 0.1,
          0.18,
          p.d - 0.26,
          -p.w / 2 + (p.w / count) * (i + 0.5),
          0.55,
          0.05,
        );
      for (const x of [-p.w / 2 + 0.1, p.w / 2 - 0.1])
        this.box(g, '#66817e', 0.2, 0.35, p.d, x, 0.63);
      this.box(g, '#dfb37e', 0.42, 0.4, 0.16, p.w / 4, 0.81, -0.14).rotation.z =
        0.2;
    } else if (['table', 'coffee', 'buffet', 'giftTable'].includes(p.kind)) {
      const height = p.kind === 'coffee' ? 0.5 : 0.85;
      for (const x of [-p.w * 0.36, p.w * 0.36])
        for (const z of [-p.d * 0.34, p.d * 0.34])
          this.box(g, '#735746', 0.09, height, 0.09, x, height / 2, z);
      this.box(g, '#b98a62', p.w, 0.12, p.d, 0, height);
      if (p.kind === 'giftTable') {
        for (const [i, x] of [-0.5, 0.35].entries()) {
          const gift = new THREE.Group();
          gift.position.set(x, height + 0.08, 0);
          gift.rotation.y = i * 0.4;
          this.item(gift, 'gift');
          g.add(gift);
        }
      } else {
        this.cylinder(g, '#f2e3c9', 0.22, 0.025, -0.22, height + 0.08);
        for (let i = 0; i < 3; i++)
          this.ball(g, '#d2a25f', 0.075, -0.3 + i * 0.08, height + 0.13);
        this.cylinder(g, '#e5d5c0', 0.08, 0.18, 0.3, height + 0.15);
      }
      if (p.kind === 'buffet')
        for (let i = 0; i < 4; i++)
          this.cylinder(
            g,
            ['#86674c', '#779475'][i % 2],
            0.08,
            0.4,
            0.55 + i * 0.33,
            height + 0.2,
          );
    } else if (p.kind === 'rug') {
      this.box(g, '#b77569', p.w, 0.012, p.d, 0, 0.027);
      this.box(g, '#d5ad8e', p.w - 0.3, 0.012, p.d - 0.3, 0, 0.037);
      this.box(g, '#af7d75', p.w - 0.6, 0.012, p.d - 0.6, 0, 0.047);
    } else if (p.kind === 'speaker') {
      this.box(g, '#434347', 0.55, 1.15, 0.5);
      for (const y of [0.3, 0.8]) {
        const cone = this.cylinder(g, '#292f32', 0.17, 0.035, 0, y, 0.27);
        cone.rotation.x = Math.PI / 2;
      }
    } else if (p.kind === 'balcony') {
      this.box(g, '#a4b4a3', p.w, 0.04, p.d, 0, 0.04);
      for (let i = 0; i < 7; i++)
        this.box(g, metal, 0.035, 0.8, 0.035, -1.3 + i * 0.43, 0.45, -1.22);
      this.box(g, metal, 2.7, 0.055, 0.06, 0, 0.88, -1.22);
    } else if (p.kind === 'balloons') {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.24;
        this.box(g, '#eadcc9', 0.008, 1.8, 0.008, x, 0.9);
        const b = this.ball(
          g,
          ['#d9b06f', '#b18eae', '#9bbca1'][i],
          0.25,
          x,
          1.8 + i * 0.17,
        );
        b.scale.y = 1.2;
      }
    } else if (p.kind === 'lamp') {
      this.cylinder(g, metal, 0.18, 0.06);
      this.cylinder(g, metal, 0.035, 2.2, 0, 1.1);
      this.cylinder(g, '#f1d69d', 0.3, 0.32, 0, 2.2, 0, 0.17);
      this.ball(g, '#ffedbe', 0.11, 0, 2.04);
    } else if (p.kind === 'bin') {
      this.cylinder(g, '#61776b', 0.28, 0.7);
      this.cylinder(g, '#364e44', 0.3, 0.08, 0, 0.73);
    } else if (p.kind === 'sign') {
      this.box(g, wood, 0.07, 1.1, 0.07);
      this.box(g, '#d5dfc2', 0.65, 0.42, 0.07, 0, 1);
      this.text(
        g,
        this.currentLevel === 0 ? 'TAKE IT EASY' : 'GOOD DAY',
        '#f9f6e6',
        0,
        1.12,
        0,
        0.2,
      );
    }
  }
  avatar(p: Person, isPlayer = false): Avatar {
    const root = new THREE.Group(),
      body = new THREE.Group();
    root.add(body);
    this.world.add(root);
    const height = p.style === 'bald' ? 1.08 : p.style === 'bun' ? 0.96 : 1;
    body.scale.setScalar(height);
    this.cylinder(body, p.color, 0.22, 0.5, 0, 0.75, 0, 0.25);
    this.ball(body, p.skin, 0.205, 0, 1.21, 0, 2);
    if (p.style !== 'bald') {
      const hair = this.ball(body, p.hair, 0.213, 0, 1.29, -0.025, 2);
      hair.scale.set(1, 0.65, 1);
    }
    for (const x of [-0.067, 0.067])
      this.ball(body, '#2f3533', 0.019, x, 1.23, 0.188, 1);
    this.ball(body, p.skin, 0.037, 0, 1.18, 0.204);
    const arms: THREE.Group[] = [],
      legs: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.25, 0.93, 0);
      body.add(arm);
      this.cylinder(arm, p.color, 0.073, 0.27, 0, -0.12);
      this.ball(arm, p.skin, 0.073, 0, -0.3);
      arms.push(arm);
      const leg = new THREE.Group();
      leg.position.set(side * 0.12, 0.53, 0);
      body.add(leg);
      this.cylinder(leg, '#3b454b', 0.08, 0.36, 0, -0.17);
      this.box(
        leg,
        isPlayer ? '#e5eee0' : '#4c5150',
        0.16,
        0.11,
        0.25,
        0,
        -0.39,
        0.045,
      );
      legs.push(leg);
    }
    if (p.style === 'cap') {
      this.cylinder(body, p.color, 0.22, 0.1, 0, 1.4);
      this.box(body, p.color, 0.27, 0.035, 0.24, 0, 1.39, 0.17);
    }
    if (p.style === 'beanie') {
      this.ball(body, p.color, 0.22, 0, 1.4);
      this.ball(body, '#eddec0', 0.07, 0, 1.62);
    }
    if (p.style === 'bun') this.ball(body, p.hair, 0.13, 0, 1.48, -0.07);
    if (p.style === 'glasses')
      for (const x of [-0.08, 0.08]) {
        const glass = new THREE.Mesh(
          new THREE.TorusGeometry(0.061, 0.013, 5, 14),
          this.material('#584e48'),
        );
        glass.position.set(x, 1.24, 0.2);
        body.add(glass);
      }
    if (p.style === 'headphones') {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.235, 0.032, 6, 24, Math.PI),
        this.material(isPlayer ? '#8ee5c2' : '#e6cb8a'),
      );
      band.position.y = 1.24;
      body.add(band);
      for (const side of [-1, 1])
        this.box(
          body,
          isPlayer ? '#8ee5c2' : '#e6cb8a',
          0.09,
          0.16,
          0.12,
          side * 0.225,
          1.22,
        );
    }
    if (isPlayer) {
      this.box(body, '#cfb692', 0.21, 0.3, 0.12, -0.31, 0.55, 0.035);
      this.text(root, 'YOU', '#dcfff0', 0, 1.9, 0, 0.23);
    } else if (this.currentLevel === 1)
      this.box(body, '#d2b379', 0.22, 0.25, 0.2, 0.3, 0.44, 0.03);
    const halo = this.ring(
      root,
      isPlayer ? '#7bffd1' : '#f8e9c4',
      isPlayer ? 0.37 : 1.05,
      isPlayer ? 0.05 : 0.02,
    );
    const notice = this.ball(root, '#edbc69', 0.075, 0, 1.8);
    notice.visible = false;
    const label = this.text(root, p.name, '#ffffff', 0, 2.1, 0, 0.23);
    label.visible = false;
    return { root, body, arms, legs, halo, notice, label };
  }
  animateAvatar(
    avatar: Avatar,
    pos: { x: number; z: number },
    heading: number,
    phase: number,
    moving: boolean,
  ) {
    avatar.root.position.set(pos.x, 0, pos.z);
    let delta = heading - avatar.body.rotation.y;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    avatar.body.rotation.y += delta * 0.2;
    avatar.body.position.y =
      moving && !this.reduced ? Math.abs(Math.sin(phase)) * 0.025 : 0;
    avatar.legs.forEach(
      (limb, i) =>
        (limb.rotation.x = moving ? Math.sin(phase + i * Math.PI) * 0.42 : 0),
    );
    avatar.arms.forEach(
      (limb, i) =>
        (limb.rotation.x = moving ? -Math.sin(phase + i * Math.PI) * 0.35 : 0),
    );
  }
  render(s: GameState) {
    if (this.currentLevel !== s.level) this.load(s.level);
    this.updateCamera(s.player);
    this.animateAvatar(
      this.player,
      s.player,
      s.heading,
      s.walked,
      s.moving && s.mode === 'playing',
    );
    (this.player.halo.material as THREE.MeshBasicMaterial).color.set(
      s.shield > 0 ? '#c6fff2' : '#7bffd1',
    );
    this.player.halo.scale.setScalar(s.shield > 0 ? 1.5 : 1);
    s.npcs.forEach((n, i) => {
      const a = this.avatars[i];
      this.animateAvatar(
        a,
        n.pos,
        n.heading,
        n.walked,
        n.wait <= 0 && n.path.length > 0 && s.mode === 'playing',
      );
      const m = a.halo.material as THREE.MeshBasicMaterial;
      m.color.set(
        n.state === 'respect'
          ? '#80d6bc'
          : n.notice > 0.2
            ? '#efae59'
            : '#f8e9c4',
      );
      m.opacity = n.notice > 0.2 ? 0.55 : 0.18;
      a.notice.visible = n.notice > 0.15;
      a.notice.scale.setScalar(0.7 + n.notice * 0.9);
      a.label.visible = distance(n.pos, s.player) < 2.4 && !s.bubble;
    });
    this.markers.forEach((m) => {
      m.root.visible = !s.collected.includes(m.id);
      m.root.position.y =
        0.4 + (this.reduced ? 0 : Math.sin(s.time * 2.6) * 0.09);
    });
    this.exit.visible =
      s.collected.length === LEVELS[s.level].objectives.length;
    if (s.bubble) {
      const p = s.npcs[s.bubble.npc].pos,
        projected = new THREE.Vector3(p.x, 2.2, p.z).project(this.camera);
      this.bubbleAnchor = {
        x: Math.max(
          130,
          Math.min(this.width - 130, ((projected.x + 1) / 2) * this.width),
        ),
        y: Math.max(
          68,
          Math.min(this.height - 70, ((1 - projected.y) / 2) * this.height),
        ),
      };
    }
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.observer.disconnect();
    this.clearWorld();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
