export type StationId = 'waffle' | 'cooktop' | 'espresso';
export type RecipeId = 'waffles' | 'latte' | 'pancakes' | 'cookie';

export interface Recipe {
  id: RecipeId;
  name: string;
  short: string;
  station: StationId;
  cookMs: number;
  serveMs: number;
  accent: string;
  tag: string;
}

export const recipes: Recipe[] = [
  { id: 'waffles', name: 'Pull Request Waffles', short: 'Waffles', station: 'waffle', cookMs: 4000, serveMs: 5000, accent: '#d2a8ff', tag: 'GitHub special' },
  { id: 'latte', name: 'Copilot Latte', short: 'Latte', station: 'espresso', cookMs: 2500, serveMs: 3500, accent: '#e3b341', tag: 'Pair-programmer fuel' },
  { id: 'pancakes', name: 'Azure Pancakes', short: 'Pancakes', station: 'cooktop', cookMs: 3000, serveMs: 4000, accent: '#79c0ff', tag: 'Microsoft special' },
  { id: 'cookie', name: 'VS Code Cookie Skillet', short: 'Cookie skillet', station: 'cooktop', cookMs: 5000, serveMs: 4000, accent: '#56d4dd', tag: 'Editor favorite' },
];

export function recipeFor(id: RecipeId): Recipe {
  return recipes.find(recipe => recipe.id === id)!;
}

export const stations: { id: StationId; name: string; label: string }[] = [
  { id: 'waffle', name: 'Waffle iron', label: '01 / PULL REQUEST PRESS' },
  { id: 'cooktop', name: 'Cooktop', label: '02 / HOT RELOAD HOB' },
  { id: 'espresso', name: 'Espresso bar', label: '03 / CONTINUOUS BREW' },
];

export function stationFor(id: StationId) {
  return stations.find(station => station.id === id)!;
}

export const challenges = [
  { id: 'first-ship', name: 'Hello, waffle!', description: 'Serve your first dish.' },
  { id: 'full-stack', name: 'Full-stack chef', description: `Serve all ${recipes.length} recipes in one round.` },
  { id: 'clean-build', name: 'Clean build', description: 'Finish with 5+ dishes and zero burns.' },
] as const;
export type ChallengeId = typeof challenges[number]['id'];

export interface BoardItem {
  id: string;
  title: string;
  description: string;
  category: 'Gameplay' | 'Experience' | 'Content';
  status: 'Planned' | 'In Progress' | 'Done';
}

export const boardItems: BoardItem[] = [
  { id: 'GAME-01', title: 'The 60-second kitchen', description: 'Parallel stations, concurrent orders, burn timers, and instant replay.', category: 'Gameplay', status: 'Done' },
  { id: 'EXP-01', title: 'A little booth magic', description: 'Opt-in original music, local scores, and shared-browser challenges.', category: 'Experience', status: 'Done' },
  { id: 'CONTENT-01', title: 'The starter menu', description: 'Waffles, pancakes, and a cookie skillet. Three very sweet releases.', category: 'Content', status: 'Done' },
  { id: 'GAME-04', title: 'The espresso bar', description: 'A third station brewing quick Copilot Lattes with a short serving window.', category: 'Gameplay', status: 'Done' },
  { id: 'EXP-02', title: 'Practice kitchen tutorial', description: 'An untimed, burn-free guided run that teaches select, cook, multitask, and serve.', category: 'Experience', status: 'Done' },
  { id: 'GAME-02', title: 'Merge your toppings', description: 'Add a finishing counter with berries, syrup, and sprinkles.', category: 'Gameplay', status: 'Planned' },
  { id: 'GAME-03', title: 'Combo commits', description: 'Reward a streak of perfectly timed dishes.', category: 'Gameplay', status: 'Planned' },
  { id: 'CONTENT-02', title: 'Expand the sweet stack', description: 'More developer-inspired recipes and a new baking station.', category: 'Content', status: 'Planned' },
  { id: 'GAME-05', title: 'Golden tickets', description: 'Occasionally spawn a sparkly golden order worth double points.', category: 'Gameplay', status: 'Planned' },
  { id: 'GAME-06', title: 'Rush hour', description: 'Orders served in the final 10 seconds earn +50% points, with a pulsing timer.', category: 'Gameplay', status: 'Planned' },
  { id: 'GAME-07', title: 'Perfect plating', description: 'Serve within 1 second of READY for a +25 "Perfect!" bonus popup.', category: 'Gameplay', status: 'Done' },
  { id: 'EXP-03', title: 'Confetti deploys', description: 'A small confetti burst on every serve, skipped when reduced motion is on.', category: 'Experience', status: 'Planned' },
  { id: 'EXP-04', title: 'Chef job titles', description: 'Results show a fun rank by score, from Junior Dev to Principal Pastry Engineer.', category: 'Experience', status: 'Planned' },
  { id: 'EXP-05', title: 'Works on my stove', description: 'Rotate funny developer quips whenever food burns.', category: 'Experience', status: 'Planned' },
  { id: 'EXP-06', title: 'Station sound effects', description: 'Synthesized waffle-iron clunk, cooktop sizzle, and espresso hiss when cooking starts.', category: 'Experience', status: 'Planned' },
  { id: 'EXP-07', title: 'Booth attract mode', description: 'After 30 idle seconds, gently animate the start screen to invite passersby.', category: 'Experience', status: 'Planned' },
  { id: 'CONTENT-03', title: 'Ignite crème brûlée', description: 'A flame-torched dessert for the cooktop, made for Microsoft Ignite.', category: 'Content', status: 'Planned' },
  { id: 'CONTENT-04', title: 'Fortune cookies', description: 'Show a random cooking-meets-coding tip or pun on the results screen.', category: 'Content', status: 'Planned' },
];

export function boardPrompt(item: BoardItem): string {
  return `Implement ${item.id} "${item.title}" in Sweet Stack: ${item.description} Keep it small, add focused tests for any game-logic changes, verify it in the browser, then mark ${item.id} Done on the Build Board.`;
}
