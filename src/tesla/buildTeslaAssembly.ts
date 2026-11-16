import * as THREE from 'three';
import type { TeslaMaterialLibrary } from './materials';
import { buildExteriorBody } from './parts/buildExteriorBody';
import { buildInterior } from './parts/buildInterior';
import { buildPowertrainAndChassis } from './parts/buildPowertrainAndChassis';
import { buildWheelsAndSuspension } from './parts/buildWheelsAndSuspension';

export interface TeslaAssembly {
  root: THREE.Group;
  applyReveal: (progress: number, mode: 'explode' | 'pinchDeep') => void;
  setWheelSpin: (deltaAngle: number) => void;
}

export function buildTeslaAssembly(mats: TeslaMaterialLibrary): TeslaAssembly {
  const root = new THREE.Group();
  root.name = 'tesla_model_s';

  const powertrain = buildPowertrainAndChassis(mats);
  const wheelsSusp = buildWheelsAndSuspension(mats);
  const interior = buildInterior(mats);
  const exterior = buildExteriorBody(mats);

  root.add(
    powertrain.chassisFrame,
    powertrain.batteryPack,
    powertrain.hvCables,
    powertrain.frontMotor,
    powertrain.rearMotor,
    powertrain.heatPump,
    wheelsSusp.root,
    interior.cabinGroup,
    interior.centerDisplayGroup,
    interior.steeringYokeGroup,
    exterior.bodyShellGroup,
    exterior.glassRoofGroup,
    exterior.frunkHoodGroup,
    exterior.doors.frontLeft,
    exterior.doors.frontRight,
    exterior.doors.rearLeft,
    exterior.doors.rearRight,
    exterior.headlightsGroup,
    exterior.taillightsGroup,
  );

  // Store base coordinates for zero-drift animation
  const baseWheelX = wheelsSusp.corners.map((c) => c.wheelGroup.position.x);
  const baseBrakeX = wheelsSusp.corners.map((c) => c.brakeGroup.position.x);
  const baseDoorX = {
    fl: exterior.doors.frontLeft.position.x,
    fr: exterior.doors.frontRight.position.x,
    rl: exterior.doors.rearLeft.position.x,
    rr: exterior.doors.rearRight.position.x,
  };

  function applyReveal(progress: number, mode: 'explode' | 'pinchDeep') {
    const p = THREE.MathUtils.clamp(progress, 0, 1);

    // Stage curves with smoothstep easing
    const stageDoors = THREE.MathUtils.smoothstep(p, 0.04, 0.30);
    const stageRoof = THREE.MathUtils.smoothstep(p, 0.14, 0.44);
    const stageShell = THREE.MathUtils.smoothstep(p, 0.28, 0.62);
    const stageBattery = THREE.MathUtils.smoothstep(p, 0.36, 0.72);
    const stageWheels = THREE.MathUtils.smoothstep(p, 0.48, 0.84);
    const stageMotors = THREE.MathUtils.smoothstep(p, 0.62, 0.96);

    // 1. Frunk Hood hinges smoothly upward
    exterior.frunkHoodGroup.rotation.x = -0.82 * stageDoors;
    exterior.frunkHoodGroup.position.y = 0.90 + (mode === 'explode' ? stageShell * 0.42 : 0);

    // 2. Doors swing outward around their front hinges (no cabin collision!)
    const frontSwing = 0.92 * stageDoors;
    const rearSwing = 0.82 * stageDoors;
    const doorOutShift = (mode === 'explode' ? stageShell * 0.32 : stageDoors * 0.08);

    exterior.doors.frontLeft.rotation.y = -frontSwing;
    exterior.doors.frontRight.rotation.y = frontSwing;
    exterior.doors.rearLeft.rotation.y = -rearSwing;
    exterior.doors.rearRight.rotation.y = rearSwing;

    exterior.doors.frontLeft.position.x = baseDoorX.fl + doorOutShift;
    exterior.doors.frontRight.position.x = baseDoorX.fr - doorOutShift;
    exterior.doors.rearLeft.position.x = baseDoorX.rl + doorOutShift;
    exterior.doors.rearRight.position.x = baseDoorX.rr - doorOutShift;

    // 3. Panoramic Glass Roof lifts & becomes crystal-clear
    exterior.glassRoofGroup.position.y = (mode === 'explode' ? 1.15 : 0.68) * stageRoof;
    mats.glassRoof.opacity = THREE.MathUtils.lerp(0.84, mode === 'pinchDeep' ? 0.08 : 0.35, stageRoof);
    mats.windowGlass.opacity = THREE.MathUtils.lerp(0.78, mode === 'pinchDeep' ? 0.12 : 0.38, stageRoof);

    // 4. Body Shell, Headlights & Taillights rise & ghost cleanly
    const shellLift = (mode === 'explode' ? 0.86 : 0.38) * stageShell;
    exterior.bodyShellGroup.position.y = shellLift;
    exterior.headlightsGroup.position.y = shellLift;
    exterior.taillightsGroup.position.y = shellLift;
    exterior.headlightsGroup.position.z = mode === 'explode' ? 0.22 * stageShell : 0;
    exterior.taillightsGroup.position.z = mode === 'explode' ? -0.22 * stageShell : 0;

    if (mode === 'pinchDeep') {
      // On mobile deep pinch-zoom, body shell fades smoothly away so you zoom straight into internals
      const shellAlpha = THREE.MathUtils.lerp(1.0, 0.0, stageShell);
      mats.setShellOpacity(shellAlpha);
      exterior.doors.frontLeft.visible = shellAlpha > 0.08;
      exterior.doors.frontRight.visible = shellAlpha > 0.08;
      exterior.doors.rearLeft.visible = shellAlpha > 0.08;
      exterior.doors.rearRight.visible = shellAlpha > 0.08;
      exterior.frunkHoodGroup.visible = shellAlpha > 0.08;
      exterior.glassRoofGroup.visible = stageRoof < 0.92;
    } else {
      // On desktop scroll explode, shell lifts up & turns sleek translucent architectural ghost
      const shellAlpha = THREE.MathUtils.lerp(1.0, 0.24, stageShell);
      mats.setShellOpacity(shellAlpha);
      exterior.doors.frontLeft.visible = true;
      exterior.doors.frontRight.visible = true;
      exterior.doors.rearLeft.visible = true;
      exterior.doors.rearRight.visible = true;
      exterior.frunkHoodGroup.visible = true;
      exterior.glassRoofGroup.visible = true;
    }

    // 5. Interior Cabin lifts slightly in full explode mode so battery pack below is unobstructed
    const cabinLift = mode === 'explode' ? 0.42 * stageBattery : 0.14 * stageBattery;
    interior.cabinGroup.position.y = cabinLift;
    interior.centerDisplayGroup.position.y = cabinLift;
    interior.steeringYokeGroup.position.y = cabinLift;

    // 6. Battery Armor Cover lifts off to expose 264 gleaming 4680 cells
    powertrain.batteryCover.position.y = 0.36 * stageBattery;
    powertrain.batteryCover.visible = !(mode === 'pinchDeep' && stageBattery > 0.78);

    // 7. Wheels & Brakes slide outward along axles to expose Brembo calipers, rotors & suspension
    wheelsSusp.corners.forEach((corner, i) => {
      const wheelSpread = (mode === 'explode' ? 0.48 : 0.24) * stageWheels;
      const brakeSpread = (mode === 'explode' ? 0.18 : 0.09) * stageWheels;
      corner.wheelGroup.position.x = baseWheelX[i] + corner.side * wheelSpread;
      corner.brakeGroup.position.x = baseBrakeX[i] + corner.side * brakeSpread;
    });

    // 8. Front & Rear Motor Upper Casings lift to expose copper stator windings & reduction gears
    powertrain.frontMotorUpper.position.y = 0.26 * stageMotors;
    powertrain.rearMotorUpper.position.y = 0.28 * stageMotors;
    powertrain.heatPump.position.z = (mode === 'explode' ? 0.32 : 0.14) * stageMotors;
  }

  function setWheelSpin(deltaAngle: number) {
    for (const corner of wheelsSusp.corners) {
      corner.wheelGroup.rotation.x += deltaAngle;
    }
  }

  return {
    root,
    applyReveal,
    setWheelSpin,
  };
}
