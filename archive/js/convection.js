// GRID & PHYSICS PARAMETERS
const N    = 64,
      size = N + 2,
      iter = 4;
const diff   = 0.0001,
      visc   = 0.0001,
      buoyancyCoeff = 1.0,
      ambientTemp   = 0.5;

// TIME MANAGEMENT
const physicsDt = 0.02;
const targetPhysicsRate = 60;
let accumulatedTime = 0;
let timeScale = 2.5;
let lastTimestamp = 0;

// FPS TRACKING
let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 0;

// FLUID STATE ARRAYS
let u        = new Float32Array(size*size),
    v        = new Float32Array(size*size),
    u_prev   = new Float32Array(size*size),
    v_prev   = new Float32Array(size*size),
    dens     = new Float32Array(size*size),
    dens_prev= new Float32Array(size*size);
const u0    = new Float32Array(size*size),
      v0    = new Float32Array(size*size),
      dens0 = new Float32Array(size*size);
for (let i = 0; i < dens.length; i++) dens[i] = ambientTemp;
let avg_density = ambientTemp;
let prev_avg_density = ambientTemp;

// UI STATE
let heatRadius = 5,
    heatAmp    = 0.5,
    coolRate   = 0.5,
    heating    = false,
    mX = 0, mY = 0;

// DOM REFS
const canvas      = document.getElementById('canvas');
let ctx           = canvas ? canvas.getContext('2d') : null; // Made let for re-init if needed
const timeSlider  = document.getElementById('timeScale');
const timeVal     = document.getElementById('timeScaleVal');
const radiusSlider= document.getElementById('heatSize');
const radiusVal   = document.getElementById('heatSizeVal');
const heatAmpSlider = document.getElementById('heatAmp');
const ampVal      = document.getElementById('heatAmpVal');
const coolSlider  = document.getElementById('coolRate');
const coolVal     = document.getElementById('coolRateVal');
const fpsDisplay  = document.getElementById('fps');

// Offscreen canvas
let offscreenCanvas = null;
let offscreenCtx = null;
let offscreenImageData = null;

function updateCanvasResolution() {
    if (!canvas) return;
    if (!ctx && canvas) ctx = canvas.getContext('2d'); // Ensure ctx is set
    if (!ctx) return;

    const aspectRatioBox = canvas.parentElement; 
    if (!aspectRatioBox) return;

    const isFullscreen = document.body.classList.contains('sim-fullscreen-active');
    let targetWidth, targetHeight;

    const simStyle = getComputedStyle(aspectRatioBox);
    const simAspectRatioString = simStyle.getPropertyValue('--aspect-ratio').trim();
    let simAspectRatio = 1; // Default
    if (simAspectRatioString) {
        const parts = simAspectRatioString.split('/');
        if (parts.length === 2) {
            simAspectRatio = parseFloat(parts[0]) / parseFloat(parts[1]);
        } else {
            simAspectRatio = parseFloat(simAspectRatioString);
        }
    }
    if (isNaN(simAspectRatio) || simAspectRatio <=0) simAspectRatio = 1;


    if (isFullscreen) {
        const container = aspectRatioBox.parentElement; // .sim-canvas-container
        const viewportWidth = container.clientWidth; 
        const viewportHeight = container.clientHeight;

        if (viewportWidth / viewportHeight > simAspectRatio) {
            targetHeight = viewportHeight;
            targetWidth = targetHeight * simAspectRatio;
        } else {
            targetWidth = viewportWidth;
            targetHeight = targetWidth / simAspectRatio;
        }
        aspectRatioBox.style.width = `${targetWidth}px`;
        aspectRatioBox.style.height = `${targetHeight}px`;
    } else {
        aspectRatioBox.style.width = ''; 
        aspectRatioBox.style.height = '';
        const boxRect = aspectRatioBox.getBoundingClientRect();
        targetWidth = boxRect.width;
        targetHeight = boxRect.height;
    }

    targetWidth = Math.round(targetWidth);
    targetHeight = Math.round(targetHeight);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
    }
}


