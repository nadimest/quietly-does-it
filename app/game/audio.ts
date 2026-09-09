export class GameAudio {
  context: AudioContext | null = null;
  enabled = false;
  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) {
      this.context ??= new AudioContext();
      void this.context.resume().catch(() => {});
      this.play('breath');
    }
  }
  play(kind: string) {
    if (!this.enabled || !this.context || this.context.state !== 'running')
      return;
    const notes =
      kind === 'win'
        ? [392, 494, 587, 784]
        : kind === 'pickup'
          ? [523, 659]
          : kind === 'hello'
            ? [330, 392]
            : kind === 'fail'
              ? [330, 262]
              : kind === 'boundary'
                ? [440, 554]
                : [262, 330, 392];
    notes.forEach((frequency, i) => {
      const ctx = this.context!,
        osc = ctx.createOscillator(),
        gain = ctx.createGain(),
        start = ctx.currentTime + i * 0.1;
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }
  dispose() {
    void this.context?.close().catch(() => {});
  }
}
