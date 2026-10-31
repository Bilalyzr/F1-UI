gsap.registerPlugin(ScrollTrigger);
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// --- DEVICE CAPABILITY & ACCESSIBILITY TIERING ---
const PREFERS_REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
if (PREFERS_REDUCED_MOTION) {
    document.documentElement.classList.add('reduced-motion');
}
const IS_MOBILE_VIEWPORT = window.innerWidth < 768;
const IS_LOW_CORE = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const MAX_RENDER_DPR = IS_MOBILE_VIEWPORT ? 1.35 : (IS_LOW_CORE ? 1.5 : 2.0);

// --- LENIS SMOOTH INERTIA SCROLL ENGINE (SYNCED WITH GSAP TICKER & SCROLLTRIGGER) ---
let lenis = null;
if (typeof window.Lenis === 'function' && !PREFERS_REDUCED_MOTION) {
    try {
        lenis = new Lenis({
            duration: 1.15,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 0.95,
            touchMultiplier: 1.5,
            prevent: (node) => !!(node && node.closest && node.closest('#project-viewport, #start-lights'))
        });
        window.__lenis = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
    } catch (e) {
        lenis = null;
    }
}

function smoothScrollToTarget(targetIdOrZero) {
    if (targetIdOrZero === 0 || targetIdOrZero === 'grid') {
        if (lenis) lenis.scrollTo(0, { duration: PREFERS_REDUCED_MOTION ? 0 : 1.35 });
        else window.scrollTo({ top: 0, behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth' });
        return;
    }
    const el = typeof targetIdOrZero === 'string' ? document.getElementById(targetIdOrZero) : targetIdOrZero;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: PREFERS_REDUCED_MOTION ? 0 : 1.35 });
    else el.scrollIntoView({ behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth' });
}

// --- EXHAUST SOUND SYNTHESIZER ENGINE + MUTE & MICRO-INTERACTION AUDIO ---
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let engineFilter = null;
let isAudioMuted = false;
let isDrsOn = false;

function initEngineSound() {
    if (isAudioMuted) return;
    if (audioCtx) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioCtx = new AudioCtor();

    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(70, audioCtx.currentTime);

    engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(500, audioCtx.currentTime);

    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(0.045, audioCtx.currentTime);

    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
}

function updateEngineSound(scrollVelocity) {
    if (!audioCtx || !engineOsc || !engineGain) return;
    if (isAudioMuted) {
        engineGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);
        return;
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const drsModifier = isDrsOn ? 120 : 0;
    const velocityFactor = Math.min(Math.abs(scrollVelocity) * 0.12, 180) + drsModifier;
    const targetFreq = 60 + velocityFactor * 3.0;
    const targetVolume = 0.032 + Math.min(velocityFactor * 0.0016, 0.26);
    const targetCutoff = 420 + velocityFactor * 22;

    engineOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(targetVolume, audioCtx.currentTime, 0.08);
    if (engineFilter) engineFilter.frequency.setTargetAtTime(targetCutoff, audioCtx.currentTime, 0.08);
}

function playBeep(freq, dur, vol) {
    if (!audioCtx || isAudioMuted) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.03);
}

function playUiTick(freq = 980) {
    if (!audioCtx || isAudioMuted || audioCtx.state !== 'running') return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.045, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.035);
}

function playDrsWhoosh(opening) {
    if (!audioCtx || isAudioMuted || audioCtx.state !== 'running') return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const f = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(opening ? 220 : 540, t);
    o.frequency.exponentialRampToValueAtTime(opening ? 660 : 190, t + 0.22);
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(f); f.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.26);
}

function playLaunchRoar() {
    if (!audioCtx || isAudioMuted) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const f = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.exponentialRampToValueAtTime(950, t + 0.85);
    o.frequency.exponentialRampToValueAtTime(760, t + 1.4);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(350, t);
    f.frequency.exponentialRampToValueAtTime(5200, t + 0.85);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
    o.connect(f); f.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 1.75);
    playBeep(1046, 0.45, 0.16);
}

function ensureAudioRunning() {
    if (isAudioMuted) return;
    initEngineSound();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
['pointerdown', 'touchstart', 'keydown', 'click', 'wheel', 'scroll'].forEach((evt) => {
    window.addEventListener(evt, ensureAudioRunning, { passive: true });
});

const audioToggleBtn = document.getElementById('audio-toggle-btn');
function toggleAudioMute() {
    isAudioMuted = !isAudioMuted;
    if (isAudioMuted && audioCtx && engineGain) {
        engineGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.04);
    } else if (!isAudioMuted) {
        initEngineSound();
        playUiTick(1120);
    }
    if (audioToggleBtn) {
        audioToggleBtn.textContent = isAudioMuted ? 'MUTED' : 'AUDIO ON';
        audioToggleBtn.className = isAudioMuted
            ? 'text-[8px] font-bold tracking-widest text-gray-400 border border-gray-700 bg-zinc-900/80 px-2 py-0.5 rounded cursor-pointer transition-all'
            : 'text-[8px] font-bold tracking-widest text-emerald-400 border border-emerald-500/40 bg-emerald-950/20 px-2 py-0.5 rounded cursor-pointer hover:border-emerald-400 transition-all';
    }
}
if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAudioMute();
    });
}

// --- PIT WALL CONTACT FORM ---
const pitWallForm = document.getElementById('pit-wall-form');
const formStatus = document.getElementById('form-status');
if (pitWallForm) {
    pitWallForm.addEventListener('submit', (e) => {
        e.preventDefault();
        playUiTick(1320);
        pitWallForm.reset();
        if (formStatus) {
            formStatus.classList.remove('hidden');
            clearTimeout(pitWallForm._statusTimer);
            pitWallForm._statusTimer = setTimeout(() => formStatus.classList.add('hidden'), 4200);
        }
    });
}

// --- DRS ACTIVE AERO CONTROLLER (DESKTOP + MOBILE + KEYBOARD 'D') ---
const drsTriggerBtn = document.getElementById('drs-trigger-btn');
const drsBtnLight = document.getElementById('drs-btn-light');
const drsBtnStatus = document.getElementById('drs-btn-status');
const drsIndicator = document.getElementById('drs-indicator');
const mobileDrsBtn = document.getElementById('mobile-drs-btn');
const navAeroPill = document.getElementById('nav-aero-pill');

function toggleDrsAero() {
    initEngineSound();
    isDrsOn = !isDrsOn;
    playDrsWhoosh(isDrsOn);

    if (isDrsOn) {
        document.body.classList.add('drs-active-mode');
        if (drsTriggerBtn) drsTriggerBtn.classList.add('bg-red-950/20', 'border-red-500');
        if (drsBtnLight) {
            drsBtnLight.classList.remove('bg-gray-600');
            drsBtnLight.classList.add('bg-emerald-500', 'shadow-[0_0_8px_#10b981]');
        }
        if (drsBtnStatus) {
            drsBtnStatus.innerText = 'ACTIVE';
            drsBtnStatus.classList.remove('text-gray-500');
            drsBtnStatus.classList.add('text-emerald-400', 'border-emerald-500/50');
        }
        if (drsIndicator) {
            drsIndicator.innerText = 'DRS ON';
            drsIndicator.classList.remove('text-gray-500', 'border-gray-800');
            drsIndicator.classList.add('text-emerald-400', 'border-emerald-500/50', 'bg-emerald-950/10', 'shadow-[0_0_10px_rgba(16,185,129,0.2)]');
        }
        if (mobileDrsBtn) {
            mobileDrsBtn.className = 'md:hidden text-[9px] font-bold tracking-wider px-2.5 py-1.5 rounded-full border border-emerald-400 bg-emerald-950/40 text-emerald-300 cursor-pointer transition-all';
        }
        if (navAeroPill) {
            navAeroPill.textContent = 'X-MODE · DRS';
            navAeroPill.className = 'text-emerald-400 font-bold';
        }
    } else {
        document.body.classList.remove('drs-active-mode');
        if (drsTriggerBtn) drsTriggerBtn.classList.remove('bg-red-950/20', 'border-red-500');
        if (drsBtnLight) {
            drsBtnLight.classList.remove('bg-emerald-500', 'shadow-[0_0_8px_#10b981]');
            drsBtnLight.classList.add('bg-gray-600');
        }
        if (drsBtnStatus) {
            drsBtnStatus.innerText = 'CLOSED';
            drsBtnStatus.classList.remove('text-emerald-400', 'border-emerald-500/50');
            drsBtnStatus.classList.add('text-gray-500');
        }
        if (drsIndicator) {
            drsIndicator.innerText = 'DRS OFF';
            drsIndicator.classList.remove('text-emerald-400', 'border-emerald-500/50', 'bg-emerald-950/10', 'shadow-[0_0_10px_rgba(16,185,129,0.2)]');
            drsIndicator.classList.add('text-gray-500', 'border-gray-800');
        }
        if (mobileDrsBtn) {
            mobileDrsBtn.className = 'md:hidden text-[9px] font-bold tracking-wider px-2.5 py-1.5 rounded-full border border-gray-700 text-gray-400 cursor-pointer transition-all';
        }
        if (navAeroPill) {
            navAeroPill.textContent = 'Z-MODE';
            navAeroPill.className = 'text-cyan-400 font-bold';
        }
    }

    updateEngineSound(isDrsOn ? 1000 : 0);
    if (typeof syncRedBullActiveAero === 'function') syncRedBullActiveAero();
}

if (drsTriggerBtn) drsTriggerBtn.addEventListener('click', toggleDrsAero);
if (mobileDrsBtn) mobileDrsBtn.addEventListener('click', toggleDrsAero);

// ==========================================================
//  THREE.JS PHOTOREALISTIC MIDNIGHT FIA NIGHT GRAND PRIX
//  (Singapore / Jeddah / Las Vegas / Yas Marina Night Spec)
//  & 2026 ORACLE RED BULL RACING RB22 SCROLL PHYSICS ENGINE
// ==========================================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010206);
scene.fog = new THREE.FogExp2(0x02040a, 0.0074);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1200);
const renderer = new THREE.WebGLRenderer({
    antialias: !IS_MOBILE_VIEWPORT,
    alpha: false,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_RENDER_DPR));
if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;

// --- DARK NIGHT STADIUM & CANTILEVER FLOODLIGHT HDRI ENVIRONMENT (PMREM) ---
try {
    if (typeof THREE.PMREMGenerator === 'function') {
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileCubemapShader();
        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0x010205);

        // Dark asphalt lower hemisphere so lower bodywork reflects pitch-dark tarmac
        const darkGround = new THREE.Mesh(
            new THREE.PlaneGeometry(120, 120),
            new THREE.MeshBasicMaterial({ color: 0x020306, side: THREE.DoubleSide })
        );
        darkGround.position.set(0, -6, 0);
        darkGround.rotation.x = Math.PI / 2;
        envScene.add(darkGround);

        // Discrete Singapore-style overhead stadium LED light bars for liquid-glass clearcoat highlights
        for (let b = -3; b <= 3; b++) {
            const bar = new THREE.Mesh(
                new THREE.PlaneGeometry(5.5, 22),
                new THREE.MeshBasicMaterial({ color: (b % 2 === 0) ? 0xfff8ec : 0xe4efff, side: THREE.DoubleSide })
            );
            bar.position.set(b * 7.5, 19.5, 0);
            bar.rotation.x = Math.PI / 2;
            envScene.add(bar);
        }

        // Left & right angled cantilever street-floodlight reflection ribbons
        const leftRig = new THREE.Mesh(
            new THREE.PlaneGeometry(46, 2.2),
            new THREE.MeshBasicMaterial({ color: 0xfff2dc, side: THREE.DoubleSide })
        );
        leftRig.position.set(-14, 10.5, 0);
        leftRig.rotation.y = Math.PI / 2;
        leftRig.rotation.z = -Math.PI / 5;
        envScene.add(leftRig);

        const rightRig = new THREE.Mesh(
            new THREE.PlaneGeometry(46, 2.2),
            new THREE.MeshBasicMaterial({ color: 0xdcebff, side: THREE.DoubleSide })
        );
        rightRig.position.set(14, 10.5, 0);
        rightRig.rotation.y = -Math.PI / 2;
        rightRig.rotation.z = Math.PI / 5;
        envScene.add(rightRig);

        // Subtle nocturnal trackside LED board accents on horizon
        const ledCobalt = new THREE.Mesh(
            new THREE.PlaneGeometry(48, 2.2),
            new THREE.MeshBasicMaterial({ color: 0x123e9e, side: THREE.DoubleSide })
        );
        ledCobalt.position.set(0, 2.4, -26);
        envScene.add(ledCobalt);

        const ledCrimson = new THREE.Mesh(
            new THREE.PlaneGeometry(48, 1.8),
            new THREE.MeshBasicMaterial({ color: 0xd91404, side: THREE.DoubleSide })
        );
        ledCrimson.position.set(0, 2.2, 26);
        envScene.add(ledCrimson);

        scene.environment = pmrem.fromScene(envScene, 0.028).texture;
        pmrem.dispose();
    }
} catch (e) {
    console.warn('[env] PMREM fallback:', e);
}

// --- TRUE HIGH-CONTRAST NOCTURNAL GRAND PRIX LIGHTING ---
// Very low midnight sky bounce so unlit shadows & outer city stay genuinely pitch-dark
const nightSkyAmbient = new THREE.HemisphereLight(0x162444, 0x020307, 0.18);
scene.add(nightSkyAmbient);

// Subtle cool nocturnal moon/stadium rim light for silhouette separation against the black sky
const nightMoonRim = new THREE.DirectionalLight(0x4b6eae, 0.22);
nightMoonRim.position.set(-28, 38, -22);
scene.add(nightMoonRim);

// Primary shadow-casting overhead stadium floodlight tracking the RB22 around the circuit
const spotlight = new THREE.SpotLight(0xfff5e6, 5.8, 78, Math.PI / 4.8, 0.56, 1.35);
spotlight.position.set(6, 21.5, 40);
spotlight.castShadow = true;
const SHADOW_RES = IS_MOBILE_VIEWPORT ? 1024 : 2048;
spotlight.shadow.mapSize.width = SHADOW_RES;
spotlight.shadow.mapSize.height = SHADOW_RES;
spotlight.shadow.camera.near = 9;
spotlight.shadow.camera.far = 48;
spotlight.shadow.bias = -0.00025;
if ('normalBias' in spotlight.shadow) spotlight.shadow.normalBias = 0.014;
spotlight.shadow.radius = 2.4;
scene.add(spotlight);
scene.add(spotlight.target);

// Dynamic pool of 4 real Three.js PointLights that snap to the 4 nearest trackside floodlight
// luminaires around the RB22 every frame — creating real moving multi-pole specular sweeps!
const floodLampWorldPositions = [];
const dynamicTrackLights = [];
for (let i = 0; i < 4; i++) {
    const pl = new THREE.PointLight((i % 2 === 0) ? 0xfff3df : 0xe6f0ff, 2.65, 34, 1.75);
    pl.position.set(i * 12, 10.5, 34);
    scene.add(pl);
    dynamicTrackLights.push(pl);
}

// Subtle car-local under-diffuser / DRS aura (kept tight so under-car contact shadow stays deep black)
const trackGlow = new THREE.PointLight(0xff1801, 0.75, 7.5, 2.0);
scene.add(trackGlow);