if (canvas) {
    const bodyObserved = document.body; // Element to observe for class changes

    if (typeof ResizeObserver !== 'undefined') {
        const generalResizeObserver = new ResizeObserver(entries => {
            updateCanvasResolution();
        });
        
        // Observe a stable parent that dictates sim area width in non-fullscreen
        // e.g., .simulation-display-area or its parent .simulation-content-main
        const layoutParent = canvas.closest('.simulation-display-area') || canvas.closest('.simulation-content-main') || document.body;
        generalResizeObserver.observe(layoutParent);
        
        // In fullscreen, .sim-canvas-container becomes the direct resizer
        // This might need dynamic re-observing, but observing body class change is more robust
        
        const fullscreenClassObserver = new MutationObserver((mutationsList) => {
            for(const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateCanvasResolution(); 
                    // No need to change what generalResizeObserver observes if it's high enough
                    break; 
                }
            }
        });
        fullscreenClassObserver.observe(bodyObserved, { attributes: true });
    } else {
        window.addEventListener('resize', updateCanvasResolution);
    }

    window.addEventListener('load', () => {
        setTimeout(updateCanvasResolution, 150); // Increased delay slightly
    });
    if (document.readyState === "complete" || (document.readyState !== "loading" && !document.documentElement.doScroll)) {
        setTimeout(updateCanvasResolution, 100);
    } else {
        document.addEventListener("DOMContentLoaded", () => setTimeout(updateCanvasResolution, 100));
    }
}


if(timeSlider && timeVal) timeSlider.oninput = () => { timeScale = +timeSlider.value; timeVal.textContent = timeScale.toFixed(1); };
if(radiusSlider && radiusVal) radiusSlider.oninput = () => { heatRadius = +radiusSlider.value; radiusVal.textContent = heatRadius; };
if(heatAmpSlider && ampVal) {
    heatAmpSlider.oninput = () => { heatAmp = +heatAmpSlider.value; ampVal.textContent = heatAmp.toFixed(2); };
}
if(coolSlider && coolVal) coolSlider.oninput = () => { coolRate = +coolSlider.value; coolVal.textContent = coolRate.toFixed(2); };


function updatePosition(e) {
  if (!canvas) return;
  const r = canvas.getBoundingClientRect();
  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if (e.clientX !== undefined) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else { return; }
  mX = clientX - r.left;
  mY = clientY - r.top;

  if (r.width > 0 && r.height > 0) { // Avoid division by zero
    mX = mX * (canvas.width / r.width);
    mY = mY * (canvas.height / r.height);
  } else {
    mX = 0; mY = 0;
  }
}

if (canvas) {
    canvas.addEventListener('mousedown', (e) => { heating = true; updatePosition(e); });
    canvas.addEventListener('mouseup', () => heating = false);
    canvas.addEventListener('mouseleave', () => heating = false);
    canvas.addEventListener('mousemove', (e) => { if(heating) updatePosition(e); });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); heating = true; updatePosition(e);
    }, { passive: false });
    canvas.addEventListener('touchend', () => heating = false);
    canvas.addEventListener('touchcancel', () => heating = false);
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault(); if (heating) updatePosition(e);
    }, { passive: false });
}

function IX(i,j){ return i + j*size; }
function setBnd(b, x_arr) {
  for (let i = 1; i <= N; i++) {
    x_arr[IX(0,   i)] = b===1 ? -x_arr[IX(1, i)] : x_arr[IX(1, i)];
    x_arr[IX(N+1, i)] = b===1 ? -x_arr[IX(N, i)] : x_arr[IX(N, i)];
    x_arr[IX(i,   0)] = b===2 ? -x_arr[IX(i, 1)] : x_arr[IX(i, 1)];
    x_arr[IX(i, N+1)] = b===2 ? -x_arr[IX(i, N)] : x_arr[IX(i, N)];
  }
  x_arr[IX(0,   0)]   = 0.5*(x_arr[IX(1,0)]   + x_arr[IX(0,1)]);
  x_arr[IX(0,   N+1)] = 0.5*(x_arr[IX(1,N+1)] + x_arr[IX(0,N)]);
  x_arr[IX(N+1, 0)]   = 0.5*(x_arr[IX(N,0)]   + x_arr[IX(N+1,1)]);
  x_arr[IX(N+1, N+1)] = 0.5*(x_arr[IX(N, N+1)]+ x_arr[IX(N+1,N)]);
}
function linSolve(b, x_arr, x0_arr, a, c) {
  const c_inv = 1.0 / c;
  for (let k = 0; k < iter; k++) {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        x_arr[IX(i,j)] = (x0_arr[IX(i,j)] + a*(
          x_arr[IX(i-1,j)] + x_arr[IX(i+1,j)] +
          x_arr[IX(i, j-1)] + x_arr[IX(i, j+1)]
        )) * c_inv;
      }
    }
    setBnd(b, x_arr);
  }
}
function diffuse(b, x_arr, x0_arr, diff_coeff) {
  const a = physicsDt * diff_coeff * N * N;
  linSolve(b, x_arr, x0_arr, a, 1 + 4*a);
}
function advect(b, d_arr, d0_arr, u_vel, v_vel) {
  const dt0 = physicsDt * N;
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      let x_coord = i - dt0 * u_vel[IX(i,j)];
      let y_coord = j - dt0 * v_vel[IX(i,j)];
      x_coord = Math.max(0.5, Math.min(N + 0.5, x_coord));
      y_coord = Math.max(0.5, Math.min(N + 0.5, y_coord));
      const i0 = Math.floor(x_coord), i1 = i0 + 1;
      const j0 = Math.floor(y_coord), j1 = j0 + 1;
      const s1 = x_coord - i0, s0 = 1 - s1;
      const t1 = y_coord - j0, t0 = 1 - t1;
      d_arr[IX(i,j)] =
        s0*(t0*d0_arr[IX(i0,j0)] + t1*d0_arr[IX(i0,j1)]) +
        s1*(t0*d0_arr[IX(i1,j0)] + t1*d0_arr[IX(i1,j1)]);
    }
  }
  setBnd(b, d_arr);
}
function project(u_vel, v_vel, p_arr, div_arr) {
  const h_inv = 1.0 / N;
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      div_arr[IX(i,j)] = -0.5 * h_inv * (
        u_vel[IX(i+1,j)] - u_vel[IX(i-1,j)] +
        v_vel[IX(i, j+1)] - v_vel[IX(i, j-1)]
      );
      p_arr[IX(i,j)] = 0;
    }
  }
  setBnd(0, div_arr); setBnd(0, p_arr);
  linSolve(0, p_arr, div_arr, 1, 4);
  const N_half = 0.5 * N;
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      u_vel[IX(i,j)] -= N_half * (p_arr[IX(i+1,j)] - p_arr[IX(i-1,j)]);
      v_vel[IX(i,j)] -= N_half * (p_arr[IX(i, j+1)] - p_arr[IX(i, j-1)]);
    }
  }
  setBnd(1, u_vel); setBnd(2, v_vel);
}
function addSource(x_arr, s_arr) {
  for (let i = 0; i < x_arr.length; i++) x_arr[i] += physicsDt * s_arr[i];
}

