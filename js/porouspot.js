/**
 * simulation.js
 * Handles the 2D Canvas animation of the Zinc-Copper galvanic cell.
 * Supports interactive salt bridge toggle to demonstrate charge buildup consequences.
 */

let ppCanvas, ppCtx;
let ppAnimationId;
let ppIsPlaying = false;
let ppParticles = [];
let frameCount = 0;
let ppSimInitialised = false;

// --- Salt bridge & charge imbalance state ---
let ppSaltBridgePresent = true;
let ppChargeImbalance = 0; // 0–100: how much charge has built up due to missing bridge
let ppShowCircuitExplain = false;  // toggle for ionic circuit explanation overlay
let ppBridgeFluid = 'kno3';        // 'kno3' | 'water' — what fills the salt bridge

// Fixed ppCanvas-fraction positions for charge accumulation symbols inside each beaker.
// Anode beaker (x: 10%–40%), avoiding electrode (x: 22%–28%).
const PP_ANODE_CHARGE_POS = [
    [0.135, 0.60], [0.350, 0.67], [0.160, 0.78],
    [0.370, 0.82], [0.130, 0.87], [0.320, 0.55], [0.175, 0.53]
];
// Cathode beaker (x: 60%–90%), avoiding electrode (x: 72%–78%).
const PP_CATHODE_CHARGE_POS = [
    [0.635, 0.60], [0.850, 0.67], [0.660, 0.78],
    [0.870, 0.82], [0.630, 0.87], [0.820, 0.55], [0.675, 0.53]
];

/** Returns the current effective voltage level: 1 = full, 0 = dead. */
function ppGetVoltageLevel() {
    return Math.max(0, 1 - ppChargeImbalance / 100);
}

/** True when the bridge can actually carry ions (present AND filled with KNO₃). */
function ppBridgeConductive() {
    return ppSaltBridgePresent && ppBridgeFluid === 'kno3';
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

function initPorousPotSim() {
    if (ppSimInitialised) return;
    ppCanvas = document.getElementById('ppChemCanvas');
    if (!ppCanvas) return;
    ppCtx = ppCanvas.getContext('2d');
    window.addEventListener('resize', resizePorousPotCanvas);
    resizePorousPotCanvas();
    ppAnimate();
    ppSimInitialised = true;
}

// ---------------------------------------------------------------------------
// Canvas sizing
// ---------------------------------------------------------------------------

function resizePorousPotCanvas() {
    if (!ppCanvas) return;
    const container = document.getElementById('pp-sim-container');
    if (container && container.clientWidth > 0) {
        ppCanvas.width = container.clientWidth;
        ppCanvas.height = ppCanvas.width * 0.5625; // 16:9
    } else {
        ppCanvas.width = 800;
        ppCanvas.height = 450;
    }
}

    ppDrawScene();
}

// ---------------------------------------------------------------------------
// Particle spawning
// ---------------------------------------------------------------------------

