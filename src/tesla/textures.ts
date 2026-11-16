import * as THREE from 'three';

export interface ProceduralTextureSet {
  tireBump: THREE.CanvasTexture;
  rotorBump: THREE.CanvasTexture;
  carbonDiffuse: THREE.CanvasTexture;
  carbonBump: THREE.CanvasTexture;
  leatherBump: THREE.CanvasTexture;
  touchscreenMap: THREE.CanvasTexture;
  rearScreenMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  turntableRingMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  return [canvas, ctx];
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const aniso = Math.min(Math.max(maxAnisotropy, 1), 8);

  // 1. Tire Tread & Sidewall Bump Texture
  const [tireCanvas, tireCtx] = makeCanvas(512, 512);
  tireCtx.fillStyle = '#808080';
  tireCtx.fillRect(0, 0, 512, 512);
  // Circumferential main rain grooves
  tireCtx.fillStyle = '#202020';
  for (const x of [130, 210, 302, 382]) {
    tireCtx.fillRect(x - 10, 0, 20, 512);
  }
  // Angled shoulder sipes
  tireCtx.strokeStyle = '#2a2a2a';
  tireCtx.lineWidth = 8;
  for (let y = -64; y < 576; y += 32) {
    tireCtx.beginPath();
    tireCtx.moveTo(20, y);
    tireCtx.lineTo(125, y + 36);
    tireCtx.stroke();

    tireCtx.beginPath();
    tireCtx.moveTo(492, y);
    tireCtx.lineTo(387, y + 36);
    tireCtx.stroke();

    tireCtx.beginPath();
    tireCtx.moveTo(222, y + 12);
    tireCtx.lineTo(290, y - 12);
    tireCtx.stroke();
  }
  const tireBump = new THREE.CanvasTexture(tireCanvas);
  tireBump.wrapS = THREE.RepeatWrapping;
  tireBump.wrapT = THREE.RepeatWrapping;
  tireBump.repeat.set(1, 8);
  tireBump.anisotropy = aniso;

  // 2. Cross-Drilled Ventilated Brake Rotor Texture
  const [rotorCanvas, rotorCtx] = makeCanvas(512, 512);
  rotorCtx.fillStyle = '#b8b8b8';
  rotorCtx.fillRect(0, 0, 512, 512);
  const cx = 256;
  const cy = 256;
  // Concentric brushed machining grooves
  for (let r = 85; r < 245; r += 3) {
    rotorCtx.strokeStyle = r % 6 === 0 ? '#a2a2a2' : '#cfcfcf';
    rotorCtx.lineWidth = 1.5;
    rotorCtx.beginPath();
    rotorCtx.arc(cx, cy, r, 0, Math.PI * 2);
    rotorCtx.stroke();
  }
  // Curved cross-drilled ventilation holes
  rotorCtx.fillStyle = '#181818';
  for (let i = 0; i < 24; i++) {
    const baseAngle = (i / 24) * Math.PI * 2;
    for (let j = 0; j < 4; j++) {
      const r = 115 + j * 32;
      const a = baseAngle + j * 0.08;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      rotorCtx.beginPath();
      rotorCtx.arc(px, py, 5.5, 0, Math.PI * 2);
      rotorCtx.fill();
    }
  }
  const rotorBump = new THREE.CanvasTexture(rotorCanvas);
  rotorBump.anisotropy = aniso;

  // 3. 2x2 Twill Carbon Fiber Weave
  const [carbonDiffCanvas, cdCtx] = makeCanvas(128, 128);
  const [carbonBumpCanvas, cbCtx] = makeCanvas(128, 128);
  cdCtx.fillStyle = '#16181d';
  cdCtx.fillRect(0, 0, 128, 128);
  cbCtx.fillStyle = '#606060';
  cbCtx.fillRect(0, 0, 128, 128);
  const step = 16;
  for (let y = 0; y < 128; y += step) {
    for (let x = 0; x < 128; x += step) {
      const diag = ((x / step + y / step) % 2) === 0;
      cdCtx.fillStyle = diag ? '#262a33' : '#121419';
      cdCtx.fillRect(x + 1, y + 1, step - 2, step - 2);
      cbCtx.fillStyle = diag ? '#b8b8b8' : '#404040';
      cbCtx.fillRect(x + 1, y + 1, step - 2, step - 2);
    }
  }
  const carbonDiffuse = new THREE.CanvasTexture(carbonDiffCanvas);
  carbonDiffuse.colorSpace = THREE.SRGBColorSpace;
  carbonDiffuse.wrapS = THREE.RepeatWrapping;
  carbonDiffuse.wrapT = THREE.RepeatWrapping;
  carbonDiffuse.repeat.set(10, 10);
  carbonDiffuse.anisotropy = aniso;

