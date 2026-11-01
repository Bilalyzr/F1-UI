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

// --- LENIS SMOOTH INERTIA SCROLL ENGINE ---
let lenis = null;
if (typeof window.Lenis === 'function' && !PREFERS_REDUCED_MOTION) {
    try {
        lenis = new Lenis({
            duration: 1.12,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 0.95,
            touchMultiplier: 1.5,
            prevent: (node) => !!(node && node.closest && node.closest('#start-lights'))
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

// --- GRAND PRIX LAP AUTOPILOT SIMULATION STATE ---
let isSimulatingLap = false;
let simVirtualScroll = 0;

function stopLapSimulation() {
    if (!isSimulatingLap) return;
    isSimulatingLap = false;
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
    if (document.getElementById('start-lights')) return;
    ensureAudioRunning();
    playUiTick(isSimulatingLap ? 820 : 1280);
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
        window.__lapStartMs = performance.now();
    } else {
        simVirtualScroll = currentY;
        if (!window.__lapStartMs) window.__lapStartMs = performance.now();
    }
    isSimulatingLap = true;
    syncSimButtonsUI();
}

function smoothScrollToTarget(targetIdOrZero) {
    stopLapSimulation();
    if (targetIdOrZero === 0 || targetIdOrZero === 'grid') {
        if (lenis) lenis.scrollTo(0, { duration: PREFERS_REDUCED_MOTION ? 0 : 1.3 });
        else window.scrollTo({ top: 0, behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth' });
        return;
    }
    const el = typeof targetIdOrZero === 'string' ? document.getElementById(targetIdOrZero) : targetIdOrZero;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: PREFERS_REDUCED_MOTION ? 0 : 1.3 });
    else el.scrollIntoView({ behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth' });
}

// Cancel autopilot cleanly if user manually scrolls wheel or touches screen
window.addEventListener('wheel', () => {
    if (isSimulatingLap && !document.getElementById('start-lights')) stopLapSimulation();
}, { passive: true });
window.addEventListener('touchmove', () => {
    if (isSimulatingLap && !document.getElementById('start-lights')) stopLapSimulation();
}, { passive: true });

// --- MULTI-HARMONIC 1.6L V6 TURBO-HYBRID + MGU-K SYNTHESIZER ENGINE ---
let audioCtx = null;
let engineOscMain = null;
let engineOscSub = null;
let turboOscWhine = null;
let engineGain = null;
let turboGain = null;
let engineFilter = null;
let isAudioMuted = false;
let isDrsOn = false;
let manualDrsOverride = null; // null = auto DRS in DRS zone, true/false = user forced
let lastGearForShiftAudio = 'N';

function initEngineSound() {
    if (isAudioMuted) return;
    if (audioCtx) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioCtx = new AudioCtor();

    // Primary V6 exhaust firing pulse
    engineOscMain = audioCtx.createOscillator();
    engineOscMain.type = 'sawtooth';
    engineOscMain.frequency.setValueAtTime(68, audioCtx.currentTime);

    // Sub-octave exhaust growl
    engineOscSub = audioCtx.createOscillator();
    engineOscSub.type = 'triangle';
    engineOscSub.frequency.setValueAtTime(34, audioCtx.currentTime);

    // MGU-K / Turbocharger high-RPM turbine whine
    turboOscWhine = audioCtx.createOscillator();
    turboOscWhine.type = 'sine';
    turboOscWhine.frequency.setValueAtTime(420, audioCtx.currentTime);

    engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(440, audioCtx.currentTime);
    engineFilter.Q.setValueAtTime(2.2, audioCtx.currentTime);

    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(0.025, audioCtx.currentTime);

    turboGain = audioCtx.createGain();
    turboGain.gain.setValueAtTime(0.002, audioCtx.currentTime);

    engineOscMain.connect(engineFilter);
    engineOscSub.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);

    turboOscWhine.connect(turboGain);
    turboGain.connect(audioCtx.destination);

    engineOscMain.start();
    engineOscSub.start();
    turboOscWhine.start();
}

function updateEngineSound(scrollVelocity) {
    if (!audioCtx || !engineOscMain || !engineGain) return;
    if (isAudioMuted) {
        engineGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);
        if (turboGain) turboGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);
        return;
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const drsModifier = isDrsOn ? 95 : 0;
    const velocityFactor = Math.min(Math.abs(scrollVelocity) * 0.11, 185) + drsModifier;
    const mainFreq = 58 + velocityFactor * 2.55;
    const targetVolume = 0.022 + Math.min(velocityFactor * 0.0011, 0.17);
    const targetCutoff = 380 + velocityFactor * 18;

    const t = audioCtx.currentTime;
    engineOscMain.frequency.setTargetAtTime(mainFreq, t, 0.07);
    if (engineOscSub) engineOscSub.frequency.setTargetAtTime(mainFreq * 0.5, t, 0.07);
    if (turboOscWhine && turboGain) {
        turboOscWhine.frequency.setTargetAtTime(520 + velocityFactor * 11.5, t, 0.09);
        turboGain.gain.setTargetAtTime(Math.min(0.024, velocityFactor * 0.00009), t, 0.09);
    }
    engineGain.gain.setTargetAtTime(targetVolume, t, 0.07);
    if (engineFilter) engineFilter.frequency.setTargetAtTime(targetCutoff, t, 0.07);
}

function playGearShiftPop(upshift) {
    if (!audioCtx || isAudioMuted || audioCtx.state !== 'running') return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = upshift ? 'triangle' : 'sawtooth';
    o.frequency.setValueAtTime(upshift ? 180 : 320, t);
    o.frequency.exponentialRampToValueAtTime(upshift ? 95 : 140, t + 0.065);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.055, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.08);
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
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
}

function playUiTick(freq = 980) {
    if (!audioCtx || isAudioMuted || audioCtx.state !== 'running') return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.035);
}

function playRadioChirp() {
    if (!audioCtx || isAudioMuted || audioCtx.state !== 'running') return;
    playUiTick(1480);
    setTimeout(() => playUiTick(1760), 45);
}

function playDrsWhoosh(opening) {
    if (!audioCtx || isAudioMuted || audioCtx.state !== 'running') return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const f = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(opening ? 240 : 560, t);
    o.frequency.exponentialRampToValueAtTime(opening ? 720 : 190, t + 0.22);
    f.type = 'bandpass';
    f.frequency.setValueAtTime(920, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(f);
    f.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.26);
}

function playLaunchRoar() {
    if (!audioCtx || isAudioMuted) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const f = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(72, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.85);
    o.frequency.exponentialRampToValueAtTime(680, t + 1.4);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(350, t);
    f.frequency.exponentialRampToValueAtTime(4800, t + 0.85);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.65);
    o.connect(f);
    f.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 1.7);
    playBeep(1046, 0.42, 0.14);
}

