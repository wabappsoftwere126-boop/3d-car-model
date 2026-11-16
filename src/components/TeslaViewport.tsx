import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Layers, RotateCcw } from 'lucide-react';
import { buildStudio } from '../tesla/buildStudio';
import { buildTeslaAssembly } from '../tesla/buildTeslaAssembly';
import { createTeslaMaterials, type TeslaMaterialLibrary } from '../tesla/materials';
import { createProceduralTextures } from '../tesla/textures';
import { PAINT_FINISHES, PART_CATALOG, type PaintFinish } from '../tesla/types';

// Pre-allocated scratch math helpers (zero GC inside animation loop)
const _camGoal = new THREE.Vector3();
const _targetGoal = new THREE.Vector3();
const _rayCenter = new THREE.Vector2(0, 0);

interface CameraKeyframe {
  t: number;
  pos: [number, number, number];
  target: [number, number, number];
}

const SCROLL_KEYFRAMES: CameraKeyframe[] = [
  { t: 0.0, pos: [4.35, 1.52, 4.65], target: [0, 0.56, 0.0] },
  { t: 0.25, pos: [2.45, 1.88, 1.95], target: [0, 0.72, 0.16] },
  { t: 0.52, pos: [4.15, 2.28, -0.35], target: [0, 0.52, 0.0] },
  { t: 0.78, pos: [-3.85, 1.55, 3.15], target: [0, 0.44, 0.28] },
  { t: 1.0, pos: [4.85, 2.48, 4.45], target: [0, 0.64, 0.0] },
];

function sampleScrollCamera(progress: number, outPos: THREE.Vector3, outTarget: THREE.Vector3) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  let k0 = SCROLL_KEYFRAMES[0];
  let k1 = SCROLL_KEYFRAMES[SCROLL_KEYFRAMES.length - 1];
  for (let i = 0; i < SCROLL_KEYFRAMES.length - 1; i++) {
    if (p >= SCROLL_KEYFRAMES[i].t && p <= SCROLL_KEYFRAMES[i + 1].t) {
      k0 = SCROLL_KEYFRAMES[i];
      k1 = SCROLL_KEYFRAMES[i + 1];
      break;
    }
  }
  const span = Math.max(0.0001, k1.t - k0.t);
  const alpha = THREE.MathUtils.smoothstep((p - k0.t) / span, 0, 1);
  outPos.set(
    THREE.MathUtils.lerp(k0.pos[0], k1.pos[0], alpha),
    THREE.MathUtils.lerp(k0.pos[1], k1.pos[1], alpha),
    THREE.MathUtils.lerp(k0.pos[2], k1.pos[2], alpha),
  );
  outTarget.set(
    THREE.MathUtils.lerp(k0.target[0], k1.target[0], alpha),
    THREE.MathUtils.lerp(k0.target[1], k1.target[1], alpha),
    THREE.MathUtils.lerp(k0.target[2], k1.target[2], alpha),
  );
}

function detectIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return window.innerWidth < 768 || (coarse && touch && window.innerWidth < 1024);
}