function ppDrawScene() {
    if (!ppCanvas || !ppCtx) return;
    const cw = ppCanvas.width, ch = ppCanvas.height;
    const v = ppGetVoltageLevel();

    ppCtx.clearRect(0, 0, cw, ch);

    // --- Beakers ---
    ppCtx.lineWidth = 4;
    ppCtx.strokeStyle = '#94a3b8';
    ppCtx.beginPath(); ppCtx.moveTo(cw*0.1,ch*0.4); ppCtx.lineTo(cw*0.1,ch*0.9); ppCtx.lineTo(cw*0.4,ch*0.9); ppCtx.lineTo(cw*0.4,ch*0.4); ppCtx.stroke();
    ppCtx.beginPath(); ppCtx.moveTo(cw*0.6,ch*0.4); ppCtx.lineTo(cw*0.6,ch*0.9); ppCtx.lineTo(cw*0.9,ch*0.9); ppCtx.lineTo(cw*0.9,ch*0.4); ppCtx.stroke();

    // --- Solutions ---
    ppCtx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ppCtx.fillRect(cw*0.105, ch*0.5, cw*0.29, ch*0.395);
    ppCtx.fillStyle = 'rgba(59, 130, 246, 0.4)';
    ppCtx.fillRect(cw*0.605, ch*0.5, cw*0.29, ch*0.395);

    // --- Charge tint: anode turns redder, cathode turns deeper blue as imbalance grows ---
    if (ppChargeImbalance > 10) {
        const t = Math.min(1, (ppChargeImbalance - 10) / 70) * 0.30;
        ppCtx.fillStyle = `rgba(239, 68, 68, ${t})`;
        ppCtx.fillRect(cw*0.105, ch*0.5, cw*0.29, ch*0.395);
        ppCtx.fillStyle = `rgba(30, 58, 138, ${t})`;
        ppCtx.fillRect(cw*0.605, ch*0.5, cw*0.29, ch*0.395);
    }

    // --- Electrodes ---
    ppCtx.fillStyle = '#64748b'; // Zinc (grey)
    ppCtx.fillRect(cw*0.22, ch*0.3, cw*0.06, ch*0.45);
    ppCtx.fillStyle = '#b45309'; // Copper (amber)
    ppCtx.fillRect(cw*0.72, ch*0.3, cw*0.06, ch*0.45);

    // --- Wires ---
    ppCtx.lineWidth = 3;
    ppCtx.strokeStyle = '#cbd5e1';
    ppCtx.beginPath(); ppCtx.moveTo(cw*0.25,ch*0.3); ppCtx.lineTo(cw*0.25,ch*0.15); ppCtx.lineTo(cw*0.45,ch*0.15); ppCtx.stroke();
    ppCtx.beginPath(); ppCtx.moveTo(cw*0.55,ch*0.15); ppCtx.lineTo(cw*0.75,ch*0.15); ppCtx.lineTo(cw*0.75,ch*0.3); ppCtx.stroke();

    // --- Voltmeter body ---
    ppCtx.fillStyle = '#334155';
    ppCtx.strokeStyle = '#475569';
    ppCtx.lineWidth = 1;
    ppCtx.beginPath(); ppCtx.arc(cw*0.5, ch*0.15, cw*0.05, 0, Math.PI*2); ppCtx.fill(); ppCtx.stroke();
    ppCtx.fillStyle = '#f8fafc';
    ppCtx.font = `bold ${cw*0.04}px Arial`;
    ppCtx.textAlign = 'center'; ppCtx.textBaseline = 'middle';
    ppCtx.fillText('V', cw*0.5, ch*0.15);

    // Voltmeter needle: interpolates between center (0V) and full deflection based on v
    const vDisplay = ppIsPlaying ? v : 0;
    ppCtx.strokeStyle = '#ef4444';
    ppCtx.lineWidth = 2;
    ppCtx.beginPath();
    ppCtx.moveTo(cw*0.5, ch*0.18);
    ppCtx.lineTo(cw*(0.5 + 0.03*vDisplay), ch*(0.11 + 0.01*vDisplay));
    ppCtx.stroke();

    // --- Voltmeter digital LCD readout (below voltmeter circle) ---
    const voltReading = (1.10 * vDisplay).toFixed(2); // Zn/Cu cell ≈ 1.10 V max
    const lcdW = cw * 0.10, lcdH = ch * 0.065;
    const lcdX = cw * 0.5 - lcdW / 2, lcdY = ch * 0.205;
    // LCD background
    ppCtx.fillStyle = '#0f1a0f';
    ppCtx.strokeStyle = vDisplay > 0.05 ? '#4ade80' : '#374151';
    ppCtx.lineWidth = 1.5;
    ppCtx.beginPath();
    ppCtx.roundRect(lcdX, lcdY, lcdW, lcdH, 4);
    ppCtx.fill(); ppCtx.stroke();
    // LCD digits
    ppCtx.fillStyle = vDisplay > 0.05 ? '#4ade80' : '#1f2d1f';
    ppCtx.font = `bold ${cw * 0.028}px 'Courier New', monospace`;
    ppCtx.textAlign = 'center'; ppCtx.textBaseline = 'middle';
    ppCtx.fillText(`${voltReading} V`, cw * 0.5, lcdY + lcdH * 0.5);

    // --- Salt Bridge ---
    if (ppSaltBridgePresent) {
        // Fill colour: KNO₃ = translucent white, water = light blue
        const bridgeFill = ppBridgeFluid === 'kno3'
            ? 'rgba(248, 250, 252, 0.3)'
            : 'rgba(125, 211, 252, 0.35)';
        ppCtx.lineWidth = 20;
        ppCtx.strokeStyle = bridgeFill;
        ppCtx.lineCap = 'round'; ppCtx.lineJoin = 'round';
        ppCtx.beginPath();
        ppCtx.moveTo(cw*0.35,ch*0.7); ppCtx.lineTo(cw*0.35,ch*0.35);
        ppCtx.lineTo(cw*0.65,ch*0.35); ppCtx.lineTo(cw*0.65,ch*0.7);
        ppCtx.stroke();
        // Outline colour: KNO₃ = grey, water = cyan
        const bridgeOutline = ppBridgeFluid === 'kno3' ? '#94a3b8' : '#22d3ee';
        ppCtx.lineWidth = 2; ppCtx.strokeStyle = bridgeOutline; ppCtx.lineCap = 'butt';
        ppCtx.beginPath(); ppCtx.moveTo(cw*0.33,ch*0.7); ppCtx.lineTo(cw*0.33,ch*0.33); ppCtx.lineTo(cw*0.67,ch*0.33); ppCtx.lineTo(cw*0.67,ch*0.7); ppCtx.stroke();
        ppCtx.beginPath(); ppCtx.moveTo(cw*0.37,ch*0.7); ppCtx.lineTo(cw*0.37,ch*0.37); ppCtx.lineTo(cw*0.63,ch*0.37); ppCtx.lineTo(cw*0.63,ch*0.7); ppCtx.stroke();
    } else {
        // Removed: dashed red outline + red ✕ in the gap
        ppCtx.setLineDash([6, 4]);
        ppCtx.lineWidth = 2; ppCtx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ppCtx.beginPath(); ppCtx.moveTo(cw*0.33,ch*0.7); ppCtx.lineTo(cw*0.33,ch*0.33); ppCtx.lineTo(cw*0.67,ch*0.33); ppCtx.lineTo(cw*0.67,ch*0.7); ppCtx.stroke();
        ppCtx.setLineDash([]);
        const mx = cw*0.5, my = ch*0.35, s = cw*0.03;
        ppCtx.strokeStyle = '#ef4444'; ppCtx.lineWidth = 3;
        ppCtx.beginPath(); ppCtx.moveTo(mx-s,my-s); ppCtx.lineTo(mx+s,my+s); ppCtx.stroke();
        ppCtx.beginPath(); ppCtx.moveTo(mx+s,my-s); ppCtx.lineTo(mx-s,my+s); ppCtx.stroke();
    }

    // --- Charge accumulation symbols ---
    if (ppChargeImbalance > 0) {
        const numSymbols = Math.min(7, Math.floor(ppChargeImbalance / 14));
        const alpha = Math.min(1, ppChargeImbalance / 20);
        ppCtx.textAlign = 'center'; ppCtx.textBaseline = 'middle';

        for (let i = 0; i < numSymbols; i++) {
            // Anode: excess positive charge (red circles with +)
            const ax = cw * PP_ANODE_CHARGE_POS[i][0];
            const ay = ch * PP_ANODE_CHARGE_POS[i][1];
            ppCtx.fillStyle = `rgba(252, 165, 165, ${alpha})`;
            ppCtx.beginPath(); ppCtx.arc(ax, ay, cw*0.02, 0, Math.PI*2); ppCtx.fill();
            ppCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ppCtx.font = `bold ${cw*0.02}px Arial`;
            ppCtx.fillText('+', ax, ay);

            // Cathode: excess negative charge (blue circles with −)
            const kx = cw * PP_CATHODE_CHARGE_POS[i][0];
            const ky = ch * PP_CATHODE_CHARGE_POS[i][1];
            ppCtx.fillStyle = `rgba(147, 197, 253, ${alpha})`;
            ppCtx.beginPath(); ppCtx.arc(kx, ky, cw*0.02, 0, Math.PI*2); ppCtx.fill();
            ppCtx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ppCtx.font = `bold ${cw*0.02}px Arial`;
            ppCtx.fillText('−', kx, ky);
        }
    }

    // --- Labels ---
    ppCtx.font = `${cw*0.03}px Arial`;
    ppCtx.textAlign = 'center'; ppCtx.textBaseline = 'middle';
    ppCtx.fillStyle = '#f8fafc';
    ppCtx.fillText('Zinc Anode (−)',    cw*0.25, ch*0.85);
    ppCtx.fillText('Zn²⁺(aq)',         cw*0.25, ch*0.60);
    ppCtx.fillStyle = '#fca5a5';
    ppCtx.fillText('Oxidation',        cw*0.25, ch*0.95);

    ppCtx.fillStyle = '#f8fafc';
    ppCtx.fillText('Copper Cathode (+)', cw*0.75, ch*0.85);
    ppCtx.fillText('Cu²⁺(aq)',           cw*0.75, ch*0.60);
    ppCtx.fillStyle = '#86efac';
    ppCtx.fillText('Reduction',          cw*0.75, ch*0.95);

    if (ppSaltBridgePresent) {
        if (ppBridgeFluid === 'kno3') {
            ppCtx.fillStyle = '#e2e8f0';
            ppCtx.font = `italic ${cw*0.025}px Arial`;
            ppCtx.fillText('Salt Bridge (KNO₃)', cw*0.5, ch*0.28);
        } else {
            ppCtx.fillStyle = '#7dd3fc';
            ppCtx.font = `bold ${cw*0.025}px Arial`;
            ppCtx.fillText('Bridge: Distilled H₂O ✗', cw*0.5, ch*0.28);
        }
    } else {
        ppCtx.fillStyle = '#fca5a5';
        ppCtx.font = `bold ${cw*0.025}px Arial`;
        ppCtx.fillText('No Salt Bridge!', cw*0.5, ch*0.28);
    }

    ppCtx.font = `${cw*0.025}px Arial`;
    ppCtx.fillStyle = 'rgba(255,255,255,0.5)';
    ppCtx.fillText('Zn → Zn²⁺ + 2e⁻', cw*0.25, ch*0.25);
    ppCtx.fillText('Cu²⁺ + 2e⁻ → Cu', cw*0.75, ch*0.25);

    // --- Particles ---
    ppParticles.forEach(p => {
        let px, py;
        const cw = ppCanvas.width, ch = ppCanvas.height;

        if (p.type === 'electron') {
            if (p.progress < 0.2) {
                px = cw*0.25; py = ch*0.45 - (p.progress/0.2)*(ch*0.3);
            } else if (p.progress < 0.8) {
                px = cw*0.25 + ((p.progress-0.2)/0.6)*(cw*0.5); py = ch*0.15;
            } else {
                px = cw*0.75; py = ch*0.15 + ((p.progress-0.8)/0.2)*(ch*0.3);
            }
            ppCtx.fillStyle = '#eab308';
            ppCtx.beginPath(); ppCtx.arc(px, py, cw*0.015, 0, Math.PI*2); ppCtx.fill();
            ppCtx.fillStyle = '#000';
            ppCtx.font = `bold ${cw*0.02}px Arial`;
            ppCtx.textAlign = 'center'; ppCtx.textBaseline = 'middle';
            ppCtx.fillText('e⁻', px, py);

        } else if (p.type === 'cation') {
            if (p.progress < 0.5) {
                px = cw*0.5 + (p.progress/0.5)*(cw*0.15); py = ch*0.35;
            } else {
                px = cw*0.65; py = ch*0.35 + ((p.progress-0.5)/0.5)*(ch*0.35);
            }
            ppCtx.fillStyle = '#c084fc';
            ppCtx.beginPath(); ppCtx.arc(px, py, cw*0.02, 0, Math.PI*2); ppCtx.fill();
            ppCtx.fillStyle = '#fff';
            ppCtx.font = `bold ${cw*0.02}px Arial`;
            ppCtx.textAlign = 'center'; ppCtx.textBaseline = 'middle';
            ppCtx.fillText('K⁺', px, py);

        } else if (p.type === 'anion') {
            if (p.progress < 0.5) {
                px = cw*0.5 - (p.progress/0.5)*(cw*0.15); py = ch*0.35;
            } else {
                px = cw*0.35; py = ch*0.35 + ((p.progress-0.5)/0.5)*(ch*0.35);
            }
            ppCtx.fillStyle = '#4ade80';
            ppCtx.beginPath(); ppCtx.arc(px, py, cw*0.02, 0, Math.PI*2); ppCtx.fill();
            ppCtx.fillStyle = '#000';
            ppCtx.font = `bold ${cw*0.018}px Arial`;
            ppCtx.textAlign = 'center'; ppCtx.textBaseline = 'middle';
            ppCtx.fillText('NO₃⁻', px, py);
        }

        if (ppIsPlaying) p.progress += p.speed;
    });

    ppParticles = ppParticles.filter(p => p.progress <= 1);

    // --- Circuit explanation overlay (drawn last, on top of everything) ---
    if (ppShowCircuitExplain) drawCircuitAnnotations();
}