function ensureAudioRunning() {
    if (isAudioMuted) return;
    initEngineSound();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
['pointerdown', 'touchstart', 'keydown', 'click', 'wheel'].forEach((evt) => {
    window.addEventListener(evt, ensureAudioRunning, { passive: true });
});

const audioToggleBtn = document.getElementById('audio-toggle-btn');
function toggleAudioMute() {
    isAudioMuted = !isAudioMuted;
    if (isAudioMuted && audioCtx && engineGain) {
        engineGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.04);
        if (turboGain) turboGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.04);
    } else if (!isAudioMuted) {
        initEngineSound();
        playUiTick(1120);
    }
    if (audioToggleBtn) {
        audioToggleBtn.textContent = isAudioMuted ? 'MUTED' : 'AUDIO ON';
        audioToggleBtn.className = isAudioMuted
            ? 'text-[7px] font-bold tracking-widest text-gray-400 border border-gray-700 bg-zinc-900/80 px-1.5 py-0.5 rounded cursor-pointer transition-all'
            : 'text-[7px] font-bold tracking-widest text-emerald-400 border border-emerald-500/40 bg-emerald-950/25 px-1.5 py-0.5 rounded cursor-pointer hover:border-emerald-400 transition-all';
    }
}
if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAudioMute();
    });
}

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
        playUiTick(1320);
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
        playUiTick(1200);
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

function setDrsAeroState(nextState, silent = false) {
    if (isDrsOn === nextState) return;
    isDrsOn = nextState;
    if (!silent) playDrsWhoosh(isDrsOn);

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

    if (typeof syncRedBullActiveAero === 'function') syncRedBullActiveAero();
}

function toggleDrsAeroManual() {
    initEngineSound();
    manualDrsOverride = !isDrsOn;
    setDrsAeroState(!isDrsOn, false);
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
    antialias: !IS_MOBILE_VIEWPORT,
    alpha: false,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_RENDER_DPR));
if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;

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

// --- CALIBRATED HIGH-CONTRAST NOCTURNAL GRAND PRIX LIGHTING ---
const nightSkyAmbient = new THREE.HemisphereLight(0x16264a, 0x020306, 0.26);
scene.add(nightSkyAmbient);

const nightMoonRim = new THREE.DirectionalLight(0x5278be, 0.24);
nightMoonRim.position.set(-28, 38, -22);
scene.add(nightMoonRim);

// Primary shadow-casting stadium key floodlight tracking the RB22
const spotlight = new THREE.SpotLight(0xfff3e0, 1.55, 76, Math.PI / 4.2, 0.62, 1.55);
spotlight.position.set(6, 21.5, 40);
spotlight.castShadow = true;
const SHADOW_RES = IS_MOBILE_VIEWPORT ? 1024 : 2048;
spotlight.shadow.mapSize.width = SHADOW_RES;
spotlight.shadow.mapSize.height = SHADOW_RES;
spotlight.shadow.camera.near = 9;
spotlight.shadow.camera.far = 48;
spotlight.shadow.bias = -0.00025;
if ('normalBias' in spotlight.shadow) spotlight.shadow.normalBias = 0.014;
spotlight.shadow.radius = 2.2;
scene.add(spotlight);
scene.add(spotlight.target);

// 4 dynamic PointLights snapping to the 4 closest cantilever floodlight luminaires around the moving RB22
const floodLampWorldPositions = [];
const dynamicTrackLights = [];
for (let i = 0; i < 4; i++) {
    const pl = new THREE.PointLight((i % 2 === 0) ? 0xfff0d8 : 0xdceaff, 0.78, 30, 1.85);
    pl.position.set(i * 12, 10.5, 34);
    scene.add(pl);
    dynamicTrackLights.push(pl);
}

// Subtle car-local under-diffuser / DRS aura
const trackGlow = new THREE.PointLight(0xff1801, 0.35, 6.2, 2.0);
scene.add(trackGlow);

// ==========================================================
//  CLOSED FIA GRADE-1 GRAND PRIX CIRCUIT SPLINE (~320m LAP)
// ==========================================================
const circuitControlPoints = [
    new THREE.Vector3(  0.0, 0,  34.0), // u=0.00: CH 01 P1 Pole Position on Main Straight
    new THREE.Vector3( 28.0, 0,  34.0), // Main Straight exit & Turn 1 heavy braking zone
    new THREE.Vector3( 52.0, 0,  26.0), // CH 02 Turn 1 entry
    new THREE.Vector3( 60.0, 0,   4.0), // CH 02 Turn 1-2 sweeping apex (Sasha Infinity / Sona)
    new THREE.Vector3( 48.0, 0, -20.0), // CH 03 Technical Esses / Powertrain Matrix
    new THREE.Vector3( 22.0, 0, -32.0), // CH 04 Back DRS Straight entry
    new THREE.Vector3( -6.0, 0, -31.0), // CH 04 Back DRS Straight mid (DRS Activation Gantry)
    new THREE.Vector3(-34.0, 0, -34.0), // Back Straight heavy braking zone
    new THREE.Vector3(-56.0, 0, -22.0), // CH 05 Parabolica entry (Trophies & Licences)
    new THREE.Vector3(-62.0, 0,   4.0), // CH 05 Parabolica apex
    new THREE.Vector3(-48.0, 0,  27.0), // Parabolica exit onto Main Straight
    new THREE.Vector3(-24.0, 0,  34.0)  // CH 06 Parc Fermé & Starting Grid Boxes
];
const circuitCurve = new THREE.CatmullRomCurve3(circuitControlPoints, true, 'catmullrom', 0.5);
const circuitTotalLength = circuitCurve.getLength();

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

