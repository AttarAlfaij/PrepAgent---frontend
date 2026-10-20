import assert from 'node:assert';
import { FaceVisionEngine } from './src/utils/FaceVisionEngine.js';

console.log('Testing FaceVisionEngine cluster logic...');

const engine = new FaceVisionEngine();
const vw = 192;
const vh = 144;

// Create mock video element with canvas
const mockCanvas = {
  width: vw,
  height: vh,
  readyState: 4,
  videoWidth: vw,
  videoHeight: vh,
};

console.log('FaceVisionEngine initialized successfully.');
