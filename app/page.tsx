'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
} from 'react';
import {
  ArrowRight,
  Check,
  Coffee,
  Footprints,
  Heart,
  HelpCircle,
  Leaf,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  ShoppingBasket,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
  Hand,
  Star,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { LEVELS } from './game/world';
import {
  boundary,
  breathe,
  newGame,
  rating,
  snapshot,
  step,
  type GameState,
} from './game/engine';
import { GameAudio } from './game/audio';
import type { Diorama } from './game/scene';

const chapterIcons = [Leaf, ShoppingBasket, Sparkles];
const chapters = ['The park', 'The supermarket', 'The party'];
const initial = snapshot(newGame());
const saveKey = 'quietly-does-it-v2';
const timeLabel = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function Home() {
  const stage = useRef<HTMLDivElement>(null),
    world = useRef<HTMLDivElement>(null);
  const game = useRef<GameState>(newGame()),
    view = useRef<Diorama | null>(null),
    audio = useRef<GameAudio | null>(null);
  const keys = useRef(new Set<string>()),
    joystick = useRef({ x: 0, y: 0 }),
    slowRef = useRef(false);
  const [hud, setHud] = useState(initial),
    [ready, setReady] = useState(false),
    [error, setError] = useState('');
  const [sound, setSound] = useState(false),
    [help, setHelp] = useState(false),
    [slow, setSlow] = useState(false),
    [zoom, setZoom] = useState(false);
  const [records, setRecords] = useState([0, 0, 0]);
  const [bubble, setBubble] = useState<{
    text: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const sync = useCallback(() => setHud(snapshot(game.current)), []);
  const clearInput = useCallback(() => {
    keys.current.clear();
    joystick.current = { x: 0, y: 0 };
  }, []);
  const start = useCallback(
    (level: number, cozy = game.current.cozy) => {
      clearInput();
      game.current = newGame(level, cozy);
      game.current.mode = 'playing';
      setBubble(null);
      sync();
      stage.current?.focus();
    },
    [clearInput, sync],
  );
  const pause = useCallback(() => {
    const s = game.current;
    if (s.mode === 'playing' || s.mode === 'paused') {
      s.mode = s.mode === 'playing' ? 'paused' : 'playing';
      clearInput();
      sync();
    }
  }, [clearInput, sync]);
  const takeBreath = useCallback(() => {
    breathe(game.current);
    sync();
  }, [sync]);
  const bePolite = useCallback(() => {
    boundary(game.current);
    sync();
  }, [sync]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(saveKey) || 'null');
        if (saved && Array.isArray(saved.stars) && saved.stars.length === 3) {
          const stars = saved.stars.map((n: unknown) =>
            typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 3
              ? n
              : 0,
          );
          setRecords(stars);
        }
      } catch {
        /* Play still works if browser storage is unavailable. */
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let disposed = false,
      raf = 0,
      previous = 0,
      publish = 0,
      eventId = 0,
      recordedState: GameState | null = null;
    const localAudio = new GameAudio();
    audio.current = localAudio;
    const initialize = async () => {
      try {
        const { Diorama: Scene } = await import('./game/scene');
        if (disposed || !world.current) return;
        const renderer = new Scene(world.current);
        view.current = renderer;
        const phone = window.matchMedia('(max-width: 600px)').matches;
        renderer.zoom = phone ? 1.65 : 1;
        setZoom(phone);
        renderer.render(game.current);
        setReady(true);
        const frame = (now: number) => {
          if (disposed) return;
          const dt = previous ? Math.min(0.04, (now - previous) / 1000) : 0;
          previous = now;
          const pressed = (a: string, b: string) =>
            keys.current.has(a) || keys.current.has(b) ? 1 : 0;
          step(
            game.current,
            {
              x:
                pressed('d', 'arrowright') -
                pressed('a', 'arrowleft') +
                joystick.current.x,
              y:
                pressed('s', 'arrowdown') -
                pressed('w', 'arrowup') +
                joystick.current.y,
              sneak: keys.current.has('shift') || slowRef.current,
            },
            dt,
          );
          const s = game.current;
          renderer.render(s);
          if (s.event && (eventId !== s.event.id || recordedState !== s)) {
            localAudio.play(s.event.kind);
            eventId = s.event.id;
          }
          if (recordedState !== s) {
            eventId = s.event?.id ?? 0;
            recordedState = s;
          }
          if (s.mode === 'won' && !completed.has(s)) {
            completed.add(s);
            setRecords((old) => {
              const next = [...old];
              next[s.level] = Math.max(next[s.level], rating(s));
              try {
                localStorage.setItem(saveKey, JSON.stringify({ stars: next }));
              } catch {
                /* Optional records. */
              }
              return next;
            });
          }
          if (now - publish > 90) {
            publish = now;
            setHud(snapshot(s));
            setBubble(
              s.bubble
                ? {
                    text: s.bubble.text,
                    name: LEVELS[s.level].npcs[s.bubble.npc].name,
                    ...renderer.bubbleAnchor,
                  }
                : null,
            );
          }
          raf = requestAnimationFrame(frame);
        };
        const completed = new WeakSet<GameState>();
        raf = requestAnimationFrame(frame);
      } catch {
        if (!disposed)
          setError(
            'The 3D scene couldn’t start. Try a browser with WebGL enabled, such as a recent Safari, Chrome, or Firefox.',
          );
      }
    };
    void initialize();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      view.current?.dispose();
      view.current = null;
      localAudio.dispose();
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)');
    const change = () => {
      setZoom(media.matches);
      if (view.current) view.current.zoom = media.matches ? 1.65 : 1;
    };
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (game.current.mode !== 'playing' && game.current.mode !== 'paused')
        return;
      if ((e.target as HTMLElement).closest('dialog, input, select, textarea'))
        return;
      const key = e.key.toLowerCase();
      if (
        [
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          ' ',
          'w',
          'a',
          's',
          'd',
          'e',
          'shift',
          'escape',
        ].includes(key)
      )
        e.preventDefault();
      if (key === 'escape' && !e.repeat) {
        pause();
        return;
      }
      if (game.current.mode !== 'playing') return;
      if (key === ' ' && !e.repeat) takeBreath();
      if (key === 'e' && !e.repeat) bePolite();
      keys.current.add(key);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const loseFocus = () => {
      clearInput();
      if (game.current.mode === 'playing') {
        game.current.mode = 'paused';
        sync();
      }
    };
    const visibility = () => {
      if (document.hidden) loseFocus();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', loseFocus);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', loseFocus);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [bePolite, clearInput, pause, sync, takeBreath]);

  const cfg = LEVELS[hud.level];
  const showHelp = () => {
    if (game.current.mode === 'playing') {
      game.current.mode = 'paused';
      clearInput();
      sync();
    }
    setHelp(true);
  };
  const changeLevel = (level: number) => {
    clearInput();
    game.current = newGame(level, game.current.cozy);
    setBubble(null);
    sync();
  };
  const toggleSound = () => {
    try {
      audio.current?.setEnabled(!sound);
      setSound(!sound);
    } catch {
      game.current.message =
        'Sound isn’t available in this browser. Everything else still works.';
      game.current.messageTime = 5;
      sync();
    }
  };
  const toggleZoom = () => {
    if (view.current) view.current.zoom = zoom ? 1 : 1.65;
    setZoom(!zoom);
  };
  const fullScreen = () => {
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    else
      void stage.current?.requestFullscreen?.().catch(() => {
        game.current.message =
          'You can also rotate your phone for a wider view.';
        game.current.messageTime = 4;
        sync();
      });
  };

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="brand" href="#game" aria-label="Quietly Does It game">
          <span className="brand-mark">
            <Footprints size={23} />
          </span>
          <span>
            <strong>
              quietly does it<span className="brand-period">.</span>
            </strong>
            <small>A little space goes a long way.</small>
          </span>
        </a>
        <nav className="chapters" aria-label="Choose a chapter">
          {chapters.map((name, i) => {
            const Icon = chapterIcons[i];
            return (
              <button
                key={name}
                onClick={() => changeLevel(i)}
                aria-current={i === hud.level ? 'step' : undefined}
                className={i === hud.level ? 'active' : ''}
              >
                <span>
                  <Icon size={17} />
                </span>
                <span>{name}</span>
                {records[i] > 0 && <Check size={13} className="chapter-done" />}
              </button>
            );
          })}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            onClick={toggleSound}
            aria-label={sound ? 'Mute sound' : 'Enable gentle sound effects'}
            title={sound ? 'Sound on' : 'Sound off'}
          >
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            className="icon-button"
            onClick={showHelp}
            aria-label="How to play"
          >
            <HelpCircle size={19} />
          </button>
        </div>
      </header>

      <div className="heading-row">
        <div>
          <span className="eyebrow">{cfg.subtitle}</span>
          <h1>
            {cfg.name}
            <span> {hud.level === 0 ? '↗' : hud.level === 1 ? '↝' : '✧'}</span>
          </h1>
        </div>
        <p>
          No rush. No perfect performance.
          <br />
          <strong>Just a little room to be yourself.</strong>
        </p>
      </div>

      <div className="play-layout">
        <section
          id="game"
          className="stage"
          ref={stage}
          tabIndex={-1}
          role="application"
          aria-label="Game area"
          style={{ '--level-color': cfg.color } as React.CSSProperties}
        >
          <div className="scene" ref={world} />
          <div className="stage-top">
            <span className="location-tag">
              <span
                className={`status-dot ${hud.mode === 'playing' ? 'live' : ''}`}
              />
              {hud.mode === 'playing'
                ? hud.quiet
                  ? 'A MOMENT OF QUIET'
                  : 'ONE STEP AT A TIME'
                : hud.mode === 'paused'
                  ? 'TAKE YOUR TIME'
                  : 'YOUR LITTLE WORLD'}
            </span>
            <div className="scene-buttons">
              <button
                onClick={toggleZoom}
                aria-label={
                  zoom ? 'Show whole level' : 'Zoom in and follow player'
                }
                title={zoom ? 'Whole scene' : 'Follow me'}
              >
                {zoom ? <ZoomOut size={17} /> : <ZoomIn size={17} />}
              </button>
              <button
                onClick={fullScreen}
                aria-label="Toggle fullscreen"
                title="Fullscreen"
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={pause}
                disabled={hud.mode !== 'playing' && hud.mode !== 'paused'}
                aria-label={hud.mode === 'paused' ? 'Resume' : 'Pause'}
              >
                {hud.mode === 'paused' ? (
                  <Play size={17} />
                ) : (
                  <Pause size={17} />
                )}
              </button>
            </div>
          </div>
          {bubble && hud.mode === 'playing' && (
            <div className="speech" style={{ left: bubble.x, top: bubble.y }}>
              <small>{bubble.name}</small>
              <span>{bubble.text}</span>
            </div>
          )}
          {hud.mode === 'playing' && (
            <div className="world-legend">
              <span>
                <i className="you-dot" />
                You
              </span>
              <span>
                <i className="goal-dot" />
                Your next stop
              </span>
              <span>
                <i className="quiet-dot" />
                Quiet spot
              </span>
            </div>
          )}
          {zoom && hud.mode === 'playing' && (
            <div className="mini-map">
              <span>YOUR LITTLE MAP</span>
              <svg
                viewBox="0 0 160 140"
                aria-label="Map showing you in mint and objectives in gold"
              >
                <rect width="160" height="140" rx="9" fill="#e5e6d6" />
                {cfg.props
                  .filter((p) => p.solid !== false)
                  .map((p, i) => (
                    <rect
                      key={i}
                      x={(p.x - p.w / 2) * 10}
                      y={(p.z - p.d / 2) * 10}
                      width={p.w * 10}
                      height={p.d * 10}
                      rx="2"
                      fill="#a5b49b"
                    />
                  ))}
                {cfg.quiet.map((q) => (
                  <circle
                    key={q.name}
                    cx={q.x * 10}
                    cy={q.z * 10}
                    r={q.radius * 10}
                    fill="none"
                    stroke="#69a883"
                    strokeWidth="2"
                  />
                ))}
                {hud.people.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x * 10}
                    cy={p.z * 10}
                    r="2.8"
                    fill="#bd9273"
                  />
                ))}
                {cfg.objectives
                  .filter((o) => !hud.collected.includes(o.id))
                  .map((o) => (
                    <circle
                      key={o.id}
                      cx={o.x * 10}
                      cy={o.z * 10}
                      r="4"
                      fill="#deb447"
                      stroke="#ffefbd"
                      strokeWidth="1"
                    />
                  ))}
                {hud.collected.length === cfg.objectives.length && (
                  <circle
                    cx={cfg.exit.x * 10}
                    cy={cfg.exit.z * 10}
                    r="5"
                    fill="#dec068"
                    stroke="#fffadc"
                    strokeWidth="2"
                  />
                )}
                <circle
                  cx={hud.player.x * 10}
                  cy={hud.player.z * 10}
                  r="4"
                  fill="#367c65"
                  stroke="#c6ffe8"
                  strokeWidth="2"
                />
              </svg>
            </div>
          )}
          {!ready && !error && (
            <div className="loading">
              <span className="loading-leaf">
                <Leaf />
              </span>
              <strong>Making a little room…</strong>
            </div>
          )}
          {error && (
            <div className="loading">
              <strong>A little technical pause</strong>
              <p>{error}</p>
              <button
                className="primary-button"
                onClick={() => location.reload()}
              >
                Try loading again
              </button>
            </div>
          )}
          {ready && hud.mode === 'intro' && (
            <div className="game-overlay">
              <div className="intro-card">
                <span className="card-symbol">
                  {hud.level === 0 ? (
                    <Leaf />
                  ) : hud.level === 1 ? (
                    <ShoppingBasket />
                  ) : (
                    <Sparkles />
                  )}
                </span>
                <span className="eyebrow">A SMALL SOCIAL ADVENTURE</span>
                <h2>
                  {hud.level === 0
                    ? 'An excellent day\nfor a quiet walk.'
                    : hud.level === 1
                      ? 'Just three things.\nYou’ve got this.'
                      : 'A thoughtful gift.\nA graceful exit.'}
                </h2>
                <p>{cfg.description}</p>
                <div className="intro-mission">
                  <span>THE PLAN</span>
                  <strong>
                    {hud.level === 0
                      ? 'Find the glowing quiet bench.'
                      : hud.level === 1
                        ? 'Pick up 3 groceries, then check out.'
                        : 'Deliver the gift, then reach the balcony.'}
                  </strong>
                </div>
                <button
                  className="primary-button"
                  onClick={() => start(hud.level)}
                >
                  {hud.level === 0 ? 'Let’s take a walk' : 'I’m ready'}
                  <ArrowRight size={18} />
                </button>
                <label className="cozy-choice">
                  <input
                    type="checkbox"
                    checked={hud.cozy}
                    onChange={(e) => {
                      game.current.cozy = e.target.checked;
                      sync();
                    }}
                  />
                  <span>
                    Gentle mode <small>Slower people, half the pressure</small>
                  </span>
                </label>
                <small className="intro-hint">
                  WASD / arrows to move · touch controls on mobile
                </small>
              </div>
            </div>
          )}
          {ready && hud.mode === 'won' && (
            <div className="game-overlay">
              <div className="result-card">
                <span className="eyebrow">
                  {hud.level === 2
                    ? 'YOU DID IT, YOUR WAY'
                    : 'A SMALL, LOVELY VICTORY'}
                </span>
                <div className="stars" aria-label={`${hud.stars} of 3 stars`}>
                  {[1, 2, 3].map((n) => (
                    <Star
                      key={n}
                      size={34}
                      fill={n <= hud.stars ? 'currentColor' : 'none'}
                      className={n <= hud.stars ? '' : 'unearned'}
                    />
                  ))}
                </div>
                <h2>
                  {hud.level === 0
                    ? 'Blissfully unchatty.'
                    : hud.level === 1
                      ? 'Errand accomplished.'
                      : 'Fresh air. Well earned.'}
                </h2>
                <p>{cfg.ending}</p>
                <div className="result-stats">
                  <span>
                    <strong>{timeLabel(hud.time)}</strong>Your own pace
                  </span>
                  <span>
                    <strong>{hud.breaks}</strong>Breathing breaks
                  </span>
                  <span>
                    <strong>{hud.contacts}</strong>Little hellos
                  </span>
                </div>
                <p className="rating-note">
                  ★ You arrived · {hud.maxPressure < 70 ? '★' : '☆'} Pressure
                  below 70 · {hud.contacts < 3 ? '★' : '☆'} Fewer than 3 hellos
                  <br />
                  Breathing breaks never cost a star.
                </p>
                <button
                  className="primary-button"
                  onClick={() => start(hud.level === 2 ? 0 : hud.level + 1)}
                >
                  {hud.level === 2
                    ? 'Another little adventure'
                    : `Next: ${chapters[hud.level + 1]}`}
                  <ArrowRight size={18} />
                </button>
                <button
                  className="text-button"
                  onClick={() => start(hud.level)}
                >
                  Revisit this place
                </button>
              </div>
            </div>
          )}
          <div
            className={`touch-controls ${hud.mode !== 'playing' ? 'inactive' : ''}`}
          >
            <Joystick
              onMove={(x, y) => {
                joystick.current = { x, y };
              }}
              disabled={hud.mode !== 'playing'}
            />
            <div className="touch-actions">
              <button
                aria-label="Polite boundary"
                disabled={hud.boundary > 0 || hud.mode !== 'playing'}
                onClick={bePolite}
              >
                <Hand size={22} />
                <span>
                  {hud.boundary > 0 ? `${hud.boundary}s` : 'Excuse me'}
                </span>
              </button>
              <button
                aria-label="Take a breath"
                className="touch-breathe"
                disabled={hud.breath > 0 || hud.mode !== 'playing'}
                onClick={takeBreath}
              >
                <Wind size={24} />
                <span>{hud.breath > 0 ? `${hud.breath}s` : 'Breathe'}</span>
              </button>
            </div>
          </div>
        </section>

        <aside className="journal">
          <div className="mission-block">
            <span className="eyebrow">YOUR VERY REASONABLE PLAN</span>
            <h2>A little to-do.</h2>
            <ul>
              {cfg.objectives.map((o) => {
                const done = hud.collected.includes(o.id);
                return (
                  <li className={done ? 'checked' : ''} key={o.id}>
                    <span className="checkbox-mark">
                      {done && <Check size={13} />}
                    </span>
                    <span>{o.name}</span>
                  </li>
                );
              })}
              <li className={hud.mode === 'won' ? 'checked' : ''}>
                <span className="checkbox-mark">
                  {hud.mode === 'won' && <Check size={13} />}
                </span>
                <span>{cfg.exitName}</span>
              </li>
            </ul>
          </div>
          <div className="pressure-block">
            <div className="meter-heading">
              <span>
                <Heart size={15} />
                Social pressure
              </span>
              <strong>
                {hud.pressure}
                <small>/100</small>
              </strong>
            </div>
            <Progress
              aria-label="Social pressure"
              value={hud.pressure}
              className={`pressure-meter ${hud.pressure > 70 ? 'high' : ''}`}
            />
            <p>
              {hud.quiet
                ? 'Quiet spot. Recharging.'
                : hud.pressure > 70
                  ? 'Getting full. Find space or breathe.'
                  : hud.pressure > 30
                    ? 'A little room would be nice.'
                    : 'Plenty of room to be you.'}
            </p>
          </div>
          <div className="abilities">
            <button
              onClick={takeBreath}
              disabled={hud.breath > 0 || hud.mode !== 'playing'}
            >
              <span className="ability-icon mint">
                <Wind size={21} />
              </span>
              <span>
                <strong>Take a breath</strong>
                <small>
                  {hud.breath > 0
                    ? `Ready in ${hud.breath}s`
                    : 'Ease pressure · 8s recharge'}
                </small>
              </span>
              <kbd>{hud.breath > 0 ? hud.breath : '␣'}</kbd>
            </button>
            <button
              onClick={bePolite}
              disabled={hud.boundary > 0 || hud.mode !== 'playing'}
            >
              <span className="ability-icon peach">
                <Hand size={20} />
              </span>
              <span>
                <strong>“Just passing!”</strong>
                <small>
                  {hud.boundary > 0
                    ? `Ready in ${hud.boundary}s`
                    : 'A friendly, firm boundary'}
                </small>
              </span>
              <kbd>{hud.boundary > 0 ? hud.boundary : 'E'}</kbd>
            </button>
          </div>
          <div className="field-note">
            <span>
              <Coffee size={16} />A FIELD NOTE
            </span>
            <p>{cfg.tip}</p>
          </div>
          {hud.nearby && hud.mode === 'playing' && (
            <div className="nearby-person">
              <span className="eyebrow">AROUND YOU</span>
              <div>
                <i style={{ background: hud.nearby.color }} />
                <strong>{hud.nearby.name}</strong>
                {hud.nearby.state === 'respect' && <span>Giving you room</span>}
              </div>
              <p>{hud.nearby.role}</p>
            </div>
          )}
          <div className="journal-bottom">
            <button
              className={`slow-toggle ${slow ? 'selected' : ''}`}
              aria-pressed={slow}
              onClick={() => {
                slowRef.current = !slow;
                setSlow(!slow);
              }}
            >
              <Footprints size={16} />
              <span>{slow ? 'Quiet steps on' : 'Quiet steps'}</span>
              <kbd>⇧</kbd>
            </button>
            <button
              className="retry-button"
              onClick={() => start(hud.level)}
              aria-label="Restart this level"
              disabled={!ready}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </aside>
      </div>

      <footer>
        <div className="live-note">
          <span className="note-icon">✧</span>
          <p aria-live="polite">{hud.message}</p>
        </div>
        <span className="keyboard-hint">
          WASD / arrows <span>move</span>
          <i /> Esc <span>pause</span>
        </span>
      </footer>
      <div className="mobile-note">
        Drag the thumbstick to move. Rotate for a wider view, or use{' '}
        <ZoomIn size={13} /> to follow yourself.
      </div>

      {(hud.mode === 'paused' || hud.mode === 'failed' || help) && (
        <Modal
          onClose={() => {
            if (help) setHelp(false);
            else if (hud.mode === 'paused') pause();
          }}
          title={
            help
              ? 'A little orientation.'
              : hud.mode === 'failed'
                ? 'A little too much, all at once.'
                : 'The world can wait.'
          }
        >
          {help ? (
            <>
              <p>
                You’re wearing mint headphones. Finish the little to-do list and
                find the glowing exit. A full pressure meter means a breather
                and a fresh attempt.
              </p>
              <div className="help-grid">
                <span>
                  <kbd>WASD / arrows</kbd> Move with the screen
                </span>
                <span>
                  <kbd>Space</kbd> Breathe: less pressure, 8s recharge
                </span>
                <span>
                  <kbd>E</kbd> A polite boundary: people give you room
                </span>
                <span>
                  <kbd>Shift</kbd> Walk quietly to be less noticeable
                </span>
                <span>
                  <kbd>Esc</kbd> Pause whenever you like
                </span>
              </div>
              <p>
                On mobile, drag the thumbstick and tap the two action buttons.
                Mint circles are quiet spots. Amber dots above heads mean
                someone has noticed you. People and their little hellos aren’t
                failures.
              </p>
              <button className="primary-button" onClick={() => setHelp(false)}>
                Got it
                <Check size={17} />
              </button>
            </>
          ) : hud.mode === 'failed' ? (
            <>
              <p>
                Your social battery needs a reset. It happens. Try a different
                route, use a quiet spot, or switch to gentle mode.
              </p>
              <button
                className="primary-button"
                onClick={() => start(hud.level)}
              >
                A fresh start
                <RotateCcw size={17} />
              </button>
              {!hud.cozy && (
                <button
                  className="text-button"
                  onClick={() => start(hud.level, true)}
                >
                  Try gentle mode
                </button>
              )}
            </>
          ) : (
            <>
              <p>Take as long as you need. Nothing moves while you’re away.</p>
              <button className="primary-button" onClick={pause}>
                Back to it
                <Play size={17} />
              </button>
              <button className="text-button" onClick={() => start(hud.level)}>
                Start this level again
              </button>
            </>
          )}
        </Modal>
      )}
    </main>
  );
}

