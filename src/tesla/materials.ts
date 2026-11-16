import * as THREE from 'three';
import type { ProceduralTextureSet } from './textures';
import { PAINT_FINISHES, type PaintFinish } from './types';

export interface TeslaMaterialLibrary {
  carPaint: THREE.MeshPhysicalMaterial;
  doorPaint: THREE.MeshPhysicalMaterial;
  hoodPaint: THREE.MeshPhysicalMaterial;
  glassRoof: THREE.MeshPhysicalMaterial;
  windowGlass: THREE.MeshPhysicalMaterial;
  matteTrim: THREE.MeshStandardMaterial;
  innerLiner: THREE.MeshStandardMaterial;
  carbonFiber: THREE.MeshPhysicalMaterial;
  brushedAlloy: THREE.MeshPhysicalMaterial;
  darkAlloy: THREE.MeshStandardMaterial;
  chromeAccent: THREE.MeshStandardMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  brakeRotor: THREE.MeshStandardMaterial;
  bremboCaliper: THREE.MeshPhysicalMaterial;
  chassisAluminum: THREE.MeshStandardMaterial;
  batteryHousing: THREE.MeshStandardMaterial;
  batteryCover: THREE.MeshStandardMaterial;
  batteryCell: THREE.MeshStandardMaterial;
  motorCase: THREE.MeshStandardMaterial;
  copperWinding: THREE.MeshStandardMaterial;
  hvOrange: THREE.MeshStandardMaterial;
  suspensionArm: THREE.MeshStandardMaterial;
  coilSpring: THREE.MeshStandardMaterial;
  interiorLeather: THREE.MeshPhysicalMaterial;
  interiorDarkTrim: THREE.MeshStandardMaterial;
  dashboardWood: THREE.MeshStandardMaterial;
  touchscreen: THREE.MeshBasicMaterial;
  rearScreen: THREE.MeshBasicMaterial;
  headlightGlow: THREE.MeshStandardMaterial;
  taillightGlow: THREE.MeshStandardMaterial;
  ambientCabinGlow: THREE.MeshStandardMaterial;
  setPaintFinish: (finish: PaintFinish) => void;
  setShellOpacity: (opacity: number) => void;
  dispose: () => void;
}

