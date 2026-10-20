/**
 * FaceVisionEngine.js
 * Client-side Responsible Computer Vision & Liveness Engine for PrepAgent AI.
 *
 * Implements real-time browser-based face detection, head pose/yaw estimation,
 * multi-person detection, natural liveness detection (blink, head turns, micro-movement),
 * and privacy-preserving identity reference descriptors without sending raw video frames to external servers.
 */

export const DEFAULT_BLINK_CONFIG = {
  // Eye openness drop threshold relative to open baseline (e.g. 0.80 means 20% drop from baseline)
  closingThreshold: 0.80,
  // Threshold to consider eyes closed
  closedThreshold: 0.70,
  // Recovery threshold to consider eyes reopened
  recoveryThreshold: 0.84,
  // Minimum closure duration in ms (natural fast blink is ~40-80ms)
  minBlinkDurationMs: 40,
  // Maximum closure duration in ms (natural blink finishes within ~850ms)
  maxBlinkDurationMs: 850,
  // Debounce/cooldown after a valid blink
  blinkCooldownMs: 200,
};

export class FaceVisionEngine {
  constructor(blinkConfig = {}) {
    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (this.canvas) {
      this.canvas.width = 192;
      this.canvas.height = 144;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    } else {
      this.ctx = null;
    }

    this.prevImageData = null;
    this.nativeDetector = null;

    // Configurable blink detection parameters & cycle state machine
    this.blinkConfig = { ...DEFAULT_BLINK_CONFIG, ...blinkConfig };
    this.blinkState = 'OPEN'; // 'OPEN' | 'CLOSING' | 'CLOSED'
    this.closureStartTime = 0;
    this.lastBlinkTimestamp = 0;
    this.opennessBaseline = null;
    this.opennessHistory = [];
    this.lowestDip = 1.0;
    this.recentFrames = []; // Buffer of recent { relOpenness, time }

    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        this.nativeDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      } catch (_) {
        this.nativeDetector = null;
      }
    }
  }

  /**
   * Resets the blink state machine and tracking buffers.
   */
  resetBlinkState() {
    this.blinkState = 'OPEN';
    this.closureStartTime = 0;
    this.lowestDip = 1.0;
    this.opennessHistory = [];
    this.recentFrames = [];
  }

  /**
   * Computes an eye aperture / openness metric from a localized eye bounding box.
   * Isolates the palpebral fissure (sclera, pupil, iris, eyelids) while avoiding the eyebrow.
   * High when eye is open (dark pupil + bright white sclera -> high contrast & variance).
   * Drops sharply when eyelid closes (homogeneous smooth skin -> low contrast & variance).
   */
  computeEyeOpenness(data, vw, vh, box) {
    if (!box || box.width < 4 || box.height < 4) return 0;
    const startX = Math.max(0, Math.floor(box.x));
    const endX = Math.min(vw, Math.floor(box.x + box.width));
    const startY = Math.max(0, Math.floor(box.y));
    const endY = Math.min(vh, Math.floor(box.y + box.height));

    let verticalGradSum = 0;
    let lumSum = 0;
    let lumSqSum = 0;
    let pixelCount = 0;
    let minLum = 255;
    let maxLum = 0;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = (y * vw + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        lumSum += lum;
        lumSqSum += lum * lum;
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
        pixelCount++;

        // Vertical gradient (difference between row above and row below)
        if (y > startY && y < endY - 1) {
          const idxDown = ((y + 1) * vw + x) * 4;
          const lumDown = 0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];
          const idxUp = ((y - 1) * vw + x) * 4;
          const lumUp = 0.299 * data[idxUp] + 0.587 * data[idxUp + 1] + 0.114 * data[idxUp + 2];
          verticalGradSum += Math.abs(lumDown - lumUp);
        }
      }
    }

    if (pixelCount === 0) return 0;
    const meanLum = lumSum / pixelCount;
    const variance = Math.max(0, lumSqSum / pixelCount - meanLum * meanLum);
    const stdDev = Math.sqrt(variance);
    const avgGrad = verticalGradSum / pixelCount;
    const contrastRange = maxLum - minLum;

    // Composite openness metric: high when eye is open (dark pupil + bright sclera),
    // drops by 40-70% when eyelid closes (homogeneous skin tone).
    return stdDev * 0.45 + contrastRange * 0.25 + avgGrad * 0.30;
  }

  /**
   * Analyze a single video frame.
   * Returns comprehensive face, pose, and liveness telemetry.
   */
  async analyzeFrame(videoElement) {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return {
        status: 'NO_FACE',
        faceCount: 0,
        box: null,
        headPose: 'CENTER',
        headYaw: 0,
        boxCenterRel: 0.50,
        headTurnDetected: false,
        blinkDetected: false,
        blinkConfirmed: false,
        blinkState: this.blinkState,
        ear: 1.0,
        baselineEAR: 1.0,
        eyeOpenness: 1.0,
        landmarksAvailable: false,
        faceConfidence: 0,
        microMovement: 0,
        isLiveMotion: false,
        identityDescriptor: null,
        timestamp: Date.now(),
      };
    }

    const vw = this.canvas.width;
    const vh = this.canvas.height;
    this.ctx.drawImage(videoElement, 0, 0, vw, vh);

    const frame = this.ctx.getImageData(0, 0, vw, vh);
    const data = frame.data;
    const totalPixels = vw * vh;

    // Check if native Shape Detection API is available and fast
    let nativeFaces = null;
    if (this.nativeDetector) {
      try {
        nativeFaces = await this.nativeDetector.detect(this.canvas);
      } catch (_) {
        nativeFaces = null;
      }
    }

    // 1. Skin & Luminance Segmentation in YCbCr
    const skinMask = new Uint8Array(totalPixels);
    let minX = vw,
      maxX = 0,
      minY = vh,
      maxY = 0;
    let skinPixelCount = 0;
    let sumX = 0,
      sumY = 0;

    // Grid for connected-components / clustering
    const gridCols = 16;
    const gridRows = 12;
    const cellW = vw / gridCols;
    const cellH = vh / gridRows;
    const gridDensity = new Int32Array(gridCols * gridRows);

    for (let y = 0; y < vh; y++) {
      for (let x = 0; x < vw; x++) {
        const idx = (y * vw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Standard YCbCr formula
        const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Wide, robust human skin tone cluster (Fitzpatrick I-VI, diverse webcam color profiles)
        if (yVal >= 25 && cb >= 75 && cb <= 135 && cr >= 125 && cr <= 180) {
          skinMask[y * vw + x] = 1;
          skinPixelCount++;
          sumX += x;
          sumY += y;

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;

          const gx = Math.min(gridCols - 1, Math.floor(x / cellW));
          const gy = Math.min(gridRows - 1, Math.floor(y / cellH));
          gridDensity[gy * gridCols + gx]++;
        }
      }
    }

    // 2. Connected-Component Cluster Analysis
    const rawClusters = [];
    const minCellDensity = 14;
    const visitedGrid = new Uint8Array(gridCols * gridRows);

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const gIdx = gy * gridCols + gx;
        if (gridDensity[gIdx] >= minCellDensity && !visitedGrid[gIdx]) {
          let blobCells = 0;
          let blobPixels = 0;
          const queue = [gIdx];
          visitedGrid[gIdx] = 1;
          let bMinGx = gx,
            bMaxGx = gx,
            bMinGy = gy,
            bMaxGy = gy;

          while (queue.length > 0) {
            const curr = queue.shift();
            blobCells++;
            blobPixels += gridDensity[curr];
            const cx = curr % gridCols;
            const cy = Math.floor(curr / gridCols);

            if (cx < bMinGx) bMinGx = cx;
            if (cx > bMaxGx) bMaxGx = cx;
            if (cy < bMinGy) bMinGy = cy;
            if (cy > bMaxGy) bMaxGy = cy;

            const neighbors = [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1],
            ];
            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
                const nIdx = ny * gridCols + nx;
                if (gridDensity[nIdx] >= minCellDensity && !visitedGrid[nIdx]) {
                  visitedGrid[nIdx] = 1;
                  queue.push(nIdx);
                }
              }
            }
          }

          if (blobCells >= 4) {
            rawClusters.push({
              cells: blobCells,
              pixels: blobPixels,
              minGx: bMinGx,
              maxGx: bMaxGx,
              minGy: bMinGy,
              maxGy: bMaxGy,
              centerGx: (bMinGx + bMaxGx) / 2,
              centerGy: (bMinGy + bMaxGy) / 2,
            });
          }
        }
      }
    }

    // Sort clusters by size descending
    rawClusters.sort((a, b) => b.pixels - a.pixels);

    // Merge vertically connected blobs that belong to the same person (e.g. face + neck/chin)
    const distinctPersons = [];
    for (const cluster of rawClusters) {
      let merged = false;
      for (const person of distinctPersons) {
        const horizDelta = Math.abs(cluster.centerGx - person.centerGx);
        const vertGap = cluster.minGy - person.maxGy;
        // Same vertical axis within 2.5 columns, and adjacent or small gap
        if (horizDelta <= 2.5 && vertGap >= -1 && vertGap <= 2) {
          person.cells += cluster.cells;
          person.pixels += cluster.pixels;
          person.minGx = Math.min(person.minGx, cluster.minGx);
          person.maxGx = Math.max(person.maxGx, cluster.maxGx);
          person.minGy = Math.min(person.minGy, cluster.minGy);
          person.maxGy = Math.max(person.maxGy, cluster.maxGy);
          person.centerGx = (person.minGx + person.maxGx) / 2;
          person.centerGy = (person.minGy + person.maxGy) / 2;
          merged = true;
          break;
        }
      }
      if (!merged) {
        distinctPersons.push({ ...cluster });
      }
    }

    // Real human face candidates must have sufficient size (>= 6 cells and >= 100 skin pixels)
    const validFaceCandidates = distinctPersons.filter((p) => p.cells >= 6 && p.pixels >= 100);

    let faceCount = 0;
    let primaryBox = null;

    if (nativeFaces && nativeFaces.length > 0) {
      faceCount = nativeFaces.length;
      const f = nativeFaces[0].boundingBox;
      primaryBox = {
        x: Math.round(f.x),
        y: Math.round(f.y),
        width: Math.round(f.width),
        height: Math.round(f.height),
      };
    } else {
      faceCount = validFaceCandidates.length;

      if (faceCount > 0) {
        const primary = validFaceCandidates[0];
        const pxX = Math.round(primary.minGx * cellW);
        const pxY = Math.round(primary.minGy * cellH);
        const pxW = Math.round((primary.maxGx - primary.minGx + 1) * cellW);
        const pxH = Math.round((primary.maxGy - primary.minGy + 1) * cellH);

        // Face is the upper portion of the head+neck cluster
        const faceH = Math.min(pxH, Math.max(24, Math.round(pxW * 1.3)));
        primaryBox = {
          x: Math.max(0, pxX),
          y: Math.max(0, pxY),
          width: Math.min(vw - pxX, pxW),
          height: Math.min(vh - pxY, faceH),
        };
      } else if (skinPixelCount > totalPixels * 0.035 && maxX > minX && maxY > minY) {
        // Fallback for single person skin cluster
        faceCount = 1;
        const w = maxX - minX;
        const h = Math.min(maxY - minY, Math.round(w * 1.3));
        primaryBox = {
          x: minX,
          y: minY,
          width: w,
          height: h,
        };
      }
    }

    // 3. Determine Face Presence State
    let status = 'NO_FACE';
    if (faceCount === 0 || !primaryBox || primaryBox.width < 16 || primaryBox.height < 16) {
      status = 'NO_FACE';
      faceCount = 0;
    } else if (faceCount > 1) {
      status = 'MULTIPLE_FACES';
    } else {
      status = 'ONE_FACE';
    }

    // 4. Head Pose / Orientation & Yaw Analysis
    let headPose = 'CENTER';
    let headTurnDetected = false;
    let headYaw = 0; // Approximate yaw in degrees
    let boxCenterRel = 0.50;

    if (primaryBox && skinPixelCount > 0) {
      const centroidX = sumX / skinPixelCount;
      boxCenterRel = (centroidX - primaryBox.x) / Math.max(1, primaryBox.width);
      // Yaw estimation based on facial centroid displacement
      headYaw = Math.round((boxCenterRel - 0.50) * 120);

      // Natural, forgiving turn threshold (~5-6 degrees or ~0.035 displacement)
      if (boxCenterRel < 0.465 || headYaw <= -5) {
        headPose = 'LEFT';
        headTurnDetected = true;
      } else if (boxCenterRel > 0.535 || headYaw >= 5) {
        headPose = 'RIGHT';
        headTurnDetected = true;
      } else {
        headPose = 'CENTER';
        headTurnDetected = false;
      }
    }

    // 5. Eye-Region Extraction & Blink Detection
    let blinkDetected = false;
    let relOpenness = 1.0;
    let leftEyeBox = null;
    let rightEyeBox = null;

    if (primaryBox && status !== 'NO_FACE') {
      const bx = primaryBox.x;
      const by = primaryBox.y;
      const bw = primaryBox.width;
      const bh = primaryBox.height;

      // Check if native detector supplied eye landmarks
      let nativeEyeLandmarks = null;
      if (nativeFaces && nativeFaces[0] && Array.isArray(nativeFaces[0].landmarks)) {
        const eyeLms = nativeFaces[0].landmarks.filter((l) => l.type === 'eye');
        if (eyeLms.length >= 2) {
          nativeEyeLandmarks = eyeLms.map((l) => l.locations[0]).sort((a, b) => a.x - b.x);
        }
      }

      if (nativeEyeLandmarks && nativeEyeLandmarks.length >= 2) {
        const eyeW = Math.max(10, Math.round(bw * 0.24));
        const eyeH = Math.max(8, Math.round(bh * 0.14));
        leftEyeBox = {
          x: Math.max(0, Math.min(vw - eyeW, Math.round(nativeEyeLandmarks[0].x - eyeW / 2))),
          y: Math.max(0, Math.min(vh - eyeH, Math.round(nativeEyeLandmarks[0].y - eyeH / 2))),
          width: eyeW,
          height: eyeH,
        };
        rightEyeBox = {
          x: Math.max(0, Math.min(vw - eyeW, Math.round(nativeEyeLandmarks[1].x - eyeW / 2))),
          y: Math.max(0, Math.min(vh - eyeH, Math.round(nativeEyeLandmarks[1].y - eyeH / 2))),
          width: eyeW,
          height: eyeH,
        };
      } else {
        // Palpebral fissure: 0.29 - 0.43 of face height (strictly avoiding eyebrow at 0.18-0.26)
        const eyeW = Math.max(10, Math.round(bw * 0.26));
        const eyeH = Math.max(8, Math.round(bh * 0.14));
        leftEyeBox = {
          x: Math.max(0, Math.min(vw - eyeW, Math.round(bx + bw * 0.19))),
          y: Math.max(0, Math.min(vh - eyeH, Math.round(by + bh * 0.29))),
          width: eyeW,
          height: eyeH,
        };
        rightEyeBox = {
          x: Math.max(0, Math.min(vw - eyeW, Math.round(bx + bw * 0.55))),
          y: Math.max(0, Math.min(vh - eyeH, Math.round(by + bh * 0.29))),
          width: eyeW,
          height: eyeH,
        };
      }

      const leftScore = this.computeEyeOpenness(data, vw, vh, leftEyeBox);
      const rightScore = this.computeEyeOpenness(data, vw, vh, rightEyeBox);

      let frameScore = 0;
      if (leftScore > 0 && rightScore > 0) {
        frameScore = (leftScore + rightScore) / 2;
      } else {
        frameScore = Math.max(leftScore, rightScore);
      }

      // Fast responsive smoothing: 2-frame window (~70ms) to preserve rapid blinks
      this.opennessHistory.push(frameScore);
      if (this.opennessHistory.length > 2) {
        this.opennessHistory.shift();
      }
      const smoothedScore =
        this.opennessHistory.reduce((a, b) => a + b, 0) / this.opennessHistory.length;

      // Adapt open baseline when face is stable and eyes are open
      if (this.opennessBaseline === null) {
        this.opennessBaseline = Math.max(1.0, smoothedScore);
      } else if (this.blinkState === 'OPEN') {
        if (smoothedScore >= this.opennessBaseline * 0.85) {
          // Slow adaptation towards current open state
          this.opennessBaseline = this.opennessBaseline * 0.95 + smoothedScore * 0.05;
        }
      }

      relOpenness = smoothedScore / Math.max(1.0, this.opennessBaseline);
      const now = Date.now();

      // Maintain rolling buffer of recent frames for fast dip-and-recover detection
      this.recentFrames.push({ relOpenness, time: now });
      const cutoffTime = now - 600;
      while (this.recentFrames.length > 0 && this.recentFrames[0].time < cutoffTime) {
        this.recentFrames.shift();
      }

      // State Machine: OPEN -> CLOSING -> CLOSED -> OPEN (Natural blink cycle)
      switch (this.blinkState) {
        case 'OPEN':
          if (relOpenness <= this.blinkConfig.closingThreshold) {
            this.blinkState = 'CLOSING';
            this.closureStartTime = now;
            this.lowestDip = relOpenness;
          }
          break;

        case 'CLOSING':
          if (relOpenness < this.lowestDip) {
            this.lowestDip = relOpenness;
          }

          if (relOpenness <= this.blinkConfig.closedThreshold) {
            this.blinkState = 'CLOSED';
          } else if (relOpenness >= this.blinkConfig.recoveryThreshold) {
            // Rapid natural blink: eyes dipped and immediately recovered
            const duration = now - this.closureStartTime;
            if (
              duration >= this.blinkConfig.minBlinkDurationMs &&
              duration <= this.blinkConfig.maxBlinkDurationMs
            ) {
              if (now - this.lastBlinkTimestamp > this.blinkConfig.blinkCooldownMs) {
                blinkDetected = true;
                this.lastBlinkTimestamp = now;
              }
            }
            this.blinkState = 'OPEN';
          } else if (now - this.closureStartTime > this.blinkConfig.maxBlinkDurationMs) {
            this.blinkState = 'OPEN';
          }
          break;

        case 'CLOSED': {
          const closureDuration = now - this.closureStartTime;
          if (relOpenness < this.lowestDip) {
            this.lowestDip = relOpenness;
          }

          if (closureDuration > this.blinkConfig.maxBlinkDurationMs) {
            // Closed for too long (eyes resting, not a blink)
            this.blinkState = 'OPEN';
          } else if (relOpenness >= this.blinkConfig.recoveryThreshold) {
            // Reopened! Complete cycle: OPEN -> CLOSED -> OPEN
            if (closureDuration >= this.blinkConfig.minBlinkDurationMs) {
              if (now - this.lastBlinkTimestamp > this.blinkConfig.blinkCooldownMs) {
                blinkDetected = true;
                this.lastBlinkTimestamp = now;
              }
            }
            this.blinkState = 'OPEN';
          }
          break;
        }

        default:
          this.blinkState = 'OPEN';
      }

      // Secondary fast-recovery check: if in the last 400ms there was a clear dip and now recovered
      if (!blinkDetected && relOpenness >= this.blinkConfig.recoveryThreshold) {
        if (now - this.lastBlinkTimestamp > this.blinkConfig.blinkCooldownMs) {
          const minRecent = this.recentFrames.reduce(
            (min, f) => (f.relOpenness < min ? f.relOpenness : min),
            1.0
          );
          if (minRecent <= this.blinkConfig.closedThreshold) {
            blinkDetected = true;
            this.lastBlinkTimestamp = now;
            this.blinkState = 'OPEN';
          }
        }
      }
    } else {
      // Face temporarily unclear: reset to OPEN if timed out
      if (this.blinkState !== 'OPEN' && Date.now() - this.closureStartTime > 900) {
        this.blinkState = 'OPEN';
      }
    }

    // 6. Micro-movement & Optical Variance
    let microMovement = 0;
    let isLiveMotion = false;
    if (this.prevImageData && primaryBox) {
      let diffSum = 0;
      let count = 0;
      const prevData = this.prevImageData.data;

      const sampleYStart = Math.max(0, primaryBox.y);
      const sampleYEnd = Math.min(vh, primaryBox.y + primaryBox.height);
      const sampleXStart = Math.max(0, primaryBox.x);
      const sampleXEnd = Math.min(vw, primaryBox.x + primaryBox.width);

      for (let y = sampleYStart; y < sampleYEnd; y += 2) {
        for (let x = sampleXStart; x < sampleXEnd; x += 2) {
          const idx = (y * vw + x) * 4;
          const lumCur = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          const lumPrev =
            0.299 * prevData[idx] + 0.587 * prevData[idx + 1] + 0.114 * prevData[idx + 2];
          diffSum += Math.abs(lumCur - lumPrev);
          count++;
        }
      }

      if (count > 0) {
        microMovement = diffSum / count;
        isLiveMotion = microMovement >= 0.5 && microMovement <= 40;
      }
    }
    this.prevImageData = frame;

    // 7. Identity Reference Descriptor (compact 64-element feature vector)
    let identityDescriptor = null;
    if (primaryBox && status === 'ONE_FACE') {
      identityDescriptor = this.computeFaceDescriptor(data, vw, vh, primaryBox);
    }

    return {
      status,
      faceCount,
      box: primaryBox,
      headPose,
      headYaw,
      boxCenterRel,
      headTurnDetected,
      blinkDetected,
      blinkConfirmed: blinkDetected,
      blinkState: this.blinkState,
      ear: Math.round(relOpenness * 100) / 100,
      baselineEAR: Math.round((this.opennessBaseline || 1.0) * 100) / 100,
      eyeOpenness: Math.round(relOpenness * 100) / 100,
      landmarksAvailable: !!(primaryBox && leftEyeBox && rightEyeBox),
      faceConfidence: faceCount === 1 ? 0.95 : (faceCount > 1 ? 0.85 : 0),
      microMovement: Math.round(microMovement * 10) / 10,
      isLiveMotion,
      identityDescriptor,
      timestamp: Date.now(),
    };
  }

  /**
   * Generates a normalized spatial color/texture descriptor for identity continuity.
   * Does NOT store raw photos or high-dimensional biometrics.
   */
  computeFaceDescriptor(pixelData, vw, vh, box) {
    const gridSize = 4;
    const descriptor = [];
    const stepW = Math.max(1, Math.floor(box.width / gridSize));
    const stepH = Math.max(1, Math.floor(box.height / gridSize));

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let lumSum = 0;
        let cbSum = 0;
        let crSum = 0;
        let samples = 0;

        const startY = Math.max(0, box.y + gy * stepH);
        const endY = Math.min(vh, startY + stepH);
        const startX = Math.max(0, box.x + gx * stepW);
        const endX = Math.min(vw, startX + stepW);

        for (let y = startY; y < endY; y += 2) {
          for (let x = startX; x < endX; x += 2) {
            const idx = (y * vw + x) * 4;
            const r = pixelData[idx];
            const g = pixelData[idx + 1];
            const b = pixelData[idx + 2];
            lumSum += 0.299 * r + 0.587 * g + 0.114 * b;
            cbSum += 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
            crSum += 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
            samples++;
          }
        }

        if (samples > 0) {
          descriptor.push(lumSum / (samples * 255));
          descriptor.push(cbSum / (samples * 255));
          descriptor.push(crSum / (samples * 255));
        } else {
          descriptor.push(0, 0, 0);
        }
      }
    }

    // L2 normalize
    let norm = 0;
    for (let i = 0; i < descriptor.length; i++) {
      norm += descriptor[i] * descriptor[i];
    }
    norm = Math.sqrt(norm) || 1;
    return descriptor.map((v) => v / norm);
  }

  /**
   * Compares an active frame descriptor with the established baseline reference descriptor.
   * Returns a match confidence score between 0.0 and 1.0.
   */
  static compareDescriptors(descA, descB) {
    if (!descA || !descB || descA.length !== descB.length) return 0;
    let dot = 0;
    for (let i = 0; i < descA.length; i++) {
      dot += descA[i] * descB[i];
    }
    return Math.max(0, Math.min(1, dot));
  }
}