  const carbonBump = new THREE.CanvasTexture(carbonBumpCanvas);
  carbonBump.wrapS = THREE.RepeatWrapping;
  carbonBump.wrapT = THREE.RepeatWrapping;
  carbonBump.repeat.set(10, 10);
  carbonBump.anisotropy = aniso;

  // 4. Micro-perforated Vegan Leather Grain
  const [leatherCanvas, leatherCtx] = makeCanvas(256, 256);
  leatherCtx.fillStyle = '#909090';
  leatherCtx.fillRect(0, 0, 256, 256);
  leatherCtx.fillStyle = '#555555';
  for (let y = 4; y < 256; y += 12) {
    for (let x = 4; x < 256; x += 12) {
      const offset = (y / 12) % 2 === 0 ? 0 : 6;
      leatherCtx.beginPath();
      leatherCtx.arc((x + offset) % 256, y, 1.8, 0, Math.PI * 2);
      leatherCtx.fill();
    }
  }
  const leatherBump = new THREE.CanvasTexture(leatherCanvas);
  leatherBump.wrapS = THREE.RepeatWrapping;
  leatherBump.wrapT = THREE.RepeatWrapping;
  leatherBump.repeat.set(8, 8);
  leatherBump.anisotropy = aniso;

  // 5. 17" Tesla Cinematic Touchscreen UI
  const [screenCanvas, sCtx] = makeCanvas(1024, 640);
  sCtx.fillStyle = '#0c1017';
  sCtx.fillRect(0, 0, 1024, 640);

  // Left vehicle visualization panel
  const leftGrad = sCtx.createLinearGradient(0, 0, 340, 640);
  leftGrad.addColorStop(0, '#131924');
  leftGrad.addColorStop(1, '#090c12');
  sCtx.fillStyle = leftGrad;
  sCtx.fillRect(0, 0, 340, 640);

  // Stylized top-down car & autopilot lane visualization on left panel
  sCtx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  sCtx.lineWidth = 3;
  sCtx.beginPath();
  sCtx.moveTo(85, 620);
  sCtx.lineTo(130, 180);
  sCtx.moveTo(255, 620);
  sCtx.lineTo(210, 180);
  sCtx.stroke();

  // Blue autopilot path ribbon
  const pathGrad = sCtx.createLinearGradient(170, 560, 170, 210);
  pathGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
  pathGrad.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
  sCtx.fillStyle = pathGrad;
  sCtx.beginPath();
  sCtx.moveTo(132, 560);
  sCtx.lineTo(208, 560);
  sCtx.lineTo(186, 210);
  sCtx.lineTo(154, 210);
  sCtx.closePath();
  sCtx.fill();

  // Top-down vehicle silhouette on screen
  sCtx.fillStyle = '#d1d5db';
  sCtx.beginPath();
  sCtx.roundRect(138, 390, 64, 140, 22);
  sCtx.fill();
  sCtx.fillStyle = '#1e293b';
  sCtx.beginPath();
  sCtx.roundRect(145, 425, 50, 74, 12);
  sCtx.fill();

  // Battery & gear bar
  sCtx.fillStyle = '#22c55e';
  sCtx.fillRect(28, 28, 42, 18);
  sCtx.strokeStyle = '#64748b';
  sCtx.lineWidth = 2;
  sCtx.strokeRect(26, 26, 54, 22);

  // Right map panel
  sCtx.fillStyle = '#151c28';
  sCtx.fillRect(344, 0, 680, 550);
  // Dark vector roads
  sCtx.strokeStyle = '#253145';
  sCtx.lineWidth = 10;
  for (let i = 0; i < 8; i++) {
    sCtx.beginPath();
    sCtx.moveTo(344, 65 * i + 40);
    sCtx.bezierCurveTo(540, 65 * i + 10, 760, 65 * i + 90, 1024, 65 * i + 30);
    sCtx.stroke();
  }
  sCtx.strokeStyle = '#1f293a';
  sCtx.lineWidth = 7;
  for (let i = 0; i < 6; i++) {
    sCtx.beginPath();
    sCtx.moveTo(410 + i * 110, 0);
    sCtx.lineTo(440 + i * 105, 550);
    sCtx.stroke();
  }
  // Glowing navigation route line
  sCtx.strokeStyle = '#38bdf8';
  sCtx.lineWidth = 8;
  sCtx.beginPath();
  sCtx.moveTo(640, 490);
  sCtx.lineTo(660, 320);
  sCtx.lineTo(790, 240);
  sCtx.lineTo(845, 95);
  sCtx.stroke();
  // Nav cursor
  sCtx.fillStyle = '#ffffff';
  sCtx.beginPath();
  sCtx.arc(640, 490, 11, 0, Math.PI * 2);
  sCtx.fill();

