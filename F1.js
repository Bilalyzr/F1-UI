gsap.registerPlugin(ScrollTrigger);

// --- EXHAUST SOUND SYNTHESIZER ENGINE ---
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let engineFilter = null;

function initEngineSound() {
    if (audioCtx) {
        // Browser autoplay policy can leave the context suspended until a gesture.
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return;
    }
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(70, audioCtx.currentTime);

    engineFilter = audioCtx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(500, audioCtx.currentTime);

    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(0.05, audioCtx.currentTime);

    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
}
let isDrsOn = false;

function updateEngineSound(scrollVelocity) {
    if (!audioCtx || !engineOsc) return;
    // Re-resume if the browser suspended the context (main cause of intermittent silence)
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const drsModifier = isDrsOn ? 120 : 0;
    const velocityFactor = Math.min(Math.abs(scrollVelocity) * 0.12, 180) + drsModifier;
    const targetFreq = 60 + velocityFactor * 3.0;
    const targetVolume = 0.035 + Math.min(velocityFactor * 0.0016, 0.28); // louder + clear rev range
    const targetCutoff = 420 + velocityFactor * 22;                        // filter opens with speed

    engineOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(targetVolume, audioCtx.currentTime, 0.08);
    if (engineFilter) engineFilter.frequency.setTargetAtTime(targetCutoff, audioCtx.currentTime, 0.08);
}

// --- AUTHENTIC START-LIGHTS SOUND (F1-game style beeps + launch roar) ---
function playBeep(freq, dur, vol) {
    if (!audioCtx) return;
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

function playLaunchRoar() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    // V6 turbo spool-up: sawtooth sweeping up through an opening low-pass filter
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
    playBeep(1046, 0.45, 0.16); // the higher "GO" tone over the roar
}

// Robust audio unlock — resume the engine context on ANY interaction.
// (Not { once: true } — so if the browser re-suspends it, the next scroll re-wakes it.)
function ensureAudioRunning() {
    initEngineSound();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
['pointerdown', 'touchstart', 'keydown', 'click', 'wheel', 'scroll'].forEach((evt) => {
    window.addEventListener(evt, ensureAudioRunning, { passive: true });
});

// --- PIT WALL CONTACT FORM ---
const pitWallForm = document.getElementById('pit-wall-form');
const formStatus = document.getElementById('form-status');
if (pitWallForm) {
    pitWallForm.addEventListener('submit', (e) => {
        e.preventDefault();
        pitWallForm.reset();
        if (formStatus) {
            formStatus.classList.remove('hidden');
            clearTimeout(pitWallForm._statusTimer);
            pitWallForm._statusTimer = setTimeout(() => formStatus.classList.add('hidden'), 4000);
        }
    });
}

// --- DRS CONTROLLER ---
const drsTriggerBtn = document.getElementById('drs-trigger-btn');
const drsBtnLight = document.getElementById('drs-btn-light');
const drsBtnStatus = document.getElementById('drs-btn-status');
const drsIndicator = document.getElementById('drs-indicator');

if (drsTriggerBtn) {
    drsTriggerBtn.addEventListener('click', () => {
        initEngineSound();
        isDrsOn = !isDrsOn;
        
        if (isDrsOn) {
            document.body.classList.add('drs-active-mode');
            drsTriggerBtn.classList.add('bg-red-950/20', 'border-red-500');
            drsBtnLight.classList.remove('bg-gray-600');
            drsBtnLight.classList.add('bg-emerald-500', 'shadow-[0_0_8px_#10b981]');
            drsBtnStatus.innerText = "ACTIVE";
            drsBtnStatus.classList.remove('text-gray-500');
            drsBtnStatus.classList.add('text-emerald-400', 'border-emerald-500/50');
            
            drsIndicator.innerText = "DRS ON";
            drsIndicator.classList.remove('text-gray-500', 'border-gray-800');
            drsIndicator.classList.add('text-emerald-400', 'border-emerald-500/50', 'bg-emerald-950/10', 'shadow-[0_0_10px_rgba(16,185,129,0.2)]');
        } else {
            document.body.classList.remove('drs-active-mode');
            drsTriggerBtn.classList.remove('bg-red-950/20', 'border-red-500');
            drsBtnLight.classList.remove('bg-emerald-500', 'shadow-[0_0_8px_#10b981]');
            drsBtnLight.classList.add('bg-gray-600');
            drsBtnStatus.innerText = "CLOSED";
            drsBtnStatus.classList.remove('text-emerald-400', 'border-emerald-500/50');
            drsBtnStatus.classList.add('text-gray-500');
            
            drsIndicator.innerText = "DRS OFF";
            drsIndicator.classList.remove('text-emerald-400', 'border-emerald-500/50', 'bg-emerald-950/10', 'shadow-[0_0_10px_rgba(16,185,129,0.2)]');
            drsIndicator.classList.add('text-gray-500', 'border-gray-800');
        }
        
        updateEngineSound(isDrsOn ? 1000 : 0);
    });
}

// --- THREE.JS GRAPHICS SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070709, 0.011);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // capped for smoother scrolling
container.appendChild(renderer.domElement);

// Night-race base lighting: dim cool ambient + moonlight key
scene.add(new THREE.AmbientLight(0x2a3346, 0.45));
const overheadSun = new THREE.DirectionalLight(0xbcd0ff, 0.9);
overheadSun.position.set(5, 25, 5);
scene.add(overheadSun);

const trackGlow = new THREE.PointLight(0xff1801, 3, 30);
scene.add(trackGlow);

// --- THE DETAILED VISUAL RACING TRACK ---
const trackRadius = 25;
const trackGroup = new THREE.Group();

const asphaltGeo = new THREE.TorusGeometry(trackRadius, 3.2, 32, 120);
const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.85, metalness: 0.1 });
const asphaltMesh = new THREE.Mesh(asphaltGeo, asphaltMat);
asphaltMesh.rotation.x = Math.PI / 2;
trackGroup.add(asphaltMesh);

