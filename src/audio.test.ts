import { afterEach, expect, it, vi } from 'vitest';
import { KitchenAudio } from './audio';

function fakeContext(resume: () => Promise<void> = () => Promise.resolve()) {
  const start = vi.fn();
  const stop = vi.fn();
  const context = {
    state: 'running', currentTime: 0, destination: {},
    resume, close: vi.fn(() => Promise.resolve()),
    createOscillator: () => ({
      type: '', frequency: { value: 0 }, start, stop,
      connect: () => ({ connect: vi.fn() }), disconnect: vi.fn(), onended: null,
    }),
    createGain: () => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      disconnect: vi.fn(),
    }),
  };
  vi.stubGlobal('AudioContext', class { constructor() { return context; } });
  return { context, start, stop };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('plays only after opt-in and stops music and effects together on mute', async () => {
  vi.useFakeTimers();
  const { start, stop } = fakeContext();
  const audio = new KitchenAudio();
  audio.serve();
  expect(start).not.toHaveBeenCalled();
  await audio.start();
  vi.advanceTimersByTime(190);
  expect(start).toHaveBeenCalledTimes(2);
  audio.serve();
  expect(start).toHaveBeenCalledTimes(4);
  audio.stop();
  expect(stop).toHaveBeenCalled();
  audio.serve();
  audio.burn();
  vi.advanceTimersByTime(1000);
  expect(start).toHaveBeenCalledTimes(4);
  await audio.dispose();
});

it('does not restart music if audio resume finishes after leaving the round', async () => {
  vi.useFakeTimers();
  let finishResume = () => {};
  const { start } = fakeContext(() => new Promise<void>(resolve => { finishResume = resolve; }));
  const audio = new KitchenAudio();
  const pending = audio.start();
  audio.stop();
  finishResume();
  await pending;
  vi.advanceTimersByTime(1000);
  expect(start).not.toHaveBeenCalled();
  await audio.dispose();
});

it('surfaces audio initialization failure to its caller', async () => {
  fakeContext(() => Promise.reject(new Error('Audio blocked')));
  const audio = new KitchenAudio();
  await expect(audio.start()).rejects.toThrow('Audio blocked');
  await audio.dispose();
});
