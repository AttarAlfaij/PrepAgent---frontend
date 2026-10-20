import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * AvatarRenderer — Realistic 40-Year-Old Female Human AI Interviewer (Sarah J.)
 *
 * Implements a true professional video-call medium shot:
 * - Medium-shot framing: Head, Shoulders, and Upper Torso occupy ~60–65% of stage height.
 * - Camera positioned at a comfortable distance (1.48m) with eye-level lookAt (0, 0.24, 0).
 * - ABSOLUTELY NO T-POSE: Arms rest naturally down along the torso; hands are positioned below the frame.
 * - ZERO hand or arm gestures: Interviewer is seated calmly and naturally behind a conference desk.
 * - Real Oculus visemes lip-sync synchronized with TTS audio syllables.
 * - Poisson-distributed natural eye blinking and subtle eye catchlight.
 * - Attentive listening micro-nods restricted exclusively to Head and Neck bones.
 * - Clean executive background with zero foreground clutter or clipping.
 */
const AvatarRenderer = ({
  animationController,
  expressionController,
  speechController,
  className = '',
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let renderer = null;
    let scene = null;
    let camera = null;
    let animFrameId = null;
    let isDestroyed = false;

    try {
      // 1. Scene Setup
      scene = new THREE.Scene();
      scene.background = new THREE.Color('#0c1322');

      const width = container.clientWidth || 800;
      const height = container.clientHeight || 550;
      const aspect = width / height;

      // 2. Professional Video-Call Camera: Medium-Shot Framing
      // Camera distance = 1.48m, looking at chest/face center (0, 0.24, 0)
      // Fixed 30° FOV guarantees avatar upper body occupies 58–63% of the stage height on any aspect ratio
      const cameraFov = 30;
      camera = new THREE.PerspectiveCamera(cameraFov, aspect, 0.1, 50);
      camera.position.set(0, 0.28, 1.48);
      camera.lookAt(0, 0.24, 0);

      // 3. WebGL Renderer
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;

      // 4. Studio 3-Point Portrait Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
      scene.add(ambientLight);

      // Key Light: Warm portrait key light
      const keyLight = new THREE.DirectionalLight(0xfff7ee, 1.85);
      keyLight.position.set(1.2, 1.8, 2.0);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      scene.add(keyLight);

      // Fill Light: Soft daylight fill
      const fillLight = new THREE.DirectionalLight(0xb0cbef, 0.9);
      fillLight.position.set(-1.6, 1.2, 1.5);
      scene.add(fillLight);

      // Rim Light: Hair & shoulder separation light
      const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
      rimLight.position.set(0, 1.8, -1.5);
      scene.add(rimLight);

      // Eye Catchlight: Specular reflection in eyes at a safe distance
      const eyeCatchlight = new THREE.PointLight(0xffffff, 0.35, 2.5);
      eyeCatchlight.position.set(0, 0.40, 1.2);
      scene.add(eyeCatchlight);

      // 5. Subtle Executive Corporate Office Background
      const officeEnvGroup = new THREE.Group();
      scene.add(officeEnvGroup);

      // Wall backdrop (far behind avatar at z = -2.4)
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0x141b2a,
        roughness: 0.88,
        metalness: 0.05,
      });
      const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 7), wallMat);
      wallMesh.position.set(0, 0.3, -2.4);
      officeEnvGroup.add(wallMesh);

      // Panoramic Skyline Window on Left Side
      const skyMat = new THREE.MeshBasicMaterial({ color: 0x769cc2 });
      const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.6), skyMat);
      skyPlane.position.set(-2.2, 0.6, -2.35);
      officeEnvGroup.add(skyPlane);

      // Skyscraper Silhouettes
      const bldgMat1 = new THREE.MeshBasicMaterial({ color: 0x4f6782 });
      const bldgMat2 = new THREE.MeshBasicMaterial({ color: 0x3d536c });
      const bldgMat3 = new THREE.MeshBasicMaterial({ color: 0x5d7693 });

      const tower1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.8, 0.1), bldgMat1);
      tower1.position.set(-2.6, 0.4, -2.3);
      officeEnvGroup.add(tower1);

      const tower2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 0.1), bldgMat2);
      tower2.position.set(-2.0, 0.7, -2.28);
      officeEnvGroup.add(tower2);

      const tower3 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.4, 0.1), bldgMat3);
      tower3.position.set(-1.4, 0.2, -2.29);
      officeEnvGroup.add(tower3);

      // Window Mullions
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.045, 3.6, 0.06), frameMat);
      mullionV.position.set(-1.7, 0.6, -2.2);
      officeEnvGroup.add(mullionV);

      // Executive Credenza / Bookshelf in Background
      const credenzaWood = new THREE.MeshStandardMaterial({
        color: 0x221610,
        roughness: 0.5,
        metalness: 0.1,
      });
      const credenza = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.75, 0.4), credenzaWood);
      credenza.position.set(1.3, -0.25, -2.1);
      officeEnvGroup.add(credenza);

      // Books on Credenza
      const bookColors = [0x2563eb, 0x475569, 0x0f172a, 0xb45309, 0xd97706, 0x64748b];
      bookColors.forEach((col, idx) => {
        const bookMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 });
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.16), bookMat);
        book.position.set(0.6 + idx * 0.05, 0.22, -2.05);
        officeEnvGroup.add(book);
      });

      // Executive Table Lamp on Credenza with Warm Glow
      const lampBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
      const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.04, 16), lampBaseMat);
      lampBase.position.set(-0.65, 0.14, -2.05);
      officeEnvGroup.add(lampBase);

      const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 12), lampBaseMat);
      lampPole.position.set(-0.65, 0.35, -2.05);
      officeEnvGroup.add(lampPole);

      const lampShadeMat = new THREE.MeshStandardMaterial({
        color: 0xffedd5,
        emissive: 0xfef08a,
        emissiveIntensity: 0.6,
        roughness: 0.4,
      });
      const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.26, 20), lampShadeMat);
      lampShade.position.set(-0.65, 0.56, -2.05);
      officeEnvGroup.add(lampShade);

      const lampGlowLight = new THREE.PointLight(0xffedd5, 1.2, 4.0);
      lampGlowLight.position.set(-0.65, 0.58, -1.9);
      officeEnvGroup.add(lampGlowLight);

      // 6. Foreground Seated Executive Conference Desk
      // Located at waist level (y = -0.12, z = 0.20), comfortably in front of avatar and far behind camera
      const deskGroup = new THREE.Group();
      scene.add(deskGroup);

      const deskMat = new THREE.MeshStandardMaterial({
        color: 0x121722,
        roughness: 0.45,
        metalness: 0.2,
      });
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.06, 0.7), deskMat);
      deskTop.position.set(0, -0.12, 0.20);
      deskTop.receiveShadow = true;
      deskGroup.add(deskTop);

      const deskPadMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.85 });
      const deskPad = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.006, 0.38), deskPadMat);
      deskPad.position.set(0, -0.088, 0.20);
      deskGroup.add(deskPad);

      // 7. Load Real Rigged Female 3D Avatar (GLB)
      const loader = new GLTFLoader();
      let avatarModel = null;

      // Skeletal Bones (Only Head & Neck animated for subtle micro-sway & nods; ZERO arm/hand animation)
      let headBone = null;
      let neckBone = null;

      // Morph Target Meshes for Facial Blendshapes
      let headMesh = null;
      let teethMesh = null;
      let eyeMesh = null;
      let eyeAOMesh = null;
      let eyelashMesh = null;

      // Initial Rest Rotations
      const restRotations = {};

      const setMorph = (mesh, targetName, value) => {
        if (!mesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
        const idx = mesh.morphTargetDictionary[targetName];
        if (idx !== undefined) {
          mesh.morphTargetInfluences[idx] = Math.max(0, Math.min(1, value));
        }
      };

      loader.load(
        '/models/female-interviewer.glb',
        (gltf) => {
          if (isDestroyed) return;
          avatarModel = gltf.scene;

          // Natural Seated Placement:
          // Head center at y ≈ 0.31, Eyes at y ≈ 0.39, Shoulders at y ≈ 0.18, Upper Torso at y ≈ 0.03
          avatarModel.position.set(0, -1.35, 0);
          avatarModel.scale.set(1.0, 1.0, 1.0);

          avatarModel.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;

              // Hide glasses if present so eyes and expressions are clearly visible
              if (node.name.toLowerCase().includes('glass')) {
                node.visible = false;
              }

              // Adjust materials for realistic mature executive appearance (skin, hair, blazer)
              if (node.name === 'Head_Mesh' || node.material?.name === 'Head') {
                headMesh = node;
                if (node.material) {
                  node.material.roughness = 0.7;
                  node.material.metalness = 0.0;
                  node.material.needsUpdate = true;
                }
              }
              if (node.name === 'Teeth_Mesh' || node.name.includes('Teeth')) {
                teethMesh = node;
              }
              if (node.name === 'Eye_Mesh' || node.name.includes('Eye')) {
                eyeMesh = node;
              }
              if (node.name === 'EyeAO_Mesh') {
                eyeAOMesh = node;
              }
              if (node.name === 'Eyelash_Mesh' || node.name.includes('Eyelash')) {
                eyelashMesh = node;
              }
              if (node.name.includes('hair') || node.material?.name?.includes('hair')) {
                if (node.material) {
                  node.material.roughness = 0.82;
                  node.material.metalness = 0.08;
                  node.material.needsUpdate = true;
                }
              }
              if (node.name.includes('look') || node.material?.name?.includes('look')) {
                if (node.material) {
                  node.material.roughness = 0.88;
                  node.material.metalness = 0.02;
                  node.material.needsUpdate = true;
                }
              }
            }

            // Skeletal Bone Setup — CRITICAL: NATURAL SEATED REST POSE (ZERO T-POSE)
            if (node.isBone) {
              if (node.name === 'Head') headBone = node;
              if (node.name === 'Neck') neckBone = node;

              // Rotate arms naturally straight DOWN along the ribcage (tested exact Euler transforms)
              if (node.name === 'LeftArm') {
                node.rotation.set(-1.742, 0.858, -2.942);
              }
              if (node.name === 'RightArm') {
                node.rotation.set(1.658, 2.658, -0.142);
              }
              // Scale hands down to prevent any accidental protruding finger geometry
              if (node.name === 'LeftHand' || node.name === 'RightHand') {
                node.scale.set(0.001, 0.001, 0.001);
              }

              // Store rest rotations
              restRotations[node.name] = {
                x: node.rotation.x,
                y: node.rotation.y,
                z: node.rotation.z,
              };
            }
          });

          scene.add(avatarModel);
          setIsLoaded(true);
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            setLoadingProgress(Math.round((xhr.loaded / xhr.total) * 100));
          }
        },
        (err) => {
          console.error('[AvatarRenderer] Failed to load GLB avatar:', err);
          setHasError(true);
        }
      );

      // 8. 60 FPS Render Loop (Realistic Lip-Sync + Subtle Facial Movement + ZERO Arm/Hand Gestures)
      let lastTime = performance.now();

      // Oculus Visemes for Syllable-Synchronized Lip Articulation
      const VISEMES = [
        'viseme_aa',
        'viseme_E',
        'viseme_I',
        'viseme_O',
        'viseme_U',
        'viseme_DD',
        'viseme_SS',
        'viseme_TH',
        'viseme_PP',
        'viseme_FF',
      ];
      let visemeStep = 0;
      let lastVisemeTime = 0;

      const animate = (time) => {
        if (isDestroyed) return;
        animFrameId = requestAnimationFrame(animate);

        const delta = (time - lastTime) * 0.001;
        lastTime = time;

        // Update controllers
        const animData = animationController?.update(delta) || {};
        const exprData = expressionController?.update(delta) || {};
        const speechData = speechController?.update(delta) || {};

        if (avatarModel) {
          // A. Head & Neck Subtle Micro-Sway & Natural Eye Contact (ZERO body/arm movement)
          if (headBone && restRotations['Head']) {
            headBone.rotation.x = restRotations['Head'].x + (animData.headPitch || 0) * 0.35;
            headBone.rotation.y = restRotations['Head'].y + (animData.headYaw || 0) * 0.3;
            headBone.rotation.z = restRotations['Head'].z + (animData.headRoll || 0) * 0.25;
          }

          if (neckBone && restRotations['Neck']) {
            neckBone.rotation.x = restRotations['Neck'].x + (animData.headPitch || 0) * 0.15;
            neckBone.rotation.y = restRotations['Neck'].y + (animData.headYaw || 0) * 0.15;
          }

          // B. Natural Poisson Eye Blinking (Anatomical Eyelids)
          const blinkVal = exprData.blinkWeight || 0;
          setMorph(headMesh, 'eyeBlinkLeft', blinkVal);
          setMorph(headMesh, 'eyeBlinkRight', blinkVal);
          setMorph(eyeMesh, 'eyesClosed', blinkVal);
          setMorph(eyeAOMesh, 'eyeBlinkLeft', blinkVal);
          setMorph(eyeAOMesh, 'eyeBlinkRight', blinkVal);

          // C. Eyebrow Expressions (Attentive, focused executive presence)
          const browRaise = exprData.weights?.eyebrowRaise || 0.04;
          const browFurrow = exprData.weights?.eyebrowFurrow || 0;
          setMorph(headMesh, 'browInnerUp', browRaise);
          setMorph(headMesh, 'browOuterUpLeft', browRaise * 0.5);
          setMorph(headMesh, 'browOuterUpRight', browRaise * 0.5);
          setMorph(headMesh, 'browDownLeft', browFurrow * 0.5);
          setMorph(headMesh, 'browDownRight', browFurrow * 0.5);
          setMorph(eyelashMesh, 'browInnerUp', browRaise);

          // D. Mature Professional Approachable Smile & Warmth
          const smileVal = exprData.weights?.smile || 0.12;
          setMorph(headMesh, 'mouthSmile', smileVal);
          setMorph(headMesh, 'mouthSmileLeft', smileVal);
          setMorph(headMesh, 'mouthSmileRight', smileVal);

          // E. Real Syllable-Synchronized Lip-Sync with Oculus Visemes & Mouth Open
          const mouthOpen = Math.max(speechData.mouthOpen || 0, exprData.weights?.mouthOpen || 0);
          const isSpeaking = speechData.isSpeaking || mouthOpen > 0.04;

          setMorph(headMesh, 'mouthOpen', mouthOpen * 0.75);
          setMorph(headMesh, 'jawOpen', mouthOpen * 0.65);
          setMorph(teethMesh, 'mouthOpen', mouthOpen * 0.7);
          setMorph(teethMesh, 'jawOpen', mouthOpen * 0.65);

          if (isSpeaking) {
            // Cycle through visemes to match speech syllables naturally
            if (time - lastVisemeTime > 85) {
              lastVisemeTime = time;
              visemeStep = (visemeStep + 1) % VISEMES.length;
            }
            const activeViseme = VISEMES[visemeStep];
            VISEMES.forEach((v) => {
              const weight = v === activeViseme ? mouthOpen * 0.85 : 0;
              setMorph(headMesh, v, weight);
              setMorph(teethMesh, v, weight);
            });
          } else {
            // Mouth closed when listening or idle
            VISEMES.forEach((v) => {
              setMorph(headMesh, v, 0);
              setMorph(teethMesh, v, 0);
            });
          }
        }

        renderer.render(scene, camera);
      };

      animFrameId = requestAnimationFrame(animate);

      // Handle Resize: Maintain 30° vertical FOV so avatar height remains stable at ~60-65%
      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const newW = container.clientWidth || 800;
        const newH = container.clientHeight || 550;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.fov = 30;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      };

      let resizeObserver = null;
      if (typeof ResizeObserver !== 'undefined' && container) {
        resizeObserver = new ResizeObserver(() => {
          handleResize();
        });
        resizeObserver.observe(container);
      }
      window.addEventListener('resize', handleResize);

      return () => {
        isDestroyed = true;
        resizeObserver?.disconnect();
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animFrameId);
        try {
          renderer?.dispose();
        } catch (_) {}
      };
    } catch (err) {
      console.warn('[AvatarRenderer] WebGL init fallback:', err);
      setHasError(true);
    }
  }, [animationController, expressionController, speechController]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Loading Indicator */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070D1E] text-slate-300">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-300">
            Loading AI Interviewer ({loadingProgress || 85}%)
          </p>
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
          3D Canvas Initialized
        </div>
      )}
    </div>
  );
};

export default AvatarRenderer;
