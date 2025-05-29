// Original script from conduction.html, adapted for the new page structure

// DOM REFS - Updated to match new HTML structure
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const timeSlider = document.getElementById('timeScale');
const timeVal = document.getElementById('timeScaleVal');
const radiusSlider = document.getElementById('heatSize'); // Renamed from sizeSlider
const radiusVal = document.getElementById('heatSizeVal'); // Renamed from sizeVal
const heatAmpSlider = document.getElementById('heatAmp'); // Renamed from ampSlider
const ampVal = document.getElementById('heatAmpVal');
const energyVal = document.getElementById('energyVal');
// const fpsDisplay  = document.getElementById('fpsDisplay'); // Kept for reference, but not used by this core script

// Initial simulation parameters from HTML (if elements exist)
let timeScale = timeSlider ? parseFloat(timeSlider.value) : 25;
let heatRadius = radiusSlider ? parseFloat(radiusSlider.value) : 50; // Original was 30, using HTML default
let heatAmp = heatAmpSlider ? parseFloat(heatAmpSlider.value) : 1;

// Particle and Grid Setup (largely from original script)
const cols = 20, rows = 10; // Fixed grid size for now
let spacing = 30; // Default spacing, will be updated
let diag = spacing * Math.SQRT2; // Will be updated with spacing
let canvasWidth = 800, canvasHeight = 400; // Default, will be updated

// Physics constants
const baseDt = 0.005;     // Base physics timestep for one sub-step
const kN = 0.2, kR = 0.5; // Spring constant, Restoring force constant
const colorSmooth = 0.97; // Smoothing factor for particle color based on amplitude

// Frame-rate independent timing
let lastTimestamp = 0; // Already present, ensure it's used correctly
let physicsStepAccumulator = 0.0;
const REFERENCE_UPDATES_PER_SECOND = 60.0;

// Particle class
class Particle {
    constructor(x0, y0) {
        this.x0 = x0; this.y0 = y0; // Initial rest position
        this.x = x0; this.y = y0;   // Current position
        this.vx = 0; this.vy = 0;   // Velocity
        this.smAmp = 0;             // Smoothed amplitude for color
        this.neighbors = []; // Stores { index: neighbor_index, rest: rest_length }
    }
    addNeighbor(neighbor_index, rest) { this.neighbors.push({ index: neighbor_index, rest }); }
    computeAmp() {
        const dx = this.x - this.x0, dy = this.y - this.y0;
        return Math.hypot(dx, dy);
    }
}

const particles = [];
let offsetX, offsetY; // Will be calculated based on canvas size

function initializeParticles() {
    particles.length = 0; // Clear existing particles if any (for potential resize)

    // Dynamically calculate spacing based on canvas size and grid dimensions
    // Ensure the grid fits within the canvas, leaving a small margin.
    const margin = 25; // Margin in pixels
    const availableWidth = canvasWidth - 2 * margin;
    const availableHeight = canvasHeight - 2 * margin;

    // Calculate spacing based on the limiting dimension
    const spacingX = availableWidth / (cols -1);
    const spacingY = availableHeight / (rows-1);
    spacing = Math.min(spacingX, spacingY);
    diag = spacing * Math.SQRT2; // Recalculate diag based on new spacing
    
    // Calculate offsets to center the grid
    offsetX = (canvasWidth - (cols - 1) * spacing) / 2;
    offsetY = (canvasHeight - (rows - 1) * spacing) / 2;

    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            particles.push(new Particle(offsetX + i * spacing, offsetY + j * spacing));
        }
    }
    const idx = (i, j) => i * rows + j;
    
    particles.forEach((p, particle_idx) => { // Current particle's own index in the particles array
        const current_col = Math.floor(particle_idx / rows);
        const current_row = particle_idx % rows;

        for (let dy = -1; dy <= 1; dy++) {      // Iterate through y-offsets (-1, 0, 1)
            for (let dx = -1; dx <= 1; dx++) {  // Iterate through x-offsets (-1, 0, 1)
                if (dx === 0 && dy === 0) continue; // Skip self

                const neighbor_col = current_col + dx;
                const neighbor_row = current_row + dy;

                if (neighbor_col >= 0 && neighbor_col < cols && neighbor_row >= 0 && neighbor_row < rows) {
                    const neighbor_actual_index = idx(neighbor_col, neighbor_row);
                    // Determine rest length: 'diag' for diagonal, 'spacing' for orthogonal
                    const rest = (dx !== 0 && dy !== 0) ? diag : spacing;
                    p.addNeighbor(neighbor_actual_index, rest);
                }
            }
        }
    });
}


