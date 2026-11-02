import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How close to a bottle neck a ring must land to score. */
export const NECK_RADIUS = 14;
/** The furthest a ring can drift from where you aimed. */
export const SCATTER = 12;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 30 } as const;
const BOTTLES_PER_ROW = 5;
/** Back row first: further rows score more. */
const ROWS = [
  { y: 110, points: 30 },
  { y: 180, points: 20 },
  { y: 250, points: 10 },
];

export interface Bottle {
  x: number;
  y: number;
  points: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface Ringer {
  x: number;
  y: number;
  points: number;
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  rings: Ring[];
  ringers: Ringer[];
  /** Rings that landed on a bottle, drawn around its neck. */
  hooked: { x: number; y: number }[];
  ringsLeft: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = 110;
  const left = WIDTH / 2 - (spacing * (BOTTLES_PER_ROW - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      points: row.points,
    })),
  );
  return {
    bottles,
    rings: [],
    ringers: [],
    hooked: [],
    ringsLeft: RINGS_PER_ROUND,
    score: 0,
    phase: 'playing',
  };
}

/** The bottle whose neck a ring landing at (x, y) goes over, if any. */
export function bottleAt(bottles: readonly Bottle[], x: number, y: number): Bottle | undefined {
  return bottles.find((b) => Math.hypot(x - b.x, y - b.y) <= NECK_RADIUS);
}

/**
 * Throws one ring towards the aim point. The ring lands up to SCATTER pixels
 * away from it; `random` returns numbers in [0, 1). Returns false if nothing
 * was thrown.
 */
export function toss(
  state: RingTossState,
  aimX: number,
  aimY: number,
  random: () => number = Math.random,
): boolean {
  if (state.phase !== 'playing' || state.ringsLeft === 0) return false;
  const angle = random() * Math.PI * 2;
  const drift = random() * SCATTER;
  state.rings.push({
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + Math.cos(angle) * drift,
    toY: Math.min(aimY, THROWER.y - 1) + Math.sin(angle) * drift,
    age: 0,
  });
  state.ringsLeft -= 1;
  return true;
}

/** Where a ring is in its flight, with its height above the ground. */
export function ringPosition(ring: Ring): { x: number; y: number; lift: number } {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t,
    lift: Math.sin(t * Math.PI) * 80,
  };
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  const flying: Ring[] = [];
  for (const ring of state.rings) {
    ring.age += dt;
    if (ring.age < FLIGHT_TIME) {
      flying.push(ring);
      continue;
    }
    const bottle = bottleAt(state.bottles, ring.toX, ring.toY);
    if (bottle) {
      state.score += bottle.points;
      state.hooked.push({ x: bottle.x, y: bottle.y });
      state.ringers.push({ x: bottle.x, y: bottle.y, points: bottle.points, age: 0 });
    }
  }
  state.rings = flying;

  for (const ringer of state.ringers) ringer.age += dt;
  state.ringers = state.ringers.filter((r) => r.age < 0.8);

  if (state.ringsLeft === 0 && state.rings.length === 0) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The table the bottles stand on.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(60, 80, WIDTH - 120, 240);

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    // The neck's mouth sits at (x, y), where a ring has to land.
    ctx.fillRect(bottle.x - 12, bottle.y + 10, 24, 30);
    ctx.fillRect(bottle.x - 4, bottle.y, 8, 12);
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(bottle.x, bottle.y, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('small', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(String(bottle.points), bottle.x, bottle.y + 56);
  }

  for (const ring of state.hooked) drawRing(ctx, ring.x, ring.y);

  for (const ring of state.rings) {
    const { x, y, lift } = ringPosition(ring);
    drawRing(ctx, x, y - lift);
  }

  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'center';
  for (const ringer of state.ringers) {
    ctx.globalAlpha = 1 - ringer.age / 0.8;
    ctx.fillStyle = colors.accent;
    ctx.fillText(`+${ringer.points}`, ringer.x, ringer.y - 14 - ringer.age * 40);
  }
  ctx.globalAlpha = 1;

  // Aim marker.
  if (state.phase === 'playing') {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, aim.y, SCATTER, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Rings still in hand.
  for (let i = 0; i < state.ringsLeft; i++) drawRing(ctx, WIDTH / 2 - 140 + i * 40, THROWER.y);

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.ringsLeft}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: 180 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        toss(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
