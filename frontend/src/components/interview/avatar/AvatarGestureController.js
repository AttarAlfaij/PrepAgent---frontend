/**
 * AvatarGestureController
 * Controls skeletal joint poses for arms, forearms, and hands,
 * dynamically selecting and smoothly interpolating between natural gestures.
 */

export const GESTURES = {
  OPEN_HAND_EXPLANATION: 'open_hand_explanation',
  POINTING: 'pointing',
  SMALL_HAND_EMPHASIS: 'small_hand_emphasis',
  TWO_HAND_EXPLANATION: 'two_hand_explanation',
  LISTENING_HANDS: 'listening_hands',
  NEUTRAL_HANDS: 'neutral_hands',
  WELCOMING_GESTURE: 'welcoming_gesture',
};

export class AvatarGestureController {
  constructor() {
    this.currentGesture = GESTURES.NEUTRAL_HANDS;

    // Joint rotation targets in radians: { shoulderX, shoulderY, shoulderZ, elbowX, elbowY, wristZ }
    this.leftArm = { shoulderX: 0.1, shoulderY: 0.0, shoulderZ: 0.25, elbowX: 0.4, elbowY: 0.1, wristZ: 0.0 };
    this.rightArm = { shoulderX: 0.1, shoulderY: 0.0, shoulderZ: -0.25, elbowX: 0.4, elbowY: -0.1, wristZ: 0.0 };

    this.targetLeftArm = { ...this.leftArm };
    this.targetRightArm = { ...this.rightArm };

    this.gestureTimer = 0;
    this.activeGestureDuration = 3.5;
  }

  setGesture(gestureName) {
    const key = (gestureName || '').toLowerCase().trim();
    if (key.includes('open_hand') || key.includes('explanation')) {
      this.currentGesture = GESTURES.OPEN_HAND_EXPLANATION;
      // Right hand raises slightly in an open explanatory pose
      this.targetRightArm = { shoulderX: -0.35, shoulderY: -0.2, shoulderZ: -0.3, elbowX: 1.1, elbowY: -0.4, wristZ: 0.2 };
      this.targetLeftArm = { shoulderX: 0.1, shoulderY: 0.0, shoulderZ: 0.2, elbowX: 0.45, elbowY: 0.1, wristZ: 0.0 };
    } else if (key.includes('two_hand')) {
      this.currentGesture = GESTURES.TWO_HAND_EXPLANATION;
      // Both hands raised forward above the desk in open conversational explanation (as in reference image)
      this.targetRightArm = { shoulderX: -0.38, shoulderY: -0.22, shoulderZ: -0.22, elbowX: 1.12, elbowY: -0.38, wristZ: 0.22 };
      this.targetLeftArm = { shoulderX: -0.38, shoulderY: 0.22, shoulderZ: 0.22, elbowX: 1.12, elbowY: 0.38, wristZ: -0.22 };
    } else if (key.includes('emphasis') || key.includes('small_hand')) {
      this.currentGesture = GESTURES.SMALL_HAND_EMPHASIS;
      // Slight crisp hand pulse
      this.targetRightArm = { shoulderX: -0.25, shoulderY: -0.15, shoulderZ: -0.2, elbowX: 0.85, elbowY: -0.2, wristZ: 0.15 };
      this.targetLeftArm = { shoulderX: 0.1, shoulderY: 0.0, shoulderZ: 0.2, elbowX: 0.4, elbowY: 0.1, wristZ: 0.0 };
    } else if (key.includes('pointing')) {
      this.currentGesture = GESTURES.POINTING;
      this.targetRightArm = { shoulderX: -0.4, shoulderY: -0.1, shoulderZ: -0.15, elbowX: 1.2, elbowY: -0.1, wristZ: 0.3 };
      this.targetLeftArm = { shoulderX: 0.1, shoulderY: 0.0, shoulderZ: 0.2, elbowX: 0.4, elbowY: 0.1, wristZ: 0.0 };
    } else if (key.includes('welcoming')) {
      this.currentGesture = GESTURES.WELCOMING_GESTURE;
      this.targetRightArm = { shoulderX: -0.28, shoulderY: -0.4, shoulderZ: -0.35, elbowX: 0.9, elbowY: -0.3, wristZ: 0.2 };
      this.targetLeftArm = { shoulderX: -0.28, shoulderY: 0.4, shoulderZ: 0.35, elbowX: 0.9, elbowY: 0.3, wristZ: -0.2 };
    } else if (key.includes('listening')) {
      this.currentGesture = GESTURES.LISTENING_HANDS;
      // Hands resting together in lap / on table
      this.targetRightArm = { shoulderX: 0.15, shoulderY: -0.1, shoulderZ: -0.15, elbowX: 0.65, elbowY: -0.2, wristZ: 0.0 };
      this.targetLeftArm = { shoulderX: 0.15, shoulderY: 0.1, shoulderZ: 0.15, elbowX: 0.65, elbowY: 0.2, wristZ: 0.0 };
    } else if (key.includes('thinking')) {
      this.currentGesture = 'thinking_pose';
      // Right hand raises toward chin in thoughtful executive posture
      this.targetRightArm = { shoulderX: -0.45, shoulderY: -0.28, shoulderZ: -0.15, elbowX: 1.45, elbowY: -0.45, wristZ: 0.35 };
      this.targetLeftArm = { shoulderX: 0.15, shoulderY: 0.1, shoulderZ: 0.15, elbowX: 0.65, elbowY: 0.2, wristZ: 0.0 };
    } else {
      this.currentGesture = GESTURES.NEUTRAL_HANDS;
      this.targetRightArm = { shoulderX: 0.1, shoulderY: 0.0, shoulderZ: -0.25, elbowX: 0.4, elbowY: -0.1, wristZ: 0.0 };
      this.targetLeftArm = { shoulderX: 0.1, shoulderY: 0.0, shoulderZ: 0.25, elbowX: 0.4, elbowY: 0.1, wristZ: 0.0 };
    }
  }

  update(deltaTime) {
    const dt = Math.min(deltaTime, 0.1);
    const lerpFactor = 1.0 - Math.exp(-dt * 4.5); // smooth gesture transition

    // Lerp Left Arm
    for (const key of Object.keys(this.leftArm)) {
      this.leftArm[key] += (this.targetLeftArm[key] - this.leftArm[key]) * lerpFactor;
    }

    // Lerp Right Arm
    for (const key of Object.keys(this.rightArm)) {
      this.rightArm[key] += (this.targetRightArm[key] - this.rightArm[key]) * lerpFactor;
    }

    return {
      leftArm: { ...this.leftArm },
      rightArm: { ...this.rightArm },
      currentGesture: this.currentGesture,
    };
  }
}
