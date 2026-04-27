/**
 * porouspot.js
 * Porous Pot simulation for the simple chemical cell.
 */

let ppCanvas, ppCtx;
let ppAnimationId = null;
let ppIsPlaying = false;
let ppSimInitialised = false;
let ppParticles = [];

function initPorousPotSim() {
    if (ppSimInitialised) return;
    ppCanvas = document.getElementById("ppChemCanvas");
    if (!ppCanvas) return;
    ppCtx = ppCanvas.getContext("2d");
    resizePorousPotCanvas();
    window.addEventListener("resize", resizePorousPotCanvas);
    spawnPPParticles();
    ppLoop();
    ppSimInitialised = true;
}

function resizePorousPotCanvas() {
    if (!ppCanvas) return;
    var container = document.getElementById("pp-sim-container");
    if (container && container.clientWidth > 0) {
        ppCanvas.width  = container.clientWidth;
        ppCanvas.height = Math.round(container.clientWidth * 0.5625);
    } else {
        ppCanvas.width  = 800;
        ppCanvas.height = 450;
    }
}

function spawnPPParticles() {
    ppParticles = [];
    for (var i = 0; i < 3; i++) ppParticles.push({ type:"electron", progress: i/3, speed: 0.004 + Math.random()*0.002 });
    for (var i = 0; i < 3; i++) ppParticles.push({ type:"cation",   progress: i/3, speed: 0.002 + Math.random()*0.001 });
    for (var i = 0; i < 3; i++) ppParticles.push({ type:"anion",    progress: i/3, speed: 0.002 + Math.random()*0.001 });
}

function ppLoop() {
    if (ppIsPlaying) {
        ppParticles.forEach(function(p) {
            p.progress += p.speed;
            if (p.progress >= 1) p.progress -= 1;
        });
    }
    ppDraw();
    ppAnimationId = requestAnimationFrame(ppLoop);
}

