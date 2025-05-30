// Generic Simulation Core Logic Template

// --- DOM Element References ---
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Generic controls from simulation_template.html
const timeSlider = document.getElementById('timeScale');
const timeScaleVal = document.getElementById('timeScaleVal'); // Matches HTML
const simDataDisplay = document.getElementById('simDataVal');   // For generic data output
const resetButton = document.getElementById('resetSimulationBtn');
// Add more specific control element references here if needed for a particular simulation

// --- Simulation Constants & Parameters (Customize as needed) ---
let timeScale = timeSlider ? parseFloat(timeSlider.value) : 1.0; // User-adjustable simulation speed

// Canvas and Grid
let canvasWidth = 800;  // Default, will be updated on load and resize
let canvasHeight = 400; // Default, will be updated on load and resize

// Physics & Timing
const REFERENCE_UPDATES_PER_SECOND = 60.0; // Target physics updates per second
const BASE_DT = 1.0 / REFERENCE_UPDATES_PER_SECOND; // Base physics timestep for one sub-step

// --- Simulation State Variables (Customize for your simulation) ---
let entities = [];      // Array to hold your simulation objects (e.g., particles, agents)
let currentForces = []; // Array to hold forces if using a physics model like Verlet integration
                        // This should match the structure of 'entities' if forces are per-entity

let lastTimestamp = 0;              // For calculating realDeltaTimeMs in animation loop
let physicsStepAccumulator = 0.0;   // Accumulates time for fixed-step physics updates

// --- Core Simulation Functions (Implement these for your specific simulation) ---

/**
 * Initializes the state of the simulation.
 * Called on startup and reset.
 * - Clears and populates the 'entities' array.
 * - Sets initial positions, velocities, and other properties of entities.
 * - Calculates initial forces if necessary.
 */
function initializeSimulationState() {
    entities.length = 0; // Clear existing entities
    currentForces.length = 0; // Clear existing forces

    // TODO: Implement your simulation's initialization logic.
    // Example: Create particles in a grid, set up agents, etc.
    // for (let i = 0; i < 10; i++) {
    //     entities.push({
    //         x: Math.random() * canvasWidth, y: Math.random() * canvasHeight,
    //         vx: 0, vy: 0, radius: 5, color: 'blue'
    //         // Add other simulation-specific properties
    //     });
    //     currentForces.push({ fx: 0, fy: 0 }); // Initialize corresponding force entry
    // }

    console.log("Simulation state initialized (template).");
    // currentForces = computeAllForces(); // Compute initial forces after entities are created
}

/**
 * Adapts the simulation state when the canvas is resized.
 * - Updates entity positions, scales, or recalculates layout based on new dimensions.
 * - Ensures the simulation remains consistent and visually correct.
 */
function adaptSimulationToResize(oldWidth, oldHeight, newWidth, newHeight) {
    // TODO: Implement logic to adjust entities to new canvas dimensions.
    // This is crucial for a responsive simulation that doesn't just reset.
    // Example: Scale positions proportionally
    // const scaleX = newWidth / oldWidth;
    // const scaleY = newHeight / oldHeight;
    // entities.forEach(e => {
    //     e.x *= scaleX;
    //     e.y *= scaleY;
    //     // Adjust other properties like rest lengths if they depend on spacing
    // });

    console.log(`Adapting simulation to resize: ${newWidth}x${newHeight} (template).`);
}

/**
 * Computes all forces acting on/between entities in the current state.
 * This is highly specific to your simulation\'s physics model.
 * @returns {Array} An array of force objects (e.g., {fx, fy} for each entity).
 */
function computeAllForces() {
    if (!entities || entities.length === 0) return [];

    const forces = entities.map(() => ({ fx: 0, fy: 0 })); // Initialize forces to zero

    // TODO: Implement your force calculation logic.
    // Example: Gravity, spring forces, electrostatic forces, agent interactions, etc.
    // entities.forEach((entity, i) => {
    //     // Example: Simple gravity towards center (replace with actual physics)
    //     const gravityX = (canvasWidth / 2 - entity.x) * 0.01;
    //     const gravityY = (canvasHeight / 2 - entity.y) * 0.01;
    //     forces[i].fx += gravityX;
    //     forces[i].fy += gravityY;
    // });
    return forces;
}