function renderDensity() {
    if (!ctx) return;
    if (!offscreenCanvas) {
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = N;
        offscreenCanvas.height = N;
        offscreenCtx = offscreenCanvas.getContext('2d');
        if (!offscreenCtx) return;
        offscreenImageData = offscreenCtx.createImageData(N, N);
    }
    if (!offscreenCtx || !offscreenImageData) return;

    const data = offscreenImageData.data;
    for (let y_px = 0; y_px < N; y_px++) {
        for (let x_px = 0; x_px < N; x_px++) {
            const sim_i = x_px + 1; const sim_j = N - y_px;
            const T_val = dens[IX(sim_i, sim_j)];
            const t = Math.max(0, Math.min(1, T_val));
            const hue = (1 - t) * 240; const s_hsl = 1.0; const l_hsl = 0.5;
            const c_hsl = (1 - Math.abs(2 * l_hsl - 1)) * s_hsl;
            const x_hsl_component = c_hsl * (1 - Math.abs((hue / 60) % 2 - 1));
            const m_hsl = l_hsl - c_hsl / 2;
            let r_norm, g_norm, b_norm; const h_prime = hue / 60;
            if (h_prime >= 0 && h_prime < 1) { r_norm = c_hsl; g_norm = x_hsl_component; b_norm = 0; }
            else if (h_prime >= 1 && h_prime < 2) { r_norm = x_hsl_component; g_norm = c_hsl; b_norm = 0; }
            else if (h_prime >= 2 && h_prime < 3) { r_norm = 0; g_norm = c_hsl; b_norm = x_hsl_component; }
            else if (h_prime >= 3 && h_prime < 4) { r_norm = 0; g_norm = x_hsl_component; b_norm = c_hsl; }
            else if (h_prime >= 4 && h_prime < 5) { r_norm = x_hsl_component; g_norm = 0; b_norm = c_hsl; }
            else { r_norm = c_hsl; g_norm = 0; b_norm = x_hsl_component; }
            const R = Math.round((r_norm + m_hsl) * 255);
            const G = Math.round((g_norm + m_hsl) * 255);
            const B = Math.round((b_norm + m_hsl) * 255);
            const index = (y_px * N + x_px) * 4;
            data[index]     = R; data[index + 1] = G; data[index + 2] = B; data[index + 3] = 255;
        }
    }
    offscreenCtx.putImageData(offscreenImageData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreenCanvas, 0, 0, canvas.width, canvas.height);
}
function simulate() {
  u_prev.fill(0); v_prev.fill(0); dens_prev.fill(0);
  if (heating && canvas && canvas.width > 0 && canvas.height > 0) { 
    const simCellW = canvas.width / N; 
    const simCellH = canvas.height / N;
    if (simCellW > 0 && simCellH > 0) { // Avoid division by zero if canvas dimensions are momentarily zero
        const ci = Math.floor(mX / simCellW) + 1; 
        const cj = N - Math.floor(mY / simCellH);

        for (let di = -heatRadius; di <= heatRadius; di++) {
          for (let dj = -heatRadius; dj <= heatRadius; dj++) {
            const ii = ci + di, jj = cj + dj;
            if (ii>=1 && ii<=N && jj>=1 && jj<=N) {
              const d2 = di*di + dj*dj;
              if (d2 <= heatRadius*heatRadius) {
                const w = Math.exp(-d2/(2*heatRadius*heatRadius));
                dens_prev[IX(ii,jj)] += heatAmp * w;
              }
            }
          }
        }
    }
  }
  prev_avg_density = avg_density; avg_density = 0;
  for (let j = 1; j <= N; j++) {
    for (let i = 1; i <= N; i++) {
      const id = IX(i,j);
      avg_density += dens[id];
      const anomaly = dens[id] - prev_avg_density;
      v_prev[id] += buoyancyCoeff * anomaly;
    }
  }
  avg_density /= (N*N);
  addSource(u, u_prev); addSource(v, v_prev);
  u0.set(u); diffuse(1, u, u0, visc);
  v0.set(v); diffuse(2, v, v0, visc);
  project(u, v, u0, v0);
  u0.set(u); v0.set(v);
  advect(1, u, u0, u0, v0);
  advect(2, v, v0, u0, v0);
  project(u, v, u0, v0);
  addSource(dens, dens_prev);
  dens0.set(dens); diffuse(0, dens, dens0, diff);
  dens0.set(dens); advect(0, dens, dens0, u, v);
  for (let k = 0; k < 3; k++) {
    const j_cool = N - k; const gradient = 1/(k+1);
    for (let i = 1; i <= N; i++) {
        const rate = (coolRate/100) * gradient;
        const noise = 1 + (Math.random() - 0.5) * 0.2;
        const idx = IX(i, j_cool);
        dens[idx] *= (1 - rate * noise);
        dens[idx] = Math.max(0, dens[idx]);
    }
  }
  setBnd(0, dens);
}
function updateFPS(timestamp) {
  frameCount++;
  if (timestamp - lastFpsUpdate >= 1000) {
    currentFps = Math.round(frameCount * 1000 / (timestamp - lastFpsUpdate));
    if(fpsDisplay) fpsDisplay.textContent = `FPS: ${currentFps}`;
    frameCount = 0; lastFpsUpdate = timestamp;
  }
}
function step(timestamp) {
  if (!ctx && canvas) ctx = canvas.getContext('2d'); // Try to get context again
  if (!ctx) {
      console.error("Canvas context not available. Halting simulation step.");
      requestAnimationFrame(step); // Keep trying, maybe it initializes later
      return;
  }
  if (!lastTimestamp) {
    lastTimestamp = timestamp; lastFpsUpdate = timestamp;
    requestAnimationFrame(step); return;
  }
  const deltaTime = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;
  const cappedDeltaTime = Math.min(deltaTime, 0.1);
  accumulatedTime += cappedDeltaTime * timeScale;
  const physicsInterval = 1.0 / targetPhysicsRate;
  while (accumulatedTime >= physicsInterval) {
    simulate();
    accumulatedTime -= physicsInterval;
  }

  if (canvas.width > 0 && canvas.height > 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderDensity();
  } else {
    // If canvas size is zero, it might be due to layout still settling.
    // updateCanvasResolution() is likely being called by observers/event listeners.
    // Avoid calling it directly here to prevent potential infinite loops on some resize scenarios.
  }

  updateFPS(timestamp);
  requestAnimationFrame(step);
}

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'f') {
    if(fpsDisplay) fpsDisplay.style.display = fpsDisplay.style.display === 'block' ? 'none' : 'block';
  }
});

if (timeSlider && timeVal) timeVal.textContent = (+timeSlider.value).toFixed(1);
if (radiusSlider && radiusVal) radiusVal.textContent = radiusSlider.value;
if (heatAmpSlider && ampVal) ampVal.textContent = (+heatAmpSlider.value).toFixed(2);
if (coolSlider && coolVal) coolVal.textContent = (+coolSlider.value).toFixed(2);

function startSimulationWhenReady() {
    if (!canvas) {
        console.error("Canvas element not found.");
        return;
    }
    if (!ctx) ctx = canvas.getContext('2d');

    if (ctx) {
        // Ensure canvas is sized correctly before the first step
        // updateCanvasResolution(); // This is now handled by load/DOMContentLoaded listeners
        requestAnimationFrame(step);
    } else {
        console.error("Convection simulation canvas context not found/ready. Aborting simulation start.");
    }
}

if (document.readyState === "complete" || (document.readyState !== "loading" && !document.documentElement.doScroll)) {
    setTimeout(startSimulationWhenReady, 0);
} else {
    document.addEventListener("DOMContentLoaded", startSimulationWhenReady);
}