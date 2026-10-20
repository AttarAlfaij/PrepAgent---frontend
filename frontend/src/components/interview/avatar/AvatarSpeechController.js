/**
 * AvatarSpeechController
 * Controls Web Speech API Text-to-Speech synthesis and generates
 * real-time jaw rotation and mouth opening oscillations for lip animation.
 */

export class AvatarSpeechController {
  constructor({ onSpeakingStart, onSpeakingEnd } = {}) {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.onSpeakingStart = onSpeakingStart;
    this.onSpeakingEnd = onSpeakingEnd;

    this.isSpeaking = false;
    this.mouthOpen = 0.0;
    this.speechRate = 1.0;
    this.speechPitch = 1.0;
    this.speechVolume = 1.0;

    this.oscillationPhase = 0;
    this.currentUtterance = null;
    this.safetyTimeout = null;
  }

  setRate(rate) {
    this.speechRate = Math.max(0.7, Math.min(1.4, Number(rate) || 1.0));
  }

  setPitch(pitch) {
    this.speechPitch = Math.max(0.8, Math.min(1.3, Number(pitch) || 1.0));
  }

  speak(text, isMuted = false) {
    this.stop();

    if (!text || typeof text !== 'string') {
      if (this.onSpeakingEnd) this.onSpeakingEnd();
      return;
    }

    if (isMuted || !this.synth) {
      // If muted or TTS unavailable, simulate speaking visually for natural reading time
      this.isSpeaking = true;
      if (this.onSpeakingStart) this.onSpeakingStart();

      const durationMs = Math.min(9000, Math.max(3000, text.length * 50));
      this.safetyTimeout = setTimeout(() => {
        this.stop();
        if (this.onSpeakingEnd) this.onSpeakingEnd();
      }, durationMs);
      return;
    }

    try {
      this.synth.cancel();
    } catch (_) {}

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.speechRate;
    utterance.pitch = this.speechPitch;
    utterance.volume = this.speechVolume;

    // Pick natural English voice if available
    const voices = this.synth.getVoices?.() || [];
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang?.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Female') ||
            v.name.includes('Victoria') ||
            v.name.includes('Zira'))
      ) || voices.find((v) => v.lang?.startsWith('en'));

    if (preferredVoice) utterance.voice = preferredVoice;

    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        this.isSpeaking = false;
        this.mouthOpen = 0;
        clearTimeout(this.safetyTimeout);
        if (this.onSpeakingEnd) this.onSpeakingEnd();
      }
    };

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onSpeakingStart) this.onSpeakingStart();
    };

    utterance.onend = finish;
    utterance.onerror = (err) => {
      console.warn('[AvatarSpeechController] TTS error:', err?.error || err);
      finish();
    };

    // Safety timeout in case browser TTS drops onend
    const expectedTimeMs = Math.max(4000, text.length * 85);
    this.safetyTimeout = setTimeout(() => {
      finish();
    }, expectedTimeMs);

    this.currentUtterance = utterance;

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[AvatarSpeechController] speak failure:', err);
      finish();
    }
  }

  stop() {
    clearTimeout(this.safetyTimeout);
    this.isSpeaking = false;
    this.mouthOpen = 0.0;
    try {
      if (this.synth?.speaking) {
        this.synth.cancel();
      }
    } catch (_) {}
  }

  update(deltaTime) {
    if (!this.isSpeaking) {
      this.mouthOpen = 0.0;
      return { isSpeaking: false, mouthOpen: 0.0, jawRotation: 0.0 };
    }

    const dt = Math.min(deltaTime, 0.1);
    // Syllable oscillation: ~4.5Hz human speech frequency with harmonic jitter
    this.oscillationPhase += dt * 28.0;
    const primaryWave = Math.sin(this.oscillationPhase);
    const harmonicWave = Math.sin(this.oscillationPhase * 1.8) * 0.4;
    const rawAmplitude = Math.max(0, primaryWave + harmonicWave);

    // Dynamic mouth open (0.0 to 0.65)
    this.mouthOpen = Math.min(0.65, rawAmplitude * 0.55);
    const jawRotation = this.mouthOpen * 0.18; // radians

    return {
      isSpeaking: true,
      mouthOpen: this.mouthOpen,
      jawRotation,
    };
  }
}