// Populate True-3D-Spline SVG Circuit GPS Minimap in Bottom-Left Dock!
(function buildTrueGeometryMinimap() {
    const bgEl = document.getElementById('minimap-track-bg');
    const pathEl = document.getElementById('minimap-track-path');
    const actEl = document.getElementById('minimap-track-path-active');
    const wpGroup = document.getElementById('minimap-waypoints');
    if (!pathEl || !bgEl || !actEl) return;

    const samples = 120;
    const pts = circuitCurve.getSpacedPoints(samples);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    pts.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
    });

    const padX = 16, padY = 14, boxW = 200 - padX * 2, boxH = 130 - padY * 2;
    const spanX = (maxX - minX) || 1, spanZ = (maxZ - minZ) || 1;
    const scale = Math.min(boxW / spanX, boxH / spanZ);
    const offX = (200 - spanX * scale) * 0.5;
    const offY = (130 - spanZ * scale) * 0.5;

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

    if (wpGroup) {
        [0.0, 0.18, 0.34, 0.52, 0.76, 0.94].forEach((uWp, idx) => {
            const p = circuitCurve.getPointAt(uWp);
            const [wx, wy] = mapPt(p);
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', wx);
            dot.setAttribute('cy', wy);
            dot.setAttribute('r', idx === 0 ? '3.4' : '2.3');
            dot.setAttribute('fill', idx === 0 ? '#ff1801' : '#9ca3af');
            wpGroup.appendChild(dot);
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

    let seed = 7331;
    for (let y = 0; y < 2048; y++) {
        const yOff = y * 2048;
        for (let x = 0; x < 2048; x++) {
            seed = (seed * 16807) % 2147483647;
            const n1 = ((seed & 255) / 255) - 0.5;
            seed = (seed * 16807) % 2147483647;
            const stoneSpark = (seed % 19 === 0) ? 14 : ((seed % 29 === 0) ? -4 : 0);

            const uAcross = x / 2048;
            const grooveDist = Math.abs(uAcross - 0.50);
            const grooveMask = Math.exp(-(grooveDist * grooveDist) / 0.032);

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

// 1. Solid Opaque Pitch-Dark Outer Night Paddock & City Ground (zero grey alpha-blend haze!)
const paddockGround = new THREE.Mesh(
    new THREE.PlaneGeometry(950, 950),
    new THREE.MeshStandardMaterial({
        color: 0x030408,
        roughness: 0.92,
        metalness: 0.05
    })
);
paddockGround.rotation.x = -Math.PI / 2;
paddockGround.position.y = -0.015;
paddockGround.receiveShadow = true;
scene.add(paddockGround);

// 2. Solid Opaque Photorealistic Dark Basalt Racing Asphalt Ribbon (11.6m wide)
const TRACK_HALF_W = 5.8;
const RIBBON_SEGS = 480;
const asphaltMat = new THREE.MeshStandardMaterial({
    map: gpTextures.asphaltTex,
    roughnessMap: gpTextures.asphaltRoughness,
    bumpMap: gpTextures.asphaltBump,
    bumpScale: 0.018,
    roughness: 0.85,
    metalness: 0.08,
    envMapIntensity: 0.75
});
const asphaltRibbon = new THREE.Mesh(
    buildCircuitRibbon(RIBBON_SEGS, -TRACK_HALF_W, TRACK_HALF_W, 0.004, 0.004, 34, 0, 1),
    asphaltMat
);
asphaltRibbon.receiveShadow = true;
scene.add(asphaltRibbon);

// 3. Left & Right FIA Serrated Red/White Rumble Kerbs
const kerbMat = new THREE.MeshStandardMaterial({
    map: gpTextures.kerbTex,
    bumpMap: gpTextures.asphaltBump,
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
kerbRight.receiveShadow = true;
kerbLeft.receiveShadow = true;
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
runoffRight.receiveShadow = true;
runoffLeft.receiveShadow = true;
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
outerBarrier.receiveShadow = true;
innerBarrier.receiveShadow = true;
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
    sfMesh.receiveShadow = true;
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
    const gbMat = new THREE.MeshStandardMaterial({
        map: gbTex,
        transparent: true,
        opacity: 0.85,
        roughness: 0.45,
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
        scene.add(boxMesh);
    }
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
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x121620, roughness: 0.36, metalness: 0.88 });

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

    const bannerTex = makeTextBannerTexture('#040814', accentHex, bannerMain, bannerSub);
    const bannerMat = new THREE.MeshStandardMaterial({
        map: bannerTex,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: bannerTex,
        emissiveIntensity: 0.72,
        roughness: 0.28
    });
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

// 8. Night-Race Cantilever Street-Floodlight Arches + 24m Corner Stadium Towers
(function buildNightFloodlightSystem() {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x181d2a, roughness: 0.38, metalness: 0.86 });
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
        opacity: 0.18,
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

    const dummy = new THREE.Object3D();
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

                const glare = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: gpTextures.flareTex,
                    color: (i % 2 === 0) ? 0xfff5e4 : 0xe4f0ff,
                    transparent: true,
                    opacity: 0.78,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }));
                glare.position.set(lx, ly - 0.12, lz);
                glare.scale.set(3.0, 1.8, 1);
                scene.add(glare);

                const shaftGeo = new THREE.PlaneGeometry(5.2, 10.0);
                const shaftYaw = Math.atan2(fr.tang.x, fr.tang.z);
                const shaftA = new THREE.Mesh(shaftGeo, beamMat);
                shaftA.position.set(lx + inwardX * 1.05, 5.2, lz + inwardZ * 1.05);
                shaftA.rotation.y = shaftYaw;
                const shaftB = new THREE.Mesh(shaftGeo, beamMat);
                shaftB.position.copy(shaftA.position);
                shaftB.rotation.y = shaftYaw + Math.PI / 2;
                scene.add(shaftA, shaftB);

                const pool = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 14.5), poolMat);
                pool.rotation.order = 'YXZ';
                pool.rotation.y = Math.atan2(-fr.tang.x, -fr.tang.z);
                pool.rotation.x = -Math.PI / 2;
                pool.position.set(
                    fr.pos.x + fr.right.x * (side * 1.4),
                    0.006,
                    fr.pos.z + fr.right.z * (side * 1.4)
                );
                scene.add(pool);
            }
        });
    }

    mastInst.count = mIdx;
    armInst.count = aIdx;
    headInst.count = hIdx;
    scene.add(mastInst, armInst, headInst);

    const stadiumSpots = [0.06, 0.16, 0.25, 0.36, 0.46, 0.58, 0.68, 0.78, 0.87, 0.95];
    stadiumSpots.forEach((u, idx) => {
        const fr = sampleCircuitFrame(u);
        const dist = BARRIER_OFF + 5.8;
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

        for (let r = -0.38; r <= 0.39; r += 0.76) {
            for (let c = -1.35; c <= 1.36; c += 1.35) {
                const cell = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.56), lampMat);
                cell.position.set(c, 23.4 + r * 0.85, 0.62 - r * 0.36);
                cell.rotation.x = 0.42;
                tower.add(cell);
            }
        }

        const bigGlare = new THREE.Sprite(new THREE.SpriteMaterial({
            map: gpTextures.flareTex,
            color: (idx % 2 === 0) ? 0xfff6e5 : 0xdcecff,
            transparent: true,
            opacity: 0.88,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        bigGlare.position.set(0, 23.3, 0.85);
        bigGlare.scale.set(9.0, 4.8, 1);
        tower.add(bigGlare);

        const tallShaft = new THREE.Mesh(
            new THREE.PlaneGeometry(12.0, 23.0),
            new THREE.MeshBasicMaterial({
                map: gpTextures.beamAlphaTex,
                transparent: true,
                opacity: 0.18,
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

// 9. Realistic Architectural Night F1 Pit Building, Recessed Dark Garages & Pit-Wall Timing Stand
(function buildPitLaneComplex() {
    const pitGroup = new THREE.Group();
    const bldgMat = new THREE.MeshStandardMaterial({ color: 0x06080f, roughness: 0.42, metalness: 0.75 });
    const mullionMat = new THREE.MeshStandardMaterial({ color: 0x121724, roughness: 0.34, metalness: 0.88 });
    const darkGlassMat = new THREE.MeshStandardMaterial({ color: 0x091326, roughness: 0.12, metalness: 0.90 });
    const warmLoungeStrip = new THREE.MeshBasicMaterial({ color: 0xffd596 });
    const bayInteriorMat = new THREE.MeshStandardMaterial({ color: 0x090c14, roughness: 0.65, metalness: 0.35 });
    const bayLightBarMat = new THREE.MeshBasicMaterial({ color: 0xfff6e8 });
    const redBullLedMat = new THREE.MeshBasicMaterial({ color: 0xff1801 });

    // Main architectural pit structure
    const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(54, 8.8, 6.8), bldgMat);
    mainBlock.position.set(-1, 4.4, 16.0);
    pitGroup.add(mainBlock);

    // Upper Paddock Club dark reflective structural glass + warm interior ceiling cove light
    const upperGlass = new THREE.Mesh(new THREE.PlaneGeometry(51.0, 2.7), darkGlassMat);
    upperGlass.position.set(-1, 6.3, 19.44);
    pitGroup.add(upperGlass);

    const loungeCove = new THREE.Mesh(new THREE.BoxGeometry(50.5, 0.12, 0.12), warmLoungeStrip);
    loungeCove.position.set(-1, 7.45, 19.48);
    pitGroup.add(loungeCove);

    for (let mx = -25; mx <= 23; mx += 4.0) {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.22, 8.8, 0.30), mullionMat);
        mullion.position.set(mx, 4.4, 19.50);
        pitGroup.add(mullion);
    }

    const roofLed = new THREE.Mesh(new THREE.BoxGeometry(54.2, 0.10, 0.16), redBullLedMat);
    roofLed.position.set(-1, 8.82, 19.55);
    pitGroup.add(roofLed);

    // 8 Realistic Dark-Recessed F1 Pit Garages with Overhead 5000K Ceiling Light Strips & Red Bull Pit Booms
    for (let g = 0; g < 8; g++) {
        const gx = -21.5 + g * 5.85;
        const isRedBullBay = (g === 3 || g === 4);

        const bayBack = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.1), bayInteriorMat);
        bayBack.position.set(gx, 1.55, 19.43);
        pitGroup.add(bayBack);

        // Overhead 5000K high-bay LED ceiling light bars inside garage
        [-1.1, 0, 1.1].forEach((lx) => {
            const ceilStrip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), bayLightBarMat);
            ceilStrip.position.set(gx + lx, 2.92, 19.52);
            pitGroup.add(ceilStrip);
        });

        // Subtle rear tool-cabinet accent band
        const cabinetBand = new THREE.Mesh(
            new THREE.PlaneGeometry(4.1, 0.65),
            new THREE.MeshStandardMaterial({
                color: isRedBullBay ? 0x6e0a04 : 0x0b1a3d,
                emissive: new THREE.Color(isRedBullBay ? 0x3b0502 : 0x040b1c),
                roughness: 0.35
            })
        );
        cabinetBand.position.set(gx, 0.85, 19.46);
        pitGroup.add(cabinetBand);

        // Team Garage Header Fascia LED Line
        const headerLed = new THREE.Mesh(
            new THREE.BoxGeometry(4.5, 0.10, 0.18),
            new THREE.MeshBasicMaterial({ color: isRedBullBay ? 0xff1801 : 0x1e40af })
        );
        headerLed.position.set(gx, 3.22, 19.56);
        pitGroup.add(headerLed);

        // Pit-stop overhead pneumatic wheel-gun boom arm extending onto pit apron
        if (isRedBullBay) {
            const boom = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 2.4), mullionMat);
            boom.position.set(gx, 2.85, 20.6);
            pitGroup.add(boom);
        }
    }

    // Pit-Wall Engineers' Timing Canopy
    const pitCanopy = new THREE.Mesh(new THREE.BoxGeometry(22, 2.2, 1.35), bldgMat);
    pitCanopy.position.set(-1, 1.1, 22.8);
    pitGroup.add(pitCanopy);
    for (let m = 0; m < 6; m++) {
        const mon = new THREE.Mesh(
            new THREE.PlaneGeometry(1.9, 0.48),
            new THREE.MeshBasicMaterial({ color: (m % 2 === 0) ? 0x0891b2 : 0x059669 })
        );
        mon.position.set(-9.0 + m * 3.4, 1.38, 23.50);
        pitGroup.add(mon);
    }

    scene.add(pitGroup);
})();

