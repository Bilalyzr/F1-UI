// --- PARALLEL STREAMING PREFETCH OF 26.8MB RB22 3D CHASSIS AT T=0MS ---
// Starts network transfer immediately on background thread while procedural 3D circuit initializes!
const rb22BufferPromise = (typeof window.fetch === 'function')
    ? fetch('./red_bull_rb22_2026.glb')
        .then((res) => (res.ok ? res.arrayBuffer() : null))
        .catch(() => null)
    : Promise.resolve(null);

gsap.registerPlugin(ScrollTrigger);
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// --- DEVICE CAPABILITY & ACCESSIBILITY TIERING ---
const PREFERS_REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const IS_MOBILE_VIEWPORT = window.innerWidth < 768;
const IS_LOW_CORE = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const GPU_RENDERER_SIGNATURE = (() => {
    try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl') || probe.getContext('experimental-webgl');
        if (!gl) return '';
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const info = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
        return info;
    } catch (e) {
        return '';
    }
})();
const IS_INTEGRATED_GPU = /intel|iris|uhd|hd graphics|radeon\(tm\) graphics|vega|mali|adreno/i.test(GPU_RENDERER_SIGNATURE)
    && !/rtx|gtx|radeon rx|arc a7/i.test(GPU_RENDERER_SIGNATURE);
const MAX_RENDER_DPR = (IS_MOBILE_VIEWPORT || IS_INTEGRATED_GPU) ? 1.0 : (IS_LOW_CORE ? 1.35 : 1.75);

// --- CINEMATIC CAR REVEAL & TRACK ROLLOUT STATE ---
let isCinematicIntroActive = true;
let postIntroParallaxBlend = 0;
let rb22ModelLoaded = false;
let lapStartMs = 0;

// --- LENIS 60FPS SUB-PIXEL SMOOTH INERTIA SCROLL ENGINE ---
// Stepped directly inside our master WebGL requestAnimationFrame loop for zero phase jitter!
let lenis = null;
if (typeof window.Lenis === 'function') {
    try {
        lenis = new Lenis({
            autoRaf: false,
            duration: 0.96,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 0.95,
            touchMultiplier: 1.5,
            prevent: (node) => isCinematicIntroActive || !!(node && node.closest && node.closest('#cinema-intro-hud'))
        });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.lagSmoothing(0);
    } catch (e) {
        lenis = null;
    }
}

// --- GRAND PRIX LAP AUTOPILOT SIMULATION STATE ---
let isSimulatingLap = false;
let simVirtualScroll = 0;

function stopLapSimulation() {
    if (!isSimulatingLap) return;
    isSimulatingLap = false;
    if (lenis) lenis.scrollTo(simVirtualScroll, { immediate: true });
    syncSimButtonsUI();
}

function syncSimButtonsUI() {
    document.querySelectorAll('.sim-trigger-btn').forEach((btn) => {
        const icon = btn.querySelector('.sim-btn-icon');
        const label = btn.querySelector('.sim-btn-label');
        if (isSimulatingLap) {
            btn.classList.add('sim-active');
            if (icon) icon.textContent = '⏸';
            if (label) label.textContent = 'SIMULATING...';
        } else {
            btn.classList.remove('sim-active');
            if (icon) icon.textContent = '▶';
            if (label) label.textContent = 'SIMULATE LAP';
        }
    });
}

function toggleLapSimulation() {
    if (isCinematicIntroActive) return;
    if (isSimulatingLap) {
        stopLapSimulation();
        return;
    }
    const scroller = document.scrollingElement || document.documentElement;
    const maxScroll = Math.max(1, scroller.scrollHeight - window.innerHeight);
    const currentY = window.scrollY || scroller.scrollTop || 0;
    // If already near checkered flag (>95%), restart from Pole Position Grid for a full flying lap!
    if (currentY >= maxScroll * 0.95) {
        if (lenis) lenis.scrollTo(0, { immediate: true });
        window.scrollTo(0, 0);
        simVirtualScroll = 0;
        lapStartMs = performance.now();
    } else {
        simVirtualScroll = currentY;
        if (!lapStartMs) lapStartMs = performance.now();
    }
    isSimulatingLap = true;
    syncSimButtonsUI();
}

function smoothScrollToTarget(targetIdOrZero, customDuration = 1.08) {
    if (isCinematicIntroActive) return;
    stopLapSimulation();
    resetKeyboardDrive();
    if (targetIdOrZero === 0 || targetIdOrZero === 'grid') {
        if (lenis) lenis.scrollTo(0, { duration: customDuration });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    if (typeof targetIdOrZero === 'number') {
        if (lenis) lenis.scrollTo(targetIdOrZero, { duration: customDuration });
        else window.scrollTo({ top: targetIdOrZero, behavior: 'smooth' });
        return;
    }
    const el = typeof targetIdOrZero === 'string' ? document.getElementById(targetIdOrZero) : targetIdOrZero;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: customDuration });
    else el.scrollIntoView({ behavior: 'smooth' });
}

// Cancel autopilot or keyboard coasting cleanly if user manually scrolls wheel or touches screen
window.addEventListener('wheel', () => {
    if (!isCinematicIntroActive) {
        if (isSimulatingLap) stopLapSimulation();
        resetKeyboardDrive();
    }
}, { passive: true });
window.addEventListener('touchmove', () => {
    if (!isCinematicIntroActive) {
        if (isSimulatingLap) stopLapSimulation();
        resetKeyboardDrive();
    }
}, { passive: true });

// --- ACTIVE AERO & TELEMETRY STATE ---
let isDrsOn = false;
let manualDrsOverride = null; // null = auto DRS in DRS zone, true/false = user forced

// Bind SIMULATE LAP buttons
document.querySelectorAll('.sim-trigger-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLapSimulation();
    });
});

// --- PIT WALL CONTACT FORM & 1-CLICK EMAIL COPY ---
const pitWallForm = document.getElementById('pit-wall-form');
const formStatus = document.getElementById('form-status');
if (pitWallForm) {
    pitWallForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameVal = (document.getElementById('pit-callsign') || {}).value || '';
        const emailVal = (document.getElementById('pit-email') || {}).value || '';
        const msgVal = (document.getElementById('pit-message') || {}).value || '';
        if (formStatus) {
            formStatus.classList.remove('hidden');
            clearTimeout(pitWallForm._statusTimer);
            pitWallForm._statusTimer = setTimeout(() => formStatus.classList.add('hidden'), 5000);
        }
        const subject = encodeURIComponent(`[F1 Portfolio Pit Wall] Transmission from ${nameVal}`);
        const body = encodeURIComponent(`From: ${nameVal} (${emailVal})\n\n${msgVal}`);
        window.location.href = `mailto:althafbilal1968@gmail.com?subject=${subject}&body=${body}`;
        pitWallForm.reset();
    });
}

const copyEmailBtn = document.getElementById('copy-email-btn');
if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('althafbilal1968@gmail.com').then(() => {
                copyEmailBtn.textContent = 'COPIED!';
                setTimeout(() => { copyEmailBtn.textContent = 'COPY'; }, 1800);
            }).catch(() => {});
        }
    });
}

// --- DRS 2026 X-MODE ACTIVE AERO CONTROLLER (AUTO ZONE + MANUAL OVERRIDE) ---
const drsTriggerBtn = document.getElementById('drs-trigger-btn');
const drsBtnLight = document.getElementById('drs-btn-light');
const drsBtnStatus = document.getElementById('drs-btn-status');
const drsIndicator = document.getElementById('drs-indicator');
const mobileDrsBtn = document.getElementById('mobile-drs-btn');
const navAeroPill = document.getElementById('nav-aero-pill');
const drsZoneBanner = document.getElementById('drs-zone-banner');

function setDrsAeroState(nextState) {
    if (isDrsOn === nextState) return;
    isDrsOn = nextState;

    if (isDrsOn) {
        document.body.classList.add('drs-active-mode');
        if (drsTriggerBtn) drsTriggerBtn.classList.add('border-emerald-400', 'bg-emerald-950/30');
        if (drsBtnLight) {
            drsBtnLight.classList.remove('bg-gray-500');
            drsBtnLight.classList.add('bg-emerald-400', 'shadow-[0_0_8px_#10b981]');
        }
        if (drsBtnStatus) {
            drsBtnStatus.innerText = 'OPEN';
            drsBtnStatus.className = 'text-[8px] border border-emerald-400/60 px-1.5 py-0.5 rounded text-emerald-300 font-bold';
        }
        if (drsIndicator) {
            drsIndicator.innerText = 'DRS ON';
            drsIndicator.className = 'text-[8px] font-bold text-emerald-300 border border-emerald-400/60 bg-emerald-950/35 px-2 py-1 rounded cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.28)] transition-all';
        }
        if (mobileDrsBtn) {
            mobileDrsBtn.className = 'md:hidden text-[8px] font-bold tracking-wider px-2 py-1 rounded-full border border-emerald-400 bg-emerald-950/40 text-emerald-300 cursor-pointer transition-all';
        }
        if (navAeroPill) {
            navAeroPill.textContent = 'X-MODE · DRS';
            navAeroPill.className = 'text-emerald-400 font-bold';
        }
        if (drsZoneBanner) drsZoneBanner.textContent = 'WING OPEN';
    } else {
        document.body.classList.remove('drs-active-mode');
        if (drsTriggerBtn) drsTriggerBtn.classList.remove('border-emerald-400', 'bg-emerald-950/30');
        if (drsBtnLight) {
            drsBtnLight.classList.remove('bg-emerald-400', 'shadow-[0_0_8px_#10b981]');
            drsBtnLight.classList.add('bg-gray-500');
        }
        if (drsBtnStatus) {
            drsBtnStatus.innerText = 'CLOSED';
            drsBtnStatus.className = 'text-[8px] border border-gray-700 px-1.5 py-0.5 rounded text-gray-400';
        }
        if (drsIndicator) {
            drsIndicator.innerText = 'DRS OFF';
            drsIndicator.className = 'text-[8px] font-bold text-gray-400 border border-gray-700 px-2 py-1 rounded cursor-pointer hover:border-white/40 transition-all';
        }
        if (mobileDrsBtn) {
            mobileDrsBtn.className = 'md:hidden text-[8px] font-bold tracking-wider px-2 py-1 rounded-full border border-gray-700 text-gray-400 cursor-pointer transition-all';
        }
        if (navAeroPill) {
            navAeroPill.textContent = 'Z-MODE';
            navAeroPill.className = 'text-cyan-400 font-bold';
        }
        if (drsZoneBanner) drsZoneBanner.textContent = 'AUTO-ARMED';
    }

    syncRedBullActiveAero();
}

function toggleDrsAeroManual() {
    manualDrsOverride = !isDrsOn;
    setDrsAeroState(!isDrsOn);
}

if (drsTriggerBtn) drsTriggerBtn.addEventListener('click', toggleDrsAeroManual);
if (drsIndicator) drsIndicator.addEventListener('click', toggleDrsAeroManual);
if (mobileDrsBtn) mobileDrsBtn.addEventListener('click', toggleDrsAeroManual);

// ==========================================================
//  THREE.JS 100% PHOTOREALISTIC FIA NIGHT GRAND PRIX ENGINE
//  Calibrated HDR Contrast · True Dark Basalt Tarmac · RB22
// ==========================================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010206);
scene.fog = new THREE.FogExp2(0x010308, 0.0052);

const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.08, 1200);
const renderer = new THREE.WebGLRenderer({
    antialias: !IS_MOBILE_VIEWPORT && !IS_INTEGRATED_GPU,
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_RENDER_DPR));
if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = false;
container.appendChild(renderer.domElement);

const rawMaxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4;
const maxAniso = IS_INTEGRATED_GPU ? Math.min(4, rawMaxAniso) : Math.min(8, rawMaxAniso);

// Zero-dependency 60FPS static BufferGeometry batcher (collapses hundreds of world & GLB draw calls into single VBOs!)
const _mergePosVec = new THREE.Vector3();
const _mergeNormVec = new THREE.Vector3();
const _mergeNormalMat = new THREE.Matrix3();
function mergeStaticGeometries(items, opts = {}) {
    if (!items || !items.length) return null;
    const keepNormals = opts.normals !== false;
    const keepUVs = opts.uvs !== false;
    const useColors = !!opts.colors;
    let totalVerts = 0;
    let totalIndices = 0;
    for (let i = 0; i < items.length; i++) {
        const g = items[i].geo;
        if (!g || !g.attributes || !g.attributes.position) continue;
        const vCount = g.attributes.position.count;
        totalVerts += vCount;
        totalIndices += g.index ? g.index.count : vCount;
    }
    if (totalVerts === 0) return null;

    const posOut = new Float32Array(totalVerts * 3);
    const normOut = keepNormals ? new Float32Array(totalVerts * 3) : null;
    const uvOut = keepUVs ? new Float32Array(totalVerts * 2) : null;
    const colOut = useColors ? new Float32Array(totalVerts * 3) : null;
    const idxOut = totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

    let vOffset = 0;
    let iOffset = 0;
    for (let k = 0; k < items.length; k++) {
        const { geo, matrix, color } = items[k];
        if (!geo || !geo.attributes || !geo.attributes.position) continue;
        const posAttr = geo.attributes.position;
        const normAttr = keepNormals ? geo.attributes.normal : null;
        const uvAttr = keepUVs ? geo.attributes.uv : null;
        const vCount = posAttr.count;
        if (matrix && normAttr) _mergeNormalMat.getNormalMatrix(matrix);

        for (let v = 0; v < vCount; v++) {
            _mergePosVec.fromBufferAttribute(posAttr, v);
            if (matrix) _mergePosVec.applyMatrix4(matrix);
            const p3 = (vOffset + v) * 3;
            posOut[p3]     = _mergePosVec.x;
            posOut[p3 + 1] = _mergePosVec.y;
            posOut[p3 + 2] = _mergePosVec.z;

            if (normOut) {
                if (normAttr) {
                    _mergeNormVec.fromBufferAttribute(normAttr, v);
                    if (matrix) _mergeNormVec.applyMatrix3(_mergeNormalMat).normalize();
                    normOut[p3]     = _mergeNormVec.x;
                    normOut[p3 + 1] = _mergeNormVec.y;
                    normOut[p3 + 2] = _mergeNormVec.z;
                } else {
                    normOut[p3 + 1] = 1;
                }
            }
            if (uvOut && uvAttr) {
                const u2 = (vOffset + v) * 2;
                uvOut[u2]     = uvAttr.getX(v);
                uvOut[u2 + 1] = uvAttr.getY(v);
            }
            if (colOut) {
                colOut[p3]     = color ? color.r : 1;
                colOut[p3 + 1] = color ? color.g : 1;
                colOut[p3 + 2] = color ? color.b : 1;
            }
        }

        if (geo.index) {
            const idxArr = geo.index.array;
            const iCount = geo.index.count;
            for (let j = 0; j < iCount; j++) {
                idxOut[iOffset + j] = idxArr[j] + vOffset;
            }
            iOffset += iCount;
        } else {
            for (let j = 0; j < vCount; j++) {
                idxOut[iOffset + j] = vOffset + j;
            }
            iOffset += vCount;
        }
        vOffset += vCount;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(posOut, 3));
    if (normOut) merged.setAttribute('normal', new THREE.BufferAttribute(normOut, 3));
    if (uvOut) merged.setAttribute('uv', new THREE.BufferAttribute(uvOut, 2));
    if (colOut) merged.setAttribute('color', new THREE.BufferAttribute(colOut, 3));
    merged.setIndex(new THREE.BufferAttribute(idxOut, 1));
    merged.computeBoundingSphere();
    return merged;
}

// --- CALIBRATED NIGHT STADIUM FLOODLIGHT HDRI ENVIRONMENT (PMREM) ---
try {
    if (typeof THREE.PMREMGenerator === 'function') {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileCubemapShader();
        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x010205);

        const darkGround = new THREE.Mesh(
            new THREE.PlaneGeometry(140, 140),
            new THREE.MeshBasicMaterial({ color: 0x010204, side: THREE.DoubleSide })
        );
        darkGround.position.set(0, -5, 0);
        darkGround.rotation.x = Math.PI / 2;
        envScene.add(darkGround);

        // Crisp narrow Singapore-style overhead floodlight strips (creates authentic F1 clearcoat light ribbons without washing out diffuse!)
        for (let b = -3; b <= 3; b++) {
            const bar = new THREE.Mesh(
                new THREE.PlaneGeometry(1.8, 18),
                new THREE.MeshBasicMaterial({ color: (b % 2 === 0) ? 0xffeacc : 0xcce0ff, side: THREE.DoubleSide })
            );
            bar.position.set(b * 8.0, 22.0, 0);
            bar.rotation.x = Math.PI / 2;
            envScene.add(bar);
        }

        const leftRig = new THREE.Mesh(
            new THREE.PlaneGeometry(38, 1.1),
            new THREE.MeshBasicMaterial({ color: 0xffebd2, side: THREE.DoubleSide })
        );
        leftRig.position.set(-16, 11.5, 0);
        leftRig.rotation.y = Math.PI / 2;
        leftRig.rotation.z = -Math.PI / 5;
        envScene.add(leftRig);

        const rightRig = new THREE.Mesh(
            new THREE.PlaneGeometry(38, 1.1),
            new THREE.MeshBasicMaterial({ color: 0xc8deff, side: THREE.DoubleSide })
        );
        rightRig.position.set(16, 11.5, 0);
        rightRig.rotation.y = -Math.PI / 2;
        rightRig.rotation.z = Math.PI / 5;
        envScene.add(rightRig);

        scene.environment = pmrem.fromScene(envScene, 0.022).texture;
        pmrem.dispose();
    }
} catch (e) {
    console.warn('[env] PMREM fallback:', e);
}

// --- CALIBRATED 60FPS HIGH-CONTRAST NOCTURNAL GRAND PRIX LIGHTING (5-LIGHT RIG) ---
const nightSkyAmbient = new THREE.HemisphereLight(0x1a2c56, 0x020306, 0.34);
scene.add(nightSkyAmbient);

const nightMoonRim = new THREE.DirectionalLight(0x5c84cc, 0.30);
nightMoonRim.position.set(-28, 38, -22);
scene.add(nightMoonRim);

// Primary stadium key floodlight tracking the RB22 (contact AO shadow decal handles car shadow at 0.0ms cost!)
const spotlight = new THREE.SpotLight(0xfff3e0, 1.85, 84, Math.PI / 3.4, 0.62, 1.45);
spotlight.position.set(6, 21.5, 40);
spotlight.castShadow = false;
scene.add(spotlight);
scene.add(spotlight.target);

// 2 High-Impact Dynamic PointLights (reused seamlessly as Studio Key/Rim in Intro & Stadium/Car-Aura on Track!)
const floodLampWorldPositions = [];
const stadiumNearLight = new THREE.PointLight(0xfff0d8, 1.15, 34, 1.75);
stadiumNearLight.position.set(0, 10.5, 34);
scene.add(stadiumNearLight);

const carAuraLight = new THREE.PointLight(0xff1801, 0.85, 7.5, 1.9);
carAuraLight.position.set(0, 0.36, 34);
scene.add(carAuraLight);
let carBrakeGlowLevel = 0;

// ==========================================================
//  CLOSED FIA GRADE-1 GRAND PRIX CIRCUIT SPLINE (~395m LAP)
//  Main Straight · Turn 1-2 Hairpin · Infield Technical Esses
//  Back High-Speed DRS Straight · Sweeping Parabolica Complex
// ==========================================================
const circuitControlPoints = [
    new THREE.Vector3(  0.0, 0,  34.0), // u=0.00: CH 01 P1 Pole Position on Main Straight
    new THREE.Vector3( 32.0, 0,  34.0), // Main Straight exit & Turn 1 heavy braking zone
    new THREE.Vector3( 62.0, 0,  29.0), // CH 02 Turn 1 braking entry
    new THREE.Vector3( 80.0, 0,  10.0), // CH 02 Turn 1 wide apex
    new THREE.Vector3( 76.0, 0, -14.0), // Turn 2 sweeping apex
    new THREE.Vector3( 56.0, 0, -24.0), // Turn 2 exit into Infield Arena
    new THREE.Vector3( 32.0, 0, -20.0), // CH 03 Infield Technical Esses Left-Hander
    new THREE.Vector3( 10.0, 0, -31.0), // CH 03 Technical Esses Right-Sweep
    new THREE.Vector3(-14.0, 0, -48.0), // CH 04 Back DRS Straight entry
    new THREE.Vector3(-44.0, 0, -48.0), // CH 04 Back DRS Straight speed trap (342 KM/H)
    new THREE.Vector3(-68.0, 0, -30.0), // CH 05 Parabolica heavy braking entry
    new THREE.Vector3(-73.0, 0,  -3.0), // CH 05 Parabolica sweeping apex
    new THREE.Vector3(-54.0, 0,  25.0), // Final corner exit onto Main Straight
    new THREE.Vector3(-25.0, 0,  34.0)  // CH 06 Parc Fermé & Starting Grid Boxes
];
const circuitCurve = new THREE.CatmullRomCurve3(circuitControlPoints, true, 'centripetal', 0.5);
const circuitTotalLength = circuitCurve.getLength();

function sampleCircuitFrame(uNorm, outFrame) {
    const u = ((uNorm % 1) + 1) % 1;
    if (outFrame) {
        circuitCurve.getPointAt(u, outFrame.pos);
        circuitCurve.getTangentAt(u, outFrame.tang).normalize();
        outFrame.right.set(-outFrame.tang.z, 0, outFrame.tang.x).normalize();
        outFrame.u = u;
        return outFrame;
    }
    const pos = circuitCurve.getPointAt(u);
    const tang = circuitCurve.getTangentAt(u).normalize();
    const right = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
    return { pos, tang, right, u };
}

function buildCircuitRibbon(segments, offA, offB, yA, yB, uvRepeatAlong, uvAcrossA, uvAcrossB) {
    const pts = circuitCurve.getSpacedPoints(segments);
    const posArr = new Float32Array((segments + 1) * 2 * 3);
    const normArr = new Float32Array((segments + 1) * 2 * 3);
    const uvArr = new Float32Array((segments + 1) * 2 * 2);
    const indices = [];

    for (let i = 0; i <= segments; i++) {
        const p = pts[i % segments];
        const pNext = pts[(i + 1) % segments];
        const pPrev = pts[(i - 1 + segments) % segments];
        const tang = new THREE.Vector3().subVectors(pNext, pPrev).normalize();
        const right = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

        const vIdx = i * 2;
        posArr[vIdx * 3]     = p.x + right.x * offA;
        posArr[vIdx * 3 + 1] = yA;
        posArr[vIdx * 3 + 2] = p.z + right.z * offA;

        posArr[(vIdx + 1) * 3]     = p.x + right.x * offB;
        posArr[(vIdx + 1) * 3 + 1] = yB;
        posArr[(vIdx + 1) * 3 + 2] = p.z + right.z * offB;

        normArr[vIdx * 3 + 1] = 1;
        normArr[(vIdx + 1) * 3 + 1] = 1;

        const vCoord = (i / segments) * uvRepeatAlong;
        uvArr[vIdx * 2]     = uvAcrossA;
        uvArr[vIdx * 2 + 1] = vCoord;
        uvArr[(vIdx + 1) * 2]     = uvAcrossB;
        uvArr[(vIdx + 1) * 2 + 1] = vCoord;

        if (i < segments) {
            const a = vIdx, b = vIdx + 1, c = vIdx + 2, d = vIdx + 3;
            indices.push(a, c, b, b, c, d);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

// Populate Official F1 Pit-Wall 3-Sector Telemetry Radar Circuit Map in Bottom-Left Dock!
(function buildTrueGeometryMinimap() {
    const bgEl = document.getElementById('minimap-track-bg');
    const pathEl = document.getElementById('minimap-track-path');
    const actEl = document.getElementById('minimap-track-path-active');
    const s1El = document.getElementById('minimap-sector-s1');
    const s2El = document.getElementById('minimap-sector-s2');
    const s3El = document.getElementById('minimap-sector-s3');
    const drsArcEl = document.getElementById('minimap-drs-arc');
    const sfLineEl = document.getElementById('minimap-sf-line');
    const wpGroup = document.getElementById('minimap-waypoints');
    if (!pathEl || !bgEl || !actEl) return;

    const samples = 180;
    const pts = circuitCurve.getSpacedPoints(samples);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    pts.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
    });

    const viewW = 220, viewH = 140;
    const padX = 18, padY = 16;
    const boxW = viewW - padX * 2, boxH = viewH - padY * 2;
    const spanX = (maxX - minX) || 1, spanZ = (maxZ - minZ) || 1;
    const scale = Math.min(boxW / spanX, boxH / spanZ);
    const offX = (viewW - spanX * scale) * 0.5;
    const offY = (viewH - spanZ * scale) * 0.5;

    const mapPt = (p) => [
        (offX + (p.x - minX) * scale).toFixed(1),
        (offY + (p.z - minZ) * scale).toFixed(1)
    ];

    let dStr = '';
    for (let i = 0; i < samples; i++) {
        const [sx, sy] = mapPt(pts[i]);
        dStr += (i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`);
    }
    dStr += ' Z';
    bgEl.setAttribute('d', dStr);
    pathEl.setAttribute('d', dStr);
    actEl.setAttribute('d', dStr);

    // Helper to build sub-arc SVG path along [uStart, uEnd] with optional outward normal offset
    function buildSubArcPath(uStart, uEnd, steps, normalOffsetWorld = 0) {
        let subD = '';
        for (let k = 0; k <= steps; k++) {
            const u = uStart + (uEnd - uStart) * (k / steps);
            const fr = sampleCircuitFrame(u);
            const wx = fr.pos.x + fr.right.x * normalOffsetWorld;
            const wz = fr.pos.z + fr.right.z * normalOffsetWorld;
            const [sx, sy] = mapPt({ x: wx, z: wz });
            subD += (k === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`);
        }
        return subD;
    }

    if (s1El) s1El.setAttribute('d', buildSubArcPath(0.00, 0.33, 52, 0));
    if (s2El) s2El.setAttribute('d', buildSubArcPath(0.33, 0.68, 56, 0));
    if (s3El) s3El.setAttribute('d', buildSubArcPath(0.68, 1.00, 52, 0));
    if (drsArcEl) drsArcEl.setAttribute('d', buildSubArcPath(0.43, 0.70, 44, 6.2));

    // Perpendicular Checkered Start/Finish Line tick at u = 0.026
    if (sfLineEl) {
        const sf = sampleCircuitFrame(0.026);
        const [x1, y1] = mapPt({ x: sf.pos.x - sf.right.x * 5.8, z: sf.pos.z - sf.right.z * 5.8 });
        const [x2, y2] = mapPt({ x: sf.pos.x + sf.right.x * 5.8, z: sf.pos.z + sf.right.z * 5.8 });
        sfLineEl.setAttribute('x1', x1);
        sfLineEl.setAttribute('y1', y1);
        sfLineEl.setAttribute('x2', x2);
        sfLineEl.setAttribute('y2', y2);
    }

    // 6 Interactive Clickable Chapter / Turn Telemetry Nodes right on the GPS Circuit Map!
    if (wpGroup) {
        const wpSpecs = [
            { u: 0.00, target: 'grid',     color: '#ff1801' },
            { u: 0.19, target: 'stint',    color: '#ff6b00' },
            { u: 0.37, target: 'pit',      color: '#ffb700' },
            { u: 0.54, target: 'drs',      color: '#00d2ff' },
            { u: 0.76, target: 'trophies', color: '#a855f7' },
            { u: 0.93, target: 'podium',   color: '#ffc400' }
        ];
        wpSpecs.forEach((wp, idx) => {
            const p = circuitCurve.getPointAt(wp.u);
            const [wx, wy] = mapPt(p);
            const gNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            gNode.setAttribute('class', 'minimap-node');

            const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            hit.setAttribute('cx', wx);
            hit.setAttribute('cy', wy);
            hit.setAttribute('r', '7.5');
            hit.setAttribute('fill', 'transparent');

            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', wx);
            dot.setAttribute('cy', wy);
            dot.setAttribute('r', idx === 0 ? '3.4' : '2.5');
            dot.setAttribute('fill', '#050811');
            dot.setAttribute('stroke', wp.color);
            dot.setAttribute('stroke-width', idx === 0 ? '2.1' : '1.6');

            gNode.appendChild(hit);
            gNode.appendChild(dot);
            gNode.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!isCinematicIntroActive) {
                    triggerBroadcastChapterCamFade(wp.color, 0.62);
                    smoothScrollToTarget(wp.target);
                }
            });
            wpGroup.appendChild(gNode);
        });
    }
})();

