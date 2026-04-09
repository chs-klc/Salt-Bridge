/**
 * simulation.js
 * Handles the 2D Canvas animation of the Zinc-Copper galvanic cell.
 */

let canvas, ctx;
let animationId;
let isPlaying = false;
let particles = [];
let frameCount = 0;
let simInitialised = false;

/**
 * Called once when the simulation tab is first opened.
 * Grabs the canvas element and starts the render loop.
 */
function initSimulation() {
    if (simInitialised) return;

    canvas = document.getElementById('chemCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    window.addEventListener('resize', resizeCanvas);
    animate();
    simInitialised = true;
}

// ---------------------------------------------------------------------------
// Canvas sizing
// ---------------------------------------------------------------------------

function resizeCanvas() {
    if (!canvas) return;
    const container = document.getElementById('sim-container');
    if (container && container.clientWidth > 0) {
        canvas.width = container.clientWidth;
        canvas.height = canvas.width * 0.5625; // 16:9 aspect ratio
    }
    drawScene();
}

// ---------------------------------------------------------------------------
// Particle spawning
// ---------------------------------------------------------------------------

function spawnElectron() {
    const cw = canvas.width;
    const ch = canvas.height;
    particles.push({
        type: 'electron',
        x: cw * 0.25,
        y: ch * 0.45,
        progress: 0,
        speed: 0.005 + Math.random() * 0.002
    });
}

function spawnCation() {
    const cw = canvas.width;
    const ch = canvas.height;
    particles.push({
        type: 'cation', // K+
        x: cw * 0.5,
        y: ch * 0.35,
        progress: 0,
        speed: 0.003 + Math.random() * 0.001
    });
}

function spawnAnion() {
    const cw = canvas.width;
    const ch = canvas.height;
    particles.push({
        type: 'anion', // NO3-
        x: cw * 0.5,
        y: ch * 0.35,
        progress: 0,
        speed: 0.003 + Math.random() * 0.001
    });
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawScene() {
    if (!canvas || !ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    // --- Beakers ---
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#94a3b8';

    // Left beaker
    ctx.beginPath();
    ctx.moveTo(cw * 0.1,  ch * 0.4);
    ctx.lineTo(cw * 0.1,  ch * 0.9);
    ctx.lineTo(cw * 0.4,  ch * 0.9);
    ctx.lineTo(cw * 0.4,  ch * 0.4);
    ctx.stroke();

    // Right beaker
    ctx.beginPath();
    ctx.moveTo(cw * 0.6, ch * 0.4);
    ctx.lineTo(cw * 0.6, ch * 0.9);
    ctx.lineTo(cw * 0.9, ch * 0.9);
    ctx.lineTo(cw * 0.9, ch * 0.4);
    ctx.stroke();

    // --- Solutions ---
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fillRect(cw * 0.105, ch * 0.5, cw * 0.29, ch * 0.395);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.fillRect(cw * 0.605, ch * 0.5, cw * 0.29, ch * 0.395);

    // --- Electrodes ---
    ctx.fillStyle = '#64748b'; // Zinc (grey)
    ctx.fillRect(cw * 0.22, ch * 0.3, cw * 0.06, ch * 0.45);
    ctx.fillStyle = '#b45309'; // Copper (amber)
    ctx.fillRect(cw * 0.72, ch * 0.3, cw * 0.06, ch * 0.45);

    // --- Wires ---
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cw * 0.25, ch * 0.3);
    ctx.lineTo(cw * 0.25, ch * 0.15);
    ctx.lineTo(cw * 0.45, ch * 0.15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cw * 0.55, ch * 0.15);
    ctx.lineTo(cw * 0.75, ch * 0.15);
    ctx.lineTo(cw * 0.75, ch * 0.3);
    ctx.stroke();

    // --- Voltmeter ---
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(cw * 0.5, ch * 0.15, cw * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${cw * 0.04}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', cw * 0.5, ch * 0.15);

    // Voltmeter needle
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cw * 0.5, ch * 0.18);
    ctx.lineTo(isPlaying ? cw * 0.53 : cw * 0.5, isPlaying ? ch * 0.12 : ch * 0.11);
    ctx.stroke();

    // --- Salt Bridge ---
    ctx.lineWidth = 20;
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.3)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cw * 0.35, ch * 0.7);
    ctx.lineTo(cw * 0.35, ch * 0.35);
    ctx.lineTo(cw * 0.65, ch * 0.35);
    ctx.lineTo(cw * 0.65, ch * 0.7);
    ctx.stroke();

    // Outer outline
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(cw * 0.33, ch * 0.7);
    ctx.lineTo(cw * 0.33, ch * 0.33);
    ctx.lineTo(cw * 0.67, ch * 0.33);
    ctx.lineTo(cw * 0.67, ch * 0.7);
    ctx.stroke();
    // Inner outline
    ctx.beginPath();
    ctx.moveTo(cw * 0.37, ch * 0.7);
    ctx.lineTo(cw * 0.37, ch * 0.37);
    ctx.lineTo(cw * 0.63, ch * 0.37);
    ctx.lineTo(cw * 0.63, ch * 0.7);
    ctx.stroke();

    // --- Labels ---
    ctx.fillStyle = '#f8fafc';
    ctx.font = `${cw * 0.03}px Arial`;
    ctx.textAlign = 'center';

    ctx.fillText('Zinc Anode (-)', cw * 0.25, ch * 0.85);
    ctx.fillText('Zn²⁺(aq)',       cw * 0.25, ch * 0.6);
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('Oxidation',      cw * 0.25, ch * 0.95);

    ctx.fillStyle = '#f8fafc';
    ctx.fillText('Copper Cathode (+)', cw * 0.75, ch * 0.85);
    ctx.fillText('Cu²⁺(aq)',           cw * 0.75, ch * 0.6);
    ctx.fillStyle = '#86efac';
    ctx.fillText('Reduction',          cw * 0.75, ch * 0.95);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = `italic ${cw * 0.025}px Arial`;
    ctx.fillText('Salt Bridge (KNO₃)', cw * 0.5, ch * 0.28);

    ctx.font = `${cw * 0.025}px Arial`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Zn → Zn²⁺ + 2e⁻',  cw * 0.25, ch * 0.25);
    ctx.fillText('Cu²⁺ + 2e⁻ → Cu',  cw * 0.75, ch * 0.25);

    // --- Particles ---
    particles.forEach(p => {
        let px, py;
        const cw = canvas.width;
        const ch = canvas.height;

        if (p.type === 'electron') {
            if (p.progress < 0.2) {
                px = cw * 0.25;
                py = ch * 0.45 - (p.progress / 0.2) * (ch * 0.3);
            } else if (p.progress < 0.8) {
                px = cw * 0.25 + ((p.progress - 0.2) / 0.6) * (cw * 0.5);
                py = ch * 0.15;
            } else {
                px = cw * 0.75;
                py = ch * 0.15 + ((p.progress - 0.8) / 0.2) * (ch * 0.3);
            }
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(px, py, cw * 0.015, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = `bold ${cw * 0.02}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('e⁻', px, py);

        } else if (p.type === 'cation') {
            if (p.progress < 0.5) {
                px = cw * 0.5 + (p.progress / 0.5) * (cw * 0.15);
                py = ch * 0.35;
            } else {
                px = cw * 0.65;
                py = ch * 0.35 + ((p.progress - 0.5) / 0.5) * (ch * 0.35);
            }
            ctx.fillStyle = '#c084fc';
            ctx.beginPath();
            ctx.arc(px, py, cw * 0.02, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${cw * 0.02}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('K⁺', px, py);

        } else if (p.type === 'anion') {
            if (p.progress < 0.5) {
                px = cw * 0.5 - (p.progress / 0.5) * (cw * 0.15);
                py = ch * 0.35;
            } else {
                px = cw * 0.35;
                py = ch * 0.35 + ((p.progress - 0.5) / 0.5) * (ch * 0.35);
            }
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.arc(px, py, cw * 0.02, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = `bold ${cw * 0.018}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('NO₃⁻', px, py);
        }

        if (isPlaying) {
            p.progress += p.speed;
        }
    });

    // Remove completed particles
    particles = particles.filter(p => p.progress <= 1);
}

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------

function animate() {
    if (isPlaying) {
        frameCount++;
        if (frameCount % 40 === 0)  spawnElectron();
        if (frameCount % 60 === 0)  spawnCation();
        if (frameCount % 60 === 30) spawnAnion();
    }
    drawScene();
    animationId = requestAnimationFrame(animate);
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function toggleSimulation() {
    const btn = document.getElementById('sim-play');
    isPlaying = !isPlaying;

    if (isPlaying) {
        btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        btn.classList.replace('bg-emerald-600', 'bg-amber-500');
        btn.classList.replace('hover:bg-emerald-700', 'hover:bg-amber-600');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
        btn.classList.replace('bg-amber-500', 'bg-emerald-600');
        btn.classList.replace('hover:bg-amber-600', 'hover:bg-emerald-700');
    }
}

function resetSimulation() {
    isPlaying = false;
    particles = [];
    frameCount = 0;

    const btn = document.getElementById('sim-play');
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
        btn.classList.replace('bg-amber-500', 'bg-emerald-600');
        btn.classList.replace('hover:bg-amber-600', 'hover:bg-emerald-700');
    }
    drawScene();
}