const totalCurbSegments = 120;
const curbRadiusInner = trackRadius - 3.2;

for (let i = 0; i < totalCurbSegments; i++) {
    const angleStart = (i / totalCurbSegments) * Math.PI * 2;
    const angleEnd = ((i + 1) / totalCurbSegments) * Math.PI * 2;
    
    const isRed = i % 2 === 0;
    const curbMat = new THREE.MeshStandardMaterial({ 
        color: isRed ? 0xcc0000 : 0xeeeeee, 
        roughness: 0.6 
    });

    const curbGeo = new THREE.RingGeometry(curbRadiusInner - 0.15, curbRadiusInner, 4, 1, angleStart, angleEnd - angleStart);
    const curbMesh = new THREE.Mesh(curbGeo, curbMat);
    curbMesh.rotation.x = -Math.PI / 2;
    curbMesh.position.y = 0.02;
    trackGroup.add(curbMesh);
}
scene.add(trackGroup);

// ==========================================================
//  DARK STUDIO ENVIRONMENT  (cinematic spotlight showcase)
// ==========================================================
trackGroup.visible = false; // hide the chunky tube track; use a sleek floor circuit instead

// --- Reflective mirror floor (real planar reflection of the car) ---
let mirrorFloor;
if (typeof THREE.Reflector === 'function') {
    mirrorFloor = new THREE.Reflector(
        new THREE.PlaneGeometry(600, 600),
        {
            clipBias: 0.003,
            // Capped resolution keeps the extra mirror render pass cheap → smoother scrolling
            textureWidth: Math.floor(window.innerWidth * 0.7),
            textureHeight: Math.floor(window.innerHeight * 0.7),
            color: 0x0a0a0f
        }
    );
} else {
    // Fallback: glossy dark plane if the Reflector script failed to load
    mirrorFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(600, 600),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness: 0.2, metalness: 0.9 })
    );
}
mirrorFloor.rotation.x = -Math.PI / 2;
mirrorFloor.position.y = -0.02;
scene.add(mirrorFloor);

// Glossy tint over the mirror so it reads as a wet showroom floor, not a perfect mirror
const glossTint = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshBasicMaterial({ color: 0x04040a, transparent: true, opacity: 0.55, depthWrite: false })
);
glossTint.rotation.x = -Math.PI / 2;
glossTint.position.y = -0.012;
scene.add(glossTint);

// --- Sleek circuit painted on the floor (flat lane + glowing edges) ---
const laneRing = new THREE.Mesh(
    new THREE.RingGeometry(trackRadius - 2.4, trackRadius + 2.4, 180),
    new THREE.MeshStandardMaterial({ color: 0x0e0e13, roughness: 0.45, metalness: 0.25 })
);
laneRing.rotation.x = -Math.PI / 2;
laneRing.position.y = 0.004;
scene.add(laneRing);