// ==========================================================
//  CLOSED FIA GRADE-1 GRAND PRIX CIRCUIT SPLINE (~320m LAP)
//  - Main Pit Straight -> Turn 1-2 Complex -> Back DRS Straight -> Parabolica
// ==========================================================
const circuitControlPoints = [
    new THREE.Vector3(  0.0, 0,  34.0), // u=0.00: P1 Pole Position on Main Pit Straight (+X heading)
    new THREE.Vector3( 28.0, 0,  34.0), // Main Straight exit & Turn 1 braking zone
    new THREE.Vector3( 52.0, 0,  26.0), // Turn 1 entry
    new THREE.Vector3( 60.0, 0,   4.0), // Turn 1-2 sweeping apex
    new THREE.Vector3( 48.0, 0, -20.0), // Turn 2 exit
    new THREE.Vector3( 22.0, 0, -32.0), // Back DRS Straight entry
    new THREE.Vector3( -6.0, 0, -31.0), // Back DRS Straight mid (DRS Activation Gantry)
    new THREE.Vector3(-34.0, 0, -34.0), // Back Straight heavy braking zone
    new THREE.Vector3(-56.0, 0, -22.0), // Final Parabolica entry
    new THREE.Vector3(-62.0, 0,   4.0), // Parabolica apex
    new THREE.Vector3(-48.0, 0,  27.0), // Parabolica exit onto Main Straight
    new THREE.Vector3(-24.0, 0,  34.0)  // Main Straight Starting Grid (P2-P10 Grid Boxes)
];
const circuitCurve = new THREE.CatmullRomCurve3(circuitControlPoints, true, 'catmullrom', 0.5);
const circuitTotalLength = circuitCurve.getLength(); // ~320.1 meters

function sampleCircuitFrame(uNorm) {
    const u = ((uNorm % 1) + 1) % 1;
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

        const ax = p.x + right.x * offA;
        const az = p.z + right.z * offA;
        const bx = p.x + right.x * offB;
        const bz = p.z + right.z * offB;

        const vIdx = i * 2;
        posArr[vIdx * 3]     = ax;
        posArr[vIdx * 3 + 1] = yA;
        posArr[vIdx * 3 + 2] = az;

        posArr[(vIdx + 1) * 3]     = bx;
        posArr[(vIdx + 1) * 3 + 1] = yB;
        posArr[(vIdx + 1) * 3 + 2] = bz;

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

// ==========================================================
//  2K PHOTOREALISTIC NIGHT-RACE PBR TEXTURES & OPTICAL GLARE
// ==========================================================
function createGrandPrixTextures() {
    // 1. 2048x2048 Dark Wet-Night Basalt Asphalt + Polished Rubber Groove + FIA Track-Limit Lines
    const aspCanvas = document.createElement('canvas');
    aspCanvas.width = 2048;
    aspCanvas.height = 2048;
    const actx = aspCanvas.getContext('2d');
    actx.fillStyle = '#0e1015';
    actx.fillRect(0, 0, 2048, 2048);

    const imgData = actx.getImageData(0, 0, 2048, 2048);
    const d = imgData.data;

    // Matching 1024x1024 Physical Roughness Map (glossy rubbered line + damp night dew patches vs matte off-line stone)
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = 1024;
    roughCanvas.height = 1024;
    const rghCtx = roughCanvas.getContext('2d');
    const rghData = rghCtx.createImageData(1024, 1024);
    const rd = rghData.data;

    let seed = 7331;
    for (let y = 0; y < 2048; y++) {
        const yOff = y * 2048;
        for (let x = 0; x < 2048; x++) {
            seed = (seed * 16807) % 2147483647;
            const n1 = ((seed & 255) / 255) - 0.5;
            seed = (seed * 16807) % 2147483647;
            const stoneSpark = (seed % 23 === 0) ? 13 : ((seed % 31 === 0) ? -5 : 0);

            const uAcross = x / 2048;
            const grooveDist = Math.abs(uAcross - 0.51);
            const grooveMask = Math.exp(-(grooveDist * grooveDist) / 0.028);

            // Deep charcoal night tarmac (10..26 RGB) so night contrast is rich & realistic
            const base = 15.5 + n1 * 9.5 + stoneSpark - grooveMask * 5.2;
            const idx = (yOff + x) * 4;
            d[idx]     = Math.max(5, Math.min(58, base));
            d[idx + 1] = Math.max(6, Math.min(60, base + 0.8));
            d[idx + 2] = Math.max(8, Math.min(68, base + 2.6));
            d[idx + 3] = 255;

            if ((x & 1) === 0 && (y & 1) === 0) {
                const rx = x >> 1, ry = y >> 1;
                const rIdx = (ry * 1024 + rx) * 4;
                // Damp night sheen wave + slick rubbered racing line (low roughness = sharp floodlight reflections!)
                const dampPatch = 0.5 + 0.5 * Math.sin(rx * 0.021 + Math.cos(ry * 0.017) * 2.5) * Math.cos(ry * 0.013);
                const roughVal = Math.max(36, Math.min(228,
                    196 - grooveMask * 124 - dampPatch * 38 + n1 * 24
                ));
                rd[rIdx] = rd[rIdx + 1] = rd[rIdx + 2] = roughVal;
                rd[rIdx + 3] = 255;
            }
        }
    }
    actx.putImageData(imgData, 0, 0);
    rghCtx.putImageData(rghData, 0, 0);

    // Asphalt paving machine seams, black tyre-lockup streaks & off-line rubber marbles
    actx.fillStyle = 'rgba(3, 4, 7, 0.45)';
    actx.fillRect(682, 0, 4, 2048);
    actx.fillRect(1366, 0, 4, 2048);
    for (let s = 0; s < 38; s++) {
        const sx = 740 + Math.sin(s * 2.13) * 320;
        actx.fillStyle = 'rgba(4, 5, 8, 0.20)';
        actx.fillRect(sx, 0, 6 + (s % 9), 2048);
    }

    // Crisp FIA white track-limit lines (slightly weathered by tyre crossings)
    actx.fillStyle = '#dfe5f0';
    actx.fillRect(68, 0, 28, 2048);
    actx.fillRect(1952, 0, 28, 2048);
    rghCtx.fillStyle = '#787878';
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

    // High-frequency aggregate micro-relief bump map
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 512;
    bumpCanvas.height = 512;
    const bctx = bumpCanvas.getContext('2d');
    const bData = bctx.createImageData(512, 512);
    for (let i = 0; i < bData.data.length; i += 4) {
        seed = (seed * 16807) % 2147483647;
        const v = 96 + (seed & 95);
        bData.data[i] = bData.data[i + 1] = bData.data[i + 2] = v;
        bData.data[i + 3] = 255;
    }
    bctx.putImageData(bData, 0, 0);
    const asphaltBump = new THREE.CanvasTexture(bumpCanvas);
    asphaltBump.wrapS = THREE.RepeatWrapping;
    asphaltBump.wrapT = THREE.RepeatWrapping;
    asphaltBump.repeat.set(4, 1);

    // 2. Authentic Serrated FIA Red/White Rumble Kerb + Rubber Scuffs + Dark Green Concrete Verge
    const kerbCanvas = document.createElement('canvas');
    kerbCanvas.width = 256;
    kerbCanvas.height = 512;
    const kctx = kerbCanvas.getContext('2d');
    const numBlocks = 8;
    const bh = 512 / numBlocks;
    for (let b = 0; b < numBlocks; b++) {
        const isRed = b % 2 === 0;
        kctx.fillStyle = isRed ? '#b81107' : '#d8dde8';
        kctx.fillRect(0, b * bh, 194, bh);
        kctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        kctx.fillRect(0, b * bh, 194, 6);
        kctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        kctx.fillRect(0, b * bh + 6, 194, 3);
    }
    kctx.fillStyle = '#072b18';
    kctx.fillRect(194, 0, 62, 512);
    kctx.fillStyle = '#03150b';
    kctx.fillRect(192, 0, 5, 512);
    const scuffGrad = kctx.createLinearGradient(0, 0, 105, 0);
    scuffGrad.addColorStop(0, 'rgba(8, 9, 12, 0.56)');
    scuffGrad.addColorStop(1, 'rgba(8, 9, 12, 0.0)');
    kctx.fillStyle = scuffGrad;
    kctx.fillRect(0, 0, 105, 512);
    const kerbTex = new THREE.CanvasTexture(kerbCanvas);
    kerbTex.wrapS = THREE.ClampToEdgeWrapping;
    kerbTex.wrapT = THREE.RepeatWrapping;
    kerbTex.anisotropy = maxAniso;
    if ('encoding' in kerbTex) kerbTex.encoding = THREE.sRGBEncoding;

    // 3. Dark Nocturnal FIA Painted Runoff Apron (Deep Navy / Crimson High-Grip Runoff Bands)
    const runCanvas = document.createElement('canvas');
    runCanvas.width = 512;
    runCanvas.height = 512;
    const rctx = runCanvas.getContext('2d');
    rctx.fillStyle = '#07090e';
    rctx.fillRect(0, 0, 512, 512);
    rctx.fillStyle = '#081738';
    rctx.fillRect(42, 0, 118, 512);
    rctx.fillStyle = '#0d275c';
    rctx.fillRect(168, 0, 26, 512);
    rctx.fillStyle = '#7c0c04';
    rctx.fillRect(202, 0, 14, 512);
    for (let y = 0; y < 512; y += 3) {
        rctx.fillStyle = (y % 6 === 0) ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.18)';
        rctx.fillRect(0, y, 512, 1.5);
    }
    const runoffTex = new THREE.CanvasTexture(runCanvas);
    runoffTex.wrapS = THREE.ClampToEdgeWrapping;
    runoffTex.wrapT = THREE.RepeatWrapping;
    runoffTex.anisotropy = maxAniso;
    if ('encoding' in runoffTex) runoffTex.encoding = THREE.sRGBEncoding;

    // 4. FIA High-Tensile Steel Wire Debris Catch-Fence Alpha Texture
    const fenceCanvas = document.createElement('canvas');
    fenceCanvas.width = 256;
    fenceCanvas.height = 256;
    const fctx = fenceCanvas.getContext('2d');
    fctx.clearRect(0, 0, 256, 256);
    fctx.strokeStyle = 'rgba(155, 172, 198, 0.24)';
    fctx.lineWidth = 1.1;
    for (let k = -256; k < 512; k += 16) {
        fctx.beginPath(); fctx.moveTo(k, 0); fctx.lineTo(k + 256, 256); fctx.stroke();
        fctx.beginPath(); fctx.moveTo(k + 256, 0); fctx.lineTo(k, 256); fctx.stroke();
    }
    fctx.fillStyle = 'rgba(195, 210, 232, 0.58)';
    [8, 56, 108, 160, 212, 248].forEach((cy) => fctx.fillRect(0, cy, 256, 2.5));
    const fenceTex = new THREE.CanvasTexture(fenceCanvas);
    fenceTex.wrapS = THREE.RepeatWrapping;
    fenceTex.wrapT = THREE.ClampToEdgeWrapping;
    fenceTex.anisotropy = maxAniso;

    // 5. Galvanized Armco + Backlit Night-Race LED Trackside Sponsor Lightboxes (Albedo + Emissive Map)
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
    armcoGrad.addColorStop(0.0, '#525b6e');
    armcoGrad.addColorStop(0.24, '#181c24');
    armcoGrad.addColorStop(0.50, '#626d82');
    armcoGrad.addColorStop(0.76, '#151922');
    armcoGrad.addColorStop(1.0, '#485062');
    brctx.fillStyle = armcoGrad;
    brctx.fillRect(0, 0, 2048, 128);

    // Panel A (0..720): Backlit ORACLE RED BULL RACING LED Lightbox
    brctx.fillStyle = '#061539';
    brctx.fillRect(24, 16, 680, 96);
    brctx.fillStyle = '#ff1801';
    brctx.fillRect(24, 16, 680, 9);
    brctx.fillStyle = '#ffc400';
    brctx.fillRect(704, 16, 18, 96);
    brctx.font = '900 40px Arial, sans-serif';
    brctx.fillStyle = '#ffffff';
    brctx.textAlign = 'center';
    brctx.textBaseline = 'middle';
    brctx.fillText('ORACLE  RED BULL  RACING', 364, 68);

    bemctx.fillStyle = '#051130';
    bemctx.fillRect(24, 16, 680, 96);
    bemctx.fillStyle = '#ff1801';
    bemctx.fillRect(24, 16, 680, 9);
    bemctx.font = '900 40px Arial, sans-serif';
    bemctx.fillStyle = '#dce8ff';
    bemctx.textAlign = 'center';
    bemctx.textBaseline = 'middle';
    bemctx.fillText('ORACLE  RED BULL  RACING', 364, 68);

    // Panel B (1060..1680): Backlit PIRELLI // P ZERO Night Lightbox
    brctx.fillStyle = '#141104';
    brctx.fillRect(1060, 16, 580, 96);
    brctx.fillStyle = '#ffd000';
    brctx.fillRect(1060, 16, 580, 10);
    brctx.fillStyle = '#ffd000';
    brctx.font = '900 42px Arial, sans-serif';
    brctx.fillText('PIRELLI   P ZERO', 1350, 68);

    bemctx.fillStyle = '#1a1500';
    bemctx.fillRect(1060, 16, 580, 96);
    bemctx.fillStyle = '#ffcf00';
    bemctx.fillRect(1060, 16, 580, 10);
    bemctx.font = '900 42px Arial, sans-serif';
    bemctx.fillText('PIRELLI   P ZERO', 1350, 68);

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

    // 6. Photorealistic Optical Stadium Floodlight Glare + Broadcast Anamorphic Lens Streak
    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = 256;
    flareCanvas.height = 256;
    const flctx = flareCanvas.getContext('2d');
    flctx.clearRect(0, 0, 256, 256);

    const radG = flctx.createRadialGradient(128, 128, 0, 128, 128, 124);
    radG.addColorStop(0.00, 'rgba(255, 255, 255, 1.0)');
    radG.addColorStop(0.08, 'rgba(255, 248, 232, 0.92)');
    radG.addColorStop(0.22, 'rgba(210, 230, 255, 0.42)');
    radG.addColorStop(0.52, 'rgba(130, 175, 255, 0.11)');
    radG.addColorStop(1.00, 'rgba(0, 0, 0, 0.0)');
    flctx.fillStyle = radG;
    flctx.fillRect(0, 0, 256, 256);

    // Broadcast TV horizontal anamorphic lens streak
    flctx.save();
    flctx.translate(128, 128);
    flctx.scale(1.0, 0.055);
    const anamG = flctx.createRadialGradient(0, 0, 0, 0, 0, 126);
    anamG.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    anamG.addColorStop(0.35, 'rgba(180, 220, 255, 0.50)');
    anamG.addColorStop(1.0, 'rgba(80, 150, 255, 0.0)');
    flctx.fillStyle = anamG;
    flctx.beginPath();
    flctx.arc(0, 0, 126, 0, Math.PI * 2);
    flctx.fill();
    flctx.restore();

    // Subtle 6-point camera aperture diffraction starburst
    for (let a = 0; a < 3; a++) {
        flctx.save();
        flctx.translate(128, 128);
        flctx.rotate((a * Math.PI) / 3 + 0.26);
        flctx.scale(1.0, 0.025);
        const rayG = flctx.createRadialGradient(0, 0, 0, 0, 0, 92);
        rayG.addColorStop(0.0, 'rgba(255, 250, 240, 0.55)');
        rayG.addColorStop(1.0, 'rgba(255, 250, 240, 0.0)');
        flctx.fillStyle = rayG;
        flctx.beginPath();
        flctx.arc(0, 0, 92, 0, Math.PI * 2);
        flctx.fill();
        flctx.restore();
    }
    const flareTex = new THREE.CanvasTexture(flareCanvas);

    // 7. Red Optical LED Halo Texture (FIA Rear Rain Light, Start Lights, Aviation Beacons)
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

    // 8. Soft Edge-Free Volumetric Mist Light-Shaft Texture (zero geometric cone edges!)
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 128;
    beamCanvas.height = 256;
    const bmctx = beamCanvas.getContext('2d');
    const bmImg = bmctx.createImageData(128, 256);
    for (let y = 0; y < 256; y++) {
        const v = y / 255; // 0 = top at lamp, 1 = bottom near track
        const vertFade = Math.pow(1.0 - v, 1.85) * Math.min(1.0, v * 9.0);
        for (let x = 0; x < 128; x++) {
            const u = (x / 127) * 2.0 - 1.0; // -1..+1 across beam width
            // Widens slightly downward while staying 0 at edges
            const halfW = 0.35 + v * 0.62;
            const normU = Math.min(1.0, Math.abs(u) / halfW);
            const horizFade = Math.pow(Math.cos(normU * Math.PI * 0.5), 2.2);
            const alpha = Math.round(255 * vertFade * horizFade * 0.55);
            const idx = (y * 128 + x) * 4;
            bmImg.data[idx]     = 226;
            bmImg.data[idx + 1] = 238;
            bmImg.data[idx + 2] = 255;
            bmImg.data[idx + 3] = alpha;
        }
    }
    bmctx.putImageData(bmImg, 0, 0);
    const beamAlphaTex = new THREE.CanvasTexture(beamCanvas);

    // 9. Baked Ground Floodlight Pool Decal Texture (illuminates distant bends of the 320m night circuit)
    const poolCanvas = document.createElement('canvas');
    poolCanvas.width = 256;
    poolCanvas.height = 256;
    const pctx = poolCanvas.getContext('2d');
    const pg = pctx.createRadialGradient(128, 128, 0, 128, 128, 126);
    pg.addColorStop(0.0, 'rgba(255, 246, 228, 0.24)');
    pg.addColorStop(0.45, 'rgba(205, 225, 255, 0.10)');
    pg.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    pctx.fillStyle = pg;
    pctx.fillRect(0, 0, 256, 256);
    const poolTex = new THREE.CanvasTexture(poolCanvas);

    // 10. Under-Car Ground-Effect Ambient Occlusion Contact Shadow Decal
    const aoCanvas = document.createElement('canvas');
    aoCanvas.width = 256;
    aoCanvas.height = 512;
    const aoctx = aoCanvas.getContext('2d');
    aoctx.clearRect(0, 0, 256, 512);
    // Main carbon floor plank & diffuser shadow
    aoctx.save();
    aoctx.translate(128, 258);
    aoctx.scale(0.68, 1.72);
    const aog = aoctx.createRadialGradient(0, 0, 8, 0, 0, 132);
    aog.addColorStop(0.0, 'rgba(0, 0, 0, 0.94)');
    aog.addColorStop(0.58, 'rgba(0, 0, 0, 0.76)');
    aog.addColorStop(0.84, 'rgba(0, 0, 0, 0.30)');
    aog.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    aoctx.fillStyle = aog;
    aoctx.beginPath();
    aoctx.arc(0, 0, 132, 0, Math.PI * 2);
    aoctx.fill();
    aoctx.restore();
    // 4 Pirelli tyre contact-patch dark AO spots
    [[48, 118], [208, 118], [46, 396], [210, 396]].forEach(([tx, ty]) => {
        const tg = aoctx.createRadialGradient(tx, ty, 2, tx, ty, 38);
        tg.addColorStop(0.0, 'rgba(0, 0, 0, 0.95)');
        tg.addColorStop(0.55, 'rgba(0, 0, 0, 0.55)');
        tg.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
        aoctx.fillStyle = tg;
        aoctx.fillRect(tx - 40, ty - 40, 80, 80);
    });
    const contactShadowTex = new THREE.CanvasTexture(aoCanvas);

    // 11. 1024x1024 Photorealistic Night Skyscraper Glass Curtain-Wall Lit-Window Atlas
    const bldgCanvas = document.createElement('canvas');
    bldgCanvas.width = 512;
    bldgCanvas.height = 1024;
    const bgctx = bldgCanvas.getContext('2d');
    bgctx.fillStyle = '#03050a';
    bgctx.fillRect(0, 0, 512, 1024);
    let bSeed = 4242;
    const cols = 16, floors = 64;
    const cw = 512 / cols, fh = 1024 / floors;
    for (let fl = 0; fl < floors; fl++) {
        bSeed = (bSeed * 16807) % 2147483647;
        const floorDensity = ((bSeed & 255) / 255) * 0.58;
        // Dark concrete slab band between floors
        bgctx.fillStyle = '#020307';
        bgctx.fillRect(0, fl * fh, 512, 3);
        for (let cl = 0; cl < cols; cl++) {
            bSeed = (bSeed * 16807) % 2147483647;
            const r = (bSeed & 255) / 255;
            if (r < floorDensity) {
                bSeed = (bSeed * 16807) % 2147483647;
                const tint = bSeed % 5;
                if (tint === 0) bgctx.fillStyle = 'rgba(255, 224, 168, 0.85)';      // warm 3000K office
                else if (tint === 1) bgctx.fillStyle = 'rgba(210, 232, 255, 0.80)'; // cool 4500K LED office
                else if (tint === 2) bgctx.fillStyle = 'rgba(255, 240, 205, 0.62)'; // soft warm suite
                else if (tint === 3) bgctx.fillStyle = 'rgba(135, 185, 245, 0.52)'; // dim blue monitor glow
                else bgctx.fillStyle = 'rgba(255, 196, 120, 0.45)';
                bgctx.fillRect(cl * cw + 3, fl * fh + 4, cw - 6, fh - 6);
            } else {
                // Dark nocturnal glass reflection
                bgctx.fillStyle = 'rgba(10, 18, 34, 0.55)';
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
    ctx.font = '900 52px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mainText, 512, 82);
    ctx.fillStyle = accentHex;
    ctx.font = '700 25px Arial, sans-serif';
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

// 1. Wet-night real-time planar reflection layer beneath damp asphalt
let mirrorFloor;
if (typeof THREE.Reflector === 'function') {
    const reflW = Math.min(1600, Math.floor(window.innerWidth * 0.75));
    const reflH = Math.min(1600, Math.floor(window.innerHeight * 0.75));
    mirrorFloor = new THREE.Reflector(
        new THREE.PlaneGeometry(700, 700),
        { clipBias: 0.003, textureWidth: reflW, textureHeight: reflH, color: 0x070a12 }
    );
} else {
    mirrorFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(700, 700),
        new THREE.MeshStandardMaterial({ color: 0x04060b, roughness: 0.22, metalness: 0.85 })
    );
}
mirrorFloor.rotation.x = -Math.PI / 2;
mirrorFloor.position.y = -0.03;
mirrorFloor.renderOrder = -20;
scene.add(mirrorFloor);

// Pitch-dark outer night city/paddock ground apron
const paddockGround = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshStandardMaterial({
        color: 0x030408,
        roughness: 0.90,
        metalness: 0.08,
        transparent: true,
        opacity: 0.92,
        depthWrite: false
    })
);
paddockGround.rotation.x = -Math.PI / 2;
paddockGround.position.y = -0.014;
paddockGround.renderOrder = -15;
paddockGround.receiveShadow = true;
scene.add(paddockGround);

// 2. Main FIA Damp Night Racing Asphalt Ribbon (11.6m wide = [-5.8m, +5.8m])
const TRACK_HALF_W = 5.8;
const RIBBON_SEGS = 480;
const asphaltMat = new THREE.MeshStandardMaterial({
    map: gpTextures.asphaltTex,
    roughnessMap: gpTextures.asphaltRoughness,
    bumpMap: gpTextures.asphaltBump,
    bumpScale: 0.016,
    roughness: 0.88, // modulated by asphaltRoughness (0.16 on slick racing groove -> 0.86 off-line!)
    metalness: 0.12,
    envMapIntensity: 1.25,
    transparent: true,
    opacity: 0.86
});
const asphaltRibbon = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, -TRACK_HALF_W, TRACK_HALF_W, 0.003, 0.003, 34, 0, 1),
    asphaltMat
);
asphaltRibbon.receiveShadow = true;
asphaltRibbon.renderOrder = -10;
scene.add(asphaltRibbon);

