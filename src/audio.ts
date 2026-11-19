export class KitchenAudio {
  private context: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private voices = new Set<OscillatorNode>();
  private step = 0;
  private generation = 0;

  async start(): Promise<void> {
    this.stop();
    const generation = this.generation;
    this.context ??= new AudioContext();
    const context = this.context;
    await context.resume();
    if (generation !== this.generation) return;
    if (context.state !== 'running') throw new Error('Audio could not start');
    const melody = [72, 76, 79, 76, 74, 77, 81, 79, 72, 76, 79, 84, 81, 79, 76, 74];
    this.timer = setInterval(() => {
      this.tone(melody[this.step % melody.length], 0.13, 0.035);
      if (this.step % 2 === 0) this.tone([48, 53, 45, 55][Math.floor(this.step / 4) % 4], 0.19, 0.035);
      this.step += 1;
    }, 190);
  }

  private tone(note: number, duration: number, volume: number): void {
    const context = this.context;
    if (!context || context.state !== 'running' || this.timer === null) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    this.voices.add(oscillator);
    oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  serve(): void { this.tone(88, 0.2, 0.075); this.tone(76, 0.15, 0.05); }
  burn(): void { this.tone(40, 0.3, 0.06); }

  stop(): void {
    this.generation += 1;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.step = 0;
    for (const voice of this.voices) voice.stop();
    this.voices.clear();
  }

  async dispose(): Promise<void> {
    this.stop();
    const context = this.context;
    this.context = null;
    if (context) await context.close();
  }
}