const edgeInner = new THREE.Mesh(
    new THREE.RingGeometry(trackRadius - 2.5, trackRadius - 2.34, 180),
    new THREE.MeshBasicMaterial({ color: 0xff1801, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
);
edgeInner.rotation.x = -Math.PI / 2;
edgeInner.position.y = 0.02;
scene.add(edgeInner);
const edgeOuter = new THREE.Mesh(
    new THREE.RingGeometry(trackRadius + 2.34, trackRadius + 2.5, 180),
    new THREE.MeshBasicMaterial({ color: 0xff1801, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
);
edgeOuter.rotation.x = -Math.PI / 2;
edgeOuter.position.y = 0.02;
scene.add(edgeOuter);

// --- HERO SPOTLIGHT that tracks the car (studio key light) ---
const spotlight = new THREE.SpotLight(0xffffff, 11, 80, Math.PI / 8, 0.35, 1.1);
spotlight.position.set(0, 26, trackRadius);
scene.add(spotlight);
scene.add(spotlight.target);

// Soft visible light cone above the car
const spotCone = new THREE.Mesh(
    new THREE.ConeGeometry(6.5, 26, 40, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
);
spotCone.position.set(0, 13, trackRadius);
scene.add(spotCone);

// Bright pool where the beam meets the floor
const spotPool = new THREE.Mesh(
    new THREE.CircleGeometry(5, 48),
    new THREE.MeshBasicMaterial({ color: 0xaac4ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
);
spotPool.rotation.x = -Math.PI / 2;
spotPool.position.set(0, 0.03, trackRadius);
scene.add(spotPool);

// --- Studio rim / accent lights (cool + warm) for premium car shaping ---
const rimCool = new THREE.PointLight(0x3b6bff, 3.2, 50);
rimCool.position.set(-16, 7, -12);
scene.add(rimCool);
const rimWarm = new THREE.PointLight(0xff5a2a, 2.6, 50);
rimWarm.position.set(16, 6, 12);
scene.add(rimWarm);

// --- Faint stars in the dark backdrop for depth ---
const starCount = 400;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 100 + Math.random() * 70;
    starPos[i * 3]     = Math.cos(ang) * rad;
    starPos[i * 3 + 1] = 18 + Math.random() * 80;
    starPos[i * 3 + 2] = Math.sin(ang) * rad;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x8894b8, size: 0.3, transparent: true, opacity: 0.6, depthWrite: false }));
scene.add(stars);

// --- DETAILED REALISTIC HIGH-POLY F1 CAR ---
const carGroup = new THREE.Group();
const paintRed = new THREE.MeshStandardMaterial({ color: 0xe60000, roughness: 0.15, metalness: 0.8 });
const carbonFiber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.5 });
const tireMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3, metalness: 0.9 });

const floor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 3.8), carbonFiber);
floor.position.y = 0.08;
carGroup.add(floor);

const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 4), paintRed);
noseCone.rotation.x = -Math.PI / 2;
noseCone.position.set(0, 0.28, -0.9);
noseCone.scale.set(1, 1, 0.4);
carGroup.add(noseCone);

const engineCover = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.6), paintRed);
engineCover.position.set(0, 0.45, 0.6);
carGroup.add(engineCover);

const leftSidepod = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 1.4), paintRed);
leftSidepod.position.set(-0.45, 0.3, 0.3);
carGroup.add(leftSidepod);

const rightSidepod = leftSidepod.clone();
rightSidepod.position.x = 0.45;
carGroup.add(rightSidepod);

const halo = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 8, 24, Math.PI), carbonFiber);
halo.position.set(0, 0.62, -0.1);
halo.rotation.x = -Math.PI / 6;
carGroup.add(halo);

const frontWingMain = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 0.4), carbonFiber);
frontWingMain.position.set(0, 0.12, -2.0);
carGroup.add(frontWingMain);

const frontWingFlapL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.35), paintRed);
frontWingFlapL.position.set(-0.5, 0.16, -2.0);
carGroup.add(frontWingFlapL);

const frontWingFlapR = frontWingFlapL.clone();
frontWingFlapR.position.x = 0.5;
carGroup.add(frontWingFlapR);

