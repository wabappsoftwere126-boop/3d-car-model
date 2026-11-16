import * as THREE from 'three';
import type { TeslaMaterialLibrary } from '../materials';

export interface ExteriorGroups {
  bodyShellGroup: THREE.Group;
  glassRoofGroup: THREE.Group;
  frunkHoodGroup: THREE.Group;
  doors: {
    frontLeft: THREE.Group;
    frontRight: THREE.Group;
    rearLeft: THREE.Group;
    rearRight: THREE.Group;
  };
  headlightsGroup: THREE.Group;
  taillightsGroup: THREE.Group;
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

/**
 * Parametric lofted grid surface builder.
 * rows[r][c] is a Vector3. Generates indexed BufferGeometry with smooth normals.
 */
function buildLoftedSurface(rows: THREE.Vector3[][], flipWinding = false): THREE.BufferGeometry {
  const rowCount = rows.length;
  const colCount = rows[0].length;
  const positions = new Float32Array(rowCount * colCount * 3);
  const uvs = new Float32Array(rowCount * colCount * 2);

  let pIdx = 0;
  let uvIdx = 0;
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const v = rows[r][c];
      positions[pIdx++] = v.x;
      positions[pIdx++] = v.y;
      positions[pIdx++] = v.z;
      uvs[uvIdx++] = c / (colCount - 1);
      uvs[uvIdx++] = r / (rowCount - 1);
    }
  }

  const indices: number[] = [];
  for (let r = 0; r < rowCount - 1; r++) {
    for (let c = 0; c < colCount - 1; c++) {
      const a = r * colCount + c;
      const b = (r + 1) * colCount + c;
      const d = r * colCount + (c + 1);
      const e = (r + 1) * colCount + (c + 1);

      if (!flipWinding) {
        indices.push(a, b, d);
        indices.push(b, e, d);
      } else {
        indices.push(a, d, b);
        indices.push(b, d, e);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Smooth half-width profile along car length Z (-2.44 rear to +2.44 front)
function bodyHalfWidthAtZ(z: number): number {
  if (z > 1.85) {
    // Taper nose cleanly
    const t = (z - 1.85) / (2.44 - 1.85);
    return 0.965 - t * t * 0.24;
  }
  if (z < -1.85) {
    // Taper rear quarter cleanly
    const t = (-1.85 - z) / (2.44 - 1.85);
    return 0.97 - t * t * 0.16;
  }
  // Subtle coke-bottle waist + muscular haunches over front & rear axles
  const frontHaunch = Math.exp(-Math.pow((z - 1.48) / 0.42, 2)) * 0.025;
  const rearHaunch = Math.exp(-Math.pow((z + 1.48) / 0.46, 2)) * 0.032;
  return 0.955 + frontHaunch + rearHaunch;
}

// Beltline Y height along Z
function beltlineYAtZ(z: number): number {
  if (z > 1.15) {
    // Hood/fender drop toward front nose
    const t = (z - 1.15) / (2.44 - 1.15);
    return 0.90 - t * 0.30;
  }
  if (z > -1.0) {
    // Rising beltline from A-pillar back toward rear quarter
    const t = (1.15 - z) / 2.15;
    return 0.90 + t * 0.06;
  }
  // Rear decklid gentle taper
  const t = (-1.0 - z) / 1.44;
  return 0.96 + t * 0.05;
}

// Roofline Y height along Z (-2.38 to +1.15)
function roofYAtZ(z: number): number {
  if (z >= 0.08) {
    // Raked windshield from z=1.15 (y=0.91) to z=0.08 (y=1.43)
    const t = (1.15 - z) / (1.15 - 0.08);
    return 0.91 + Math.sin((t * Math.PI) / 2) * 0.52;
  }
  // Fastback roofline from z=0.08 (y=1.43) sweeping down to rear lip z=-2.36 (y=1.02)
  const t = (0.08 - z) / (0.08 - -2.36);
  return 1.43 - Math.pow(t, 1.45) * 0.41;
}

// Wheel arch cutout bottom Y along Z
function lowerBodyYAtZ(z: number): number {
  const baseSill = 0.165;
  const archR = 0.405;
  const archCenterY = 0.345;

  const dFront = Math.abs(z - 1.48);
  if (dFront < archR) {
    return archCenterY + Math.sqrt(archR * archR - dFront * dFront);
  }
  const dRear = Math.abs(z + 1.48);
  if (dRear < archR) {
    return archCenterY + Math.sqrt(archR * archR - dRear * dRear);
  }
  if (z > 2.0) {
    return baseSill + ((z - 2.0) / 0.44) * 0.08;
  }
  if (z < -2.0) {
    return baseSill + ((-2.0 - z) / 0.44) * 0.11;
  }
  return baseSill;
}

function buildSidePanelSegment(
  side: -1 | 1,
  zStart: number,
  zEnd: number,
  steps: number,
  mat: THREE.Material,
  sillOnly = false,
): THREE.Mesh {
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= steps; i++) {
    const z = zStart + (i / steps) * (zEnd - zStart);
    const w = bodyHalfWidthAtZ(z);
    const yBot = lowerBodyYAtZ(z);
    const yTop = sillOnly ? 0.215 : beltlineYAtZ(z);
    const yMid = yBot + (yTop - yBot) * 0.48;

    const col: THREE.Vector3[] = sillOnly
      ? [
          new THREE.Vector3(side * (w - 0.06), 0.145, z),
          new THREE.Vector3(side * (w - 0.02), 0.18, z),
          new THREE.Vector3(side * (w - 0.05), yTop, z),
        ]
      : [
          new THREE.Vector3(side * (w - 0.055), yBot, z),
          new THREE.Vector3(side * w, yMid, z),
          new THREE.Vector3(side * (w - 0.022), yTop - 0.04, z),
          new THREE.Vector3(side * (w - 0.075), yTop, z),
        ];
    rows.push(col);
  }

  const geo = buildLoftedSurface(rows, side === -1);
  return new THREE.Mesh(geo, mat);
}

function buildSideFendersAndQuarter(side: -1 | 1, mat: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  // Front fender (+2.42 to +0.97)
  group.add(buildSidePanelSegment(side, 2.42, 0.97, 22, mat, false));
  // Lower rocker sill beneath doors (+0.97 to -0.99)
  group.add(buildSidePanelSegment(side, 0.97, -0.99, 18, mat, true));
  // Rear quarter panel (-0.99 to -2.42)
  group.add(buildSidePanelSegment(side, -0.99, -2.42, 22, mat, false));
  return group;
}

function buildSculptedDoor(
  side: -1 | 1,
  isFront: boolean,
  mats: TeslaMaterialLibrary,
): THREE.Group {
  const doorGroup = new THREE.Group();
  const zStart = isFront ? 0.96 : -0.02;
  const zEnd = isFront ? 0.02 : -0.98;
  const hingeZ = zStart;
  const hingeX = side * 0.935;

  // Pivot door around its front hinge edge!
  doorGroup.position.set(hingeX, 0, hingeZ);

  const zSteps = 14;
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= zSteps; i++) {
    const zWorld = zStart + (i / zSteps) * (zEnd - zStart);
    const zLocal = zWorld - hingeZ;
    const w = bodyHalfWidthAtZ(zWorld) + 0.008;
    const yBot = 0.175;
    const yTop = beltlineYAtZ(zWorld);
    const yMid = 0.52;

    rows.push([
      new THREE.Vector3(side * (w - 0.045) - hingeX, yBot, zLocal),
      new THREE.Vector3(side * w - hingeX, yMid, zLocal),
      new THREE.Vector3(side * (w - 0.025) - hingeX, yTop, zLocal),
    ]);
  }
  const skinGeo = buildLoftedSurface(rows, side === -1);
  const skin = new THREE.Mesh(skinGeo, mats.doorPaint);
  doorGroup.add(skin);

  // Inner dark door trim card & armrest
  const zLen = Math.abs(zStart - zEnd) - 0.04;
  const zCenterLocal = (zEnd - zStart) * 0.5;
  const innerCard = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.56, zLen),
    mats.interiorDarkTrim,
  );
  innerCard.position.set(side * -0.055, 0.54, zCenterLocal);
  doorGroup.add(innerCard);

  const armrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.055, zLen * 0.65),
    mats.interiorLeather,
  );
  armrest.position.set(side * -0.075, 0.58, zCenterLocal);
  doorGroup.add(armrest);

  // Flush Chrome Pop-Out Door Handle
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.024, 0.145),
    mats.chromeAccent,
  );
  handle.position.set(side * 0.02, beltlineYAtZ(zEnd) - 0.11, zEnd - hingeZ + 0.18);
  doorGroup.add(handle);

  // Frameless Acoustic Side Window Glass
  const winRows: THREE.Vector3[][] = [];
  for (let i = 0; i <= 10; i++) {
    const zWorld = zStart + (i / 10) * (zEnd - zStart);
    const zLocal = zWorld - hingeZ;
    const xBot = side * (bodyHalfWidthAtZ(zWorld) - 0.045) - hingeX;
    const yBot = beltlineYAtZ(zWorld);
    const yRoof = Math.min(roofYAtZ(zWorld) - 0.03, 1.38);
    const xTop = side * 0.66 - hingeX;
    winRows.push([
      new THREE.Vector3(xBot, yBot, zLocal),
      new THREE.Vector3(xTop, yRoof, zLocal),
    ]);
  }
  const winGeo = buildLoftedSurface(winRows, side === -1);
  const winMesh = new THREE.Mesh(winGeo, mats.windowGlass);
  winMesh.renderOrder = 4;
  doorGroup.add(winMesh);

  // Wing Mirror on Front Doors
  if (isFront) {
    const mirrorStalk = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.026, 0.045),
      mats.matteTrim,
    );
    mirrorStalk.position.set(side * 0.045, 0.91, -0.14);
    doorGroup.add(mirrorStalk);

    const mirrorCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.115, 0.072, 0.095),
      mats.doorPaint,
    );
    mirrorCap.position.set(side * 0.11, 0.94, -0.16);
    mirrorCap.rotation.y = side * -0.18;
    doorGroup.add(mirrorCap);

    const turnSignal = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.01, 0.012),
      mats.headlightGlow,
    );
    turnSignal.position.set(side * 0.115, 0.935, -0.11);
    doorGroup.add(turnSignal);
  }

  return doorGroup;
}

