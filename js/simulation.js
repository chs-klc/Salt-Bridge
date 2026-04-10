/**
 * simulation.js
 * Handles the 2D Canvas animation of the Zinc-Copper galvanic cell.
 * Supports interactive salt bridge toggle to demonstrate charge buildup consequences.
 */

let canvas, ctx;
let animationId;
let isPlaying = false;
let particles = [];
let frameCount = 0;
let simInitialised = false;

// --- Salt bridge & charge imbalance state ---
let saltBridgePresent = true;
let chargeImbalance = 0; // 0–100: how much charge has built up due to missing bridge
let showCircuitExplain = false;  // toggle for ionic circuit explanation overlay
let bridgeFluid = 'kno3';        // 'kno3' | 'water' — what fills the salt bridge

// Fixed canvas-fraction positions for charge accumulation symbols inside each beaker.
// Anode beaker (x: 10%–40%), avoiding electrode (x: 22%–28%).
const ANODE_CHARGE_POS = [
    [0.135, 0.60], [0.350, 0.67], [0.160, 0.78],
    [0.370, 0.82], [0.130, 0.87], [0.320, 0.55], [0.175, 0.53]
];
// Cathode beaker (x: 60%–90%), avoiding electrode (x: 72%–78%).
const CATHODE_CHARGE_POS = [
    [0.635, 0.60], [0.850, 0.67], [0.660, 0.78],
    [0.870, 0.82], [0.630, 0.87], [0.820, 0.55], [0.675, 0.53]
];

/** Returns the current effective voltage level: 1 = full, 0 = dead. */
function getVoltageLevel() {
    return Math.max(0, 1 - chargeImbalance / 100);
}

/** True when the bridge can actually carry ions (present AND filled with KNO₃). */
function bridgeConductive() {
    return saltBridgePresent && bridgeFluid === 'kno3';
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

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
        canvas.height = canvas.width * 0.5625; // 16:9
    }
    drawScene();
}

// ---------------------------------------------------------------------------
// Particle spawning
// ---------------------------------------------------------------------------

function spawnElectron() {
    const cw = canvas.width, ch = canvas.height;
    const v = getVoltageLevel();
    particles.push({
        type: 'electron',
        x: cw * 0.25,
        y: ch * 0.45,
        progress: 0,
        speed: (0.005 + Math.random() * 0.002) * Math.max(0.25, v)
    });
}

function spawnCation() {
    const cw = canvas.width, ch = canvas.height;
    particles.push({ type: 'cation', x: cw * 0.5, y: ch * 0.35, progress: 0, speed: 0.003 + Math.random() * 0.001 });
}

