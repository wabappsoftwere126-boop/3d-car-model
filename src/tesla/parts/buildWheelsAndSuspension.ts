import * as THREE from 'three';
import type { TeslaMaterialLibrary } from '../materials';

export interface CornerAssembly {
  side: -1 | 1; // -1 = right (-X), +1 = left (+X)
  isFront: boolean;
  wheelGroup: THREE.Group;
  brakeGroup: THREE.Group;
  suspensionGroup: THREE.Group;
}

export interface WheelsAndSuspensionResult {
  root: THREE.Group;
  corners: CornerAssembly[];
  steeringRack: THREE.Group;
}

function tagPart(obj: THREE.Object3D, partId: string) {
  obj.traverse((child) => {
    child.userData.partId = partId;
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function createHelicalSpringGeometry(
  coilRadius: number,
  wireRadius: number,
  height: number,
  turns: number,
): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const totalPts = turns * 18;
  for (let i = 0; i <= totalPts; i++) {
    const t = i / totalPts;
    const angle = t * turns * Math.PI * 2;
    pts.push(
      new THREE.Vector3(
        Math.cos(angle) * coilRadius,
        (t - 0.5) * height,
        Math.sin(angle) * coilRadius,
      ),
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, totalPts, wireRadius, 8, false);
}

function createTireProfileGeometry(): THREE.LatheGeometry {
  // Revolves around Y axis; outer radius = 0.345m, rim bead radius = 0.255m, width = 0.26m
  const hw = 0.132;
  const rRim = 0.252;
  const rShoulder = 0.336;
  const rTread = 0.345;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(rRim, -hw * 0.86),
    new THREE.Vector2(rRim + 0.04, -hw * 0.98),
    new THREE.Vector2(rShoulder, -hw * 0.94),
    new THREE.Vector2(rTread, -hw * 0.72),
    new THREE.Vector2(rTread, 0),
    new THREE.Vector2(rTread, hw * 0.72),
    new THREE.Vector2(rShoulder, hw * 0.94),
    new THREE.Vector2(rRim + 0.04, hw * 0.98),
    new THREE.Vector2(rRim, hw * 0.86),
    new THREE.Vector2(rRim, -hw * 0.86),
  ];
  const geo = new THREE.LatheGeometry(pts, 48);
  geo.rotateZ(Math.PI / 2); // Align axle along X axis
  return geo;
}

export function buildWheelsAndSuspension(mats: TeslaMaterialLibrary): WheelsAndSuspensionResult {
  const root = new THREE.Group();
  const corners: CornerAssembly[] = [];

  const tireGeo = createTireProfileGeometry();
  const springGeo = createHelicalSpringGeometry(0.044, 0.009, 0.22, 6);
  const rimBarrelGeo = new THREE.CylinderGeometry(0.254, 0.254, 0.23, 36, 1, true);
  rimBarrelGeo.rotateZ(Math.PI / 2);

  const rotorGeo = new THREE.CylinderGeometry(0.188, 0.188, 0.024, 36);
  rotorGeo.rotateZ(Math.PI / 2);

  const wheelPositions: Array<{ side: -1 | 1; isFront: boolean; x: number; z: number }> = [
    { side: 1, isFront: true, x: 0.835, z: 1.48 },
    { side: -1, isFront: true, x: -0.835, z: 1.48 },
    { side: 1, isFront: false, x: 0.845, z: -1.48 },
    { side: -1, isFront: false, x: -0.845, z: -1.48 },
  ];

  for (const cfg of wheelPositions) {
    const { side, isFront, x, z } = cfg;

    // 1. Suspension Corner Group (anchored near hub)
    const suspensionGroup = new THREE.Group();
    suspensionGroup.position.set(0, 0, z);

    // Steering knuckle / upright
    const upright = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.055, 0.24, 12),
      mats.suspensionArm,
    );
    upright.position.set(side * 0.72, 0.35, 0);
    suspensionGroup.add(upright);

    // Upper & Lower A-arms (2 struts per wishbone)
    for (const zOff of [-0.09, 0.09]) {
      const lowerArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.34, 8),
        mats.suspensionArm,
      );
      lowerArm.rotation.z = Math.PI / 2;
      lowerArm.rotation.y = side * zOff * 1.4;
      lowerArm.position.set(side * 0.56, 0.26, zOff * 0.55);
      suspensionGroup.add(lowerArm);

      const upperArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, 0.28, 8),
        mats.suspensionArm,
      );
      upperArm.rotation.z = Math.PI / 2 + side * 0.16;
      upperArm.rotation.y = side * zOff * 1.2;
      upperArm.position.set(side * 0.58, 0.44, zOff * 0.45);
      suspensionGroup.add(upperArm);
    }

    // Coilover Damper + Helical Red Spring
    const damperAngle = side * 0.18;
    const coilWrap = new THREE.Group();
    coilWrap.position.set(side * 0.62, 0.42, 0);
    coilWrap.rotation.z = damperAngle;

    const strutRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.32, 12),
      mats.chromeAccent,
    );
    coilWrap.add(strutRod);

    const springMesh = new THREE.Mesh(springGeo, mats.coilSpring);
    coilWrap.add(springMesh);
    suspensionGroup.add(coilWrap);

    tagPart(suspensionGroup, 'suspension');
    root.add(suspensionGroup);

    // 2. Brake Rotor & Red Brembo Caliper
    const brakeGroup = new THREE.Group();
    brakeGroup.position.set(side * 0.77, 0.345, z);

    const rotor = new THREE.Mesh(rotorGeo, mats.brakeRotor);
    brakeGroup.add(rotor);

    const rotorHat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.094, 0.044, 24),
      mats.darkAlloy,
    );
    rotorHat.rotation.z = Math.PI / 2;
    brakeGroup.add(rotorHat);

    // Red 6-piston Brembo Caliper
    const caliperGroup = new THREE.Group();
    const caliperArc = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.13, 0.092),
      mats.bremboCaliper,
    );
    caliperArc.position.set(side * 0.008, 0.06, isFront ? -0.145 : 0.145);
    caliperArc.rotation.x = isFront ? 0.38 : -0.38;
    caliperGroup.add(caliperArc);
    brakeGroup.add(caliperGroup);

    tagPart(brakeGroup, 'brakes');
    root.add(brakeGroup);

    // 3. 21" Arachnid Turbine Alloy Wheel & Performance Tire
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, 0.345, z);

    const tire = new THREE.Mesh(tireGeo, mats.tireRubber);
    wheelGroup.add(tire);

    const rimBarrel = new THREE.Mesh(rimBarrelGeo, mats.darkAlloy);
    wheelGroup.add(rimBarrel);

    const outerFaceX = side * 0.102;

    // Outer lip ring
    const lipRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.252, 0.011, 10, 36),
      mats.brushedAlloy,
    );
    lipRing.rotation.y = Math.PI / 2;
    lipRing.position.x = outerFaceX;
    wheelGroup.add(lipRing);

    // Center hub + Tesla cap
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.064, 0.05, 24),
      mats.darkAlloy,
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.x = outerFaceX - side * 0.012;
    wheelGroup.add(hub);

    const centerCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.014, 20),
      mats.chromeAccent,
    );
    centerCap.rotation.z = Math.PI / 2;
    centerCap.position.x = outerFaceX + side * 0.012;
    wheelGroup.add(centerCap);

    // 10 Sculpted Turbine Y-Spokes
    for (let s = 0; s < 10; s++) {
      const a = (s / 10) * Math.PI * 2;
      const spokePivot = new THREE.Group();
      spokePivot.position.x = outerFaceX - side * 0.005;
      spokePivot.rotation.x = a;

      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.195, 0.022),
        s % 2 === 0 ? mats.brushedAlloy : mats.darkAlloy,
      );
      spoke.position.y = 0.142;
      spoke.rotation.x = 0.18;
      spoke.rotation.z = side * -0.06;
      spokePivot.add(spoke);

      wheelGroup.add(spokePivot);
    }

    // 5 Lug Nuts
    for (let l = 0; l < 5; l++) {
      const la = (l / 5) * Math.PI * 2;
      const lug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6),
        mats.chromeAccent,
      );
      lug.rotation.z = Math.PI / 2;
      lug.position.set(
        outerFaceX + side * 0.008,
        Math.cos(la) * 0.04,
        Math.sin(la) * 0.04,
      );
      wheelGroup.add(lug);
    }

    tagPart(wheelGroup, 'wheels');
    root.add(wheelGroup);

    corners.push({
      side,
      isFront,
      wheelGroup,
      brakeGroup,
      suspensionGroup,
    });
  }

  // Front Steering Rack & Tie Rods + Sway Bars
  const steeringRack = new THREE.Group();
  const rackHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.96, 12),
    mats.darkAlloy,
  );
  rackHousing.rotation.z = Math.PI / 2;
  rackHousing.position.set(0, 0.25, 1.32);
  steeringRack.add(rackHousing);

  for (const side of [-1, 1]) {
    const tieRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.24, 8),
      mats.chromeAccent,
    );
    tieRod.rotation.z = Math.PI / 2;
    tieRod.rotation.y = side * -0.35;
    tieRod.position.set(side * 0.56, 0.28, 1.38);
    steeringRack.add(tieRod);
  }
  tagPart(steeringRack, 'suspension');
  root.add(steeringRack);

  return { root, corners, steeringRack };
}
