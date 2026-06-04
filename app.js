/**
 * UI Controller and Render Loop
 */

const physics = new BridgePhysics();

// DOM Elements
const canvas = document.getElementById('bridgeCanvas');
const ctx = canvas.getContext('2d');
const failureOverlay = document.getElementById('failureOverlay');

// Sliders
const slideFreq = document.getElementById('slideForcingFreq');
const slideAmp = document.getElementById('slideForceAmp');
const slideDamping = document.getElementById('slideDamping');
const slideMass = document.getElementById('slideMass');
const slideStiff = document.getElementById('slideStiffness');

// Values
const valFreq = document.getElementById('valForcingFreq');
const valAmp = document.getElementById('valForceAmp');
const valDamping = document.getElementById('valDamping');
const valMass = document.getElementById('valMass');
const valStiff = document.getElementById('valStiffness');

// Stats
const statNatFreq = document.getElementById('statNatFreq');
const statAmp = document.getElementById('statAmp');



// Buttons
const btnToggleSim = document.getElementById('btnToggleSim');
const btnResetSim = document.getElementById('btnResetSim');
const btnToggleDamping = document.getElementById('btnToggleDamping');
const btnToggleWind = document.getElementById('btnToggleWind');
const btnTacoma = document.getElementById('btnTacoma');
const btnSweep = document.getElementById('btnSweep');
const btnResetFailure = document.getElementById('btnResetFailure');

// Sweep
const sweepProgress = document.getElementById('sweepProgress');
const sweepStatus = document.getElementById('sweepStatus');

// State
let isRunning = false;
let isSweeping = false;
let animationId;
let timeData = [];
let ampData = [];
let maxTimeHistory = 200; // frames

// Resize Canvas
function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Charts
Chart.defaults.color = '#cbd5e1';
Chart.defaults.font.family = 'Inter';

const timeChartCtx = document.getElementById('timeChart').getContext('2d');
const timeChart = new Chart(timeChartCtx, {
    type: 'line',
    data: {
        labels: Array(maxTimeHistory).fill(''),
        datasets: [{
            label: 'Displacement (m)',
            data: Array(maxTimeHistory).fill(0),
            borderColor: '#38bdf8',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.2
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
            y: { min: -3, max: 3, grid: { color: '#334155' } },
            x: { display: false, grid: { display: false } }
        },
        plugins: { legend: { display: false } }
    }
});

const freqChartCtx = document.getElementById('freqChart').getContext('2d');
const freqChart = new Chart(freqChartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Max Amplitude (m)',
            data: [],
            borderColor: '#fb923c',
            backgroundColor: 'rgba(251, 146, 60, 0.2)',
            borderWidth: 2,
            fill: true,
            pointRadius: 2
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { min: 0, max: 3, title: { display: true, text: 'Amplitude (m)' }, grid: { color: '#334155' } },
            x: { title: { display: true, text: 'Forcing Frequency (Hz)' }, grid: { color: '#334155' } }
        },
        plugins: { legend: { display: false } }
    }
});

// Update Physics Parameters from UI
function updateParamsFromUI() {
    physics.f_force = parseFloat(slideFreq.value);
    physics.F0 = parseFloat(slideAmp.value);
    physics.c = parseFloat(slideDamping.value);
    physics.m = parseFloat(slideMass.value);
    physics.k = parseFloat(slideStiff.value);

    valFreq.innerText = physics.f_force.toFixed(2);
    valAmp.innerText = physics.F0;
    valDamping.innerText = physics.c;
    valMass.innerText = physics.m;
    valStiff.innerText = physics.k;

    statNatFreq.innerText = physics.getNaturalFrequency().toFixed(2);
}

// Add event listeners to sliders
[slideFreq, slideAmp, slideDamping, slideMass, slideStiff].forEach(slider => {
    slider.addEventListener('input', updateParamsFromUI);
});

// Controls
btnToggleSim.addEventListener('click', () => {
    if (isSweeping) return;
    isRunning = !isRunning;
    btnToggleSim.innerText = isRunning ? 'Stop' : 'Start';
    btnToggleSim.className = isRunning ? 'btn warning' : 'btn primary';
});

btnResetSim.addEventListener('click', resetSimulation);
btnResetFailure.addEventListener('click', resetSimulation);

function resetSimulation() {
    physics.reset();
    timeChart.data.datasets[0].data.fill(0);
    timeChart.update();
    isRunning = false;
    isSweeping = false;
    btnToggleSim.innerText = 'Start';
    btnToggleSim.className = 'btn primary';
    failureOverlay.classList.add('hidden');
    document.body.classList.remove('failure-flash');
    
    // re-enable UI
    enableUI();
    
    // Clear sweep graph
    freqChart.data.labels = [];
    freqChart.data.datasets[0].data = [];
    freqChart.update();
}

