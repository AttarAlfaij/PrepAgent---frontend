/**
 * AvatarExpressionController
 * Controls facial blendshapes, eye blinking with natural randomized intervals,
 * and saccadic eye gaze for the 3D AI Interviewer Avatar.
 */

export const EXPRESSIONS = {
  NEUTRAL: 'neutral',
  SMILE: 'smile',
  ATTENTIVE: 'attentive',
  THINKING: 'thinking',
  SURPRISED: 'surprised',
  ENCOURAGING: 'encouraging',
  PROFESSIONAL: 'serious/professional',
};

export class AvatarExpressionController {
  constructor() {
    this.currentExpression = EXPRESSIONS.ATTENTIVE;

    // Morph target weights (0.0 to 1.0)
    this.weights = {
      smile: 0.1,
      eyebrowRaise: 0.1,
      eyebrowFurrow: 0.0,
      eyeSquint: 0.0,
      mouthOpen: 0.0,
    };

    this.targetWeights = {
      smile: 0.1,
      eyebrowRaise: 0.1,
      eyebrowFurrow: 0.0,
      eyeSquint: 0.0,
      mouthOpen: 0.0,
    };

    // Blinking System: Poisson-like randomized interval (2.5 - 5.0 seconds)
    this.blinkTimer = 0;
    this.nextBlinkInterval = this.getRandomBlinkInterval();
    this.blinkWeight = 0; // 0 = open, 1 = closed
    this.isBlinking = false;
    this.blinkProgress = 0;
    this.blinkDuration = 0.16; // 160ms natural human blink

    // Eye Gaze Saccades
    this.eyeGazeX = 0;
    this.eyeGazeY = 0;
    this.targetGazeX = 0;
    this.targetGazeY = 0;
    this.saccadeTimer = 0;
    this.nextSaccadeInterval = 2.0;
  }

  getRandomBlinkInterval() {
    return 2.5 + Math.random() * 2.5; // between 2.5s and 5.0s
  }

  setExpression(exprName) {
    const key = (exprName || '').toLowerCase().trim();
    if (key.includes('smile') || key.includes('happy')) {
      this.currentExpression = EXPRESSIONS.SMILE;
      this.targetWeights = { smile: 0.7, eyebrowRaise: 0.25, eyebrowFurrow: 0.0, eyeSquint: 0.15, mouthOpen: 0.05 };
    } else if (key.includes('thinking') || key.includes('analyzing')) {
      this.currentExpression = EXPRESSIONS.THINKING;
      this.targetWeights = { smile: 0.0, eyebrowRaise: 0.35, eyebrowFurrow: 0.2, eyeSquint: 0.1, mouthOpen: 0.0 };
    } else if (key.includes('surprised')) {
      this.currentExpression = EXPRESSIONS.SURPRISED;
      this.targetWeights = { smile: 0.1, eyebrowRaise: 0.8, eyebrowFurrow: 0.0, eyeSquint: 0.0, mouthOpen: 0.25 };
    } else if (key.includes('encouraging')) {
      this.currentExpression = EXPRESSIONS.ENCOURAGING;
      this.targetWeights = { smile: 0.45, eyebrowRaise: 0.2, eyebrowFurrow: 0.0, eyeSquint: 0.1, mouthOpen: 0.0 };
    } else if (key.includes('serious') || key.includes('professional')) {
      this.currentExpression = EXPRESSIONS.PROFESSIONAL;
      this.targetWeights = { smile: 0.05, eyebrowRaise: 0.0, eyebrowFurrow: 0.15, eyeSquint: 0.1, mouthOpen: 0.0 };
    } else if (key.includes('attentive') || key.includes('listening')) {
      this.currentExpression = EXPRESSIONS.ATTENTIVE;
      this.targetWeights = { smile: 0.15, eyebrowRaise: 0.2, eyebrowFurrow: 0.0, eyeSquint: 0.05, mouthOpen: 0.0 };
    } else {
      this.currentExpression = EXPRESSIONS.NEUTRAL;
      this.targetWeights = { smile: 0.08, eyebrowRaise: 0.05, eyebrowFurrow: 0.0, eyeSquint: 0.0, mouthOpen: 0.0 };
    }
  }

  update(deltaTime) {
    const dt = Math.min(deltaTime, 0.1);

    // 1. Update Eye Blinking
    this.blinkTimer += dt;
    if (!this.isBlinking && this.blinkTimer >= this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.blinkTimer = 0;
      this.nextBlinkInterval = this.getRandomBlinkInterval();
    }

    if (this.isBlinking) {
      this.blinkProgress += dt / this.blinkDuration;
      if (this.blinkProgress >= 1.0) {
        this.blinkProgress = 1.0;
        this.isBlinking = false;
        this.blinkWeight = 0;
      } else {
        // Sine curve for smooth close-and-open
        this.blinkWeight = Math.sin(this.blinkProgress * Math.PI);
      }
    } else {
      this.blinkWeight = 0;
    }

    // 2. Saccadic Eye Movement
    this.saccadeTimer += dt;
    if (this.saccadeTimer >= this.nextSaccadeInterval) {
      this.saccadeTimer = 0;
      this.nextSaccadeInterval = 1.5 + Math.random() * 2.0;
      // Slight gaze shift around the camera center
      this.targetGazeX = (Math.random() - 0.5) * 0.06;
      this.targetGazeY = (Math.random() - 0.5) * 0.04;
    }

    const gazeLerp = 1.0 - Math.exp(-dt * 10.0);
    this.eyeGazeX += (this.targetGazeX - this.eyeGazeX) * gazeLerp;
    this.eyeGazeY += (this.targetGazeY - this.eyeGazeY) * gazeLerp;

    // 3. Lerp facial weights
    const weightLerp = 1.0 - Math.exp(-dt * 5.0);
    for (const key of Object.keys(this.weights)) {
      this.weights[key] += (this.targetWeights[key] - this.weights[key]) * weightLerp;
    }

    return {
      weights: { ...this.weights },
      blinkWeight: this.blinkWeight,
      eyeGaze: { x: this.eyeGazeX, y: this.eyeGazeY },
      currentExpression: this.currentExpression,
    };
  }
}