// Forces
// let forces = []; // This will now be assigned the result of computeForces()
function computeForces() {
    // Create a local F array for computation, as in original
    const F = particles.map(() => ({ fx: 0, fy: 0 })); 
    particles.forEach((p, i) => {
        // On-site restoring force (pulls particle back to its lattice point)
        F[i].fx += -kR * (p.x - p.x0);
        F[i].fy += -kR * (p.y - p.y0);

        // Spring forces from neighbors
        p.neighbors.forEach(({ index: n_index, rest }) => {
            // If the neighbor's index is less than the current particle's index 'i',
            // this spring interaction has already been processed when the neighbor
            // was the primary particle. So, skip to avoid double counting.
            if (n_index < i) {
                return; // Equivalent to 'continue' in a forEach callback
            }

            const n = particles[n_index]; // Get the actual neighbor particle object

            const dx_pn = p.x - n.x; // Displacement from n to p
            const dy_pn = p.y - n.y;
            // Use rest length as fallback if particles overlap to avoid division by zero
            // and ensure force becomes zero if d=0 and effective_d=rest.
            const effective_d = Math.hypot(dx_pn, dy_pn) || rest; 
            
            const forceMagnitudeScalar = -kN * (effective_d - rest); // Hooke's Law scalar part
            
            // Force components on particle 'p' from its spring connection with 'n'
            // If effective_d is 'rest' (due to overlap), and dx_pn/dy_pn are 0, force components are 0.
            // If effective_d is very small (but non-zero hypot), dx_pn/effective_d is unit vector component.
            const fx_component_on_p = forceMagnitudeScalar * (dx_pn / effective_d);
            const fy_component_on_p = forceMagnitudeScalar * (dy_pn / effective_d);

            // Apply force to particle p
            F[i].fx += fx_component_on_p;
            F[i].fy += fy_component_on_p;

            // Apply reaction force (equal and opposite) to particle n
            F[n_index].fx -= fx_component_on_p;
            F[n_index].fy -= fy_component_on_p;
        });
    });
    return F; // Return the computed forces
}

// Energy Calculation
function computeEnergy() {
    let ke = 0, pr = 0, ps = 0; // Kinetic, Potential (restoring), Potential (spring)
    particles.forEach((p, i) => {
        ke += 0.5 * (p.vx * p.vx + p.vy * p.vy);
        const dx_site = p.x - p.x0, dy_site = p.y - p.y0;
        pr += 0.5 * kR * (dx_site * dx_site + dy_site * dy_site);

        p.neighbors.forEach(({ index: n_index, rest }) => {
            if (n_index > i) { // Calculate each spring's potential energy once
                const n = particles[n_index]; // Get neighbor particle object
                const ddx = p.x - n.x, ddy = p.y - n.y;
                const diff = Math.hypot(ddx, ddy) - rest;
                ps += 0.5 * kN * diff * diff;
            }
        });
    });
    return ke + pr + ps;
}

// UI Interaction State (ensure mX, mY are initialized if not already)
let heating = false, mX = 0, mY = 0;

// Event Listeners for UI
if (canvas) {
    canvas.addEventListener('mousedown', (e) => {
        heating = true;
        updateMousePosition(e);
    });
    canvas.addEventListener('mouseup', () => heating = false);
    canvas.addEventListener('mouseleave', () => heating = false);
    canvas.addEventListener('mousemove', (e) => {
        if (heating) updateMousePosition(e);
    });
    canvas.addEventListener('touchstart', (e) => {
        heating = true;
        updateMousePosition(e);
        e.preventDefault(); // Prevent scrolling/default touch actions
    }, { passive: false });
    canvas.addEventListener('touchend', () => heating = false);
    canvas.addEventListener('touchcancel', () => heating = false);
    canvas.addEventListener('touchmove', (e) => {
        if (heating) {
            updateMousePosition(e);
            e.preventDefault();
        }
    }, { passive: false });
}

function updateMousePosition(e) {
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    mX = clientX - r.left;
    mY = clientY - r.top;
}