btnToggleDamping.addEventListener('click', () => {
    physics.dampingEnabled = !physics.dampingEnabled;
    btnToggleDamping.innerText = physics.dampingEnabled ? 'Toggle Damping' : 'Damping: OFF';
    btnToggleDamping.style.color = physics.dampingEnabled ? '' : 'var(--accent-red)';
    btnToggleDamping.style.borderColor = physics.dampingEnabled ? '' : 'var(--accent-red)';
});

btnToggleWind.addEventListener('click', () => {
    physics.windNoiseEnabled = !physics.windNoiseEnabled;
    btnToggleWind.innerText = physics.windNoiseEnabled ? 'Wind Noise: ON' : 'Wind Noise: OFF';
    btnToggleWind.style.color = physics.windNoiseEnabled ? 'var(--accent-blue)' : '';
    btnToggleWind.style.borderColor = physics.windNoiseEnabled ? 'var(--accent-blue)' : '';
});

btnTacoma.addEventListener('click', () => {
    slideMass.value = 2000;
    slideStiff.value = 20000;
    slideDamping.value = 5; // Very low damping
    slideAmp.value = 800; // High wind forcing
    updateParamsFromUI();
    
    // Set forcing freq right at natural frequency
    let fn = physics.getNaturalFrequency();
    slideFreq.value = fn.toFixed(2);
    updateParamsFromUI();
    
    physics.windNoiseEnabled = true;
    btnToggleWind.innerText = 'Wind Noise: ON';
    btnToggleWind.style.color = 'var(--accent-blue)';
    btnToggleWind.style.borderColor = 'var(--accent-blue)';
    
    physics.reset();
    isRunning = true;
    btnToggleSim.innerText = 'Stop';
    btnToggleSim.className = 'btn warning';
});

// Automated Frequency Sweep
btnSweep.addEventListener('click', () => {
    if (isSweeping) return;
    
    resetSimulation();
    isSweeping = true;
    isRunning = false;
    disableUI();
    
    freqChart.data.labels = [];
    freqChart.data.datasets[0].data = [];
    freqChart.update();
    
    sweepProgress.classList.remove('hidden');
    
    // Sweep parameters
    const startFreq = 0.1;
    const endFreq = 2.0;
    const steps = 40;
    const timePerStep = 3.0; // sim seconds to wait for steady state
    let currentStep = 0;
    
    // We will run the sweep non-realtime (faster) just by stepping physics rapidly
    function runSweepStep() {
        if (!isSweeping) return; // aborted
        
        let freq = startFreq + (endFreq - startFreq) * (currentStep / steps);
        physics.f_force = freq;
        slideFreq.value = freq;
        valFreq.innerText = freq.toFixed(2);
        
        physics.reset();
        
        let maxAmp = 0;
        let dt = 0.016;
        let totalTime = 0;
        
        // Let it run for timePerStep seconds
        while (totalTime < timePerStep) {
            physics.step(dt);
            totalTime += dt;
            if (Math.abs(physics.x) > maxAmp) maxAmp = Math.abs(physics.x);
            if (physics.failed) { maxAmp = physics.criticalAmplitude; break; }
        }
        
        freqChart.data.labels.push(freq.toFixed(2));
        freqChart.data.datasets[0].data.push(maxAmp);
        freqChart.update();
        
        currentStep++;
        sweepStatus.innerText = Math.round((currentStep / steps) * 100) + '%';
        
        if (currentStep <= steps && !physics.failed) {
            setTimeout(runSweepStep, 10); // Small delay to let UI breathe
        } else {
            // Sweep done
            isSweeping = false;
            enableUI();
            sweepProgress.classList.add('hidden');
            if(physics.failed) triggerFailureUI();
        }
    }
    
    runSweepStep();
});

function disableUI() {
    slideFreq.disabled = true; slideAmp.disabled = true; slideDamping.disabled = true;
    slideMass.disabled = true; slideStiff.disabled = true;
    btnToggleSim.disabled = true; btnTacoma.disabled = true; btnSweep.disabled = true;
}

function enableUI() {
    slideFreq.disabled = false; slideAmp.disabled = false; slideDamping.disabled = false;
    slideMass.disabled = false; slideStiff.disabled = false;
    btnToggleSim.disabled = false; btnTacoma.disabled = false; btnSweep.disabled = false;
}