// 3. Left & Right FIA Serrated Red/White Rumble Kerbs + Dark Green Verge
const kerbMat = new THREE.MeshStandardMaterial({
    map: gpTextures.kerbTex,
    bumpMap: gpTextures.asphaltBump,
    bumpScale: 0.014,
    roughness: 0.44,
    metalness: 0.06
});
const kerbRight = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, TRACK_HALF_W - 0.08, TRACK_HALF_W + 0.95, 0.006, 0.038, 96, 0, 1),
    kerbMat
);
const kerbLeft = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, -(TRACK_HALF_W + 0.95), -(TRACK_HALF_W - 0.08), 0.038, 0.006, 96, 1, 0),
    kerbMat
);
kerbRight.receiveShadow = true;
kerbLeft.receiveShadow = true;
scene.add(kerbRight);
scene.add(kerbLeft);

// 4. Left & Right Painted FIA Runoff Aprons
const runoffMat = new THREE.MeshStandardMaterial({
    map: gpTextures.runoffTex,
    roughnessMap: gpTextures.asphaltRoughness,
    roughness: 0.72,
    metalness: 0.10,
    transparent: true,
    opacity: 0.91
});
const runoffRight = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, TRACK_HALF_W + 0.95, TRACK_HALF_W + 4.7, 0.002, 0.002, 48, 0, 1),
    runoffMat
);
const runoffLeft = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, -(TRACK_HALF_W + 4.7), -(TRACK_HALF_W + 0.95), 0.002, 0.002, 48, 0, 1),
    runoffMat
);
runoffRight.receiveShadow = true;
runoffLeft.receiveShadow = true;
runoffRight.renderOrder = -12;
runoffLeft.renderOrder = -12;
scene.add(runoffRight);
scene.add(runoffLeft);

// 5. Continuous Armco + Backlit Night-Race LED Sponsor Barriers & FIA Debris Catch-Fencing
function buildVerticalWallRibbon(segments, lateralOffset, yBottom, yTop, uvRepeatAlong) {
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
        const uCoord = (i / segments) * uvRepeatAlong;
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
    emissiveIntensity: 0.42,
    roughness: 0.34,
    metalness: 0.62,
    side: THREE.DoubleSide
});
const BARRIER_OFF = TRACK_HALF_W + 4.55; // 10.35m from track centerline
const outerBarrier = new THREE.Mesh(buildVerticalWallRibbon(320,  BARRIER_OFF, 0, 1.08, 22), barrierMat);
const innerBarrier = new THREE.Mesh(buildVerticalWallRibbon(320, -BARRIER_OFF, 0, 1.08, 22), barrierMat);
outerBarrier.receiveShadow = true;
innerBarrier.receiveShadow = true;
scene.add(outerBarrier, innerBarrier);

const fenceMat = new THREE.MeshBasicMaterial({
    map: gpTextures.fenceTex,
    transparent: true,
    opacity: 0.56,
    side: THREE.DoubleSide,
    depthWrite: false
});
scene.add(new THREE.Mesh(buildVerticalWallRibbon(240,  BARRIER_OFF + 0.08, 1.08, 4.45, 80), fenceMat));
scene.add(new THREE.Mesh(buildVerticalWallRibbon(240, -(BARRIER_OFF + 0.08), 1.08, 4.45, 80), fenceMat));

// Steel catch-fence stanchions with inward-curved FIA debris overhang arms (InstancedMesh)
(function buildCatchFencePoles() {
    const poleCountPerSide = 88;
    const poleGeo = new THREE.BoxGeometry(0.10, 4.50, 0.10);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x262c3a, roughness: 0.42, metalness: 0.85 });
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

// 6. Checkered Start/Finish Line & Staggered FIA P1-P10 Starting Grid Boxes on Main Straight
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
            roughness: 0.36,
            polygonOffset: true,
            polygonOffsetFactor: -2
        })
    );
    sfMesh.rotation.order = 'YXZ';
    sfMesh.rotation.y = Math.atan2(-sfFrame.tang.x, -sfFrame.tang.z);
    sfMesh.rotation.x = -Math.PI / 2;
    sfMesh.position.set(sfFrame.pos.x, 0.008, sfFrame.pos.z);
    sfMesh.receiveShadow = true;
    sfMesh.renderOrder = -4;
    scene.add(sfMesh);

    const gbCanvas = document.createElement('canvas');
    gbCanvas.width = 256;
    gbCanvas.height = 512;
    const gctx = gbCanvas.getContext('2d');
    gctx.clearRect(0, 0, 256, 512);
    gctx.fillStyle = '#e8b000';
    gctx.fillRect(6, 118, 244, 15);
    gctx.fillStyle = '#dce3ef';
    gctx.fillRect(20, 44, 216, 13);
    gctx.fillRect(20, 44, 13, 185);
    gctx.fillRect(223, 44, 13, 185);
    const gbTex = new THREE.CanvasTexture(gbCanvas);
    gbTex.anisotropy = maxAniso;
    if ('encoding' in gbTex) gbTex.encoding = THREE.sRGBEncoding;
    const gbMat = new THREE.MeshStandardMaterial({
        map: gbTex,
        transparent: true,
        opacity: 0.88,
        roughness: 0.42,
        depthWrite: false
    });

    for (let slot = 0; slot < 10; slot++) {
        const uSlot = (1.0 - slot * 0.0135) % 1;
        const lat = (slot === 0) ? 0.0 : ((slot % 2 === 1) ? 2.35 : -2.35);
        const fr = sampleCircuitFrame(uSlot);
        const boxMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 5.4), gbMat);
        boxMesh.rotation.order = 'YXZ';
        boxMesh.rotation.y = Math.atan2(-fr.tang.x, -fr.tang.z);
        boxMesh.rotation.x = -Math.PI / 2;
        boxMesh.position.set(
            fr.pos.x + fr.right.x * lat + fr.tang.x * 0.2,
            0.009,
            fr.pos.z + fr.right.z * lat + fr.tang.z * 0.2
        );
        boxMesh.receiveShadow = true;
        boxMesh.renderOrder = -4;
        scene.add(boxMesh);
    }
})();