if (timeSlider && timeVal) {
    timeSlider.oninput = () => {
        timeScale = parseFloat(timeSlider.value);
        timeVal.textContent = timeScale;
    };
    timeVal.textContent = timeSlider.value; // Initialize display
}
if (radiusSlider && radiusVal) {
    radiusSlider.oninput = () => {
        heatRadius = parseFloat(radiusSlider.value);
        radiusVal.textContent = heatRadius;
    };
    radiusVal.textContent = radiusSlider.value; // Initialize display
}
if (heatAmpSlider && ampVal) {
    heatAmpSlider.oninput = () => {
        heatAmp = parseFloat(heatAmpSlider.value);
        ampVal.textContent = heatAmp.toFixed(1);
    };
    ampVal.textContent = parseFloat(heatAmpSlider.value).toFixed(1); // Initialize display
}

// This function performs one discrete step of the physics simulation using baseDt
function runSinglePhysicsStep() { // dt is implicitly baseDt
    const dt = baseDt; 
    const halfDt = 0.5 * dt;

    // Integration (Verlet or similar)
    // Update velocities (first half step) v(t+h/2) = v(t) + F(t)*h/2
    // Assumes 'forces' (module scope) holds F(t)
    particles.forEach((p, i) => {
        p.vx += forces[i].fx * halfDt;
        p.vy += forces[i].fy * halfDt;
    });
    // Update positions x(t+h) = x(t) + v(t+h/2)*h
    particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
    });
    // Recompute forces based on new positions F(t+h)
    forces = computeForces(); // Assign to module-scoped forces
    // Update velocities (second half step) v(t+h) = v(t+h/2) + F(t+h)*h/2
    particles.forEach((p, i) => {
        p.vx += forces[i].fx * halfDt;
        p.vy += forces[i].fy * halfDt;
    });
}

// Rendering
function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw springs (connections)
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)'; // Semi-transparent grey
    ctx.lineWidth = 1;
    particles.forEach(p => {
        p.neighbors.forEach(({ index: n_index }) => { // Use neighbor index
            const n = particles[n_index]; // Get neighbor particle object
            // Draw each connection once, using original condition for visual consistency
            if (n.x > p.x || (n.x === p.x && n.y > p.y)) { 
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(n.x, n.y);
                ctx.stroke();
            }
        });
    });

    // Draw particles
    particles.forEach(p => {
        const amp = p.computeAmp();
        p.smAmp = colorSmooth * p.smAmp + (1 - colorSmooth) * amp; // Smooth the amplitude for color
        
        // Map amplitude to color (Blue: cold -> Red: hot)
        // Consistent with original conduction.html: cap smAmp at 1.0 for color scale
        const t = Math.min(p.smAmp, 1.0); 
        const hue = (1 - t) * 240; // 240 (blue) to 0 (red)
        
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); // Particle radius of 5
        ctx.fill();
    });

    if (energyVal) {
        energyVal.textContent = computeEnergy().toFixed(0);
    }
}