const rearWingMain = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.1), paintRed);
rearWingMain.position.set(0, 0.85, 1.9);
carGroup.add(rearWingMain);

const rearWingEndL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.4), carbonFiber);
rearWingEndL.position.set(-0.75, 0.7, 1.9);
carGroup.add(rearWingEndL);

const rearWingEndR = rearWingEndL.clone();
rearWingEndR.position.x = 0.75;
carGroup.add(rearWingEndR);

const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.45, 24).rotateZ(Math.PI / 2);
const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.47, 16).rotateZ(Math.PI / 2);

const wheelHubPositions = [
    [-0.85, 0.42, -1.3], [0.85, 0.42, -1.3],
    [-0.9, 0.42, 1.2],   [0.9, 0.42, 1.2]
];

const wheelElements = [];
wheelHubPositions.forEach((pos) => {
    const wheelContainer = new THREE.Group();
    
    const tire = new THREE.Mesh(wheelGeo, tireMat);
    const rim = new THREE.Mesh(rimGeo, wheelRimMat);
    
    wheelContainer.add(tire);
    wheelContainer.add(rim);
    wheelContainer.position.set(...pos);
    
    const strutGeo = new THREE.BoxGeometry(0.7, 0.03, 0.03);
    const strut = new THREE.Mesh(strutGeo, carbonFiber);
    strut.position.set(pos[0] > 0 ? -0.4 : 0.4, 0, 0);
    wheelContainer.add(strut);

    carGroup.add(wheelContainer);
    wheelElements.push(wheelContainer);
});

scene.add(carGroup);

// ==========================================================
//  IMPORTED F1 CAR MODEL (.glb) — replaces the primitive car
// ----------------------------------------------------------
//  Drop a DOWNLOADABLE F1 model named "f1_car.glb" next to this
//  file and open it via http://localhost:8000/F1.html (a local
//  file:// double-click cannot load local model files).
//  While the model is missing/loading, the built-in box car
//  shows as a fallback. Tune the constants below per model.
// ==========================================================
const CAR_MODEL_URL  = './f1_car.glb'; // <-- your downloaded F1 model
const CAR_FIT_LENGTH = 4.6;   // world units the model's longest side is scaled to
const CAR_ROTATION_Y = 0;     // radians — rotate so the nose points along -Z (try Math.PI or ±Math.PI/2)
const CAR_Y_OFFSET   = 0;     // raise/lower after grounding

const _primitiveCarParts = carGroup.children.slice(); // fallback pieces, hidden on success

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

            // Auto-fit length, center on the group origin, sit wheels on the floor
            let box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const s = CAR_FIT_LENGTH / maxDim;
            model.scale.setScalar(s);
            model.position.sub(center.multiplyScalar(s));
            box = new THREE.Box3().setFromObject(model);
            model.position.y -= box.min.y;
            model.position.y += CAR_Y_OFFSET;
            model.rotation.y = CAR_ROTATION_Y;

            model.traverse((o) => { if (o.isMesh && o.material) o.material.needsUpdate = true; });

            _primitiveCarParts.forEach((p) => { p.visible = false; }); // hide the box car
            carGroup.add(model);
            window.__carModel = model;
            console.log('[car] Imported F1 model loaded from', CAR_MODEL_URL,
                '\n[car] If facing/scale is off, tune CAR_ROTATION_Y / CAR_FIT_LENGTH / CAR_Y_OFFSET.');
        },
        undefined,
        (err) => {
            console.warn('[car] Could not load "' + CAR_MODEL_URL +
                '" — keeping the built-in primitive car. Place a downloadable .glb there and serve over http.', err);
        }
    );
}

let currentMouseX = 0;
let currentMouseY = 0;
let lastScrollT = 0;

// --- PARALLAX INTRO & SCROLL PIPELINE ---
let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
});

const telemetryTracker = { progress: 0 };
const speedo = document.getElementById('speedo');
const speedBar = document.getElementById('speed-bar');
const laps = document.querySelectorAll('.hud-lap');

// Car starts parked on the grid. The lap is driven PURELY by scroll so the
// car position can never fight an intro tween → stays perfectly in sync.
carGroup.position.set(0, 0, trackRadius);