// 7. 3D Open-Lattice Steel Truss Start/Finish Gantry (u = 0.026) & DRS Gantry (u = 0.500)
function buildTrackGantry(uPos, bannerMain, bannerSub, accentHex, withStartLights) {
    const fr = sampleCircuitFrame(uPos);
    const yaw = Math.atan2(-fr.tang.x, -fr.tang.z);
    const gGroup = new THREE.Group();
    gGroup.position.set(fr.pos.x, 0, fr.pos.z);
    gGroup.rotation.y = yaw;

    const spanHalf = BARRIER_OFF + 0.7;
    const height = 6.8;
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x161a24, roughness: 0.34, metalness: 0.88 });

    // Twin vertical lattice towers on left & right trackside
    [-spanHalf, spanHalf].forEach((xSide) => {
        [-0.48, 0.48].forEach((zOff) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, height + 0.9, 0.26), steelMat);
            leg.position.set(xSide, (height + 0.9) / 2, zOff);
            gGroup.add(leg);
        });
        for (let h = 1.2; h < height + 0.5; h += 1.4) {
            const brace = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.96), steelMat);
            brace.position.set(xSide, h, 0);
            gGroup.add(brace);
        }
    });

    // Open-lattice 3D horizontal overhead truss chords + diagonal struts
    const chordGeo = new THREE.BoxGeometry(spanHalf * 2 + 0.6, 0.20, 0.20);
    [[height + 0.72, -0.48], [height + 0.72, 0.48], [height - 0.72, -0.48], [height - 0.72, 0.48]].forEach(([cy, cz]) => {
        const chord = new THREE.Mesh(chordGeo, steelMat);
        chord.position.set(0, cy, cz);
        gGroup.add(chord);
    });
    for (let sx = -spanHalf + 1.0; sx <= spanHalf - 1.0; sx += 2.2) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.44, 0.98), steelMat);
        rib.position.set(sx, height, 0);
        gGroup.add(rib);
    }

    // Backlit high-contrast broadcast signage
    const bannerTex = makeTextBannerTexture('#040814', accentHex, bannerMain, bannerSub);
    const bannerMat = new THREE.MeshStandardMaterial({
        map: bannerTex,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: bannerTex,
        emissiveIntensity: 0.82,
        roughness: 0.25
    });
    const boardFront = new THREE.Mesh(new THREE.PlaneGeometry(spanHalf * 1.56, 1.32), bannerMat);
    boardFront.position.set(0, height, 0.60);
    const boardBack = new THREE.Mesh(new THREE.PlaneGeometry(spanHalf * 1.56, 1.32), bannerMat);
    boardBack.position.set(0, height, -0.60);
    boardBack.rotation.y = Math.PI;
    gGroup.add(boardFront, boardBack);

    // Downward gantry LED light bar + optical floodlight pods illuminating cars passing underneath
    const stripColor = withStartLights ? 0xff1801 : 0x00d2ff;
    const ledStripMat = new THREE.MeshBasicMaterial({ color: stripColor });
    const underStrip = new THREE.Mesh(new THREE.BoxGeometry(spanHalf * 1.65, 0.07, 0.14), ledStripMat);
    underStrip.position.set(0, height - 0.78, 0);
    gGroup.add(underStrip);
    if (!withStartLights) drsAccentMeshes.push(underStrip);

    [-4.2, 0, 4.2].forEach((lx) => {
        const flare = new THREE.Sprite(new THREE.SpriteMaterial({
            map: gpTextures.flareTex,
            color: 0xfff5e4,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        flare.position.set(lx, height - 0.84, 0);
        flare.scale.set(2.4, 1.4, 1);
        gGroup.add(flare);
        // Register gantry lamp in dynamic real PointLight pool!
        floodLampWorldPositions.push(new THREE.Vector3(
            fr.pos.x + fr.right.x * lx,
            height - 0.85,
            fr.pos.z + fr.right.z * lx
        ));
    });

    // 5-Column FIA Red Start-Light Pods with realistic red optical halos
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
                    opacity: 0.78,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }));
                redHalo.position.set(c * 0.76, height - 1.34 + by, 0.48);
                redHalo.scale.set(0.95, 0.95, 1);
                gGroup.add(redHalo);
                gantryStartLightSprites.push(redHalo);
            });
        }
    }

    scene.add(gGroup);
}

buildTrackGantry(0.026, 'ORACLE RED BULL RACING', '// FIA FORMULA 1 NIGHT GRAND PRIX 2026', '#ff1801', true);
buildTrackGantry(0.500, 'DRS  //  ACTIVE AERO ZONE', '// X-MODE LOW-DRAG STRAIGHTAWAY', '#00d2ff', false);

// 8. Singapore / Jeddah Style Night-Race Cantilever Street-Floodlight Arches + 24m Corner Stadium Towers
(function buildNightFloodlightSystem() {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.38, metalness: 0.86 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff9ee });

    // A) 32 Trackside Cantilever Overhang Night-Race Floodlight Rigs around the 320m circuit
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
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const poolMat = new THREE.MeshBasicMaterial({
        map: gpTextures.poolTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const dummy = new THREE.Object3D();
    let mIdx = 0, aIdx = 0, hIdx = 0;

    for (let i = 0; i < archCount; i++) {
        const u = (i + 0.25) / archCount;
        const fr = sampleCircuitFrame(u);
        // Alternate outer/inner except keep Main Straight inside clear for the Pit Building
        const onPitInside = (u > 0.89 || u < 0.09);
        const side = onPitInside ? 1 : ((i % 3 === 1) ? -1 : 1);

        const baseOff = side * (BARRIER_OFF + 0.55);
        const bx = fr.pos.x + fr.right.x * baseOff;
        const bz = fr.pos.z + fr.right.z * baseOff;
        // Local +X points inward from mast toward track centerline
        const inwardX = -fr.right.x * side;
        const inwardZ = -fr.right.z * side;
        const rigYaw = Math.atan2(-inwardZ, inwardX);

        // Vertical steel mast
        dummy.position.set(bx, 5.3, bz);
        dummy.rotation.set(0, rigYaw, 0);
        dummy.updateMatrix();
        mastInst.setMatrixAt(mIdx++, dummy.matrix);

        // Overhanging cantilever arm reaching 3.6m inward over the catch-fence
        const armCx = bx + inwardX * 1.75;
        const armCz = bz + inwardZ * 1.75;
        dummy.position.set(armCx, 10.45, armCz);
        dummy.rotation.set(0, rigYaw, side > 0 ? 0.08 : 0.08);
        dummy.updateMatrix();
        armInst.setMatrixAt(aIdx++, dummy.matrix);

        // Twin LED floodlight luminaire heads per cantilever arm
        [2.3, 3.45].forEach((reach, k) => {
            const lx = bx + inwardX * reach;
            const lz = bz + inwardZ * reach;
            const ly = 10.35 + reach * 0.05;
            dummy.position.set(lx, ly, lz);
            dummy.rotation.set(0, rigYaw, 0);
            dummy.updateMatrix();
            headInst.setMatrixAt(hIdx++, dummy.matrix);

            if (k === 1) {
                // Record world luminaire coordinate for real-time nearest-4 PointLight pool!
                floodLampWorldPositions.push(new THREE.Vector3(lx, ly - 0.15, lz));

                // Photorealistic optical glare & broadcast anamorphic lens streak sprite
                const glare = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: gpTextures.flareTex,
                    color: (i % 2 === 0) ? 0xfff5e4 : 0xe4f0ff,
                    transparent: true,
                    opacity: 0.82,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }));
                glare.position.set(lx, ly - 0.12, lz);
                glare.scale.set(3.2, 1.9, 1);
                scene.add(glare);

                // Crossed 3D soft feathered edge-free nocturnal light shafts (full volume from any 360deg angle!)
                const shaftGeo = new THREE.PlaneGeometry(5.6, 10.2);
                const shaftYaw = Math.atan2(fr.tang.x, fr.tang.z);
                const shaftA = new THREE.Mesh(shaftGeo, beamMat);
                shaftA.position.set(lx + inwardX * 1.05, 5.2, lz + inwardZ * 1.05);
                shaftA.rotation.y = shaftYaw;
                const shaftB = new THREE.Mesh(shaftGeo, beamMat);
                shaftB.position.copy(shaftA.position);
                shaftB.rotation.y = shaftYaw + Math.PI / 2;
                scene.add(shaftA, shaftB);

                // Baked warm floodlight pool on the asphalt so distant bends glow through the dark night
                const pool = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 15.5), poolMat);
                pool.rotation.order = 'YXZ';
                pool.rotation.y = Math.atan2(-fr.tang.x, -fr.tang.z);
                pool.rotation.x = -Math.PI / 2;
                pool.position.set(
                    fr.pos.x + fr.right.x * (side * 1.4),
                    0.005,
                    fr.pos.z + fr.right.z * (side * 1.4)
                );
                pool.renderOrder = -5;
                scene.add(pool);
            }
        });
    }

    mastInst.count = mIdx;
    armInst.count = aIdx;
    headInst.count = hIdx;
    scene.add(mastInst, armInst, headInst);

    // B) 10 Towering 24m Stadium Floodlight Masts around Major Corners (Turn 1-2, Back Straight, Parabolica)
    const stadiumSpots = [0.06, 0.16, 0.25, 0.36, 0.46, 0.58, 0.68, 0.78, 0.87, 0.95];
    stadiumSpots.forEach((u, idx) => {
        const fr = sampleCircuitFrame(u);
        const side = 1; // outer stadium perimeter
        const dist = side * (BARRIER_OFF + 5.8);
        const fx = fr.pos.x + fr.right.x * dist;
        const fz = fr.pos.z + fr.right.z * dist;
        const towerYaw = Math.atan2(fr.pos.x - fx, fr.pos.z - fz);

        const tower = new THREE.Group();
        tower.position.set(fx, 0, fz);
        tower.rotation.y = towerYaw;

        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.42, 23.5, 8), steelMat);
        mast.position.y = 11.75;
        tower.add(mast);

        const headFrame = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.65, 0.45), steelMat);
        headFrame.position.set(0, 23.4, 0.35);
        headFrame.rotation.x = 0.42;
        tower.add(headFrame);

        // 3x2 individual high-output stadium LED cells
        for (let r = -0.38; r <= 0.39; r += 0.76) {
            for (let c = -1.35; c <= 1.36; c += 1.35) {
                const cell = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.56), lampMat);
                cell.position.set(c, 23.4 + r * 0.85, 0.62 - r * 0.36);
                cell.rotation.x = 0.42;
                tower.add(cell);
            }
        }

        // Large stadium optical bloom & broadcast anamorphic glare sprite
        const bigGlare = new THREE.Sprite(new THREE.SpriteMaterial({
            map: gpTextures.flareTex,
            color: (idx % 2 === 0) ? 0xfff6e5 : 0xdcecff,
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        bigGlare.position.set(0, 23.3, 0.85);
        bigGlare.scale.set(9.5, 5.2, 1);
        tower.add(bigGlare);

        // Soft feathered high-mast nocturnal volumetric beam (zero hard cone edges!)
        const tallShaft = new THREE.Mesh(
            new THREE.PlaneGeometry(12.5, 23.0),
            new THREE.MeshBasicMaterial({
                map: gpTextures.beamAlphaTex,
                transparent: true,
                opacity: 0.24,
                side: THREE.DoubleSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );
        tallShaft.position.set(0, 12.0, 5.6);
        tallShaft.rotation.x = -0.45;
        tower.add(tallShaft);

        scene.add(tower);
    });
})();

// 9. Illuminated Night Pit Building, 5000K High-Bay Garages, Paddock Club & Pit-Wall Timing Stand
(function buildPitLaneComplex() {
    const pitGroup = new THREE.Group();
    const bldgMat = new THREE.MeshStandardMaterial({ color: 0x070a12, roughness: 0.38, metalness: 0.72 });
    const mullionMat = new THREE.MeshStandardMaterial({ color: 0x151b28, roughness: 0.32, metalness: 0.85 });
    const clubGlassMat = new THREE.MeshBasicMaterial({ color: 0x1a3f85, transparent: true, opacity: 0.46 });
    const clubWarmInterior = new THREE.MeshBasicMaterial({ color: 0xffdfa8, transparent: true, opacity: 0.28 });
    const garageBayMat = new THREE.MeshBasicMaterial({ color: 0xeef5ff });
    const redBullLedMat = new THREE.MeshBasicMaterial({ color: 0xff1801 });

    // Main 2-story Pit Architecture (inside of Main Straight: x = -27..+25, z = +16.2)
    const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(54, 8.6, 6.8), bldgMat);
    mainBlock.position.set(-1, 4.3, 16.2);
    pitGroup.add(mainBlock);

    // Paddock Club warm lounge ceiling strip + tinted structural glass facade
    const warmCeiling = new THREE.Mesh(new THREE.PlaneGeometry(50, 1.3), clubWarmInterior);
    warmCeiling.position.set(-1, 6.85, 19.62);
    pitGroup.add(warmCeiling);

    const upperGlass = new THREE.Mesh(new THREE.PlaneGeometry(50.5, 2.5), clubGlassMat);
    upperGlass.position.set(-1, 6.25, 19.66);
    pitGroup.add(upperGlass);

    // Vertical structural curtain-wall mullions
    for (let mx = -25; mx <= 23; mx += 4.0) {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.18, 8.6, 0.24), mullionMat);
        mullion.position.set(mx, 4.3, 19.68);
        pitGroup.add(mullion);
    }

    // Crisp crimson Red Bull architectural roofline LED strip
    const roofLed = new THREE.Mesh(new THREE.BoxGeometry(54.2, 0.11, 0.16), redBullLedMat);
    roofLed.position.set(-1, 8.62, 19.72);
    pitGroup.add(roofLed);

    // 8 Illuminated 5000K F1 Pit Garages + Optical Glare + Red Bull Bay Headers
    for (let g = 0; g < 8; g++) {
        const gx = -21.5 + g * 5.85;
        const isRedBullBay = (g === 3 || g === 4);

        const bayOpening = new THREE.Mesh(new THREE.PlaneGeometry(4.35, 3.05), garageBayMat);
        bayOpening.position.set(gx, 1.55, 19.65);
        pitGroup.add(bayOpening);

        // Interior red tool-cabinet wall stripe for depth
        const toolWall = new THREE.Mesh(
            new THREE.PlaneGeometry(4.1, 0.85),
            new THREE.MeshBasicMaterial({ color: isRedBullBay ? 0xd91404 : 0x0e285c })
        );
        toolWall.position.set(gx, 0.82, 19.67);
        pitGroup.add(toolWall);

        const headerSign = new THREE.Mesh(
            new THREE.BoxGeometry(4.55, 0.38, 0.16),
            new THREE.MeshBasicMaterial({ color: isRedBullBay ? 0xff1801 : 0x102f70 })
        );
        headerSign.position.set(gx, 3.28, 19.72);
        pitGroup.add(headerSign);

        // Soft light spill onto pit-lane concrete outside each garage bay
        const bayPool = new THREE.Mesh(
            new THREE.PlaneGeometry(5.5, 5.8),
            new THREE.MeshBasicMaterial({
                map: gpTextures.poolTex,
                transparent: true,
                opacity: 0.65,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );
        bayPool.rotation.x = -Math.PI / 2;
        bayPool.position.set(gx, 0.005, 21.6);
        bayPool.renderOrder = -5;
        pitGroup.add(bayPool);
    }

    // Pit-Wall Engineers' Timing Stand with glowing multi-screen telemetry monitors
    const pitCanopy = new THREE.Mesh(new THREE.BoxGeometry(24, 2.35, 1.45), bldgMat);
    pitCanopy.position.set(-1, 1.18, 22.8);
    pitGroup.add(pitCanopy);
    for (let m = 0; m < 6; m++) {
        const mon = new THREE.Mesh(
            new THREE.PlaneGeometry(2.6, 0.62),
            new THREE.MeshBasicMaterial({ color: (m % 2 === 0) ? 0x00d2ff : 0x10b981, transparent: true, opacity: 0.72 })
        );
        mon.position.set(-9.5 + m * 3.4, 1.45, 23.55);
        pitGroup.add(mon);
    }

    scene.add(pitGroup);
})();

