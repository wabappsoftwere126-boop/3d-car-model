import * as THREE from 'three';
import type { TeslaMaterialLibrary } from '../materials';

export interface InteriorGroups {
  cabinGroup: THREE.Group;
  centerDisplayGroup: THREE.Group;
  steeringYokeGroup: THREE.Group;
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

function buildSportSeat(mats: TeslaMaterialLibrary): THREE.Group {
  const seat = new THREE.Group();

  // Seat bottom cushion
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.095, 0.48), mats.interiorLeather);
  cushion.position.set(0, 0.05, 0.04);
  cushion.rotation.x = -0.06;
  seat.add(cushion);

  // Side thigh bolsters
  for (const side of [-1, 1]) {
    const thighBolster = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.11, 0.46),
      mats.interiorLeather,
    );
    thighBolster.position.set(side * 0.22, 0.075, 0.04);
    thighBolster.rotation.z = side * -0.22;
    seat.add(thighBolster);
  }

  // Reclined backrest
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.56, 0.09), mats.interiorLeather);
  backrest.position.set(0, 0.34, -0.20);
  backrest.rotation.x = -0.24;
  seat.add(backrest);

  // Side rib bolsters
  for (const side of [-1, 1]) {
    const ribBolster = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.48, 0.12),
      mats.interiorLeather,
    );
    ribBolster.position.set(side * 0.21, 0.33, -0.17);
    ribBolster.rotation.x = -0.24;
    ribBolster.rotation.y = side * 0.28;
    seat.add(ribBolster);
  }

  // Dark rear shell cover (authentic Tesla seatback)
  const backShell = new THREE.Mesh(
    new THREE.BoxGeometry(0.41, 0.52, 0.025),
    mats.interiorDarkTrim,
  );
  backShell.position.set(0, 0.33, -0.252);
  backShell.rotation.x = -0.24;
  seat.add(backShell);

  // Integrated sculpted headrest
  const headrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.18, 0.085),
    mats.interiorLeather,
  );
  headrest.position.set(0, 0.67, -0.28);
  headrest.rotation.x = -0.15;
  seat.add(headrest);

  return seat;
}