function buildHoodSurface(mat: THREE.Material): THREE.Mesh {
  // Hood spans z = +2.38 (front nose) to z = +1.14 (cowl)
  const zSteps = 18;
  const xSteps = 14;
  const rows: THREE.Vector3[][] = [];

  for (let r = 0; r <= zSteps; r++) {
    const tZ = r / zSteps;
    const z = 2.38 - tZ * (2.38 - 1.14);
    const halfW = bodyHalfWidthAtZ(z) - 0.11;
    const baseY = beltlineYAtZ(z) + 0.015;
    const col: THREE.Vector3[] = [];
    for (let c = 0; c <= xSteps; c++) {
      const u = (c / xSteps) * 2 - 1; // -1..+1
      const x = u * halfW;
      // Central crown + subtle Tesla fender shoulder ridges
      const centerCrown = (1 - u * u) * 0.042;
      const crease = Math.exp(-Math.pow((Math.abs(u) - 0.58) / 0.18, 2)) * 0.014;
      const y = baseY + centerCrown + crease;
      col.push(new THREE.Vector3(x, y, z));
    }
    rows.push(col);
  }

  const geo = buildLoftedSurface(rows, true);
  return new THREE.Mesh(geo, mat);
}

function buildPanoramicGlassRoof(mats: TeslaMaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  const zSteps = 28;
  const xSteps = 14;
  const rows: THREE.Vector3[][] = [];

  for (let r = 0; r <= zSteps; r++) {
    const tZ = r / zSteps;
    const z = 1.14 - tZ * (1.14 - -2.26);
    // Greenhouse narrows smoothly toward roof apex & rear
    const baseW = bodyHalfWidthAtZ(z) - 0.09;
    const roofW = z > 0.08 ? 0.67 + ((z - 0.08) / 1.06) * 0.12 : 0.67 - ((-z + 0.08) / 2.34) * 0.14;
    const halfW = Math.min(baseW, roofW);
    const centerY = roofYAtZ(z);
    const col: THREE.Vector3[] = [];
    for (let c = 0; c <= xSteps; c++) {
      const u = (c / xSteps) * 2 - 1;
      const x = u * halfW;
      const archDrop = u * u * 0.055;
      col.push(new THREE.Vector3(x, centerY - archDrop, z));
    }
    rows.push(col);
  }

  const glassGeo = buildLoftedSurface(rows, true);
  const glassMesh = new THREE.Mesh(glassGeo, mats.glassRoof);
  glassMesh.renderOrder = 6;
  group.add(glassMesh);

  // Glossy black A/B/C roof rail arches framing the glass roof
  for (const side of [-1, 1]) {
    const railPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 16; i++) {
      const z = 1.14 - (i / 16) * 3.38;
      const baseW = bodyHalfWidthAtZ(z) - 0.08;
      const roofW = z > 0.08 ? 0.67 + ((z - 0.08) / 1.06) * 0.13 : 0.67 - ((-z + 0.08) / 2.34) * 0.14;
      const x = side * Math.min(baseW, roofW);
      const y = roofYAtZ(z) - 0.05;
      railPts.push(new THREE.Vector3(x, y, z));
    }
    const railCurve = new THREE.CatmullRomCurve3(railPts);
    const railMesh = new THREE.Mesh(
      new THREE.TubeGeometry(railCurve, 28, 0.022, 8, false),
      mats.matteTrim,
    );
    group.add(railMesh);
  }

  // Carbon Fiber Ducktail Rear Spoiler
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.024, 0.11), mats.carbonFiber);
  spoiler.position.set(0, 1.045, -2.31);
  spoiler.rotation.x = 0.24;
  group.add(spoiler);

  return group;
}

