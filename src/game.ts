import { recipeFor, recipes, stationFor, stations, type ChallengeId, type RecipeId, type StationId } from './content';

export const ROUND_MS = 60_000;
export interface Order { id: number; recipe: RecipeId }
export interface Batch { orderId: number; recipe: RecipeId; startedAt: number; burned: boolean; safe?: boolean }
export interface Game {
  startedAt: number;
  ended: boolean;
  practice: boolean;
  orders: Order[];
  selected: number | null;
  stations: Record<StationId, Batch | null>;
  nextId: number;
  score: number;
  served: number;
  burns: number;
  perfects: number;
  lastPerfect: { station: StationId; at: number } | null;
  servedRecipes: RecipeId[];
  message: string;
}

export const SERVE_POINTS = 100;
export const PERFECT_BONUS = 25;
export const PERFECT_WINDOW_MS = 1000;

export type Action = { type: 'tick' } | { type: 'select'; id: number } | { type: 'station'; station: StationId };
export type BatchPhase = 'cooking' | 'ready' | 'burned';
export type TutorialStep = 'select' | 'cook' | 'parallel' | 'wait' | 'serve' | 'done';

export function phase(batch: Batch, now: number): BatchPhase {
  const recipe = recipeFor(batch.recipe);
  const elapsed = now - batch.startedAt;
  // Practice batches never burn so the tutorial stays forgiving.
  return !batch.safe && elapsed >= recipe.cookMs + recipe.serveMs ? 'burned' : elapsed >= recipe.cookMs ? 'ready' : 'cooking';
}

export const TICKET_COUNT = 3;

export function createGame(now: number, practice = false): Game {
  return {
    startedAt: now, ended: false, practice,
    orders: recipes.slice(0, TICKET_COUNT).map((recipe, id) => ({ id, recipe: recipe.id })),
    selected: practice ? null : 0,
    stations: Object.fromEntries(stations.map(station => [station.id, null])) as Record<StationId, Batch | null>,
    nextId: TICKET_COUNT,
    score: 0, served: 0, burns: 0, perfects: 0, lastPerfect: null, servedRecipes: [],
    message: practice ? 'Practice kitchen: no timer, no burning. Follow the coach!' : 'Select a ticket, then click its station to start cooking.',
  };
}

export function remainingMs(game: Game, now: number): number {
  if (game.practice) return ROUND_MS;
  return Math.max(0, ROUND_MS - (now - game.startedAt));
}

function replaceOrder(game: Game, orderId: number): void {
  game.orders = game.orders.map(order => order.id === orderId
    ? { id: game.nextId, recipe: recipes[game.nextId % recipes.length].id }
    : order);
  game.nextId += 1;
}

export function transition(previous: Game, action: Action, now: number): Game {
  if (previous.ended) return previous;
  const game: Game = { ...previous, stations: { ...previous.stations } };
  // Clamp synchronization to the deadline so background time cannot add late burns.
  const observedAt = Math.min(now, game.startedAt + ROUND_MS);
  for (const { id } of stations) {
    const batch = game.stations[id];
    if (batch && !batch.burned && phase(batch, observedAt) === 'burned') {
      game.stations[id] = { ...batch, burned: true };
      game.burns += 1;
      game.message = `${recipeFor(batch.recipe).short} burned! Clear the station to try again.`;
    }
  }
  if (remainingMs(game, now) === 0) {
    game.ended = true;
    game.message = 'Time! Your kitchen is closed.';
    return game;
  }
  if (action.type === 'select') {
    const order = game.orders.find(item => item.id === action.id);
    if (!order) return game;
    game.selected = order.id;
    game.message = `${recipeFor(order.recipe).short} selected. Click the ${stationFor(recipeFor(order.recipe).station).name.toLowerCase()}.`;
  }
  if (action.type === 'station') {
    const batch = game.stations[action.station];
    if (batch) {
      const state = phase(batch, now);
      if (state === 'cooking') {
        game.message = 'Still cooking. Keep an eye on the other station!';
      } else {
        game.stations[action.station] = null;
        replaceOrder(game, batch.orderId);
        if (state === 'ready') {
          const perfect = now - batch.startedAt - recipeFor(batch.recipe).cookMs <= PERFECT_WINDOW_MS;
          game.score += SERVE_POINTS + (perfect ? PERFECT_BONUS : 0);
          game.served += 1;
          game.servedRecipes = [...new Set([...game.servedRecipes, batch.recipe])];
          if (perfect) {
            game.perfects += 1;
            game.lastPerfect = { station: action.station, at: now };
          }
          game.message = perfect
            ? `Perfect! ${recipeFor(batch.recipe).short} shipped hot. +${SERVE_POINTS + PERFECT_BONUS} points.`
            : `${recipeFor(batch.recipe).short} shipped! +${SERVE_POINTS} points. Select your next ticket.`;
        } else {
          game.message = 'Station cleared. Select a ticket and get cooking!';
        }
      }
    } else {
      const order = game.orders.find(item => item.id === game.selected);
      if (!order) game.message = 'Select an order ticket first.';
      else if (recipeFor(order.recipe).station !== action.station) game.message = 'Wrong station. Follow the station label on your ticket.';
      else if (Object.values(game.stations).some(item => item?.orderId === order.id)) game.message = 'That order is already cooking.';
      else {
        game.stations[action.station] = { orderId: order.id, recipe: order.recipe, startedAt: now, burned: false, safe: game.practice };
        game.selected = null;
        game.message = `${recipeFor(order.recipe).short} cooking. Start another order while you wait!`;
      }
    }
  }
  return game;
}

export function tutorialStep(game: Game, now: number): TutorialStep {
  if (game.served >= 2) return 'done';
  const busy = Object.values(game.stations).filter((batch): batch is Batch => batch !== null);
  if (busy.some(batch => phase(batch, now) === 'ready')) return 'serve';
  if (busy.length === 0) return game.selected === null ? 'select' : 'cook';
  if (busy.length === 1 && game.served === 0) return 'parallel';
  return 'wait';
}

export function earnedChallenges(game: Game): ChallengeId[] {
  const earned: ChallengeId[] = [];
  if (game.served > 0) earned.push('first-ship');
  if (recipes.every(recipe => game.servedRecipes.includes(recipe.id))) earned.push('full-stack');
  if (game.ended && game.served >= 5 && game.burns === 0) earned.push('clean-build');
  return earned;
}