export function createTeslaMaterials(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): TeslaMaterialLibrary {
  const initialFinish = PAINT_FINISHES[0];

  const carPaint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialFinish.color),
    metalness: initialFinish.metalness,
    roughness: initialFinish.roughness,
    clearcoat: initialFinish.clearcoat,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.45,
    transparent: false,
    opacity: 1,
    side: THREE.DoubleSide,
  });

  const doorPaint = carPaint.clone();
  const hoodPaint = carPaint.clone();

  const glassRoof = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0a1018'),
    metalness: 0.05,
    roughness: 0.04,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    ior: 1.52,
    transmission: isSoftwareGl ? 0 : 0.62,
    thickness: 0.08,
    transparent: true,
    opacity: isSoftwareGl ? 0.42 : 0.88,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const windowGlass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0d141d'),
    metalness: 0.04,
    roughness: 0.05,
    clearcoat: 1.0,
    ior: 1.5,
    transmission: isSoftwareGl ? 0 : 0.7,
    thickness: 0.04,
    transparent: true,
    opacity: isSoftwareGl ? 0.36 : 0.82,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const matteTrim = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#14161b'),
    roughness: 0.72,
    metalness: 0.1,
  });

  const innerLiner = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0c0e12'),
    roughness: 0.88,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const carbonFiber = new THREE.MeshPhysicalMaterial({
    map: textures.carbonDiffuse,
    bumpMap: textures.carbonBump,
    bumpScale: 0.004,
    roughness: 0.32,
    metalness: 0.2,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
  });

  const brushedAlloy = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#cfd5de'),
    metalness: 0.92,
    roughness: 0.18,
    anisotropy: 0.75,
    envMapIntensity: 1.3,
  });

  const darkAlloy = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#272b33'),
    metalness: 0.86,
    roughness: 0.26,
    envMapIntensity: 1.2,
  });

  const chromeAccent = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#eef2f6'),
    metalness: 0.98,
    roughness: 0.08,
    envMapIntensity: 1.5,
  });

  const tireRubber = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#16181c'),
    roughness: 0.86,
    metalness: 0.03,
    bumpMap: textures.tireBump,
    bumpScale: 0.014,
  });

  const brakeRotor = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#b6bcc4'),
    metalness: 0.88,
    roughness: 0.28,
    bumpMap: textures.rotorBump,
    bumpScale: 0.008,
  });

  const bremboCaliper = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#cc141b'),
    metalness: 0.25,
    roughness: 0.2,
    clearcoat: 0.95,
    clearcoatRoughness: 0.08,
  });

  const chassisAluminum = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#7a828f'),
    metalness: 0.82,
    roughness: 0.34,
  });

  const batteryHousing = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#232832'),
    metalness: 0.65,
    roughness: 0.42,
  });

  const batteryCover = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1b2029'),
    metalness: 0.55,
    roughness: 0.36,
    transparent: false,
    opacity: 1,
  });

  const batteryCell = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#aeb8c4'),
    metalness: 0.9,
    roughness: 0.2,
  });

  const motorCase = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8e96a3'),
    metalness: 0.84,
    roughness: 0.3,
  });

  const copperWinding = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c86832'),
    metalness: 0.95,
    roughness: 0.18,
    emissive: new THREE.Color('#3a1504'),
    emissiveIntensity: 0.25,
  });

  const hvOrange = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ff5e00'),
    metalness: 0.08,
    roughness: 0.42,
    emissive: new THREE.Color('#3d1500'),
    emissiveIntensity: 0.2,
  });

  const suspensionArm = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5a6270'),
    metalness: 0.85,
    roughness: 0.28,
  });

  const coilSpring = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d92121'),
    metalness: 0.4,
    roughness: 0.26,
  });

  const interiorLeather = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#dedad2'),
    roughness: 0.64,
    metalness: 0.02,
    sheen: 0.35,
    sheenRoughness: 0.65,
    bumpMap: textures.leatherBump,
    bumpScale: 0.0025,
  });

  const interiorDarkTrim = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1a1d24'),
    roughness: 0.68,
    metalness: 0.06,
  });

  const dashboardWood = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2c241e'),
    roughness: 0.55,
    metalness: 0.05,
  });

  const touchscreen = new THREE.MeshBasicMaterial({
    map: textures.touchscreenMap,
  });

  const rearScreen = new THREE.MeshBasicMaterial({
    map: textures.rearScreenMap,
  });

  const headlightGlow = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    emissive: new THREE.Color('#e2f1ff'),
    emissiveIntensity: 2.4,
    roughness: 0.1,
  });

  const taillightGlow = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ff1a1a'),
    emissive: new THREE.Color('#ff1212'),
    emissiveIntensity: 2.6,
    roughness: 0.12,
  });

  const ambientCabinGlow = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#bae6fd'),
    emissive: new THREE.Color('#38bdf8'),
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });

  const allMaterials: THREE.Material[] = [
    carPaint,
    doorPaint,
    hoodPaint,
    glassRoof,
    windowGlass,
    matteTrim,
    innerLiner,
    carbonFiber,
    brushedAlloy,
    darkAlloy,
    chromeAccent,
    tireRubber,
    brakeRotor,
    bremboCaliper,
    chassisAluminum,
    batteryHousing,
    batteryCover,
    batteryCell,
    motorCase,
    copperWinding,
    hvOrange,
    suspensionArm,
    coilSpring,
    interiorLeather,
    interiorDarkTrim,
    dashboardWood,
    touchscreen,
    rearScreen,
    headlightGlow,
    taillightGlow,
    ambientCabinGlow,
  ];

  return {
    carPaint,
    doorPaint,
    hoodPaint,
    glassRoof,
    windowGlass,
    matteTrim,
    innerLiner,
    carbonFiber,
    brushedAlloy,
    darkAlloy,
    chromeAccent,
    tireRubber,
    brakeRotor,
    bremboCaliper,
    chassisAluminum,
    batteryHousing,
    batteryCover,
    batteryCell,
    motorCase,
    copperWinding,
    hvOrange,
    suspensionArm,
    coilSpring,
    interiorLeather,
    interiorDarkTrim,
    dashboardWood,
    touchscreen,
    rearScreen,
    headlightGlow,
    taillightGlow,
    ambientCabinGlow,
    setPaintFinish: (finish: PaintFinish) => {
      for (const mat of [carPaint, doorPaint, hoodPaint]) {
        mat.color.set(finish.color);
        mat.metalness = finish.metalness;
        mat.roughness = finish.roughness;
        mat.clearcoat = finish.clearcoat;
      }
    },
    setShellOpacity: (opacity: number) => {
      const clamped = THREE.MathUtils.clamp(opacity, 0.0, 1.0);
      const isGhost = clamped < 0.99;
      if (carPaint.transparent !== isGhost) {
        carPaint.transparent = isGhost;
        carPaint.depthWrite = !isGhost;
        carPaint.needsUpdate = true;
      }
      carPaint.opacity = clamped;
      carPaint.visible = clamped > 0.02;
    },
    dispose: () => {
      allMaterials.forEach((m) => m.dispose());
    },
  };
}