// 10. Covered Night-Stadium Grandstands with Warm Canopy Uplighting & Twinkling Crowd Camera Flashes
const crowdFlashPositions = [];
let crowdFlashPoints = null;
(function buildNightGrandstands() {
    const darkStructMat = new THREE.MeshStandardMaterial({ color: 0x090c14, roughness: 0.55, metalness: 0.70 });
    const tierMat = new THREE.MeshStandardMaterial({ color: 0x0e1320, roughness: 0.75, metalness: 0.25 });
    const canopySoffitMat = new THREE.MeshBasicMaterial({ color: 0x2b2318 });
    const warmStripMat = new THREE.MeshBasicMaterial({ color: 0xffe0a8 });

    function addGrandstand(centerX, centerZ, yaw, lengthM) {
        const gs = new THREE.Group();
        gs.position.set(centerX, 0, centerZ);
        gs.rotation.y = yaw;

        // 5 stepped seating tiers rising back away from the track (+Z in local grandstand frame = backward)
        for (let t = 0; t < 5; t++) {
            const tier = new THREE.Mesh(new THREE.BoxGeometry(lengthM, 1.15, 1.85), tierMat);
            tier.position.set(0, 1.1 + t * 1.15, t * 1.65);
            gs.add(tier);
        }

        // Rear stadium wall & cantilevered steel roof canopy
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

        // Populate twinkling spectator smartphone lights & camera flashes in the seating tiers
        const count = Math.floor(lengthM * 3.2);
        for (let c = 0; c < count; c++) {
            const t = Math.floor(Math.random() * 5);
            const lx = (Math.random() - 0.5) * (lengthM - 2.0);
            const ly = 1.85 + t * 1.15 + Math.random() * 0.35;
            const lz = t * 1.65 - 0.55;
            const wp = new THREE.Vector3(lx, ly, lz).applyMatrix4(gs.matrixWorld);
            crowdFlashPositions.push(wp);
        }
    }

    // Main Straight Outer Stadium Grandstand (z = +50.5, facing -Z toward Starting Grid & Pit Garages)
    addGrandstand(2.0, 50.5, 0, 54);

    // Turn 1-2 Outer Sweeping Corner Grandstand
    const t1 = sampleCircuitFrame(0.20);
    const t1Yaw = Math.atan2(t1.right.x, t1.right.z);
    addGrandstand(t1.pos.x + t1.right.x * 16.5, t1.pos.z + t1.right.z * 16.5, t1Yaw, 34);

    // Parabolica Outer Corner Grandstand
    const p1 = sampleCircuitFrame(0.74);
    const p1Yaw = Math.atan2(p1.right.x, p1.right.z);
    addGrandstand(p1.pos.x + p1.right.x * 16.5, p1.pos.z + p1.right.z * 16.5, p1Yaw, 32);

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
            size: 0.85,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        scene.add(crowdFlashPoints);
    }
})();

// 11. Corner Braking Distance Boards (150m / 100m / 50m) & Trackside FIA DigiFlag LED Panels
(function buildBrakingBoardsAndDigiFlags() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.5, metalness: 0.75 });
    const brakeZones = [
        [0.080, '150'], [0.106, '100'], [0.132, '50'], // Turn 1 braking zone
        [0.560, '150'], [0.586, '100'], [0.612, '50']  // Parabolica braking zone
    ];
    brakeZones.forEach(([uPos, label]) => {
        const fr = sampleCircuitFrame(uPos);
        const yaw = Math.atan2(-fr.tang.x, -fr.tang.z);
        const tex = makeBrakingBoardTexture(label);
        const board = new THREE.Mesh(
            new THREE.BoxGeometry(1.35, 0.88, 0.08),
            new THREE.MeshStandardMaterial({
                map: tex,
                emissive: new THREE.Color(0xffffff),
                emissiveMap: tex,
                emissiveIntensity: 0.35,
                roughness: 0.35
            })
        );
        const off = TRACK_HALF_W + 2.3;
        board.position.set(fr.pos.x + fr.right.x * off, 1.05, fr.pos.z + fr.right.z * off);
        board.rotation.y = yaw;
        scene.add(board);

        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.05, 0.10), postMat);
        leg.position.set(board.position.x, 0.52, board.position.z);
        scene.add(leg);
    });

    // 14 FIA Digital Flag LED Marshal Panels around the circuit with subtle green/cyan night glow
    for (let d = 0; d < 14; d++) {
        const u = (d + 0.5) / 14;
        const fr = sampleCircuitFrame(u);
        const yaw = Math.atan2(-fr.tang.x, -fr.tang.z);
        const side = (d % 2 === 0) ? 1 : -1;
        const off = side * (BARRIER_OFF - 0.35);

        const housing = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.85, 0.14), postMat);
        housing.position.set(fr.pos.x + fr.right.x * off, 2.15, fr.pos.z + fr.right.z * off);
        housing.rotation.y = yaw - side * 0.25;
        scene.add(housing);

        const digiMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
        digiFlagMaterials.push(digiMat);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.68), digiMat);
        screen.position.copy(housing.position);
        screen.rotation.copy(housing.rotation);
        screen.translateZ(0.08);
        scene.add(screen);
    }
})();

// 12. 3D GLSL Midnight Night-Sky Dome, Pinpoint Stars & 48-Tower Illuminated Night Metropolis Skyline
let aviationBeaconMat = null;
(function buildMidnightSkyAndMetropolis() {
    // A) Custom GLSL Midnight Sky Dome (pitch-black zenith + subtle nocturnal city light-pollution horizon)
    const skyGeo = new THREE.SphereGeometry(520, 40, 24);
    const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
            uZenith:  { value: new THREE.Color(0x010205) },
            uMidSky:  { value: new THREE.Color(0x02050d) },
            uHorizon: { value: new THREE.Color(0x060d1e) }
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
            'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
            'float noise(vec2 p) {',
            '    vec2 i = floor(p); vec2 f = fract(p);',
            '    f = f * f * (3.0 - 2.0 * f);',
            '    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),',
            '               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);',
            '}',
            'void main() {',
            '    vec3 dir = normalize(vWorldPos);',
            '    float h = clamp(dir.y, 0.0, 1.0);',
            '    vec3 col = mix(uHorizon, uMidSky, smoothstep(0.0, 0.22, h));',
            '    col = mix(col, uZenith, smoothstep(0.18, 0.72, h));',
            '    // Subtle nocturnal clouds dimly lit from below by city & stadium floodlights',
            '    if (h > 0.02 && h < 0.55) {',
            '        vec2 uv = dir.xz / (h + 0.14) * 1.4;',
            '        float cl = noise(uv) * 0.65 + noise(uv * 2.3) * 0.35;',
            '        float mask = smoothstep(0.02, 0.14, h) * (1.0 - smoothstep(0.20, 0.55, h));',
            '        col += vec3(0.018, 0.032, 0.068) * smoothstep(0.45, 0.85, cl) * mask;',
            '    }',
            '    gl_FragColor = vec4(col, 1.0);',
            '}'
        ].join('\n')
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.renderOrder = -100;
    scene.add(skyDome);

    // B) Realistic Pinpoint Astronomical Starfield (using smooth radial flare sprite, zero square pixels)
    const starCount = 560;
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
        const tint = i % 4;
        const br = 0.45 + (i % 7) * 0.08;
        starCol[i * 3]     = tint === 0 ? br * 0.85 : br;
        starCol[i * 3 + 1] = br * 0.94;
        starCol[i * 3 + 2] = tint === 1 ? br * 0.82 : br;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
        map: gpTextures.flareTex,
        size: 2.3,
        vertexColors: true,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
    }));
    scene.add(stars);

    // C) 48-Tower Illuminated Night Metropolis Skyline (Singapore Marina Bay / Jeddah / Vegas vibe)
    const towerCount = 48;
    const towerMat = new THREE.MeshStandardMaterial({
        map: gpTextures.skyscraperTex,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: gpTextures.skyscraperTex,
        emissiveIntensity: 0.72,
        roughness: 0.25,
        metalness: 0.80
    });
    const crownColors = [0x00c8ff, 0x1e5bc6, 0xff1801, 0xffb800, 0xe8f0ff];
    const beaconPositions = [];

    for (let t = 0; t < towerCount; t++) {
        const ang = (t / towerCount) * Math.PI * 2 + (t % 3) * 0.04;
        const dist = 108 + (t * 37) % 105;
        const tx = Math.cos(ang) * dist;
        const tz = Math.sin(ang) * dist * 0.86;
        const w = 10 + (t * 7) % 14;
        const d = 10 + (t * 11) % 14;
        const h = 26 + ((t * 29) % 68);

        const bGeo = new THREE.BoxGeometry(w, h, d);
        // Scale UVs proportionally to building width & height so window grid stays crisp & uniform
        const uvAttr = bGeo.attributes.uv;
        const repX = Math.max(1, Math.round(w / 11));
        const repY = Math.max(1, Math.round(h / 32));
        for (let k = 0; k < uvAttr.count; k++) {
            uvAttr.setXY(k, uvAttr.getX(k) * repX, uvAttr.getY(k) * repY);
        }

        const towerMesh = new THREE.Mesh(bGeo, towerMat);
        towerMesh.position.set(tx, h / 2, tz);
        towerMesh.rotation.y = -ang + (t % 2) * 0.35;
        scene.add(towerMesh);

        // Architectural rooftop LED crown strip on signature taller skyscrapers
        if (h > 44) {
            const crown = new THREE.Mesh(
                new THREE.BoxGeometry(w + 0.3, 0.38, d + 0.3),
                new THREE.MeshBasicMaterial({ color: crownColors[t % crownColors.length] })
            );
            crown.position.set(tx, h + 0.18, tz);
            crown.rotation.y = towerMesh.rotation.y;
            scene.add(crown);

            beaconPositions.push(tx, h + 1.4, tz);
        }
    }

    // Pulsing Red FAA Rooftop Aviation Warning Beacons across the night skyline
    if (beaconPositions.length) {
        const bcGeo = new THREE.BufferGeometry();
        bcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(beaconPositions), 3));
        aviationBeaconMat = new THREE.PointsMaterial({
            map: gpTextures.redFlareTex,
            size: 3.4,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        scene.add(new THREE.Points(bcGeo, aviationBeaconMat));
    }

    // Distant harbor / city street-level bokeh lights around horizon
    const bokehCount = 480;
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
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    })));
})();

// ==========================================================
//  HIGH-RESOLUTION 2026 ORACLE RED BULL RACING RB22 (.glb)
// ==========================================================
const carGroup = new THREE.Group();
const chassisDynamicsGroup = new THREE.Group();
carGroup.add(chassisDynamicsGroup);
scene.add(carGroup);

// Ground-effect under-chassis & 4-tyre Ambient Occlusion Contact Shadow (keeps RB22 100% planted!)
const carContactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.38, 5.25),
    new THREE.MeshBasicMaterial({
        map: gpTextures.contactShadowTex,
        transparent: true,
        opacity: 0.94,
        depthWrite: false
    })
);
carContactShadow.rotation.x = -Math.PI / 2;
carContactShadow.position.set(0, 0.006, 0.02);
carContactShadow.renderOrder = -3;
carGroup.add(carContactShadow);

// FIA Rear Rain / ERS Tail-Light Optical Halo Sprite + Real Crimson Wet-Asphalt Tail PointLight
const rearRainHaloSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: gpTextures.redFlareTex,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false
}));
rearRainHaloSprite.position.set(0, 0.34, 2.46); // rear crash structure in carGroup (+Z is behind car)
rearRainHaloSprite.scale.set(0.85, 0.85, 1);
chassisDynamicsGroup.add(rearRainHaloSprite);

const rearTailLight = new THREE.PointLight(0xff1400, 1.5, 7.5, 2.0);
rearTailLight.position.set(0, 0.36, 2.65);
carGroup.add(rearTailLight);

// Glowing Carbon-Brake Wheel Rim Heat PointLight (flares cherry-orange in heavy braking zones)
const brakeGlowLight = new THREE.PointLight(0xff3c00, 0.0, 5.2, 2.0);
brakeGlowLight.position.set(0, 0.34, -1.1);
carGroup.add(brakeGlowLight);

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
const aeroStreaks = new THREE.LineSegments(aeroStreakGeo, aeroStreakMat);
carGroup.add(aeroStreaks);

// Authentic Night-Race Titanium Skid-Block Underfloor Spark System (world-space bouncing hot sparks!)
const SPARK_COUNT = 52;
const sparkGeo = new THREE.BufferGeometry();
const sparkPosArr = new Float32Array(SPARK_COUNT * 2 * 3);
const sparkColArr = new Float32Array(SPARK_COUNT * 2 * 3);
for (let i = 0; i < SPARK_COUNT; i++) {
    const i6 = i * 6;
    // Head = white-hot gold, Tail = fiery amber-orange
    sparkColArr[i6]     = 1.00; sparkColArr[i6 + 1] = 0.92; sparkColArr[i6 + 2] = 0.65;
    sparkColArr[i6 + 3] = 1.00; sparkColArr[i6 + 4] = 0.42; sparkColArr[i6 + 5] = 0.05;
}
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPosArr, 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColArr, 3));
const sparkMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
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
const CAR_FIT_LENGTH = 5.0;       // 5.0m scaled length on 11.6m-wide FIA track
const CAR_ROTATION_Y = Math.PI;   // RB22 nose (+Z in model space) -> -Z forward in carGroup
const CAR_Y_OFFSET   = 0.004;

const wheelElements = [];
const frontSteerPivots = [];
let rb22RearActiveFlap = null;
let rb22FrontActiveFlap = null;
const rb22RearLightMats = [];
const rb22DrsLedMats = [];
const rb22BrakeDiscMats = [];