// ---------------------------------------------------------------------------
// Independent Step Detectors for Interview Readiness Liveness Verification
// ---------------------------------------------------------------------------

/**
 * Step 1: Detect valid face looking towards camera.
 * Requires ONE_FACE visible and reasonably centered for consecutive frames (~0.5s).
 */
export function detectLook(telemetry, context = {}) {
  if (telemetry.status !== 'ONE_FACE' || !telemetry.box) {
    return { detected: false, progress: 0, context: { ...context, lookCount: 0 } };
  }
  const isCentered =
    telemetry.headPose === 'CENTER' || Math.abs((telemetry.boxCenterRel || 0.50) - 0.50) < 0.08;
  if (!isCentered) {
    return { detected: false, progress: 0, context: { ...context, lookCount: 0 } };
  }
  const count = (context.lookCount || 0) + 1;
  const target = context.targetFrames || 3;
  return {
    detected: count >= target,
    progress: Math.min(1, count / target),
    context: { ...context, lookCount: count },
  };
}

/**
 * Step 2: Detect natural blink cycle (open -> closed -> open).
 * Tolerates rapid natural blinks, partial blinks, and standard blinks.
 */
export function detectBlink(telemetry, context = {}) {
  if (telemetry.status !== 'ONE_FACE') {
    return { detected: false, progress: 0, context };
  }
  if (telemetry.blinkDetected || telemetry.blinkConfirmed) {
    return { detected: true, progress: 1, context };
  }
  const progress =
    telemetry.blinkState === 'CLOSED' ? 0.75 : telemetry.blinkState === 'CLOSING' ? 0.4 : 0;
  return {
    detected: false,
    progress,
    context,
  };
}

