import { expect, it } from 'vitest';
import { createGame } from './game';
import { emptyProgress, readProgress, recordRound, writeProgress, type StorageAccess } from './storage';

it('persists and restores only the top five scores and unique completed challenges', () => {
  let value: string | null = null;
  const storage: StorageAccess = { getItem: () => value, setItem: (_key, next) => { value = next; } };
  let progress = emptyProgress();
  for (const score of [300, 0, 100, 800, 200, 500, 400]) {
    progress = recordRound(progress, { ...createGame(0), ended: true, score, served: score / 100 });
  }
  expect(progress.scores).toEqual([800, 500, 400, 300, 200]);
  expect(progress.completed).toEqual(['first-ship', 'clean-build']);
  expect(writeProgress(storage, progress)).toBe('');
  expect(readProgress(storage)).toEqual({ progress, warning: '' });
  expect(recordRound(progress, createGame(0))).toBe(progress);
});

it('reports malformed, unsupported, or invalid stored data explicitly', () => {
  for (const value of ['broken', 'null', '{"version":2}', '{"version":1,"scores":[-5],"completed":[]}', '{"version":1,"scores":[],"completed":["unknown"]}', '{"version":1,"scores":[1.5],"completed":[]}']) {
    const result = readProgress({ getItem: () => value, setItem: () => {} });
    expect(result.progress).toEqual(emptyProgress());
    expect(result.warning).toContain('unreadable');
  }
});

it('distinguishes fresh storage from inaccessible storage and failed saves', () => {
  expect(readProgress({ getItem: () => null, setItem: () => {} }).warning).toBe('');
  const blocked: StorageAccess = { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Quota'); } };
  expect(readProgress(blocked).warning).toContain('unavailable');
  expect(writeProgress(blocked, emptyProgress())).toContain('could not be saved');
});