function spawnAnion() {
    const cw = canvas.width, ch = canvas.height;
    particles.push({ type: 'anion', x: cw * 0.5, y: ch * 0.35, progress: 0, speed: 0.003 + Math.random() * 0.001 });
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function drawScene() {
    if (!canvas || !ctx) return;
    const cw = canvas.width, ch = canvas.height;
    const v = getVoltageLevel();

    ctx.clearRect(0, 0, cw, ch);

    // --- Beakers ---
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath(); ctx.moveTo(cw*0.1,ch*0.4); ctx.lineTo(cw*0.1,ch*0.9); ctx.lineTo(cw*0.4,ch*0.9); ctx.lineTo(cw*0.4,ch*0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cw*0.6,ch*0.4); ctx.lineTo(cw*0.6,ch*0.9); ctx.lineTo(cw*0.9,ch*0.9); ctx.lineTo(cw*0.9,ch*0.4); ctx.stroke();

    // --- Solutions ---
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fillRect(cw*0.105, ch*0.5, cw*0.29, ch*0.395);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.fillRect(cw*0.605, ch*0.5, cw*0.29, ch*0.395);

    // --- Charge tint: anode turns redder, cathode turns deeper blue as imbalance grows ---
    if (chargeImbalance > 10) {
        const t = Math.min(1, (chargeImbalance - 10) / 70) * 0.30;
        ctx.fillStyle = `rgba(239, 68, 68, ${t})`;
        ctx.fillRect(cw*0.105, ch*0.5, cw*0.29, ch*0.395);
        ctx.fillStyle = `rgba(30, 58, 138, ${t})`;
        ctx.fillRect(cw*0.605, ch*0.5, cw*0.29, ch*0.395);
    }

    // --- Electrodes ---
    ctx.fillStyle = '#64748b'; // Zinc (grey)
    ctx.fillRect(cw*0.22, ch*0.3, cw*0.06, ch*0.45);
    ctx.fillStyle = '#b45309'; // Copper (amber)
    ctx.fillRect(cw*0.72, ch*0.3, cw*0.06, ch*0.45);

    // --- Wires ---
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath(); ctx.moveTo(cw*0.25,ch*0.3); ctx.lineTo(cw*0.25,ch*0.15); ctx.lineTo(cw*0.45,ch*0.15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cw*0.55,ch*0.15); ctx.lineTo(cw*0.75,ch*0.15); ctx.lineTo(cw*0.75,ch*0.3); ctx.stroke();

    // --- Voltmeter body ---
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cw*0.5, ch*0.15, cw*0.05, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${cw*0.04}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('V', cw*0.5, ch*0.15);

    // Voltmeter needle: interpolates between center (0V) and full deflection based on v
    const vDisplay = isPlaying ? v : 0;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cw*0.5, ch*0.18);
    ctx.lineTo(cw*(0.5 + 0.03*vDisplay), ch*(0.11 + 0.01*vDisplay));
    ctx.stroke();

    // --- Voltmeter digital LCD readout (below voltmeter circle) ---
    const voltReading = (1.10 * vDisplay).toFixed(2); // Zn/Cu cell ≈ 1.10 V max
    const lcdW = cw * 0.10, lcdH = ch * 0.065;
    const lcdX = cw * 0.5 - lcdW / 2, lcdY = ch * 0.205;
    // LCD background
    ctx.fillStyle = '#0f1a0f';
    ctx.strokeStyle = vDisplay > 0.05 ? '#4ade80' : '#374151';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(lcdX, lcdY, lcdW, lcdH, 4);
    ctx.fill(); ctx.stroke();
    // LCD digits
    ctx.fillStyle = vDisplay > 0.05 ? '#4ade80' : '#1f2d1f';
    ctx.font = `bold ${cw * 0.028}px 'Courier New', monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${voltReading} V`, cw * 0.5, lcdY + lcdH * 0.5);

    // --- Salt Bridge ---
    if (saltBridgePresent) {
        // Fill colour: KNO₃ = translucent white, water = light blue
        const bridgeFill = bridgeFluid === 'kno3'
            ? 'rgba(248, 250, 252, 0.3)'
            : 'rgba(125, 211, 252, 0.35)';
        ctx.lineWidth = 20;
        ctx.strokeStyle = bridgeFill;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(cw*0.35,ch*0.7); ctx.lineTo(cw*0.35,ch*0.35);
        ctx.lineTo(cw*0.65,ch*0.35); ctx.lineTo(cw*0.65,ch*0.7);
        ctx.stroke();
        // Outline colour: KNO₃ = grey, water = cyan
        const bridgeOutline = bridgeFluid === 'kno3' ? '#94a3b8' : '#22d3ee';
        ctx.lineWidth = 2; ctx.strokeStyle = bridgeOutline; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(cw*0.33,ch*0.7); ctx.lineTo(cw*0.33,ch*0.33); ctx.lineTo(cw*0.67,ch*0.33); ctx.lineTo(cw*0.67,ch*0.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cw*0.37,ch*0.7); ctx.lineTo(cw*0.37,ch*0.37); ctx.lineTo(cw*0.63,ch*0.37); ctx.lineTo(cw*0.63,ch*0.7); ctx.stroke();
    } else {
        // Removed: dashed red outline + red ✕ in the gap
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.beginPath(); ctx.moveTo(cw*0.33,ch*0.7); ctx.lineTo(cw*0.33,ch*0.33); ctx.lineTo(cw*0.67,ch*0.33); ctx.lineTo(cw*0.67,ch*0.7); ctx.stroke();
        ctx.setLineDash([]);
        const mx = cw*0.5, my = ch*0.35, s = cw*0.03;
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(mx-s,my-s); ctx.lineTo(mx+s,my+s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx+s,my-s); ctx.lineTo(mx-s,my+s); ctx.stroke();
    }

    // --- Charge accumulation symbols ---
    if (chargeImbalance > 0) {
        const numSymbols = Math.min(7, Math.floor(chargeImbalance / 14));
        const alpha = Math.min(1, chargeImbalance / 20);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        for (let i = 0; i < numSymbols; i++) {
            // Anode: excess positive charge (red circles with +)
            const ax = cw * ANODE_CHARGE_POS[i][0];
            const ay = ch * ANODE_CHARGE_POS[i][1];
            ctx.fillStyle = `rgba(252, 165, 165, ${alpha})`;
            ctx.beginPath(); ctx.arc(ax, ay, cw*0.02, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.font = `bold ${cw*0.02}px Arial`;
            ctx.fillText('+', ax, ay);

            // Cathode: excess negative charge (blue circles with −)
            const kx = cw * CATHODE_CHARGE_POS[i][0];
            const ky = ch * CATHODE_CHARGE_POS[i][1];
            ctx.fillStyle = `rgba(147, 197, 253, ${alpha})`;
            ctx.beginPath(); ctx.arc(kx, ky, cw*0.02, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.font = `bold ${cw*0.02}px Arial`;
            ctx.fillText('−', kx, ky);
        }
    }

    // --- Labels ---
    ctx.font = `${cw*0.03}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('Zinc Anode (−)',    cw*0.25, ch*0.85);
    ctx.fillText('Zn²⁺(aq)',         cw*0.25, ch*0.60);
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('Oxidation',        cw*0.25, ch*0.95);

    ctx.fillStyle = '#f8fafc';
    ctx.fillText('Copper Cathode (+)', cw*0.75, ch*0.85);
    ctx.fillText('Cu²⁺(aq)',           cw*0.75, ch*0.60);
    ctx.fillStyle = '#86efac';
    ctx.fillText('Reduction',          cw*0.75, ch*0.95);

    if (saltBridgePresent) {
        if (bridgeFluid === 'kno3') {
            ctx.fillStyle = '#e2e8f0';
            ctx.font = `italic ${cw*0.025}px Arial`;
            ctx.fillText('Salt Bridge (KNO₃)', cw*0.5, ch*0.28);
        } else {
            ctx.fillStyle = '#7dd3fc';
            ctx.font = `bold ${cw*0.025}px Arial`;
            ctx.fillText('Bridge: Distilled H₂O ✗', cw*0.5, ch*0.28);
        }
    } else {
        ctx.fillStyle = '#fca5a5';
        ctx.font = `bold ${cw*0.025}px Arial`;
        ctx.fillText('No Salt Bridge!', cw*0.5, ch*0.28);
    }

    ctx.font = `${cw*0.025}px Arial`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Zn → Zn²⁺ + 2e⁻', cw*0.25, ch*0.25);
    ctx.fillText('Cu²⁺ + 2e⁻ → Cu', cw*0.75, ch*0.25);

    // --- Particles ---
    particles.forEach(p => {
        let px, py;
        const cw = canvas.width, ch = canvas.height;

        if (p.type === 'electron') {
            if (p.progress < 0.2) {
                px = cw*0.25; py = ch*0.45 - (p.progress/0.2)*(ch*0.3);
            } else if (p.progress < 0.8) {
                px = cw*0.25 + ((p.progress-0.2)/0.6)*(cw*0.5); py = ch*0.15;
            } else {
                px = cw*0.75; py = ch*0.15 + ((p.progress-0.8)/0.2)*(ch*0.3);
            }
            ctx.fillStyle = '#eab308';
            ctx.beginPath(); ctx.arc(px, py, cw*0.015, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = `bold ${cw*0.02}px Arial`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('e⁻', px, py);

        } else if (p.type === 'cation') {
            if (p.progress < 0.5) {
                px = cw*0.5 + (p.progress/0.5)*(cw*0.15); py = ch*0.35;
            } else {
                px = cw*0.65; py = ch*0.35 + ((p.progress-0.5)/0.5)*(ch*0.35);
            }
            ctx.fillStyle = '#c084fc';
            ctx.beginPath(); ctx.arc(px, py, cw*0.02, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${cw*0.02}px Arial`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('K⁺', px, py);

        } else if (p.type === 'anion') {
            if (p.progress < 0.5) {
                px = cw*0.5 - (p.progress/0.5)*(cw*0.15); py = ch*0.35;
            } else {
                px = cw*0.35; py = ch*0.35 + ((p.progress-0.5)/0.5)*(ch*0.35);
            }
            ctx.fillStyle = '#4ade80';
            ctx.beginPath(); ctx.arc(px, py, cw*0.02, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = `bold ${cw*0.018}px Arial`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('NO₃⁻', px, py);
        }

        if (isPlaying) p.progress += p.speed;
    });

    particles = particles.filter(p => p.progress <= 1);

    // --- Circuit explanation overlay (drawn last, on top of everything) ---
    if (showCircuitExplain) drawCircuitAnnotations();
}

