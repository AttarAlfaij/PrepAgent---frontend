/**
 * AvatarAnimationController
 * Controls natural breathing, idle micro-movements, state-based head rotation,
 * and posture transitions for the 3D AI Interviewer Avatar.
 */

export const AVATAR_STATES = {
  IDLE: 'IDLE',
  SPEAKING: 'SPEAKING',
  LISTENING: 'LISTENING',
  THINKING: 'THINKING',
  ANALYZING: 'ANALYZING',
  ENCOURAGING: 'ENCOURAGING',
  COMPLETED: 'COMPLETED',
};

export class AvatarAnimationController {
  constructor() {
    this.currentState = AVATAR_STATES.IDLE;
    this.targetState = AVATAR_STATES.IDLE;

    // Head rotation (radians)
    this.headPitch = 0; // up / down (nodding)
    this.headYaw = 0;   // left / right (looking)
    this.headRoll = 0;  // tilt

    this.targetHeadPitch = 0;
    this.targetHeadYaw = 0;
    this.targetHeadRoll = 0;

    // Torso breathing
    this.breathingPhase = 0;
    this.breathingRate = 0.8; // cycles per second

    // Periodic listening nod timer
    this.nodTimer = 0;
    this.isNodding = false;
    this.nodPhase = 0;

    // Micro-sway jitter
    this.swayPhase = 0;
  }

  setState(state) {
    const normalized = (state || 'IDLE').toUpperCase();
    this.currentState = AVATAR_STATES[normalized] || AVATAR_STATES.IDLE;
    this.targetState = this.currentState;
    this.applyStatePosture();
  }

  applyStatePosture() {
    switch (this.currentState) {
      case AVATAR_STATES.SPEAKING:
        this.targetHeadPitch = -0.02;
        this.targetHeadYaw = 0;
        this.targetHeadRoll = 0;
        break;

      case AVATAR_STATES.LISTENING:
        this.targetHeadPitch = 0.04;
        this.targetHeadYaw = 0.02;
        this.targetHeadRoll = 0.03;
        break;

      case AVATAR_STATES.THINKING:
      case AVATAR_STATES.ANALYZING:
        this.targetHeadPitch = -0.08;
        this.targetHeadYaw = 0.09;
        this.targetHeadRoll = 0.06;
        break;

      case AVATAR_STATES.ENCOURAGING:
        this.targetHeadPitch = 0.05;
        this.targetHeadYaw = -0.02;
        this.targetHeadRoll = -0.03;
        break;

      case AVATAR_STATES.COMPLETED:
        this.targetHeadPitch = 0.02;
        this.targetHeadYaw = 0;
        this.targetHeadRoll = 0;
        break;

      case AVATAR_STATES.IDLE:
      default:
        this.targetHeadPitch = 0;
        this.targetHeadYaw = 0;
        this.targetHeadRoll = 0;
        break;
    }
  }

  update(deltaTime) {
    const dt = Math.min(deltaTime, 0.1);

    // 1. Natural Breathing Cycle
    this.breathingPhase += dt * this.breathingRate * Math.PI * 2;
    const breathingOffset = Math.sin(this.breathingPhase) * 0.015;

    // 2. Idle Micro-Sway
    this.swayPhase += dt * 0.5;
    const swayYaw = Math.sin(this.swayPhase * 0.8) * 0.012;
    const swayPitch = Math.cos(this.swayPhase * 1.1) * 0.008;

    // 3. Periodic Listening Nod (every ~3.5 seconds in LISTENING / ENCOURAGING state)
    let nodOffset = 0;
    if (this.currentState === AVATAR_STATES.LISTENING || this.currentState === AVATAR_STATES.ENCOURAGING) {
      this.nodTimer += dt;
      if (this.nodTimer > 3.2) {
        this.isNodding = true;
        this.nodPhase += dt * 5.0; // speed of nod
        nodOffset = Math.sin(this.nodPhase) * 0.08;
        if (this.nodPhase >= Math.PI * 2) {
          this.isNodding = false;
          this.nodPhase = 0;
          this.nodTimer = Math.random() * 0.8; // add jitter
        }
      }
    } else {
      this.nodTimer = 0;
      this.isNodding = false;
      this.nodPhase = 0;
    }

    // 4. Speaking cadence bobbing
    let speakingBob = 0;
    if (this.currentState === AVATAR_STATES.SPEAKING) {
      speakingBob = Math.sin(Date.now() * 0.005) * 0.025;
    }

    // 5. Lerp toward target angles
    const lerpFactor = 1.0 - Math.exp(-dt * 6.0); // smooth spring-like damping
    this.headPitch += (this.targetHeadPitch + swayPitch + nodOffset + speakingBob - this.headPitch) * lerpFactor;
    this.headYaw += (this.targetHeadYaw + swayYaw - this.headYaw) * lerpFactor;
    this.headRoll += (this.targetHeadRoll - this.headRoll) * lerpFactor;

    return {
      breathingOffset,
      headPitch: this.headPitch,
      headYaw: this.headYaw,
      headRoll: this.headRoll,
      state: this.currentState,
    };
  }
}