// ==========================================================
//  2K PHOTOREALISTIC DARK NIGHT-RACE PBR TEXTURES
// ==========================================================
function createGrandPrixTextures() {
    // 1. Rich Jet-Charcoal Basalt Racing Asphalt + Glossy Rubbered Racing Groove + Tyre Skid Streaks
    const aspCanvas = document.createElement('canvas');
    aspCanvas.width = 2048;
    aspCanvas.height = 2048;
    const actx = aspCanvas.getContext('2d');
    actx.fillStyle = '#090b0f';
    actx.fillRect(0, 0, 2048, 2048);

    const imgData = actx.getImageData(0, 0, 2048, 2048);
    const d = imgData.data;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = 1024;
    roughCanvas.height = 1024;
    const rghCtx = roughCanvas.getContext('2d');
    const rghData = rghCtx.createImageData(1024, 1024);
    const rd = rghData.data;

    const grooveMaskLut = new Float32Array(2048);
    for (let x = 0; x < 2048; x++) {
        const grooveDist = Math.abs((x / 2048) - 0.50);
        grooveMaskLut[x] = Math.exp(-(grooveDist * grooveDist) / 0.032);
    }

    let seed = 7331;
    for (let y = 0; y < 2048; y++) {
        const yOff = y * 2048;
        for (let x = 0; x < 2048; x++) {
            seed = (seed * 16807) % 2147483647;
            const n1 = ((seed & 255) / 255) - 0.5;
            seed = (seed * 16807) % 2147483647;
            const stoneSpark = (seed % 19 === 0) ? 14 : ((seed % 29 === 0) ? -4 : 0);

            const grooveMask = grooveMaskLut[x];

            // Authentic deep charcoal night basalt (7..22 RGB) — zero grey plastic washout!
            const base = 11.5 + n1 * 8.5 + stoneSpark - grooveMask * 4.2;
            const idx = (yOff + x) * 4;
            d[idx]     = Math.max(4, Math.min(44, base));
            d[idx + 1] = Math.max(4, Math.min(46, base + 0.6));
            d[idx + 2] = Math.max(6, Math.min(52, base + 1.8));
            d[idx + 3] = 255;

            if ((x & 1) === 0 && (y & 1) === 0) {
                const rx = x >> 1, ry = y >> 1;
                const rIdx = (ry * 1024 + rx) * 4;
                const dampPatch = 0.5 + 0.5 * Math.sin(rx * 0.022 + Math.cos(ry * 0.017) * 2.4) * Math.cos(ry * 0.014);
                const roughVal = Math.max(52, Math.min(235,
                    208 - grooveMask * 126 - dampPatch * 32 + n1 * 22
                ));
                rd[rIdx] = rd[rIdx + 1] = rd[rIdx + 2] = roughVal;
                rd[rIdx + 3] = 255;
            }
        }
    }
    actx.putImageData(imgData, 0, 0);
    rghCtx.putImageData(rghData, 0, 0);

    // Paving seams & realistic black Pirelli rubber tyre-lockup streaks
    actx.fillStyle = 'rgba(2, 3, 5, 0.55)';
    actx.fillRect(682, 0, 4, 2048);
    actx.fillRect(1366, 0, 4, 2048);
    for (let s = 0; s < 52; s++) {
        const sx = 680 + Math.sin(s * 2.17) * 380;
        const sy = (s * 173) % 1800;
        const sh = 180 + (s % 5) * 90;
        actx.fillStyle = 'rgba(2, 2, 4, 0.36)';
        actx.fillRect(sx, sy, 7 + (s % 10), sh);
    }

    // Crisp weathered FIA white track-limit lines
    actx.fillStyle = '#d4dce8';
    actx.fillRect(68, 0, 28, 2048);
    actx.fillRect(1952, 0, 28, 2048);
    rghCtx.fillStyle = '#8a8a8a';
    rghCtx.fillRect(34, 0, 14, 1024);
    rghCtx.fillRect(976, 0, 14, 1024);

    const asphaltTex = new THREE.CanvasTexture(aspCanvas);
    asphaltTex.wrapS = THREE.ClampToEdgeWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.anisotropy = maxAniso;
    if ('encoding' in asphaltTex) asphaltTex.encoding = THREE.sRGBEncoding;

    const asphaltRoughness = new THREE.CanvasTexture(roughCanvas);
    asphaltRoughness.wrapS = THREE.ClampToEdgeWrapping;
    asphaltRoughness.wrapT = THREE.RepeatWrapping;
    asphaltRoughness.anisotropy = maxAniso;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 512;
    bumpCanvas.height = 512;
    const bctx = bumpCanvas.getContext('2d');
    const bData = bctx.createImageData(512, 512);
    for (let i = 0; i < bData.data.length; i += 4) {
        seed = (seed * 16807) % 2147483647;
        const v = 90 + (seed & 105);
        bData.data[i] = bData.data[i + 1] = bData.data[i + 2] = v;
        bData.data[i + 3] = 255;
    }
    bctx.putImageData(bData, 0, 0);
    const asphaltBump = new THREE.CanvasTexture(bumpCanvas);
    asphaltBump.wrapS = THREE.RepeatWrapping;
    asphaltBump.wrapT = THREE.RepeatWrapping;
    asphaltBump.repeat.set(6, 1);

    // 2. Serrated FIA Red/White Rumble Kerb + Rubber Tyre Scuffs + AstroTurf Verge
    const kerbCanvas = document.createElement('canvas');
    kerbCanvas.width = 256;
    kerbCanvas.height = 512;
    const kctx = kerbCanvas.getContext('2d');
    const numBlocks = 8;
    const bh = 512 / numBlocks;
    for (let b = 0; b < numBlocks; b++) {
        const isRed = b % 2 === 0;
        kctx.fillStyle = isRed ? '#c81408' : '#e2e7f0';
        kctx.fillRect(0, b * bh, 194, bh);
        kctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
        kctx.fillRect(0, b * bh, 194, 6);
        kctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        kctx.fillRect(0, b * bh + 6, 194, 3);
    }
    kctx.fillStyle = '#062615';
    kctx.fillRect(194, 0, 62, 512);
    kctx.fillStyle = '#021209';
    kctx.fillRect(191, 0, 5, 512);
    const scuffGrad = kctx.createLinearGradient(0, 0, 110, 0);
    scuffGrad.addColorStop(0, 'rgba(6, 7, 10, 0.55)');
    scuffGrad.addColorStop(1, 'rgba(6, 7, 10, 0.0)');
    kctx.fillStyle = scuffGrad;
    kctx.fillRect(0, 0, 110, 512);
    const kerbTex = new THREE.CanvasTexture(kerbCanvas);
    kerbTex.wrapS = THREE.ClampToEdgeWrapping;
    kerbTex.wrapT = THREE.RepeatWrapping;
    kerbTex.anisotropy = maxAniso;
    if ('encoding' in kerbTex) kerbTex.encoding = THREE.sRGBEncoding;

    // 3. Dark Nocturnal FIA Painted Runoff Apron
    const runCanvas = document.createElement('canvas');
    runCanvas.width = 512;
    runCanvas.height = 512;
    const rctx = runCanvas.getContext('2d');
    rctx.fillStyle = '#05070b';
    rctx.fillRect(0, 0, 512, 512);
    rctx.fillStyle = '#071430';
    rctx.fillRect(36, 0, 124, 512);
    rctx.fillStyle = '#0b2250';
    rctx.fillRect(168, 0, 24, 512);
    rctx.fillStyle = '#750b04';
    rctx.fillRect(200, 0, 14, 512);
    for (let y = 0; y < 512; y += 4) {
        rctx.fillStyle = (y % 8 === 0) ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.22)';
        rctx.fillRect(0, y, 512, 2);
    }
    const runoffTex = new THREE.CanvasTexture(runCanvas);
    runoffTex.wrapS = THREE.ClampToEdgeWrapping;
    runoffTex.wrapT = THREE.RepeatWrapping;
    runoffTex.anisotropy = maxAniso;
    if ('encoding' in runoffTex) runoffTex.encoding = THREE.sRGBEncoding;

    // 4. FIA High-Tensile Debris Catch-Fence Alpha Texture
    const fenceCanvas = document.createElement('canvas');
    fenceCanvas.width = 256;
    fenceCanvas.height = 256;
    const fctx = fenceCanvas.getContext('2d');
    fctx.clearRect(0, 0, 256, 256);
    fctx.strokeStyle = 'rgba(155, 172, 198, 0.22)';
    fctx.lineWidth = 1.1;
    for (let k = -256; k < 512; k += 16) {
        fctx.beginPath(); fctx.moveTo(k, 0); fctx.lineTo(k + 256, 256); fctx.stroke();
        fctx.beginPath(); fctx.moveTo(k + 256, 0); fctx.lineTo(k, 256); fctx.stroke();
    }
    fctx.fillStyle = 'rgba(195, 210, 232, 0.52)';
    [8, 56, 108, 160, 212, 248].forEach((cy) => fctx.fillRect(0, cy, 256, 2.4));
    const fenceTex = new THREE.CanvasTexture(fenceCanvas);
    fenceTex.wrapS = THREE.RepeatWrapping;
    fenceTex.wrapT = THREE.ClampToEdgeWrapping;
    fenceTex.anisotropy = maxAniso;

    // 5. Galvanized Armco + Backlit Night-Race Sponsor & Bilal Telemetry Lightboxes (Forward-Reading!)
    const barCanvas = document.createElement('canvas');
    barCanvas.width = 2048;
    barCanvas.height = 128;
    const brctx = barCanvas.getContext('2d');

    const barEmCanvas = document.createElement('canvas');
    barEmCanvas.width = 2048;
    barEmCanvas.height = 128;
    const bemctx = barEmCanvas.getContext('2d');
    bemctx.fillStyle = '#000000';
    bemctx.fillRect(0, 0, 2048, 128);

    const armcoGrad = brctx.createLinearGradient(0, 0, 0, 128);
    armcoGrad.addColorStop(0.0, '#3a4150');
    armcoGrad.addColorStop(0.25, '#12151c');
    armcoGrad.addColorStop(0.50, '#464f61');
    armcoGrad.addColorStop(0.75, '#10131a');
    armcoGrad.addColorStop(1.0, '#303644');
    brctx.fillStyle = armcoGrad;
    brctx.fillRect(0, 0, 2048, 128);

    // Panel A: ORACLE RED BULL RACING
    brctx.fillStyle = '#05112e';
    brctx.fillRect(24, 16, 640, 96);
    brctx.fillStyle = '#ff1801';
    brctx.fillRect(24, 16, 640, 9);
    brctx.fillStyle = '#ffc400';
    brctx.fillRect(664, 16, 16, 96);
    brctx.font = '900 38px Arial, sans-serif';
    brctx.fillStyle = '#ffffff';
    brctx.textAlign = 'center';
    brctx.textBaseline = 'middle';
    brctx.fillText('ORACLE  RED BULL  RACING', 344, 68);

    bemctx.fillStyle = '#040e28';
    bemctx.fillRect(24, 16, 640, 96);
    bemctx.fillStyle = '#ff1801';
    bemctx.fillRect(24, 16, 640, 9);
    bemctx.font = '900 38px Arial, sans-serif';
    bemctx.fillStyle = '#d8e6ff';
    bemctx.textAlign = 'center';
    bemctx.textBaseline = 'middle';
    bemctx.fillText('ORACLE  RED BULL  RACING', 344, 68);

    // Panel B: PIRELLI P ZERO
    brctx.fillStyle = '#141103';
    brctx.fillRect(740, 16, 520, 96);
    brctx.fillStyle = '#ffd000';
    brctx.fillRect(740, 16, 520, 10);
    brctx.font = '900 40px Arial, sans-serif';
    brctx.fillText('PIRELLI   P ZERO', 1000, 68);

    bemctx.fillStyle = '#181300';
    bemctx.fillRect(740, 16, 520, 96);
    bemctx.fillStyle = '#ffcf00';
    bemctx.fillRect(740, 16, 520, 10);
    bemctx.font = '900 40px Arial, sans-serif';
    bemctx.fillText('PIRELLI   P ZERO', 1000, 68);

    // Panel C: BILAL #01 // FULL-STACK & AI
    brctx.fillStyle = '#120508';
    brctx.fillRect(1340, 16, 660, 96);
    brctx.fillStyle = '#00d2ff';
    brctx.fillRect(1340, 16, 660, 9);
    brctx.fillStyle = '#ffffff';
    brctx.font = '900 36px Arial, sans-serif';
    brctx.fillText('BILAL #01  //  FULL-STACK & AI', 1670, 68);

    bemctx.fillStyle = '#100407';
    bemctx.fillRect(1340, 16, 660, 96);
    bemctx.fillStyle = '#00d2ff';
    bemctx.fillRect(1340, 16, 660, 9);
    bemctx.fillStyle = '#e4f6ff';
    bemctx.font = '900 36px Arial, sans-serif';
    bemctx.fillText('BILAL #01  //  FULL-STACK & AI', 1670, 68);

    const barrierTex = new THREE.CanvasTexture(barCanvas);
    barrierTex.wrapS = THREE.RepeatWrapping;
    barrierTex.wrapT = THREE.ClampToEdgeWrapping;
    barrierTex.anisotropy = maxAniso;
    if ('encoding' in barrierTex) barrierTex.encoding = THREE.sRGBEncoding;

    const barrierEmissiveTex = new THREE.CanvasTexture(barEmCanvas);
    barrierEmissiveTex.wrapS = THREE.RepeatWrapping;
    barrierEmissiveTex.wrapT = THREE.ClampToEdgeWrapping;
    barrierEmissiveTex.anisotropy = maxAniso;
    if ('encoding' in barrierEmissiveTex) barrierEmissiveTex.encoding = THREE.sRGBEncoding;

    // 6. Optical Stadium Floodlight Glare + Broadcast Anamorphic Lens Streak
    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = 256;
    flareCanvas.height = 256;
    const flctx = flareCanvas.getContext('2d');
    const radG = flctx.createRadialGradient(128, 128, 0, 128, 128, 124);
    radG.addColorStop(0.00, 'rgba(255, 255, 255, 1.0)');
    radG.addColorStop(0.08, 'rgba(255, 248, 232, 0.92)');
    radG.addColorStop(0.22, 'rgba(210, 230, 255, 0.40)');
    radG.addColorStop(0.52, 'rgba(130, 175, 255, 0.10)');
    radG.addColorStop(1.00, 'rgba(0, 0, 0, 0.0)');
    flctx.fillStyle = radG;
    flctx.fillRect(0, 0, 256, 256);

    flctx.save();
    flctx.translate(128, 128);
    flctx.scale(1.0, 0.052);
    const anamG = flctx.createRadialGradient(0, 0, 0, 0, 0, 126);
    anamG.addColorStop(0.0, 'rgba(255, 255, 255, 0.92)');
    anamG.addColorStop(0.35, 'rgba(180, 220, 255, 0.46)');
    anamG.addColorStop(1.0, 'rgba(80, 150, 255, 0.0)');
    flctx.fillStyle = anamG;
    flctx.beginPath();
    flctx.arc(0, 0, 126, 0, Math.PI * 2);
    flctx.fill();
    flctx.restore();
    const flareTex = new THREE.CanvasTexture(flareCanvas);

    // 7. Red Optical LED Halo Texture
    const redFlCanvas = document.createElement('canvas');
    redFlCanvas.width = 128;
    redFlCanvas.height = 128;
    const rfctx = redFlCanvas.getContext('2d');
    const rfg = rfctx.createRadialGradient(64, 64, 0, 64, 64, 62);
    rfg.addColorStop(0.00, 'rgba(255, 235, 225, 1.0)');
    rfg.addColorStop(0.16, 'rgba(255, 42, 8, 0.90)');
    rfg.addColorStop(0.46, 'rgba(255, 16, 0, 0.28)');
    rfg.addColorStop(1.00, 'rgba(0, 0, 0, 0.0)');
    rfctx.fillStyle = rfg;
    rfctx.fillRect(0, 0, 128, 128);
    const redFlareTex = new THREE.CanvasTexture(redFlCanvas);

    // 8. Soft Edge-Free Volumetric Mist Light-Shaft Texture
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 128;
    beamCanvas.height = 256;
    const bmctx = beamCanvas.getContext('2d');
    const bmImg = bmctx.createImageData(128, 256);
    for (let y = 0; y < 256; y++) {
        const v = y / 255;
        const vertFade = Math.pow(1.0 - v, 1.95) * Math.min(1.0, v * 9.0);
        for (let x = 0; x < 128; x++) {
            const u = (x / 127) * 2.0 - 1.0;
            const halfW = 0.35 + v * 0.62;
            const normU = Math.min(1.0, Math.abs(u) / halfW);
            const horizFade = Math.pow(Math.cos(normU * Math.PI * 0.5), 2.3);
            const alpha = Math.round(255 * vertFade * horizFade * 0.42);
            const idx = (y * 128 + x) * 4;
            bmImg.data[idx] = 226;
            bmImg.data[idx + 1] = 238;
            bmImg.data[idx + 2] = 255;
            bmImg.data[idx + 3] = alpha;
        }
    }
    bmctx.putImageData(bmImg, 0, 0);
    const beamAlphaTex = new THREE.CanvasTexture(beamCanvas);

    // 9. Subtle Ground Floodlight Specular Pool Decal Texture
    const poolCanvas = document.createElement('canvas');
    poolCanvas.width = 256;
    poolCanvas.height = 256;
    const pctx = poolCanvas.getContext('2d');
    const pg = pctx.createRadialGradient(128, 128, 0, 128, 128, 126);
    pg.addColorStop(0.0, 'rgba(255, 244, 224, 0.11)');
    pg.addColorStop(0.45, 'rgba(195, 220, 255, 0.04)');
    pg.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    pctx.fillStyle = pg;
    pctx.fillRect(0, 0, 256, 256);
    const poolTex = new THREE.CanvasTexture(poolCanvas);

    // 10. Under-Car Ground-Effect Ambient Occlusion Contact Shadow Decal
    const aoCanvas = document.createElement('canvas');
    aoCanvas.width = 256;
    aoCanvas.height = 512;
    const aoctx = aoCanvas.getContext('2d');
    aoctx.save();
    aoctx.translate(128, 258);
    aoctx.scale(0.68, 1.72);
    const aog = aoctx.createRadialGradient(0, 0, 8, 0, 0, 132);
    aog.addColorStop(0.0, 'rgba(0, 0, 0, 0.96)');
    aog.addColorStop(0.58, 'rgba(0, 0, 0, 0.80)');
    aog.addColorStop(0.84, 'rgba(0, 0, 0, 0.34)');
    aog.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    aoctx.fillStyle = aog;
    aoctx.beginPath();
    aoctx.arc(0, 0, 132, 0, Math.PI * 2);
    aoctx.fill();
    aoctx.restore();
    [[48, 118], [208, 118], [46, 396], [210, 396]].forEach(([tx, ty]) => {
        const tg = aoctx.createRadialGradient(tx, ty, 2, tx, ty, 38);
        tg.addColorStop(0.0, 'rgba(0, 0, 0, 0.96)');
        tg.addColorStop(0.55, 'rgba(0, 0, 0, 0.58)');
        tg.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
        aoctx.fillStyle = tg;
        aoctx.fillRect(tx - 40, ty - 40, 80, 80);
    });
    const contactShadowTex = new THREE.CanvasTexture(aoCanvas);

    // 11. Night Metropolis Skyscraper Glass Curtain-Wall Atlas
    const bldgCanvas = document.createElement('canvas');
    bldgCanvas.width = 512;
    bldgCanvas.height = 1024;
    const bgctx = bldgCanvas.getContext('2d');
    bgctx.fillStyle = '#020408';
    bgctx.fillRect(0, 0, 512, 1024);
    let bSeed = 4242;
    const cols = 16, floors = 64;
    const cw = 512 / cols, fh = 1024 / floors;
    for (let fl = 0; fl < floors; fl++) {
        bSeed = (bSeed * 16807) % 2147483647;
        const floorDensity = ((bSeed & 255) / 255) * 0.52;
        bgctx.fillStyle = '#010205';
        bgctx.fillRect(0, fl * fh, 512, 3);
        for (let cl = 0; cl < cols; cl++) {
            bSeed = (bSeed * 16807) % 2147483647;
            const r = (bSeed & 255) / 255;
            if (r < floorDensity) {
                bSeed = (bSeed * 16807) % 2147483647;
                const tint = bSeed % 5;
                if (tint === 0) bgctx.fillStyle = 'rgba(255, 222, 165, 0.82)';
                else if (tint === 1) bgctx.fillStyle = 'rgba(205, 228, 255, 0.78)';
                else if (tint === 2) bgctx.fillStyle = 'rgba(255, 238, 200, 0.58)';
                else if (tint === 3) bgctx.fillStyle = 'rgba(130, 180, 245, 0.48)';
                else bgctx.fillStyle = 'rgba(255, 192, 118, 0.42)';
                bgctx.fillRect(cl * cw + 3, fl * fh + 4, cw - 6, fh - 6);
            } else {
                bgctx.fillStyle = 'rgba(8, 14, 28, 0.5)';
                bgctx.fillRect(cl * cw + 3, fl * fh + 4, cw - 6, fh - 6);
            }
        }
    }
    const skyscraperTex = new THREE.CanvasTexture(bldgCanvas);
    skyscraperTex.wrapS = THREE.RepeatWrapping;
    skyscraperTex.wrapT = THREE.RepeatWrapping;
    skyscraperTex.anisotropy = maxAniso;
    if ('encoding' in skyscraperTex) skyscraperTex.encoding = THREE.sRGBEncoding;

    return {
        asphaltTex, asphaltRoughness, asphaltBump,
        kerbTex, runoffTex, fenceTex,
        barrierTex, barrierEmissiveTex,
        flareTex, redFlareTex, beamAlphaTex, poolTex,
        contactShadowTex, skyscraperTex
    };
}

function makeTextBannerTexture(bgHex, accentHex, mainText, subText) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 192;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 1024, 192);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 1024, 12);
    ctx.fillRect(0, 180, 1024, 12);
    ctx.fillRect(22, 32, 10, 128);
    ctx.fillRect(992, 32, 10, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mainText, 512, 80);
    ctx.fillStyle = accentHex;
    ctx.font = '700 23px Arial, sans-serif';
    ctx.fillText(subText, 512, 140);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = maxAniso;
    if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
    return tex;
}

function makeBrakingBoardTexture(metersText) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 160;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#060c16';
    ctx.fillRect(0, 0, 256, 160);
    ctx.strokeStyle = '#eef3fc';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 240, 144);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 84px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(metersText, 128, 84);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = maxAniso;
    if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding;
    return tex;
}

// ==========================================================
//  BUILD THE COMPLETE PHOTOREALISTIC NIGHT GRAND PRIX WORLD
// ==========================================================
const gpTextures = createGrandPrixTextures();
const drsAccentMeshes = [];
const digiFlagMaterials = [];
const gantryStartLightBulbs = [];
const gantryStartLightSprites = [];

// 1. Solid Opaque Pitch-Dark Outer Night Paddock & City Ground (zero PBR background shader overhead!)
const paddockGround = new THREE.Mesh(
    new THREE.PlaneGeometry(950, 950),
    new THREE.MeshBasicMaterial({
        color: 0x030409
    })
);
paddockGround.rotation.x = -Math.PI / 2;
paddockGround.position.y = -0.015;
scene.add(paddockGround);

// 2. Solid Opaque Photorealistic Dark Basalt Racing Asphalt Ribbon (11.6m wide)
const TRACK_HALF_W = 5.8;
const RIBBON_SEGS = 480;
const asphaltMat = new THREE.MeshStandardMaterial({
    map: gpTextures.asphaltTex,
    roughnessMap: gpTextures.asphaltRoughness,
    bumpMap: IS_INTEGRATED_GPU ? null : gpTextures.asphaltBump,
    bumpScale: 0.018,
    roughness: 0.85,
    metalness: 0.08,
    envMapIntensity: 0.75
});
const asphaltRibbon = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, -TRACK_HALF_W, TRACK_HALF_W, 0.004, 0.004, 34, 0, 1),
    asphaltMat
);
scene.add(asphaltRibbon);

// 3. Left & Right FIA Serrated Red/White Rumble Kerbs
const kerbMat = new THREE.MeshStandardMaterial({
    map: gpTextures.kerbTex,
    bumpMap: IS_INTEGRATED_GPU ? null : gpTextures.asphaltBump,
    bumpScale: 0.014,
    roughness: 0.45,
    metalness: 0.05
});
const kerbRight = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, TRACK_HALF_W - 0.08, TRACK_HALF_W + 0.95, 0.007, 0.04, 96, 0, 1),
    kerbMat
);
const kerbLeft = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, -(TRACK_HALF_W + 0.95), -(TRACK_HALF_W - 0.08), 0.04, 0.007, 96, 1, 0),
    kerbMat
);
scene.add(kerbRight, kerbLeft);

// 4. Solid Painted FIA Runoff Aprons
const runoffMat = new THREE.MeshStandardMaterial({
    map: gpTextures.runoffTex,
    roughnessMap: gpTextures.asphaltRoughness,
    roughness: 0.78,
    metalness: 0.06,
    envMapIntensity: 0.55
});
const runoffRight = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, TRACK_HALF_W + 0.95, TRACK_HALF_W + 4.7, 0.002, 0.002, 48, 0, 1),
    runoffMat
);
const runoffLeft = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, -(TRACK_HALF_W + 4.7), -(TRACK_HALF_W + 0.95), 0.002, 0.002, 48, 0, 1),
    runoffMat
);
scene.add(runoffRight, runoffLeft);