/**
 * Performs one discrete step of the physics simulation.
 * Updates entity states (positions, velocities) based on currentForces and BASE_DT.
 * This is where your integration method (e.g., Euler, Verlet) goes.
 */
function runSinglePhysicsStep() {
    // Assumes currentForces has been computed for the current state.
    // TODO: Implement your physics integration step.
    // Example: Verlet-like integration step (simplified)
    // entities.forEach((p, i) => {
    //     const halfDt = 0.5 * BASE_DT;
    //     // Update velocities (first half step)
    //     p.vx += currentForces[i].fx * halfDt;
    //     p.vy += currentForces[i].fy * halfDt;
    //     // Update positions
    //     p.x += p.vx * BASE_DT;
    //     p.y += p.vy * BASE_DT;
    // });
    //
    // // Recompute forces based on new positions
    // currentForces = computeAllForces();
    //
    // entities.forEach((p, i) => {
    //     const halfDt = 0.5 * BASE_DT;
    //     // Update velocities (second half step)
    //     p.vx += currentForces[i].fx * halfDt;
    //     p.vy += currentForces[i].fy * halfDt;
    //
    //     // Boundary conditions (example: wrap around canvas)
    //     // if (p.x < 0) p.x += canvasWidth; if (p.x > canvasWidth) p.x -= canvasWidth;
    //     // if (p.y < 0) p.y += canvasHeight; if (p.y > canvasHeight) p.y -= canvasHeight;
    // });
}

/**
 * Renders the current state of the simulation to the canvas.
 * Draws all entities and other visual elements.
 */
function renderSimulation() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // TODO: Implement your rendering logic.
    // Example: Draw each entity
    // entities.forEach(e => {
    //     ctx.fillStyle = e.color || 'grey';
    //     ctx.beginPath();
    //     ctx.arc(e.x, e.y, e.radius || 5, 0, Math.PI * 2);
    //     ctx.fill();
    // });

    // Example: Draw a border
    // ctx.strokeStyle = 'black';
    // ctx.strokeRect(0, 0, canvasWidth, canvasHeight);
}

/**
 * Computes and displays any relevant data from the simulation.
 * Updates the 'simDataDisplay' DOM element.
 */
function computeAndDisplayData() {
    if (!simDataDisplay) return;

    // TODO: Calculate and display relevant simulation data.
    // Example: Number of entities, average energy, etc.
    // const dataToShow = entities.length;
    // simDataDisplay.textContent = dataToShow;
    simDataDisplay.textContent = "N/A"; // Default placeholder
}

// --- Main Animation Loop & Setup ---

/**
 * The main animation loop.
 * - Handles timing and calls physics updates and rendering.
 * - Manages canvas resizing.
 */