// Cinematic camera dolly-in (camera only — never touches the car position)
const targetCameraPosition = new THREE.Vector3(20, 10, 48); // wide opening frame
camera.position.copy(targetCameraPosition);
const introCamTween = gsap.to(targetCameraPosition, {
    x: 8, y: 3.4, z: 36,
    duration: 2.4,
    ease: "power3.out"
});

// Scroll lap mapping goes live immediately so the car tracks scroll from pixel one
initScrollMapping();

function initScrollMapping() {
    // Setup click navigation for custom scrollbar
    const scrollNavItems = document.querySelectorAll('.scroll-nav-item');
    scrollNavItems.forEach((item) => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    gsap.to(telemetryTracker, {
        progress: 1,
        scrollTrigger: {
            trigger: "main",
            start: "top top",
            end: "bottom bottom",
            scrub: 1,
            onUpdate: (self) => {
                // Once the user scrolls, the scroll owns the camera — stop the intro dolly
                if (introCamTween.isActive()) introCamTween.kill();

                const sections = ['grid', 'pit', 'drs', 'podium'];
                const sectionEls = sections.map(id => document.getElementById(id));
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                const offsets = sectionEls.map(el => el ? el.offsetTop : 0);

                const angle = telemetryTracker.progress * Math.PI * 2;
                
                carGroup.position.x = Math.sin(angle) * trackRadius;
                carGroup.position.z = Math.cos(angle) * trackRadius;
                carGroup.rotation.y = angle + Math.PI / 2;

                const drsModifier = isDrsOn ? 2.5 : 1.0;
                wheelElements.forEach(w => w.rotation.x -= self.getVelocity() * 0.008 * drsModifier);

                const p = self.progress;

                // Update custom scroll progress bar aligned with section offsets
                const customProgressBar = document.getElementById('scroll-progress-bar');
                if (customProgressBar) {
                    let progressPercent = 0;
                    if (scrollTop <= offsets[0]) {
                        progressPercent = 0;
                    } else if (scrollTop >= offsets[3]) {
                        progressPercent = 100;
                    } else {
                        let interval = 0;
                        for (let i = 0; i < 3; i++) {
                            if (scrollTop >= offsets[i] && scrollTop < offsets[i+1]) {
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

                // Update active scroll indicators based on section headers
                let activeIdx = 0;
                if (scrollTop >= offsets[3]) {
                    activeIdx = 3;
                } else if (scrollTop >= offsets[2]) {
                    activeIdx = 2;
                } else if (scrollTop >= offsets[1]) {
                    activeIdx = 1;
                } else {
                    activeIdx = 0;
                }

                scrollNavItems.forEach((navItem, idx) => {
                    if (idx === activeIdx) {
                        navItem.classList.add('active');
                    } else {
                        navItem.classList.remove('active');
                    }
                });


                // --- SHOWCASE CAMERA RIG ---
                // Orbit the camera in the CAR'S OWN reference frame so every scroll
                // phase frames a flattering angle of the car's design.
                const theta = carGroup.rotation.y;             // car heading
                const fwdX = -Math.sin(theta), fwdZ = -Math.cos(theta); // nose direction (-Z)
                const rgtX =  Math.cos(theta), rgtZ = -Math.sin(theta); // car's right (+X)

                // Keyframes: [progress, forwardOffset, rightOffset, height]
                const camKeys = [
                    [0.00,  4.6,  3.2, 1.5],   // front 3/4, low — nose & front wing
                    [0.33,  0.0,  6.4, 2.2],   // side profile — flank & livery
                    [0.66, -5.2,  3.4, 1.3],   // rear 3/4, low — rear wing & diffuser
                    [1.00,  5.6,  1.8, 6.2]    // elevated front — hero beauty shot
                ];
                let cf = camKeys[0][1], cr = camKeys[0][2], ch = camKeys[0][3];
                for (let i = 0; i < camKeys.length - 1; i++) {
                    const a = camKeys[i], b = camKeys[i + 1];
                    if (p >= a[0] && p <= b[0]) {
                        const t = (p - a[0]) / (b[0] - a[0]);
                        const e = t * t * (3 - 2 * t); // smoothstep for cinematic easing
                        cf = a[1] + (b[1] - a[1]) * e;
                        cr = a[2] + (b[2] - a[2]) * e;
                        ch = a[3] + (b[3] - a[3]) * e;
                        break;
                    }
                }
                targetCameraPosition.set(
                    carGroup.position.x + fwdX * cf + rgtX * cr,
                    ch,
                    carGroup.position.z + fwdZ * cf + rgtZ * cr
                );

                updateHUDTracker(activeIdx);

                // SVG Mini-map Car tracking updates
                const minimapCar = document.getElementById('minimap-car');
                const sectorDisplay = document.getElementById('sector-display');
                const trackPath = document.getElementById('minimap-track-path');
                const activePath = document.getElementById('minimap-track-path-active');
                
                // Sector color coding mapping
                const sectorColors = ['#ff1801', '#ffb700', '#00d2ff', '#ffd700']; // S1: Red, S2: Amber, S3: Blue, S4: Gold
                const currentSectorColor = sectorColors[activeIdx] || '#ff1801';
                
                if (trackPath && activePath && minimapCar) {
                    const pathLength = trackPath.getTotalLength();
                    const currentProgress = p; // scroll progress [0, 1]
                    const point = trackPath.getPointAtLength(currentProgress * pathLength);
                    
                    // Update car position
                    minimapCar.setAttribute('cx', point.x);
                    minimapCar.setAttribute('cy', point.y);
                    
                    // Update glowing line trail
                    activePath.style.strokeDasharray = pathLength;
                    activePath.style.strokeDashoffset = pathLength * (1 - currentProgress);
                    
                    // Update dynamic colors based on active sector
                    activePath.style.stroke = currentSectorColor;
                    minimapCar.style.stroke = currentSectorColor;
                    activePath.style.setProperty('--sector-glow', currentSectorColor);
                    minimapCar.style.setProperty('--sector-glow', currentSectorColor);
                }
                
                const sector = `S${activeIdx + 1}`;
                if (sectorDisplay) sectorDisplay.innerText = sector;

                const velocity = self.getVelocity();
                lastScrollT = performance.now();
                updateEngineSound(velocity);

                let currentRPM = Math.abs(Math.round(velocity * 1.5)) + (isDrsOn ? 5500 : 0);
                if(currentRPM > 13500) currentRPM = 13500;
                speedo.innerText = currentRPM;
                speedBar.style.width = `${(currentRPM / 13500) * 100}%`;

                // Shift lights update
                const ledElements = document.querySelectorAll('.rev-led');
                const activeLedsCount = Math.floor((currentRPM / 13500) * ledElements.length);
                ledElements.forEach((led, idx) => {
                    if (idx < activeLedsCount) {
                        led.classList.add('active');
                    } else {
                        led.classList.remove('active');
                    }
                });

                // Gear selector update
                const gearIndicator = document.getElementById('gear-indicator');
                if (gearIndicator) {
                    let gear = "N";
                    if (currentRPM > 100) {
                        if (isDrsOn) {
                            gear = "8";
                        } else {
                            if (p < 0.25) gear = "4";
                            else if (p < 0.5) gear = "2"; // Pit lane limit!
                            else if (p < 0.75) gear = "6";
                            else gear = "5";
                        }
                    }
                    gearIndicator.innerText = gear;
                }
            }
        }
    });
    // The lap trigger is created after the intro finishes — recalc all
    // ScrollTrigger start/end positions so scrolling stays in sync.
    ScrollTrigger.refresh();
}

gsap.to("#project-slider", {
    y: "-62%",
    scrollTrigger: {
        trigger: "#drs",
        start: "top top",
        end: "bottom bottom",
        scrub: true
    }
});

gsap.to("#hero-content", {
    opacity: 0,
    y: -80,
    scrollTrigger: {
        trigger: "#grid",
        start: "top top",
        end: "bottom top",
        scrub: true
    }
});

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

// S1 Hero → revealed by the LIGHTS-OUT launch (start-lights intro at the end of this script)
const heroPanel = document.getElementById('hero-content');
function playHeroReveal() {
    if (!heroPanel) return;
    gsap.fromTo(heroPanel, { x: -90, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.1, ease: "power3.out" });
    gsap.from(nonCornerRows(heroPanel), {
        y: 26, autoAlpha: 0, duration: 0.6, stagger: 0.09, ease: "power2.out", delay: 0.2
    });
}

function updateHUDTracker(activeIdx) {
    laps.forEach((lap, idx) => {
        if(idx === activeIdx) {
            lap.className = "hud-lap border border-[#ff1801] px-2 py-1 text-white bg-[#ff1801]/10";
        } else {
            lap.className = "hud-lap border border-gray-800 px-2 py-1";
        }
    });
}



// --- MASTER ENGINE RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);

    // Settle the engine down to idle when the user isn't actively scrolling
    if (audioCtx && performance.now() - lastScrollT > 120) updateEngineSound(0);

    currentMouseX += (mouseX - currentMouseX) * 0.05;
    currentMouseY += (mouseY - currentMouseY) * 0.05;

    camera.position.copy(targetCameraPosition);
    camera.position.x += currentMouseX * 4;
    camera.position.y += -currentMouseY * 3;
    camera.lookAt(carGroup.position);

    trackGlow.position.set(carGroup.position.x, 0.5, carGroup.position.z);

    // Studio spotlight, light cone and floor pool ride along with the car
    spotlight.position.set(carGroup.position.x, 26, carGroup.position.z);
    spotlight.target.position.copy(carGroup.position);
    spotlight.target.updateMatrixWorld();
    spotCone.position.set(carGroup.position.x, 13, carGroup.position.z);
    spotPool.position.set(carGroup.position.x, 0.03, carGroup.position.z);
    rimCool.intensity = isDrsOn ? 5.0 : 3.2;

    // Idle turntable — slowly spin the car while parked in the hero (before scrolling)
    if (telemetryTracker.progress < 0.002) {
        carGroup.rotation.y += 0.004;
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

    document.body.style.overflow = 'hidden';   // lock scroll during the sequence
    window.scrollTo(0, 0);

    function finish() {
        document.body.style.overflow = '';
        if (typeof playHeroReveal === 'function') playHeroReveal();
        gsap.to(overlay, {
            opacity: 0, duration: 0.7, ease: 'power2.inOut',
            onComplete: () => { overlay.remove(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }
        });
    }

    // Respect reduced-motion — skip straight to the reveal
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finish();
        return;
    }

    // --- IGNITE GATE: a user gesture is required so the launch audio can play ---
    if (subEl) { subEl.textContent = '▶  CLICK / TAP / PRESS ANY KEY TO IGNITE'; subEl.classList.add('sl-prompt'); }
    overlay.style.cursor = 'pointer';
    let started = false;
    function ignite() {
        if (started) return;
        started = true;
        overlay.removeEventListener('click', ignite);
        window.removeEventListener('keydown', ignite);
        overlay.style.cursor = '';
        try { initEngineSound(); } catch (e) {}   // unlock audio + start idle engine
        if (subEl) { subEl.classList.remove('sl-prompt'); subEl.textContent = '// FORMATION LAP COMPLETE — AWAIT START'; }
        setTimeout(armNext, 600);
    }
    overlay.addEventListener('click', ignite);
    window.addEventListener('keydown', ignite);

    // Arm the five lights one column at a time, each with a beep
    let i = 0;
    function armNext() {
        if (i < cols.length) {
            cols[i].classList.add('on');
            try { playBeep(760, 0.16, 0.16); } catch (e) {}
            i++;
            setTimeout(armNext, 850);
        } else {
            if (subEl) subEl.textContent = '// ALL LIGHTS ON — HOLD';
            setTimeout(lightsOut, 900 + Math.random() * 1900); // dramatic random hold
        }
    }

    function lightsOut() {
        cols.forEach((c) => c.classList.remove('on')); // all extinguish together
        if (textEl) gsap.fromTo(textEl, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' });
        if (subEl) subEl.textContent = '// GO GO GO';

        // Authentic launch: engine roar sweep + "GO" tone + idle engine spins up
        // (hold the rev for ~600ms before the idle-decay eases it back)
        try { lastScrollT = performance.now() + 600; playLaunchRoar(); updateEngineSound(1600); } catch (e) {}

        // Camera launch punch — FOV whoosh from wide to normal
        try {
            const fovP = { v: 84 };
            camera.fov = 84; camera.updateProjectionMatrix();
            gsap.to(fovP, { v: 60, duration: 1.4, ease: 'power4.out',
                onUpdate: () => { camera.fov = fovP.v; camera.updateProjectionMatrix(); } });
        } catch (e) {}

        setTimeout(finish, 480); // let the LIGHTS OUT flash read, then reveal
    }
})();