// ---------------------------------------------------------------------------
// Info / consequence panel
// ---------------------------------------------------------------------------

function updateInfoPanel() {
    const panel = document.getElementById('consequence-panel');
    if (!panel) return;
    const v = getVoltageLevel();
    const vPct = Math.round(v * 100);

    if (saltBridgePresent && bridgeFluid === 'kno3') {
        if (!isPlaying) {
            panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-slate-100 border-slate-200 text-slate-600';
            panel.innerHTML = '<i class="fa-solid fa-circle-info mr-2"></i>Press <strong>Play</strong> to start. Try removing the salt bridge or switching to distilled water!';
        } else {
            panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-emerald-50 border-emerald-300 text-emerald-800';
            panel.innerHTML = '<i class="fa-solid fa-circle-check mr-2 text-emerald-600"></i><strong>Circuit complete.</strong> K⁺ and NO₃⁻ ions flow through the KNO₃ bridge, neutralising charge buildup. Electrons flow steadily. Voltage is stable at <strong>1.10 V</strong>.';
        }
        return;
    }

    // Bridge present but filled with distilled water — same consequence as removed bridge
    if (saltBridgePresent && bridgeFluid === 'water') {
        const vPct = Math.round(getVoltageLevel() * 100);
        const vV   = (1.10 * getVoltageLevel()).toFixed(2);
        if (!isPlaying) {
            panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-cyan-50 border-cyan-300 text-cyan-800';
            panel.innerHTML = '<i class="fa-solid fa-droplet mr-2 text-cyan-500"></i><strong>Distilled water selected.</strong> Distilled water contains almost no ions (H⁺ and OH⁻ only at vanishingly low concentration). Press <strong>Play</strong> to observe the effect.';
        } else if (chargeImbalance < 25) {
            panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-cyan-50 border-cyan-300 text-cyan-800';
            panel.innerHTML = `<i class="fa-solid fa-droplet mr-2 text-cyan-500"></i><strong>Distilled water carries no ions!</strong> Without mobile ions, the bridge cannot neutralise the growing charge imbalance. Voltage: <strong>${vV} V</strong> (${vPct}%)`;
        } else if (chargeImbalance < 60) {
            panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-orange-50 border-orange-300 text-orange-800';
            panel.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-2 text-orange-500"></i><strong>Charge imbalance building!</strong> Distilled water has no free ions to migrate. An ionic compound like KNO₃ is needed. Voltage: <strong>${vV} V</strong> (${vPct}%)`;
        } else if (chargeImbalance < 98) {
            panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-red-50 border-red-300 text-red-800';
            panel.innerHTML = `<i class="fa-solid fa-circle-xmark mr-2 text-red-500"></i><strong>Cell almost dead!</strong> Even with the bridge tube in place, water provides no charge carriers. Only an <strong>ionic solution</strong> can complete the circuit. Voltage: <strong>${vV} V</strong>`;
        } else {
            panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-red-100 border-red-500 text-red-900';
            panel.innerHTML = '<i class="fa-solid fa-circle-xmark mr-2 text-red-600"></i><strong>CELL DEAD — 0.00 V.</strong> Distilled water fails because it has no mobile ions. Only an electrolyte (e.g. KNO₃, NaCl) can carry charge across and keep the circuit alive.';
        }
        return;
    }

    // Salt bridge absent — show progressive consequences
    if (chargeImbalance < 25) {
        panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-amber-50 border-amber-300 text-amber-800';
        panel.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-2 text-amber-500"></i><strong>Salt bridge removed!</strong> Zn²⁺ ions are accumulating in the anode half-cell (excess <strong>positive</strong> charge ●) and SO₄²⁻ is building up in the cathode half-cell (excess <strong>negative</strong> charge ●). Voltage: <strong>${vPct}%</strong>`;
    } else if (chargeImbalance < 60) {
        panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-orange-50 border-orange-300 text-orange-800';
        panel.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-2 text-orange-500"></i><strong>Charge imbalance growing!</strong> The electrostatic repulsion from accumulated charges is now opposing electron flow through the external wire. Effective voltage has dropped to <strong>${vPct}%</strong>.`;
    } else if (chargeImbalance < 98) {
        panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-red-50 border-red-300 text-red-800';
        panel.innerHTML = `<i class="fa-solid fa-circle-xmark mr-2 text-red-500"></i><strong>Almost dead!</strong> The charge imbalance nearly cancels the driving force of the redox reaction. Electrons have almost stopped flowing. Voltage: <strong>${vPct}%</strong>`;
    } else {
        panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-red-100 border-red-500 text-red-900';
        panel.innerHTML = '<i class="fa-solid fa-circle-xmark mr-2 text-red-600"></i><strong>CELL DEAD — Voltage = 0 V.</strong> The charge imbalance has completely cancelled the redox driving force and electron flow has stopped. This is why the salt bridge is essential: it neutralises the charge buildup and keeps the circuit alive.';
    }
}