function animate(timestamp) {
    if (!ctx) {
        console.error("Canvas context not available for animation.");
        return;
    }

    if (lastTimestamp === 0) lastTimestamp = timestamp; // Initialize on first frame
    let realDeltaTimeMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Cap delta time to prevent physics spiral if tab was inactive
    if (realDeltaTimeMs > 100) realDeltaTimeMs = 100;

    // --- Physics Updates (Fixed Timestep) ---
    const referenceSlotsPassed = realDeltaTimeMs / (1000.0 / REFERENCE_UPDATES_PER_SECOND);
    physicsStepAccumulator += referenceSlotsPassed * timeScale; // Apply user-controlled speed

    let maxStepsPerFrame = 100; // Safety break for the while loop
    let stepsTaken = 0;
    while (physicsStepAccumulator >= 1.0 && stepsTaken < maxStepsPerFrame) {
        runSinglePhysicsStep(); // Each call performs one 'BASE_DT' physics step
        physicsStepAccumulator -= 1.0;
        stepsTaken++;
    }
    if (stepsTaken >= maxStepsPerFrame) {
        console.warn("Max physics steps per frame reached. Simulation might be running too slow or timeScale is too high.");
        physicsStepAccumulator = 0; // Reset accumulator to prevent runaway loop
    }
    
    // --- Canvas Resize Handling ---
    if (canvas.clientWidth !== canvasWidth || canvas.clientHeight !== canvasHeight) {
        const oldWidth = canvasWidth;
        const oldHeight = canvasHeight;
        
        canvasWidth = canvas.clientWidth;
        canvasHeight = canvas.clientHeight;
        canvas.width = canvasWidth;   // Set drawing buffer width
        canvas.height = canvasHeight; // Set drawing buffer height
        
        if (entities.length > 0) {
            adaptSimulationToResize(oldWidth, oldHeight, canvasWidth, canvasHeight);
        } else {
            // If no entities (e.g., initial setup failed or called before start), re-initialize.
            initializeSimulationState();
        }
        currentForces = computeAllForces(); // Recompute forces with new positions/layout
    }
    
    // --- Rendering & Data Display ---
    renderSimulation();
    computeAndDisplayData();
    
    requestAnimationFrame(animate); // Request next frame
}

/**
 * Initializes and starts the simulation.
 * Called once the DOM is ready.
 */
function startSimulation() {
    if (!canvas || !ctx) {
        console.error("Canvas or context not found. Simulation cannot start.");
        if (!document.getElementById('simulationCanvas')) {
            console.error("Element with ID 'simulationCanvas' not found in the DOM.");
        } else if (canvas && !canvas.getContext) { // Check canvas directly
            console.error("canvas.getContext is not a function. Is 'simulationCanvas' a canvas element?");
        }
        return;
    }

    // Set initial canvas dimensions from its CSS-defined size or aspect ratio box
    const aspectRatioBox = canvas.parentElement; // Assumes canvas is child of .sim-aspect-ratio-box
    if (aspectRatioBox && aspectRatioBox.classList.contains('sim-aspect-ratio-box')) {
        canvasWidth = aspectRatioBox.clientWidth;
        canvasHeight = aspectRatioBox.clientHeight;
    } else {
        // Fallback if structure is not as expected, use current canvas element size or defaults
        canvasWidth = canvas.clientWidth || canvasWidth; // Use clientWidth if available
        canvasHeight = canvas.clientHeight || canvasHeight; // Use clientHeight if available
    }
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    initializeSimulationState();
    currentForces = computeAllForces(); // Initial force calculation
    
    requestAnimationFrame(animate); // Start the animation loop
    console.log("Simulation started (template).");
}

// --- UI Event Listeners ---

// Time scale slider
if (timeSlider && timeScaleVal) {
    timeSlider.oninput = () => {
        timeScale = parseFloat(timeSlider.value);
        timeScaleVal.textContent = timeScale.toFixed(1); // Update display
    };
    // Initialize display
    timeScaleVal.textContent = parseFloat(timeSlider.value).toFixed(1);
}

// TODO: Add event listeners for other simulation-specific controls here.

// --- Global Simulation Control Object (for reset button, etc.) ---
window.simulationTemplate = {
    reset: () => {
        console.log("Resetting simulation (template)...");
        initializeSimulationState();
        currentForces = computeAllForces(); // Recompute forces after reset
        
        // Reset timing variables
        physicsStepAccumulator = 0;
        lastTimestamp = 0; // Reset timestamp to avoid large jump on first frame after reset
                           // The animate loop will re-initialize it on the next frame.
        
        computeAndDisplayData(); // Update displayed data
        console.log("Simulation reset complete (template).");
    },
    // Add other control functions as needed (e.g., pause, step)
};

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (window.simulationTemplate && typeof window.simulationTemplate.reset === 'function') {
                window.simulationTemplate.reset();
            }
        });
    }
    startSimulation(); // Start the simulation once the DOM is fully loaded
});