  // Bottom dock strip
  sCtx.fillStyle = '#080a0f';
  sCtx.fillRect(0, 550, 1024, 90);
  sCtx.fillStyle = '#334155';
  for (let i = 0; i < 9; i++) {
    sCtx.beginPath();
    sCtx.roundRect(110 + i * 92, 574, 42, 42, 10);
    sCtx.fill();
  }

  const touchscreenMap = new THREE.CanvasTexture(screenCanvas);
  touchscreenMap.colorSpace = THREE.SRGBColorSpace;
  touchscreenMap.anisotropy = aniso;

  // 6. Rear 8" Console Display
  const [rearCanvas, rCtx] = makeCanvas(512, 320);
  rCtx.fillStyle = '#0b0e14';
  rCtx.fillRect(0, 0, 512, 320);
  rCtx.fillStyle = '#1e293b';
  rCtx.beginPath();
  rCtx.roundRect(24, 24, 464, 272, 20);
  rCtx.fill();
  rCtx.fillStyle = '#38bdf8';
  rCtx.beginPath();
  rCtx.arc(160, 160, 48, 0, Math.PI * 2);
  rCtx.fill();
  rCtx.fillStyle = '#ef4444';
  rCtx.beginPath();
  rCtx.arc(352, 160, 48, 0, Math.PI * 2);
  rCtx.fill();
  const rearScreenMap = new THREE.CanvasTexture(rearCanvas);
  rearScreenMap.colorSpace = THREE.SRGBColorSpace;
  rearScreenMap.anisotropy = aniso;

  // 7. Elliptical Soft Contact Shadow under the Tesla
  const [shadowCanvas, shCtx] = makeCanvas(512, 512);
  shCtx.clearRect(0, 0, 512, 512);
  const shGrad = shCtx.createRadialGradient(256, 256, 40, 256, 256, 245);
  shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.94)');
  shGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.62)');
  shGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.16)');
  shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 512, 512);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  // 8. Studio Turntable Floor Concentric Markings
  const [ttCanvas, ttCtx] = makeCanvas(1024, 1024);
  ttCtx.clearRect(0, 0, 1024, 1024);
  ttCtx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ttCtx.lineWidth = 2;
  ttCtx.beginPath();
  ttCtx.arc(512, 512, 470, 0, Math.PI * 2);
  ttCtx.stroke();

  ttCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ttCtx.lineWidth = 1.5;
  ttCtx.beginPath();
  ttCtx.arc(512, 512, 390, 0, Math.PI * 2);
  ttCtx.stroke();

  // Subtle degree ticks around outer studio turntable ring
  ttCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ttCtx.lineWidth = 2;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r0 = i % 6 === 0 ? 452 : 462;
    const r1 = 470;
    ttCtx.beginPath();
    ttCtx.moveTo(512 + Math.cos(a) * r0, 512 + Math.sin(a) * r0);
    ttCtx.lineTo(512 + Math.cos(a) * r1, 512 + Math.sin(a) * r1);
    ttCtx.stroke();
  }
  const turntableRingMap = new THREE.CanvasTexture(ttCanvas);
  turntableRingMap.colorSpace = THREE.SRGBColorSpace;
  turntableRingMap.anisotropy = aniso;

  return {
    tireBump,
    rotorBump,
    carbonDiffuse,
    carbonBump,
    leatherBump,
    touchscreenMap,
    rearScreenMap,
    contactShadowMap,
    turntableRingMap,
    dispose: () => {
      tireBump.dispose();
      rotorBump.dispose();
      carbonDiffuse.dispose();
      carbonBump.dispose();
      leatherBump.dispose();
      touchscreenMap.dispose();
      rearScreenMap.dispose();
      contactShadowMap.dispose();
      turntableRingMap.dispose();
    },
  };
}