function syncRedBullActiveAero() {
    if (rb22RearActiveFlap) {
        gsap.to(rb22RearActiveFlap.rotation, {
            x: isDrsOn ? -0.36 : 0,
            duration: 0.45,
            ease: isDrsOn ? 'power2.out' : 'power2.inOut'
        });
    }
    if (rb22FrontActiveFlap) {
        gsap.to(rb22FrontActiveFlap.rotation, {
            x: isDrsOn ? -0.24 : 0,
            duration: 0.45,
            ease: isDrsOn ? 'power2.out' : 'power2.inOut'
        });
    }
    rb22DrsLedMats.forEach((mat) => {
        mat.emissive = new THREE.Color(isDrsOn ? 0x10b981 : 0x000000);
        mat.emissiveIntensity = isDrsOn ? 2.4 : 0.0;
    });
    trackGlow.color.setHex(isDrsOn ? 0x00d2ff : 0xff1801);
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

    carLoader.load(
        CAR_MODEL_URL,
        (gltf) => {
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

            rb22RearActiveFlap = model.getObjectByName('modex_26_62') || null;
            rb22FrontActiveFlap = model.getObjectByName('modez_109_65') || null;

            const upgradedMaterials = new Map();
            model.traverse((obj) => {
                if (!obj.isMesh || !obj.material) return;
                const origMat = obj.material;
                const matName = origMat.name || '';

                // Enable real dynamic night-floodlight shadow casting & self-shadowing across the RB22!
                if (matName !== 'glass.002' && matName !== 'decal.002') {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }

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

                if (matName === 'chasis.002' || matName === 'chassis2.002' || matName === 'decal.002') {
                    const isDecal = matName === 'decal.002';
                    finalMat = new THREE.MeshPhysicalMaterial({
                        name: matName,
                        map: origMat.map || null,
                        color: origMat.color ? origMat.color.clone() : new THREE.Color(0xffffff),
                        roughness: isDecal ? 0.06 : 0.11,
                        metalness: 0.10,
                        clearcoat: 1.0,
                        clearcoatRoughness: 0.035,
                        envMapIntensity: 1.85,
                        transparent: isDecal || origMat.transparent,
                        opacity: origMat.opacity,
                        side: origMat.side,
                        depthWrite: !isDecal,
                        polygonOffset: isDecal,
                        polygonOffsetFactor: isDecal ? -1 : 0,
                        polygonOffsetUnits: isDecal ? -1 : 0
                    });
                } else if (matName === 'TIRE_SIDES.002') {
                    finalMat.roughness = 0.20;
                    finalMat.metalness = 0.18;
                    finalMat.envMapIntensity = 1.25;
                } else if (matName === 'TIRE_TREAD.002') {
                    finalMat.roughness = 0.42;
                    finalMat.metalness = 0.08;
                    finalMat.envMapIntensity = 0.95;
                } else if (matName === 'discs.002') {
                    finalMat.emissive = new THREE.Color(0xff3800);
                    finalMat.emissiveIntensity = 0.0;
                    rb22BrakeDiscMats.push(finalMat);
                } else if (matName === 'carbon.002') {
                    finalMat.roughness = 0.26;
                    finalMat.envMapIntensity = 1.45;
                } else if (matName === 'chrome.002' || matName === 'mirrors.002' || matName === 'redbull_wheel_hub.002' || matName === 'redbull_detail.002') {
                    finalMat.envMapIntensity = 1.85;
                } else if (matName === 'glass.002') {
                    finalMat.transparent = true;
                    finalMat.opacity = 0.34;
                    finalMat.roughness = 0.04;
                    finalMat.depthWrite = false;
                    finalMat.envMapIntensity = 2.0;
                } else if (matName === 'gp21_LCD.002') {
                    finalMat.emissive = new THREE.Color(0xffffff);
                    finalMat.emissiveMap = finalMat.map;
                    finalMat.emissiveIntensity = 1.15;
                } else if (matName === 'rear_light.002' || matName === 'rtt_light.002') {
                    finalMat.emissive = new THREE.Color(0xff1801);
                    finalMat.emissiveIntensity = 2.0;
                    rb22RearLightMats.push(finalMat);
                } else if (matName === 'TAG_DRS_ON.002' || matName === 'kers_green.002') {
                    rb22DrsLedMats.push(finalMat);
                } else if ('envMapIntensity' in finalMat) {
                    finalMat.envMapIntensity = 1.35;
                }

                finalMat.needsUpdate = true;
                upgradedMaterials.set(origMat, finalMat);
                obj.material = finalMat;
            });

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
            window.__carModel = model;
            syncRedBullActiveAero();
            console.log('[RB22] Loaded 2026 Oracle Red Bull Racing RB22 in Photorealistic Midnight Night GP Spec.');
        },
        undefined,
        (err) => {
            console.error('[RB22] Failed to load "' + CAR_MODEL_URL + '". Serve via local HTTP server.', err);
        }
    );
}

// ==========================================================
//  SCROLL-DRIVEN LAP KINEMATICS, TELEMETRY & BROADCAST RIG
// ==========================================================
let currentMouseX = 0;
let currentMouseY = 0;
let lastScrollT = 0;
let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
});

const telemetryTracker = { progress: 0 };
const speedo = document.getElementById('speedo');
const speedBar = document.getElementById('speed-bar');
const laps = document.querySelectorAll('.hud-lap');
const scrollNavItems = document.querySelectorAll('.scroll-nav-item');
const customProgressBar = document.getElementById('scroll-progress-bar');
const minimapCar = document.getElementById('minimap-car');
const sectorDisplay = document.getElementById('sector-display');
const trackPath = document.getElementById('minimap-track-path');
const activePath = document.getElementById('minimap-track-path-active');
const ledElements = document.querySelectorAll('.rev-led');
const gearIndicator = document.getElementById('gear-indicator');
const minimapPathLength = trackPath ? trackPath.getTotalLength() : 0;

// Place RB22 cleanly in P1 Pole Position on the Main Straight at startup
const initialGridFrame = sampleCircuitFrame(0);
carGroup.position.set(initialGridFrame.pos.x, 0, initialGridFrame.pos.z);
carGroup.rotation.y = Math.atan2(-initialGridFrame.tang.x, -initialGridFrame.tang.z);

// Unified Night-Grid Broadcast Camera rig + additive opening dolly offset (zero snap on first scroll!)
const targetCameraPosition = new THREE.Vector3();
const targetLookAt = new THREE.Vector3(initialGridFrame.pos.x, 0.52, initialGridFrame.pos.z);
const introDollyOffset = { forward: 6.5, right: 4.8, up: 3.6, shiftBlend: 0.35 };
let fovLaunchActive = false;
let introCamTween = null;

function playOpeningGridDolly() {
    if (introCamTween) introCamTween.kill();
    introCamTween = gsap.to(introDollyOffset, {
        forward: 0,
        right: 0,
        up: 0,
        shiftBlend: 1.0,
        duration: 1.55,
        ease: 'power3.out'
    });
}
if (!document.getElementById('start-lights')) {
    playOpeningGridDolly();
}

// Hook called when Start-Lights Launch extinguishes all 5 red lights!
window.__onF1LightsOut = function () {
    gantryStartLightBulbs.forEach((m) => m.color.setHex(0x160505));
    gantryStartLightSprites.forEach((s) => { s.visible = false; });
};

// Bind all [data-target] navigation triggers (scrollbar dots, top nav laps, hero CTA, new lap)
document.querySelectorAll('[data-target]').forEach((item) => {
    item.addEventListener('click', () => {
        playUiTick(1040);
        const targetId = item.getAttribute('data-target');
        smoothScrollToTarget(targetId);
    });
});
const brandHomeBtn = document.getElementById('brand-home-btn');
if (brandHomeBtn) {
    brandHomeBtn.addEventListener('click', () => {
        playUiTick(1040);
        smoothScrollToTarget(0);
    });
}

// --- 4-MODE F1 TV BROADCAST CAMERA DIRECTOR & 360° ORBIT INSPECTOR ---
let activeCamMode = 'chase'; // 'chase' | 'halo' | 'pod' | 'orbit'
let orbitYaw = 0.65;
let orbitPitch = 0.28;
let orbitRadius = 4.15;
let isOrbitDragging = false;
let orbitLastX = 0;
let orbitLastY = 0;

// Car-local camera rig smoothed basis offsets (eliminates lag on Halo/Wheel onboard mounts!)
let localCamState = { f: 11.4, r: 8.0, u: 5.05, lf: 0, lr: -1.25, lu: 0.52, initialized: false };

const camPills = document.querySelectorAll('.cam-pill');
function setCameraMode(mode) {
    if (!['chase', 'halo', 'pod', 'orbit'].includes(mode)) return;
    activeCamMode = mode;
    playUiTick(mode === 'orbit' ? 1240 : 940);
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
camPills.forEach((btn) => {
    btn.addEventListener('click', () => setCameraMode(btn.getAttribute('data-cam')));
});

// 360° Orbit pointer drag on open 3D canvas
window.addEventListener('pointerdown', (e) => {
    if (activeCamMode !== 'orbit') return;
    if (e.target.closest('button, a, input, textarea, nav, .broadcast-panel, #project-viewport, .hud-dock, .scroll-nav-container, #start-lights')) return;
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

// Global F1 Telemetry Keyboard Shortcuts: [1-4] Camera Modes, [D] DRS Wing, [M] Audio Mute
window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/i.test(e.target.tagName)) return;
    if (document.getElementById('start-lights')) return;
    if (e.key === '1') setCameraMode('chase');
    else if (e.key === '2') setCameraMode('halo');
    else if (e.key === '3') setCameraMode('pod');
    else if (e.key === '4') setCameraMode('orbit');
    else if (e.key === 'd' || e.key === 'D') toggleDrsAero();
    else if (e.key === 'm' || e.key === 'M') toggleAudioMute();
});

if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => {
        if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
    const mainEl = document.querySelector('main');
    if (mainEl) ro.observe(mainEl);
}

window.addEventListener('scroll', () => {
    lastScrollT = performance.now();
}, { passive: true });

let smoothLapProgress = 0;
let prevSmoothProgress = 0;
let smoothSpeedMps = 0;
let throttleSurge = 0;
let smoothSteer = 0;
let smoothPitch = 0;
let smoothRoll = 0;
let displayRPM = 0;
let lastFrameTime = performance.now();

const broadcastCamKeys = [
    [0.00,  4.9,  3.2, 1.45,  1.25], // S1 Grid Start (UI Left): Front-right 3/4 P1 Night Grid showcase
    [0.06,  0.2,  4.3, 1.52,  0.35], // Smooth wide trackside sweep past Start/Finish Gantry (no point-blank whip!)
    [0.14, -5.1,  2.5, 1.55, -0.85], // Settle cleanly into F1 TV Low Chase Cam entering Turn 1 braking zone
    [0.28, -5.0,  2.7, 1.48, -1.45], // S2 Pit / Turn 1-2 Complex (UI Right): Left-framed floodlit cornering pursuit
    [0.46, -4.8, -2.2, 1.38,  1.05], // S3 DRS Back Straight entry (UI Left): Low inner-kerb aero pursuit
    [0.66, -5.3,  2.0, 1.50,  0.85], // S3 DRS Straight under DRS Gantry: High-speed over-wing chase
    [0.84, -4.9,  3.0, 1.60, -1.45], // S4 Parabolica Sweep (UI Right): Sweeping floodlit corner chase
    [1.00, -4.6,  2.8, 1.52, -1.55]  // S4 Checkered Finish Line (UI Right): Night GP victory frame
];
let manualSliderOverrideUntil = 0;

