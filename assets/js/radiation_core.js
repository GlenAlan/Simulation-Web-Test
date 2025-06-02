// Thermal Radiation Simulation Core Logic
// Based on simulation_template_core.js structure

// --- DOM Element References ---
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Control elements
const timeSlider = document.getElementById('timeScale');
const timeScaleVal = document.getElementById('timeScaleVal');
const temperatureSlider = document.getElementById('temperature');
const temperatureVal = document.getElementById('temperatureVal');
const intensitySlider = document.getElementById('intensity');
const intensityVal = document.getElementById('intensityVal');
const distanceSlider = document.getElementById('distance');
const distanceVal = document.getElementById('distanceVal');
const objectTypeSelector = document.getElementById('objectTypeSelector');
const absorbedEnergyDisplay = document.getElementById('absorbedEnergyVal');
const emissionRateDisplay = document.getElementById('emissionRateVal');
const resetButton = document.getElementById('resetSimulationBtn');

// --- Simulation Constants & Parameters ---
let timeScale = timeSlider ? parseFloat(timeSlider.value) : 1.0;
let temperature = temperatureSlider ? parseFloat(temperatureSlider.value) : 500; // Kelvin
let intensity = intensitySlider ? parseFloat(intensitySlider.value) : 50; // Percentage
let objectDistance = distanceSlider ? parseFloat(distanceSlider.value) : 200; // pixels
let objectType = objectTypeSelector ? objectTypeSelector.value : 'metal';

// Canvas dimensions
let canvasWidth = 800;
let canvasHeight = 400;

// Physics constants
const STEFAN_BOLTZMANN = 5.67e-8; // Stefan-Boltzmann constant (simplified for visualization)
const REFERENCE_UPDATES_PER_SECOND = 60.0;
const BASE_DT = 1.0 / REFERENCE_UPDATES_PER_SECOND;

// Radiation source properties
const SOURCE_RADIUS = 30;
const SOURCE_X = 100; // Fixed position on left side

// Object properties
const OBJECT_WIDTH = 40;
const OBJECT_HEIGHT = 60;

// Material properties
const MATERIAL_PROPERTIES = {
    metal: { absorption: 0.9, color: '#888888', name: 'Metal' },
    glass: { absorption: 0.6, color: '#CCE5FF', name: 'Glass' },
    plastic: { absorption: 0.3, color: '#FFB366', name: 'Plastic' }
};

// --- Simulation State Variables ---
let photons = [];
let absorbedEnergy = 0;
let totalPhotonsEmitted = 0;
let lastTimestamp = 0;
let physicsStepAccumulator = 0.0;

// Photon class
class Photon {
    constructor(x, y, vx, vy, energy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.energy = energy;
        this.age = 0;
        this.maxAge = 200; // Frames before photon disappears
        this.absorbed = false;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.age++;
        
        // Check if photon is absorbed by object
        this.checkAbsorption();
        
        // Remove if too old or off screen
        if (this.age > this.maxAge || 
            this.x < 0 || this.x > canvasWidth || 
            this.y < 0 || this.y > canvasHeight ||
            this.absorbed) {
            return false; // Mark for removal
        }
        return true; // Keep photon
    }
    