export function buildExteriorBody(mats: TeslaMaterialLibrary): ExteriorGroups {
  // 1. Main Body Shell Group (fenders, bumpers, wheel-well liners, aero splitters)
  const bodyShellGroup = new THREE.Group();
  bodyShellGroup.name = 'body_shell';

  for (const side of [-1, 1] as const) {
    bodyShellGroup.add(buildSideFendersAndQuarter(side, mats.carPaint));

    // Wheel-arch dark inner liners so no hollow void is visible behind wheels
    for (const zAxle of [1.48, -1.48]) {
      const archLiner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.402, 0.402, 0.28, 24, 1, true, 0, Math.PI),
        mats.innerLiner,
      );
      archLiner.rotation.z = Math.PI / 2;
      archLiner.position.set(side * 0.78, 0.345, zAxle);
      bodyShellGroup.add(archLiner);
    }

    // Side carbon aero rocker skirt
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 2.12), mats.carbonFiber);
    skirt.position.set(side * 0.90, 0.155, 0);
    bodyShellGroup.add(skirt);
  }

  // Sculpted Front Bumper Nose & Lower Aero Intake
  const frontNoseRows: THREE.Vector3[][] = [];
  for (let r = 0; r <= 10; r++) {
    const tY = r / 10;
    const y = 0.21 + tY * 0.42;
    const zPeak = 2.49 - Math.pow(Math.abs(tY - 0.35), 1.6) * 0.14;
    const halfW = 0.72 + Math.sin(tY * Math.PI * 0.7) * 0.16;
    const col: THREE.Vector3[] = [];
    for (let c = 0; c <= 14; c++) {
      const u = (c / 14) * 2 - 1;
      const x = u * halfW;
      const z = zPeak - u * u * 0.18;
      col.push(new THREE.Vector3(x, y, z));
    }
    frontNoseRows.push(col);
  }
  const frontBumper = new THREE.Mesh(buildLoftedSurface(frontNoseRows, true), mats.carPaint);
  bodyShellGroup.add(frontBumper);

  // Front Lower Carbon Lip Splitter & Intake Grille
  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.025, 0.24), mats.carbonFiber);
  frontSplitter.position.set(0, 0.185, 2.34);
  bodyShellGroup.add(frontSplitter);

  const lowerGrille = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.11, 0.08), mats.matteTrim);
  lowerGrille.position.set(0, 0.27, 2.41);
  bodyShellGroup.add(lowerGrille);

  // Sculpted Rear Bumper Fascia & Carbon Diffuser
  const rearFasciaRows: THREE.Vector3[][] = [];
  for (let r = 0; r <= 10; r++) {
    const tY = r / 10;
    const y = 0.25 + tY * 0.76;
    const zPeak = -2.47 + tY * 0.10;
    const halfW = 0.80 - tY * 0.08;
    const col: THREE.Vector3[] = [];
    for (let c = 0; c <= 14; c++) {
      const u = (c / 14) * 2 - 1;
      const x = u * halfW;
      const z = zPeak + u * u * 0.14;
      col.push(new THREE.Vector3(x, y, z));
    }
    rearFasciaRows.push(col);
  }
  const rearBumper = new THREE.Mesh(buildLoftedSurface(rearFasciaRows, false), mats.carPaint);
  bodyShellGroup.add(rearBumper);

  const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.095, 0.18), mats.carbonFiber);
  rearDiffuser.position.set(0, 0.23, -2.35);
  rearDiffuser.rotation.x = -0.18;
  bodyShellGroup.add(rearDiffuser);

  // Rear diffuser vertical aero strakes
  for (const fx of [-0.46, -0.23, 0, 0.23, 0.46]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.085, 0.19), mats.carbonFiber);
    fin.position.set(fx, 0.22, -2.37);
    bodyShellGroup.add(fin);
  }

  // Rear trunk emblem chrome bar
  const rearChromeBar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.022, 0.025), mats.chromeAccent);
  rearChromeBar.position.set(0, 0.86, -2.40);
  bodyShellGroup.add(rearChromeBar);

  tagPart(bodyShellGroup, 'body_shell');

  // 2. Matrix LED Headlights
  const headlightsGroup = new THREE.Group();
  headlightsGroup.name = 'headlights';
  for (const side of [-1, 1]) {
    const housing = new THREE.Group();
    housing.position.set(side * 0.65, 0.60, 2.24);
    housing.rotation.y = side * 0.44;
    housing.rotation.x = 0.16;

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.068, 0.12), mats.matteTrim);
    housing.add(bezel);

    // Glowing DRL Signature Blade
    const drlBlade = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.013, 0.02), mats.headlightGlow);
    drlBlade.position.set(0, -0.02, 0.056);
    housing.add(drlBlade);

    // Twin Projector LED Cubes
    for (const px of [-0.055, 0.045]) {
      const projector = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.028, 12),
        mats.headlightGlow,
      );
      projector.rotation.x = Math.PI / 2;
      projector.position.set(px, 0.008, 0.05);
      housing.add(projector);
    }
    headlightsGroup.add(housing);
  }
  tagPart(headlightsGroup, 'headlights');

  // 3. Full-Width C-Blade LED Taillights
  const taillightsGroup = new THREE.Group();
  taillightsGroup.name = 'taillights';
  for (const side of [-1, 1]) {
    const tailWrap = new THREE.Group();
    tailWrap.position.set(side * 0.64, 0.86, -2.35);
    tailWrap.rotation.y = side * -0.28;

    const darkLens = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.078, 0.06), mats.matteTrim);
    tailWrap.add(darkLens);

    const upperLed = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.016, 0.02), mats.taillightGlow);
    upperLed.position.set(0, 0.022, -0.028);
    tailWrap.add(upperLed);

    const lowerLed = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.014, 0.02), mats.taillightGlow);
    lowerLed.position.set(0, -0.022, -0.028);
    tailWrap.add(lowerLed);

    const outerEdgeLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.058, 0.02),
      mats.taillightGlow,
    );
    outerEdgeLed.position.set(side * 0.135, 0, -0.028);
    tailWrap.add(outerEdgeLed);

    taillightsGroup.add(tailWrap);
  }
  // Center connecting LED strip
  const centerTailStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 0.014, 0.02),
    mats.taillightGlow,
  );
  centerTailStrip.position.set(0, 0.865, -2.39);
  taillightsGroup.add(centerTailStrip);
  tagPart(taillightsGroup, 'taillights');

  // 4. Frunk Hood & Storage Tub
  const frunkHoodGroup = new THREE.Group();
  frunkHoodGroup.name = 'frunk_hood';
  // Hinge at cowl z = +1.14, y = 0.90 so opening rotates cleanly upward!
  frunkHoodGroup.position.set(0, 0.90, 1.14);

  const hoodPanel = buildHoodSurface(mats.hoodPaint);
  hoodPanel.position.set(0, -0.90, -1.14);
  frunkHoodGroup.add(hoodPanel);

  // Inner hood structural ribs
  const hoodLiner = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.016, 0.96), mats.innerLiner);
  hoodLiner.position.set(0, -0.14, 0.62);
  hoodLiner.rotation.x = 0.24;
  frunkHoodGroup.add(hoodLiner);

  // Tesla Nose Crest T-Emblem
  const noseEmblemTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.012, 0.012),
    mats.chromeAccent,
  );
  noseEmblemTop.position.set(0, -0.255, 1.24);
  noseEmblemTop.rotation.x = 0.24;
  frunkHoodGroup.add(noseEmblemTop);

  const noseEmblemStem = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.065, 0.012),
    mats.chromeAccent,
  );
  noseEmblemStem.position.set(0, -0.285, 1.25);
  noseEmblemStem.rotation.x = 0.24;
  frunkHoodGroup.add(noseEmblemStem);

  tagPart(frunkHoodGroup, 'frunk_hood');

  // 5. Four Independent Frameless Doors
  const doors = {
    frontLeft: buildSculptedDoor(1, true, mats),
    frontRight: buildSculptedDoor(-1, true, mats),
    rearLeft: buildSculptedDoor(1, false, mats),
    rearRight: buildSculptedDoor(-1, false, mats),
  };
  Object.values(doors).forEach((d) => tagPart(d, 'doors'));

  // 6. Panoramic Glass Roof & Fastback Rear Hatch
  const glassRoofGroup = buildPanoramicGlassRoof(mats);
  glassRoofGroup.name = 'glass_roof';
  tagPart(glassRoofGroup, 'glass_roof');

  return {
    bodyShellGroup,
    glassRoofGroup,
    frunkHoodGroup,
    doors,
    headlightsGroup,
    taillightsGroup,
  };
}