// 5. Continuous Armco + Forward-Reading Backlit Sponsor Barriers & FIA Debris Catch-Fencing
function buildVerticalWallRibbon(segments, lateralOffset, yBottom, yTop, uvRepeatAlong, flipU) {
    const pts = circuitCurve.getSpacedPoints(segments);
    const posArr = new Float32Array((segments + 1) * 2 * 3);
    const uvArr = new Float32Array((segments + 1) * 2 * 2);
    const indices = [];
    for (let i = 0; i <= segments; i++) {
        const p = pts[i % segments];
        const pNext = pts[(i + 1) % segments];
        const pPrev = pts[(i - 1 + segments) % segments];
        const tang = new THREE.Vector3().subVectors(pNext, pPrev).normalize();
        const right = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
        const wx = p.x + right.x * lateralOffset;
        const wz = p.z + right.z * lateralOffset;
        const vIdx = i * 2;
        posArr[vIdx * 3] = wx;       posArr[vIdx * 3 + 1] = yBottom; posArr[vIdx * 3 + 2] = wz;
        posArr[(vIdx + 1) * 3] = wx; posArr[(vIdx + 1) * 3 + 1] = yTop;    posArr[(vIdx + 1) * 3 + 2] = wz;
        const rawU = (i / segments) * uvRepeatAlong;
        const uCoord = flipU ? (uvRepeatAlong - rawU) : rawU;
        uvArr[vIdx * 2] = uCoord;       uvArr[vIdx * 2 + 1] = 0;
        uvArr[(vIdx + 1) * 2] = uCoord; uvArr[(vIdx + 1) * 2 + 1] = 1;
        if (i < segments) {
            const a = vIdx, b = vIdx + 1, c = vIdx + 2, d = vIdx + 3;
            indices.push(a, c, b, b, c, d);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

const barrierMat = new THREE.MeshStandardMaterial({
    map: gpTextures.barrierTex,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: gpTextures.barrierEmissiveTex,
    emissiveIntensity: 0.36,
    roughness: 0.38,
    metalness: 0.58,
    side: THREE.DoubleSide
});
const BARRIER_OFF = TRACK_HALF_W + 4.55;
// flipU = true on outerBarrier (+BARRIER_OFF) so BOTH walls read 100% left-to-right forward from the track!
const outerBarrier = new THREE.Mesh(buildVerticalWallRibbon(320,  BARRIER_OFF, 0, 1.08, 22, true), barrierMat);
const innerBarrier = new THREE.Mesh(buildVerticalWallRibbon(320, -BARRIER_OFF, 0, 1.08, 22, false), barrierMat);
scene.add(outerBarrier, innerBarrier);

const fenceMat = new THREE.MeshBasicMaterial({
    map: gpTextures.fenceTex,
    transparent: true,
    opacity: 0.50,
    side: THREE.DoubleSide,
    depthWrite: false
});
scene.add(new THREE.Mesh(buildVerticalWallRibbon(240,  BARRIER_OFF + 0.08, 1.08, 4.45, 80, false), fenceMat));
scene.add(new THREE.Mesh(buildVerticalWallRibbon(240, -(BARRIER_OFF + 0.08), 1.08, 4.45, 80, false), fenceMat));

// Steel catch-fence stanchions
(function buildCatchFencePoles() {
    const poleCountPerSide = 88;
    const poleGeo = new THREE.BoxGeometry(0.10, 4.50, 0.10);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x202634, roughness: 0.44, metalness: 0.85 });
    const inst = new THREE.InstancedMesh(poleGeo, poleMat, poleCountPerSide * 2);
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let i = 0; i < poleCountPerSide; i++) {
        const f = sampleCircuitFrame(i / poleCountPerSide);
        const yaw = Math.atan2(-f.tang.x, -f.tang.z);
        [BARRIER_OFF + 0.12, -(BARRIER_OFF + 0.12)].forEach((off) => {
            dummy.position.set(f.pos.x + f.right.x * off, 2.25, f.pos.z + f.right.z * off);
            dummy.rotation.set(0, yaw, 0);
            dummy.updateMatrix();
            inst.setMatrixAt(idx++, dummy.matrix);
        });
    }
    scene.add(inst);
})();

// 6. Checkered Start/Finish Line & Staggered FIA P1-P10 Starting Grid Boxes
(function buildStartingGridAndFinishLine() {
    const chkCanvas = document.createElement('canvas');
    chkCanvas.width = 512;
    chkCanvas.height = 64;
    const cctx = chkCanvas.getContext('2d');
    const cols = 24, rows = 3;
    const cw = 512 / cols, ch = 64 / rows;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cctx.fillStyle = ((r + c) % 2 === 0) ? '#e8edf5' : '#080a0f';
            cctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5);
        }
    }
    const chkTex = new THREE.CanvasTexture(chkCanvas);
    chkTex.anisotropy = maxAniso;
    if ('encoding' in chkTex) chkTex.encoding = THREE.sRGBEncoding;

    const sfFrame = sampleCircuitFrame(0.026);
    const sfMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(TRACK_HALF_W * 1.88, 1.45),
        new THREE.MeshStandardMaterial({
            map: chkTex,
            roughness: 0.38,
            polygonOffset: true,
            polygonOffsetFactor: -2
        })
    );
    sfMesh.rotation.order = 'YXZ';
    sfMesh.rotation.y = Math.atan2(-sfFrame.tang.x, -sfFrame.tang.z);
    sfMesh.rotation.x = -Math.PI / 2;
    sfMesh.position.set(sfFrame.pos.x, 0.008, sfFrame.pos.z);
    scene.add(sfMesh);

    const gbCanvas = document.createElement('canvas');
    gbCanvas.width = 256;
    gbCanvas.height = 512;
    const gctx = gbCanvas.getContext('2d');
    gctx.fillStyle = '#e8b000';
    gctx.fillRect(6, 118, 244, 15);
    gctx.fillStyle = '#dce3ef';
    gctx.fillRect(20, 44, 216, 13);
    gctx.fillRect(20, 44, 13, 185);
    gctx.fillRect(223, 44, 13, 185);
    const gbTex = new THREE.CanvasTexture(gbCanvas);
    gbTex.anisotropy = maxAniso;
    if ('encoding' in gbTex) gbTex.encoding = THREE.sRGBEncoding;
    const gbMat = new THREE.MeshBasicMaterial({
        map: gbTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false
    });

    const boxPlaneGeo = new THREE.PlaneGeometry(2.55, 5.4);
    const boxDummy = new THREE.Object3D();
    boxDummy.rotation.order = 'YXZ';
    const gridBatch = [];
    for (let slot = 0; slot < 10; slot++) {
        const uSlot = (1.0 - slot * 0.0135) % 1;
        const lat = (slot === 0) ? 0.0 : ((slot % 2 === 1) ? 2.35 : -2.35);
        const fr = sampleCircuitFrame(uSlot);
        boxDummy.rotation.set(-Math.PI / 2, Math.atan2(-fr.tang.x, -fr.tang.z), 0);
        boxDummy.position.set(
            fr.pos.x + fr.right.x * lat + fr.tang.x * 0.2,
            0.009,
            fr.pos.z + fr.right.z * lat + fr.tang.z * 0.2
        );
        boxDummy.updateMatrix();
        gridBatch.push({ geo: boxPlaneGeo, matrix: boxDummy.matrix.clone() });
    }
    const mergedGridGeo = mergeStaticGeometries(gridBatch, { normals: false, uvs: true });
    if (mergedGridGeo) scene.add(new THREE.Mesh(mergedGridGeo, gbMat));
})();

// 7. 4 Storytelling 3D Open-Lattice Steel Truss Gantries Around the 320m Grand Prix Lap
function buildTrackGantry(uPos, bannerMain, bannerSub, accentHex, withStartLights) {
    const fr = sampleCircuitFrame(uPos);
    const yaw = Math.atan2(-fr.tang.x, -fr.tang.z);
    const gGroup = new THREE.Group();
    gGroup.position.set(fr.pos.x, 0, fr.pos.z);
    gGroup.rotation.y = yaw;

    const spanHalf = BARRIER_OFF + 0.7;
    const height = 6.8;
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x141926 });
    const trussBatch = [];
    const trussDummy = new THREE.Object3D();
    const legGeo = new THREE.BoxGeometry(0.26, height + 0.9, 0.26);
    const braceGeo = new THREE.BoxGeometry(0.14, 0.14, 0.96);

    [-spanHalf, spanHalf].forEach((xSide) => {
        [-0.48, 0.48].forEach((zOff) => {
            trussDummy.position.set(xSide, (height + 0.9) / 2, zOff);
            trussDummy.updateMatrix();
            trussBatch.push({ geo: legGeo, matrix: trussDummy.matrix.clone() });
        });
        for (let h = 1.2; h < height + 0.5; h += 1.4) {
            trussDummy.position.set(xSide, h, 0);
            trussDummy.updateMatrix();
            trussBatch.push({ geo: braceGeo, matrix: trussDummy.matrix.clone() });
        }
    });

    const chordGeo = new THREE.BoxGeometry(spanHalf * 2 + 0.6, 0.20, 0.20);
    [[height + 0.72, -0.48], [height + 0.72, 0.48], [height - 0.72, -0.48], [height - 0.72, 0.48]].forEach(([cy, cz]) => {
        trussDummy.position.set(0, cy, cz);
        trussDummy.updateMatrix();
        trussBatch.push({ geo: chordGeo, matrix: trussDummy.matrix.clone() });
    });
    const ribGeo = new THREE.BoxGeometry(0.14, 1.44, 0.98);
    for (let sx = -spanHalf + 1.0; sx <= spanHalf - 1.0; sx += 2.2) {
        trussDummy.position.set(sx, height, 0);
        trussDummy.updateMatrix();
        trussBatch.push({ geo: ribGeo, matrix: trussDummy.matrix.clone() });
    }
    const mergedTrussGeo = mergeStaticGeometries(trussBatch, { normals: true, uvs: false });
    if (mergedTrussGeo) gGroup.add(new THREE.Mesh(mergedTrussGeo, steelMat));

    const bannerTex = makeTextBannerTexture('#040814', accentHex, bannerMain, bannerSub);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    const boardFront = new THREE.Mesh(new THREE.PlaneGeometry(spanHalf * 1.56, 1.32), bannerMat);
    boardFront.position.set(0, height, 0.60);
    const boardBack = new THREE.Mesh(new THREE.PlaneGeometry(spanHalf * 1.56, 1.32), bannerMat);
    boardBack.position.set(0, height, -0.60);
    boardBack.rotation.y = Math.PI;
    gGroup.add(boardFront, boardBack);

    const stripColor = withStartLights ? 0xff1801 : parseInt(accentHex.replace('#', '0x'), 16);
    const ledStripMat = new THREE.MeshBasicMaterial({ color: stripColor });
    const underStrip = new THREE.Mesh(new THREE.BoxGeometry(spanHalf * 1.65, 0.07, 0.14), ledStripMat);
    underStrip.position.set(0, height - 0.78, 0);
    gGroup.add(underStrip);
    if (accentHex === '#00d2ff') drsAccentMeshes.push(underStrip);

    [-4.2, 0, 4.2].forEach((lx) => {
        const flare = new THREE.Sprite(new THREE.SpriteMaterial({
            map: gpTextures.flareTex,
            color: 0xfff5e4,
            transparent: true,
            opacity: 0.60,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        flare.position.set(lx, height - 0.84, 0);
        flare.scale.set(2.3, 1.3, 1);
        gGroup.add(flare);
        floodLampWorldPositions.push(new THREE.Vector3(
            fr.pos.x + fr.right.x * lx,
            height - 0.85,
            fr.pos.z + fr.right.z * lx
        ));
    });

    if (withStartLights) {
        const podMat = new THREE.MeshStandardMaterial({ color: 0x07080c, roughness: 0.38, metalness: 0.75 });
        for (let c = -2; c <= 2; c++) {
            const pod = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.08, 0.30), podMat);
            pod.position.set(c * 0.76, height - 1.34, 0.28);
            gGroup.add(pod);
            [-0.24, 0.24].forEach((by) => {
                const bulbMat = new THREE.MeshBasicMaterial({ color: 0xff1a04 });
                gantryStartLightBulbs.push(bulbMat);
                const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.105, 16), bulbMat);
                bulb.position.set(c * 0.76, height - 1.34 + by, 0.44);
                gGroup.add(bulb);
                const bulbBack = new THREE.Mesh(new THREE.CircleGeometry(0.105, 16), bulbMat);
                bulbBack.position.set(c * 0.76, height - 1.34 + by, 0.12);
                bulbBack.rotation.y = Math.PI;
                gGroup.add(bulbBack);

                const redHalo = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: gpTextures.redFlareTex,
                    transparent: true,
                    opacity: 0.76,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }));
                redHalo.position.set(c * 0.76, height - 1.34 + by, 0.48);
                redHalo.scale.set(0.92, 0.92, 1);
                gGroup.add(redHalo);
                gantryStartLightSprites.push(redHalo);
            });
        }
    }

    scene.add(gGroup);
}

buildTrackGantry(0.026, 'MOHAMMED BILAL A  //  #01', '// ORACLE RED BULL RACING · FIA NIGHT GRAND PRIX', '#ff1801', true);
buildTrackGantry(0.215, 'SECTOR 1  //  SASHA INFINITY', '// WORKS WEB DEV STINT & SONA MCA ACADEMY', '#ff6b00', false);
buildTrackGantry(0.495, 'DRS  //  ACTIVE AERO ZONE', '// THOZHIRPORUL · AI FIREWALL · FRAUD ML', '#00d2ff', false);
buildTrackGantry(0.775, 'SECTOR 3  //  CHAMPIONSHIP', '// SIF PITCH FEST WINNER · NPTEL ELITE + GOLD', '#a855f7', false);

// 8. Night-Race Cantilever Street-Floodlight Arches + 24m Corner Stadium Towers (60FPS Batched VBOs!)
(function buildNightFloodlightSystem() {
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x1a2030 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff8ec });

    const archCount = 32;
    const mastGeo = new THREE.BoxGeometry(0.24, 10.6, 0.24);
    const armGeo = new THREE.BoxGeometry(3.8, 0.22, 0.22);
    const headGeo = new THREE.BoxGeometry(0.86, 0.18, 0.52);

    const mastInst = new THREE.InstancedMesh(mastGeo, steelMat, archCount);
    const armInst = new THREE.InstancedMesh(armGeo, steelMat, archCount);
    const headInst = new THREE.InstancedMesh(headGeo, lampMat, archCount * 2);

    const beamMat = new THREE.MeshBasicMaterial({
        map: gpTextures.beamAlphaTex,
        transparent: true,
        opacity: IS_INTEGRATED_GPU ? 0.24 : 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const poolMat = new THREE.MeshBasicMaterial({
        map: gpTextures.poolTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const shaftGeo = new THREE.PlaneGeometry(5.2, 10.0);
    const tallShaftGeo = new THREE.PlaneGeometry(12.0, 23.0);
    const poolGeo = new THREE.PlaneGeometry(12.5, 14.5);
    const shaftBatch = [];
    const poolBatch = [];
    const archGlarePos = [];
    const archGlareCol = [];
    const warmCol = new THREE.Color(0xfff5e4);
    const coolCol = new THREE.Color(0xe4f0ff);

    const dummy = new THREE.Object3D();
    const poolDummy = new THREE.Object3D();
    poolDummy.rotation.order = 'YXZ';
    let mIdx = 0, aIdx = 0, hIdx = 0;

    for (let i = 0; i < archCount; i++) {
        const u = (i + 0.25) / archCount;
        const fr = sampleCircuitFrame(u);
        const onPitInside = (u > 0.89 || u < 0.09);
        const side = onPitInside ? 1 : ((i % 3 === 1) ? -1 : 1);

        const baseOff = side * (BARRIER_OFF + 0.55);
        const bx = fr.pos.x + fr.right.x * baseOff;
        const bz = fr.pos.z + fr.right.z * baseOff;
        const inwardX = -fr.right.x * side;
        const inwardZ = -fr.right.z * side;
        const rigYaw = Math.atan2(-inwardZ, inwardX);

        dummy.position.set(bx, 5.3, bz);
        dummy.rotation.set(0, rigYaw, 0);
        dummy.updateMatrix();
        mastInst.setMatrixAt(mIdx++, dummy.matrix);

        dummy.position.set(bx + inwardX * 1.75, 10.45, bz + inwardZ * 1.75);
        dummy.rotation.set(0, rigYaw, 0.08);
        dummy.updateMatrix();
        armInst.setMatrixAt(aIdx++, dummy.matrix);

        [2.3, 3.45].forEach((reach, k) => {
            const lx = bx + inwardX * reach;
            const lz = bz + inwardZ * reach;
            const ly = 10.35 + reach * 0.05;
            dummy.position.set(lx, ly, lz);
            dummy.rotation.set(0, rigYaw, 0);
            dummy.updateMatrix();
            headInst.setMatrixAt(hIdx++, dummy.matrix);

            if (k === 1) {
                floodLampWorldPositions.push(new THREE.Vector3(lx, ly - 0.15, lz));

                const c = (i % 2 === 0) ? warmCol : coolCol;
                archGlarePos.push(lx, ly - 0.12, lz);
                archGlareCol.push(c.r, c.g, c.b);

                const shaftYaw = Math.atan2(fr.tang.x, fr.tang.z);
                dummy.position.set(lx + inwardX * 1.05, 5.2, lz + inwardZ * 1.05);
                dummy.rotation.set(0, shaftYaw + (IS_INTEGRATED_GPU ? Math.PI * 0.25 : 0), 0);
                dummy.updateMatrix();
                shaftBatch.push({ geo: shaftGeo, matrix: dummy.matrix.clone() });

                if (!IS_INTEGRATED_GPU) {
                    dummy.rotation.set(0, shaftYaw + Math.PI / 2, 0);
                    dummy.updateMatrix();
                    shaftBatch.push({ geo: shaftGeo, matrix: dummy.matrix.clone() });
                }

                poolDummy.rotation.set(-Math.PI / 2, Math.atan2(-fr.tang.x, -fr.tang.z), 0);
                poolDummy.position.set(
                    fr.pos.x + fr.right.x * (side * 1.4),
                    0.006,
                    fr.pos.z + fr.right.z * (side * 1.4)
                );
                poolDummy.updateMatrix();
                poolBatch.push({ geo: poolGeo, matrix: poolDummy.matrix.clone() });
            }
        });
    }

    mastInst.count = mIdx;
    armInst.count = aIdx;
    headInst.count = hIdx;
    scene.add(mastInst, armInst, headInst);

    const stadiumSpots = [0.06, 0.16, 0.25, 0.36, 0.46, 0.58, 0.68, 0.78, 0.87, 0.95];
    const towerSteelBatch = [];
    const towerCellBatch = [];
    const bigGlarePos = [];
    const bigGlareCol = [];
    const towerMastGeo = new THREE.CylinderGeometry(0.20, 0.42, 23.5, 8);
    const towerFrameGeo = new THREE.BoxGeometry(4.4, 1.65, 0.45);
    const towerCellGeo = new THREE.PlaneGeometry(1.05, 0.56);
    const towerRoot = new THREE.Object3D();
    const towerPart = new THREE.Object3D();
    towerRoot.add(towerPart);

    stadiumSpots.forEach((u, idx) => {
        const fr = sampleCircuitFrame(u);
        const dist = BARRIER_OFF + 5.8;
        const fx = fr.pos.x + fr.right.x * dist;
        const fz = fr.pos.z + fr.right.z * dist;
        const towerYaw = Math.atan2(fr.pos.x - fx, fr.pos.z - fz);

        towerRoot.position.set(fx, 0, fz);
        towerRoot.rotation.set(0, towerYaw, 0);

        towerPart.position.set(0, 11.75, 0);
        towerPart.rotation.set(0, 0, 0);
        towerRoot.updateMatrixWorld(true);
        towerSteelBatch.push({ geo: towerMastGeo, matrix: towerPart.matrixWorld.clone() });

        towerPart.position.set(0, 23.4, 0.35);
        towerPart.rotation.set(0.42, 0, 0);
        towerRoot.updateMatrixWorld(true);
        towerSteelBatch.push({ geo: towerFrameGeo, matrix: towerPart.matrixWorld.clone() });

        for (let r = -0.38; r <= 0.39; r += 0.76) {
            for (let c = -1.35; c <= 1.36; c += 1.35) {
                towerPart.position.set(c, 23.4 + r * 0.85, 0.62 - r * 0.36);
                towerPart.rotation.set(0.42, 0, 0);
                towerRoot.updateMatrixWorld(true);
                towerCellBatch.push({ geo: towerCellGeo, matrix: towerPart.matrixWorld.clone() });
            }
        }

        towerPart.position.set(0, 23.3, 0.85);
        towerPart.rotation.set(0, 0, 0);
        towerRoot.updateMatrixWorld(true);
        const gp = new THREE.Vector3().setFromMatrixPosition(towerPart.matrixWorld);
        bigGlarePos.push(gp.x, gp.y, gp.z);
        const gc = (idx % 2 === 0) ? warmCol : coolCol;
        bigGlareCol.push(gc.r, gc.g, gc.b);

        towerPart.position.set(0, 12.0, 5.6);
        towerPart.rotation.set(-0.45, 0, 0);
        towerRoot.updateMatrixWorld(true);
        shaftBatch.push({ geo: tallShaftGeo, matrix: towerPart.matrixWorld.clone() });
    });

    const mergedShaftGeo = mergeStaticGeometries(shaftBatch, { normals: false, uvs: true });
    if (mergedShaftGeo) scene.add(new THREE.Mesh(mergedShaftGeo, beamMat));

    const mergedPoolGeo = mergeStaticGeometries(poolBatch, { normals: false, uvs: true });
    if (mergedPoolGeo) scene.add(new THREE.Mesh(mergedPoolGeo, poolMat));

    const mergedTowerSteelGeo = mergeStaticGeometries(towerSteelBatch, { normals: true, uvs: false });
    if (mergedTowerSteelGeo) scene.add(new THREE.Mesh(mergedTowerSteelGeo, steelMat));

    const mergedTowerCellGeo = mergeStaticGeometries(towerCellBatch, { normals: false, uvs: false });
    if (mergedTowerCellGeo) scene.add(new THREE.Mesh(mergedTowerCellGeo, lampMat));

    if (archGlarePos.length) {
        const agGeo = new THREE.BufferGeometry();
        agGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(archGlarePos), 3));
        agGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(archGlareCol), 3));
        scene.add(new THREE.Points(agGeo, new THREE.PointsMaterial({
            map: gpTextures.flareTex,
            size: 3.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.78,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })));
    }
    if (bigGlarePos.length) {
        const bgGeo = new THREE.BufferGeometry();
        bgGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bigGlarePos), 3));
        bgGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(bigGlareCol), 3));
        scene.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({
            map: gpTextures.flareTex,
            size: 8.8,
            vertexColors: true,
            transparent: true,
            opacity: 0.88,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })));
    }
})();

// 9. Realistic Architectural Night F1 Pit Building, Recessed Dark Garages & Pit-Wall Timing Stand (60FPS Batched!)
(function buildPitLaneComplex() {
    const pitGroup = new THREE.Group();
    const bldgMat = new THREE.MeshLambertMaterial({ color: 0x06080f });
    const mullionMat = new THREE.MeshLambertMaterial({ color: 0x131928 });
    const darkGlassMat = new THREE.MeshLambertMaterial({ color: 0x0a152b });
    const warmLoungeStrip = new THREE.MeshBasicMaterial({ color: 0xffd596 });
    const bayInteriorMat = new THREE.MeshLambertMaterial({ color: 0x090c14 });
    const bayLightBarMat = new THREE.MeshBasicMaterial({ color: 0xfff6e8 });
    const redBullLedMat = new THREE.MeshBasicMaterial({ color: 0xff1801 });

    const dummy = new THREE.Object3D();
    const bldgBatch = [];
    const mullionBatch = [];
    const bayBackBatch = [];
    const ceilBatch = [];
    const cabBatch = [];
    const hdrBatch = [];
    const monBatch = [];

    dummy.position.set(-1, 4.4, 16.0);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    bldgBatch.push({ geo: new THREE.BoxGeometry(54, 8.8, 6.8), matrix: dummy.matrix.clone() });

    dummy.position.set(-1, 1.1, 22.8);
    dummy.updateMatrix();
    bldgBatch.push({ geo: new THREE.BoxGeometry(22, 2.2, 1.35), matrix: dummy.matrix.clone() });

    const upperGlass = new THREE.Mesh(new THREE.PlaneGeometry(51.0, 2.7), darkGlassMat);
    upperGlass.position.set(-1, 6.3, 19.44);
    pitGroup.add(upperGlass);

    const loungeCove = new THREE.Mesh(new THREE.BoxGeometry(50.5, 0.12, 0.12), warmLoungeStrip);
    loungeCove.position.set(-1, 7.45, 19.48);
    pitGroup.add(loungeCove);

    const mulGeo = new THREE.BoxGeometry(0.22, 8.8, 0.30);
    for (let mx = -25; mx <= 23; mx += 4.0) {
        dummy.position.set(mx, 4.4, 19.50);
        dummy.updateMatrix();
        mullionBatch.push({ geo: mulGeo, matrix: dummy.matrix.clone() });
    }

    const roofLed = new THREE.Mesh(new THREE.BoxGeometry(54.2, 0.10, 0.16), redBullLedMat);
    roofLed.position.set(-1, 8.82, 19.55);
    pitGroup.add(roofLed);

    const bayBackGeo = new THREE.PlaneGeometry(4.4, 3.1);
    const ceilGeo = new THREE.BoxGeometry(0.9, 0.08, 0.12);
    const cabGeo = new THREE.PlaneGeometry(4.1, 0.65);
    const hdrGeo = new THREE.BoxGeometry(4.5, 0.10, 0.18);
    const boomGeo = new THREE.BoxGeometry(0.14, 0.14, 2.4);
    const rbCabCol = new THREE.Color(0x880d05);
    const stdCabCol = new THREE.Color(0x0c1e46);
    const rbHdrCol = new THREE.Color(0xff1801);
    const stdHdrCol = new THREE.Color(0x1e40af);

    for (let g = 0; g < 8; g++) {
        const gx = -21.5 + g * 5.85;
        const isRedBullBay = (g === 3 || g === 4);

        dummy.position.set(gx, 1.55, 19.43);
        dummy.updateMatrix();
        bayBackBatch.push({ geo: bayBackGeo, matrix: dummy.matrix.clone() });

        [-1.1, 0, 1.1].forEach((lx) => {
            dummy.position.set(gx + lx, 2.92, 19.52);
            dummy.updateMatrix();
            ceilBatch.push({ geo: ceilGeo, matrix: dummy.matrix.clone() });
        });

        dummy.position.set(gx, 0.85, 19.46);
        dummy.updateMatrix();
        cabBatch.push({ geo: cabGeo, matrix: dummy.matrix.clone(), color: isRedBullBay ? rbCabCol : stdCabCol });

        dummy.position.set(gx, 3.22, 19.56);
        dummy.updateMatrix();
        hdrBatch.push({ geo: hdrGeo, matrix: dummy.matrix.clone(), color: isRedBullBay ? rbHdrCol : stdHdrCol });

        if (isRedBullBay) {
            dummy.position.set(gx, 2.85, 20.6);
            dummy.updateMatrix();
            mullionBatch.push({ geo: boomGeo, matrix: dummy.matrix.clone() });
        }
    }

    const monGeo = new THREE.PlaneGeometry(1.9, 0.48);
    const monC1 = new THREE.Color(0x0891b2);
    const monC2 = new THREE.Color(0x059669);
    for (let m = 0; m < 6; m++) {
        dummy.position.set(-9.0 + m * 3.4, 1.38, 23.50);
        dummy.updateMatrix();
        monBatch.push({ geo: monGeo, matrix: dummy.matrix.clone(), color: (m % 2 === 0) ? monC1 : monC2 });
    }

    const mBldg = mergeStaticGeometries(bldgBatch, { normals: true, uvs: false });
    if (mBldg) pitGroup.add(new THREE.Mesh(mBldg, bldgMat));
    const mMul = mergeStaticGeometries(mullionBatch, { normals: true, uvs: false });
    if (mMul) pitGroup.add(new THREE.Mesh(mMul, mullionMat));
    const mBay = mergeStaticGeometries(bayBackBatch, { normals: true, uvs: false });
    if (mBay) pitGroup.add(new THREE.Mesh(mBay, bayInteriorMat));
    const mCeil = mergeStaticGeometries(ceilBatch, { normals: false, uvs: false });
    if (mCeil) pitGroup.add(new THREE.Mesh(mCeil, bayLightBarMat));
    const mCab = mergeStaticGeometries(cabBatch, { normals: false, uvs: false, colors: true });
    if (mCab) pitGroup.add(new THREE.Mesh(mCab, new THREE.MeshBasicMaterial({ vertexColors: true })));
    const mHdr = mergeStaticGeometries(hdrBatch, { normals: false, uvs: false, colors: true });
    if (mHdr) pitGroup.add(new THREE.Mesh(mHdr, new THREE.MeshBasicMaterial({ vertexColors: true })));
    const mMon = mergeStaticGeometries(monBatch, { normals: false, uvs: false, colors: true });
    if (mMon) pitGroup.add(new THREE.Mesh(mMon, new THREE.MeshBasicMaterial({ vertexColors: true })));

    scene.add(pitGroup);
})();