// Main animation loop
// let lastTimestamp = 0; // This is already a global, ensure it's initialized before first animate call
function animate(timestamp) {
    if (!ctx) {
        console.error("Canvas context not available for animation.");
        return;
    }

    if (lastTimestamp === 0) { // Initialize lastTimestamp on the first frame
        lastTimestamp = timestamp;
    }
    let realDeltaTimeMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Cap delta time to prevent physics spiral if tab was inactive for a long time
    if (realDeltaTimeMs > 100) { 
        realDeltaTimeMs = 100;
    }

    // Apply heating (once per animation frame, as in original conduction.html)
    if (heating) {
        particles.forEach(p => {
            const dx = p.x - mX, dy = p.y - mY;
            const weight = Math.exp(-(dx * dx + dy * dy) / (2 * heatRadius * heatRadius));
            // Ensure heatAmp usage matches original: dv = heatAmp * weight;
            const dv = heatAmp * weight; 
            p.vx += (Math.random() * 2 - 1) * dv;
            p.vy += (Math.random() * 2 - 1) * dv;
        });
    }

    // Calculate how many reference update "slots" have passed
    const referenceSlotsPassed = realDeltaTimeMs / (1000.0 / REFERENCE_UPDATES_PER_SECOND);
    
    // Add to accumulator, scaled by the UI timeScale
    physicsStepAccumulator += referenceSlotsPassed * timeScale;

    // Perform fixed-timestep physics updates
    // Ensure forces are computed before the first step if heating modified velocities
    // The redundant computeForces call if heating is removed.
    // Heating modifies velocities. The existing 'forces' (F(t)) will be used in the first
    // part of runSinglePhysicsStep. Then new forces F(t+h) are computed inside runSinglePhysicsStep.
    // if (heating) { 
    //     computeForces(); // This line is removed
    // }
    
    let maxStepsPerFrame = 100; // Safety break for the while loop
    let stepsTaken = 0;

    while (physicsStepAccumulator >= 1.0 && stepsTaken < maxStepsPerFrame) {
        runSinglePhysicsStep(); // Each call performs one 'baseDt' step
        physicsStepAccumulator -= 1.0;
        stepsTaken++;
    }
    if (stepsTaken >= maxStepsPerFrame) {
        console.warn("Max physics steps per frame reached. Simulation might be running too slow or timeScale is too high.");
        physicsStepAccumulator = 0; // Reset accumulator to prevent further immediate loops
    }
    
    // Update canvas resolution if it changed
    // Check against the canvas element's actual clientWidth/clientHeight
    if (canvas.clientWidth !== canvasWidth || canvas.clientHeight !== canvasHeight) {
        canvasWidth = canvas.clientWidth;   // Update script's tracked width
        canvasHeight = canvas.clientHeight; // Update script's tracked height
        canvas.width = canvasWidth;         // Set drawing buffer width to match display
        canvas.height = canvasHeight;       // Set drawing buffer height to match display
        
        // Re-initialize particles and forces if dimensions changed,
        // as their positions depend on canvasWidth/Height.
        if (particles.length > 0) { // Avoid re-init if particles weren't set up yet
            initializeParticles(); 
            forces = computeForces(); // Update forces after re-initialization
        }
    }
    
    render();
    requestAnimationFrame(animate);
}

// Initialization function to be called when DOM is ready
function startSimulationWhenReady() {
    if (!canvas || !ctx) {
        console.error("Canvas or context not found. Simulation cannot start.");
        // Retry or inform user, depending on how critical this is.
        // For now, we'll just log and exit.
        if (!document.getElementById('simulationCanvas')) {
            console.error("Element with ID 'simulationCanvas' not found in the DOM.");
        } else if (!canvas.getContext) {
            console.error("canvas.getContext is not a function. Is 'simulationCanvas' a canvas element?");
        }
        return;
    }

    // Set initial canvas dimensions from its CSS-defined size
    // This ensures the simulation grid is scaled correctly from the start.
    // The simulation_ui.js script should handle the dynamic resizing.
    // We get the initial size here.
    const aspectRatioBox = canvas.parentElement; // .sim-aspect-ratio-box
    if (aspectRatioBox) {
        canvasWidth = aspectRatioBox.clientWidth;
        canvasHeight = aspectRatioBox.clientHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
    } else {
        // Fallback if structure is not as expected, use default
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
    }


    initializeParticles();
    forces = computeForces(); // Initial force calculation and assignment
    requestAnimationFrame(animate); // Initial call to start the loop
}

// Defer start until DOM is fully ready and UI script has likely run
if (document.readyState === "complete" || (document.readyState !== "loading" && !document.documentElement.doScroll)) {
    startSimulationWhenReady();
} else {
    document.addEventListener("DOMContentLoaded", startSimulationWhenReady);
}

// Expose a resize function if needed by simulation_ui.js, though ideally
// simulation_ui.js handles canvas element resizing and this script adapts.
// For this conduction simulation, the particle grid is fixed in terms of cols/rows,
// but it recenters itself if the canvas dimensions change.
window.conductionSimulation = {
    // Example: a function to reset the simulation if needed from outside
    reset: () => {
        initializeParticles();
        forces = computeForces(); // Update forces on reset
        // Reset smoothed amplitude for all particles to prevent stale visual state
        particles.forEach(p => p.smAmp = 0);
        if (energyVal) energyVal.textContent = computeEnergy().toFixed(0);
        console.log("Conduction simulation reset.");
    },
    // The simulation_ui.js script will handle canvas.width/height changes.
    // This script will pick them up in the animate() loop.
};

// Add event listener for the new reset button
document.addEventListener('DOMContentLoaded', () => {
    const resetButton = document.getElementById('resetSimulationBtn');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (window.conductionSimulation && typeof window.conductionSimulation.reset === 'function') {
                window.conductionSimulation.reset();
            }
        });
    }
});

