import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  SCATTER,
  THROWER,
  bottleAt,
  createState,
  step,
  toss,
} from './game';

/** A throw that lands exactly where it was aimed. */
const noDrift = () => 0;

describe('ring toss', () => {
  it('starts with a full hand of rings and no score', () => {
    const state = createState();
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles.length).toBeGreaterThan(0);
  });

  it('uses one ring per toss', () => {
    const state = createState();
    expect(toss(state, 400, 180, noDrift)).toBe(true);
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND - 1);
    expect(state.rings).toHaveLength(1);
  });

  it('cannot toss once the rings run out', () => {
    const state = createState();
    state.ringsLeft = 0;
    expect(toss(state, 400, 180, noDrift)).toBe(false);
    expect(state.rings).toHaveLength(0);
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    toss(state, bottle.x, bottle.y, noDrift);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(bottle.points);
    expect(state.rings).toHaveLength(0);
  });

  it('scores nothing for a ring that misses every bottle', () => {
    const state = createState();
    toss(state, 10, THROWER.y - 10, noDrift);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
  });

  it('does not score a ring until it lands', () => {
    const state = createState();
    const bottle = state.bottles[0];
    toss(state, bottle.x, bottle.y, noDrift);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.rings).toHaveLength(1);
  });

  it('scores bottles further back higher', () => {
    const { bottles } = createState();
    const back = bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('lands a ring no further than SCATTER from the aim', () => {
    const state = createState();
    toss(state, 400, 180, () => 0.999);
    const ring = state.rings[0];
    expect(Math.hypot(ring.toX - 400, ring.toY - 180)).toBeLessThanOrEqual(SCATTER);
  });

  it('finds a bottle only within the neck radius', () => {
    const { bottles } = createState();
    const bottle = bottles[0];
    expect(bottleAt(bottles, bottle.x + NECK_RADIUS - 1, bottle.y)).toBe(bottle);
    expect(bottleAt(bottles, bottle.x + NECK_RADIUS + 1, bottle.y)).toBeUndefined();
  });

  it('ends the round when the rings run out and the last ring has landed', () => {
    const state = createState();
    for (let i = 0; i < RINGS_PER_ROUND; i++) toss(state, 400, 180, noDrift);
    expect(toss(state, 400, 180, noDrift)).toBe(false);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
  });
});