// 9b. 3D FIA Pit-Exit Staging Box, Diagonal Merge Lane Lines & Red->Green Pit-Exit Marshal Light Post
let pitExitBulbMat = null;
let pitExitHaloSprite = null;
(function buildPitExitStagingLane() {
    const stagingGroup = new THREE.Group();

    // Painted Red Bull #01 Pit-Exit Staging Box at (-21.5, 0.008, 26.15)
    const boxCanvas = document.createElement('canvas');
    boxCanvas.width = 512;
    boxCanvas.height = 256;
    const bctx = boxCanvas.getContext('2d');
    bctx.fillStyle = 'rgba(6, 10, 20, 0.72)';
    bctx.fillRect(16, 16, 480, 224);
    bctx.strokeStyle = '#ff1801';
    bctx.lineWidth = 10;
    bctx.strokeRect(20, 20, 472, 216);
    bctx.fillStyle = '#ffb700';
    bctx.fillRect(452, 26, 28, 204);
    // Clean FIA Pit-Box Wheel-Alignment Striping (zero watermark text!)
    bctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    bctx.fillRect(108, 42, 72, 8);
    bctx.fillRect(310, 42, 72, 8);
    bctx.fillRect(108, 206, 72, 8);
    bctx.fillRect(310, 206, 72, 8);
    const boxTex = new THREE.CanvasTexture(boxCanvas);
    boxTex.anisotropy = maxAniso;
    if ('encoding' in boxTex) boxTex.encoding = THREE.sRGBEncoding;

    const stagingDecal = new THREE.Mesh(
        new THREE.PlaneGeometry(6.2, 2.85),
        new THREE.MeshBasicMaterial({
            map: boxTex,
            transparent: true,
            opacity: 0.88,
            depthWrite: false
        })
    );
    stagingDecal.rotation.x = -Math.PI / 2;
    stagingDecal.position.set(-21.5, 0.009, 26.15);
    stagingGroup.add(stagingDecal);

    // FIA White Dashed Pit-Exit Merge Chevron Dashes (batched into 1 draw call!)
    const dashMat = new THREE.MeshBasicMaterial({
        color: 0xdce4f2,
        transparent: true,
        opacity: 0.78,
        depthWrite: false
    });
    const mergePts = [
        [-18.0, 26.4], [-16.2, 27.3], [-14.4, 28.4], [-12.6, 29.6],
        [-10.8, 30.8], [ -9.0, 31.8], [ -7.2, 32.6], [ -5.4, 33.2]
    ];
    const dashGeo = new THREE.PlaneGeometry(0.18, 1.15);
    const dashDummy = new THREE.Object3D();
    dashDummy.rotation.order = 'YXZ';
    const dashBatch = [];
    for (let i = 0; i < mergePts.length; i++) {
        const [mx, mz] = mergePts[i];
        const next = mergePts[Math.min(mergePts.length - 1, i + 1)];
        const prev = mergePts[Math.max(0, i - 1)];
        const yaw = Math.atan2(-(next[0] - prev[0]), -(next[1] - prev[1]));
        dashDummy.rotation.set(-Math.PI / 2, yaw, 0);
        dashDummy.position.set(mx, 0.010, mz);
        dashDummy.updateMatrix();
        dashBatch.push({ geo: dashGeo, matrix: dashDummy.matrix.clone() });
    }
    const mDash = mergeStaticGeometries(dashBatch, { normals: false, uvs: false });
    if (mDash) stagingGroup.add(new THREE.Mesh(mDash, dashMat));

    // 3D FIA Pit-Exit Marshal Signal Light Post at (-17.8, 0, 24.25)
    const postMat = new THREE.MeshLambertMaterial({ color: 0x10141f });
    const postPole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.75, 10), postMat);
    postPole.position.set(-17.8, 0.875, 24.25);
    stagingGroup.add(postPole);

    const signalHead = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.56, 0.24), postMat);
    signalHead.position.set(-17.8, 1.72, 24.25);
    signalHead.rotation.y = -Math.PI / 3;
    stagingGroup.add(signalHead);

    pitExitBulbMat = new THREE.MeshBasicMaterial({ color: 0xff1801 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.095, 16), pitExitBulbMat);
    lens.position.set(0, 0.08, 0.125);
    signalHead.add(lens);

    pitExitHaloSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: gpTextures.flareTex,
        color: 0xff1801,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }));
    pitExitHaloSprite.position.set(-17.91, 1.80, 24.32);
    pitExitHaloSprite.scale.set(0.95, 0.95, 1);
    stagingGroup.add(pitExitHaloSprite);

    scene.add(stagingGroup);
})();

// 10. Covered Night-Stadium Grandstands with Warm Canopy Uplighting & Crowd Camera Flashes
const crowdFlashPositions = [];
let crowdFlashPoints = null;
(function buildNightGrandstands() {
    const darkStructMat = new THREE.MeshLambertMaterial({ color: 0x070a11 });
    const tierMat = new THREE.MeshLambertMaterial({ color: 0x0b0f1a });
    const canopySoffitMat = new THREE.MeshBasicMaterial({ color: 0x221b12 });
    const warmStripMat = new THREE.MeshBasicMaterial({ color: 0xffdca4 });

    function addGrandstand(centerX, centerZ, yaw, lengthM) {
        const gs = new THREE.Group();
        gs.position.set(centerX, 0, centerZ);
        gs.rotation.y = yaw;

        const tierGeo = new THREE.BoxGeometry(lengthM, 1.15, 1.85);
        const tierDummy = new THREE.Object3D();
        const tierBatch = [];
        for (let t = 0; t < 5; t++) {
            tierDummy.position.set(0, 1.1 + t * 1.15, t * 1.65);
            tierDummy.updateMatrix();
            tierBatch.push({ geo: tierGeo, matrix: tierDummy.matrix.clone() });
        }
        const mergedTiers = mergeStaticGeometries(tierBatch, { normals: true, uvs: false });
        if (mergedTiers) gs.add(new THREE.Mesh(mergedTiers, tierMat));

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(lengthM, 9.8, 0.8), darkStructMat);
        backWall.position.set(0, 4.9, 8.2);
        gs.add(backWall);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(lengthM + 1.2, 0.45, 10.2), darkStructMat);
        roof.position.set(0, 9.8, 3.8);
        roof.rotation.x = 0.08;
        gs.add(roof);

        const soffit = new THREE.Mesh(new THREE.PlaneGeometry(lengthM - 0.5, 9.2), canopySoffitMat);
        soffit.position.set(0, 9.52, 3.8);
        soffit.rotation.x = Math.PI / 2 + 0.08;
        gs.add(soffit);

        const frontLightStrip = new THREE.Mesh(new THREE.BoxGeometry(lengthM - 1.0, 0.10, 0.14), warmStripMat);
        frontLightStrip.position.set(0, 9.25, -1.1);
        gs.add(frontLightStrip);

        scene.add(gs);
        gs.updateMatrixWorld(true);

        const count = Math.floor(lengthM * 3.0);
        for (let c = 0; c < count; c++) {
            const t = Math.floor(Math.random() * 5);
            const lx = (Math.random() - 0.5) * (lengthM - 2.0);
            const ly = 1.85 + t * 1.15 + Math.random() * 0.35;
            const lz = t * 1.65 - 0.55;
            const wp = new THREE.Vector3(lx, ly, lz).applyMatrix4(gs.matrixWorld);
            crowdFlashPositions.push(wp);
        }
    }

    addGrandstand(2.0, 50.5, 0, 54);
    const t1 = sampleCircuitFrame(0.20);
    addGrandstand(t1.pos.x + t1.right.x * 16.5, t1.pos.z + t1.right.z * 16.5, Math.atan2(t1.right.x, t1.right.z), 34);
    const p1 = sampleCircuitFrame(0.74);
    addGrandstand(p1.pos.x + p1.right.x * 16.5, p1.pos.z + p1.right.z * 16.5, Math.atan2(p1.right.x, p1.right.z), 32);

    if (crowdFlashPositions.length) {
        const cfGeo = new THREE.BufferGeometry();
        const cfArr = new Float32Array(crowdFlashPositions.length * 3);
        const cfCol = new Float32Array(crowdFlashPositions.length * 3);
        for (let i = 0; i < crowdFlashPositions.length; i++) {
            cfArr[i * 3]     = crowdFlashPositions[i].x;
            cfArr[i * 3 + 1] = crowdFlashPositions[i].y;
            cfArr[i * 3 + 2] = crowdFlashPositions[i].z;
            cfCol[i * 3] = 0.85; cfCol[i * 3 + 1] = 0.90; cfCol[i * 3 + 2] = 1.0;
        }
        cfGeo.setAttribute('position', new THREE.BufferAttribute(cfArr, 3));
        cfGeo.setAttribute('color', new THREE.BufferAttribute(cfCol, 3));
        crowdFlashPoints = new THREE.Points(cfGeo, new THREE.PointsMaterial({
            map: gpTextures.flareTex,
            size: 0.82,
            vertexColors: true,
            transparent: true,
            opacity: 0.72,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        scene.add(crowdFlashPoints);
    }
})();

// 11. Corner Braking Distance Boards (150m / 100m / 50m) & Trackside FIA DigiFlag LED Panels (60FPS Batched!)
(function buildBrakingBoardsAndDigiFlags() {
    const postMat = new THREE.MeshLambertMaterial({ color: 0x161a22 });
    const postBatch = [];
    const digiScreenBatch = [];
    const dummy = new THREE.Object3D();
    const legGeo = new THREE.BoxGeometry(0.10, 1.05, 0.10);
    const housingGeo = new THREE.BoxGeometry(1.15, 0.85, 0.14);
    const screenGeo = new THREE.PlaneGeometry(0.96, 0.68);
    const texCache = {};

    const brakeZones = [
        [0.080, '150'], [0.106, '100'], [0.132, '50'],
        [0.560, '150'], [0.586, '100'], [0.612, '50']
    ];
    brakeZones.forEach(([uPos, label]) => {
        const fr = sampleCircuitFrame(uPos);
        const yaw = Math.atan2(-fr.tang.x, -fr.tang.z);
        if (!texCache[label]) {
            texCache[label] = new THREE.MeshBasicMaterial({ map: makeBrakingBoardTexture(label) });
        }
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.88, 0.08), texCache[label]);
        const off = TRACK_HALF_W + 2.3;
        board.position.set(fr.pos.x + fr.right.x * off, 1.05, fr.pos.z + fr.right.z * off);
        board.rotation.y = yaw;
        scene.add(board);

        dummy.position.set(board.position.x, 0.52, board.position.z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        postBatch.push({ geo: legGeo, matrix: dummy.matrix.clone() });
    });

    for (let d = 0; d < 14; d++) {
        const u = (d + 0.5) / 14;
        const fr = sampleCircuitFrame(u);
        const yaw = Math.atan2(-fr.tang.x, -fr.tang.z);
        const side = (d % 2 === 0) ? 1 : -1;
        const off = side * (BARRIER_OFF - 0.35);

        dummy.position.set(fr.pos.x + fr.right.x * off, 2.15, fr.pos.z + fr.right.z * off);
        dummy.rotation.set(0, yaw - side * 0.25, 0);
        dummy.updateMatrix();
        postBatch.push({ geo: housingGeo, matrix: dummy.matrix.clone() });

        dummy.translateZ(0.08);
        dummy.updateMatrix();
        digiScreenBatch.push({ geo: screenGeo, matrix: dummy.matrix.clone() });
    }

    const mPosts = mergeStaticGeometries(postBatch, { normals: true, uvs: false });
    if (mPosts) scene.add(new THREE.Mesh(mPosts, postMat));

    const sharedDigiMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    digiFlagMaterials.push(sharedDigiMat);
    const mScreens = mergeStaticGeometries(digiScreenBatch, { normals: false, uvs: false });
    if (mScreens) scene.add(new THREE.Mesh(mScreens, sharedDigiMat));
})();

// 12. 3D GLSL Midnight Sky Dome, Pinpoint Stars & 48-Tower Night Metropolis Skyline
let aviationBeaconMat = null;
(function buildMidnightSkyAndMetropolis() {
    const skyGeo = new THREE.SphereGeometry(520, 40, 24);
    const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
            uZenith:  { value: new THREE.Color(0x010205) },
            uMidSky:  { value: new THREE.Color(0x02040b) },
            uHorizon: { value: new THREE.Color(0x050a18) }
        },
        vertexShader: [
            'varying vec3 vWorldPos;',
            'void main() {',
            '    vec4 wp = modelMatrix * vec4(position, 1.0);',
            '    vWorldPos = wp.xyz;',
            '    gl_Position = projectionMatrix * viewMatrix * wp;',
            '}'
        ].join('\n'),
        fragmentShader: [
            'uniform vec3 uZenith;',
            'uniform vec3 uMidSky;',
            'uniform vec3 uHorizon;',
            'varying vec3 vWorldPos;',
            'void main() {',
            '    vec3 dir = normalize(vWorldPos);',
            '    float h = clamp(dir.y, 0.0, 1.0);',
            '    vec3 col = mix(uHorizon, uMidSky, smoothstep(0.0, 0.22, h));',
            '    col = mix(col, uZenith, smoothstep(0.18, 0.72, h));',
            '    float mask = smoothstep(0.02, 0.14, h) * (1.0 - smoothstep(0.20, 0.50, h));',
            '    col += vec3(0.008, 0.015, 0.032) * mask;',
            '    gl_FragColor = vec4(col, 1.0);',
            '}'
        ].join('\n')
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.renderOrder = -100;
    scene.add(skyDome);

    const starCount = 540;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    let sSeed = 9001;
    for (let i = 0; i < starCount; i++) {
        sSeed = (sSeed * 16807) % 2147483647;
        const ang = ((sSeed & 4095) / 4096) * Math.PI * 2;
        sSeed = (sSeed * 16807) % 2147483647;
        const elev = 0.12 + ((sSeed & 4095) / 4096) * 0.82;
        const rad = 360;
        const cosE = Math.sqrt(1 - elev * elev);
        starPos[i * 3]     = Math.cos(ang) * cosE * rad;
        starPos[i * 3 + 1] = elev * rad;
        starPos[i * 3 + 2] = Math.sin(ang) * cosE * rad;
        const br = 0.45 + (i % 7) * 0.08;
        starCol[i * 3] = br; starCol[i * 3 + 1] = br * 0.95; starCol[i * 3 + 2] = br;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
        map: gpTextures.flareTex,
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
    })));

    const towerCount = 48;
    const towerMat = new THREE.MeshBasicMaterial({
        map: gpTextures.skyscraperTex
    });
    const crownColors = [0x00c8ff, 0x1e5bc6, 0xff1801, 0xffb800, 0xe8f0ff].map((h) => new THREE.Color(h));
    const beaconPositions = [];
    const towerBatch = [];
    const crownBatch = [];
    const towerDummy = new THREE.Object3D();

    for (let t = 0; t < towerCount; t++) {
        const ang = (t / towerCount) * Math.PI * 2 + (t % 3) * 0.04;
        const dist = 108 + (t * 37) % 105;
        const tx = Math.cos(ang) * dist;
        const tz = Math.sin(ang) * dist * 0.86;
        const w = 10 + (t * 7) % 14;
        const d = 10 + (t * 11) % 14;
        const h = 26 + ((t * 29) % 68);

        const bGeo = new THREE.BoxGeometry(w, h, d);
        const uvAttr = bGeo.attributes.uv;
        const repX = Math.max(1, Math.round(w / 11));
        const repY = Math.max(1, Math.round(h / 32));
        for (let k = 0; k < uvAttr.count; k++) {
            uvAttr.setXY(k, uvAttr.getX(k) * repX, uvAttr.getY(k) * repY);
        }

        const rotY = -ang + (t % 2) * 0.35;
        towerDummy.position.set(tx, h / 2, tz);
        towerDummy.rotation.set(0, rotY, 0);
        towerDummy.updateMatrix();
        towerBatch.push({ geo: bGeo, matrix: towerDummy.matrix.clone() });

        if (h > 44) {
            const cGeo = new THREE.BoxGeometry(w + 0.3, 0.36, d + 0.3);
            towerDummy.position.set(tx, h + 0.18, tz);
            towerDummy.rotation.set(0, rotY, 0);
            towerDummy.updateMatrix();
            crownBatch.push({
                geo: cGeo,
                matrix: towerDummy.matrix.clone(),
                color: crownColors[t % crownColors.length]
            });
            beaconPositions.push(tx, h + 1.4, tz);
        }
    }

    const mergedTowers = mergeStaticGeometries(towerBatch, { normals: false, uvs: true });
    if (mergedTowers) scene.add(new THREE.Mesh(mergedTowers, towerMat));

    const mergedCrowns = mergeStaticGeometries(crownBatch, { normals: false, uvs: false, colors: true });
    if (mergedCrowns) scene.add(new THREE.Mesh(mergedCrowns, new THREE.MeshBasicMaterial({ vertexColors: true })));

    if (beaconPositions.length) {
        const bcGeo = new THREE.BufferGeometry();
        bcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(beaconPositions), 3));
        aviationBeaconMat = new THREE.PointsMaterial({
            map: gpTextures.redFlareTex,
            size: 3.2,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        scene.add(new THREE.Points(bcGeo, aviationBeaconMat));
    }

    const bokehCount = 460;
    const bGeo = new THREE.BufferGeometry();
    const bPos = new Float32Array(bokehCount * 3);
    const bCol = new Float32Array(bokehCount * 3);
    const palette = [
        new THREE.Color(0xffdfa8),
        new THREE.Color(0xcce2ff),
        new THREE.Color(0x1e5bc6),
        new THREE.Color(0xff2a0e),
        new THREE.Color(0xffaa22)
    ];
    for (let i = 0; i < bokehCount; i++) {
        sSeed = (sSeed * 16807) % 2147483647;
        const ang = ((sSeed & 4095) / 4096) * Math.PI * 2;
        sSeed = (sSeed * 16807) % 2147483647;
        const rad = 96 + ((sSeed & 4095) / 4096) * 130;
        bPos[i * 3]     = Math.cos(ang) * rad;
        bPos[i * 3 + 1] = 0.8 + ((i * 13) % 18) * 0.55;
        bPos[i * 3 + 2] = Math.sin(ang) * rad * 0.88;
        const c = palette[i % palette.length];
        bCol[i * 3] = c.r; bCol[i * 3 + 1] = c.g; bCol[i * 3 + 2] = c.b;
    }
    bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
    bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
    scene.add(new THREE.Points(bGeo, new THREE.PointsMaterial({
        map: gpTextures.flareTex,
        size: 2.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    })));
})();

// Freeze all static circuit, pit, grandstand & metropolis world matrices so Three.js skips 500+ Matrix4 multiplications every frame!
scene.updateMatrixWorld(true);
scene.traverse((obj) => {
    if (
        obj !== scene &&
        obj !== spotlight &&
        obj !== spotlight.target &&
        obj !== stadiumNearLight &&
        obj !== carAuraLight &&
        !obj.isSprite
    ) {
        obj.matrixAutoUpdate = false;
    }
});

// ==========================================================
//  2026 ORACLE RED BULL RACING RB22 (.glb) + LIVE COCKPIT
// ==========================================================
const carGroup = new THREE.Group();
// Hide contact shadow & tail-light halo until 3D RB22 GLB is attached & GPU-compiled (zero empty-car glitch!)
carGroup.visible = false;
const chassisDynamicsGroup = new THREE.Group();
carGroup.add(chassisDynamicsGroup);
scene.add(carGroup);

const carContactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.38, 5.25),
    new THREE.MeshBasicMaterial({
        map: gpTextures.contactShadowTex,
        transparent: true,
        opacity: 0.95,
        depthWrite: false
    })
);
carContactShadow.rotation.x = -Math.PI / 2;
carContactShadow.position.set(0, 0.007, 0.02);
carGroup.add(carContactShadow);

const rearRainHaloSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: gpTextures.redFlareTex,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false
}));
rearRainHaloSprite.position.set(0, 0.34, 2.46);
rearRainHaloSprite.scale.set(0.82, 0.82, 1);
chassisDynamicsGroup.add(rearRainHaloSprite);

// High-speed 3D aero slipstream streaks around the RB22
const aeroStreakCount = 30;
const aeroStreakGeo = new THREE.BufferGeometry();
const aeroPosArr = new Float32Array(aeroStreakCount * 2 * 3);
const aeroSeed = [];
for (let i = 0; i < aeroStreakCount; i++) {
    const ang = (i / aeroStreakCount) * Math.PI * 2;
    const rx = (0.65 + (i % 5) * 0.28) * Math.cos(ang);
    const ry = 0.25 + ((i * 7) % 10) * 0.13;
    const zStart = -3.2 + (i % 8) * 0.9;
    aeroSeed.push({ rx, ry, z: zStart, len: 1.4 + (i % 4) * 0.55 });
}
aeroStreakGeo.setAttribute('position', new THREE.BufferAttribute(aeroPosArr, 3));
const aeroStreakMat = new THREE.LineBasicMaterial({
    color: 0xaad8ff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
carGroup.add(new THREE.LineSegments(aeroStreakGeo, aeroStreakMat));

// World-Space Bouncing Titanium Skid-Block Underfloor Sparks
const SPARK_COUNT = 54;
const sparkGeo = new THREE.BufferGeometry();
const sparkPosArr = new Float32Array(SPARK_COUNT * 2 * 3);
const sparkColArr = new Float32Array(SPARK_COUNT * 2 * 3);
for (let i = 0; i < SPARK_COUNT; i++) {
    const i6 = i * 6;
    sparkColArr[i6]     = 1.00; sparkColArr[i6 + 1] = 0.93; sparkColArr[i6 + 2] = 0.68;
    sparkColArr[i6 + 3] = 1.00; sparkColArr[i6 + 4] = 0.42; sparkColArr[i6 + 5] = 0.05;
}
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPosArr, 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColArr, 3));
const sparkMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const titaniumSparks = new THREE.LineSegments(sparkGeo, sparkMat);
titaniumSparks.frustumCulled = false;
scene.add(titaniumSparks);

const sparkPool = [];
for (let i = 0; i < SPARK_COUNT; i++) {
    sparkPool.push({ x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.3 });
}
let sparkSpawnCursor = 0;

const CAR_MODEL_URL  = './red_bull_rb22_2026.glb';
const CAR_FIT_LENGTH = 5.0;
const CAR_ROTATION_Y = Math.PI;
const CAR_Y_OFFSET   = 0.004;

const wheelElements = [];
const frontSteerPivots = [];
let rb22SteerWheelNode = null;
let rb22SteerBaseQuat = null;
let rb22RearActiveFlap = null;
let rb22FrontActiveFlap = null;
const rb22RearLightMats = [];
const rb22DrsLedMats = [];
const rb22BrakeDiscMats = [];
const rb22CockpitShiftMats = [];

function syncRedBullActiveAero() {
    if (rb22RearActiveFlap) {
        gsap.to(rb22RearActiveFlap.rotation, {
            x: isDrsOn ? -0.38 : 0,
            duration: 0.42,
            ease: isDrsOn ? 'power2.out' : 'power2.inOut'
        });
    }
    if (rb22FrontActiveFlap) {
        gsap.to(rb22FrontActiveFlap.rotation, {
            x: isDrsOn ? -0.25 : 0,
            duration: 0.42,
            ease: isDrsOn ? 'power2.out' : 'power2.inOut'
        });
    }
    rb22DrsLedMats.forEach((mat) => {
        mat.emissive = new THREE.Color(isDrsOn ? 0x10b981 : 0x000000);
        mat.emissiveIntensity = isDrsOn ? 2.5 : 0.0;
    });
    drsAccentMeshes.forEach((m) => m.material.color.setHex(isDrsOn ? 0x10b981 : 0x00d2ff));
    digiFlagMaterials.forEach((m) => m.color.setHex(isDrsOn ? 0x00d2ff : 0x10b981));
    aeroStreakMat.color.setHex(isDrsOn ? 0x5ef2ff : 0xc8e2ff);
}