function ppDraw() {
    if (!ppCanvas || !ppCtx) return;
    var W = ppCanvas.width, H = ppCanvas.height, ctx = ppCtx;

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0,0,W,H);

    var cxl=W*0.08, cxr=W*0.92, cxt=H*0.38, cxb=H*0.92;

    // Container walls
    ctx.lineWidth=3; ctx.strokeStyle="#94a3b8";
    ctx.beginPath(); ctx.moveTo(cxl,cxt); ctx.lineTo(cxl,cxb); ctx.lineTo(cxr,cxb); ctx.lineTo(cxr,cxt); ctx.stroke();

    // Solutions
    ctx.fillStyle="rgba(56,189,248,0.18)"; ctx.fillRect(cxl+3, cxt+H*0.12, W*0.42-6, cxb-cxt-H*0.12-3);
    ctx.fillStyle="rgba(59,130,246,0.35)"; ctx.fillRect(W*0.5, cxt+H*0.12, W*0.42-3, cxb-cxt-H*0.12-3);

    // Porous pot divider
    ctx.setLineDash([8,8]); ctx.lineWidth=2; ctx.strokeStyle="#f59e0b";
    ctx.beginPath(); ctx.moveTo(W*0.5, cxt+H*0.10); ctx.lineTo(W*0.5, cxb-3); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle="#fbbf24"; ctx.font="bold "+Math.round(W*0.022)+"px sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("Porous Pot", W*0.5, cxt+H*0.07);

    // Electrodes
    var eW=W*0.05, eH=H*0.42, eTop=cxt+H*0.03;
    ctx.fillStyle="#94a3b8"; ctx.fillRect(W*0.26-eW/2, eTop, eW, eH);
    ctx.fillStyle="#f8fafc"; ctx.font="bold "+Math.round(W*0.028)+"px sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("Zn", W*0.26, eTop+eH*0.15);
    ctx.fillStyle="#b45309"; ctx.fillRect(W*0.74-eW/2, eTop, eW, eH);
    ctx.fillStyle="#fef3c7"; ctx.fillText("Cu", W*0.74, eTop+eH*0.15);

    // Wire
    var wireY=H*0.12;
    ctx.lineWidth=3; ctx.strokeStyle="#cbd5e1";
    ctx.beginPath(); ctx.moveTo(W*0.26,eTop); ctx.lineTo(W*0.26,wireY); ctx.lineTo(W*0.74,wireY); ctx.lineTo(W*0.74,eTop); ctx.stroke();

    // Voltmeter
    var vmR=Math.min(W,H)*0.07;
    ctx.beginPath(); ctx.arc(W*0.5, wireY, vmR, 0, Math.PI*2);
    ctx.fillStyle="#1e293b"; ctx.fill();
    ctx.lineWidth=2; ctx.strokeStyle="#475569"; ctx.stroke();
    ctx.fillStyle= ppIsPlaying ? "#10b981" : "#64748b";
    ctx.font="bold "+Math.round(W*0.025)+"px monospace";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(ppIsPlaying?"1.10 V":"0.00 V", W*0.5, wireY);

    // Labels
    ctx.font=Math.round(W*0.022)+"px sans-serif"; ctx.fillStyle="#94a3b8";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("ZnSO\u2084(aq)", W*0.29, cxb-H*0.05);
    ctx.fillText("CuSO\u2084(aq)", W*0.71, cxb-H*0.05);
    ctx.font="italic "+Math.round(W*0.018)+"px sans-serif";
    ctx.fillStyle="#fca5a5"; ctx.fillText("Zn \u2192 Zn\u00B2\u207A + 2e\u207B  (oxidation)", W*0.29, H*0.96);
    ctx.fillStyle="#86efac"; ctx.fillText("Cu\u00B2\u207A + 2e\u207B \u2192 Cu  (reduction)", W*0.71, H*0.96);

    // Particles (only when playing)
    if (!ppIsPlaying) return;
    ppParticles.forEach(function(p) {
        var px, py;
        if (p.type==="electron") {
            var t=p.progress;
            if (t<0.25)       { px=W*0.26; py=eTop-(t/0.25)*(eTop-wireY); }
            else if (t<0.75)  { px=W*0.26+((t-0.25)/0.5)*(W*0.48); py=wireY; }
            else               { px=W*0.74; py=wireY+((t-0.75)/0.25)*(eTop-wireY); }
            ctx.beginPath(); ctx.arc(px,py,W*0.012,0,Math.PI*2);
            ctx.fillStyle="#eab308"; ctx.fill();
            ctx.fillStyle="#000"; ctx.font="bold "+Math.round(W*0.016)+"px sans-serif";
            ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("e\u207B",px,py);
        } else if (p.type==="cation") {
            px=W*0.35+p.progress*W*0.30; py=H*0.68;
            ctx.beginPath(); ctx.arc(px,py,W*0.016,0,Math.PI*2);
            ctx.fillStyle="#c084fc"; ctx.fill();
            ctx.fillStyle="#fff"; ctx.font="bold "+Math.round(W*0.015)+"px sans-serif";
            ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("Zn\u00B2\u207A",px,py);
        } else {
            px=W*0.65-p.progress*W*0.30; py=H*0.79;
            ctx.beginPath(); ctx.arc(px,py,W*0.016,0,Math.PI*2);
            ctx.fillStyle="#4ade80"; ctx.fill();
            ctx.fillStyle="#000"; ctx.font="bold "+Math.round(W*0.014)+"px sans-serif";
            ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("SO\u2084\u00B2\u207B",px,py);
        }
    });
}

function togglePPSimulation() {
    ppIsPlaying = !ppIsPlaying;
    var btn = document.getElementById("pp-sim-play");
    if (btn) {
        if (ppIsPlaying) {
            btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
            btn.className = "bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2";
        } else {
            btn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
            btn.className = "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2";
        }
    }
    ppUpdateInfoPanel();
}

function resetPPSimulation() {
    ppIsPlaying = false;
    var btn = document.getElementById("pp-sim-play");
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Play';
        btn.className = "bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow font-semibold flex items-center gap-2";
    }
    spawnPPParticles();
    ppUpdateInfoPanel();
    ppDraw();
}

function ppUpdateInfoPanel() {
    var panel = document.getElementById("pp-consequence-panel");
    if (!panel) return;
    if (!ppIsPlaying) {
        panel.className = "mt-4 p-4 rounded-xl border text-sm font-medium bg-slate-100 border-slate-200 text-slate-600";
        panel.innerHTML = "<i class=\"fa-solid fa-circle-info mr-2\"></i>Press <strong>Play</strong> to start observing the Porous Pot mechanism!";
    } else {
        panel.className = "mt-4 p-4 rounded-xl border text-sm font-medium bg-emerald-100 border-emerald-300 text-emerald-800";
        panel.innerHTML = "<i class=\"fa-solid fa-bolt mr-2\"></i><strong>Cell is running!</strong> ¡X Zn oxidises, releasing Zn\u00B2\u207A ions. Electrons travel through the external wire to reduce Cu\u00B2\u207A at the cathode. Ions migrate through the <strong>porous pot</strong> to maintain charge balance.";
    }
}