function Joystick({
  onMove,
  disabled,
}: {
  onMove: (x: number, y: number) => void;
  disabled: boolean;
}) {
  const control = useRef<HTMLDivElement>(null),
    pointer = useRef<number | null>(null),
    [thumb, setThumb] = useState({ x: 0, y: 0 });
  const update = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || pointer.current !== e.pointerId || !control.current) return;
    const box = control.current.getBoundingClientRect(),
      x = e.clientX - box.left - box.width / 2,
      y = e.clientY - box.top - box.height / 2,
      length = Math.hypot(x, y),
      max = box.width * 0.29,
      scale = length > max ? max / length : 1;
    setThumb({ x: x * scale, y: y * scale });
    onMove(
      length < 7 ? 0 : (x * scale) / max,
      length < 7 ? 0 : (y * scale) / max,
    );
  };
  const release = () => {
    pointer.current = null;
    setThumb({ x: 0, y: 0 });
    onMove(0, 0);
  };
  return (
    <div
      className="joystick"
      ref={control}
      aria-label="Movement thumbstick"
      onPointerDown={(e) => {
        if (disabled || pointer.current !== null) return;
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={update}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <span className="stick-guide">✥</span>
      <span
        className="stick-thumb"
        style={{
          transform: `translate(${disabled ? 0 : thumb.x}px, ${disabled ? 0 : thumb.y}px)`,
        }}
      />
      <small>MOVE</small>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <span className="card-symbol">
        <Coffee />
      </span>
      <h2 id="modal-title">{title}</h2>
      {children}
    </dialog>
  );
}