// ---------------------------------------------------------------------------
// Info / consequence panel
// ---------------------------------------------------------------------------

function ppUpdateInfoPanel() {
    const panel = document.getElementById('pp-consequence-panel');
    if (!panel) return;
    const v = ppGetVoltageLevel();
    const vPct = Math.round(v * 100);
    
    if (!ppIsPlaying) {
        panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-slate-100 border-slate-200 text-slate-600';
        panel.innerHTML = '<i class="fa-solid fa-circle-info mr-2"></i>Press <strong>Play</strong> to start observing the Porous Pot mechanism!';
    } else {
        panel.className = 'mt-4 p-4 rounded-xl border text-sm font-medium bg-emerald-100 border-emerald-300 text-emerald-800';
        panel.innerHTML = '<i class="fa-solid fa-check-circle mr-2"></i><strong>Running!</strong> The porous boundary allows zinc and sulfate ions to migrate between half-cells, maintaining electrical neutrality and ensuring continuous electron flow.';
    }
}

function ppToggleCircuitExplain() {}
function drawCircuitAnnotations() {}
function ppAnimate() {
    ppAnimationId = requestAnimationFrame(ppAnimate);
    
    if (ppIsPlaying) {
        const v = ppGetVoltageLevel();
        if(v > 0) {
            ppParticles.forEach(p => {
                p.progress += p.speed;
                if (p.progress >= 1.0) p.progress -= 1.0;
            });
            
            if(ppParticles.length === 0) {
                for(let i=0; i<3; i++) ppParticles.push({ type: 'electron', progress: i * 0.33, speed: 0.005 });
                for(let i=0; i<2; i++) ppParticles.push({ type: 'cation', progress: i * 0.5, speed: 0.002 });
                for(let i=0; i<2; i++) ppParticles.push({ type: 'anion', progress: i * 0.5, speed: 0.002 });
            }
        }
    }
    
    ppDrawScene();
}