if (typeof THREE.GLTFLoader === 'function') {
    const carLoader = new THREE.GLTFLoader();
    try {
        const draco = new THREE.DRACOLoader();
        draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        carLoader.setDRACOLoader(draco);
    } catch (e) { /* DRACO optional */ }

    const onRb22GltfReady = (gltf) => {
        const model = gltf.scene;

        const buckledBelts = model.getObjectByName('CINTURE_ON_243_17');
        if (buckledBelts) buckledBelts.visible = false;

        ['WHEEL_LF_60_379', 'WHEEL_RF_45_395', 'WHEEL_LR_117_387', 'WHEEL_RR_96_403'].forEach((wName, idx) => {
            const wNode = model.getObjectByName(wName);
            if (!wNode) return;
            if (idx < 2 && wNode.parent) {
                const steerPivot = new THREE.Group();
                steerPivot.position.copy(wNode.position);
                wNode.parent.add(steerPivot);
                wNode.position.set(0, 0, 0);
                steerPivot.add(wNode);
                frontSteerPivots.push(steerPivot);
            }
            wheelElements.push(wNode);
        });

        // Capture real 3D Cockpit Steering Wheel inside the RB22!
        rb22SteerWheelNode = model.getObjectByName('STEER_HR_211_253') || null;
        if (rb22SteerWheelNode) {
            rb22SteerBaseQuat = rb22SteerWheelNode.quaternion.clone();
        }

        rb22RearActiveFlap = model.getObjectByName('modex_26_62') || null;
        rb22FrontActiveFlap = model.getObjectByName('modez_109_65') || null;

        const upgradedMaterials = new Map();
        model.traverse((obj) => {
            if (!obj.isMesh || !obj.material) return;
            const origMat = origMatRef(obj.material);
            const matName = origMat.name || '';

            ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach((slot) => {
                if (origMat[slot]) {
                    origMat[slot].anisotropy = maxAniso;
                    if (slot === 'map' && 'encoding' in origMat[slot]) {
                        origMat[slot].encoding = THREE.sRGBEncoding;
                    }
                    origMat[slot].needsUpdate = true;
                }
            });

            if (upgradedMaterials.has(origMat)) {
                obj.material = upgradedMaterials.get(origMat);
                return;
            }

            let finalMat = origMat;

            // Authentic Oracle Red Bull Racing Satin-Midnight-Navy + Crisp Gloss Sponsor Decals
            if (matName === 'chasis.002' || matName === 'chassis2.002' || matName === 'decal.002') {
                const isDecal = matName === 'decal.002';
                if (IS_INTEGRATED_GPU) {
                    finalMat = new THREE.MeshStandardMaterial({
                        name: matName,
                        map: origMat.map || null,
                        color: origMat.color ? origMat.color.clone() : new THREE.Color(0xffffff),
                        roughness: isDecal ? 0.06 : 0.14,
                        metalness: 0.14,
                        envMapIntensity: 1.22,
                        transparent: isDecal || origMat.transparent,
                        opacity: origMat.opacity,
                        side: origMat.side,
                        depthWrite: !isDecal,
                        polygonOffset: isDecal,
                        polygonOffsetFactor: isDecal ? -1 : 0,
                        polygonOffsetUnits: isDecal ? -1 : 0
                    });
                } else {
                    finalMat = new THREE.MeshPhysicalMaterial({
                        name: matName,
                        map: origMat.map || null,
                        color: origMat.color ? origMat.color.clone() : new THREE.Color(0xffffff),
                        roughness: isDecal ? 0.08 : 0.17,
                        metalness: 0.12,
                        clearcoat: isDecal ? 0.95 : 0.72,
                        clearcoatRoughness: isDecal ? 0.04 : 0.10,
                        envMapIntensity: 1.08,
                        transparent: isDecal || origMat.transparent,
                        opacity: origMat.opacity,
                        side: origMat.side,
                        depthWrite: !isDecal,
                        polygonOffset: isDecal,
                        polygonOffsetFactor: isDecal ? -1 : 0,
                        polygonOffsetUnits: isDecal ? -1 : 0
                    });
                }
            } else if (matName === 'TIRE_SIDES.002') {
                finalMat.roughness = 0.24;
                finalMat.metalness = 0.15;
                finalMat.envMapIntensity = 1.05;
            } else if (matName === 'TIRE_TREAD.002') {
                finalMat.roughness = 0.36;
                finalMat.metalness = 0.08;
                finalMat.envMapIntensity = 0.90;
            } else if (matName === 'discs.002') {
                finalMat.emissive = new THREE.Color(0xff3800);
                finalMat.emissiveIntensity = 0.0;
                rb22BrakeDiscMats.push(finalMat);
            } else if (matName === 'carbon.002') {
                finalMat.roughness = 0.28;
                finalMat.envMapIntensity = 1.15;
            } else if (matName === 'chrome.002' || matName === 'mirrors.002' || matName === 'redbull_wheel_hub.002' || matName === 'redbull_detail.002') {
                finalMat.envMapIntensity = 1.45;
            } else if (matName === 'glass.002') {
                finalMat.transparent = true;
                finalMat.opacity = 0.30;
                finalMat.roughness = 0.04;
                finalMat.depthWrite = false;
                finalMat.envMapIntensity = 1.65;
            } else if (matName === 'gp21_LCD.002') {
                finalMat.emissive = new THREE.Color(0xffffff);
                finalMat.emissiveMap = finalMat.map;
                finalMat.emissiveIntensity = 1.25;
            } else if (matName === 'CLEARLED.003' || matName === 'kers_orange.002') {
                finalMat.emissive = new THREE.Color(0xff2800);
                finalMat.emissiveIntensity = 0.0;
                rb22CockpitShiftMats.push(finalMat);
            } else if (matName === 'rear_light.002' || matName === 'rtt_light.002') {
                finalMat.emissive = new THREE.Color(0xff1801);
                finalMat.emissiveIntensity = 2.0;
                rb22RearLightMats.push(finalMat);
            } else if (matName === 'TAG_DRS_ON.002' || matName === 'kers_green.002') {
                rb22DrsLedMats.push(finalMat);
            } else if ('envMapIntensity' in finalMat) {
                finalMat.envMapIntensity = 1.05;
            }

            finalMat.needsUpdate = true;
            upgradedMaterials.set(origMat, finalMat);
            obj.material = finalMat;
        });

        function origMatRef(m) { return Array.isArray(m) ? m[0] : m; }

        // Batch same-material child meshes within cockpit steering wheel (78 -> 13 draw calls) & static RB22 chassis (80 -> 19 draw calls)!
        model.updateMatrixWorld(true);
        const batchSameMaterialSubtree = (rootNode, excludedRoots) => {
            if (!rootNode) return;
            const invRoot = new THREE.Matrix4().copy(rootNode.matrixWorld).invert();
            const groups = new Map();
            const walk = (node) => {
                if (excludedRoots && excludedRoots.has(node)) return;
                if (!node.visible) return;
                if (node.isMesh && node.geometry && node.material && !Array.isArray(node.material)) {
                    let arr = groups.get(node.material);
                    if (!arr) {
                        arr = [];
                        groups.set(node.material, arr);
                    }
                    arr.push(node);
                }
                for (let i = 0; i < node.children.length; i++) walk(node.children[i]);
            };
            walk(rootNode);
            groups.forEach((meshes, sharedMat) => {
                if (meshes.length < 2) return;
                const items = [];
                for (let i = 0; i < meshes.length; i++) {
                    const relMat = new THREE.Matrix4().multiplyMatrices(invRoot, meshes[i].matrixWorld);
                    items.push({ geo: meshes[i].geometry, matrix: relMat });
                }
                const mergedGeo = mergeStaticGeometries(items, { normals: true, uvs: true });
                if (!mergedGeo) return;
                if ('vertexTangents' in sharedMat && sharedMat.vertexTangents) {
                    sharedMat.vertexTangents = false;
                    sharedMat.needsUpdate = true;
                }
                const batchedMesh = new THREE.Mesh(mergedGeo, sharedMat);
                rootNode.add(batchedMesh);
                for (let i = 0; i < meshes.length; i++) {
                    if (meshes[i].parent) meshes[i].parent.remove(meshes[i]);
                }
            });
        };

        if (rb22SteerWheelNode) {
            batchSameMaterialSubtree(rb22SteerWheelNode, null);
        }
        const dynamicSubroots = new Set([
            ...wheelElements,
            ...frontSteerPivots,
            rb22SteerWheelNode,
            rb22RearActiveFlap,
            rb22FrontActiveFlap,
            buckledBelts
        ].filter(Boolean));
        batchSameMaterialSubtree(model, dynamicSubroots);

        model.rotation.y = CAR_ROTATION_Y;
        model.updateMatrixWorld(true);

        let box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const s = CAR_FIT_LENGTH / maxDim;
        model.scale.setScalar(s);
        model.updateMatrixWorld(true);

        box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;
        model.position.y += CAR_Y_OFFSET;

        chassisDynamicsGroup.add(model);
        rb22ModelLoaded = true;
        syncRedBullActiveAero();

        // Pre-compile all PBR/Clearcoat shaders & upload 26.8MB textures while hidden behind cinema shutter!
        const revealAndPrewarmGpu = () => {
            carGroup.visible = true;
            carGroup.updateMatrixWorld(true);
            try {
                renderer.compile(scene, camera);
                renderer.render(scene, camera);
            } catch (e) { /* safe fallback */ }
        };

        if (isCinematicIntroActive) {
            revealAndPrewarmGpu();
            notifyCarModelReadyForIntro();
        } else {
            // User clicked SKIP INTRO before GLB finished streaming: reveal smoothly via optical dip-fade!
            triggerManualCameraShiftFade(revealAndPrewarmGpu, 'rgba(255, 24, 1, 0.55)');
        }
        console.log('[RB22] Loaded 2026 Oracle Red Bull Racing RB22 in Calibrated Photorealistic Night GP Spec.');
    };

    const onRb22GltfError = (err) => {
        console.error('[RB22] Failed to load "' + CAR_MODEL_URL + '".', err);
        carGroup.visible = true;
        notifyCarModelFailedForIntro();
    };

    // Consume parallel background stream started at line 1 of F1.js (falls back cleanly to carLoader.load)
    rb22BufferPromise.then((arrayBuffer) => {
        if (arrayBuffer && arrayBuffer.byteLength > 0) {
            carLoader.parse(arrayBuffer, './', onRb22GltfReady, onRb22GltfError);
        } else {
            carLoader.load(CAR_MODEL_URL, onRb22GltfReady, undefined, onRb22GltfError);
        }
    });
}

// ==========================================================
//  6-CHAPTER STORYTELLING NARRATOR, CAMERA RIG & SIMULATION
// ==========================================================
const CHAPTER_SECTIONS = ['grid', 'stint', 'pit', 'drs', 'trophies', 'podium'];

const CHAPTER_STORY_DATA = [
    {
        tag: 'CH 01 // POLE GRID',
        sector: 'S1',
        zone: 'MAIN STARTING GRID',
        color: '#ff1801',
        radio: '“Radio check, Bilal. P1 on the Night Grid — React, Node, Python & AI systems green. Hit Simulate Lap or scroll to launch.”'
    },
    {
        tag: 'CH 02 // TURN 1–2 APEX',
        sector: 'S1',
        zone: 'TURN 1 · WORKS STINT',
        color: '#ff6b00',
        radio: '“Heavy braking into Turn 1 — 4.6G on the carbon discs! Active Web Dev Intern stint at Sasha Infinity backed by 8.3 MCA CGPA at Sona.”'
    },
    {
        tag: 'CH 03 // TECH ESSES',
        sector: 'S2',
        zone: 'SECTOR 2 · TECH ESSES',
        color: '#ffb700',
        radio: '“Sector 2 grip is locked in — 5 Pirelli compounds calibrated across Python, React, FastAPI, PostgreSQL, XGBoost & Docker.”'
    },
    {
        tag: 'CH 04 // DRS STRAIGHT',
        sector: 'S2',
        zone: 'BACK DRS STRAIGHT',
        color: '#00d2ff',
        radio: '“DRS ENABLED — X-Mode wing open at 342 KM/H! Deploying THOZHIRPORUL GIS Governance, Dual-Layer LLM AI Firewall & Fraud ML.”'
    },
    {
        tag: 'CH 05 // PARABOLICA',
        sector: 'S3',
        zone: 'PARABOLICA · TROPHIES',
        color: '#a855f7',
        radio: '“Purple sector through Parabolica! SIF Pitch Fest 2026 Winner, SDG Finalist, SIH Qualifier & NPTEL Java Elite + Gold endorsed.”'
    },
    {
        tag: 'CH 06 // CHECKERED FLAG',
        sector: 'S3',
        zone: 'PARC FERMÉ · PIT WALL',
        color: '#ffc400',
        radio: '“P1, BILAL! P1! Purple lap across the line! Bring the RB22 into Parc Fermé — Pit Wall radio channel is open for offers & collaborations.”'
    }
];

let lastNarratedChapter = 0;
const radioBoxEl = document.getElementById('team-radio-box');
const radioTagEl = document.getElementById('radio-chapter-tag');
const radioTranscriptEl = document.getElementById('radio-transcript');
const trackZoneNameEl = document.getElementById('track-zone-name');

let chapterCamFadeTween = null;

function hexToRgbaCss(hex, alpha) {
    const clean = (hex || '#00d2ff').replace('#', '');
    if (clean.length !== 6) return `rgba(0, 210, 255, ${alpha})`;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Smooth optical shutter dip & sector-colored anamorphic streak when broadcast camera shifts between track chapters!
function triggerBroadcastChapterCamFade(accentHex, peakAlpha = 0.44) {
    if (isCinematicIntroActive || manualCamFadeTween) return;
    const fadeEl = cinemaFadeEl || document.getElementById('cinema-cam-fade');
    const flareEl = cinemaFlareEl || document.getElementById('cinema-flare-streak');
    if (!fadeEl) return;

    if (chapterCamFadeTween) chapterCamFadeTween.kill();
    if (flareEl) {
        flareEl.style.setProperty('--flare-glow', hexToRgbaCss(accentHex, 0.56));
    }

    const proxy = { t: 0 };
    chapterCamFadeTween = gsap.to(proxy, {
        t: 1,
        duration: 0.52,
        ease: 'sine.inOut',
        onUpdate: () => {
            if (isCinematicIntroActive || manualCamFadeTween) return;
            const bell = Math.sin(Math.pow(proxy.t, 0.88) * Math.PI);
            const alpha = bell * peakAlpha;
            fadeEl.style.setProperty('--cam-fade', alpha.toFixed(3));
            if (flareEl) {
                flareEl.style.setProperty('--flare-alpha', (bell * 0.62).toFixed(3));
                flareEl.style.setProperty('--flare-scale', (0.36 + proxy.t * 0.86).toFixed(3));
            }
        },
        onComplete: () => {
            chapterCamFadeTween = null;
            if (!isCinematicIntroActive && !manualCamFadeTween) {
                fadeEl.style.setProperty('--cam-fade', '0');
                if (flareEl) flareEl.style.setProperty('--flare-alpha', '0');
            }
        }
    });
}

function updateStoryNarrator(chapterIdx) {
    if (chapterIdx === lastNarratedChapter) return;
    lastNarratedChapter = chapterIdx;
    const info = CHAPTER_STORY_DATA[chapterIdx] || CHAPTER_STORY_DATA[0];
    triggerBroadcastChapterCamFade(info.color, 0.44);
    if (radioTagEl) {
        radioTagEl.textContent = info.tag;
        radioTagEl.style.color = info.color;
    }
    if (radioTranscriptEl) {
        radioTranscriptEl.textContent = info.radio;
    }
    if (trackZoneNameEl) {
        trackZoneNameEl.textContent = info.zone;
    }
    if (radioBoxEl) {
        radioBoxEl.classList.add('radio-ping');
        clearTimeout(radioBoxEl._pingT);
        radioBoxEl._pingT = setTimeout(() => radioBoxEl.classList.remove('radio-ping'), 900);
    }
}

// --- CHAPTER 04 PROJECT BAY CONTROLLER (AUTO SCROLL-SCRUB + MANUAL TABS) ---
let activeProjectBay = 0;
let manualBayLockUntil = 0;
const bayPills = document.querySelectorAll('.bay-pill');
const bayPanels = document.querySelectorAll('.project-bay-panel');
const bayReadout = document.getElementById('drs-bay-readout');

function setActiveProjectBay(idx, isManual = false) {
    const clamped = Math.max(0, Math.min(2, idx));
    if (isManual) {
        manualBayLockUntil = performance.now() + 4500;
    }
    if (clamped === activeProjectBay && !isManual) return;
    activeProjectBay = clamped;

    bayPanels.forEach((panel, i) => {
        if (i === clamped) panel.classList.add('active');
        else panel.classList.remove('active');
    });
    bayPills.forEach((pill, i) => {
        if (i === clamped) {
            pill.className = 'bay-pill active py-2 px-2 rounded border border-[#ff1801] bg-[#ff1801]/20 text-white font-bold cursor-pointer transition-all text-left';
        } else {
            pill.className = 'bay-pill py-2 px-2 rounded border border-gray-800 bg-black/50 text-gray-400 hover:text-white cursor-pointer transition-all text-left';
        }
    });
    if (bayReadout) bayReadout.textContent = `0${clamped + 1} / 03`;
}

bayPills.forEach((pill) => {
    pill.addEventListener('click', () => {
        setActiveProjectBay(Number(pill.getAttribute('data-bay')) || 0, true);
    });
});
const bayPrevBtn = document.getElementById('bay-prev-btn');
const bayNextBtn = document.getElementById('bay-next-btn');
if (bayPrevBtn) bayPrevBtn.addEventListener('click', () => setActiveProjectBay((activeProjectBay + 2) % 3, true));
if (bayNextBtn) bayNextBtn.addEventListener('click', () => setActiveProjectBay((activeProjectBay + 1) % 3, true));

// --- 60FPS MOUSE PARALLAX, CACHED LAYOUT METRICS & 4-WAY KEYBOARD ARROW DRIVE ---
let currentMouseX = 0, currentMouseY = 0;
let mouseX = 0, mouseY = 0;

// Sub-pixel 60fps Keyboard Arrow Inertia & Throttle State
let kbHeldDir = 0;       // +1 forward (ArrowDown / held ArrowRight), -1 reverse (ArrowUp / held ArrowLeft)
let kbVelocity = 0;      // px/sec smooth inertia velocity
let kbVirtualScroll = 0; // 64-bit sub-pixel scroll tracker
let kbActive = false;

function resetKeyboardDrive() {
    kbHeldDir = 0;
    kbVelocity = 0;
    kbActive = false;
}

// Pre-cached DOM & Layout Metrics (eliminates 100% of synchronous reflows inside 60fps RAF!)
let cachedViewportW = window.innerWidth;
let cachedViewportH = window.innerHeight;
let cachedMaxScroll = 1;
const cachedChapterOffsets = [0, 0, 0, 0, 0, 0];
let cachedDrsStickyTravel = 1;

function refreshLayoutMetrics() {
    cachedViewportW = window.innerWidth;
    cachedViewportH = window.innerHeight;
    const scroller = document.scrollingElement || document.documentElement;
    cachedMaxScroll = Math.max(1, scroller.scrollHeight - cachedViewportH);
    for (let i = 0; i < CHAPTER_SECTIONS.length; i++) {
        const el = document.getElementById(CHAPTER_SECTIONS[i]);
        cachedChapterOffsets[i] = el ? el.offsetTop : 0;
    }
    const drsEl = document.getElementById('drs');
    cachedDrsStickyTravel = drsEl ? Math.max(1, drsEl.offsetHeight - cachedViewportH) : 1;
}
refreshLayoutMetrics();
window.addEventListener('load', refreshLayoutMetrics);

window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / cachedViewportW) - 0.5;
    mouseY = (e.clientY / cachedViewportH) - 0.5;
}, { passive: true });

const speedo = document.getElementById('speedo');
const speedBar = document.getElementById('speed-bar');
const laps = document.querySelectorAll('.hud-lap');
const scrollNavItems = document.querySelectorAll('.scroll-nav-item');
const customProgressBar = document.getElementById('scroll-progress-bar');
const minimapCar = document.getElementById('minimap-car');
const minimapCarGroupEl = document.getElementById('minimap-car-group');
const minimapCarPingEl = document.getElementById('minimap-car-ping');
const sectorChipEls = document.querySelectorAll('.sector-chip');
const trackPath = document.getElementById('minimap-track-path');
const activePath = document.getElementById('minimap-track-path-active');
const ledElements = document.querySelectorAll('.rev-led');
const gearIndicator = document.getElementById('gear-indicator');
const navKmhEl = document.getElementById('nav-kmh');
const hudKmhEl = document.getElementById('hud-kmh');
const mobKmhEl = document.getElementById('mobile-kmh');
const minimapPctEl = document.getElementById('minimap-progress-pct');
const gDotEl = document.getElementById('g-force-dot');
const gValEl = document.getElementById('g-force-val');
const lapTimerEl = document.getElementById('nav-lap-timer');
const warpOverlayEl = document.getElementById('aero-warp-overlay');
const summaryVmaxEl = document.getElementById('summary-vmax');
const minimapPathLength = trackPath ? trackPath.getTotalLength() : 0;
if (activePath && minimapPathLength > 0) {
    activePath.style.strokeDasharray = minimapPathLength;
}
// Pre-bake 512-point Minimap GPS LUT once at startup (eliminates synchronous SVG getPointAtLength() reflows inside 60fps RAF!)
const MINIMAP_LUT_STEPS = 512;
const minimapLutX = new Float32Array(MINIMAP_LUT_STEPS);
const minimapLutY = new Float32Array(MINIMAP_LUT_STEPS);
const minimapLutDeg = new Float32Array(MINIMAP_LUT_STEPS);
if (trackPath && minimapPathLength > 0) {
    for (let i = 0; i < MINIMAP_LUT_STEPS; i++) {
        const l0 = (i / MINIMAP_LUT_STEPS) * minimapPathLength;
        const l1 = (((i + 4) % MINIMAP_LUT_STEPS) / MINIMAP_LUT_STEPS) * minimapPathLength;
        const p0 = trackPath.getPointAtLength(l0);
        const p1 = trackPath.getPointAtLength(l1);
        minimapLutX[i] = p0.x;
        minimapLutY[i] = p0.y;
        minimapLutDeg[i] = Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);
    }
}
let _prevMinimapLutIdx = -1;
let _prevWarpAlpha = -1;
let _prevLapTimerMs = 0;

// Place RB22 in P1 Pole Position on Main Straight
const initialGridFrame = sampleCircuitFrame(0);
carGroup.position.set(initialGridFrame.pos.x, 0, initialGridFrame.pos.z);
carGroup.rotation.y = Math.atan2(-initialGridFrame.tang.x, -initialGridFrame.tang.z);

const targetCameraPosition = new THREE.Vector3();
const targetLookAt = new THREE.Vector3(initialGridFrame.pos.x, 0.52, initialGridFrame.pos.z);

function turnOffGantryStartLights() {
    gantryStartLightBulbs.forEach((m) => m.color.setHex(0x160505));
    gantryStartLightSprites.forEach((s) => { s.visible = false; });
}

document.querySelectorAll('[data-target]').forEach((item) => {
    item.addEventListener('click', () => {
        const sel = item.getAttribute('data-target');
        const targetEl = sel ? (document.getElementById(sel) || (sel.startsWith('#') ? document.querySelector(sel) : null)) : null;
        if (targetEl && Math.abs(targetEl.getBoundingClientRect().top) > window.innerHeight * 0.9) {
            triggerBroadcastChapterCamFade('#ff1801', 0.68);
        }
        smoothScrollToTarget(sel);
    });
});
const brandHomeBtn = document.getElementById('brand-home-btn');
if (brandHomeBtn) {
    brandHomeBtn.addEventListener('click', () => {
        if (window.scrollY > window.innerHeight * 0.9) {
            triggerBroadcastChapterCamFade('#ff1801', 0.68);
        }
        smoothScrollToTarget(0);
    });
}

// --- 5-MODE F1 TV BROADCAST CAMERA DIRECTOR (CHASE · COCKPIT · HALO · WHEEL · 360°) ---
let activeCamMode = 'chase';
let orbitYaw = 0.65;
let orbitPitch = 0.28;
let orbitRadius = 4.25;
let isOrbitDragging = false;
let orbitLastX = 0, orbitLastY = 0;

let localCamState = { f: 11.0, r: 7.6, u: 4.6, lf: 0, lr: -1.35, lu: 0.52, initialized: false };

const camPills = document.querySelectorAll('.cam-pill');
let manualCamFadeTween = null;

