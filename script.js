/**
 * Happy Deepavali Greeting - Interactive 3D Canvas & Audio Engine
 * Sender: Rithvik P R
 * Features:
 *  - Procedural 3D Diya with realistic multi-layer flickering flame & embers
 *  - Floating secondary diyas bobbing in the water/floor reflection
 *  - 3D Firecrackers Engine (Rockets, Chrysanthemum bursts, Willow showers)
 *  - 3D Anar (Flowerpot Spark Fountain)
 *  - 3D Ground Chakra (Spinning spark wheel)
 *  - Interactive Sparkler Cursor Trail
 *  - Pure Web Audio API Sound Engine (zero external audio dependencies)
 *  - 3D Gyroscope/Mouse Parallax & Card Tilt Physics
 */

(function () {
  'use strict';

  // --- Configuration & State ---
  const config = {
    canvas: document.getElementById('webgl-canvas'),
    isAudioMuted: true,
    isSparklerActive: true,
    isAutoFireworks: true,
    flameIntensity: 1.4,
    cameraFov: 45,
  };

  const state = {
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0, screenX: window.innerWidth / 2, screenY: window.innerHeight / 2 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    orbitAngles: { theta: 0, phi: 0.15 },
    orbitTarget: { theta: 0, phi: 0.15 },
    particles: [],
    rockets: [],
    fountains: [],
    chakras: [],
    sparklerQueue: [],
    autoFireworkTimer: 0,
    diyaFlameScale: 1.4,
    time: 0
  };

  // --- Web Audio Synthesizer (Zero External Audio Files) ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.isInitialized = false;
      this.ambientGain = null;
      this.effectsGain = null;
      this.ambientOscs = [];
    }

    init() {
      if (this.isInitialized) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Master FX Gain
        this.effectsGain = this.ctx.createGain();
        this.effectsGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.effectsGain.connect(this.ctx.destination);

        // Master Ambient Gain
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.ambientGain.connect(this.ctx.destination);

        this.startAmbient();
        this.isInitialized = true;
      } catch (e) {
        console.warn('Web Audio not supported or blocked:', e);
      }
    }

    startAmbient() {
      if (!this.ctx) return;
      // Synthesize a soothing Indian meditative tanpura/drone chord (Sa - Pa - Sa octave: 130.81Hz, 196.00Hz, 261.63Hz)
      const baseFreqs = [130.81, 196.00, 261.63, 392.00];
      baseFreqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // LFO for gentle breathing effect
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(0.15 + idx * 0.05, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
        lfo.connect(oscGain.gain);
        lfo.start();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, this.ctx.currentTime);

        oscGain.gain.setValueAtTime(0.05 / (idx + 1), this.ctx.currentTime);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.ambientGain);

        osc.start();
        this.ambientOscs.push(osc);
      });
    }

    toggleMute() {
      if (!this.isInitialized) {
        this.init();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      config.isAudioMuted = !config.isAudioMuted;
      if (this.ambientGain) {
        const targetVol = config.isAudioMuted ? 0 : 0.18;
        this.ambientGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.5);
      }
      return config.isAudioMuted;
    }

    playRocketLaunch() {
      if (config.isAudioMuted || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(950, this.ctx.currentTime + 0.6);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.effectsGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.65);
    }

    playFireworkBurst(type = 'normal') {
      if (config.isAudioMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      
      // Noise burst for the detonation
      const bufferSize = this.ctx.sampleRate * 0.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(type === 'deep' ? 180 : 350, now);
      filter.Q.setValueAtTime(2.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.effectsGain);

      whiteNoise.start();

      // Additional crackles for celebratory sparkle
      for (let j = 0; j < 4; j++) {
        setTimeout(() => {
          if (config.isAudioMuted || !this.ctx) return;
          this.playCrackle();
        }, 120 + j * 70);
      }
    }

    playCrackle() {
      if (config.isAudioMuted || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800 + Math.random() * 1400, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.effectsGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    }

    playBellChime() {
      if (config.isAudioMuted || !this.ctx) return;
      const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major festive bell
      chord.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.04);

        gain.gain.setValueAtTime(0.1 / (i + 1), this.ctx.currentTime + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2 + i * 0.1);

        osc.connect(gain);
        gain.connect(this.effectsGain);

        osc.start(this.ctx.currentTime + i * 0.04);
        osc.stop(this.ctx.currentTime + 1.5 + i * 0.1);
      });
    }
  }

  const audio = new SoundEngine();

  // --- Three.js 3D Setup ---
  let scene, camera, renderer;
  let mainDiyaGroup, flameMesh, flameCoreMesh, diyaPointLight, diyaGlowSprite;
  let secondaryDiyas = [];
  let starsParticles;
  let sparklerTexture, fireworkTexture;

  function initThree() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c0608, 0.022);

    camera = new THREE.PerspectiveCamera(config.cameraFov, width / height, 0.1, 1000);
    camera.position.set(0, 4.5, 12);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // Generate procedural particle textures
    sparklerTexture = createParticleTexture('#ffffff', '#f59e0b');
    fireworkTexture = createParticleTexture('#ffffff', '#fbbf24');

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffedd5, 0.45);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0xfef3c7, 0.5);
    moonLight.position.set(10, 25, -15);
    scene.add(moonLight);

    // Deep warm floor reflection
    const floorGeo = new THREE.PlaneGeometry(120, 120);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x120609,
      roughness: 0.65,
      metalness: 0.4
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.5;
    scene.add(floor);

    // Construct 3D Elements
    buildMainDiya();
    buildSecondaryDiyas();
    buildStarField();

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    // Initial positioning
    updateCameraPosition();
  }

  // --- Procedural Canvas Particle Texture ---
  function createParticleTexture(innerColor, outerColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.25, outerColor);
    grad.addColorStop(0.65, 'rgba(217, 119, 6, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // --- 3D Diya Construction (Traditional Clay/Brass Terracotta Mitti Diya) ---
  function buildMainDiya() {
    mainDiyaGroup = new THREE.Group();
    mainDiyaGroup.position.set(0, -1.8, 4.5);

    // 1. Diya Bowl Geometry (Traditional curved profile)
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(0.8, 0.05));
    points.push(new THREE.Vector2(1.6, 0.35));
    points.push(new THREE.Vector2(2.1, 0.9));
    points.push(new THREE.Vector2(2.2, 1.3));
    points.push(new THREE.Vector2(1.9, 1.4));
    points.push(new THREE.Vector2(1.6, 1.15));
    points.push(new THREE.Vector2(1.1, 0.7));
    points.push(new THREE.Vector2(0, 0.5));

    const diyaGeo = new THREE.LatheGeometry(points, 48);
    
    // Clay / Burnished Brass Material with warm sheen
    const diyaMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.38,
      metalness: 0.32,
      bumpScale: 0.05
    });

    const diyaMesh = new THREE.Mesh(diyaGeo, diyaMat);
    diyaMesh.castShadow = true;
    diyaMesh.receiveShadow = true;
    mainDiyaGroup.add(diyaMesh);

    // Ornamental Rim Details
    const ringGeo = new THREE.TorusGeometry(2.1, 0.08, 16, 48);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.85,
      roughness: 0.25
    });
    const ring = new THREE.Mesh(ringGeo, goldMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.3;
    mainDiyaGroup.add(ring);

    // 2. Oil Pool (Ghee / Oil in Diya)
    const oilGeo = new THREE.CylinderGeometry(1.5, 1.1, 0.1, 32);
    const oilMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.9
    });
    const oilMesh = new THREE.Mesh(oilGeo, oilMat);
    oilMesh.position.y = 0.85;
    mainDiyaGroup.add(oilMesh);

    // 3. Cotton Wick (Baati)
    const wickGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.7, 16);
    const wickMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.8
    });
    const wick = new THREE.Mesh(wickGeo, wickMat);
    wick.position.set(0, 1.1, 0);
    wick.rotation.z = -0.15;
    mainDiyaGroup.add(wick);

    // 4. Realistic Multi-layered 3D Flame
    // Outer flame (Golden teardrop)
    const flameGeo = new THREE.ConeGeometry(0.35, 1.1, 24, 16);
    // Offset geometry pivot to base of flame
    flameGeo.translate(0, 0.55, 0);

    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.position.set(-0.05, 1.35, 0);
    mainDiyaGroup.add(flameMesh);

    // Inner bright core (White/Yellow intense center)
    const coreGeo = new THREE.ConeGeometry(0.18, 0.7, 16);
    coreGeo.translate(0, 0.35, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    flameCoreMesh = new THREE.Mesh(coreGeo, coreMat);
    flameCoreMesh.position.set(-0.05, 1.35, 0);
    mainDiyaGroup.add(flameCoreMesh);

    // Soft Radial Aura Glow Sprite
    const spriteMat = new THREE.SpriteMaterial({
      map: sparklerTexture,
      color: 0xf59e0b,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.65
    });
    diyaGlowSprite = new THREE.Sprite(spriteMat);
    diyaGlowSprite.scale.set(3.5, 3.5, 1);
    diyaGlowSprite.position.set(-0.05, 1.8, 0);
    mainDiyaGroup.add(diyaGlowSprite);

    // 5. Dynamic Warm Point Light
    diyaPointLight = new THREE.PointLight(0xf59e0b, 2.5, 18, 1.5);
    diyaPointLight.position.set(0, 1.9, 0);
    mainDiyaGroup.add(diyaPointLight);

    // Decorative Marigold Petal Ring around base
    buildFlowerRing(mainDiyaGroup);

    scene.add(mainDiyaGroup);
  }

  // Ornamental Marigold (Genda phool) petals around main diya base
  function buildFlowerRing(parentGroup) {
    const petalGeo = new THREE.SphereGeometry(0.2, 8, 8);
    petalGeo.scale(1.2, 0.4, 0.8);

    const orangeMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.7
    });
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.7
    });

    const petalCount = 28;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const radius = 2.4 + (i % 2) * 0.2;
      const mat = i % 2 === 0 ? orangeMat : yellowMat;
      const petal = new THREE.Mesh(petalGeo, mat);

      petal.position.set(Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius);
      petal.rotation.y = -angle;
      petal.rotation.z = 0.2;
      parentGroup.add(petal);
    }
  }

  // Secondary floating / peripheral diyas
  function buildSecondaryDiyas() {
    const positions = [
      { x: -7.5, y: -2.3, z: 2 },
      { x: 7.5, y: -2.3, z: 2 },
      { x: -5.0, y: -2.4, z: -2 },
      { x: 5.0, y: -2.4, z: -2 },
      { x: -10.5, y: -2.3, z: -5 },
      { x: 10.5, y: -2.3, z: -5 }
    ];

    const baseGeo = new THREE.CylinderGeometry(0.65, 0.35, 0.45, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.4,
      metalness: 0.3
    });

    const flameGeo = new THREE.ConeGeometry(0.18, 0.65, 12);
    flameGeo.translate(0, 0.3, 0);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.85
    });

    positions.forEach((pos, idx) => {
      const group = new THREE.Group();
      group.position.set(pos.x, pos.y, pos.z);

      const mesh = new THREE.Mesh(baseGeo, baseMat);
      group.add(mesh);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 0.25;
      group.add(flame);

      const light = new THREE.PointLight(0xf59e0b, 0.8, 6);
      light.position.y = 0.6;
      group.add(light);

      scene.add(group);
      secondaryDiyas.push({
        group,
        flame,
        light,
        baseY: pos.y,
        offset: idx * 0.85
      });
    });
  }

  // Distant stars & golden embers
  function buildStarField() {
    const starCount = 350;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 80;
      positions[i3 + 1] = Math.random() * 40 - 2;
      positions[i3 + 2] = (Math.random() - 0.5) * 50 - 15;

      const warmTint = Math.random();
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.8 + warmTint * 0.2;
      colors[i3 + 2] = 0.5 + warmTint * 0.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      map: sparklerTexture,
      blending: THREE.AdditiveBlending
    });

    starsParticles = new THREE.Points(geometry, material);
    scene.add(starsParticles);
  }

  // --- 3D Firecracker System ---

  // Particle Class for individual explosion sparks
  class Particle {
    constructor(x, y, z, vx, vy, vz, color, size, life, type = 'star') {
      this.x = x;
      this.y = y;
      this.z = z;
      this.vx = vx;
      this.vy = vy;
      this.vz = vz;
      this.color = color;
      this.size = size;
      this.initialSize = size;
      this.life = life;
      this.maxLife = life;
      this.type = type; // 'star', 'willow', 'smoke', 'fountain'
      this.gravity = type === 'willow' ? -0.015 : -0.022;
      this.drag = type === 'fountain' ? 0.97 : 0.96;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.z += this.vz;

      this.vy += this.gravity;
      this.vx *= this.drag;
      this.vy *= this.drag;
      this.vz *= this.drag;

      this.life--;
      const progress = this.life / this.maxLife;
      this.size = this.initialSize * (this.type === 'willow' ? progress : Math.max(0, progress));

      // Twinkle / crackle effect
      if (this.type === 'willow' && Math.random() < 0.08) {
        this.size *= 1.4;
      }

      return this.life > 0;
    }
  }

  // Sky Rocket Class
  class Rocket {
    constructor(targetX, targetY, targetZ, colorPalette) {
      this.x = (Math.random() - 0.5) * 8;
      this.y = -2.5;
      this.z = (Math.random() - 0.5) * 10 - 2;

      this.targetX = targetX;
      this.targetY = targetY;
      this.targetZ = targetZ;

      const duration = 38 + Math.random() * 12;
      this.vx = (targetX - this.x) / duration;
      this.vy = (targetY - this.y) / duration + 0.5 * 0.018 * duration;
      this.vz = (targetZ - this.z) / duration;

      this.colorPalette = colorPalette;
      this.life = duration;
      this.dead = false;

      audio.playRocketLaunch();
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.z += this.vz;
      this.vy -= 0.018;

      this.life--;

      // Smoke / spark trail
      if (Math.random() < 0.8) {
        state.particles.push(new Particle(
          this.x, this.y, this.z,
          (Math.random() - 0.5) * 0.08,
          -0.08 - Math.random() * 0.05,
          (Math.random() - 0.5) * 0.08,
          0xf59e0b,
          0.3,
          20,
          'smoke'
        ));
      }

      if (this.life <= 0 && !this.dead) {
        this.explode();
        this.dead = true;
      }

      return !this.dead;
    }

    explode() {
      audio.playFireworkBurst(Math.random() < 0.3 ? 'deep' : 'normal');

      // Create momentary flash point light
      const flash = new THREE.PointLight(this.colorPalette.core, 6.0, 30);
      flash.position.set(this.x, this.y, this.z);
      scene.add(flash);
      gsap.to(flash, {
        intensity: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => scene.remove(flash)
      });

      const count = 120 + Math.floor(Math.random() * 60);
      const isWillow = Math.random() < 0.45;
      const type = isWillow ? 'willow' : 'star';

      for (let i = 0; i < count; i++) {
        // Spherical distribution
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.cbrt(Math.random());
        const speed = (isWillow ? 0.45 : 0.65) * (0.8 + Math.random() * 0.5);

        const sinPhi = Math.sin(phi);
        const vx = r * speed * sinPhi * Math.cos(theta);
        const vy = r * speed * Math.cos(phi);
        const vz = r * speed * sinPhi * Math.sin(theta);

        const color = Math.random() < 0.25 ? this.colorPalette.core : this.colorPalette.sparks;
        const life = isWillow ? 55 + Math.random() * 30 : 35 + Math.random() * 20;
        const size = isWillow ? 0.4 : 0.5;

        state.particles.push(new Particle(
          this.x, this.y, this.z,
          vx, vy, vz,
          color, size, life, type
        ));
      }
    }
  }

  // Anar (Flowerpot Fountain of Sparks)
  class AnarFountain {
    constructor(x, y, z, duration = 180) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.duration = duration;
      this.age = 0;

      // Anar light
      this.light = new THREE.PointLight(0xf59e0b, 3.5, 15);
      this.light.position.set(x, y + 1.5, z);
      scene.add(this.light);

      audio.playBellChime();
    }

    update() {
      this.age++;
      const progress = this.age / this.duration;
      const intensity = Math.sin(progress * Math.PI);

      this.light.intensity = intensity * 4.5;

      // Emit high-velocity golden fountain sparks
      const sparksPerFrame = Math.floor(intensity * 12) + 2;
      for (let i = 0; i < sparksPerFrame; i++) {
        const spread = 0.18;
        const vx = (Math.random() - 0.5) * spread;
        const vy = 0.45 + Math.random() * 0.55 * (0.5 + intensity * 0.8);
        const vz = (Math.random() - 0.5) * spread;

        const color = Math.random() < 0.4 ? 0xfef08a : (Math.random() < 0.8 ? 0xf59e0b : 0xd97706);
        state.particles.push(new Particle(
          this.x + (Math.random() - 0.5) * 0.1,
          this.y + 0.1,
          this.z + (Math.random() - 0.5) * 0.1,
          vx, vy, vz,
          color, 0.45, 30 + Math.random() * 18, 'fountain'
        ));
      }

      if (Math.random() < 0.25) {
        audio.playCrackle();
      }

      if (this.age >= this.duration) {
        scene.remove(this.light);
        return false;
      }
      return true;
    }
  }

  // Ground Chakra (Spinning Ground Wheel of Spiraling Sparks)
  class ChakraWheel {
    constructor(x, y, z, duration = 220) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.duration = duration;
      this.age = 0;
      this.spinAngle = 0;
      this.spinSpeed = 0.38;

      this.light = new THREE.PointLight(0xf59e0b, 2.5, 12);
      this.light.position.set(x, y + 0.5, z);
      scene.add(this.light);

      audio.playBellChime();
    }

    update() {
      this.age++;
      this.spinAngle += this.spinSpeed;
      const progress = this.age / this.duration;
      const intensity = Math.sin(progress * Math.PI);

      this.light.intensity = intensity * 3.8;

      // Emit spiraling sparks from 3 tangential nozzles
      const nozzles = 3;
      for (let n = 0; n < nozzles; n++) {
        const angle = this.spinAngle + (n * (Math.PI * 2 / nozzles));
        const speed = 0.28 + intensity * 0.18;
        const vx = Math.cos(angle) * speed;
        const vz = Math.sin(angle) * speed;
        const vy = 0.05 + Math.random() * 0.09;

        const color = Math.random() < 0.35 ? 0xffffff : (Math.random() < 0.75 ? 0xf59e0b : 0xd97706);
        state.particles.push(new Particle(
          this.x,
          this.y + 0.1,
          this.z,
          vx, vy, vz,
          color,
          0.38,
          25 + Math.random() * 10,
          'star'
        ));
      }

      if (Math.random() < 0.2) {
        audio.playCrackle();
      }

      if (this.age >= this.duration) {
        scene.remove(this.light);
        return false;
      }
      return true;
    }
  }

  // Particle System Renderer using dynamic Three.js Points
  let dynamicParticleSystem = null;
  const MAX_PARTICLES = 3000;
  const pPositions = new Float32Array(MAX_PARTICLES * 3);
  const pColors = new Float32Array(MAX_PARTICLES * 3);
  const pSizes = new Float32Array(MAX_PARTICLES);

  function initDynamicParticles() {
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    pGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

    const pMat = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      map: fireworkTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    dynamicParticleSystem = new THREE.Points(pGeo, pMat);
    scene.add(dynamicParticleSystem);
  }

  function updateDynamicParticles() {
    const threeColor = new THREE.Color();
    let renderCount = 0;

    for (let i = 0; i < state.particles.length && renderCount < MAX_PARTICLES; i++) {
      const p = state.particles[i];
      const idx = renderCount * 3;

      pPositions[idx] = p.x;
      pPositions[idx + 1] = p.y;
      pPositions[idx + 2] = p.z;

      threeColor.setHex(p.color);
      pColors[idx] = threeColor.r;
      pColors[idx + 1] = threeColor.g;
      pColors[idx + 2] = threeColor.b;

      pSizes[renderCount] = p.size;
      renderCount++;
    }

    // Clear unused slots
    for (let j = renderCount; j < MAX_PARTICLES; j++) {
      pSizes[j] = 0;
    }

    dynamicParticleSystem.geometry.attributes.position.needsUpdate = true;
    dynamicParticleSystem.geometry.attributes.color.needsUpdate = true;
    dynamicParticleSystem.geometry.attributes.size.needsUpdate = true;
  }

  // --- Firework Launchers ---
  const fireworkColorSets = [
    { core: 0xffffff, sparks: 0xf59e0b }, // Golden Amber
    { core: 0xfef08a, sparks: 0xd97706 }, // Deep Honey Gold
    { core: 0xffedd5, sparks: 0xe11d48 }, // Festive Ruby Rose
    { core: 0xfbcfe8, sparks: 0xec4899 }, // Auspicious Pink
    { core: 0xfef3c7, sparks: 0x10b981 }, // Emerald Garland
    { core: 0xfffbeb, sparks: 0x8b5cf6 }, // Royal Violet
  ];

  function launchFirework(targetX, targetY, targetZ) {
    const palette = fireworkColorSets[Math.floor(Math.random() * fireworkColorSets.length)];
    const tx = targetX !== undefined ? targetX : (Math.random() - 0.5) * 16;
    const ty = targetY !== undefined ? targetY : 5 + Math.random() * 7;
    const tz = targetZ !== undefined ? targetZ : -3 + (Math.random() - 0.5) * 8;

    state.rockets.push(new Rocket(tx, ty, tz, palette));
  }

  function launchAnarFountain(x, z) {
    const posX = x !== undefined ? x : (Math.random() < 0.5 ? -3.8 : 3.8);
    const posZ = z !== undefined ? z : 2.5;
    state.fountains.push(new AnarFountain(posX, -2.5, posZ, 200));
  }

  function launchChakraWheel(x, z) {
    const posX = x !== undefined ? x : (Math.random() < 0.5 ? -2.6 : 2.6);
    const posZ = z !== undefined ? z : 3.2;
    state.chakras.push(new ChakraWheel(posX, -2.4, posZ, 220));
  }

  function launchBarrage() {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        launchFirework();
      }, i * 220);
    }
  }

  // --- Interactive Sparkler Cursor ---
  function emitSparklerCursor(x, y) {
    if (!config.isSparklerActive) return;

    // Convert screen coordinates to normalized 3D ray in front of camera
    const vector = new THREE.Vector3(
      (x / window.innerWidth) * 2 - 1,
      -(y / window.innerHeight) * 2 + 1,
      0.5
    );
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = 8;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    // Emit golden sizzling sparks
    for (let i = 0; i < 3; i++) {
      const speed = 0.12;
      state.particles.push(new Particle(
        pos.x + (Math.random() - 0.5) * 0.1,
        pos.y + (Math.random() - 0.5) * 0.1,
        pos.z + (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed,
        Math.random() < 0.3 ? 0xffffff : 0xf59e0b,
        0.3,
        18 + Math.random() * 10,
        'star'
      ));
    }
  }

  // --- Main Animation Loop ---
  function animate() {
    requestAnimationFrame(animate);

    state.time += 0.02;

    // 1. Smooth Diya Flame Flicker & Physics
    if (flameMesh && flameCoreMesh) {
      const noise = Math.sin(state.time * 7) * 0.08 + Math.cos(state.time * 13) * 0.04;
      const baseScale = config.flameIntensity;
      const scaleX = baseScale * (1 + noise * 0.5);
      const scaleY = baseScale * (1 + Math.sin(state.time * 9) * 0.12);
      const scaleZ = baseScale * (1 - noise * 0.4);

      flameMesh.scale.set(scaleX, scaleY, scaleZ);
      flameCoreMesh.scale.set(scaleX * 0.7, scaleY * 0.75, scaleZ * 0.7);

      flameMesh.rotation.z = Math.sin(state.time * 5) * 0.05;
      flameCoreMesh.rotation.z = flameMesh.rotation.z;

      if (diyaPointLight) {
        diyaPointLight.intensity = (2.2 + noise * 0.8) * config.flameIntensity;
      }
      if (diyaGlowSprite) {
        diyaGlowSprite.scale.set(
          (3.5 + noise * 0.5) * config.flameIntensity,
          (3.5 + noise * 0.5) * config.flameIntensity,
          1
        );
      }

      // Small golden embers drifting up from the flame tip
      if (Math.random() < 0.35) {
        const flameTipPos = new THREE.Vector3(0, 1.35 * baseScale + 1.2, 0);
        mainDiyaGroup.localToWorld(flameTipPos);

        state.particles.push(new Particle(
          flameTipPos.x + (Math.random() - 0.5) * 0.08,
          flameTipPos.y,
          flameTipPos.z + (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.02,
          0.04 + Math.random() * 0.03,
          (Math.random() - 0.5) * 0.02,
          0xfef08a,
          0.25,
          25 + Math.random() * 15,
          'star'
        ));
      }
    }

    // 2. Secondary Diyas Bobbing Animation
    secondaryDiyas.forEach(d => {
      d.group.position.y = d.baseY + Math.sin(state.time * 1.5 + d.offset) * 0.08;
      d.flame.scale.y = 1 + Math.sin(state.time * 8 + d.offset) * 0.15;
      d.light.intensity = 0.8 + Math.cos(state.time * 6 + d.offset) * 0.2;
    });

    // 3. Stars Gentle Shimmer
    if (starsParticles) {
      starsParticles.rotation.y = state.time * 0.005;
    }

    // 4. Update Rockets
    for (let i = state.rockets.length - 1; i >= 0; i--) {
      if (!state.rockets[i].update()) {
        state.rockets.splice(i, 1);
      }
    }

    // 5. Update Anar Fountains
    for (let i = state.fountains.length - 1; i >= 0; i--) {
      if (!state.fountains[i].update()) {
        state.fountains.splice(i, 1);
      }
    }

    // 5b. Update Chakras
    for (let i = state.chakras.length - 1; i >= 0; i--) {
      if (!state.chakras[i].update()) {
        state.chakras.splice(i, 1);
      }
    }

    // 6. Update Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      if (!state.particles[i].update()) {
        state.particles.splice(i, 1);
      }
    }
    updateDynamicParticles();

    // 7. Auto Fireworks Show
    if (config.isAutoFireworks) {
      state.autoFireworkTimer++;
      if (state.autoFireworkTimer % 140 === 0) {
        launchFirework();
      }
    }

    // 8. Smooth Camera Parallax & Diya Tilt
    updateCameraPosition();

    renderer.render(scene, camera);
  }

  // Camera Orbit & Subtle Diya Tilt based on pointer
  function updateCameraPosition() {
    // Smooth interpolation towards target angles
    state.orbitAngles.theta += (state.orbitTarget.theta - state.orbitAngles.theta) * 0.06;
    state.orbitAngles.phi += (state.orbitTarget.phi - state.orbitAngles.phi) * 0.06;

    const radius = 13.5;
    const clampedPhi = Math.max(0.05, Math.min(Math.PI / 2.2, state.orbitAngles.phi));

    camera.position.x = radius * Math.sin(state.orbitAngles.theta) * Math.cos(clampedPhi);
    camera.position.y = radius * Math.sin(clampedPhi) + 0.5;
    camera.position.z = radius * Math.cos(state.orbitAngles.theta) * Math.cos(clampedPhi);
    camera.lookAt(0, 0.2, 0);

    // Diya subtle responsive tilt
    if (mainDiyaGroup) {
      mainDiyaGroup.rotation.y = -state.orbitAngles.theta * 0.5;
    }
  }

  // --- Interaction & Event Handling ---
  function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function onPointerMove(e) {
    state.mouse.screenX = e.clientX;
    state.mouse.screenY = e.clientY;

    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = -(e.clientY / window.innerHeight) * 2 + 1;

    // Orbit target when dragging
    if (state.isDragging) {
      const deltaX = e.clientX - state.dragStart.x;
      const deltaY = e.clientY - state.dragStart.y;
      state.orbitTarget.theta -= deltaX * 0.005;
      state.orbitTarget.phi += deltaY * 0.005;
      state.dragStart.x = e.clientX;
      state.dragStart.y = e.clientY;
    } else {
      // Subtle ambient parallax
      state.orbitTarget.theta = normX * 0.25;
      state.orbitTarget.phi = 0.22 - normY * 0.12;
    }

    // Sparkler cursor effect
    emitSparklerCursor(e.clientX, e.clientY);

    // 3D Card tilt calculation
    updateCardTilt(normX, normY, e.clientX, e.clientY);
  }

  // --- Diya Blessing Glow & Particle Burst ---
  function triggerDiyaBlessing() {
    audio.playBellChime();

    // Trigger intense glowing burst
    gsap.to(config, {
      flameIntensity: 2.8,
      duration: 0.45,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onComplete: () => {
        const slider = document.getElementById('flame-intensity');
        config.flameIntensity = slider ? parseFloat(slider.value) : 1.4;
      }
    });

    // Emit blessings particle ring around the Diya
    if (mainDiyaGroup) {
      for (let i = 0; i < 48; i++) {
        const angle = (i / 48) * Math.PI * 2;
        const speed = 0.09;
        state.particles.push(new Particle(
          mainDiyaGroup.position.x,
          mainDiyaGroup.position.y + 1.2,
          mainDiyaGroup.position.z,
          Math.cos(angle) * speed,
          0.05 + Math.random() * 0.07,
          Math.sin(angle) * speed,
          0xfef08a,
          0.45,
          45,
          'star'
        ));
      }
    }

    showToast('Diya illuminated with divine blessings!');
  }

  function onPointerDown(e) {
    // Only capture background canvas clicks, not card or button interactions
    if (e.target.closest('#greeting-card, .header, .footer-bar')) {
      return;
    }

    // Raycast to check if clicking directly on 3D Diya
    if (mainDiyaGroup && camera) {
      const mouseVec = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseVec, camera);
      const intersects = raycaster.intersectObjects(mainDiyaGroup.children, true);
      if (intersects.length > 0) {
        triggerDiyaBlessing();
        return;
      }
    }

    state.isDragging = true;
    state.dragStart.x = e.clientX;
    state.dragStart.y = e.clientY;

    // Launch firework towards clicked 3D space
    const vector = new THREE.Vector3(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
      0.5
    );
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = 12;
    const target = camera.position.clone().add(dir.multiplyScalar(distance));

    launchFirework(target.x, Math.max(3, target.y), target.z);
  }

  function onPointerUp() {
    state.isDragging = false;
  }

  // --- 3D Greeting Card Tilt & Dynamic Glare ---
  const cardElement = document.getElementById('greeting-card');
  const cardGlare = document.getElementById('card-glare');

  function updateCardTilt(normX, normY, clientX, clientY) {
    if (!cardElement) return;

    // Check if prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const tiltX = -normY * 8; // subtle max 8 degrees
    const tiltY = normX * 8;

    cardElement.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

    if (cardGlare) {
      const rect = cardElement.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      if (relX >= 0 && relX <= rect.width && relY >= 0 && relY <= rect.height) {
        cardGlare.style.opacity = '1';
        cardGlare.style.background = `radial-gradient(circle at ${relX}px ${relY}px, rgba(254, 243, 199, 0.18) 0%, transparent 60%)`;
      } else {
        cardGlare.style.opacity = '0';
      }
    }
  }

  // --- UI Action Buttons & Interactions ---
  function setupUI() {
    // 1. Audio Mute / Unmute
    const audioBtn = document.getElementById('btn-audio');
    const soundOnIcon = audioBtn.querySelector('.icon-sound-on');
    const soundOffIcon = audioBtn.querySelector('.icon-sound-off');

    audioBtn.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      if (isMuted) {
        soundOnIcon.classList.add('hidden');
        soundOffIcon.classList.remove('hidden');
        audioBtn.classList.remove('active');
        showToast('Ambient audio muted');
      } else {
        soundOnIcon.classList.remove('hidden');
        soundOffIcon.classList.add('hidden');
        audioBtn.classList.add('active');
        showToast('Ambient festive sounds playing');
      }
    });

    // 2. Sparkler Cursor Toggle
    const sparklerBtn = document.getElementById('btn-sparkler');
    sparklerBtn.addEventListener('click', () => {
      config.isSparklerActive = !config.isSparklerActive;
      sparklerBtn.classList.toggle('active', config.isSparklerActive);
      showToast(config.isSparklerActive ? 'Sparkler cursor activated' : 'Sparkler cursor paused');
    });

    // 3. Share Greeting Button
    const shareBtn = document.getElementById('btn-share');
    shareBtn.addEventListener('click', () => {
      const shareTitle = 'Happy Deepavali Greeting from Rithvik P R';
      const shareText = `Wishing you and your family a very Happy Diwali. May the festival of lights bring joy, prosperity, and new beginnings to your home. Have a wonderful celebration.\n\n— With warm regards, Rithvik P R`;
      const shareUrl = window.location.href;

      if (navigator.share) {
        navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        }).catch(() => {
          copyToClipboard(shareText);
        });
      } else {
        copyToClipboard(shareText);
      }
    });

    // 4. Light The Diya Action
    const lightDiyaBtn = document.getElementById('btn-light-diya');
    if (lightDiyaBtn) {
      lightDiyaBtn.addEventListener('click', triggerDiyaBlessing);
    }

    // 5. Burst Fireworks Button
    const fireworksBtn = document.getElementById('btn-fireworks');
    fireworksBtn.addEventListener('click', () => {
      launchBarrage();
      showToast('Grand festive fireworks launched!');
    });

    // 6. Spark Fountain (Anar) Button
    const anarBtn = document.getElementById('btn-anar');
    anarBtn.addEventListener('click', () => {
      launchAnarFountain(-3.5, 3);
      launchAnarFountain(3.5, 3);
      showToast('Spark fountains (Anar) ignited!');
    });

    // 6b. Ground Chakra Button
    const chakraBtn = document.getElementById('btn-chakra');
    if (chakraBtn) {
      chakraBtn.addEventListener('click', () => {
        launchChakraWheel(-2.6, 3.2);
        launchChakraWheel(2.6, 3.2);
        showToast('Spinning ground chakras ignited!');
      });
    }

    // 7. Flame Intensity Slider
    const intensitySlider = document.getElementById('flame-intensity');
    intensitySlider.addEventListener('input', (e) => {
      config.flameIntensity = parseFloat(e.target.value);
    });

    // 8. Auto Fireworks Toggle
    const autoShowBtn = document.getElementById('btn-auto-show');
    autoShowBtn.addEventListener('click', () => {
      config.isAutoFireworks = !config.isAutoFireworks;
      autoShowBtn.classList.toggle('active', config.isAutoFireworks);
      showToast(config.isAutoFireworks ? 'Auto fireworks show enabled' : 'Auto fireworks paused');
    });

    // 9. First user interaction to trigger initial welcoming firework & audio prep
    const triggerFirstWelcome = () => {
      audio.init();
      window.removeEventListener('click', triggerFirstWelcome);
      window.removeEventListener('keydown', triggerFirstWelcome);
    };
    window.addEventListener('click', triggerFirstWelcome, { once: true });
    window.addEventListener('keydown', triggerFirstWelcome, { once: true });

    // Initial greeting launch after a brief moment
    setTimeout(() => {
      launchFirework(0, 7.5, -4);
    }, 1200);
  }

  // --- Helper Functions ---
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Greeting message copied to clipboard!');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('Greeting message copied to clipboard!');
    } catch (err) {
      showToast('Could not copy automatically');
    }
    document.body.removeChild(textarea);
  }

  let toastTimeout = null;
  function showToast(message) {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.classList.add('show');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Initialize application once DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initThree();
      initDynamicParticles();
      setupUI();
      animate();
    });
  } else {
    initThree();
    initDynamicParticles();
    setupUI();
    animate();
  }

})();
