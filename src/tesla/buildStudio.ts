import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type { ProceduralTextureSet } from './textures';

export interface StudioRig {
  dispose: () => void;
}

export function buildStudio(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): StudioRig {
  // Deep obsidian automotive studio backdrop + matching horizon fog
  const studioColor = new THREE.Color('#090b0f');
  scene.background = studioColor;
  scene.fog = new THREE.FogExp2(0x090b0f, 0.032);

  // Zero-dependency procedural studio environment reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmremGenerator.dispose();

  // 1. Warm Key Directional Light (tight shadow frustum)
  const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.3);
  keyLight.position.set(4.8, 7.2, 5.4);
  if (!isSoftwareGl) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 22;
    const d = 4.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.radius = 3;
  }
  scene.add(keyLight);

  // 2. Cool Sky/Ground Hemisphere Fill
  const hemiLight = new THREE.HemisphereLight(0xb8d4ff, 0x10131a, 0.72);
  scene.add(hemiLight);

  // 3. Crisp Rim Backlight to carve silhouette against dark studio
  const rimLight = new THREE.DirectionalLight(0xcfe4ff, 1.35);
  rimLight.position.set(-5.2, 3.6, -5.8);
  scene.add(rimLight);

  // 4. Studio Overhead Softbox Strip Lights (authentic automotive showroom highlights)
  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    const overheadSoftbox = new THREE.RectAreaLight(0xf8fafc, 3.2, 1.5, 6.4);
    overheadSoftbox.position.set(0, 4.4, 0);
    overheadSoftbox.lookAt(0, 0.5, 0);
    scene.add(overheadSoftbox);

    const sideSoftbox = new THREE.RectAreaLight(0xe2eeff, 1.6, 5.8, 0.9);
    sideSoftbox.position.set(-4.4, 1.8, 0.4);
    sideSoftbox.lookAt(0, 0.6, 0);
    scene.add(sideSoftbox);
  }

  // 5. Studio Concrete/Resin Floor Plane
  const floorGeo = new THREE.CircleGeometry(28, 64);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0c0f15'),
    roughness: 0.46,
    metalness: 0.16,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  floor.position.y = 0;
  scene.add(floor);

  // 6. Soft Radial Contact Shadow directly beneath the Tesla
  const contactGeo = new THREE.PlaneGeometry(3.4, 6.2);
  contactGeo.rotateX(-Math.PI / 2);
  const contactMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.78,
  });
  const contactPlane = new THREE.Mesh(contactGeo, contactMat);
  contactPlane.position.y = 0.004;
  scene.add(contactPlane);

  // 7. Subtle Turntable Studio Ring Decal
  const ttGeo = new THREE.PlaneGeometry(7.2, 7.2);
  ttGeo.rotateX(-Math.PI / 2);
  const ttMat = new THREE.MeshBasicMaterial({
    map: textures.turntableRingMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const ttPlane = new THREE.Mesh(ttGeo, ttMat);
  ttPlane.position.y = 0.006;
  scene.add(ttPlane);

  return {
    dispose: () => {
      envTex.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      contactGeo.dispose();
      contactMat.dispose();
      ttGeo.dispose();
      ttMat.dispose();
    },
  };
}
