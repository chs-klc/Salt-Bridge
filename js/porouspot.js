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
// Drawing
// ---------------------------------------------------------------------------

function ppDrawScene() {
    if (!ppCanvas || !ppCtx) return;
    const cw = ppCanvas.width, ch = ppCanvas.height;
    const v = ppGetVoltageLevel();

    ppCtx.clearRect(0, 0, cw, ch);

    // --- Big Container ---
    ppCtx.lineWidth = 4;
    ppCtx.strokeStyle = '#94a3b8';
    ppCtx.beginPath();
    ppCtx.moveTo(cw*0.1, ch*0.4); 
    ppCtx.lineTo(cw*0.1, ch*0.9); 
    ppCtx.lineTo(cw*0.9, ch*0.9); 
    ppCtx.lineTo(cw*0.9, ch*0.4); 
    ppCtx.stroke();
    
    // --- Porous Pot line in the middle ---
    ppCtx.setLineDash([10, 10]);
    ppCtx.beginPath(); 
    ppCtx.moveTo(cw*0.5, ch*0.5); 
    ppCtx.lineTo(cw*0.5, ch*0.9); 
    ppCtx.stroke();
    ppCtx.setLineDash([]);
    ppCtx.fillStyle = '#64748b';
    ppCtx.font = '14px sans-serif';
    ppCtx.textAlign = 'center';
    ppCtx.fillText('Porous Pot', cw*0.5, ch*0.45);

    // --- Solutions ---
    // ZnSO4 Side (left)
    ppCtx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ppCtx.fillRect(cw*0.105, ch*0.5, cw*0.395, ch*0.395);
    // CuSO4 side (right)
    ppCtx.fillStyle = 'rgba(59, 130, 246, 0.4)';
    ppCtx.fillRect(cw*0.5, ch*0.5, cw*0.395, ch*0.395);

    // --- Wire & Voltmeter ---
    ppCtx.lineWidth = 3;
    ppCtx.strokeStyle = '#475569';
    ppCtx.beginPath();
    ppCtx.moveTo(cw*0.25, ch*0.5); 
    ppCtx.lineTo(cw*0.25, ch*0.2); 
    ppCtx.lineTo(cw*0.75, ch*0.2); 
    ppCtx.lineTo(cw*0.75, ch*0.5); 
    ppCtx.stroke();

    // Voltmeter circle
    ppCtx.beginPath(); 
    ppCtx.arc(cw*0.5, ch*0.2, ch*0.08, 0, Math.PI*2); 
    ppCtx.fillStyle = '#1e293b'; 
    ppCtx.fill(); 
    ppCtx.stroke();
    
    // Voltage reading
    const volts = (1.10 * v).toFixed(2);
    ppCtx.fillStyle = '#10b981';
    ppCtx.font = 'bold 20px monospace';
    ppCtx.textAlign = 'center';
    ppCtx.textBaseline = 'middle';
    ppCtx.fillText(volts + ' V', cw*0.5, ch*0.2 + 6);

    // --- Electrodes ---
    // Zn (Anode)
    ppCtx.fillStyle = '#94a3b8';
    ppCtx.fillRect(cw*0.22, ch*0.3, cw*0.06, ch*0.4);
    ppCtx.fillStyle = '#fff';
    ppCtx.font = 'bold 16px sans-serif';
    ppCtx.textAlign = 'center';
    ppCtx.textBaseline = 'middle';
    ppCtx.fillText('Zn', cw*0.25, ch*0.35);
    
    // Cu (Cathode)
    ppCtx.fillStyle = '#b45309';
    ppCtx.fillRect(cw*0.72, ch*0.3, cw*0.06, ch*0.4);
    ppCtx.fillStyle = '#fff';
    ppCtx.fillText('Cu', cw*0.75, ch*0.35);

    // --- Particles ---
    ppParticles.forEach(p => {
        if (p.type === 'electron') {
            let px = cw*0.25, py = ch*0.45;
            if (p.progress < 0.3) { 
                py = ch*0.45 - (ch*0.25)*(p.progress/0.3); 
            } else if (p.progress < 0.7) { 
                py = ch*0.2; 
                px = cw*0.25 + (cw*0.5)*((p.progress - 0.3)/0.4); 
            } else { 
                px = cw*0.75; 
                py = ch*0.2 + (ch*0.25)*((p.progress - 0.7)/0.3); 
            }
            ppCtx.beginPath(); 
            ppCtx.arc(px, py, 4, 0, Math.PI*2);
            ppCtx.fillStyle = '#eab308'; 
            ppCtx.fill();
        } else if (p.type === 'cation') {
            // Zn2+ moving left to right through porous pot
            let px = cw*0.4 + (cw*0.2)*p.progress;
            let py = ch*0.7;
            ppCtx.beginPath(); 
            ppCtx.arc(px, py, 6, 0, Math.PI*2);
            ppCtx.fillStyle = '#c084fc'; 
            ppCtx.fill();
            ppCtx.fillStyle = '#fff'; 
            ppCtx.font = 'bold 10px sans-serif'; 
            ppCtx.textAlign = 'center';
            ppCtx.textBaseline = 'middle';
            ppCtx.fillText('+', px, py);
        } else if (p.type === 'anion') {
            // SO42- moving right to left through porous pot
            let px = cw*0.6 - (cw*0.2)*p.progress;
            let py = ch*0.8;
            ppCtx.beginPath(); 
            ppCtx.arc(px, py, 6, 0, Math.PI*2);
            ppCtx.fillStyle = '#4ade80'; 
            ppCtx.fill();
            ppCtx.fillStyle = '#fff'; 
            ppCtx.font = 'bold 10px sans-serif'; 
            ppCtx.textAlign = 'center';
            ppCtx.textBaseline = 'middle';
            ppCtx.fillText('-', px, py);
        }
    });
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