    checkAbsorption() {
        const objectX = objectDistance;
        const objectY = (canvasHeight - OBJECT_HEIGHT) / 2;
        
        // Check collision with absorption object
        if (this.x >= objectX && this.x <= objectX + OBJECT_WIDTH &&
            this.y >= objectY && this.y <= objectY + OBJECT_HEIGHT) {
            
            const material = MATERIAL_PROPERTIES[objectType];
            if (Math.random() < material.absorption) {
                absorbedEnergy += this.energy;
                this.absorbed = true;
            }
        }
    }
      render() {
        if (this.absorbed) return;
        
        // Color based on energy (temperature) - more realistic photon colors
        const normalizedEnergy = Math.min(this.energy / 150, 1);
        
        // Create more realistic thermal radiation colors
        let hue, saturation, lightness;
        if (normalizedEnergy < 0.3) {
            // Infrared - deep red
            hue = 0;
            saturation = 80;
            lightness = 30 + normalizedEnergy * 30;
        } else if (normalizedEnergy < 0.7) {
            // Red to orange to yellow
            hue = normalizedEnergy * 60;
            saturation = 100;
            lightness = 50 + normalizedEnergy * 20;
        } else {
            // Yellow to white (high energy)
            hue = 60;
            saturation = 100 - (normalizedEnergy - 0.7) * 200;
            lightness = 70 + (normalizedEnergy - 0.7) * 30;
        }
        
        const alpha = Math.max(0.4, 1 - this.age / this.maxAge);
        
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.beginPath();
        
        // Size based on energy - higher energy photons are slightly larger
        const radius = 1.5 + normalizedEnergy * 1.5;
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a subtle glow for high-energy photons
        if (normalizedEnergy > 0.6) {
            ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius + 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// --- Core Simulation Functions ---

function initializeSimulationState() {
    photons.length = 0;
    absorbedEnergy = 0;
    totalPhotonsEmitted = 0;
    console.log("Thermal radiation simulation initialized.");
}

function adaptSimulationToResize(oldWidth, oldHeight, newWidth, newHeight) {
    // Scale photon positions proportionally
    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;
    
    photons.forEach(photon => {
        photon.x *= scaleX;
        photon.y *= scaleY;
    });
    
    console.log(`Radiation simulation adapted to resize: ${newWidth}x${newHeight}.`);
}

function emitPhotons() {
    // Calculate emission rate based on Stefan-Boltzmann law (simplified)
    // Stefan-Boltzmann law: Power ∝ T^4
    const baseEmissionRate = Math.pow(temperature / 300, 4) * (intensity / 100);
    const photonsPerFrame = baseEmissionRate * 0.8; // Adjusted for better visualization
    
    // Emit photons from random points on the source surface
    const numPhotonsToEmit = Math.floor(photonsPerFrame) + (Math.random() < (photonsPerFrame % 1) ? 1 : 0);
    
    for (let i = 0; i < numPhotonsToEmit; i++) {
        // Random point on source surface (uniform distribution in circle)
        const sourceRadius = SOURCE_RADIUS * Math.sqrt(Math.random());
        const sourceAngle = Math.random() * Math.PI * 2;
        
        const startX = SOURCE_X + Math.cos(sourceAngle) * sourceRadius;
        const startY = canvasHeight / 2 + Math.sin(sourceAngle) * sourceRadius;
        
        // Random emission direction (isotropic radiation - all directions equally likely)
        const emissionAngle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 2.5; // Variable photon speed for realism
        const vx = Math.cos(emissionAngle) * speed;
        const vy = Math.sin(emissionAngle) * speed;
        
        // Energy based on temperature (Wien's displacement law approximation)
        // Higher temperature = higher average photon energy
        const baseEnergy = temperature / 8;
        const energyVariation = Math.random() * baseEnergy * 0.6;
        const energy = baseEnergy + energyVariation;
        
        photons.push(new Photon(startX, startY, vx, vy, energy));
        totalPhotonsEmitted++;
    }
}

function runSinglePhysicsStep() {
    // Emit new photons
    emitPhotons();
    
    // Update existing photons
    photons = photons.filter(photon => photon.update());
}

function renderSimulation() {
    if (!ctx) return;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw radiation source
    drawRadiationSource();
    
    // Draw absorption object
    drawAbsorptionObject();
    
    // Draw photons
    photons.forEach(photon => photon.render());
    
    // Draw distance line
    drawDistanceLine();
}

function drawRadiationSource() {
    const centerY = canvasHeight / 2;
    
    // Temperature-based color
    const normalizedTemp = Math.min((temperature - 200) / 1300, 1);
    const hue = (1 - normalizedTemp) * 60; // Red to white-hot
    const lightness = 50 + normalizedTemp * 30;
    
    // Draw main source
    ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
    ctx.beginPath();
    ctx.arc(SOURCE_X, centerY, SOURCE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw glow effect
    for (let i = 0; i < 3; i++) {
        const glowRadius = SOURCE_RADIUS + (i + 1) * 10;
        const alpha = 0.1 / (i + 1);
        ctx.fillStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(SOURCE_X, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Temperature label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${temperature}K`, SOURCE_X, centerY + SOURCE_RADIUS + 20);
}

function drawAbsorptionObject() {
    const objectX = objectDistance;
    const objectY = (canvasHeight - OBJECT_HEIGHT) / 2;
    const material = MATERIAL_PROPERTIES[objectType];
    
    // Calculate absorbed energy rate for visual feedback
    const energyAbsorptionRate = absorbedEnergy / (totalPhotonsEmitted || 1) * 100;
    
    // Draw object with energy absorption visual effect
    ctx.fillStyle = material.color;
    ctx.fillRect(objectX, objectY, OBJECT_WIDTH, OBJECT_HEIGHT);
    
    // Add heat glow effect based on absorbed energy
    if (absorbedEnergy > 50) {
        const glowIntensity = Math.min(absorbedEnergy / 500, 1);
        const glowAlpha = glowIntensity * 0.4;
        
        for (let i = 1; i <= 3; i++) {
            ctx.fillStyle = `rgba(255, 100, 0, ${glowAlpha / i})`;
            ctx.fillRect(objectX - i * 2, objectY - i * 2, OBJECT_WIDTH + i * 4, OBJECT_HEIGHT + i * 4);
        }
        
        // Redraw the main object
        ctx.fillStyle = material.color;
        ctx.fillRect(objectX, objectY, OBJECT_WIDTH, OBJECT_HEIGHT);
    }
    
    // Draw object outline
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(objectX, objectY, OBJECT_WIDTH, OBJECT_HEIGHT);
    
    // Material label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(material.name, objectX + OBJECT_WIDTH / 2, objectY + OBJECT_HEIGHT + 15);
    
    // Absorption percentage indicator
    ctx.fillStyle = '#FFFF00';
    ctx.font = '10px Arial';
    ctx.fillText(`${(material.absorption * 100).toFixed(0)}% abs`, objectX + OBJECT_WIDTH / 2, objectY + OBJECT_HEIGHT + 30);
}

function drawDistanceLine() {
    const objectX = objectDistance;
    const centerY = canvasHeight / 2;
    
    // Draw distance line
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(SOURCE_X + SOURCE_RADIUS, centerY);
    ctx.lineTo(objectX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Distance label
    const distance = objectX - SOURCE_X - SOURCE_RADIUS;
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${distance.toFixed(0)}px`, (SOURCE_X + SOURCE_RADIUS + objectX) / 2, centerY - 10);
}

function computeAndDisplayData() {
    if (!absorbedEnergyDisplay || !emissionRateDisplay) return;
    
    // Calculate emission rate (photons per second) - more accurate
    const stefanBoltzmannRate = Math.pow(temperature / 300, 4);
    const emissionRate = stefanBoltzmannRate * (intensity / 100) * 48; // Scaled for display
    
    // Calculate inverse square law effect on intensity
    const distance = objectDistance - SOURCE_X - SOURCE_RADIUS;
    const inverseSquareFactor = Math.pow(100 / Math.max(distance, 50), 2);
    const effectiveIntensity = inverseSquareFactor * 100;
    
    // Update displays with better formatting
    absorbedEnergyDisplay.textContent = absorbedEnergy.toFixed(1);
    emissionRateDisplay.textContent = emissionRate.toFixed(0);
    
    // Add distance and intensity info to existing display elements
    const infoBar = document.querySelector('.sim-info-bar');
    if (infoBar && !document.getElementById('distanceInfo')) {
        const distanceInfo = document.createElement('span');
        distanceInfo.id = 'distanceInfo';
        distanceInfo.className = 'sim-info-item';
        infoBar.insertBefore(distanceInfo, infoBar.lastElementChild);
    }
    
    const distanceInfoElement = document.getElementById('distanceInfo');
    if (distanceInfoElement) {
        distanceInfoElement.innerHTML = `Distance: ${distance.toFixed(0)}px | Intensity: ${effectiveIntensity.toFixed(1)}%`;
    }
}

// --- Main Animation Loop ---

function animate(timestamp) {
    if (!ctx) {
        console.error("Canvas context not available for animation.");
        return;
    }

    if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
    }
    
    let realDeltaTimeMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Cap delta time to prevent physics spiral
    if (realDeltaTimeMs > 100) {
        realDeltaTimeMs = 100;
    }

    // --- Physics Updates (Fixed Timestep) ---
    const referenceSlotsPassed = realDeltaTimeMs / (1000.0 / REFERENCE_UPDATES_PER_SECOND);
    physicsStepAccumulator += referenceSlotsPassed * timeScale;
    
    let maxStepsPerFrame = 10;
    let stepsTaken = 0;
    
    while (physicsStepAccumulator >= 1.0 && stepsTaken < maxStepsPerFrame) {
        runSinglePhysicsStep();
        physicsStepAccumulator -= 1.0;
        stepsTaken++;
    }
    
    if (stepsTaken >= maxStepsPerFrame) {
        physicsStepAccumulator = 0.0; // Reset to prevent spiral
    }
    
    // --- Canvas Resize Handling ---
    if (canvas.clientWidth !== canvasWidth || canvas.clientHeight !== canvasHeight) {
        const oldWidth = canvasWidth;
        const oldHeight = canvasHeight;
        canvasWidth = canvas.clientWidth;
        canvasHeight = canvas.clientHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        adaptSimulationToResize(oldWidth, oldHeight, canvasWidth, canvasHeight);
    }
    
    // --- Rendering & Data Display ---
    renderSimulation();
    computeAndDisplayData();
    
    requestAnimationFrame(animate);
}

function startSimulation() {
    if (!canvas || !ctx) {
        console.error("Canvas or context not found. Radiation simulation cannot start.");
        return;
    }

    // Set initial canvas dimensions
    const aspectRatioBox = canvas.parentElement;
    if (aspectRatioBox && aspectRatioBox.classList.contains('sim-aspect-ratio-box')) {
        canvasWidth = aspectRatioBox.clientWidth;
        canvasHeight = aspectRatioBox.clientHeight;
    } else {
        canvasWidth = canvas.clientWidth || 800;
        canvasHeight = canvas.clientHeight || 400;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    initializeSimulationState();
    requestAnimationFrame(animate);
    console.log("Thermal radiation simulation started.");
}

// --- UI Event Listeners ---

// Time scale slider
if (timeSlider && timeScaleVal) {
    timeSlider.oninput = () => {
        timeScale = parseFloat(timeSlider.value);
        timeScaleVal.textContent = timeScale.toFixed(1);
    };
    timeScaleVal.textContent = timeScale.toFixed(1);
}

// Temperature slider
if (temperatureSlider && temperatureVal) {
    temperatureSlider.oninput = () => {
        temperature = parseFloat(temperatureSlider.value);
        temperatureVal.textContent = temperature;
    };
    temperatureVal.textContent = temperature;
}

// Intensity slider
if (intensitySlider && intensityVal) {
    intensitySlider.oninput = () => {
        intensity = parseFloat(intensitySlider.value);
        intensityVal.textContent = intensity;
    };
    intensityVal.textContent = intensity;
}

// Distance slider
if (distanceSlider && distanceVal) {
    distanceSlider.oninput = () => {
        objectDistance = parseFloat(distanceSlider.value);
        distanceVal.textContent = objectDistance;
    };
    distanceVal.textContent = objectDistance;
}

// Object type selector
if (objectTypeSelector) {
    objectTypeSelector.onchange = () => {
        objectType = objectTypeSelector.value;
    };
}

// Reset button
if (resetButton) {
    resetButton.onclick = () => {
        initializeSimulationState();
        console.log("Radiation simulation reset.");
    };
}

// --- Global Simulation Control Object ---
window.radiationSimulation = {
    reset: () => {
        initializeSimulationState();
    },
};

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure UI is ready
    setTimeout(startSimulation, 100);
});