// 10. Covered Night-Stadium Grandstands with Warm Canopy Uplighting & Crowd Camera Flashes
const crowdFlashPositions = [];
let crowdFlashPoints = null;
(function buildNightGrandstands() {
    const darkStructMat = new THREE.MeshStandardMaterial({ color: 0x070a11, roughness: 0.58, metalness: 0.70 });
    const tierMat = new THREE.MeshStandardMaterial({ color: 0x0b0f1a, roughness: 0.78, metalness: 0.22 });
    const canopySoffitMat = new THREE.MeshBasicMaterial({ color: 0x221b12 });
    const warmStripMat = new THREE.MeshBasicMaterial({ color: 0xffdca4 });

    function addGrandstand(centerX, centerZ, yaw, lengthM) {
        const gs = new THREE.Group();
        gs.position.set(centerX, 0, centerZ);
        gs.rotation.y = yaw;

        for (let t = 0; t < 5; t++) {
            const tier = new THREE.Mesh(new THREE.BoxGeometry(lengthM, 1.15, 1.85), tierMat);
            tier.position.set(0, 1.1 + t * 1.15, t * 1.65);
            gs.add(tier);
        }

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

// 11. Corner Braking Distance Boards (150m / 100m / 50m) & Trackside FIA DigiFlag LED Panels
(function buildBrakingBoardsAndDigiFlags() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x161a22, roughness: 0.5, metalness: 0.75 });
    const brakeZones = [
        [0.080, '150'], [0.106, '100'], [0.132, '50'],
        [0.560, '150'], [0.586, '100'], [0.612, '50']
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
                emissiveIntensity: 0.30,
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
            '    if (h > 0.02 && h < 0.52) {',
            '        vec2 uv = dir.xz / (h + 0.14) * 1.4;',
            '        float cl = noise(uv) * 0.65 + noise(uv * 2.3) * 0.35;',
            '        float mask = smoothstep(0.02, 0.14, h) * (1.0 - smoothstep(0.20, 0.52, h));',
            '        col += vec3(0.014, 0.026, 0.056) * smoothstep(0.45, 0.85, cl) * mask;',
            '    }',
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
    const towerMat = new THREE.MeshStandardMaterial({
        map: gpTextures.skyscraperTex,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: gpTextures.skyscraperTex,
        emissiveIntensity: 0.65,
        roughness: 0.28,
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

        if (h > 44) {
            const crown = new THREE.Mesh(
                new THREE.BoxGeometry(w + 0.3, 0.36, d + 0.3),
                new THREE.MeshBasicMaterial({ color: crownColors[t % crownColors.length] })
            );
            crown.position.set(tx, h + 0.18, tz);
            crown.rotation.y = towerMesh.rotation.y;
            scene.add(crown);
            beaconPositions.push(tx, h + 1.4, tz);
        }
    }

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

// ==========================================================
//  2026 ORACLE RED BULL RACING RB22 (.glb) + LIVE COCKPIT
// ==========================================================
const carGroup = new THREE.Group();
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

const rearTailLight = new THREE.PointLight(0xff1400, 0.95, 6.5, 2.0);
rearTailLight.position.set(0, 0.36, 2.65);
carGroup.add(rearTailLight);

const brakeGlowLight = new THREE.PointLight(0xff3c00, 0.0, 5.0, 2.0);
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
    trackGlow.color.setHex(isDrsOn ? 0x00d2ff : 0xff1801);
    trackGlow.intensity = isDrsOn ? 0.65 : 0.35;
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
                const origMat = obj.material;
                const matName = origMat.name || '';

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

                // Authentic Oracle Red Bull Racing Satin-Midnight-Navy + Crisp Gloss Sponsor Decals
                if (matName === 'chasis.002' || matName === 'chassis2.002' || matName === 'decal.002') {
                    const isDecal = matName === 'decal.002';
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
            console.log('[RB22] Loaded 2026 Oracle Red Bull Racing RB22 in Calibrated Photorealistic Night GP Spec.');
        },
        undefined,
        (err) => {
            console.error('[RB22] Failed to load "' + CAR_MODEL_URL + '".', err);
        }
    );
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

function updateStoryNarrator(chapterIdx) {
    if (chapterIdx === lastNarratedChapter) return;
    lastNarratedChapter = chapterIdx;
    const info = CHAPTER_STORY_DATA[chapterIdx] || CHAPTER_STORY_DATA[0];
    playRadioChirp();
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
        playUiTick(1100);
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

// --- MOUSE, KEYBOARD THROTTLE & CAMERA DIRECTOR ---
let currentMouseX = 0, currentMouseY = 0;
let mouseX = 0, mouseY = 0;
let lastScrollT = 0;
let heldThrottleDir = 0; // +1 forward (ArrowDown), -1 reverse (ArrowUp)

window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
});

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

// Place RB22 in P1 Pole Position on Main Straight
const initialGridFrame = sampleCircuitFrame(0);
carGroup.position.set(initialGridFrame.pos.x, 0, initialGridFrame.pos.z);
carGroup.rotation.y = Math.atan2(-initialGridFrame.tang.x, -initialGridFrame.tang.z);

const targetCameraPosition = new THREE.Vector3();
const targetLookAt = new THREE.Vector3(initialGridFrame.pos.x, 0.52, initialGridFrame.pos.z);
const introDollyOffset = { forward: 6.0, right: 4.4, up: 3.2, shiftBlend: 0.35 };
let fovLaunchActive = false;
let introCamTween = null;

function playOpeningGridDolly() {
    if (introCamTween) introCamTween.kill();
    introCamTween = gsap.to(introDollyOffset, {
        forward: 0,
        right: 0,
        up: 0,
        shiftBlend: 1.0,
        duration: 1.5,
        ease: 'power3.out'
    });
}
if (!document.getElementById('start-lights')) {
    playOpeningGridDolly();
}

window.__onF1LightsOut = function () {
    gantryStartLightBulbs.forEach((m) => m.color.setHex(0x160505));
    gantryStartLightSprites.forEach((s) => { s.visible = false; });
};

document.querySelectorAll('[data-target]').forEach((item) => {
    item.addEventListener('click', () => {
        playUiTick(1040);
        smoothScrollToTarget(item.getAttribute('data-target'));
    });
});
const brandHomeBtn = document.getElementById('brand-home-btn');
if (brandHomeBtn) {
    brandHomeBtn.addEventListener('click', () => {
        playUiTick(1040);
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
function setCameraMode(mode) {
    if (!['chase', 'cockpit', 'halo', 'pod', 'orbit'].includes(mode)) return;
    activeCamMode = mode;
    playUiTick(mode === 'cockpit' ? 1320 : (mode === 'orbit' ? 1220 : 960));
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

window.addEventListener('pointerdown', (e) => {
    if (activeCamMode !== 'orbit') return;
    if (e.target.closest('button, a, input, textarea, nav, aside, footer, .broadcast-panel, .hud-dock, .scroll-nav-container, #start-lights')) return;
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

// Keyboard Shortcuts: [1-5] Cameras, [D] DRS, [M] Audio, [Space] Simulate Lap, [ArrowDown/Up] Drive Throttle
window.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/i.test(e.target.tagName)) return;
    if (document.getElementById('start-lights')) return;
    if (e.key === '1') setCameraMode('chase');
    else if (e.key === '2') setCameraMode('cockpit');
    else if (e.key === '3') setCameraMode('halo');
    else if (e.key === '4') setCameraMode('pod');
    else if (e.key === '5') setCameraMode('orbit');
    else if (e.key === 'd' || e.key === 'D') toggleDrsAeroManual();
    else if (e.key === 'm' || e.key === 'M') toggleAudioMute();
    else if (e.code === 'Space' && !e.target.closest('button, a')) {
        e.preventDefault();
        toggleLapSimulation();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        stopLapSimulation();
        heldThrottleDir = 1;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        stopLapSimulation();
        heldThrottleDir = -1;
    }
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown' && heldThrottleDir === 1) heldThrottleDir = 0;
    if (e.key === 'ArrowUp' && heldThrottleDir === -1) heldThrottleDir = 0;
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

function stepLapSimulation(nowMs) {
    const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameTime) * 0.001));
    lastFrameTime = nowMs;

    const scroller = document.scrollingElement || document.documentElement;
    const maxScroll = Math.max(1, scroller.scrollHeight - window.innerHeight);

    // A) Advance Auto-Drive Lap Simulation OR Keyboard Throttle if active!
    if (isSimulatingLap && !document.getElementById('start-lights')) {
        const normP = Math.min(1, Math.max(0, simVirtualScroll / maxScroll));
        // Physics-profiled F1 circuit velocity multiplier:
        // Slows realistically for Turn 1 braking/apex (0.14..0.24), Tech Esses (0.31..0.40), & Parabolica (0.74..0.85),
        // and blasts fast down Main Straight (0.02..0.12) & DRS Back Straight (0.45..0.70)!
        let cornerSpeedFactor = 1.0;
        if (normP > 0.13 && normP < 0.25) cornerSpeedFactor = 0.62;
        else if (normP > 0.30 && normP < 0.41) cornerSpeedFactor = 0.72;
        else if (normP >= 0.44 && normP <= 0.70) cornerSpeedFactor = 1.18;
        else if (normP > 0.73 && normP < 0.86) cornerSpeedFactor = 0.68;

        // Complete full narrated Grand Prix lap in ~34 seconds
        const baseScrollPxPerSec = (maxScroll / 34.0) * cornerSpeedFactor;
        simVirtualScroll = Math.min(maxScroll, simVirtualScroll + baseScrollPxPerSec * dt);
        window.scrollTo(0, simVirtualScroll);
        if (lenis) lenis.scrollTo(simVirtualScroll, { immediate: true });
        lastScrollT = nowMs;

        if (simVirtualScroll >= maxScroll - 1) {
            stopLapSimulation();
        }
    } else if (heldThrottleDir !== 0 && !document.getElementById('start-lights')) {
        const curY = window.scrollY || scroller.scrollTop || 0;
        const nextY = Math.max(0, Math.min(maxScroll, curY + heldThrottleDir * (maxScroll / 22.0) * dt));
        window.scrollTo(0, nextY);
        if (lenis) lenis.scrollTo(nextY, { immediate: true });
        lastScrollT = nowMs;
    }

    // 1. Live normalized page scroll [0, 1]
    const scrollTop = Math.max(0, window.scrollY || window.pageYOffset || scroller.scrollTop || 0);
    const rawTargetP = (maxScroll - scrollTop <= 1.5)
        ? 1.0
        : Math.min(1, Math.max(0, scrollTop / maxScroll));

    const lerpAlpha = 1 - Math.exp(-dt * 9.5);
    smoothLapProgress += (rawTargetP - smoothLapProgress) * lerpAlpha;
    if (Math.abs(rawTargetP - smoothLapProgress) < 0.00002) smoothLapProgress = rawTargetP;

    // 2. Physical distance travelled & velocity along the 320m Night Grand Prix circuit
    const lapMultiplier = 1.028;
    const prevU = prevSmoothProgress * lapMultiplier;
    const currU = smoothLapProgress * lapMultiplier;
    const deltaU = currU - prevU;
    prevSmoothProgress = smoothLapProgress;

    const deltaMeters = deltaU * circuitTotalLength;
    const instSpeedMps = deltaMeters / dt;
    const prevSpeed = smoothSpeedMps;
    smoothSpeedMps += (instSpeedMps - smoothSpeedMps) * (1 - Math.exp(-dt * 11));
    const absSpeed = Math.abs(smoothSpeedMps);
    const accel = (smoothSpeedMps - prevSpeed) / dt;

    // 3. Position & orient the 2026 Red Bull RB22 along circuitCurve with apex-clipping racing line
    const frame = sampleCircuitFrame(currU);
    const aheadFrame = sampleCircuitFrame(currU + 0.012);
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
        setDrsAeroState(false, false);
    } else if (inDrsZone && manualDrsOverride === null && !isDrsOn && (absSpeed > 1.2 || isSimulatingLap)) {
        setDrsAeroState(true, false);
    }
    if (!inDrsZone && manualDrsOverride !== null && absSpeed > 8.0 && frame.u > 0.73) {
        // Heavy braking into Parabolica automatically closes DRS flap just like real FIA hydraulics!
        manualDrsOverride = null;
        setDrsAeroState(false, false);
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
    smoothSteer += (targetSteer - smoothSteer) * (1 - Math.exp(-dt * 10));
    for (let i = 0; i < frontSteerPivots.length; i++) {
        frontSteerPivots[i].rotation.y = smoothSteer;
    }
    if (rb22SteerWheelNode && rb22SteerBaseQuat) {
        // Rotate 3D Cockpit Steering Wheel around its steering column axis!
        steerDeltaQuat.setFromAxisAngle(steerAxisZ, -smoothSteer * 2.35);
        rb22SteerWheelNode.quaternion.copy(rb22SteerBaseQuat).multiply(steerDeltaQuat);
    }

    // 5. Chassis Squat/Dive, Lateral G-Force Roll & High-Speed Road Micro-Vibration
    const targetPitch = Math.max(-0.022, Math.min(0.022, -accel * 0.00035));
    const targetRoll = Math.max(-0.028, Math.min(0.028, curvature * Math.min(1, absSpeed / 20) * 0.14));
    smoothPitch += (targetPitch - smoothPitch) * (1 - Math.exp(-dt * 10));
    smoothRoll += (targetRoll - smoothRoll) * (1 - Math.exp(-dt * 10));
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
    for (let i = 0; i < rb22BrakeDiscMats.length; i++) {
        const m = rb22BrakeDiscMats[i];
        m.emissiveIntensity += (targetGlow - m.emissiveIntensity) * (1 - Math.exp(-dt * 7));
    }
    brakeGlowLight.intensity += (targetGlow * 0.55 - brakeGlowLight.intensity) * (1 - Math.exp(-dt * 7));

    // 7. 3D Titanium Sparks & Aero Slipstream Streaks
    stepTitaniumSparks(dt, isSimulatingLap ? Math.max(absSpeed, 18) : absSpeed, frame);

    const effAeroSpeed = isSimulatingLap ? Math.max(absSpeed, 22) : absSpeed;
    const streakIntensity = Math.min(0.42, (effAeroSpeed / 100) * 0.28 + (isDrsOn ? 0.20 : 0));
    aeroStreakMat.opacity += (streakIntensity - aeroStreakMat.opacity) * 0.12;
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

    // 8. 5-Mode Broadcast Camera Rig (Chase · Driver Cockpit · Halo T-Cam · Wheel Pod · 360° Orbit)
    const targetSurge = Math.max(-0.85, Math.min(1.75, smoothSpeedMps * 0.026));
    throttleSurge += (targetSurge - throttleSurge) * (1 - Math.exp(-dt * 8));

    {
        const p = smoothLapProgress;
        let desF = 4.8, desR = 3.1, desU = 1.44, desLookF = 0.0, desLookR = 0.0, desLookU = 0.52;
        let baseModeFov = 56;

        if (activeCamMode === 'cockpit') {
            // Driver Helmet Visor POV inside the RB22 Cockpit looking over the turning 3D Steering Wheel & Halo!
            desF = 0.08;
            desR = 0.0;
            desU = 0.77 + roadBuzz * 1.5;
            desLookF = 11.5;
            desLookR = -smoothSteer * 9.5;
            desLookU = 0.58;
            baseModeFov = 68;
        } else if (activeCamMode === 'halo') {
            // FIA Onboard Halo / T-Cam above airbox
            desF = -0.18;
            desR = 0.0;
            desU = 1.18 + roadBuzz * 1.3;
            desLookF = 18.5;
            desLookR = -smoothSteer * 11.0;
            desLookU = 0.68;
            baseModeFov = 65;
        } else if (activeCamMode === 'pod') {
            // Front-Left Pirelli Wheel & Glowing Carbon-Brake Suspension Pod Cam
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
            // Choreographed 6-Chapter F1 TV Broadcast Chase Cam
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

            const tmpCamX = frame.tang.x * desF + frame.right.x * desR;
            const tmpCamZ = frame.tang.z * desF + frame.right.z * desR;
            const vLen = Math.hypot(-tmpCamX, -tmpCamZ) || 1;
            const camRightX = tmpCamZ / vLen;
            const camRightZ = -tmpCamX / vLen;
            const responsiveScale = window.innerWidth < 768 ? 0.18 : 1.0;
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
            const followSpeed = (activeCamMode === 'cockpit' || activeCamMode === 'halo' || activeCamMode === 'pod') ? 16.0 : 9.0;
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

        if (!fovLaunchActive && !document.getElementById('start-lights')) {
            const speedFovAdd = activeCamMode === 'orbit' ? 0 : Math.min(8.0, absSpeed * 0.13) + (isDrsOn ? 4.5 : 0);
            const targetFov = baseModeFov + speedFovAdd;
            if (Math.abs(camera.fov - targetFov) > 0.05) {
                camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-dt * 6.5));
                camera.updateProjectionMatrix();
            }
        }
    }

    // 9. Sync 6-Chapter Storytelling Indicators, Sticky DRS Project Bays, Minimap & Telemetry HUD
    const offsets = CHAPTER_SECTIONS.map((id) => {
        const el = document.getElementById(id);
        return el ? el.offsetTop : 0;
    });

    // Auto-scrub Bay 01 -> Bay 02 -> Bay 03 across #drs 240vh sticky DRS straight!
    const drsSectionEl = document.getElementById('drs');
    if (drsSectionEl && nowMs > manualBayLockUntil) {
        const stickyTravel = Math.max(1, drsSectionEl.offsetHeight - window.innerHeight);
        if (scrollTop >= offsets[3] - 20 && scrollTop <= offsets[3] + stickyTravel + 20) {
            const drsP = Math.min(0.999, Math.max(0, (scrollTop - offsets[3]) / stickyTravel));
            const autoBayIdx = Math.floor(drsP * 3);
            setActiveProjectBay(autoBayIdx, false);
        }
    }

    if (customProgressBar) {
        const lastIdx = CHAPTER_SECTIONS.length - 1;
        let progressPercent = 0;
        if (scrollTop <= offsets[0]) {
            progressPercent = 0;
        } else if (scrollTop >= offsets[lastIdx]) {
            progressPercent = 100;
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
            progressPercent = ((interval + localP) / lastIdx) * 100;
        }
        customProgressBar.style.height = `${progressPercent}%`;
    }

    let activeIdx = 0;
    for (let i = CHAPTER_SECTIONS.length - 1; i >= 1; i--) {
        if (scrollTop >= offsets[i] - window.innerHeight * 0.32) {
            activeIdx = i;
            break;
        }
    }

    scrollNavItems.forEach((navItem, idx) => {
        if (idx === activeIdx) navItem.classList.add('active');
        else navItem.classList.remove('active');
    });
    updateHUDTracker(activeIdx);
    updateStoryNarrator(activeIdx);

    const chapterInfo = CHAPTER_STORY_DATA[activeIdx] || CHAPTER_STORY_DATA[0];
    const currentSectorColor = chapterInfo.color;
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
    if (sectorDisplay) {
        sectorDisplay.innerText = chapterInfo.sector;
        sectorDisplay.style.backgroundColor = currentSectorColor;
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
        const vmaxEl = document.getElementById('summary-vmax');
        if (vmaxEl) vmaxEl.textContent = `${peakKmhRecorded} KM/H`;
    }

    const pseudoScrollVel = Math.max(smoothSpeedMps * 38, isSimulatingLap ? liveKmh * 3.8 : 0);
    if (liveKmh > 2) {
        updateEngineSound(pseudoScrollVel);
    } else if (audioCtx && nowMs - lastScrollT > 140) {
        updateEngineSound(0);
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

    if (gear !== lastGearForShiftAudio) {
        if (gear !== 'N' && lastGearForShiftAudio !== 'N') {
            playGearShiftPop(Number(gear) > Number(lastGearForShiftAudio));
        }
        lastGearForShiftAudio = gear;
    }

    const targetRPM = liveKmh > 3 ? Math.min(13500, Math.round(gearRatioRpm)) : 0;
    displayRPM += (targetRPM - displayRPM) * (1 - Math.exp(-dt * 12));
    const shownRPM = Math.round(displayRPM);
    if (speedo) speedo.innerText = shownRPM;
    if (speedBar) speedBar.style.width = `${(shownRPM / 13500) * 100}%`;
    if (gearIndicator) gearIndicator.innerText = gear;

    const rpmFrac = shownRPM / 13500;
    const activeLedsCount = Math.floor(rpmFrac * ledElements.length);
    ledElements.forEach((led, idx) => {
        if (idx < activeLedsCount) led.classList.add('active');
        else led.classList.remove('active');
    });
    // Also illuminate actual 3D Steering Wheel Shift LEDs inside the RB22 cockpit!
    rb22CockpitShiftMats.forEach((m) => {
        m.emissiveIntensity = rpmFrac > 0.55 ? (rpmFrac - 0.55) * 5.0 : 0.0;
    });

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
        const effGSpeed = Math.max(absSpeed, liveKmh / 9.0);
        const latG = Math.max(-4.8, Math.min(4.8, curvature * effGSpeed * 0.42));
        const lonG = Math.max(-5.2, Math.min(3.4, inBrakeZone && liveKmh > 60 ? -3.8 : accel * 0.025));
        const totalG = Math.min(5.4, Math.hypot(latG, lonG));
        const gx = Math.max(-8, Math.min(8, latG * 1.7));
        const gy = Math.max(-8, Math.min(8, -lonG * 1.6));
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
        const warpAlpha = Math.min(0.88, (liveKmh / 350) * 0.62 + (isDrsOn ? 0.26 : 0));
        warpOverlay.style.setProperty('--warp-opacity', warpAlpha.toFixed(3));
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

if (!document.getElementById('start-lights')) {
    mountHeroScrollScrub();
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

// --- TELEMETRY RETICLE CURSOR, MAGNETIC MICRO-INTERACTIONS & CARBON SPOTLIGHT ---
(function initAwardMicroInteractions() {
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

    document.querySelectorAll('[data-magnetic]').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            const dx = (e.clientX - (r.left + r.width * 0.5)) * 0.22;
            const dy = (e.clientY - (r.top + r.height * 0.5)) * 0.25;
            gsap.to(el, { x: Math.max(-7, Math.min(7, dx)), y: Math.max(-5, Math.min(5, dy)), duration: 0.25, ease: 'power2.out' });
        }, { passive: true });
        el.addEventListener('pointerleave', () => {
            gsap.to(el, { x: 0, y: 0, duration: 0.45, ease: 'elastic.out(1, 0.5)' });
        });
    });

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
            ? e.target.closest('[data-cursor], button, a, .scroll-nav-item')
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
    if (document.hidden) return;
    const nowMs = performance.now();
    const tSec = nowMs * 0.001;

    stepLapSimulation(nowMs);

    currentMouseX += (mouseX - currentMouseX) * 0.06;
    currentMouseY += (mouseY - currentMouseY) * 0.06;

    const lookDx = targetLookAt.x - targetCameraPosition.x;
    const lookDz = targetLookAt.z - targetCameraPosition.z;
    const lookLen = Math.hypot(lookDx, lookDz) || 1;
    const viewRightX = -lookDz / lookLen;
    const viewRightZ =  lookDx / lookLen;

    const parallaxScale = (activeCamMode === 'chase' && !PREFERS_REDUCED_MOTION) ? 0.9 : 0.08;
    const minCamY = activeCamMode === 'pod' ? 0.42 : (activeCamMode === 'cockpit' ? 0.65 : 0.82);
    camera.position.set(
        targetCameraPosition.x + viewRightX * (currentMouseX * 1.1 * parallaxScale),
        Math.max(minCamY, targetCameraPosition.y + (-currentMouseY * 0.5 * parallaxScale)),
        targetCameraPosition.z + viewRightZ * (currentMouseX * 1.1 * parallaxScale)
    );
    camera.lookAt(targetLookAt);

    const cx = carGroup.position.x;
    const cz = carGroup.position.z;
    trackGlow.position.set(cx, 0.28, cz);
    spotlight.position.set(cx + 5.5, 21.5, cz + 6.5);
    spotlight.target.position.set(cx, 0.25, cz);
    spotlight.target.updateMatrixWorld();

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

    const rainPulse = isDrsOn
        ? (0.85 + 2.35 * (0.5 + 0.5 * Math.sin(tSec * 24.0)))
        : (0.65 + 1.35 * (0.5 + 0.5 * Math.sin(tSec * 9.0)));
    for (let i = 0; i < rb22RearLightMats.length; i++) {
        rb22RearLightMats[i].emissiveIntensity = rainPulse;
    }
    rearRainHaloSprite.material.opacity = Math.min(1.0, 0.35 + rainPulse * 0.28);
    const haloScale = 0.72 + rainPulse * 0.14;
    rearRainHaloSprite.scale.set(haloScale, haloScale, 1);
    rearTailLight.intensity = 0.55 + rainPulse * 0.45;

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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================= FIA 5-RED-LIGHT GRAND PRIX START GANTRY =================
(function startLightsIntro() {
    const overlay = document.getElementById('start-lights');
    if (!overlay) return;
    const cols = overlay.querySelectorAll('.sl-col');
    const textEl = overlay.querySelector('.sl-text');
    const subEl = overlay.querySelector('.sl-sub');

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
            opacity: 0, duration: 0.6, ease: 'power2.inOut',
            onComplete: () => { overlay.remove(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }
        });
    }

    const skipBtn = document.getElementById('skip-lights-btn');
    if (skipBtn) {
        skipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            started = true;
            if (typeof window.__onF1LightsOut === 'function') window.__onF1LightsOut();
            finish();
        });
    }

    if (subEl) { subEl.textContent = '▶  CLICK / SCROLL / PRESS ANY KEY TO IGNITE ENGINE'; subEl.classList.add('sl-prompt'); }
    overlay.style.cursor = 'pointer';

    function ignite() {
        if (started) return;
        started = true;
        overlay.removeEventListener('click', ignite);
        overlay.removeEventListener('touchstart', ignite);
        window.removeEventListener('keydown', ignite);
        overlay.style.cursor = '';
        try { initEngineSound(); } catch (e) {}
        if (subEl) { subEl.classList.remove('sl-prompt'); subEl.textContent = '// FORMATION LAP COMPLETE — AWAIT 5 RED LIGHTS'; }
        setTimeout(armNext, 420);
    }
    overlay.addEventListener('click', ignite);
    overlay.addEventListener('touchstart', ignite, { passive: true });
    window.addEventListener('keydown', ignite);

    let i = 0;
    function armNext() {
        if (i < cols.length) {
            cols[i].classList.add('on');
            try { playBeep(760, 0.16, 0.14); } catch (e) {}
            i++;
            setTimeout(armNext, 780);
        } else {
            if (subEl) subEl.textContent = '// ALL 5 RED LIGHTS ON — CLUTCH PADDLE HOLD';
            setTimeout(lightsOut, 850 + Math.random() * 1400);
        }
    }

    function lightsOut() {
        cols.forEach((c) => c.classList.remove('on'));
        if (typeof window.__onF1LightsOut === 'function') window.__onF1LightsOut();
        if (textEl) gsap.fromTo(textEl, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' });
        if (subEl) subEl.textContent = '// LIGHTS OUT AND AWAY WE GO!';

        try { lastScrollT = performance.now() + 600; playLaunchRoar(); updateEngineSound(1500); } catch (e) {}

        try {
            const fovP = { v: 80 };
            fovLaunchActive = true;
            camera.fov = 80; camera.updateProjectionMatrix();
            gsap.to(fovP, {
                v: 56,
                duration: 1.3,
                ease: 'power4.out',
                onUpdate: () => { camera.fov = fovP.v; camera.updateProjectionMatrix(); },
                onComplete: () => { fovLaunchActive = false; }
            });
        } catch (e) {
            fovLaunchActive = false;
        }

        setTimeout(finish, 460);
    }
})();