// Drawing function
function drawBridge() {
    const W = canvas.width;
    const H = canvas.height;
    
    ctx.clearRect(0, 0, W, H);
    
    const centerY = H / 2;
    const towerDist = W * 0.6;
    const towerW = 20;
    const towerH = H * 0.8;
    const leftTowerX = (W - towerDist) / 2;
    const rightTowerX = leftTowerX + towerDist;
    
    // Scale displacement visually (1m = 40px)
    const visualScale = 40;
    let deckDisp = physics.x * visualScale;
    
    if (physics.failed) {
        // Draw broken bridge
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        
        // Broken Deck
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(leftTowerX, centerY + 50);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(W, centerY);
        ctx.lineTo(rightTowerX, centerY + 80);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(leftTowerX, centerY + 50);
        ctx.lineTo(W/2, centerY + 200);
        ctx.lineTo(rightTowerX, centerY + 80);
        ctx.stroke();
        
        // Towers
        ctx.fillStyle = '#475569';
        ctx.fillRect(leftTowerX - towerW/2, H - towerH, towerW, towerH);
        ctx.fillRect(rightTowerX - towerW/2, H - towerH, towerW, towerH);
        
        return;
    }

    // Normal Bridge
    // 1. Draw towers
    ctx.fillStyle = '#475569';
    ctx.fillRect(leftTowerX - towerW/2, H - towerH, towerW, towerH);
    ctx.fillRect(rightTowerX - towerW/2, H - towerH, towerW, towerH);
    
    // 2. Draw Main Cable (Parabola)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left anchor to left tower
    ctx.moveTo(0, centerY - 50);
    ctx.lineTo(leftTowerX, H - towerH + 20);
    // Main span parabola
    ctx.quadraticCurveTo(W/2, centerY + deckDisp + 50, rightTowerX, H - towerH + 20);
    // Right tower to right anchor
    ctx.lineTo(W, centerY - 50);
    ctx.stroke();
    
    // 3. Draw suspender cables
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    const numCables = 20;
    const cableSpacing = towerDist / numCables;
    
    for (let i = 1; i < numCables; i++) {
        let cx = leftTowerX + i * cableSpacing;
        
        // Calculate y of parabola at this x
        // Parabola eq: y = a(x-h)^2 + k
        let h = W/2;
        let k_parab = centerY + deckDisp + 50;
        let a = (H - towerH + 20 - k_parab) / Math.pow(leftTowerX - h, 2);
        let cableTopY = a * Math.pow(cx - h, 2) + k_parab;
        
        // interpolate deck height (assume solid deck for now, moving rigidly up and down)
        // A more realistic model would have modes of vibration, but rigid is fine for this demo
        let deckY = centerY + deckDisp;
        
        ctx.beginPath();
        ctx.moveTo(cx, cableTopY);
        ctx.lineTo(cx, deckY);
        ctx.stroke();
    }
    
    // 4. Draw Deck
    ctx.fillStyle = '#f8fafc';
    if (Math.abs(physics.x) > physics.criticalAmplitude * 0.8) {
        // Red hue if close to failing
        ctx.fillStyle = '#fca5a5'; 
    }
    ctx.fillRect(0, centerY + deckDisp - 4, W, 8);
    
    // Highlight Force
    if (physics.F0 > 0) {
        let f_val = physics.getExternalForce(physics.t);
        let arrowLen = (f_val / physics.F0) * 40;
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.7)'; // orange arrow
        ctx.lineWidth = 4;
        
        ctx.beginPath();
        ctx.moveTo(W/2, centerY + deckDisp + 20);
        ctx.lineTo(W/2, centerY + deckDisp + 20 + arrowLen);
        
        // arrowhead
        ctx.lineTo(W/2 - 5, centerY + deckDisp + 20 + arrowLen - Math.sign(arrowLen)*5);
        ctx.moveTo(W/2, centerY + deckDisp + 20 + arrowLen);
        ctx.lineTo(W/2 + 5, centerY + deckDisp + 20 + arrowLen - Math.sign(arrowLen)*5);
        ctx.stroke();
    }
}

function triggerFailureUI() {
    failureOverlay.classList.remove('hidden');
    document.body.classList.add('failure-flash');
    isRunning = false;
    btnToggleSim.innerText = 'Start';
    btnToggleSim.className = 'btn primary';
    drawBridge(); // draw broken state
}

// Render Loop
let lastTime = 0;
function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000; // in seconds
    lastTime = timestamp;
    
    // Cap dt to prevent instability if tab is inactive
    if (dt > 0.1) dt = 0.016; 
    
    if (isRunning && !isSweeping && !physics.failed) {
        // Multiple physics steps per frame for accuracy/stability
        let steps = 4;
        let sub_dt = dt / steps;
        for(let i=0; i<steps; i++) {
            physics.step(sub_dt);
        }
        
        if (physics.failed) {
            triggerFailureUI();
        }
    }
    
    if (!isSweeping) {
        drawBridge();
    }

    // Update UI Stats
    statAmp.innerText = Math.abs(physics.x).toFixed(3);

    
    // Update Time Chart
    if (isRunning && !isSweeping) {
        let arr = timeChart.data.datasets[0].data;
        arr.push(physics.x);
        arr.shift();
        timeChart.update();
    }

    requestAnimationFrame(loop);
}

// Init
updateParamsFromUI();
requestAnimationFrame(loop);