function stepTitaniumSparks(dt, absSpeed, frame) {
    const emitActive = absSpeed > 13.0 || (isDrsOn && absSpeed > 3.5);
    if (emitActive) {
        const spawnBurst = Math.min(4, 1 + Math.floor(absSpeed / 26) + (isDrsOn ? 1 : 0));
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
            const sideKick = (Math.random() - 0.5) * 3.4;
            sp.vx = backX * ejectSpeed + frame.right.x * sideKick;
            sp.vy = 0.75 + Math.random() * 1.95;
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
            sp.vy -= 9.8 * dt; // gravity
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.z += sp.vz * dt;
            // Realistic bounce off the asphalt surface!
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

function stepLapSimulation(nowMs) {
    const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameTime) * 0.001));
    lastFrameTime = nowMs;

    // 1. Live normalized page scroll [0, 1] from active scrollingElement (DPI-rounding safe)
    const scroller = document.scrollingElement || document.documentElement;
    const scrollTop = Math.max(0, window.scrollY || window.pageYOffset || scroller.scrollTop || document.body.scrollTop || 0);
    const maxScroll = Math.max(1, scroller.scrollHeight - window.innerHeight);
    const rawTargetP = (maxScroll - scrollTop <= 1.5)
        ? 1.0
        : Math.min(1, Math.max(0, scrollTop / maxScroll));

    const lerpAlpha = 1 - Math.exp(-dt * 9.5);
    smoothLapProgress += (rawTargetP - smoothLapProgress) * lerpAlpha;
    if (Math.abs(rawTargetP - smoothLapProgress) < 0.00002) smoothLapProgress = rawTargetP;
    telemetryTracker.progress = smoothLapProgress;

    // 2. Physical distance travelled & velocity along the 320m Night Grand Prix circuit
    const lapMultiplier = 1.032;
    const prevU = prevSmoothProgress * lapMultiplier;
    const currU = smoothLapProgress * lapMultiplier;
    const deltaU = currU - prevU;
    prevSmoothProgress = smoothLapProgress;

    const deltaMeters = deltaU * circuitTotalLength;
    const instSpeedMps = deltaMeters / dt;
    const prevSpeed = smoothSpeedMps;
    smoothSpeedMps += (instSpeedMps - smoothSpeedMps) * (1 - Math.exp(-dt * 12));
    const absSpeed = Math.abs(smoothSpeedMps);
    const accel = (smoothSpeedMps - prevSpeed) / dt;

    // 3. Position & orient the 2026 Red Bull RB22 along circuitCurve
    const frame = sampleCircuitFrame(currU);
    const aheadFrame = sampleCircuitFrame(currU + 0.012);

    const curvature = frame.tang.x * aheadFrame.tang.z - frame.tang.z * aheadFrame.tang.x;
    const racingLineOffset = Math.max(-2.1, Math.min(2.1, curvature * 6.5));

    carGroup.position.set(
        frame.pos.x + frame.right.x * racingLineOffset,
        0,
        frame.pos.z + frame.right.z * racingLineOffset
    );
    carGroup.rotation.y = Math.atan2(-frame.tang.x, -frame.tang.z);

    // 4. Rolling-Without-Slip 3D Pirelli Wheel Spin + Front Wheel Cornering Steer
    const drsSpinBoost = isDrsOn ? 1.25 : 1.0;
    const wheelRollAngle = (deltaMeters / 0.34) * drsSpinBoost;
    if (Math.abs(wheelRollAngle) > 0.00001) {
        for (let i = 0; i < wheelElements.length; i++) {
            wheelElements[i].rotateX(wheelRollAngle);
        }
    }

    const targetSteer = Math.max(-0.26, Math.min(0.26, -curvature * 1.35));
    smoothSteer += (targetSteer - smoothSteer) * (1 - Math.exp(-dt * 10));
    for (let i = 0; i < frontSteerPivots.length; i++) {
        frontSteerPivots[i].rotation.y = smoothSteer;
    }

    // 5. Chassis Squat/Dive, Lateral G-Force Roll & High-Speed Road Micro-Vibration
    const targetPitch = Math.max(-0.022, Math.min(0.022, -accel * 0.00035));
    const targetRoll = Math.max(-0.028, Math.min(0.028, curvature * Math.min(1, absSpeed / 22) * 0.14));
    smoothPitch += (targetPitch - smoothPitch) * (1 - Math.exp(-dt * 10));
    smoothRoll += (targetRoll - smoothRoll) * (1 - Math.exp(-dt * 10));
    const roadBuzz = Math.min(1, absSpeed / 35) * Math.sin(nowMs * 0.055) * 0.0035;
    chassisDynamicsGroup.position.y = roadBuzz;
    chassisDynamicsGroup.rotation.x = smoothPitch;
    chassisDynamicsGroup.rotation.z = smoothRoll;

    // 6. Glowing Hot Carbon-Ceramic Brake Discs & Wheel-Rim Heat Glow in Night Braking Zones
    const uMod = frame.u;
    const inBrakeZone = (uMod > 0.075 && uMod < 0.19) || (uMod > 0.555 && uMod < 0.68);
    const decelHeat = Math.max(0, -Math.abs(instSpeedMps) + absSpeed) * 0.09;
    const zoneHeat = (inBrakeZone && absSpeed > 2.2) ? Math.min(2.6, absSpeed * 0.10) : 0;
    const targetGlow = Math.min(2.8, zoneHeat + decelHeat);
    for (let i = 0; i < rb22BrakeDiscMats.length; i++) {
        const m = rb22BrakeDiscMats[i];
        m.emissiveIntensity += (targetGlow - m.emissiveIntensity) * (1 - Math.exp(-dt * 7));
    }
    brakeGlowLight.intensity += (targetGlow * 0.65 - brakeGlowLight.intensity) * (1 - Math.exp(-dt * 7));

    // 7. 3D Titanium Skid-Block Underfloor Sparks & Aero Slipstream Streaks
    stepTitaniumSparks(dt, absSpeed, frame);

    const streakIntensity = Math.min(0.45, (absSpeed / 105) * 0.30 + (isDrsOn ? 0.22 : 0));
    aeroStreakMat.opacity += (streakIntensity - aeroStreakMat.opacity) * 0.12;
    if (aeroStreakMat.opacity > 0.01) {
        const posAttr = aeroStreakGeo.attributes.position;
        const flowStep = (14 + absSpeed * 0.65 + (isDrsOn ? 22 : 0)) * dt;
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

    // 8. Broadcast Night Chase Camera Rig + Throttle Surge
    const targetSurge = Math.max(-0.9, Math.min(1.85, smoothSpeedMps * 0.028));
    throttleSurge += (targetSurge - throttleSurge) * (1 - Math.exp(-dt * 8));

    {
        const p = smoothLapProgress;
        let desF = 4.9, desR = 3.2, desU = 1.45, desLookF = 0.0, desLookR = 0.0, desLookU = 0.52;
        let baseModeFov = 58;

        if (activeCamMode === 'halo') {
            // FIA Onboard Halo / T-Cam: bolted above airbox looking down the floodlit apex
            desF = -0.18;
            desR = 0.0;
            desU = 1.17 + roadBuzz * 1.4;
            desLookF = 18.5;
            desLookR = -smoothSteer * 11.0;
            desLookU = 0.68;
            baseModeFov = 66;
        } else if (activeCamMode === 'pod') {
            // Front-Left Pirelli Wheel & Glowing Carbon-Brake Aero Pod Cam
            desF = -0.45;
            desR = -1.36;
            desU = 0.58 + roadBuzz * 1.2;
            desLookF = 9.5;
            desLookR = -0.42 - smoothSteer * 4.5;
            desLookU = 0.44;
            baseModeFov = 63;
        } else if (activeCamMode === 'orbit') {
            // Interactive 360° Turntable Inspection Rig around the moving RB22
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
            // Default Choreographed F1 TV Broadcast Chase Cam
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
            const dollyScrollFade = Math.max(0, 1 - p * 14);
            const effCf = cf + introDollyOffset.forward * dollyScrollFade;
            const effCr = cr + introDollyOffset.right * dollyScrollFade;
            const effCh = ch + introDollyOffset.up * dollyScrollFade;

            const chaseBlend = Math.max(0, Math.min(1, -effCf / 3.0));
            const surgePull = -throttleSurge * (0.25 + 0.75 * chaseBlend);

            desF = effCf + surgePull;
            desR = effCr;
            desU = effCh;

            // Convert screen-space horizontal UI framing shift into car-local basis
            const tmpCamX = frame.tang.x * desF + frame.right.x * desR;
            const tmpCamZ = frame.tang.z * desF + frame.right.z * desR;
            const vLen = Math.hypot(-tmpCamX, -tmpCamZ) || 1;
            const camRightX = tmpCamZ / vLen;
            const camRightZ = -tmpCamX / vLen;
            const responsiveScale = window.innerWidth < 768 ? 0.22 : 1.0;
            const effShiftBlend = 1 - (1 - introDollyOffset.shiftBlend) * dollyScrollFade;
            const shiftMeters = cShift * responsiveScale * effShiftBlend;

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
            const camFollowRate = 1 - Math.exp(-dt * 9.5);
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

        if (!fovLaunchActive && !document.getElementById('start-lights')) {
            const speedFovAdd = activeCamMode === 'orbit' ? 0 : Math.min(8.5, absSpeed * 0.14) + (isDrsOn ? 5.0 : 0);
            const targetFov = baseModeFov + speedFovAdd;
            if (Math.abs(camera.fov - targetFov) > 0.05) {
                camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-dt * 6.5));
                camera.updateProjectionMatrix();
            }
        }
    }

    // 9. Sync Section Indicators, #drs Sticky Project Slider, Scrollbar, Minimap & Telemetry HUD
    const sections = ['grid', 'pit', 'drs', 'podium'];
    const offsets = sections.map((id) => {
        const el = document.getElementById(id);
        return el ? el.offsetTop : 0;
    });

    // Smoothly scrub #project-viewport (GARAGE 01 -> 02 -> 03) across #drs's 200vh sticky pinned zone
    // while still respecting manual mouse/touch drag on the slider!
    const drsSectionEl = document.getElementById('drs');
    const projViewport = document.getElementById('project-viewport');
    if (drsSectionEl && projViewport && nowMs > manualSliderOverrideUntil) {
        const stickyTravel = Math.max(1, drsSectionEl.offsetHeight - window.innerHeight);
        const maxLeft = Math.max(0, projViewport.scrollWidth - projViewport.clientWidth);
        if (maxLeft > 2 && scrollTop >= offsets[2] - 40 && scrollTop <= offsets[2] + stickyTravel + 40) {
            const drsP = Math.min(1, Math.max(0, (scrollTop - offsets[2]) / stickyTravel));
            const targetLeft = drsP * maxLeft;
            projViewport.scrollLeft += (targetLeft - projViewport.scrollLeft) * (1 - Math.exp(-dt * 12));
        }
    }

    if (customProgressBar) {
        let progressPercent = 0;
        if (scrollTop <= offsets[0]) {
            progressPercent = 0;
        } else if (scrollTop >= offsets[3]) {
            progressPercent = 100;
        } else {
            let interval = 0;
            for (let i = 0; i < 3; i++) {
                if (scrollTop >= offsets[i] && scrollTop < offsets[i + 1]) {
                    interval = i;
                    break;
                }
            }
            const startOffset = offsets[interval];
            const endOffset = offsets[interval + 1];
            const localP = (scrollTop - startOffset) / (endOffset - startOffset || 1);
            progressPercent = ((interval + localP) / 3) * 100;
        }
        customProgressBar.style.height = `${progressPercent}%`;
    }

    let activeIdx = 0;
    if (scrollTop >= offsets[3] - window.innerHeight * 0.25) activeIdx = 3;
    else if (scrollTop >= offsets[2] - window.innerHeight * 0.25) activeIdx = 2;
    else if (scrollTop >= offsets[1] - window.innerHeight * 0.25) activeIdx = 1;

    scrollNavItems.forEach((navItem, idx) => {
        if (idx === activeIdx) navItem.classList.add('active');
        else navItem.classList.remove('active');
    });
    updateHUDTracker(activeIdx);

    const sectorColors = ['#ff1801', '#ffb700', '#00d2ff', '#ffd700'];
    const currentSectorColor = sectorColors[activeIdx] || '#ff1801';
    if (trackPath && activePath && minimapCar && minimapPathLength > 0) {
        const point = trackPath.getPointAtLength(smoothLapProgress * minimapPathLength);
        minimapCar.setAttribute('cx', point.x);
        minimapCar.setAttribute('cy', point.y);
        activePath.style.strokeDasharray = minimapPathLength;
        activePath.style.strokeDashoffset = minimapPathLength * (1 - smoothLapProgress);
        activePath.style.stroke = currentSectorColor;
        minimapCar.style.stroke = currentSectorColor;
        activePath.style.setProperty('--sector-glow', currentSectorColor);
        minimapCar.style.setProperty('--sector-glow', currentSectorColor);
    }
    if (sectorDisplay) sectorDisplay.innerText = `S${activeIdx + 1}`;

    const pseudoScrollVel = smoothSpeedMps * 38;
    if (absSpeed > 0.15) {
        updateEngineSound(pseudoScrollVel);
    } else if (audioCtx && nowMs - lastScrollT > 140) {
        updateEngineSound(0);
    }

    const targetRPM = (absSpeed > 0.25 || isDrsOn)
        ? Math.min(13500, Math.round(3800 + absSpeed * 185 + (isDrsOn ? 3200 : 0)))
        : 0;
    displayRPM += (targetRPM - displayRPM) * (1 - Math.exp(-dt * 11));
    const shownRPM = Math.round(displayRPM);
    if (speedo) speedo.innerText = shownRPM;
    if (speedBar) speedBar.style.width = `${(shownRPM / 13500) * 100}%`;

    const activeLedsCount = Math.floor((shownRPM / 13500) * ledElements.length);
    ledElements.forEach((led, idx) => {
        if (idx < activeLedsCount) led.classList.add('active');
        else led.classList.remove('active');
    });

    if (gearIndicator) {
        let gear = 'N';
        if (shownRPM > 900) {
            if (isDrsOn) gear = '8';
            else if (shownRPM < 5200) gear = '2';
            else if (shownRPM < 7000) gear = '3';
            else if (shownRPM < 8800) gear = '4';
            else if (shownRPM < 10400) gear = '5';
            else if (shownRPM < 11800) gear = '6';
            else gear = '7';
        }
        gearIndicator.innerText = gear;
    }

    // 10. Live Broadcast KM/H, 2D G-Force Accelerometer, Flying Lap Clock & Aero Speed-Warp Aura
    const liveKmh = (absSpeed > 0.25 || isDrsOn)
        ? Math.min(352, Math.round(absSpeed * 7.2 + (isDrsOn ? (absSpeed > 0.4 ? 34 : 18) : 0)))
        : 0;
    const kmhPad = String(liveKmh).padStart(3, '0');
    const navKmhEl = document.getElementById('nav-kmh');
    const hudKmhEl = document.getElementById('hud-kmh');
    const mobKmhEl = document.getElementById('mobile-kmh');
    if (navKmhEl) navKmhEl.textContent = kmhPad;
    if (hudKmhEl) hudKmhEl.textContent = kmhPad + ' KM/H';
    if (mobKmhEl) mobKmhEl.textContent = kmhPad;

    const minimapPctEl = document.getElementById('minimap-progress-pct');
    if (minimapPctEl) minimapPctEl.textContent = String(Math.round(smoothLapProgress * 100)).padStart(2, '0') + '%';

    const gDot = document.getElementById('g-force-dot');
    const gVal = document.getElementById('g-force-val');
    if (gDot && gVal) {
        const latG = Math.max(-4.8, Math.min(4.8, curvature * absSpeed * 0.42));
        const lonG = Math.max(-5.2, Math.min(3.4, accel * 0.025));
        const totalG = Math.min(5.6, Math.hypot(latG, lonG));
        const gx = Math.max(-11, Math.min(11, latG * 2.4));
        const gy = Math.max(-11, Math.min(11, -lonG * 2.2));
        gDot.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
        gVal.textContent = totalG.toFixed(1) + 'G';
    }

    const lapTimerEl = document.getElementById('nav-lap-timer');
    if (lapTimerEl && window.__lapStartMs) {
        const lapElapsed = Math.max(0, (nowMs - window.__lapStartMs) * 0.001);
        const mins = Math.floor(lapElapsed / 60);
        const secs = (lapElapsed % 60).toFixed(3).padStart(6, '0');
        lapTimerEl.textContent = `${mins}:${secs}`;
    }

    const warpOverlay = document.getElementById('aero-warp-overlay');
    if (warpOverlay && !PREFERS_REDUCED_MOTION) {
        const warpAlpha = Math.min(0.95, (liveKmh / 340) * 0.72 + (isDrsOn ? 0.32 : 0));
        warpOverlay.style.setProperty('--warp-opacity', warpAlpha.toFixed(3));
    }
}

// --- DRAGGABLE & MANUALLY SCROLLABLE PIT LANE SLIDER ---
const slider = document.getElementById('project-viewport');
if (slider) {
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('pointerdown', () => {
        manualSliderOverrideUntil = performance.now() + 2600;
    }, { passive: true });
    slider.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            manualSliderOverrideUntil = performance.now() + 2200;
        }
    }, { passive: true });

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        manualSliderOverrideUntil = performance.now() + 3000;
        slider.style.cursor = 'grabbing';
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.style.cursor = 'grab';
    });
    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.style.cursor = 'grab';
    });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2; // scroll speed multiplier
        slider.scrollLeft = scrollLeft - walk;
    });

    const bayPills = document.querySelectorAll('.bay-pill');
    const bayReadout = document.getElementById('drs-bay-readout');

    function syncGarageCoverflow() {
        const cards = slider.querySelectorAll('.garage-card');
        if (!cards.length) return;

        const containerWidth = slider.clientWidth || 1;
        const containerCenter = slider.scrollLeft + containerWidth * 0.5;

        let closestIdx = 0;
        let minDistance = Infinity;

        cards.forEach((card, idx) => {
            const cardCenter = card.offsetLeft + card.clientWidth * 0.5;
            const signedDist = (cardCenter - containerCenter) / Math.max(220, containerWidth * 0.65);
            const absDist = Math.abs(signedDist);
            if (absDist < minDistance) {
                minDistance = absDist;
                closestIdx = idx;
            }
            if (!PREFERS_REDUCED_MOTION) {
                const rotY = Math.max(-24, Math.min(24, -signedDist * 18));
                const tz = -Math.min(75, absDist * 55);
                const sc = Math.max(0.88, 1 - absDist * 0.09);
                card.style.transform = `translate3d(0, 0, ${tz.toFixed(1)}px) rotateY(${rotY.toFixed(1)}deg) scale(${sc.toFixed(3)})`;
            }
        });

        cards.forEach((card, idx) => {
            if (idx === closestIdx) card.classList.add('active-garage');
            else card.classList.remove('active-garage');
        });

        bayPills.forEach((pill, idx) => {
            if (idx === closestIdx) {
                pill.className = 'bay-pill active px-2 py-0.5 rounded border border-[#ff1801] bg-[#ff1801]/15 text-white cursor-pointer transition-all';
            } else {
                pill.className = 'bay-pill px-2 py-0.5 rounded border border-gray-800 bg-black/50 text-gray-400 hover:text-white cursor-pointer transition-all';
            }
        });
        if (bayReadout) bayReadout.textContent = `0${closestIdx + 1}/0${cards.length}`;
    }

    slider.addEventListener('scroll', syncGarageCoverflow, { passive: true });
    requestAnimationFrame(syncGarageCoverflow);

    bayPills.forEach((pill) => {
        pill.addEventListener('click', () => {
            const idx = Number(pill.getAttribute('data-bay')) || 0;
            const cards = slider.querySelectorAll('.garage-card');
            const targetCard = cards[idx];
            if (!targetCard) return;
            playUiTick(1080);
            manualSliderOverrideUntil = performance.now() + 3500;
            const targetLeft = Math.max(0, targetCard.offsetLeft - (slider.clientWidth - targetCard.clientWidth) * 0.5);
            slider.scrollTo({ left: targetLeft, behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth' });
        });
    });
}

// --- PANEL ENTRANCE REVEALS ---
// Each broadcast panel slides in from its own side as it enters view,
// then its inner rows cascade in with a stagger.
function nonCornerRows(panel) {
    return Array.prototype.slice.call(panel.children)
        .filter((c) => !/corner-accent/.test(c.className || ''));
}
function revealPanel(selector, dir, triggerEl) {
    const panel = document.querySelector(selector);
    if (!panel) return;
    const st = { trigger: triggerEl || panel, start: "top 82%", toggleActions: "play none none reverse" };
    gsap.from(panel, { x: dir * 90, autoAlpha: 0, duration: 1.0, ease: "power3.out", scrollTrigger: st });
    gsap.from(nonCornerRows(panel), {
        y: 26, autoAlpha: 0, duration: 0.55, stagger: 0.08, ease: "power2.out", delay: 0.12, scrollTrigger: st
    });
}

// S2 Pit → from right · S3 DRS → from left (triggered off the tall section) · S4 Podium → from right
revealPanel('#pit .broadcast-panel', 1);
revealPanel('#drs .broadcast-panel', -1, '#drs');
revealPanel('#podium .broadcast-panel', 1);

// S1 Hero → revealed by LIGHTS-OUT launch first, THEN mounts its #grid ScrollTrigger scrub
// so entrance tween and scroll-scrub tween never overwrite or fight each other!
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
            y: -80,
            immediateRender: false,
            scrollTrigger: {
                trigger: "#grid",
                start: "top top",
                end: "bottom top",
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
        { x: -90, y: 0, opacity: 0 },
        {
            x: 0,
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            onComplete: () => {
                heroRevealTween = null;
                mountHeroScrollScrub();
            }
        }
    );
    heroRowTween = gsap.from(nonCornerRows(heroPanel), {
        y: 24,
        autoAlpha: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.1,
        onComplete: () => { heroRowTween = null; }
    });
}

