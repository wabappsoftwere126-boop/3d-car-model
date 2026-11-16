import * as THREE from 'three';
import type { TeslaMaterialLibrary } from '../materials';

export interface PowertrainGroups {
  chassisFrame: THREE.Group;
  batteryPack: THREE.Group;
  batteryCover: THREE.Group;
  hvCables: THREE.Group;
  frontMotor: THREE.Group;
  frontMotorUpper: THREE.Group;
  rearMotor: THREE.Group;
  rearMotorUpper: THREE.Group;
  heatPump: THREE.Group;
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

export function buildPowertrainAndChassis(mats: TeslaMaterialLibrary): PowertrainGroups {
  // 1. Die-Cast Aluminum Unibody & Skateboard Frame
  const chassisFrame = new THREE.Group();
  chassisFrame.name = 'chassis_frame';

  // Left & right rocker sill beams
  const rockerGeo = new THREE.BoxGeometry(0.11, 0.13, 2.72);
  for (const side of [-1, 1]) {
    const rocker = new THREE.Mesh(rockerGeo, mats.chassisAluminum);
    rocker.position.set(side * 0.78, 0.22, 0);
    chassisFrame.add(rocker);
  }

  // Front & rear megacasting longitudinal frame rails
  const frontRailGeo = new THREE.BoxGeometry(0.085, 0.11, 1.05);
  for (const side of [-1, 1]) {
    const fRail = new THREE.Mesh(frontRailGeo, mats.chassisAluminum);
    fRail.position.set(side * 0.44, 0.28, 1.72);
    fRail.rotation.x = -0.05;
    chassisFrame.add(fRail);

    const rRail = new THREE.Mesh(frontRailGeo, mats.chassisAluminum);
    rRail.position.set(side * 0.48, 0.30, -1.72);
    rRail.rotation.x = 0.05;
    chassisFrame.add(rRail);
  }

  // Front & rear aluminum crash beams
  const crashBeamGeo = new THREE.BoxGeometry(1.36, 0.10, 0.08);
  const frontCrash = new THREE.Mesh(crashBeamGeo, mats.chassisAluminum);
  frontCrash.position.set(0, 0.33, 2.28);
  chassisFrame.add(frontCrash);

  const rearCrash = new THREE.Mesh(crashBeamGeo, mats.chassisAluminum);
  rearCrash.position.set(0, 0.36, -2.26);
  chassisFrame.add(rearCrash);

  // Front & rear shock towers
  const towerGeo = new THREE.CylinderGeometry(0.10, 0.13, 0.34, 16);
  for (const side of [-1, 1]) {
    const fTower = new THREE.Mesh(towerGeo, mats.chassisAluminum);
    fTower.position.set(side * 0.54, 0.52, 1.48);
    chassisFrame.add(fTower);

    const rTower = new THREE.Mesh(towerGeo, mats.chassisAluminum);
    rTower.position.set(side * 0.56, 0.52, -1.48);
    chassisFrame.add(rTower);
  }

  // Crossmembers
  const crossGeo = new THREE.BoxGeometry(1.48, 0.06, 0.09);
  for (const zPos of [-1.18, -0.35, 0.35, 1.18]) {
    const cross = new THREE.Mesh(crossGeo, mats.chassisAluminum);
    cross.position.set(0, 0.26, zPos);
    chassisFrame.add(cross);
  }
  tagPart(chassisFrame, 'chassis_frame');

  // 2. 4680 Structural Battery Pack
  const batteryPack = new THREE.Group();
  batteryPack.name = 'battery_pack';

  const trayFloor = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.035, 2.34), mats.batteryHousing);
  trayFloor.position.set(0, 0.165, 0);
  batteryPack.add(trayFloor);

  // Perimeter structural frame walls
  const sideWallGeo = new THREE.BoxGeometry(0.05, 0.105, 2.34);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(sideWallGeo, mats.batteryHousing);
    wall.position.set(side * 0.685, 0.215, 0);
    batteryPack.add(wall);
  }
  const endWallGeo = new THREE.BoxGeometry(1.42, 0.105, 0.06);
  for (const end of [-1, 1]) {
    const wall = new THREE.Mesh(endWallGeo, mats.batteryHousing);
    wall.position.set(0, 0.215, end * 1.14);
    batteryPack.add(wall);
  }

  // Internal module dividers & aluminum cooling ribbons
  const dividerGeo = new THREE.BoxGeometry(1.32, 0.085, 0.025);
  for (let i = -3; i <= 3; i++) {
    const div = new THREE.Mesh(dividerGeo, mats.chassisAluminum);
    div.position.set(0, 0.21, i * 0.30);
    batteryPack.add(div);
  }

  // Instanced 4680 Cylindrical Battery Cells (12 x 22 = 264 gleaming cells!)
  const cols = 12;
  const rows = 22;
  const cellCount = cols * rows;
  const cellGeo = new THREE.CylinderGeometry(0.023, 0.023, 0.08, 12);
  const cellInstanced = new THREE.InstancedMesh(cellGeo, mats.batteryCell, cellCount);
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const z = -1.02 + (r / (rows - 1)) * 2.04;
    for (let c = 0; c < cols; c++) {
      const stagger = r % 2 === 0 ? 0.014 : -0.014;
      const x = -0.58 + (c / (cols - 1)) * 1.16 + stagger;
      dummy.position.set(x, 0.22, z);
      dummy.updateMatrix();
      cellInstanced.setMatrixAt(idx++, dummy.matrix);
    }
  }
  cellInstanced.instanceMatrix.needsUpdate = true;
  cellInstanced.computeBoundingSphere();
  batteryPack.add(cellInstanced);

  // Top Battery Armor Lid (separable group so it lifts up on zoom/scroll!)
  const batteryCover = new THREE.Group();
  const coverPlate = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.022, 2.36), mats.batteryCover);
  coverPlate.position.set(0, 0.278, 0);
  batteryCover.add(coverPlate);

  // Ribbed stiffness channels on battery cover
  const ribGeo = new THREE.BoxGeometry(1.34, 0.012, 0.045);
  for (let i = -4; i <= 4; i++) {
    const rib = new THREE.Mesh(ribGeo, mats.matteTrim);
    rib.position.set(0, 0.292, i * 0.23);
    batteryCover.add(rib);
  }
  batteryPack.add(batteryCover);
  tagPart(batteryPack, 'battery_pack');

  // 3. High-Voltage Orange Busbar Cables
  const hvCables = new THREE.Group();
  hvCables.name = 'hv_cables';

  const makeCable = (pts: THREE.Vector3[], radius = 0.015) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 28, radius, 8, false);
    return new THREE.Mesh(geo, mats.hvOrange);
  };

  // Rear motor HV pair
  for (const side of [-0.07, 0.07]) {
    hvCables.add(
      makeCable([
        new THREE.Vector3(side, 0.25, -1.12),
        new THREE.Vector3(side * 1.4, 0.28, -1.26),
        new THREE.Vector3(side * 1.4, 0.38, -1.42),
      ]),
    );
  }
  // Front motor HV pair
  for (const side of [-0.08, 0.08]) {
    hvCables.add(
      makeCable([
        new THREE.Vector3(side, 0.25, 1.12),
        new THREE.Vector3(side * 1.6, 0.29, 1.28),
        new THREE.Vector3(side * 1.5, 0.38, 1.42),
      ]),
    );
  }
  // Side charge port HV run
  hvCables.add(
    makeCable(
      [
        new THREE.Vector3(-0.62, 0.24, -1.0),
        new THREE.Vector3(-0.72, 0.34, -1.42),
        new THREE.Vector3(-0.76, 0.62, -1.96),
      ],
      0.013,
    ),
  );
  tagPart(hvCables, 'hv_cables');

  // 4. Front Induction Drive Unit
  const frontMotor = new THREE.Group();
  frontMotor.name = 'front_motor';
  frontMotor.position.set(0, 0.345, 1.48);

  const fLowerCase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.145, 0.145, 0.46, 20, 1, false, 0, Math.PI),
    mats.motorCase,
  );
  fLowerCase.rotation.z = Math.PI / 2;
  fLowerCase.rotation.x = Math.PI;
  frontMotor.add(fLowerCase);

  // Internal copper stator windings + steel rotor shaft
  const fStator = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.115, 0.36, 24),
    mats.copperWinding,
  );
  fStator.rotation.z = Math.PI / 2;
  frontMotor.add(fStator);

  const fShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 1.54, 16),
    mats.brushedAlloy,
  );
  fShaft.rotation.z = Math.PI / 2;
  frontMotor.add(fShaft);

  // Separable Upper Motor Housing & Inverter
  const frontMotorUpper = new THREE.Group();
  const fUpperCase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.46, 20, 1, false, 0, Math.PI),
    mats.motorCase,
  );
  fUpperCase.rotation.z = Math.PI / 2;
  frontMotorUpper.add(fUpperCase);

  // Cooling fins on motor barrel
  for (let i = -4; i <= 4; i++) {
    const fin = new THREE.Mesh(
      new THREE.TorusGeometry(0.154, 0.008, 8, 24, Math.PI),
      mats.motorCase,
    );
    fin.rotation.y = Math.PI / 2;
    fin.position.x = i * 0.044;
    frontMotorUpper.add(fin);
  }

  const fInverter = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.24), mats.darkAlloy);
  fInverter.position.set(0, 0.17, -0.02);
  frontMotorUpper.add(fInverter);

  frontMotor.add(frontMotorUpper);
  tagPart(frontMotor, 'front_motor');

  // 5. Rear Dual-Motor Plaid Drive Unit
  const rearMotor = new THREE.Group();
  rearMotor.name = 'rear_motor';
  rearMotor.position.set(0, 0.345, -1.48);

  const rLowerCase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.62, 22, 1, false, 0, Math.PI),
    mats.motorCase,
  );
  rLowerCase.rotation.z = Math.PI / 2;
  rLowerCase.rotation.x = Math.PI;
  rearMotor.add(rLowerCase);

  // Twin carbon-sleeved copper stators
  for (const xSide of [-0.15, 0.15]) {
    const rStator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.125, 0.22, 24),
      mats.copperWinding,
    );
    rStator.rotation.z = Math.PI / 2;
    rStator.position.x = xSide;
    rearMotor.add(rStator);
  }

  // Center helical reduction gear
  const gearWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.055, 24),
    mats.brushedAlloy,
  );
  gearWheel.rotation.z = Math.PI / 2;
  rearMotor.add(gearWheel);

  const rShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 1.56, 16),
    mats.brushedAlloy,
  );
  rShaft.rotation.z = Math.PI / 2;
  rearMotor.add(rShaft);

  const rearMotorUpper = new THREE.Group();
  const rUpperCase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.166, 0.166, 0.62, 22, 1, false, 0, Math.PI),
    mats.motorCase,
  );
  rUpperCase.rotation.z = Math.PI / 2;
  rearMotorUpper.add(rUpperCase);

  for (let i = -5; i <= 5; i++) {
    const fin = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.008, 8, 24, Math.PI),
      mats.motorCase,
    );
    fin.rotation.y = Math.PI / 2;
    fin.position.x = i * 0.048;
    rearMotorUpper.add(fin);
  }

  const rInverter = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.095, 0.28), mats.carbonFiber);
  rInverter.position.set(0, 0.19, 0);
  rearMotorUpper.add(rInverter);

  rearMotor.add(rearMotorUpper);
  tagPart(rearMotor, 'rear_motor');

  // 6. Octovalve Heat Pump & Front Thermal Radiator Core
  const heatPump = new THREE.Group();
  heatPump.name = 'heat_pump';

  const radCore = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.34, 0.06), mats.chassisAluminum);
  radCore.position.set(0, 0.38, 2.10);
  radCore.rotation.x = 0.24;
  heatPump.add(radCore);

  // Twin cooling fan shrouds & fan blades
  for (const side of [-0.23, 0.23]) {
    const shroud = new THREE.Mesh(
      new THREE.TorusGeometry(0.135, 0.014, 10, 24),
      mats.matteTrim,
    );
    shroud.position.set(side, 0.38, 2.06);
    shroud.rotation.x = 0.24;
    heatPump.add(shroud);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.025, 16),
      mats.darkAlloy,
    );
    hub.rotation.x = Math.PI / 2 + 0.24;
    hub.position.set(side, 0.38, 2.06);
    heatPump.add(hub);

    for (let b = 0; b < 7; b++) {
      const bladePivot = new THREE.Group();
      bladePivot.position.set(side, 0.38, 2.06);
      bladePivot.rotation.x = 0.24;
      bladePivot.rotation.z = (b / 7) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.095, 0.006), mats.matteTrim);
      blade.position.y = 0.072;
      blade.rotation.y = 0.35;
      bladePivot.add(blade);
      heatPump.add(bladePivot);
    }
  }

  // Octovalve manifold & compressor drum
  const octovalve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.085, 0.14, 16),
    mats.darkAlloy,
  );
  octovalve.position.set(0.28, 0.56, 1.78);
  heatPump.add(octovalve);

  const compressor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.068, 0.18, 16),
    mats.brushedAlloy,
  );
  compressor.rotation.z = Math.PI / 2;
  compressor.position.set(-0.22, 0.54, 1.78);
  heatPump.add(compressor);

  tagPart(heatPump, 'heat_pump');

  return {
    chassisFrame,
    batteryPack,
    batteryCover,
    hvCables,
    frontMotor,
    frontMotorUpper,
    rearMotor,
    rearMotorUpper,
    heatPump,
  };
}