function togglePPSimulation() {
    const btn = document.getElementById('pp-sim-play');
    ppIsPlaying = !ppIsPlaying;
    if (btn) {
        if (ppIsPlaying) {
            btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
            btn.className = 'bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
        } else {
            btn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
            btn.className = 'bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
        }
    }
    if (ppIsPlaying) {
        cancelAnimationFrame(ppAnimationId);
        ppAnimate();
    } else {
        ppUpdateInfoPanel();
    }
}

function resetPPSimulation() {
    ppIsPlaying = false;
    ppParticles = [];
    frameCount = 0;
    ppChargeImbalance = 0;
    const playBtn = document.getElementById('pp-sim-play');
    if (playBtn) {
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
        playBtn.className = 'bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2';
    }
    cancelAnimationFrame(ppAnimationId);
    ppUpdateInfoPanel();
    ppDrawScene();
}


/**
 * Called once when the simulation tab is first opened.
 * Grabs the ppCanvas element and starts the render loop.
 */
function initPorousPotSim() {
    if (ppSimInitialised) return;

    ppCanvas = document.getElementById('ppChemCanvas');
    if (!ppCanvas) return;
    ppCtx = ppCanvas.getContext('2d');

    window.addEventListener('resize', resizePorousPotCanvas);
    resizePorousPotCanvas();
    ppAnimate();
    ppSimInitialised = true;
}

