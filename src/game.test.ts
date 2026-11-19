import { describe, expect, it } from 'vitest';
import { boardItems, boardPrompt } from './content';
import { createGame, earnedChallenges, remainingMs, transition, tutorialStep, type Game } from './game';

const station = (game: Game, id: 'waffle' | 'cooktop' | 'espresso', now: number) => transition(game, { type: 'station', station: id }, now);
const select = (game: Game, id: number, now: number) => transition(game, { type: 'select', id }, now);

describe('kitchen transitions', () => {
  it('cooks independent orders, enforces readiness, and replaces served tickets', () => {
    let game = station(createGame(0), 'waffle', 0);
    game = station(select(game, 2, 0), 'cooktop', 0);
    expect(game.stations.waffle?.recipe).toBe('waffles');
    expect(game.stations.cooktop?.recipe).toBe('pancakes');
    game = station(game, 'cooktop', 2999);
    expect(game.score).toBe(0);
    expect(game.stations.cooktop).not.toBeNull();
    game = station(game, 'cooktop', 3000);
    expect(game.score).toBe(125);
    expect(game.orders.map(order => order.id)).toEqual([0, 1, 3]);
    game = station(game, 'waffle', 4000);
    expect(game.served).toBe(2);
    expect(game.servedRecipes).toEqual(['pancakes', 'waffles']);
    expect(game.orders).toHaveLength(3);
  });

  it('prevents incompatible starts, duplicate starts, and busy-station overwrites', () => {
    const initial = createGame(0);
    expect(station(initial, 'cooktop', 0).stations.cooktop).toBeNull();
    let game = station(initial, 'waffle', 0);
    game = station(select(game, 0, 100), 'cooktop', 100);
    expect(game.stations.cooktop).toBeNull();
    game = station(select(game, 2, 200), 'waffle', 200);
    expect(game.stations.waffle?.recipe).toBe('waffles');
    expect(initial.stations.waffle).toBeNull();
  });

  it('burns at the exact boundary, counts once, and requires cleanup', () => {
    let game = station(createGame(0), 'waffle', 0);
    expect(station(game, 'waffle', 8999).score).toBe(100);
    game = transition(game, { type: 'tick' }, 9000);
    expect(game.burns).toBe(1);
    expect(game.stations.waffle?.burned).toBe(true);
    game = transition(game, { type: 'tick' }, 9500);
    expect(game.burns).toBe(1);
    game = station(game, 'waffle', 9600);
    expect(game.stations.waffle).toBeNull();
    expect(game.score).toBe(0);
    expect(game.orders[0].id).toBe(3);
  });

  it('ends at 60 seconds before processing late actions, even after a background gap', () => {
    let game = station(createGame(100), 'waffle', 56_100);
    game = station(game, 'waffle', 60_100);
    expect(game.ended).toBe(true);
    expect(game.score).toBe(0);
    expect(game.burns).toBe(0);
    expect(transition(game, { type: 'tick' }, 99_000)).toBe(game);
    const backgrounded = transition(station(createGame(0), 'waffle', 59_000), { type: 'tick' }, 120_000);
    expect(backgrounded.ended).toBe(true);
    expect(backgrounded.burns).toBe(0);
    expect(remainingMs(backgrounded, 120_000)).toBe(0);
  });

  it('resets every transient field for replay and ignores unknown tickets', () => {
    const game = station(station(createGame(0), 'waffle', 0), 'waffle', 4000);
    expect(select(game, 999, 5000).selected).toBeNull();
    const replay = createGame(70_000);
    expect(replay.score).toBe(0);
    expect(replay.servedRecipes).toEqual([]);
    expect(replay.stations).toEqual({ waffle: null, cooktop: null, espresso: null });
    expect(replay.orders.map(order => order.id)).toEqual([0, 1, 2]);
    expect(replay.ended).toBe(false);
    expect(remainingMs(replay, 70_000)).toBe(60_000);
  });
});

it('awards full-stack and clean-build only when their actual conditions are met', () => {
  const game: Game = { ...createGame(0), served: 5, servedRecipes: ['waffles', 'latte', 'pancakes', 'cookie'] };
  expect(earnedChallenges(game)).toEqual(['first-ship', 'full-stack']);
  expect(earnedChallenges({ ...game, ended: true })).toContain('clean-build');
  expect(earnedChallenges({ ...game, ended: true, burns: 1 })).not.toContain('clean-build');
  expect(earnedChallenges({ ...game, ended: true, served: 4 })).not.toContain('clean-build');
  expect(earnedChallenges({ ...game, servedRecipes: ['waffles'] })).not.toContain('full-stack');
});

it('brews lattes only at the espresso bar, alongside the other stations', () => {
  let game = select(createGame(0), 1, 0);
  expect(station(game, 'cooktop', 0).stations.cooktop).toBeNull();
  game = station(game, 'espresso', 0);
  game = station(select(game, 0, 0), 'waffle', 0);
  game = station(select(game, 2, 0), 'cooktop', 0);
  expect(Object.values(game.stations).map(batch => batch?.recipe)).toEqual(['waffles', 'pancakes', 'latte']);
  game = station(game, 'espresso', 2500);
  expect(game.served).toBe(1);
  expect(game.stations.espresso).toBeNull();
  expect(earnedChallenges({ ...game, servedRecipes: ['waffles', 'pancakes', 'cookie'] })).not.toContain('full-stack');
});

it('runs an untimed, burn-free practice that coaches each tutorial step', () => {
  let game = createGame(0, true);
  expect(tutorialStep(game, 0)).toBe('select');
  game = select(game, 0, 0);
  expect(tutorialStep(game, 0)).toBe('cook');
  game = station(game, 'waffle', 0);
  expect(tutorialStep(game, 100)).toBe('parallel');
  game = station(select(game, 1, 100), 'espresso', 100);
  expect(tutorialStep(game, 200)).toBe('wait');
  expect(tutorialStep(game, 2600)).toBe('serve');
  game = transition(game, { type: 'tick' }, 120_000);
  expect(game.ended).toBe(false);
  expect(game.burns).toBe(0);
  game = station(station(game, 'espresso', 120_000), 'waffle', 120_000);
  expect(game.served).toBe(2);
  expect(tutorialStep(game, 120_000)).toBe('done');
  expect(createGame(0).practice).toBe(false);
});
it('awards a +25 perfect bonus only within 1 second of READY', () => {
  const cooking = station(createGame(0), 'waffle', 0);
  const perfect = station(cooking, 'waffle', 5000);
  expect(perfect.score).toBe(125);
  expect(perfect.perfects).toBe(1);
  expect(perfect.lastPerfect).toEqual({ station: 'waffle', at: 5000 });
  expect(perfect.message).toContain('Perfect!');
  const late = station(cooking, 'waffle', 5001);
  expect(late.score).toBe(100);
  expect(late.perfects).toBe(0);
  expect(late.lastPerfect).toBeNull();
});

it('gives every Build Board item a unique ID that its copy prompt references', () => {
  expect(new Set(boardItems.map(item => item.id)).size).toBe(boardItems.length);
  for (const item of boardItems) expect(boardPrompt(item)).toContain(`mark ${item.id} Done`);
});