if (!document.getElementById('start-lights')) {
    mountHeroScrollScrub();
}

window.addEventListener('scroll', () => {
    if (!heroScrubMounted && window.scrollY > 2 && !document.documentElement.classList.contains('f1-scroll-locked')) {
        if (heroRevealTween) {
            heroRevealTween.progress(1).kill();
            heroRevealTween = null;
        }
        if (heroRowTween) {
            heroRowTween.progress(1).kill();
            heroRowTween = null;
        }
        mountHeroScrollScrub();
    }
}, { passive: true });

function updateHUDTracker(activeIdx) {
    laps.forEach((lap, idx) => {
        if (idx === activeIdx) {
            lap.className = "hud-lap border border-[#ff1801] px-2.5 py-1 text-white bg-[#ff1801]/10 cursor-pointer transition-all";
        } else {
            lap.className = "hud-lap border border-gray-800 px-2.5 py-1 text-gray-400 cursor-pointer transition-all hover:border-gray-600";
        }
    });
}

// --- SECTOR 2 PIRELLI TYRE TORQUE GAUGE SCROLL-LINKED SWEEP ---
(function initTyreGaugeTelemetry() {
    const arcs = document.querySelectorAll('.tyre-gauge-arc');
    const pcts = document.querySelectorAll('.tyre-pct');
    if (!arcs.length) return;

    function animateGauges() {
        arcs.forEach((arc, i) => {
            const target = Number(arc.getAttribute('data-gauge-target')) || 75;
            const proxy = { v: 0 };
            gsap.to(proxy, {
                v: target,
                duration: PREFERS_REDUCED_MOTION ? 0.05 : 1.15,
                delay: PREFERS_REDUCED_MOTION ? 0 : i * 0.10,
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

// --- CUSTOM F1 TELEMETRY RETICLE CURSOR, MAGNETIC MICRO-INTERACTIONS & CARBON SPOTLIGHT ---
(function initAwardMicroInteractions() {
    // 1. Real-time cursor-following carbon specular spotlight on .spotlight-card
    document.querySelectorAll('.spotlight-card').forEach((card) => {
        card.addEventListener('pointermove', (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${(e.clientX - rect.left).toFixed(1)}px`);
            card.style.setProperty('--my', `${(e.clientY - rect.top).toFixed(1)}px`);
        }, { passive: true });
    });

    if (PREFERS_REDUCED_MOTION) return;
    const finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!finePointer) return;

    // 2. Magnetic pull on [data-magnetic] controls
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            const dx = (e.clientX - (r.left + r.width * 0.5)) * 0.24;
            const dy = (e.clientY - (r.top + r.height * 0.5)) * 0.28;
            gsap.to(el, { x: Math.max(-8, Math.min(8, dx)), y: Math.max(-6, Math.min(6, dy)), duration: 0.25, ease: 'power2.out' });
        }, { passive: true });
        el.addEventListener('pointerleave', () => {
            gsap.to(el, { x: 0, y: 0, duration: 0.45, ease: 'elastic.out(1, 0.5)' });
        });
    });

    // 3. GPU-accelerated Telemetry Reticle Cursor
    const dot = document.getElementById('f1-cursor-dot');
    const ring = document.getElementById('f1-cursor-ring');
    const label = document.getElementById('f1-cursor-label');
    if (!dot || !ring) return;

    let cx = window.innerWidth * 0.5, cy = window.innerHeight * 0.5;
    let rx = cx, ry = cy;

    window.addEventListener('pointermove', (e) => {
        cx = e.clientX;
        cy = e.clientY;
        dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;

        const hoverTarget = e.target && e.target.closest
            ? e.target.closest('[data-cursor], button, a, .scroll-nav-item, #project-viewport')
            : null;
        if (hoverTarget) {
            document.body.classList.add('cursor-active');
            const customLabel = hoverTarget.getAttribute('data-cursor') || (activeCamMode === 'orbit' ? '360° ORBIT' : '');
            const compound = hoverTarget.style && hoverTarget.style.getPropertyValue('--compound');
            document.documentElement.style.setProperty('--cursor-accent', compound || '#ff1801');
            if (label && customLabel) {
                label.textContent = customLabel;
                document.body.classList.add('cursor-has-label');
            } else {
                document.body.classList.remove('cursor-has-label');
            }
        } else {
            document.body.classList.remove('cursor-active');
            document.documentElement.style.setProperty('--cursor-accent', '#ff1801');
            if (activeCamMode === 'orbit' && label && !document.getElementById('start-lights')) {
                label.textContent = 'DRAG 360°';
                document.body.classList.add('cursor-has-label');
            } else {
                document.body.classList.remove('cursor-has-label');
            }
        }
    }, { passive: true });

    gsap.ticker.add(() => {
        rx += (cx - rx) * 0.22;
        ry += (cy - ry) * 0.22;
        ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    });
})();

// --- MASTER ENGINE RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return; // Zero wasted GPU cycles when browser tab is hidden
    const nowMs = performance.now();
    const tSec = nowMs * 0.001;

    // Advance scroll-driven 320m Night Grand Prix lap physics, wheels, steering, sparks & chase camera
    stepLapSimulation(nowMs);

    currentMouseX += (mouseX - currentMouseX) * 0.06;
    currentMouseY += (mouseY - currentMouseY) * 0.06;

    // Apply subtle mouse parallax along camera's local view-right axis (never pushes into rear wing!)
    const lookDx = targetLookAt.x - targetCameraPosition.x;
    const lookDz = targetLookAt.z - targetCameraPosition.z;
    const lookLen = Math.hypot(lookDx, lookDz) || 1;
    const viewRightX = -lookDz / lookLen;
    const viewRightZ =  lookDx / lookLen;

    const parallaxScale = (activeCamMode === 'chase' && !PREFERS_REDUCED_MOTION) ? 1.0 : 0.14;
    const minCamY = activeCamMode === 'pod' ? 0.42 : 0.82;
    camera.position.set(
        targetCameraPosition.x + viewRightX * (currentMouseX * 1.15 * parallaxScale),
        Math.max(minCamY, targetCameraPosition.y + (-currentMouseY * 0.55 * parallaxScale)),
        targetCameraPosition.z + viewRightZ * (currentMouseX * 1.15 * parallaxScale)
    );
    camera.lookAt(targetLookAt);

    // Move shadow-casting stadium floodlight & dynamic nearest-4 trackside PointLight pool with the RB22
    const cx = carGroup.position.x;
    const cz = carGroup.position.z;
    trackGlow.position.set(cx, 0.28, cz);
    spotlight.position.set(cx + 5.5, 21.5, cz + 6.5);
    spotlight.target.position.set(cx, 0.25, cz);
    spotlight.target.updateMatrixWorld();

    // Assign dynamicTrackLights[0..3] to the 4 closest cantilever/gantry floodlight luminaires!
    if (floodLampWorldPositions.length >= 4) {
        let b0 = 1e9, b1 = 1e9, b2 = 1e9, b3 = 1e9;
        let i0 = 0, i1 = 1, i2 = 2, i3 = 3;
        for (let i = 0; i < floodLampWorldPositions.length; i++) {
            const lp = floodLampWorldPositions[i];
            const dx = lp.x - cx, dz = lp.z - cz;
            const d2 = dx * dx + dz * dz;
            if (d2 < b0) {
                b3 = b2; i3 = i2; b2 = b1; i2 = i1; b1 = b0; i1 = i0; b0 = d2; i0 = i;
            } else if (d2 < b1) {
                b3 = b2; i3 = i2; b2 = b1; i2 = i1; b1 = d2; i1 = i;
            } else if (d2 < b2) {
                b3 = b2; i3 = i2; b2 = d2; i2 = i;
            } else if (d2 < b3) {
                b3 = d2; i3 = i;
            }
        }
        dynamicTrackLights[0].position.copy(floodLampWorldPositions[i0]);
        dynamicTrackLights[1].position.copy(floodLampWorldPositions[i1]);
        dynamicTrackLights[2].position.copy(floodLampWorldPositions[i2]);
        dynamicTrackLights[3].position.copy(floodLampWorldPositions[i3]);
    }

    // Live FIA 2026 rear ERS harvest / active-aero rain-light pulse + optical glare sprite + wet-asphalt reflection
    const rainPulse = isDrsOn
        ? (0.85 + 2.35 * (0.5 + 0.5 * Math.sin(tSec * 24.0)))
        : (0.65 + 1.35 * (0.5 + 0.5 * Math.sin(tSec * 9.0)));
    for (let i = 0; i < rb22RearLightMats.length; i++) {
        rb22RearLightMats[i].emissiveIntensity = rainPulse;
    }
    rearRainHaloSprite.material.opacity = Math.min(1.0, 0.35 + rainPulse * 0.28);
    const haloScale = 0.72 + rainPulse * 0.14;
    rearRainHaloSprite.scale.set(haloScale, haloScale, 1);
    rearTailLight.intensity = 0.75 + rainPulse * 0.65;

    // Subtle FAA rooftop aviation red beacon pulse across the night metropolis skyline
    if (aviationBeaconMat) {
        aviationBeaconMat.opacity = 0.45 + 0.50 * (0.5 + 0.5 * Math.sin(tSec * 2.6));
    }

    // Occasional grandstand spectator camera flash strobe
    if (crowdFlashPoints && Math.random() < 0.22) {
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================= PREMIUM ENTRY — F1 START-LIGHTS LAUNCH (with sound) =================
(function startLightsIntro() {
    const overlay = document.getElementById('start-lights');
    if (!overlay) return;
    const cols = overlay.querySelectorAll('.sl-col');
    const textEl = overlay.querySelector('.sl-text');
    const subEl = overlay.querySelector('.sl-sub');

    // Lock root scrollingElement (<html>) + Lenis cleanly so background page cannot scroll under overlay
    document.documentElement.classList.add('f1-scroll-locked');
    if (lenis) lenis.stop();
    window.scrollTo(0, 0);

    let started = false;
    function blockEarlyScroll(e) {
        e.preventDefault();
        if (!started) ignite();
    }
    function keepLockedAtTop() {
        if (window.scrollY !== 0) window.scrollTo(0, 0);
    }
    window.addEventListener('wheel', blockEarlyScroll, { passive: false });
    window.addEventListener('touchmove', blockEarlyScroll, { passive: false });
    window.addEventListener('scroll', keepLockedAtTop, { passive: true });

    function unlockScroll() {
        window.removeEventListener('wheel', blockEarlyScroll);
        window.removeEventListener('touchmove', blockEarlyScroll);
        window.removeEventListener('scroll', keepLockedAtTop);
        document.documentElement.classList.remove('f1-scroll-locked');
        document.body.style.overflow = '';
        if (lenis) {
            lenis.start();
            lenis.scrollTo(0, { immediate: true });
        }
        if (window.ScrollTrigger) ScrollTrigger.refresh();
    }

    function finish() {
        window.scrollTo(0, 0);
        window.__lapStartMs = performance.now();
        unlockScroll();
        overlay.style.pointerEvents = 'none';
        if (typeof playOpeningGridDolly === 'function') playOpeningGridDolly();
        if (typeof playHeroReveal === 'function') playHeroReveal();
        gsap.to(overlay, {
            opacity: 0, duration: 0.65, ease: 'power2.inOut',
            onComplete: () => { overlay.remove(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }
        });
    }

    if (PREFERS_REDUCED_MOTION) {
        finish();
        return;
    }

    // --- IGNITE GATE: click, tap, key press, OR scroll wheel all ignite the start lights! ---
    if (subEl) { subEl.textContent = '▶  CLICK / SCROLL / PRESS ANY KEY TO IGNITE'; subEl.classList.add('sl-prompt'); }
    overlay.style.cursor = 'pointer';

    function ignite() {
        if (started) return;
        started = true;
        overlay.removeEventListener('click', ignite);
        overlay.removeEventListener('touchstart', ignite);
        window.removeEventListener('keydown', ignite);
        overlay.style.cursor = '';
        try { initEngineSound(); } catch (e) {}
        if (subEl) { subEl.classList.remove('sl-prompt'); subEl.textContent = '// FORMATION LAP COMPLETE — AWAIT START'; }
        setTimeout(armNext, 450);
    }
    overlay.addEventListener('click', ignite);
    overlay.addEventListener('touchstart', ignite, { passive: true });
    window.addEventListener('keydown', ignite);

    let i = 0;
    function armNext() {
        if (i < cols.length) {
            cols[i].classList.add('on');
            try { playBeep(760, 0.16, 0.16); } catch (e) {}
            i++;
            setTimeout(armNext, 850);
        } else {
            if (subEl) subEl.textContent = '// ALL LIGHTS ON — HOLD';
            setTimeout(lightsOut, 900 + Math.random() * 1900);
        }
    }

    function lightsOut() {
        cols.forEach((c) => c.classList.remove('on'));
        if (typeof window.__onF1LightsOut === 'function') window.__onF1LightsOut();
        if (textEl) gsap.fromTo(textEl, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' });
        if (subEl) subEl.textContent = '// GO GO GO';

        try { lastScrollT = performance.now() + 600; playLaunchRoar(); updateEngineSound(1600); } catch (e) {}

        try {
            const fovP = { v: 82 };
            fovLaunchActive = true;
            camera.fov = 82; camera.updateProjectionMatrix();
            gsap.to(fovP, {
                v: 58,
                duration: 1.35,
                ease: 'power4.out',
                onUpdate: () => { camera.fov = fovP.v; camera.updateProjectionMatrix(); },
                onComplete: () => { fovLaunchActive = false; }
            });
        } catch (e) {
            fovLaunchActive = false;
        }

        setTimeout(finish, 480);
    }
})();