export function buildInterior(mats: TeslaMaterialLibrary): InteriorGroups {
  const cabinGroup = new THREE.Group();
  cabinGroup.name = 'interior_cabin';

  // Cabin Floor Pan & Carpet
  const floorPan = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.024, 2.08), mats.interiorDarkTrim);
  floorPan.position.set(0, 0.30, -0.05);
  cabinGroup.add(floorPan);

  // Sculpted Horizontal Dashboard Beam
  const dashUpper = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.14, 0.42), mats.interiorDarkTrim);
  dashUpper.position.set(0, 0.80, 0.72);
  cabinGroup.add(dashUpper);

  const dashLower = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.16, 0.28), mats.interiorLeather);
  dashLower.position.set(0, 0.66, 0.68);
  cabinGroup.add(dashLower);

  // Open-pore Wood / Carbon Dash Inlay
  const dashInlay = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.055, 0.03), mats.dashboardWood);
  dashInlay.position.set(0, 0.75, 0.52);
  cabinGroup.add(dashInlay);

  // Ambient Cabin Light Strip along Dash
  const ambientLine = new THREE.Mesh(
    new THREE.BoxGeometry(1.46, 0.008, 0.012),
    mats.ambientCabinGlow,
  );
  ambientLine.position.set(0, 0.725, 0.515);
  cabinGroup.add(ambientLine);

  // Driver Binnacle Instrument Screen behind Yoke
  const binnacle = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.13, 0.03),
    mats.interiorDarkTrim,
  );
  binnacle.position.set(0.38, 0.82, 0.56);
  binnacle.rotation.x = -0.18;
  cabinGroup.add(binnacle);

  const binnacleScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.105), mats.rearScreen);
  binnacleScreen.position.set(0.38, 0.82, 0.543);
  binnacleScreen.rotation.y = Math.PI;
  binnacleScreen.rotation.x = 0.18;
  cabinGroup.add(binnacleScreen);

  // Sweeping Center Console
  const consoleBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.28, 1.05),
    mats.interiorDarkTrim,
  );
  consoleBase.position.set(0, 0.46, 0.12);
  cabinGroup.add(consoleBase);

  // Dual Alcantara Wireless Phone Pads
  const phonePad = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.02, 0.22),
    mats.matteTrim,
  );
  phonePad.position.set(0, 0.61, 0.40);
  phonePad.rotation.x = 0.28;
  cabinGroup.add(phonePad);

  // Sliding Center Armrest
  const armrest = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.07, 0.42),
    mats.interiorLeather,
  );
  armrest.position.set(0, 0.63, -0.12);
  cabinGroup.add(armrest);

  // Front Left & Right Bolstered Sport Seats (Driver at +X in LHD? Let's place Steering on +X or -X:
  // Facing +Z, +X is passenger right or driver left?
  // Right-handed coords: +Y up, +Z forward -> +X is LEFT when looking along +Z!
  // Let's verify: (0,1,0) cross (0,0,1) = (1,0,0). Looking toward +Z with +Y up, +X is to the LEFT!
  // So Driver (LHD) sits at +X (+0.38)! Passenger sits at -X (-0.38)!)
  const driverSeat = buildSportSeat(mats);
  driverSeat.position.set(0.38, 0.34, 0.02);
  cabinGroup.add(driverSeat);

  const passengerSeat = buildSportSeat(mats);
  passengerSeat.position.set(-0.38, 0.34, 0.02);
  cabinGroup.add(passengerSeat);

  // Rear 3-Seat Sculpted Bench
  const rearBenchGroup = new THREE.Group();
  rearBenchGroup.position.set(0, 0.34, -0.78);

  const rearBase = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.11, 0.48), mats.interiorLeather);
  rearBase.position.set(0, 0.06, 0.05);
  rearBase.rotation.x = -0.05;
  rearBenchGroup.add(rearBase);

  const rearBack = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.50, 0.10), mats.interiorLeather);
  rearBack.position.set(0, 0.33, -0.20);
  rearBack.rotation.x = -0.26;
  rearBenchGroup.add(rearBack);

  for (const hx of [-0.42, 0, 0.42]) {
    const hr = new THREE.Mesh(
      new THREE.BoxGeometry(hx === 0 ? 0.18 : 0.22, 0.15, 0.08),
      mats.interiorLeather,
    );
    hr.position.set(hx, 0.62, -0.28);
    rearBenchGroup.add(hr);
  }
  cabinGroup.add(rearBenchGroup);

  tagPart(cabinGroup, 'interior_cabin');

  // 2. 17" Landscape Cinematic Touchscreen + Rear 8" Screen
  const centerDisplayGroup = new THREE.Group();
  centerDisplayGroup.name = 'center_display';

  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.26, 0.018), mats.darkAlloy);
  bezel.position.set(0, 0.72, 0.51);
  bezel.rotation.x = 0.22;
  centerDisplayGroup.add(bezel);

  const screenFace = new THREE.Mesh(new THREE.PlaneGeometry(0.385, 0.235), mats.touchscreen);
  screenFace.position.set(0, 0.72, 0.499);
  screenFace.rotation.y = Math.PI;
  screenFace.rotation.x = -0.22;
  centerDisplayGroup.add(screenFace);

  // Rear 8" passenger climate screen
  const rearBezel = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.125, 0.014), mats.darkAlloy);
  rearBezel.position.set(0, 0.54, -0.41);
  rearBezel.rotation.x = -0.28;
  centerDisplayGroup.add(rearBezel);

  const rearFace = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.105), mats.rearScreen);
  rearFace.position.set(0, 0.54, -0.419);
  rearFace.rotation.y = Math.PI;
  rearFace.rotation.x = 0.28;
  centerDisplayGroup.add(rearFace);

  tagPart(centerDisplayGroup, 'center_display');

  // 3. Steering Yoke, Column & Aluminum Pedals
  const steeringYokeGroup = new THREE.Group();
  steeringYokeGroup.name = 'steering_yoke';

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.044, 0.28, 16),
    mats.interiorDarkTrim,
  );
  column.rotation.x = Math.PI / 2 - 0.32;
  column.position.set(0.38, 0.74, 0.48);
  steeringYokeGroup.add(column);

  // Yoke Wheel Assembly
  const yokePivot = new THREE.Group();
  yokePivot.position.set(0.38, 0.78, 0.36);
  yokePivot.rotation.x = -0.32;

  // Center airbag hub
  const airbagHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.072, 0.045, 24),
    mats.interiorDarkTrim,
  );
  airbagHub.rotation.x = Math.PI / 2;
  yokePivot.add(airbagHub);

  // Metallic spokes + thumb scroll wheels
  const spokeBar = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.034, 0.022), mats.interiorDarkTrim);
  spokeBar.position.y = -0.01;
  yokePivot.add(spokeBar);

  for (const sx of [-0.115, 0.115]) {
    const scrollWheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.018, 12),
      mats.brushedAlloy,
    );
    scrollWheel.rotation.z = Math.PI / 2;
    scrollWheel.position.set(sx, 0.004, -0.012);
    yokePivot.add(scrollWheel);
  }

  // Sculpted Yoke Rim (U-shaped TubeGeometry)
  const yokeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.145, 0.065, -0.008),
    new THREE.Vector3(-0.165, -0.01, -0.008),
    new THREE.Vector3(-0.135, -0.092, -0.008),
    new THREE.Vector3(0, -0.105, -0.008),
    new THREE.Vector3(0.135, -0.092, -0.008),
    new THREE.Vector3(0.165, -0.01, -0.008),
    new THREE.Vector3(0.145, 0.065, -0.008),
  ]);
  const yokeRim = new THREE.Mesh(
    new THREE.TubeGeometry(yokeCurve, 32, 0.018, 12, false),
    mats.interiorDarkTrim,
  );
  yokePivot.add(yokeRim);
  steeringYokeGroup.add(yokePivot);

  // Aluminum Accelerator & Brake Pedals
  const accelPedal = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, 0.012), mats.brushedAlloy);
  accelPedal.position.set(0.30, 0.40, 0.78);
  accelPedal.rotation.x = 0.45;
  steeringYokeGroup.add(accelPedal);

  const brakePedal = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.065, 0.015), mats.brushedAlloy);
  brakePedal.position.set(0.43, 0.43, 0.76);
  brakePedal.rotation.x = 0.52;
  steeringYokeGroup.add(brakePedal);

  tagPart(steeringYokeGroup, 'steering_yoke');

  return {
    cabinGroup,
    centerDisplayGroup,
    steeringYokeGroup,
  };
}