/**
 * Step 3: Detect head turn slightly left.
 * Accepts natural slight turn (>= 6-7 degrees or relative displacement >= 0.035).
 * Forgiving: accepts anatomical left or screen-mirrored left.
 */
export function detectLeftTurn(telemetry, context = {}) {
  if (telemetry.status !== 'ONE_FACE' || !telemetry.box) {
    return { detected: false, progress: 0, context: { ...context, turnCount: 0 } };
  }
  const baseline = context.baselineCenter || 0.50;
  const currentRel = telemetry.boxCenterRel || 0.50;
  const delta = Math.abs(currentRel - baseline);
  const yaw = telemetry.headYaw || 0;

  // Turn detected if either pose is LEFT/RIGHT, lateral shift delta >= 0.035, or |yaw| >= 5
  const isTurned =
    telemetry.headPose === 'LEFT' ||
    telemetry.headPose === 'RIGHT' ||
    telemetry.headTurnDetected ||
    delta >= 0.035 ||
    Math.abs(yaw) >= 5;

  const count = isTurned ? (context.turnCount || 0) + 1 : 0;
  const target = context.targetFrames || 3;
  return {
    detected: count >= target,
    progress: Math.min(1, count / target),
    context: { ...context, turnCount: count },
  };
}

/**
 * Step 4: Detect return to center.
 * Returning within <= 3.5-4 degrees of baseline center.
 */
export function detectCenter(telemetry, context = {}) {
  if (telemetry.status !== 'ONE_FACE' || !telemetry.box) {
    return { detected: false, progress: 0, context: { ...context, centerCount: 0 } };
  }
  const baseline = context.baselineCenter || 0.50;
  const currentRel = telemetry.boxCenterRel || 0.50;
  const delta = Math.abs(currentRel - baseline);
  const yaw = telemetry.headYaw || 0;

  const isCentered =
    telemetry.headPose === 'CENTER' || delta <= 0.03 || Math.abs(yaw) <= 4.5;

  const count = isCentered ? (context.centerCount || 0) + 1 : 0;
  const target = context.targetFrames || 3;
  return {
    detected: count >= target,
    progress: Math.min(1, count / target),
    context: { ...context, centerCount: count },
  };
}

export default new FaceVisionEngine();