// ---------------------------------------------------------------------------
// Circuit explanation overlay
// ---------------------------------------------------------------------------

function toggleCircuitExplain() {
    showCircuitExplain = !showCircuitExplain;
    const panel = document.getElementById('circuit-explain-panel');
    const btn   = document.getElementById('btn-explain');
    if (panel) panel.classList.toggle('hidden', !showCircuitExplain);
    if (btn) {
        if (showCircuitExplain) {
            btn.innerHTML = '<i class="fa-solid fa-circle-nodes"></i> Hide Explanation';
            btn.className = 'bg-violet-800 hover:bg-violet-900 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-circle-nodes"></i> Explain Circuit';
            btn.className = 'bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
        }
    }
    drawScene();
}

/**
 * Draws numbered badges ①–④ and dashed flow arrows on the canvas to show:
 *   ① Oxidation at Zn  ② e⁻ through wire  ③ Reduction at Cu  ④ Ionic charge balance via salt bridge
 */
function drawCircuitAnnotations() {
    const cw = canvas.width, ch = canvas.height;
    const fs = cw * 0.021;

    // ─── Helper: filled circle badge ──────────────────────────────────────
    function badge(x, y, label, color) {
        const r = cw * 0.024;
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur  = 5;
        ctx.fillStyle   = color;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth   = 1.5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = '#fff';
        ctx.font        = `bold ${fs}px Arial`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
    }

    // ─── Helper: dashed directional arrow with optional side label ─────────
    function dashedArrow(x1, y1, x2, y2, color, lbl, lblSide) {
        const hs = cw * 0.013;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.strokeStyle = color;
        ctx.lineWidth   = 2.5;
        ctx.lineCap     = 'round';
        ctx.setLineDash([7, 4]);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.setLineDash([]); ctx.lineCap = 'butt';
        // Arrowhead
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - hs * Math.cos(angle - 0.45), y2 - hs * Math.sin(angle - 0.45));
        ctx.lineTo(x2 - hs * Math.cos(angle + 0.45), y2 - hs * Math.sin(angle + 0.45));
        ctx.closePath(); ctx.fill();
        // Side label
        if (lbl) {
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            const off = cw * 0.03;
            ctx.fillStyle    = color;
            ctx.font         = `bold ${fs * 0.85}px Arial`;
            ctx.textBaseline = 'middle';
            if (lblSide === 'right')  { ctx.textAlign = 'left';   ctx.fillText(lbl, mx + off, my); }
            else if (lblSide === 'left')   { ctx.textAlign = 'right';  ctx.fillText(lbl, mx - off, my); }
            else if (lblSide === 'above')  { ctx.textAlign = 'center'; ctx.fillText(lbl, mx, my - off); }
        }
    }

    // ── ① Oxidation badge — above Zn electrode ────────────────────────────
    badge(cw * 0.25, ch * 0.27, '\u2460', '#d97706');

    // ── ② e⁻ arrows along wire + badge above voltmeter ───────────────────
    const eCol = 'rgba(234,179,8,0.92)';
    dashedArrow(cw * 0.27, ch * 0.13, cw * 0.44, ch * 0.13, eCol, null, null);
    dashedArrow(cw * 0.56, ch * 0.13, cw * 0.73, ch * 0.13, eCol, null, null);
    badge(cw * 0.5, ch * 0.055, '\u2461', '#d97706');
    // Electron flow label
    ctx.fillStyle    = eCol;
    ctx.font         = `bold ${fs * 0.78}px Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('e\u207b  (electrical current)', cw * 0.5, ch * 0.10);

    // ── ③ Reduction badge — above Cu electrode ────────────────────────────
    badge(cw * 0.75, ch * 0.27, '\u2462', '#d97706');

    // ── ④ Ionic charge-balance arrows — only drawn when bridge is conductive ─
    if (bridgeConductive()) {
        // K⁺ travels down the right arm of the bridge → into cathode half-cell
        dashedArrow(cw * 0.645, ch * 0.38, cw * 0.645, ch * 0.65, 'rgba(192,132,252,0.9)', 'K\u207a', 'right');
        badge(cw * 0.715, ch * 0.50, '\u2463', '#7c3aed');

        // NO₃⁻ travels down the left arm of the bridge → into anode half-cell
        dashedArrow(cw * 0.355, ch * 0.38, cw * 0.355, ch * 0.65, 'rgba(74,222,128,0.9)', 'NO\u2083\u207b', 'left');
        badge(cw * 0.285, ch * 0.50, '\u2463', '#15803d');
    } else if (saltBridgePresent) {
        // Bridge present but water: show ④ badge with 'no ions' message
        badge(cw * 0.5, ch * 0.50, '\u2463', '#0e7490');
        ctx.fillStyle    = 'rgba(125,211,252,0.95)';
        ctx.font         = `bold ${fs * 0.8}px Arial`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H\u2082O: no mobile ions \u2014 cannot carry charge!', cw * 0.5, ch * 0.56);
    } else {
        // Bridge absent: show ④ badge with a cross to indicate ionic path is broken
        badge(cw * 0.5, ch * 0.50, '\u2463', '#6b7280');
        ctx.fillStyle    = 'rgba(239,68,68,0.85)';
        ctx.font         = `bold ${fs * 0.8}px Arial`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ionic path broken \u2014 circuit incomplete!', cw * 0.5, ch * 0.56);
    }
}

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------

function animate() {
    if (isPlaying) {
        frameCount++;
        const v = getVoltageLevel();

        // Electrons slow down and stop spawning as voltage drops
        if (v > 0.05 && frameCount % 40 === 0) spawnElectron();

        if (bridgeConductive()) {
            if (frameCount % 60 === 0)  spawnCation();
            if (frameCount % 60 === 30) spawnAnion();
            // Recover from any leftover charge imbalance
            if (chargeImbalance > 0) chargeImbalance = Math.max(0, chargeImbalance - 0.8);
        } else {
            // Remove any in-flight bridge particles — ions cannot flow
            particles = particles.filter(p => p.type === 'electron');
            // Build up charge imbalance (~5 seconds to reach 100)
            chargeImbalance = Math.min(100, chargeImbalance + 0.35);
        }
    }

    updateInfoPanel();
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
        btn.className = 'bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
        btn.className = 'bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
    }
}

function toggleSaltBridge() {
    saltBridgePresent = !saltBridgePresent;
    const btn = document.getElementById('btn-salt-bridge');
    if (!btn) return;
    if (saltBridgePresent) {
        btn.innerHTML = '<i class="fa-solid fa-link-slash"></i> Remove Salt Bridge';
        btn.className = 'bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-link"></i> Add Salt Bridge';
        btn.className = 'bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
    }
    updateInfoPanel();
    drawScene();
}

function toggleBridgeFluid() {
    bridgeFluid = bridgeFluid === 'kno3' ? 'water' : 'kno3';
    const btn = document.getElementById('btn-fluid');
    if (!btn) return;
    if (bridgeFluid === 'water') {
        btn.innerHTML = '<i class="fa-solid fa-flask"></i> Use KNO₃ Solution';
        btn.className = 'bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-droplet"></i> Use Distilled Water';
        btn.className = 'bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
    }
    updateInfoPanel();
    drawScene();
}

function resetSimulation() {
    isPlaying = false;
    particles = [];
    frameCount = 0;
    chargeImbalance = 0;
    saltBridgePresent = true;
    bridgeFluid = 'kno3';
    const fluidBtn = document.getElementById('btn-fluid');
    if (fluidBtn) {
        fluidBtn.innerHTML = '<i class="fa-solid fa-droplet"></i> Use Distilled Water';
        fluidBtn.className = 'bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
    }

    const playBtn = document.getElementById('sim-play');
    if (playBtn) {
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
        playBtn.className = 'bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
    }
    const bridgeBtn = document.getElementById('btn-salt-bridge');
    if (bridgeBtn) {
        bridgeBtn.innerHTML = '<i class="fa-solid fa-link-slash"></i> Remove Salt Bridge';
        bridgeBtn.className = 'bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
    }
    updateInfoPanel();
    drawScene();
}


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