function applyCameraModeImmediate(mode) {
    activeCamMode = mode;
    camPills.forEach((btn) => {
        if (btn.getAttribute('data-cam') === mode) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    if (mode === 'orbit') {
        document.body.classList.add('cam-orbit-mode');
    } else {
        document.body.classList.remove('cam-orbit-mode', 'orbit-dragging');
        isOrbitDragging = false;
    }
}

function triggerManualCameraShiftFade(onMidCut, flareColorCss) {
    const fadeEl = cinemaFadeEl || document.getElementById('cinema-cam-fade');
    const flareEl = cinemaFlareEl || document.getElementById('cinema-flare-streak');
    if (!fadeEl) {
        if (onMidCut) onMidCut();
        return;
    }
    if (chapterCamFadeTween) {
        chapterCamFadeTween.kill();
        chapterCamFadeTween = null;
    }
    if (manualCamFadeTween) manualCamFadeTween.kill();
    if (flareEl && flareColorCss) {
        flareEl.style.setProperty('--flare-glow', flareColorCss);
    }

    const proxy = { t: 0 };
    let switched = false;
    manualCamFadeTween = gsap.to(proxy, {
        t: 1,
        duration: 0.62,
        ease: 'sine.inOut',
        onUpdate: () => {
            let alpha = 0;
            if (proxy.t < 0.38) {
                const u = proxy.t / 0.38;
                alpha = u * u * (3 - 2 * u) * 0.94;
            } else if (proxy.t < 0.46) {
                if (!switched) {
                    switched = true;
                    if (onMidCut) onMidCut();
                }
                alpha = 0.94;
            } else {
                if (!switched) {
                    switched = true;
                    if (onMidCut) onMidCut();
                }
                const u = (proxy.t - 0.46) / 0.54;
                alpha = (1 - (u * u * (3 - 2 * u))) * 0.94;
            }
            fadeEl.style.setProperty('--cam-fade', alpha.toFixed(3));

            if (flareEl) {
                const flareBell = Math.sin(Math.pow(proxy.t, 0.85) * Math.PI);
                flareEl.style.setProperty('--flare-alpha', (flareBell * 0.72).toFixed(3));
                flareEl.style.setProperty('--flare-scale', (0.35 + proxy.t * 0.90).toFixed(3));
            }
        },
        onComplete: () => {
            if (!switched && onMidCut) onMidCut();
            fadeEl.style.setProperty('--cam-fade', '0');
            if (flareEl) flareEl.style.setProperty('--flare-alpha', '0');
            manualCamFadeTween = null;
        }
    });
}

function setCameraMode(mode, instantWithoutFade = false) {
    if (!['chase', 'cockpit', 'halo', 'pod', 'orbit'].includes(mode)) return;
    if (instantWithoutFade || isCinematicIntroActive || mode === activeCamMode) {
        applyCameraModeImmediate(mode);
        return;
    }
    const accentGlow = mode === 'cockpit'
        ? 'rgba(255, 24, 1, 0.55)'
        : (mode === 'pod' ? 'rgba(255, 183, 0, 0.50)' : 'rgba(0, 210, 255, 0.48)');

    triggerManualCameraShiftFade(() => {
        applyCameraModeImmediate(mode);
        // Snap localCamState cleanly at peak fade-black so camera never clips through 3D car bodywork!
        localCamState.initialized = false;
    }, accentGlow);
}
camPills.forEach((btn) => {
    btn.addEventListener('click', () => setCameraMode(btn.getAttribute('data-cam')));
});

window.addEventListener('pointerdown', (e) => {
    if (activeCamMode !== 'orbit' || isCinematicIntroActive) return;
    if (e.target.closest('button, a, input, textarea, nav, aside, footer, .broadcast-panel, .hud-dock, .scroll-nav-container, #cinema-intro-hud')) return;
    isOrbitDragging = true;
    orbitLastX = e.clientX;
    orbitLastY = e.clientY;
    document.body.classList.add('orbit-dragging');
});
window.addEventListener('pointermove', (e) => {
    if (!isOrbitDragging || activeCamMode !== 'orbit') return;
    const dx = e.clientX - orbitLastX;
    const dy = e.clientY - orbitLastY;
    orbitLastX = e.clientX;
    orbitLastY = e.clientY;
    orbitYaw -= dx * 0.0085;
    orbitPitch = Math.max(0.08, Math.min(1.05, orbitPitch + dy * 0.0065));
}, { passive: true });
window.addEventListener('pointerup', () => {
    if (isOrbitDragging) {
        isOrbitDragging = false;
        document.body.classList.remove('orbit-dragging');
    }
});

// Helper: get current active chapter index [0..5] from current scroll position
function getCurrentChapterIndex() {
    const curY = lenis ? lenis.scroll : (window.scrollY || 0);
    for (let i = CHAPTER_SECTIONS.length - 1; i >= 1; i--) {
        if (curY >= cachedChapterOffsets[i] - cachedViewportH * 0.32) return i;
    }
    return 0;
}

// Helper: step cleanly forward (+1) or backward (-1) across chapters & DRS project bays on ArrowRight / ArrowLeft tap
function stepChapterByArrow(stepDir) {
    refreshLayoutMetrics();
    const curChap = getCurrentChapterIndex();
    // Inside Chapter 04 (#drs sticky straight): step across Bay 01 <-> Bay 02 <-> Bay 03 smoothly along the track!
    if (curChap === 3) {
        const nextBay = activeProjectBay + stepDir;
        if (nextBay >= 0 && nextBay <= 2) {
            setActiveProjectBay(nextBay, false);
            const bayScrollY = cachedChapterOffsets[3] + (nextBay / 2.2) * cachedDrsStickyTravel;
            smoothScrollToTarget(Math.min(cachedMaxScroll, Math.max(0, bayScrollY)), 0.92);
            return;
        }
    }
    const nextChap = Math.max(0, Math.min(CHAPTER_SECTIONS.length - 1, curChap + stepDir));
    if (nextChap === curChap) {
        smoothScrollToTarget(stepDir > 0 ? cachedMaxScroll : 0, 0.92);
        return;
    }
    if (nextChap === 3 && stepDir < 0) {
        // Entering Chapter 04 from Chapter 05 in reverse -> land cleanly at Bay 03 end of DRS straight
        setActiveProjectBay(2, false);
        const bay3Y = cachedChapterOffsets[3] + 0.88 * cachedDrsStickyTravel;
        smoothScrollToTarget(Math.min(cachedMaxScroll, bay3Y), 0.98);
        return;
    }
    smoothScrollToTarget(CHAPTER_SECTIONS[nextChap], 1.02);
}

function engageKeyboardThrottle(dir) {
    stopLapSimulation();
    refreshLayoutMetrics();
    if (!kbActive) {
        kbVirtualScroll = lenis ? lenis.scroll : (window.scrollY || 0);
        kbActive = true;
    }
    kbHeldDir = dir;
    const minKick = cachedMaxScroll / 25.0;
    if (dir > 0 && kbVelocity < minKick) kbVelocity = minKick;
    else if (dir < 0 && kbVelocity > -minKick) kbVelocity = -minKick;
}

// Full 4-Way 60FPS Keyboard Arrow & Shortcut Controller:
// [ArrowDown / ArrowUp] Continuous 60fps smooth throttle & coasting inertia
// [ArrowRight / ArrowLeft] Tap -> smooth chapter/bay glide; Hold -> continuous 60fps forward/reverse throttle
// [PageDown / PageUp / Home / End] Smooth chapter & full-lap navigation
// [1-5] Cameras, [D] DRS, [Space] Simulate Lap, [Esc] Skip Intro
window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/i.test(e.target.tagName)) return;
    if (isCinematicIntroActive) {
        if (e.key === 'Escape' || e.code === 'Space' || e.key === 'Enter') {
            e.preventDefault();
            finishCinematicIntro(true);
        }
        return;
    }
    if (e.key === '1') setCameraMode('chase');
    else if (e.key === '2') setCameraMode('cockpit');
    else if (e.key === '3') setCameraMode('halo');
    else if (e.key === '4') setCameraMode('pod');
    else if (e.key === '5') setCameraMode('orbit');
    else if (e.key === 'd' || e.key === 'D') toggleDrsAeroManual();
    else if (e.code === 'Space' && !(e.target && e.target.closest && e.target.closest('button, a'))) {
        e.preventDefault();
        toggleLapSimulation();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        engageKeyboardThrottle(1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        engageKeyboardThrottle(-1);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.repeat) engageKeyboardThrottle(1);
        else stepChapterByArrow(1);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.repeat) engageKeyboardThrottle(-1);
        else stepChapterByArrow(-1);
    } else if (e.key === 'PageDown') {
        e.preventDefault();
        stepChapterByArrow(1);
    } else if (e.key === 'PageUp') {
        e.preventDefault();
        stepChapterByArrow(-1);
    } else if (e.key === 'Home') {
        e.preventDefault();
        smoothScrollToTarget(0, 1.15);
    } else if (e.key === 'End') {
        e.preventDefault();
        refreshLayoutMetrics();
        smoothScrollToTarget(cachedMaxScroll, 1.15);
    }
});
window.addEventListener('keyup', (e) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && kbHeldDir === 1) kbHeldDir = 0;
    if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && kbHeldDir === -1) kbHeldDir = 0;
});
window.addEventListener('blur', resetKeyboardDrive);

if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => {
        refreshLayoutMetrics();
        if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
    const mainEl = document.querySelector('main');
    if (mainEl) ro.observe(mainEl);
}

let smoothLapProgress = 0;
let prevSmoothProgress = 0;
let smoothSpeedMps = 0;
let throttleSurge = 0;
let smoothSteer = 0;
let smoothPitch = 0;
let smoothRoll = 0;
let displayRPM = 0;
let peakKmhRecorded = 342;
let lastFrameTime = performance.now();

// Choreographed 6-Chapter Broadcast Chase Cam Keys:
// Alternating horizontal screen framing (cShift > 0 frames RB22 on RIGHT when panel is LEFT;
// cShift < 0 frames RB22 on LEFT when panel is RIGHT!) so the car is NEVER covered by UI!
const broadcastCamKeys = [
    [0.00,  4.8,  3.1, 1.44,  1.45], // CH 01 Grid (Panel LEFT -> Car RIGHT, front-3/4 showcase)
    [0.07,  0.2,  4.2, 1.50,  0.40], // Launch sweep past Start/Finish Gantry
    [0.18, -4.9,  2.6, 1.48, -1.45], // CH 02 Turn 1-2 Works Stint (Panel RIGHT -> Car LEFT)
    [0.34, -4.8, -2.5, 1.44,  1.65], // CH 03 Tech Esses Matrix (Panel LEFT -> Car RIGHT)
    [0.50, -5.1,  2.2, 1.42, -1.45], // CH 04 DRS Straight Entry (Panel RIGHT -> Car LEFT, wide open!)
    [0.67, -5.3,  2.4, 1.46, -1.40], // CH 04 DRS Straight Exit under Gantry (Car LEFT, wing visible!)
    [0.80, -4.9, -2.8, 1.50,  1.82], // CH 05 Parabolica Trophies (Panel LEFT -> Car RIGHT)
    [0.94, -4.7,  2.8, 1.50, -1.45], // CH 06 Checkered Flag Comms (Panel RIGHT -> Car LEFT)
    [1.00, -4.6,  2.8, 1.48, -1.45]
];

const steerAxisZ = new THREE.Vector3(0, 0, 1);
const steerDeltaQuat = new THREE.Quaternion();

function stepTitaniumSparks(dt, absSpeed, frame) {
    const emitActive = absSpeed > 12.0 || (isDrsOn && absSpeed > 2.5);
    if (emitActive) {
        const spawnBurst = Math.min(4, 1 + Math.floor(absSpeed / 24) + (isDrsOn ? 1 : 0));
        const backX = -frame.tang.x;
        const backZ = -frame.tang.z;
        for (let b = 0; b < spawnBurst; b++) {
            const sp = sparkPool[sparkSpawnCursor];
            sparkSpawnCursor = (sparkSpawnCursor + 1) % SPARK_COUNT;
            const spreadLat = (Math.random() - 0.5) * 0.55;
            const rearDist = 1.0 + Math.random() * 1.15;
            sp.x = carGroup.position.x + backX * rearDist + frame.right.x * spreadLat;
            sp.y = 0.022 + Math.random() * 0.025;
            sp.z = carGroup.position.z + backZ * rearDist + frame.right.z * spreadLat;

            const ejectSpeed = 4.5 + Math.random() * 7.5 + absSpeed * 0.14;
            const sideKick = (Math.random() - 0.5) * 3.2;
            sp.vx = backX * ejectSpeed + frame.right.x * sideKick;
            sp.vy = 0.72 + Math.random() * 1.85;
            sp.vz = backZ * ejectSpeed + frame.right.z * sideKick;
            sp.maxLife = 0.18 + Math.random() * 0.24;
            sp.life = sp.maxLife;
        }
    }

    const posAttr = sparkGeo.attributes.position;
    const arr = posAttr.array;
    let anyAlive = false;
    for (let i = 0; i < SPARK_COUNT; i++) {
        const sp = sparkPool[i];
        const i6 = i * 6;
        if (sp.life > 0) {
            anyAlive = true;
            sp.life -= dt;
            sp.vy -= 9.8 * dt;
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.z += sp.vz * dt;
            if (sp.y < 0.008) {
                sp.y = 0.008;
                sp.vy = Math.abs(sp.vy) * 0.45;
                sp.vx *= 0.86;
                sp.vz *= 0.86;
            }
            const tailDt = 0.032;
            arr[i6]     = sp.x;
            arr[i6 + 1] = sp.y;
            arr[i6 + 2] = sp.z;
            arr[i6 + 3] = sp.x - sp.vx * tailDt;
            arr[i6 + 4] = Math.max(0.006, sp.y - sp.vy * tailDt);
            arr[i6 + 5] = sp.z - sp.vz * tailDt;
        } else {
            arr[i6] = arr[i6 + 3] = 0;
            arr[i6 + 1] = arr[i6 + 4] = -20;
            arr[i6 + 2] = arr[i6 + 5] = 0;
        }
    }
    if (anyAlive || emitActive) posAttr.needsUpdate = true;
}

// Reusable 60fps Zero-GC Circuit Frame Buffers & Dirty-Checked HUD Cache
const _curCircuitFrame = { pos: new THREE.Vector3(), tang: new THREE.Vector3(), right: new THREE.Vector3(), u: 0 };
const _aheadCircuitFrame = { pos: new THREE.Vector3(), tang: new THREE.Vector3(), right: new THREE.Vector3(), u: 0 };
let _prevHudActiveIdx = -1;
let _prevHudSector = '';
let _prevHudColor = '';
let _prevShownRpm = -1;
let _prevGear = '';
let _prevActiveLeds = -1;
let _prevLiveKmh = -1;
let _prevMinimapPct = -1;
let _prevGText = '';
let _lastFrameDt = 1 / 60;

function stepLapSimulation(nowMs) {
    const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameTime) * 0.001));
    _lastFrameDt = dt;
    lastFrameTime = nowMs;

    if (isCinematicIntroActive) {
        stepCinematicCarRevealAndRollout(nowMs, dt);
        return;
    }
    postIntroParallaxBlend = Math.min(1, postIntroParallaxBlend + dt * 1.6);

    const maxScroll = cachedMaxScroll;

    // A) Advance Auto-Drive Lap Simulation OR 60fps Sub-Pixel Keyboard Arrow Inertia Engine!
    let scrollTop = 0;
    if (isSimulatingLap) {
        const normP = Math.min(1, Math.max(0, simVirtualScroll / maxScroll));
        let cornerSpeedFactor = 1.0;
        if (normP > 0.13 && normP < 0.25) cornerSpeedFactor = 0.62;
        else if (normP > 0.30 && normP < 0.41) cornerSpeedFactor = 0.72;
        else if (normP >= 0.44 && normP <= 0.70) cornerSpeedFactor = 1.18;
        else if (normP > 0.73 && normP < 0.86) cornerSpeedFactor = 0.68;

        const baseScrollPxPerSec = (maxScroll / 34.0) * cornerSpeedFactor;
        simVirtualScroll = Math.min(maxScroll, simVirtualScroll + baseScrollPxPerSec * dt);
        window.scrollTo(0, simVirtualScroll);
        ScrollTrigger.update();
        scrollTop = simVirtualScroll;

        if (simVirtualScroll >= maxScroll - 1) {
            stopLapSimulation();
        }
    } else if (kbActive) {
        if (kbHeldDir !== 0) {
            const targetVel = kbHeldDir * (maxScroll / 15.0);
            kbVelocity += (targetVel - kbVelocity) * (1 - Math.exp(-dt * 9.0));
        } else {
            // Smooth F1 coasting inertia on key release
            kbVelocity *= Math.exp(-dt * 7.8);
            if (Math.abs(kbVelocity) < 1.5) {
                kbVelocity = 0;
                kbActive = false;
                if (lenis) lenis.scrollTo(kbVirtualScroll, { immediate: true });
            }
        }
        if (kbActive) {
            kbVirtualScroll += kbVelocity * dt;
            if (kbVirtualScroll <= 0) {
                kbVirtualScroll = 0;
                if (kbVelocity < 0) kbVelocity = 0;
            } else if (kbVirtualScroll >= maxScroll) {
                kbVirtualScroll = maxScroll;
                if (kbVelocity > 0) kbVelocity = 0;
            }
            window.scrollTo(0, kbVirtualScroll);
            ScrollTrigger.update();
            scrollTop = kbVirtualScroll;
        } else {
            scrollTop = lenis ? lenis.scroll : (window.scrollY || 0);
        }
    } else {
        // Sub-pixel floating-point scroll from Lenis (eliminates 1px integer stair-stepping!)
        scrollTop = Math.max(0, lenis ? lenis.scroll : (window.scrollY || window.pageYOffset || 0));
    }

    // 1. Live normalized page scroll [0, 1] with high-response 60fps exponential damping
    const rawTargetP = (maxScroll - scrollTop <= 1.2)
        ? 1.0
        : Math.min(1, Math.max(0, scrollTop / maxScroll));

    const lerpAlpha = 1 - Math.exp(-dt * 13.5);
    smoothLapProgress += (rawTargetP - smoothLapProgress) * lerpAlpha;
    if (Math.abs(rawTargetP - smoothLapProgress) < 0.000015) smoothLapProgress = rawTargetP;

    // 2. Physical distance travelled & velocity along the 395m FIA Grade-1 Night Grand Prix circuit
    const lapMultiplier = 1.028;
    const prevU = prevSmoothProgress * lapMultiplier;
    const currU = smoothLapProgress * lapMultiplier;
    const deltaU = currU - prevU;
    prevSmoothProgress = smoothLapProgress;

    const deltaMeters = deltaU * circuitTotalLength;
    const instSpeedMps = deltaMeters / dt;
    const prevSpeed = smoothSpeedMps;
    smoothSpeedMps += (instSpeedMps - smoothSpeedMps) * (1 - Math.exp(-dt * 12.5));
    const absSpeed = Math.abs(smoothSpeedMps);
    const accel = (smoothSpeedMps - prevSpeed) / dt;

    // 3. Position & orient the 2026 Red Bull RB22 along circuitCurve (zero-GC pre-allocated frames)
    const frame = sampleCircuitFrame(currU, _curCircuitFrame);
    const aheadFrame = sampleCircuitFrame(currU + 0.012, _aheadCircuitFrame);
    const curvature = frame.tang.x * aheadFrame.tang.z - frame.tang.z * aheadFrame.tang.x;
    const racingLineOffset = Math.max(-2.15, Math.min(2.15, curvature * 6.5));

    carGroup.position.set(
        frame.pos.x + frame.right.x * racingLineOffset,
        0,
        frame.pos.z + frame.right.z * racingLineOffset
    );
    carGroup.rotation.y = Math.atan2(-frame.tang.x, -frame.tang.z);

    // 3b. Automatic FIA DRS Zone Detection on the Back Straight (u in [0.43, 0.70])
    const inDrsZone = (frame.u >= 0.43 && frame.u <= 0.70);
    if (!inDrsZone && manualDrsOverride === null && isDrsOn) {
        setDrsAeroState(false);
    } else if (inDrsZone && manualDrsOverride === null && !isDrsOn && (absSpeed > 1.2 || isSimulatingLap)) {
        setDrsAeroState(true);
    }
    if (!inDrsZone && manualDrsOverride !== null && absSpeed > 8.0 && frame.u > 0.73) {
        manualDrsOverride = null;
        setDrsAeroState(false);
    }

    // 4. Pirelli Wheel Spin + Front Wheel Steering + Live 3D Cockpit Steering Wheel Rotation!
    const drsSpinBoost = isDrsOn ? 1.25 : 1.0;
    const wheelRollAngle = (deltaMeters / 0.34) * drsSpinBoost;
    if (Math.abs(wheelRollAngle) > 0.00001) {
        for (let i = 0; i < wheelElements.length; i++) {
            wheelElements[i].rotateX(wheelRollAngle);
        }
    }

    const targetSteer = Math.max(-0.27, Math.min(0.27, -curvature * 1.4));
    smoothSteer += (targetSteer - smoothSteer) * (1 - Math.exp(-dt * 12));
    for (let i = 0; i < frontSteerPivots.length; i++) {
        frontSteerPivots[i].rotation.y = smoothSteer;
    }
    if (rb22SteerWheelNode && rb22SteerBaseQuat) {
        steerDeltaQuat.setFromAxisAngle(steerAxisZ, -smoothSteer * 2.35);
        rb22SteerWheelNode.quaternion.copy(rb22SteerBaseQuat).multiply(steerDeltaQuat);
    }

    // 5. Chassis Squat/Dive, Lateral G-Force Roll & High-Speed Road Micro-Vibration
    const targetPitch = Math.max(-0.022, Math.min(0.022, -accel * 0.00035));
    const targetRoll = Math.max(-0.028, Math.min(0.028, curvature * Math.min(1, absSpeed / 20) * 0.14));
    smoothPitch += (targetPitch - smoothPitch) * (1 - Math.exp(-dt * 11));
    smoothRoll += (targetRoll - smoothRoll) * (1 - Math.exp(-dt * 11));
    const roadBuzz = Math.min(1, absSpeed / 32) * Math.sin(nowMs * 0.055) * 0.0032;
    chassisDynamicsGroup.position.y = roadBuzz;
    chassisDynamicsGroup.rotation.x = smoothPitch;
    chassisDynamicsGroup.rotation.z = smoothRoll;

    // 6. Glowing Carbon-Ceramic Brake Discs in Turn 1 & Parabolica Braking Zones
    const uMod = frame.u;
    const inBrakeZone = (uMod > 0.075 && uMod < 0.21) || (uMod > 0.56 && uMod < 0.72);
    const decelHeat = Math.max(0, -Math.abs(instSpeedMps) + absSpeed) * 0.09;
    const zoneHeat = (inBrakeZone && absSpeed > 1.8) ? Math.min(2.6, absSpeed * 0.11 + (isSimulatingLap ? 1.4 : 0)) : 0;
    const targetGlow = Math.min(2.8, zoneHeat + decelHeat);
    const brakeRate = 1 - Math.exp(-dt * 7.5);
    for (let i = 0; i < rb22BrakeDiscMats.length; i++) {
        const m = rb22BrakeDiscMats[i];
        m.emissiveIntensity += (targetGlow - m.emissiveIntensity) * brakeRate;
    }
    carBrakeGlowLevel += (targetGlow * 0.55 - carBrakeGlowLevel) * brakeRate;

    // 7. 3D Titanium Sparks & Aero Slipstream Streaks
    stepTitaniumSparks(dt, isSimulatingLap ? Math.max(absSpeed, 18) : absSpeed, frame);

    const effAeroSpeed = isSimulatingLap ? Math.max(absSpeed, 22) : absSpeed;
    const streakIntensity = Math.min(0.42, (effAeroSpeed / 100) * 0.28 + (isDrsOn ? 0.20 : 0));
    aeroStreakMat.opacity += (streakIntensity - aeroStreakMat.opacity) * (1 - Math.exp(-dt * 8.0));
    if (aeroStreakMat.opacity > 0.01) {
        const posAttr = aeroStreakGeo.attributes.position;
        const flowStep = (14 + effAeroSpeed * 0.65 + (isDrsOn ? 22 : 0)) * dt;
        for (let i = 0; i < aeroStreakCount; i++) {
            const s = aeroSeed[i];
            s.z += flowStep;
            if (s.z > 3.6) s.z = -3.6;
            const i6 = i * 6;
            posAttr.array[i6]     = s.rx;
            posAttr.array[i6 + 1] = s.ry;
            posAttr.array[i6 + 2] = s.z;
            posAttr.array[i6 + 3] = s.rx;
            posAttr.array[i6 + 4] = s.ry;
            posAttr.array[i6 + 5] = s.z + s.len;
        }
        posAttr.needsUpdate = true;
    }

    // 8. 5-Mode 60fps Camera Rig (Chase · Driver Cockpit · Halo T-Cam · Wheel Pod · 360° Orbit)
    const targetSurge = Math.max(-0.85, Math.min(1.75, smoothSpeedMps * 0.026));
    throttleSurge += (targetSurge - throttleSurge) * (1 - Math.exp(-dt * 9.0));

    {
        const p = smoothLapProgress;
        let desF = 4.8, desR = 3.1, desU = 1.44, desLookF = 0.0, desLookR = 0.0, desLookU = 0.52;
        let baseModeFov = 56;

        if (activeCamMode === 'cockpit') {
            desF = 0.08;
            desR = 0.0;
            desU = 0.77 + roadBuzz * 1.5;
            desLookF = 11.5;
            desLookR = -smoothSteer * 9.5;
            desLookU = 0.58;
            baseModeFov = 68;
        } else if (activeCamMode === 'halo') {
            desF = -0.18;
            desR = 0.0;
            desU = 1.18 + roadBuzz * 1.3;
            desLookF = 18.5;
            desLookR = -smoothSteer * 11.0;
            desLookU = 0.68;
            baseModeFov = 65;
        } else if (activeCamMode === 'pod') {
            desF = -0.45;
            desR = -1.36;
            desU = 0.58 + roadBuzz * 1.2;
            desLookF = 9.5;
            desLookR = -0.42 - smoothSteer * 4.5;
            desLookU = 0.44;
            baseModeFov = 63;
        } else if (activeCamMode === 'orbit') {
            if (!isOrbitDragging && !PREFERS_REDUCED_MOTION) {
                orbitYaw += dt * 0.24;
            }
            const horizR = orbitRadius * Math.cos(orbitPitch);
            desF = Math.cos(orbitYaw) * horizR;
            desR = Math.sin(orbitYaw) * horizR;
            desU = Math.max(0.55, orbitRadius * Math.sin(orbitPitch) + 0.35);
            desLookF = 0.05;
            desLookR = 0.0;
            desLookU = 0.48;
            baseModeFov = 52;
        } else {
            let cf = broadcastCamKeys[0][1], cr = broadcastCamKeys[0][2], ch = broadcastCamKeys[0][3], cShift = broadcastCamKeys[0][4];
            for (let i = 0; i < broadcastCamKeys.length - 1; i++) {
                const a = broadcastCamKeys[i], b = broadcastCamKeys[i + 1];
                if (p >= a[0] && p <= b[0]) {
                    const t = (p - a[0]) / (b[0] - a[0]);
                    const e = t * t * (3 - 2 * t);
                    cf     = a[1] + (b[1] - a[1]) * e;
                    cr     = a[2] + (b[2] - a[2]) * e;
                    ch     = a[3] + (b[3] - a[3]) * e;
                    cShift = a[4] + (b[4] - a[4]) * e;
                    break;
                }
            }
            const chaseBlend = Math.max(0, Math.min(1, -cf / 3.0));
            const surgePull = -throttleSurge * (0.25 + 0.75 * chaseBlend);

            desF = cf + surgePull;
            desR = cr;
            desU = ch;

            const tmpCamX = frame.tang.x * desF + frame.right.x * desR;
            const tmpCamZ = frame.tang.z * desF + frame.right.z * desR;
            const vLen = Math.hypot(-tmpCamX, -tmpCamZ) || 1;
            const camRightX = tmpCamZ / vLen;
            const camRightZ = -tmpCamX / vLen;
            const responsiveScale = cachedViewportW < 768 ? 0.18 : 1.0;
            const shiftMeters = cShift * responsiveScale;

            const worldOffX = -camRightX * shiftMeters + frame.tang.x * (throttleSurge * 0.35);
            const worldOffZ = -camRightZ * shiftMeters + frame.tang.z * (throttleSurge * 0.35);
            desLookF = worldOffX * frame.tang.x + worldOffZ * frame.tang.z;
            desLookR = worldOffX * frame.right.x + worldOffZ * frame.right.z;
            desLookU = 0.52;
        }

        if (!localCamState.initialized) {
            localCamState.f = desF; localCamState.r = desR; localCamState.u = desU;
            localCamState.lf = desLookF; localCamState.lr = desLookR; localCamState.lu = desLookU;
            localCamState.initialized = true;
        } else {
            const followSpeed = (activeCamMode === 'cockpit' || activeCamMode === 'halo' || activeCamMode === 'pod') ? 18.0 : 11.5;
            const camFollowRate = 1 - Math.exp(-dt * followSpeed);
            localCamState.f  += (desF - localCamState.f) * camFollowRate;
            localCamState.r  += (desR - localCamState.r) * camFollowRate;
            localCamState.u  += (desU - localCamState.u) * camFollowRate;
            localCamState.lf += (desLookF - localCamState.lf) * camFollowRate;
            localCamState.lr += (desLookR - localCamState.lr) * camFollowRate;
            localCamState.lu += (desLookU - localCamState.lu) * camFollowRate;
        }

        targetCameraPosition.set(
            carGroup.position.x + frame.tang.x * localCamState.f + frame.right.x * localCamState.r,
            localCamState.u,
            carGroup.position.z + frame.tang.z * localCamState.f + frame.right.z * localCamState.r
        );
        targetLookAt.set(
            carGroup.position.x + frame.tang.x * localCamState.lf + frame.right.x * localCamState.lr,
            localCamState.lu,
            carGroup.position.z + frame.tang.z * localCamState.lf + frame.right.z * localCamState.lr
        );

        if (!isCinematicIntroActive) {
            const speedFovAdd = activeCamMode === 'orbit' ? 0 : Math.min(8.0, absSpeed * 0.13) + (isDrsOn ? 4.5 : 0);
            const targetFov = baseModeFov + speedFovAdd;
            if (Math.abs(camera.fov - targetFov) > 0.05) {
                camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-dt * 7.5));
                camera.updateProjectionMatrix();
            }
        }
    }

    // 9. Zero-Reflow Cached 6-Chapter Indicators, Sticky DRS Project Bays, Minimap & Telemetry HUD
    const offsets = cachedChapterOffsets;

    // Auto-scrub Bay 01 -> Bay 02 -> Bay 03 across #drs 240vh sticky DRS straight!
    if (nowMs > manualBayLockUntil) {
        const stickyTravel = cachedDrsStickyTravel;
        if (scrollTop >= offsets[3] - 20 && scrollTop <= offsets[3] + stickyTravel + 20) {
            const drsP = Math.min(0.999, Math.max(0, (scrollTop - offsets[3]) / stickyTravel));
            const autoBayIdx = Math.floor(drsP * 3);
            setActiveProjectBay(autoBayIdx, false);
        }
    }

    if (customProgressBar) {
        const lastIdx = CHAPTER_SECTIONS.length - 1;
        let progressFrac = 0;
        if (scrollTop <= offsets[0]) {
            progressFrac = 0;
        } else if (scrollTop >= offsets[lastIdx]) {
            progressFrac = 1;
        } else {
            let interval = 0;
            for (let i = 0; i < lastIdx; i++) {
                if (scrollTop >= offsets[i] && scrollTop < offsets[i + 1]) {
                    interval = i;
                    break;
                }
            }
            const startOffset = offsets[interval];
            const endOffset = offsets[interval + 1];
            const localP = (scrollTop - startOffset) / (endOffset - startOffset || 1);
            progressFrac = Math.max(0, Math.min(1, (interval + localP) / lastIdx));
        }
        customProgressBar.style.transform = `scaleY(${progressFrac.toFixed(4)})`;
    }

    let activeIdx = 0;
    for (let i = CHAPTER_SECTIONS.length - 1; i >= 1; i--) {
        if (scrollTop >= offsets[i] - cachedViewportH * 0.32) {
            activeIdx = i;
            break;
        }
    }

    if (activeIdx !== _prevHudActiveIdx) {
        _prevHudActiveIdx = activeIdx;
        scrollNavItems.forEach((navItem, idx) => {
            if (idx === activeIdx) navItem.classList.add('active');
            else navItem.classList.remove('active');
        });
        updateHUDTracker(activeIdx);
        updateStoryNarrator(activeIdx);
    }

    const chapterInfo = CHAPTER_STORY_DATA[activeIdx] || CHAPTER_STORY_DATA[0];
    const currentSectorColor = chapterInfo.color;
    if (activePath && minimapCar && minimapPathLength > 0) {
        const lutIdx = Math.min(MINIMAP_LUT_STEPS - 1, Math.max(0, Math.floor((smoothLapProgress % 1) * MINIMAP_LUT_STEPS)));
        if (lutIdx !== _prevMinimapLutIdx) {
            _prevMinimapLutIdx = lutIdx;
            if (minimapCarGroupEl) {
                minimapCarGroupEl.setAttribute(
                    'transform',
                    `translate(${minimapLutX[lutIdx].toFixed(1)}, ${minimapLutY[lutIdx].toFixed(1)}) rotate(${minimapLutDeg[lutIdx].toFixed(1)})`
                );
            }
            activePath.style.strokeDashoffset = (minimapPathLength * (1 - smoothLapProgress)).toFixed(2);
        }

        if (currentSectorColor !== _prevHudColor) {
            _prevHudColor = currentSectorColor;
            if (minimapCarPingEl) minimapCarPingEl.setAttribute('stroke', currentSectorColor);
            activePath.style.stroke = currentSectorColor;
            minimapCar.style.stroke = currentSectorColor;
        }
    }
    if (chapterInfo.sector !== _prevHudSector) {
        _prevHudSector = chapterInfo.sector;
        sectorChipEls.forEach((chip) => {
            if (chip.getAttribute('data-sec-chip') === chapterInfo.sector) chip.classList.add('active');
            else chip.classList.remove('active');
        });
    }

    // Realistic Speed, RPM & 8-Speed Seamless Gearbox Simulation
    const simBaseKmh = isSimulatingLap
        ? (inDrsZone ? 338 : (inBrakeZone ? 168 : 262))
        : 0;
    const rawKmh = Math.max(
        simBaseKmh,
        (absSpeed > 0.22 || isDrsOn)
            ? Math.min(352, Math.round(absSpeed * 8.4 + (isDrsOn ? (absSpeed > 0.3 ? 38 : 18) : 0)))
            : 0
    );
    const liveKmh = Math.min(352, Math.round(rawKmh));
    if (liveKmh > peakKmhRecorded) {
        peakKmhRecorded = liveKmh;
        if (summaryVmaxEl) summaryVmaxEl.textContent = `${peakKmhRecorded} KM/H`;
    }

    let gear = 'N';
    let gearRatioRpm = 0;
    if (liveKmh > 3) {
        if (liveKmh < 75) { gear = '2'; gearRatioRpm = 6200 + (liveKmh / 75) * 5600; }
        else if (liveKmh < 125) { gear = '3'; gearRatioRpm = 7800 + ((liveKmh - 75) / 50) * 4400; }
        else if (liveKmh < 175) { gear = '4'; gearRatioRpm = 8600 + ((liveKmh - 125) / 50) * 3800; }
        else if (liveKmh < 220) { gear = '5'; gearRatioRpm = 9200 + ((liveKmh - 175) / 45) * 3300; }
        else if (liveKmh < 265) { gear = '6'; gearRatioRpm = 9800 + ((liveKmh - 220) / 45) * 2900; }
        else if (liveKmh < 308 && !isDrsOn) { gear = '7'; gearRatioRpm = 10400 + ((liveKmh - 265) / 43) * 2500; }
        else { gear = '8'; gearRatioRpm = 11000 + Math.min(2450, Math.max(0, liveKmh - 295) * 44); }
    }

    const targetRPM = liveKmh > 3 ? Math.min(13500, Math.round(gearRatioRpm)) : 0;
    displayRPM += (targetRPM - displayRPM) * (1 - Math.exp(-dt * 13));
    const shownRPM = Math.round(displayRPM);
    if (shownRPM !== _prevShownRpm) {
        _prevShownRpm = shownRPM;
        if (speedo) speedo.textContent = shownRPM;
        if (speedBar) speedBar.style.transform = `scaleX(${(shownRPM / 13500).toFixed(4)})`;
    }
    if (gear !== _prevGear) {
        _prevGear = gear;
        if (gearIndicator) gearIndicator.textContent = gear;
    }

    const rpmFrac = shownRPM / 13500;
    const activeLedsCount = Math.floor(rpmFrac * ledElements.length);
    if (activeLedsCount !== _prevActiveLeds) {
        _prevActiveLeds = activeLedsCount;
        ledElements.forEach((led, idx) => {
            if (idx < activeLedsCount) led.classList.add('active');
            else led.classList.remove('active');
        });
    }
    for (let i = 0; i < rb22CockpitShiftMats.length; i++) {
        rb22CockpitShiftMats[i].emissiveIntensity = rpmFrac > 0.55 ? (rpmFrac - 0.55) * 5.0 : 0.0;
    }

    if (liveKmh !== _prevLiveKmh) {
        _prevLiveKmh = liveKmh;
        const kmhPad = String(liveKmh).padStart(3, '0');
        if (navKmhEl) navKmhEl.textContent = kmhPad;
        if (hudKmhEl) hudKmhEl.textContent = kmhPad + ' KM/H';
        if (mobKmhEl) mobKmhEl.textContent = kmhPad;
    }

    const pctRounded = Math.round(smoothLapProgress * 100);
    if (pctRounded !== _prevMinimapPct) {
        _prevMinimapPct = pctRounded;
        if (minimapPctEl) minimapPctEl.textContent = String(pctRounded).padStart(2, '0') + '%';
    }

    if (gDotEl && gValEl) {
        const effGSpeed = Math.max(absSpeed, liveKmh / 9.0);
        const latG = Math.max(-4.8, Math.min(4.8, curvature * effGSpeed * 0.42));
        const lonG = Math.max(-5.2, Math.min(3.4, inBrakeZone && liveKmh > 60 ? -3.8 : accel * 0.025));
        const totalG = Math.min(5.4, Math.hypot(latG, lonG));
        const gx = Math.max(-8, Math.min(8, latG * 1.7));
        const gy = Math.max(-8, Math.min(8, -lonG * 1.6));
        gDotEl.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
        const gText = totalG.toFixed(1) + 'G';
        if (gText !== _prevGText) {
            _prevGText = gText;
            gValEl.textContent = gText;
        }
    }

    if (lapTimerEl && lapStartMs && (nowMs - _prevLapTimerMs >= 48)) {
        _prevLapTimerMs = nowMs;
        const lapElapsed = Math.max(0, (nowMs - lapStartMs) * 0.001);
        const mins = Math.floor(lapElapsed / 60);
        const secs = (lapElapsed % 60).toFixed(3).padStart(6, '0');
        lapTimerEl.textContent = `${mins}:${secs}`;
    }

    if (warpOverlayEl && !PREFERS_REDUCED_MOTION) {
        const warpAlpha = Math.min(0.88, (liveKmh / 350) * 0.62 + (isDrsOn ? 0.26 : 0));
        if (Math.abs(warpAlpha - _prevWarpAlpha) >= 0.015 || (warpAlpha === 0 && _prevWarpAlpha !== 0)) {
            _prevWarpAlpha = warpAlpha;
            warpOverlayEl.style.opacity = warpAlpha.toFixed(3);
        }
    }
}