export default function TeslaViewport() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const materialsRef = useRef<TeslaMaterialLibrary | null>(null);

  const [isMobile, setIsMobile] = useState<boolean>(() => detectIsMobile());
  const isMobileRef = useRef<boolean>(isMobile);

  const [activeFinish, setActiveFinish] = useState<string>(PAINT_FINISHES[0].id);
  const [mobileExploded, setMobileExploded] = useState<boolean>(false);
  const mobileExplodedRef = useRef<boolean>(false);
  const [activePartName, setActivePartName] = useState<string>('Tesla Model S Plaid');
  const [contextLost, setContextLost] = useState<boolean>(false);

  const resetCameraFnRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onResizeMode = () => {
      const next = detectIsMobile();
      isMobileRef.current = next;
      setIsMobile(next);
    };
    window.addEventListener('resize', onResizeMode);
    return () => window.removeEventListener('resize', onResizeMode);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL renderer (SwiftShader / llvmpipe / WARP)
    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    container.appendChild(canvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      isMobileRef.current ? 46 : 38,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.05,
      80,
    );

    const initialMobile = isMobileRef.current;
    if (initialMobile) {
      camera.position.set(4.5, 1.85, 4.9);
    } else {
      camera.position.set(4.35, 1.52, 4.65);
    }

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.rotateSpeed = 0.78;
    controls.panSpeed = 0.7;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minPolarAngle = 0.08;
    controls.target.set(0, 0.56, 0);

    const syncControlsForDevice = () => {
      const mob = isMobileRef.current;
      controls.enableZoom = mob;
      controls.enablePan = true;
      controls.zoomSpeed = mob ? 1.35 : 1.0;
      controls.minDistance = mob ? 0.40 : 1.2;
      controls.maxDistance = mob ? 11.5 : 10.5;
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      };
    };
    syncControlsForDevice();

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextures(maxAniso);
    const materials = createTeslaMaterials(textures, isSoftwareGl);
    materialsRef.current = materials;

    const studio = buildStudio(scene, renderer, textures, isSoftwareGl);
    const tesla = buildTeslaAssembly(materials);
    scene.add(tesla.root);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // State for PC scroll-driven parts reveal & Mobile pinch-zoom deep inspection
    let targetScrollProgress = 0;
    let currentReveal = 0;
    let scrollCameraActive = false;
    let userDragging = false;

    const raycaster = new THREE.Raycaster();
    let lastRaycastTime = 0;

    controls.addEventListener('start', () => {
      userDragging = true;
      scrollCameraActive = false;
    });
    controls.addEventListener('end', () => {
      userDragging = false;
    });

    const onWheel = (e: WheelEvent) => {
      if (isMobileRef.current) return;
      e.preventDefault();
      // Normalize trackpad & mouse wheel delta
      const deltaNorm =
        e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      targetScrollProgress = THREE.MathUtils.clamp(
        targetScrollProgress + deltaNorm * 0.00055,
        0,
        1,
      );
      scrollCameraActive = true;
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    // Mobile tap-to-identify deep parts
    const tapPointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!isMobileRef.current) return;
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 100) return; // Was a drag/pinch, not a tap

      const rect = canvas.getBoundingClientRect();
      tapPointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      tapPointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(tapPointer, camera);
      const hits = raycaster.intersectObjects(tesla.root.children, true);
      const hit = hits.find((h) => h.object.visible && h.object.userData.partId);
      if (hit) {
        const partId = hit.object.userData.partId as string;
        const info = PART_CATALOG[partId];
        if (info) {
          setActivePartName(info.name);
        }
      }
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);

    resetCameraFnRef.current = () => {
      mobileExplodedRef.current = false;
      setMobileExploded(false);
      setActivePartName('Tesla Model S Plaid');
      camera.position.set(4.5, 1.85, 4.9);
      controls.target.set(0, 0.56, 0);
      controls.update();
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.fov = isMobileRef.current ? 46 : 38;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      syncControlsForDevice();
    };
    window.addEventListener('resize', onResize);

    // Frame loop with software-WebGL pacing & exponential damping
    let disposed = false;
    let frameId = 0;
    let prevTime = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - prevTime) / 1000, 0.1);
      prevTime = now;

      const mob = isMobileRef.current;

      if (mob) {
        // Mobile: two-hand pinch-zoom drives deep reveal automatically!
        const dist = camera.position.distanceTo(controls.target);
        const pinchDeep = THREE.MathUtils.clamp((4.5 - dist) / (4.5 - 1.35), 0, 1);
        const targetVal = mobileExplodedRef.current ? 1.0 : pinchDeep;
        const mode = mobileExplodedRef.current ? 'explode' : 'pinchDeep';

        currentReveal = isSoftwareGl
          ? targetVal
          : THREE.MathUtils.damp(currentReveal, targetVal, 6.5, dt);
        tesla.applyReveal(currentReveal, mode);

        // Throttled center raycast while zoomed deep on mobile to show inspected part name
        if (now - lastRaycastTime > 160) {
          lastRaycastTime = now;
          if (dist < 4.2 || mobileExplodedRef.current) {
            raycaster.setFromCamera(_rayCenter, camera);
            const hits = raycaster.intersectObjects(tesla.root.children, true);
            const hit = hits.find((h) => h.object.visible && h.object.userData.partId);
            if (hit) {
              const info = PART_CATALOG[hit.object.userData.partId as string];
              if (info) {
                setActivePartName((prev) => (prev === info.name ? prev : info.name));
              }
            }
          } else {
            setActivePartName((prev) =>
              prev === 'Tesla Model S Plaid' ? prev : 'Tesla Model S Plaid',
            );
          }
        }
      } else {
        // PC: scroll wheel drives full parts reveal; zero text UI!
        currentReveal = isSoftwareGl
          ? targetScrollProgress
          : THREE.MathUtils.damp(currentReveal, targetScrollProgress, 6.0, dt);
        tesla.applyReveal(currentReveal, 'explode');

        if (scrollCameraActive && !userDragging) {
          sampleScrollCamera(currentReveal, _camGoal, _targetGoal);
          if (isSoftwareGl) {
            camera.position.copy(_camGoal);
            controls.target.copy(_targetGoal);
          } else {
            const camDamp = 1 - Math.exp(-4.5 * dt);
            camera.position.lerp(_camGoal, camDamp);
            controls.target.lerp(_targetGoal, camDamp);
          }
          if (camera.position.distanceTo(_camGoal) < 0.02 && Math.abs(currentReveal - targetScrollProgress) < 0.005) {
            scrollCameraActive = false;
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      tick();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);

      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      controls.dispose();
      studio.dispose();
      materials.dispose();
      textures.dispose();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry.dispose();
        }
      });

      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  const handleFinishSelect = (finish: PaintFinish) => {
    setActiveFinish(finish.id);
    materialsRef.current?.setPaintFinish(finish);
  };

  const handleToggleExplode = () => {
    const next = !mobileExplodedRef.current;
    mobileExplodedRef.current = next;
    setMobileExploded(next);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090b0f]">
      {/* Dedicated WebGL Mount Container (never re-rendered by React UI state) */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full touch-none" />

      {/* WebGL Context Lost Visual Fallback (pure SVG/CSS on PC so zero text on PC) */}
      {contextLost && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#090b0f]">
          <div className="w-12 h-12 rounded-full border-2 border-white/25 border-t-white animate-spin" />
        </div>
      )}

      {/* Mobile-ONLY Compact Bottom Bar (Zero Text Rendered Anywhere on PC!) */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-10 pointer-events-auto bg-[#0c1018]/92 border-t border-white/10 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
            {/* Active Deep Part Name */}
            <div className="min-w-0 flex-1 pr-1">
              <div className="text-[13px] font-medium text-slate-100 truncate">
                {activePartName}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Pinch to zoom deep
              </div>
            </div>

            {/* Paint Finish Swatches */}
            <div className="flex items-center gap-1.5 shrink-0">
              {PAINT_FINISHES.map((finish) => {
                const selected = activeFinish === finish.id;
                return (
                  <button
                    key={finish.id}
                    type="button"
                    aria-label={finish.id}
                    onClick={() => handleFinishSelect(finish)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      selected ? 'ring-2 ring-white scale-110' : 'opacity-80'
                    }`}
                    style={{ backgroundColor: finish.color }}
                  />
                );
              })}
            </div>

            {/* Explode & Reset Icon Controls (>=44px touch targets) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Toggle parts view"
                onClick={handleToggleExplode}
                className={`w-11 h-11 flex items-center justify-center rounded-lg border transition-colors ${
                  mobileExploded
                    ? 'bg-white text-slate-950 border-white'
                    : 'bg-white/10 text-white border-white/15'
                }`}
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Reset camera"
                onClick={() => resetCameraFnRef.current?.()}
                className="w-11 h-11 flex items-center justify-center rounded-lg bg-white/10 text-white border border-white/15"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
