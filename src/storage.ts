import { challenges, type ChallengeId } from './content';
import { earnedChallenges, type Game } from './game';

export const STORAGE_KEY = 'sweet-stack.progress.v1';
export interface Progress { version: 1; scores: number[]; completed: ChallengeId[] }
export interface StorageAccess { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const emptyProgress = (): Progress => ({ version: 1, scores: [], completed: [] });

export function readProgress(storage: StorageAccess): { progress: Progress; warning: string } {
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); }
  catch { return { progress: emptyProgress(), warning: 'Browser storage is unavailable. Progress will only last until this page is closed.' }; }
  if (raw === null) return { progress: emptyProgress(), warning: '' };
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1
      || !('scores' in data) || !Array.isArray(data.scores) || data.scores.length > 5
      || !data.scores.every((score: unknown) => typeof score === 'number' && Number.isSafeInteger(score) && score >= 0)
      || !('completed' in data) || !Array.isArray(data.completed)
      || !data.completed.every((id: unknown) => challenges.some(challenge => challenge.id === id))) {
      throw new Error('Invalid saved progress');
    }
    return { progress: { version: 1, scores: [...data.scores].sort((a: number, b: number) => b - a), completed: [...new Set<ChallengeId>(data.completed)] }, warning: '' };
  } catch {
    return { progress: emptyProgress(), warning: 'Saved progress was unreadable and has been reset for this session. Your next completed round will replace it.' };
  }
}

export function recordRound(progress: Progress, game: Game): Progress {
  if (!game.ended) return progress;
  return {
    version: 1,
    scores: [...progress.scores, game.score].sort((a, b) => b - a).slice(0, 5),
    completed: [...new Set([...progress.completed, ...earnedChallenges(game)])],
  };
}

export function writeProgress(storage: StorageAccess, progress: Progress): string {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(progress)); return ''; }
  catch { return 'Progress could not be saved to this browser. You can keep playing; scores will remain in this session only.'; }
}

export function browserProgress(): { progress: Progress; warning: string } {
  // Access to localStorage itself may throw in restricted browser environments.
  try { return readProgress(window.localStorage); }
  catch { return { progress: emptyProgress(), warning: 'Browser storage is unavailable. Scores will remain in this session only.' }; }
}

export function saveBrowserProgress(progress: Progress): string {
  try { return writeProgress(window.localStorage, progress); }
  catch { return 'Browser storage is unavailable. Scores will remain in this session only.'; }
}