// --- PANEL ENTRANCE REVEALS ACROSS ALL 6 CHAPTERS ---
function nonCornerRows(panel) {
    return Array.prototype.slice.call(panel.children)
        .filter((c) => !/corner-accent/.test(c.className || ''));
}
function revealPanel(selector, dir, triggerEl) {
    const panel = document.querySelector(selector);
    if (!panel) return;
    const st = { trigger: triggerEl || panel, start: 'top 84%', toggleActions: 'play none none reverse' };
    gsap.from(panel, { x: dir * 75, autoAlpha: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: st });
    gsap.from(nonCornerRows(panel), {
        y: 22, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out', delay: 0.1, scrollTrigger: st
    });
}

revealPanel('#stint .broadcast-panel', 1);
revealPanel('#pit .broadcast-panel', -1);
revealPanel('#drs .broadcast-panel', 1, '#drs');
revealPanel('#trophies .broadcast-panel', -1);
revealPanel('#podium .broadcast-panel', 1);

const heroPanel = document.getElementById('hero-content');
let heroRevealTween = null;
let heroRowTween = null;
let heroScrubMounted = false;

function mountHeroScrollScrub() {
    if (heroScrubMounted || !heroPanel) return;
    heroScrubMounted = true;
    gsap.set(heroPanel, { x: 0, y: 0, opacity: 1, visibility: 'visible' });
    gsap.fromTo(
        heroPanel,
        { opacity: 1, y: 0 },
        {
            opacity: 0,
            y: -70,
            immediateRender: false,
            scrollTrigger: {
                trigger: '#grid',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        }
    );
    if (window.ScrollTrigger) ScrollTrigger.refresh();
}

function playHeroReveal() {
    if (!heroPanel) return;
    heroRevealTween = gsap.fromTo(
        heroPanel,
        { x: -80, y: 0, opacity: 0 },
        {
            x: 0,
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: 'power3.out',
            onComplete: () => {
                heroRevealTween = null;
                mountHeroScrollScrub();
            }
        }
    );
    heroRowTween = gsap.from(nonCornerRows(heroPanel), {
        y: 20,
        autoAlpha: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: 'power2.out',
        delay: 0.08,
        onComplete: () => { heroRowTween = null; }
    });
}

window.addEventListener('scroll', () => {
    if (!heroScrubMounted && window.scrollY > 2 && !document.documentElement.classList.contains('f1-scroll-locked')) {
        if (heroRevealTween) { heroRevealTween.progress(1).kill(); heroRevealTween = null; }
        if (heroRowTween) { heroRowTween.progress(1).kill(); heroRowTween = null; }
        mountHeroScrollScrub();
    }
}, { passive: true });

function updateHUDTracker(activeIdx) {
    laps.forEach((lap, idx) => {
        if (idx === activeIdx) {
            lap.className = 'hud-lap border border-[#ff1801] px-2 py-1 text-white bg-[#ff1801]/15 rounded-xs cursor-pointer transition-all';
        } else {
            lap.className = 'hud-lap border border-gray-800 px-2 py-1 text-gray-400 rounded-xs cursor-pointer transition-all hover:border-gray-600';
        }
    });
}

// --- CHAPTER 03 PIRELLI TYRE GAUGE SCROLL-LINKED SWEEP ---
(function initTyreGaugeTelemetry() {
    const arcs = document.querySelectorAll('.tyre-gauge-arc');
    const pcts = document.querySelectorAll('.tyre-pct');
    if (!arcs.length) return;

    function animateGauges() {
        arcs.forEach((arc, i) => {
            const target = Number(arc.getAttribute('data-gauge-target')) || 88;
            const proxy = { v: 0 };
            gsap.to(proxy, {
                v: target,
                duration: 1.05,
                delay: i * 0.07,
                ease: 'power3.out',
                onUpdate: () => {
                    arc.setAttribute('stroke-dasharray', `${proxy.v.toFixed(1)} 100`);
                    if (pcts[i]) pcts[i].textContent = String(Math.round(proxy.v));
                }
            });
        });
    }

    ScrollTrigger.create({
        trigger: '#pit',
        start: 'top 78%',
        onEnter: animateGauges,
        onEnterBack: animateGauges
    });
})();

// --- ZERO-REFLOW 60FPS CARBON SPOTLIGHT HOVER (CUSTOM CURSOR REMOVED FOR NATIVE OS POINTER) ---
(function initCarbonCardSpotlight() {
    document.querySelectorAll('.spotlight-card').forEach((card) => {
        let cachedRect = null;
        card.addEventListener('pointerenter', () => {
            cachedRect = card.getBoundingClientRect();
        }, { passive: true });
        card.addEventListener('pointermove', (e) => {
            if (!cachedRect) cachedRect = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${(e.clientX - cachedRect.left).toFixed(1)}px`);
            card.style.setProperty('--my', `${(e.clientY - cachedRect.top).toFixed(1)}px`);
        }, { passive: true });
        card.addEventListener('pointerleave', () => {
            cachedRect = null;
        }, { passive: true });
    });
})();

// =========================================================================
//  5-SHOT IMAX DIRECTOR'S CUT CAR REVEAL, OPTICAL FADES & TRACK ROLLOUT
//  Shot 01: Darkness Awakening, Spotlight Ignition & Carbon Nosecone Dolly
//  Shot 02: Ultra-Low Pirelli Rim, Carbon Brake Duct & Bargeboard Glide
//  Shot 03: Over-the-Halo Cockpit Crane & Live 3D Steering Wheel Ignition
//  Shot 04: Low Rear Diffuser, Flashing Rain Light & 3D DRS Wing Snap
//  Shot 05: Pit-Exit Green Light -> Russian-Arm Chase -> P1 Pole Position
// =========================================================================
function computePoleGridRestingState() {
    const f0 = sampleCircuitFrame(0);
    const fAhead = sampleCircuitFrame(0.012);
    const curv0 = f0.tang.x * fAhead.tang.z - f0.tang.z * fAhead.tang.x;
    const lat0 = Math.max(-2.15, Math.min(2.15, curv0 * 6.5));
    return {
        frame: f0,
        carX: f0.pos.x + f0.right.x * lat0,
        carZ: f0.pos.z + f0.right.z * lat0,
        yaw: Math.atan2(-f0.tang.x, -f0.tang.z)
    };
}

const poleRestingState = computePoleGridRestingState();
const PIT_STAGING_POS = new THREE.Vector3(-21.5, 0, 26.15);

// Reuse the 2 dynamic PointLights as 3D Moving Studio Sculpting Lights during Car Reveal (keeps NUM_POINT_LIGHTS=2!)
const cinemaKeyLight = stadiumNearLight;
const cinemaRimLight = carAuraLight;

// Smooth S-curve rollout spline from Pit-Exit Staging Box onto Main Straight P1 Pole Position
const pitRolloutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(PIT_STAGING_POS.x, 0, PIT_STAGING_POS.z),
    new THREE.Vector3(-17.4, 0, 26.90),
    new THREE.Vector3(-12.4, 0, 30.25),
    new THREE.Vector3( -7.2, 0, 33.30),
    new THREE.Vector3( -3.1, 0, poleRestingState.carZ),
    new THREE.Vector3(poleRestingState.carX, 0, poleRestingState.carZ)
], false, 'centripetal', 0.5);

const INTRO_SHOT_CUTS = [0.00, 2.60, 5.15, 7.70, 10.25, 14.00];
const INTRO_TOTAL_SEC = INTRO_SHOT_CUTS[INTRO_SHOT_CUTS.length - 1];

let introPageOpenMs = performance.now();
let introTimelineStartMs = 0;
let introModelReady = rb22ModelLoaded;
let introModelFailed = false;
let introGpuWarmupFrames = rb22ModelLoaded ? 0 : 3;
let introDrsOpenedOnce = false;
let introDrsClosedOnce = false;
let introPitGreenTriggered = false;
let introActiveShotIdx = -1;
let targetCameraRollRad = 0;
let currentCameraRollRad = 0;
const prevIntroCarPos = new THREE.Vector3().copy(PIT_STAGING_POS);

const cinemaFadeEl = document.getElementById('cinema-cam-fade');
const cinemaFlareEl = document.getElementById('cinema-flare-streak');
const cinemaProgressEl = document.getElementById('cinema-progress-fill');
const skipCinemaBtnEl = document.getElementById('skip-cinematic-btn');

const CINEMA_SHOT_FLARES = [
    'rgba(255, 48, 12, 0.50)',
    'rgba(255, 183, 0, 0.48)',
    'rgba(0, 210, 255, 0.50)',
    'rgba(255, 24, 1, 0.52)',
    'rgba(16, 185, 129, 0.58)'
];

function setCinemaHudShot(shotIdx) {
    if (shotIdx === introActiveShotIdx) return;
    introActiveShotIdx = shotIdx;
    const flareColor = CINEMA_SHOT_FLARES[shotIdx] || CINEMA_SHOT_FLARES[0];
    if (cinemaFlareEl) cinemaFlareEl.style.setProperty('--flare-glow', flareColor);
}

function updateIntroShotFadeAndTitleEnvelope(t, shotIdx) {
    const tStart = INTRO_SHOT_CUTS[shotIdx];
    const tEnd = INTRO_SHOT_CUTS[shotIdx + 1];
    const localT = t - tStart;
    const remT = tEnd - t;

    const fadeInDur = (shotIdx === 0) ? 0.85 : 0.54;
    const fadeOutDur = (shotIdx === INTRO_SHOT_CUTS.length - 2) ? 0.0 : 0.42;

    let fadeBlack = 0;
    if (localT < fadeInDur) {
        const u = Math.max(0, Math.min(1, localT / fadeInDur));
        const e = u * u * (3 - 2 * u);
        fadeBlack = (1 - e) * (shotIdx === 0 ? 1.0 : 0.97);
    } else if (fadeOutDur > 0 && remT < fadeOutDur) {
        const u = Math.max(0, Math.min(1, 1 - (remT / fadeOutDur)));
        const e = u * u * (3 - 2 * u);
        fadeBlack = e * 0.97;
    }

    if (cinemaFadeEl) {
        cinemaFadeEl.style.setProperty('--cam-fade', fadeBlack.toFixed(3));
    }

    // Subtle Anamorphic Horizontal Lens-Flare Streak on camera-shift fade-in
    if (cinemaFlareEl) {
        let flareAlpha = 0;
        let flareScale = 0.45;
        if (localT < 0.72) {
            const fu = localT / 0.72;
            flareAlpha = Math.sin(fu * Math.PI) * (shotIdx === 4 ? 0.88 : 0.70);
            flareScale = 0.36 + fu * 0.88;
        }
        cinemaFlareEl.style.setProperty('--flare-alpha', flareAlpha.toFixed(3));
        cinemaFlareEl.style.setProperty('--flare-scale', flareScale.toFixed(3));
    }
}

function blockIntroScroll(e) {
    if (isCinematicIntroActive) e.preventDefault();
}
function keepLockedDuringIntro() {
    if (isCinematicIntroActive && window.scrollY !== 0) window.scrollTo(0, 0);
}
window.addEventListener('wheel', blockIntroScroll, { passive: false });
window.addEventListener('touchmove', blockIntroScroll, { passive: false });
window.addEventListener('scroll', keepLockedDuringIntro, { passive: true });

function notifyCarModelReadyForIntro() {
    introModelReady = true;
    // Render 3 real WebGL frames behind closed 100% black shutter so GPU texture/shader upload finishes with zero stutter!
    if (isCinematicIntroActive && introTimelineStartMs === 0) {
        introGpuWarmupFrames = 3;
    }
}
function notifyCarModelFailedForIntro() {
    introModelFailed = true;
    introGpuWarmupFrames = 0;
}

function startCinematicCarReveal() {
    stopLapSimulation();
    if (manualCamFadeTween) {
        manualCamFadeTween.kill();
        manualCamFadeTween = null;
    }
    isCinematicIntroActive = true;
    postIntroParallaxBlend = 0;
    introPageOpenMs = performance.now();
    introModelReady = rb22ModelLoaded;
    introGpuWarmupFrames = introModelReady ? 1 : 3;
    introTimelineStartMs = 0;
    introDrsOpenedOnce = false;
    introDrsClosedOnce = false;
    introPitGreenTriggered = false;
    introActiveShotIdx = -1;
    targetCameraRollRad = -0.042;
    currentCameraRollRad = -0.042;

    setCameraMode('chase', true);
    manualDrsOverride = null;
    setDrsAeroState(false);

    // Configure the 2 shared PointLights for Studio Car Reveal Sculpting
    cinemaKeyLight.color.setHex(0xfff1dc);
    cinemaKeyLight.distance = 13.5;
    cinemaKeyLight.decay = 1.85;
    cinemaRimLight.color.setHex(0x52c8ff);
    cinemaRimLight.distance = 13.5;
    cinemaRimLight.decay = 1.85;

    // Start from velvet black so first frame opens like a cinema projector shutter!
    if (cinemaFadeEl) cinemaFadeEl.style.setProperty('--cam-fade', '1');
    if (cinemaFlareEl) cinemaFlareEl.style.setProperty('--flare-alpha', '0');
    if (skipCinemaBtnEl) skipCinemaBtnEl.style.opacity = '0';

    // Reset scroll & lap progress to 0 BEFORE locking overflow so reload never restores old scroll offset
    resetKeyboardDrive();
    document.documentElement.classList.remove('f1-scroll-locked');
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
    if (lenis) {
        lenis.scrollTo(0, { immediate: true });
        lenis.stop();
    }
    smoothLapProgress = 0;
    prevSmoothProgress = 0;
    smoothSpeedMps = 0;
    throttleSurge = 0;

    // Reset FIA Pit-Exit Light to Red Hold & Overhead Gantry Red Hold
    if (pitExitBulbMat) pitExitBulbMat.color.setHex(0xff1801);
    if (pitExitHaloSprite) pitExitHaloSprite.material.color.setHex(0xff1801);
    gantryStartLightBulbs.forEach((m) => m.color.setHex(0xff1a04));
    gantryStartLightSprites.forEach((s) => { s.visible = true; });

    // Park RB22 inside the Pit-Exit Staging Box facing +X
    carGroup.position.copy(PIT_STAGING_POS);
    carGroup.rotation.y = -Math.PI / 2;
    prevIntroCarPos.copy(PIT_STAGING_POS);
    chassisDynamicsGroup.position.set(0, 0, 0);
    chassisDynamicsGroup.rotation.set(0, 0, 0);

    document.documentElement.classList.add('f1-scroll-locked');
    document.body.classList.add('f1-cinematic-intro');
    if (cinemaProgressEl) cinemaProgressEl.style.transform = 'scaleX(0)';
    setCinemaHudShot(0);
}

function seedChaseCameraAtPoleGrid() {
    const f0 = poleRestingState.frame;
    const desF = broadcastCamKeys[0][1];
    const desR = broadcastCamKeys[0][2];
    const desU = broadcastCamKeys[0][3];
    const cShift = broadcastCamKeys[0][4];

    const tmpCamX = f0.tang.x * desF + f0.right.x * desR;
    const tmpCamZ = f0.tang.z * desF + f0.right.z * desR;
    const vLen = Math.hypot(-tmpCamX, -tmpCamZ) || 1;
    const camRightX = tmpCamZ / vLen;
    const camRightZ = -tmpCamX / vLen;
    const responsiveScale = cachedViewportW < 768 ? 0.18 : 1.0;
    const shiftMeters = cShift * responsiveScale;
    const worldOffX = -camRightX * shiftMeters;
    const worldOffZ = -camRightZ * shiftMeters;
    const desLookF = worldOffX * f0.tang.x + worldOffZ * f0.tang.z;
    const desLookR = worldOffX * f0.right.x + worldOffZ * f0.right.z;

    localCamState.f = desF;
    localCamState.r = desR;
    localCamState.u = desU;
    localCamState.lf = desLookF;
    localCamState.lr = desLookR;
    localCamState.lu = 0.52;
    localCamState.initialized = true;

    targetCameraPosition.set(
        poleRestingState.carX + f0.tang.x * desF + f0.right.x * desR,
        desU,
        poleRestingState.carZ + f0.tang.z * desF + f0.right.z * desR
    );
    targetLookAt.set(
        poleRestingState.carX + f0.tang.x * desLookF + f0.right.x * desLookR,
        0.52,
        poleRestingState.carZ + f0.tang.z * desLookF + f0.right.z * desLookR
    );
    camera.fov = 56;
    camera.updateProjectionMatrix();
}

function finishCinematicIntro(wasSkipped = false) {
    if (!isCinematicIntroActive) return;

    const finalizeToPortfolio = () => {
        isCinematicIntroActive = false;
        targetCameraRollRad = 0;
        currentCameraRollRad = 0;
        camera.up.set(0, 1, 0);
        spotlight.intensity = 1.85;
        stadiumNearLight.color.setHex(0xfff0d8);
        stadiumNearLight.intensity = 1.15;
        stadiumNearLight.distance = 34;
        stadiumNearLight.decay = 1.75;
        carAuraLight.color.setHex(0xff1400);
        carAuraLight.intensity = 0.85;
        carAuraLight.distance = 7.5;
        carAuraLight.decay = 1.9;

        // Place RB22 cleanly at exact P1 Pole Position on the Main Straight
        carGroup.position.set(poleRestingState.carX, 0, poleRestingState.carZ);
        carGroup.rotation.y = poleRestingState.yaw;
        chassisDynamicsGroup.position.set(0, 0, 0);
        chassisDynamicsGroup.rotation.set(0, 0, 0);
        smoothSteer = 0;
        smoothPitch = 0;
        smoothRoll = 0;
        for (let i = 0; i < frontSteerPivots.length; i++) frontSteerPivots[i].rotation.y = 0;
        if (rb22SteerWheelNode && rb22SteerBaseQuat) rb22SteerWheelNode.quaternion.copy(rb22SteerBaseQuat);
        for (let i = 0; i < rb22BrakeDiscMats.length; i++) rb22BrakeDiscMats[i].emissiveIntensity = 0;
        carBrakeGlowLevel = 0;
        rb22CockpitShiftMats.forEach((m) => { m.emissiveIntensity = 0; });

        manualDrsOverride = null;
        setDrsAeroState(false);
        turnOffGantryStartLights();
        if (pitExitBulbMat) pitExitBulbMat.color.setHex(0x10b981);
        if (pitExitHaloSprite) pitExitHaloSprite.material.color.setHex(0x10b981);

        seedChaseCameraAtPoleGrid();
        lapStartMs = performance.now();

        document.documentElement.classList.remove('f1-scroll-locked');
        document.body.classList.remove('f1-cinematic-intro');
        resetKeyboardDrive();
        window.scrollTo(0, 0);
        if (lenis) {
            lenis.start();
            lenis.scrollTo(0, { immediate: true });
        }
        refreshLayoutMetrics();
        playHeroReveal();
        if (window.ScrollTrigger) ScrollTrigger.refresh();
    };

    if (wasSkipped) {
        triggerManualCameraShiftFade(finalizeToPortfolio, 'rgba(255, 24, 1, 0.55)');
    } else {
        finalizeToPortfolio();
        if (cinemaFadeEl) cinemaFadeEl.style.setProperty('--cam-fade', '0');
        if (cinemaFlareEl) {
            gsap.fromTo(
                { a: 0.75, s: 0.45 },
                { a: 0.75, s: 0.45 },
                {
                    a: 0,
                    s: 1.25,
                    duration: 0.55,
                    ease: 'power2.out',
                    onUpdate: function () {
                        cinemaFlareEl.style.setProperty('--flare-alpha', this.targets()[0].a.toFixed(3));
                        cinemaFlareEl.style.setProperty('--flare-scale', this.targets()[0].s.toFixed(3));
                    }
                }
            );
        }
    }
}

function stepCinematicCarRevealAndRollout(nowMs, dt) {
    // Stage Shot 01 camera & lights behind 100% solid black shutter until 3D RB22 GLB is parsed + 3 GPU warm-up frames finish!
    const waitingForModel = !introModelReady && !introModelFailed && (nowMs - introPageOpenMs < 25000);
    if (waitingForModel || introGpuWarmupFrames > 0) {
        carGroup.position.copy(PIT_STAGING_POS);
        carGroup.rotation.y = -Math.PI / 2;
        spotlight.intensity = 0.22;
        cinemaKeyLight.intensity = 1.65;
        cinemaKeyLight.position.set(-18.6, 1.55, 27.9);
        cinemaRimLight.intensity = 1.15;
        cinemaRimLight.position.set(-20.2, 1.45, 24.4);
        targetCameraRollRad = -0.042;
        targetCameraPosition.set(-17.75, 0.39, 27.38);
        targetLookAt.set(-19.45, 0.28, 26.15);
        if (Math.abs(camera.fov - 35) > 0.04) {
            camera.fov = 35;
            camera.updateProjectionMatrix();
        }
        // Hold 100.0% opaque velvet-black cinema shutter — ZERO empty asphalt, watermarks, or pop-in!
        if (cinemaFadeEl) cinemaFadeEl.style.setProperty('--cam-fade', '1');
        if (cinemaFlareEl) cinemaFlareEl.style.setProperty('--flare-alpha', '0');

        if (introModelReady && introGpuWarmupFrames > 0) {
            introGpuWarmupFrames--;
        }
        return;
    }

    if (introTimelineStartMs === 0) {
        introTimelineStartMs = nowMs;
        lastFrameTime = nowMs;
        if (skipCinemaBtnEl) skipCinemaBtnEl.style.opacity = '1';
    }

    const t = Math.max(0, (nowMs - introTimelineStartMs) * 0.001);
    if (cinemaProgressEl) {
        cinemaProgressEl.style.transform = `scaleX(${Math.min(1, t / INTRO_TOTAL_SEC).toFixed(4)})`;
    }

    if (t >= INTRO_TOTAL_SEC) {
        finishCinematicIntro(false);
        return;
    }

    const idleVib = Math.sin(nowMs * 0.075) * 0.0012;

    if (t < INTRO_SHOT_CUTS[1]) {
        // ===== SHOT 01 (0.00s - 2.20s): DARKNESS AWAKENING, SPOTLIGHT SWELL & CARBON NOSECONE =====
        setCinemaHudShot(0);
        updateIntroShotFadeAndTitleEnvelope(t, 0);

        const u = (t - INTRO_SHOT_CUTS[0]) / (INTRO_SHOT_CUTS[1] - INTRO_SHOT_CUTS[0]);
        const s = 1 - Math.pow(1 - u, 2.2);

        carGroup.position.copy(PIT_STAGING_POS);
        carGroup.rotation.y = -Math.PI / 2;
        chassisDynamicsGroup.position.set(0, idleVib, 0);

        // Stadium floodlight dramatic awakening from dark silhouette + raking studio key light across nose!
        spotlight.intensity = 0.16 + Math.min(1, Math.pow(u * 1.35, 1.8)) * 1.45;
        cinemaKeyLight.intensity = 1.65;
        cinemaKeyLight.position.set(-18.6 - u * 2.2, 1.55, 27.9);
        cinemaRimLight.intensity = 1.15;
        cinemaRimLight.position.set(-20.2 - u * 1.8, 1.45, 24.4);

        targetCameraRollRad = -0.042 + u * 0.014; // -2.4° subtle cinema Dutch tilt
        targetCameraPosition.set(
            -17.75 + (-18.75 - (-17.75)) * s,
             0.39 + ( 0.64 -  0.39) * s,
             27.38 + (28.45 - 27.38) * s
        );
        targetLookAt.set(
            -19.45 + (-20.55 - (-19.45)) * s,
             0.28 + ( 0.45 -  0.28) * s,
             26.15
        );
        const fov1 = 35 + u * 2.0;
        if (Math.abs(camera.fov - fov1) > 0.04) {
            camera.fov = fov1;
            camera.updateProjectionMatrix();
        }
    } else if (t < INTRO_SHOT_CUTS[2]) {
        // ===== SHOT 02 (2.20s - 4.35s): ULTRA-LOW PIRELLI RIM, WISHBONE & CARBON FLOOR GLIDE =====
        setCinemaHudShot(1);
        updateIntroShotFadeAndTitleEnvelope(t, 1);
        spotlight.intensity = 1.55;

        const u = (t - INTRO_SHOT_CUTS[1]) / (INTRO_SHOT_CUTS[2] - INTRO_SHOT_CUTS[1]);
        const s = u * u * (3 - 2 * u);

        carGroup.position.copy(PIT_STAGING_POS);
        carGroup.rotation.y = -Math.PI / 2;
        chassisDynamicsGroup.position.set(0, idleVib, 0);

        // Glide studio key light down the ORACLE sidepod clearcoat
        cinemaKeyLight.intensity = 1.55;
        cinemaKeyLight.position.set(-19.5 - u * 2.8, 1.25, 28.4);
        cinemaRimLight.intensity = 1.05;
        cinemaRimLight.position.set(-22.4, 1.65, 24.5);

        // Subtle warm carbon brake pre-heat glow inside wheel rim
        const preHeat = Math.sin(u * Math.PI) * 0.85;
        for (let i = 0; i < rb22BrakeDiscMats.length; i++) rb22BrakeDiscMats[i].emissiveIntensity = preHeat;

        targetCameraRollRad = 0.036 - u * 0.012; // +2.1° low tracking Dutch tilt
        targetCameraPosition.set(
            -19.35 + (-21.95 - (-19.35)) * s,
             0.35 + ( 0.46 -  0.35) * s,
             27.82 + (28.08 - 27.82) * s
        );
        targetLookAt.set(
            -20.15 + (-21.85 - (-20.15)) * s,
             0.34 + ( 0.42 -  0.34) * s,
             26.32
        );
        if (Math.abs(camera.fov - 36) > 0.04) {
            camera.fov = 36;
            camera.updateProjectionMatrix();
        }
    } else if (t < INTRO_SHOT_CUTS[3]) {
        // ===== SHOT 03 (4.35s - 6.50s): OVER-HALO COCKPIT CRANE & 3D STEERING WHEEL IGNITION =====
        setCinemaHudShot(2);
        updateIntroShotFadeAndTitleEnvelope(t, 2);

        const u = (t - INTRO_SHOT_CUTS[2]) / (INTRO_SHOT_CUTS[3] - INTRO_SHOT_CUTS[2]);
        const s = u * u * (3 - 2 * u);

        carGroup.position.copy(PIT_STAGING_POS);
        carGroup.rotation.y = -Math.PI / 2;
        chassisDynamicsGroup.position.set(0, idleVib, 0);
        for (let i = 0; i < rb22BrakeDiscMats.length; i++) rb22BrakeDiscMats[i].emissiveIntensity = 0;

        cinemaKeyLight.intensity = 1.45;
        cinemaKeyLight.position.set(-21.2, 2.05, 27.9);
        cinemaRimLight.intensity = 1.15;
        cinemaRimLight.position.set(-22.8, 1.75, 24.6);

        // Live Driver Pre-Track Steering Free-Play Check & Cockpit Shift-LED Ignition Sweep!
        const checkSteer = Math.sin(u * Math.PI * 2.0) * 0.25;
        for (let i = 0; i < frontSteerPivots.length; i++) {
            frontSteerPivots[i].rotation.y = checkSteer;
        }
        if (rb22SteerWheelNode && rb22SteerBaseQuat) {
            steerDeltaQuat.setFromAxisAngle(steerAxisZ, -checkSteer * 2.35);
            rb22SteerWheelNode.quaternion.copy(rb22SteerBaseQuat).multiply(steerDeltaQuat);
        }
        const ledSweep = Math.sin(u * Math.PI) * 2.8;
        rb22CockpitShiftMats.forEach((m) => { m.emissiveIntensity = ledSweep; });

        targetCameraRollRad = -0.025 + u * 0.015;
        targetCameraPosition.set(
            -20.30 + (-22.20 - (-20.30)) * s,
             0.96 + ( 1.08 -  0.96) * s,
             27.95 + (28.25 - 27.95) * s
        );
        targetLookAt.set(
            -21.35 + (-21.85 - (-21.35)) * s,
             0.62 + ( 0.58 -  0.62) * s,
             26.15
        );
        if (Math.abs(camera.fov - 39) > 0.04) {
            camera.fov = 39;
            camera.updateProjectionMatrix();
        }
    } else if (t < INTRO_SHOT_CUTS[4]) {
        // ===== SHOT 04 (6.50s - 8.60s): LOW REAR DIFFUSER, RAIN LIGHT & LIVE 3D DRS WING SNAP =====
        setCinemaHudShot(3);
        updateIntroShotFadeAndTitleEnvelope(t, 3);

        const u = (t - INTRO_SHOT_CUTS[3]) / (INTRO_SHOT_CUTS[4] - INTRO_SHOT_CUTS[3]);
        const s = u * u * (3 - 2 * u);

        carGroup.position.copy(PIT_STAGING_POS);
        carGroup.rotation.y = -Math.PI / 2;
        chassisDynamicsGroup.position.set(0, idleVib * 1.8, 0);
        for (let i = 0; i < frontSteerPivots.length; i++) frontSteerPivots[i].rotation.y = 0;
        if (rb22SteerWheelNode && rb22SteerBaseQuat) rb22SteerWheelNode.quaternion.copy(rb22SteerBaseQuat);
        rb22CockpitShiftMats.forEach((m) => { m.emissiveIntensity = u * 2.2; });

        cinemaKeyLight.intensity = 1.35;
        cinemaKeyLight.position.set(-24.2, 1.55, 28.0);
        cinemaRimLight.intensity = 1.0;
        cinemaRimLight.position.set(-23.5, 1.35, 24.5);

        // Snap 3D Rear DRS Flap & Front Aero Flap OPEN at u=0.20 and CLOSED at u=0.68!
        if (u >= 0.20 && !introDrsOpenedOnce) {
            introDrsOpenedOnce = true;
            setDrsAeroState(true);
        }
        if (u >= 0.68 && !introDrsClosedOnce) {
            introDrsClosedOnce = true;
            setDrsAeroState(false);
        }

        targetCameraRollRad = 0.032 * (1 - u * 0.4);
        targetCameraPosition.set(
            -25.00 + (-25.72 - (-25.00)) * s,
             0.48 + ( 0.84 -  0.48) * s,
             27.28 + (28.25 - 27.28) * s
        );
        targetLookAt.set(
            -21.90 + (-19.10 - (-21.90)) * s,
             0.62 + ( 0.72 -  0.62) * s,
             26.22 + (27.30 - 26.22) * s
        );
        if (Math.abs(camera.fov - 42) > 0.04) {
            camera.fov = 42;
            camera.updateProjectionMatrix();
        }
    } else {
        // ===== SHOT 05 (8.60s - 12.10s): PIT-EXIT GREEN -> RUSSIAN-ARM CHASE -> P1 POLE GRID =====
        setCinemaHudShot(4);
        updateIntroShotFadeAndTitleEnvelope(t, 4);

        if (!introPitGreenTriggered) {
            introPitGreenTriggered = true;
            if (isDrsOn) setDrsAeroState(false);
            if (pitExitBulbMat) pitExitBulbMat.color.setHex(0x10b981);
            if (pitExitHaloSprite) pitExitHaloSprite.material.color.setHex(0x10b981);
            turnOffGantryStartLights();
            prevIntroCarPos.copy(PIT_STAGING_POS);
        }

        const rawS = Math.min(1, Math.max(0, (t - INTRO_SHOT_CUTS[4]) / (INTRO_TOTAL_SEC - INTRO_SHOT_CUTS[4])));
        // Fade studio lights smoothly to 0 as Night GP stadium floodlights illuminate the track rollout
        cinemaKeyLight.intensity = Math.max(0, (1 - rawS * 1.8) * 1.2);
        cinemaRimLight.intensity = Math.max(0, (1 - rawS * 1.8) * 0.9);
        rb22CockpitShiftMats.forEach((m) => { m.emissiveIntensity = Math.sin(rawS * Math.PI) * 2.4; });

        const uRoll = rawS * rawS * (3 - 2 * rawS);
        const pos = pitRolloutCurve.getPointAt(uRoll);
        const rawTang = pitRolloutCurve.getTangentAt(uRoll).normalize();
        const aheadU = Math.min(1, uRoll + 0.035);
        const aheadTang = pitRolloutCurve.getTangentAt(aheadU).normalize();

        // Blend final 18% tangent cleanly into exact Pole Grid circuit tangent for 0.00px seam!
        const endBlend = Math.max(0, Math.min(1, (uRoll - 0.82) / 0.18));
        const tang = new THREE.Vector3(
            rawTang.x + (poleRestingState.frame.tang.x - rawTang.x) * endBlend,
            0,
            rawTang.z + (poleRestingState.frame.tang.z - rawTang.z) * endBlend
        ).normalize();
        const right = new THREE.Vector3(-tang.z, 0, tang.x).normalize();

        // True rolling wheel spin proportional to physical distance traveled
        const stepMeters = pos.distanceTo(prevIntroCarPos);
        prevIntroCarPos.copy(pos);
        if (stepMeters > 0.00005) {
            const rollRad = stepMeters / 0.34;
            for (let i = 0; i < wheelElements.length; i++) {
                wheelElements[i].rotateX(rollRad);
            }
        }

        carGroup.position.set(pos.x, 0, pos.z);
        carGroup.rotation.y = Math.atan2(-tang.x, -tang.z);

        // Front wheel & 3D Cockpit Steering Wheel turn out onto track & counter-steer straight
        const curv = rawTang.x * aheadTang.z - rawTang.z * aheadTang.x;
        const steerTarget = Math.max(-0.26, Math.min(0.26, -curv * 2.4)) * (1 - endBlend);
        smoothSteer += (steerTarget - smoothSteer) * (1 - Math.exp(-dt * 12));
        for (let i = 0; i < frontSteerPivots.length; i++) {
            frontSteerPivots[i].rotation.y = smoothSteer;
        }
        if (rb22SteerWheelNode && rb22SteerBaseQuat) {
            steerDeltaQuat.setFromAxisAngle(steerAxisZ, -smoothSteer * 2.35);
            rb22SteerWheelNode.quaternion.copy(rb22SteerBaseQuat).multiply(steerDeltaQuat);
        }

        // Launch squat -> road buzz -> braking nose-dive + glowing carbon-ceramic brake discs into P1 box!
        const isBrakingToPole = (rawS > 0.60 && rawS < 0.97);
        const brakeBell = isBrakingToPole ? Math.sin(((rawS - 0.60) / 0.37) * Math.PI) : 0;
        const launchSquat = (rawS < 0.28) ? -Math.sin((rawS / 0.28) * Math.PI) * 0.015 : 0;
        chassisDynamicsGroup.rotation.x = launchSquat + brakeBell * 0.016;
        chassisDynamicsGroup.rotation.z = curv * 0.09 * (1 - endBlend);
        chassisDynamicsGroup.position.y = Math.sin(nowMs * 0.06) * 0.0024 * Math.sin(rawS * Math.PI);

        const discGlow = brakeBell * 2.5;
        for (let i = 0; i < rb22BrakeDiscMats.length; i++) {
            rb22BrakeDiscMats[i].emissiveIntensity = discGlow;
        }
        carBrakeGlowLevel = discGlow * 0.58;

        // Titanium sparks shower as the RB22 merges onto the Main Straight crown
        const rolloutSpeedMps = stepMeters / Math.max(0.004, dt);
        stepTitaniumSparks(dt, (rawS > 0.14 && rawS < 0.74) ? Math.max(18, rolloutSpeedMps * 1.5) : 0, { pos, tang, right });

        // Two-Stage Russian-Arm Low Chase -> Sweeping Helicopter Arc into Chapter 01 Pole Showcase!
        const camE = rawS * rawS * (3 - 2 * rawS);
        const endF = broadcastCamKeys[0][1];     // +4.8
        const endR = broadcastCamKeys[0][2];     // +3.1
        const endU = broadcastCamKeys[0][3];     // +1.44
        const endShift = broadcastCamKeys[0][4]; // +1.45

        // Starts ultra-low & dramatic (y=0.68m) beside the Pit-Exit launch, swells up to 2.05m mid-arc, settles to 1.44m!
        const craneArcBump = Math.sin(camE * Math.PI) * 0.72;
        const curF = -3.6 + (endF - (-3.6)) * camE;
        const curR =  3.9 + (endR -  3.9) * camE + Math.sin(camE * Math.PI) * 0.85;
        const curU =  0.68 + (endU - 0.68) * camE + craneArcBump;
        const curShift = endShift * Math.pow(camE, 1.45);

        // Dynamic Russian-Arm camera roll (+3.1° on launch, leveling smoothly to 0.0° at P1 Pole Grid!)
        targetCameraRollRad = 0.054 * (1 - camE);

        const tmpCamX = tang.x * curF + right.x * curR;
        const tmpCamZ = tang.z * curF + right.z * curR;
        const vLen = Math.hypot(-tmpCamX, -tmpCamZ) || 1;
        const camRightX = tmpCamZ / vLen;
        const camRightZ = -tmpCamX / vLen;
        const responsiveScale = cachedViewportW < 768 ? 0.18 : 1.0;
        const shiftMeters = curShift * responsiveScale;

        targetCameraPosition.set(
            pos.x + tmpCamX,
            curU,
            pos.z + tmpCamZ
        );
        targetLookAt.set(
            pos.x - camRightX * shiftMeters,
            0.50 + 0.02 * camE,
            pos.z - camRightZ * shiftMeters
        );

        const curFov = 62 + (56 - 62) * camE;
        if (Math.abs(camera.fov - curFov) > 0.04) {
            camera.fov = curFov;
            camera.updateProjectionMatrix();
        }
    }
}

if (skipCinemaBtnEl) {
    skipCinemaBtnEl.addEventListener('click', () => {
        finishCinematicIntro(true);
    });
}
const replayIntroBtn = document.getElementById('replay-intro-btn');
if (replayIntroBtn) {
    replayIntroBtn.addEventListener('click', () => {
        triggerManualCameraShiftFade(() => {
            startCinematicCarReveal();
        }, 'rgba(255, 24, 1, 0.55)');
    });
}

// Launch the 5-Shot Director's Cut Car Reveal & Track Rollout immediately!
startCinematicCarReveal();

const _camFwdAxis = new THREE.Vector3();
const _worldUpVec = new THREE.Vector3(0, 1, 0);

// --- MASTER 60FPS LOCKSTEP ENGINE RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    const nowMs = performance.now();
    const tSec = nowMs * 0.001;

    // Step Lenis sub-pixel smooth scroll in exact lockstep BEFORE 3D car & camera physics!
    if (lenis && !isCinematicIntroActive && !isSimulatingLap && !kbActive) {
        lenis.raf(nowMs);
    }

    stepLapSimulation(nowMs);

    const mouseAlpha = 1 - Math.exp(-_lastFrameDt * 8.5);
    currentMouseX += (mouseX - currentMouseX) * mouseAlpha;
    currentMouseY += (mouseY - currentMouseY) * mouseAlpha;

    const lookDx = targetLookAt.x - targetCameraPosition.x;
    const lookDz = targetLookAt.z - targetCameraPosition.z;
    const lookLen = Math.hypot(lookDx, lookDz) || 1;
    const viewRightX = -lookDz / lookLen;
    const viewRightZ =  lookDx / lookLen;

    const parallaxScale = isCinematicIntroActive
        ? 0
        : (((activeCamMode === 'chase' && !PREFERS_REDUCED_MOTION) ? 0.9 : 0.08) * postIntroParallaxBlend);
    const minCamY = isCinematicIntroActive
        ? 0.30
        : (activeCamMode === 'pod' ? 0.42 : (activeCamMode === 'cockpit' ? 0.65 : 0.82));
    camera.position.set(
        targetCameraPosition.x + viewRightX * (currentMouseX * 1.1 * parallaxScale),
        Math.max(minCamY, targetCameraPosition.y + (-currentMouseY * 0.5 * parallaxScale)),
        targetCameraPosition.z + viewRightZ * (currentMouseX * 1.1 * parallaxScale)
    );

    // Frame-rate-independent 60fps camera roll damping
    if (!isCinematicIntroActive) {
        targetCameraRollRad = (activeCamMode === 'cockpit' || activeCamMode === 'halo')
            ? (-smoothRoll * 0.65)
            : 0;
    }
    currentCameraRollRad += (targetCameraRollRad - currentCameraRollRad) * (1 - Math.exp(-_lastFrameDt * 10.5));
    if (Math.abs(currentCameraRollRad) > 0.0003) {
        _camFwdAxis.subVectors(targetLookAt, camera.position).normalize();
        camera.up.copy(_worldUpVec).applyAxisAngle(_camFwdAxis, currentCameraRollRad);
    } else {
        camera.up.set(0, 1, 0);
    }
    camera.lookAt(targetLookAt);

    const cx = carGroup.position.x;
    const cz = carGroup.position.z;
    spotlight.position.set(cx + 5.5, 21.5, cz + 6.5);
    spotlight.target.position.set(cx, 0.25, cz);
    spotlight.target.updateMatrixWorld();

    const rainPulse = isDrsOn
        ? (0.85 + 2.35 * (0.5 + 0.5 * Math.sin(tSec * 24.0)))
        : (0.65 + 1.35 * (0.5 + 0.5 * Math.sin(tSec * 9.0)));
    for (let i = 0; i < rb22RearLightMats.length; i++) {
        rb22RearLightMats[i].emissiveIntensity = rainPulse;
    }
    rearRainHaloSprite.material.opacity = Math.min(1.0, 0.35 + rainPulse * 0.28);
    const haloScale = 0.72 + rainPulse * 0.14;
    rearRainHaloSprite.scale.set(haloScale, haloScale, 1);

    if (!isCinematicIntroActive) {
        if (floodLampWorldPositions.length > 0) {
            let bestD2 = 1e9;
            let bestIdx = 0;
            for (let i = 0; i < floodLampWorldPositions.length; i++) {
                const lp = floodLampWorldPositions[i];
                const dx = lp.x - cx, dz = lp.z - cz;
                const d2 = dx * dx + dz * dz;
                if (d2 < bestD2) {
                    bestD2 = d2;
                    bestIdx = i;
                }
            }
            stadiumNearLight.position.copy(floodLampWorldPositions[bestIdx]);
        }

        const backX = Math.sin(carGroup.rotation.y);
        const backZ = Math.cos(carGroup.rotation.y);
        carAuraLight.position.set(cx + backX * 2.15, 0.36, cz + backZ * 2.15);
        if (isDrsOn) {
            carAuraLight.color.setHex(0x00d2ff);
            carAuraLight.intensity = 0.85 + rainPulse * 0.25;
        } else if (carBrakeGlowLevel > 0.16) {
            carAuraLight.color.setHex(0xff3800);
            carAuraLight.intensity = 0.65 + carBrakeGlowLevel * 0.65;
        } else {
            carAuraLight.color.setHex(0xff1400);
            carAuraLight.intensity = 0.50 + rainPulse * 0.42;
        }
    }

    if (aviationBeaconMat) {
        aviationBeaconMat.opacity = 0.45 + 0.50 * (0.5 + 0.5 * Math.sin(tSec * 2.6));
    }

    if (crowdFlashPoints && Math.random() < 0.20) {
        const colAttr = crowdFlashPoints.geometry.attributes.color;
        const pick = Math.floor(Math.random() * colAttr.count);
        const flash = Math.random() < 0.35 ? 1.0 : 0.55;
        colAttr.setXYZ(pick, flash, flash * 0.96, 1.0);
        colAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    refreshLayoutMetrics();
    camera.aspect = cachedViewportW / cachedViewportH;
    camera.updateProjectionMatrix();
    renderer.setSize(cachedViewportW, cachedViewportH);
});
