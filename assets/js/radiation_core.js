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
let intensity = intensitySlider ? parseFloat(intensitySlider.value) : 50; // Percentage (0-100)
let objectDistancePercent = distanceSlider ? parseFloat(distanceSlider.value) : 50; // Percentage of canvas width (25-90%)
let objectType = objectTypeSelector ? objectTypeSelector.value : 'metal';

// Canvas dimensions
let canvasWidth = 800;
let canvasHeight = 400;

// Physics constants
const STEFAN_BOLTZMANN = 5.67e-8; // Stefan-Boltzmann constant (W⋅m−2⋅K−4)
const WIENS_CONSTANT = 2.898e-3; // Wien's displacement law constant (m⋅K)
const PLANCK_CONSTANT = 6.626e-34; // Planck constant (J⋅s)
const SPEED_OF_LIGHT = 3e8; // Speed of light (m/s)
const BOLTZMANN_CONSTANT = 1.381e-23; // Boltzmann constant (J/K)
const REFERENCE_UPDATES_PER_SECOND = 60.0;
const BASE_DT = 1.0 / REFERENCE_UPDATES_PER_SECOND;

// Radiation source properties
const SOURCE_RADIUS = 30;
const SOURCE_X = 100; // Fixed position on left side

// Object properties
const OBJECT_WIDTH = 40;
const OBJECT_HEIGHT = 60;

// Material properties with realistic absorption coefficients
const MATERIAL_PROPERTIES = {
    metal: { absorption: 0.9, color: '#888888', name: 'Metal', emissivity: 0.95 },
    glass: { absorption: 0.6, color: '#CCE5FF', name: 'Glass', emissivity: 0.85 },
    plastic: { absorption: 0.3, color: '#FFB366', name: 'Plastic', emissivity: 0.90 }
};

// Distance scaling (convert pixels to realistic units for display)
const DISTANCE_SCALE = 0.002; // 1 pixel = 2 mm (for meter display)
const MAX_DISTANCE_CM = 350; // Maximum distance in centimeters

// --- Simulation State Variables ---
let photons = [];
let absorbedEnergy = 0;
let totalPhotonsEmitted = 0;
let lastTimestamp = 0;
let physicsStepAccumulator = 0.0;
let currentFPS = 0;
let frameCount = 0;
let fpsTimer = 0;
let lastFPSUpdate = 0;

// Helper function to convert temperature to wavelength using Wien's law
function temperatureToWavelength(temp) {
    return WIENS_CONSTANT / temp; // Returns wavelength in meters
}

// Helper function to convert wavelength to RGB color
function wavelengthToRGB(wavelength) {
    // Convert wavelength from meters to nanometers
    const wavelengthNm = wavelength * 1e9;
    
    let red = 0, green = 0, blue = 0;
    
    if (wavelengthNm >= 380 && wavelengthNm < 440) {
        red = -(wavelengthNm - 440) / (440 - 380);
        green = 0.0;
        blue = 1.0;
    } else if (wavelengthNm >= 440 && wavelengthNm < 490) {
        red = 0.0;
        green = (wavelengthNm - 440) / (490 - 440);
        blue = 1.0;
    } else if (wavelengthNm >= 490 && wavelengthNm < 510) {
        red = 0.0;
        green = 1.0;
        blue = -(wavelengthNm - 510) / (510 - 490);
    } else if (wavelengthNm >= 510 && wavelengthNm < 580) {
        red = (wavelengthNm - 510) / (580 - 510);
        green = 1.0;
        blue = 0.0;
    } else if (wavelengthNm >= 580 && wavelengthNm < 645) {
        red = 1.0;
        green = -(wavelengthNm - 645) / (645 - 580);
        blue = 0.0;
    } else if (wavelengthNm >= 645 && wavelengthNm < 781) {
        red = 1.0;
        green = 0.0;
        blue = 0.0;
    }
    
    // For infrared (above 781nm), use enhanced red/orange colors
    if (wavelengthNm >= 781) {
        if (wavelengthNm < 1000) {
            red = 1.0;
            green = 0.2;
            blue = 0.0;
        } else if (wavelengthNm < 2000) {
            red = 0.9;
            green = 0.1;
            blue = 0.0;
        } else {
            red = 0.8;
            green = 0.0;
            blue = 0.0;
        }
    }
    
    // For UV (below 380nm), use enhanced violet/blue
    if (wavelengthNm < 380) {
        red = 0.6;
        green = 0.0;
        blue = 1.0;
    }
    
    // Enhanced intensity factor for better visibility
    let factor = 1.0;
    if (wavelengthNm >= 380 && wavelengthNm < 420) {
        factor = 0.6 + 0.4 * (wavelengthNm - 380) / (420 - 380);
    } else if (wavelengthNm >= 701 && wavelengthNm < 781) {
        factor = 0.6 + 0.4 * (781 - wavelengthNm) / (781 - 701);
    }
    
    // Boost overall brightness for thermal radiation visibility
    const brightnessBost = 1.8;
    factor *= brightnessBost;
    
    red = Math.min(255, Math.max(0, Math.round(red * factor * 255)));
    green = Math.min(255, Math.max(0, Math.round(green * factor * 255)));
    blue = Math.min(255, Math.max(0, Math.round(blue * factor * 255)));
    
    return { r: red, g: green, b: blue };
}

// Helper function to get realistic thermal color based on temperature
function getThermalColor(temp) {
    const wavelength = temperatureToWavelength(temp);
    const rgb = wavelengthToRGB(wavelength);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

// Convert distance from pixels to meters for display
function pixelsToMeters(pixels) {
    return pixels * DISTANCE_SCALE;
}

// Calculate Planck's blackbody radiation distribution
function planckDistribution(wavelength, temperature) {
    const h = PLANCK_CONSTANT;
    const c = SPEED_OF_LIGHT;
    const k = BOLTZMANN_CONSTANT;
    
    const factor1 = (2 * h * c * c) / Math.pow(wavelength, 5);
    const factor2 = 1 / (Math.exp((h * c) / (wavelength * k * temperature)) - 1);
    
    return factor1 * factor2;
}
// Photon class
class Photon {
    constructor(x, y, vx, vy, energy, wavelength) {
        this.x = x;
        this.y = y;
        this.vx = vx; // Don't apply time scale here - apply in update
        this.vy = vy;
        this.energy = energy;
        this.wavelength = wavelength;
        this.age = 0;
        this.maxAge = 5.0; // Seconds before photon disappears
        this.absorbed = false;
    }
    
    update(deltaTime) {
        // Delta-time based movement with time scaling
        const dt = deltaTime * timeScale;
        this.x += this.vx * dt * 60; // Scale to 60fps equivalent
        this.y += this.vy * dt * 60;
        this.age += dt;
        
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
        const objectX = getObjectDistancePixels();
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
    }    render() {
        if (this.absorbed) return;
        
        // Use wavelength-based color for realistic physics
        const rgb = wavelengthToRGB(this.wavelength);
        const alpha = Math.max(0.3, 1 - this.age / this.maxAge);
        
        // Enhanced brightness based on energy, intensity, and temperature
        const energyFactor = Math.min(this.energy / 100, 1);
        const intensityFactor = intensity / 100;
        const temperatureFactor = Math.min(temperature / 1000, 1.5); // Higher temps = brighter
        const brightness = energyFactor * intensityFactor * temperatureFactor;
        
        // Apply brightness with higher minimum visibility for thermal radiation
        const minBrightness = 0.4; // Increased from 0.1
        const effectiveBrightness = minBrightness + brightness * (1 - minBrightness);
        
        // Additional brightness boost for thermal radiation visibility
        const thermalBoost = 1.5;
        const finalBrightness = Math.min(1.0, effectiveBrightness * thermalBoost);
        
        const r = Math.round(rgb.r * finalBrightness);
        const g = Math.round(rgb.g * finalBrightness);
        const b = Math.round(rgb.b * finalBrightness);
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        
        // Larger, more visible photons
        const baseRadius = 1.2; // Increased from 0.8
        const energySize = energyFactor * 1.5; // Increased from 1.2
        const intensitySize = intensityFactor * 1.0; // Increased from 0.8
        const radius = baseRadius + energySize + intensitySize;
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Enhanced glow for better visibility
        if (brightness > 0.2) { // Lower threshold for glow
            const glowAlpha = alpha * finalBrightness * 0.25; // Increased glow intensity
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius + 4, 0, Math.PI * 2); // Larger glow
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
    // Calculate emission rate based on Stefan-Boltzmann law
    // Stefan-Boltzmann law: Power ∝ T^4
    const baseEmissionRate = Math.pow(temperature / 300, 4) * (intensity / 100);
    const photonsPerFrame = baseEmissionRate * 1.2; // Adjusted for better visualization
    
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
        const speed = 2.0 + Math.random() * 3.0; // Variable photon speed for realism
        const vx = Math.cos(emissionAngle) * speed;
        const vy = Math.sin(emissionAngle) * speed;
          // Generate wavelength using Wien's displacement law and improved Planck distribution
        const peakWavelength = temperatureToWavelength(temperature);
        
        // Better thermal radiation wavelength distribution
        // Use exponential distribution around peak with temperature-dependent spread
        const spread = peakWavelength * (0.5 + temperature / 3000); // Wider spread at higher temps
        
        // Generate wavelength with realistic thermal distribution
        let wavelength;
        if (Math.random() < 0.7) {
            // 70% of photons near the peak (realistic thermal distribution)
            wavelength = peakWavelength * (0.8 + Math.random() * 0.4);
        } else {
            // 30% spread wider (infrared tail)
            wavelength = peakWavelength * (1.0 + Math.random() * 2.0);
        }
        
        // Ensure wavelength bounds for visible to infrared range
        const clampedWavelength = Math.max(3e-7, Math.min(wavelength, 1e-5)); // 300nm to 10,000nm (10μm)
        
        // Energy based on wavelength (E = hc/λ)
        const energy = (PLANCK_CONSTANT * SPEED_OF_LIGHT) / clampedWavelength;
        // Scale for visualization
        const scaledEnergy = (energy / 1e-19) * (temperature / 500);
        
        photons.push(new Photon(startX, startY, vx, vy, scaledEnergy, clampedWavelength));
        totalPhotonsEmitted++;
    }
}

function runSinglePhysicsStep(deltaTime) {
    // Emit new photons
    emitPhotons();
    
    // Update existing photons with delta time
    photons = photons.filter(photon => photon.update(deltaTime));
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
    
    // Enhanced temperature-based color using Wien's law
    const peakWavelength = temperatureToWavelength(temperature);
    const rgb = wavelengthToRGB(peakWavelength);
    
    // Brightness based on both temperature and intensity
    const tempFactor = Math.min(temperature / 1000, 1.5);
    const intensityFactor = intensity / 100;
    const brightness = tempFactor * intensityFactor;
    const minBrightness = 0.2;
    const effectiveBrightness = minBrightness + brightness * (1 - minBrightness);
    
    // Calculate final color with brightness
    const r = Math.round(rgb.r * effectiveBrightness);
    const g = Math.round(rgb.g * effectiveBrightness);
    const b = Math.round(rgb.b * effectiveBrightness);
    
    // Draw main source with size influenced by intensity
    const sourceRadius = SOURCE_RADIUS * (0.7 + 0.3 * intensityFactor);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.arc(SOURCE_X, centerY, sourceRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Enhanced glow effect based on temperature and intensity
    const numGlowLayers = Math.ceil(3 + brightness * 2);
    for (let i = 0; i < numGlowLayers; i++) {
        const glowRadius = sourceRadius + (i + 1) * 8;
        const glowAlpha = (0.15 * brightness) / (i + 1);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
        ctx.beginPath();
        ctx.arc(SOURCE_X, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Temperature label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${temperature}K`, SOURCE_X, centerY + sourceRadius + 20);
}

function drawAbsorptionObject() {
    const objectX = getObjectDistancePixels();
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
    const objectX = getObjectDistancePixels();
    const centerY = canvasHeight / 2;
    
    // Draw distance line
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(SOURCE_X + SOURCE_RADIUS, centerY);
    ctx.lineTo(objectX, centerY);
    ctx.stroke();
    ctx.setLineDash([]);      // Convert distance to realistic units for display
    const distanceM = getActualDistanceMeters();
    
    // Distance label with realistic units
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${distanceM.toFixed(2)} m`, (SOURCE_X + SOURCE_RADIUS + objectX) / 2, centerY - 10);
}

function computeAndDisplayData() {
    if (!absorbedEnergyDisplay || !emissionRateDisplay) return;
    
    // Calculate emission rate (photons per second) - more accurate
    const stefanBoltzmannRate = Math.pow(temperature / 300, 4);
    const emissionRate = stefanBoltzmannRate * (intensity / 100) * 60; // Scaled for display      // Calculate inverse square law effect on intensity
    const distanceM = getActualDistanceMeters();
    const inverseSquareFactor = Math.pow(0.5 / Math.max(distanceM, 0.1), 2); // Using meters for realistic calculation
    const effectiveIntensity = inverseSquareFactor * intensity;
    
    // Calculate proper absorbed energy rate (energy per second)
    const absorbedEnergyRate = absorbedEnergy / Math.max(totalPhotonsEmitted / 60, 1); // per second
    
    // Update displays with better formatting
    absorbedEnergyDisplay.textContent = absorbedEnergyRate.toFixed(1);
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
        distanceInfoElement.innerHTML = `Distance: ${distanceM.toFixed(2)} m | Intensity: ${effectiveIntensity.toFixed(1)}%`;
    }
}

// Helper function to calculate object distance based on percentage of canvas width
function getObjectDistancePixels() {
    // Convert percentage (25-90%) to actual pixel position
    // Ensure object stays within canvas bounds with some margin
    const minDistance = SOURCE_X + SOURCE_RADIUS + 50; // Minimum distance from source
    const maxDistance = canvasWidth - OBJECT_WIDTH - 20; // Maximum distance (leave margin for object)
    const availableWidth = maxDistance - minDistance;
    
    // Map percentage (25-90%) to available width
    const normalizedPercent = (objectDistancePercent - 25) / (90 - 25); // Convert to 0-1 range
    const distancePixels = minDistance + (normalizedPercent * availableWidth);
    
    return Math.max(minDistance, Math.min(maxDistance, distancePixels));
}

// Helper function to get the actual distance in meters from source to object
function getActualDistanceMeters() {
    const objectX = getObjectDistancePixels();
    const distancePixels = objectX - SOURCE_X - SOURCE_RADIUS;
    return pixelsToMeters(distancePixels);
}

// --- Main Animation Loop ---

function animate(timestamp) {
    if (!ctx) {
        console.error("Canvas context not available for animation.");
        return;
    }

    if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
        lastFPSUpdate = timestamp;
    }
    
    let realDeltaTimeMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    // Cap delta time to prevent physics spiral
    if (realDeltaTimeMs > 100) {
        realDeltaTimeMs = 100;
    }    // FPS tracking - update standard fpsDisplay element
    frameCount++;
    if (timestamp - lastFPSUpdate >= 1000) {
        currentFPS = frameCount / ((timestamp - lastFPSUpdate) / 1000);
        const fpsDisplay = document.getElementById('fpsDisplay');
        if (fpsDisplay) {
            fpsDisplay.textContent = `FPS: ${currentFPS.toFixed(0)}`;
        }
        frameCount = 0;
        lastFPSUpdate = timestamp;
    }

    // --- Physics Updates (Fixed Timestep with delta-time) ---
    const deltaTimeSeconds = realDeltaTimeMs / 1000.0;
    const referenceSlotsPassed = realDeltaTimeMs / (1000.0 / REFERENCE_UPDATES_PER_SECOND);
    physicsStepAccumulator += referenceSlotsPassed * timeScale;
    
    let maxStepsPerFrame = 10;
    let stepsTaken = 0;
    
    while (physicsStepAccumulator >= 1.0 && stepsTaken < maxStepsPerFrame) {
        runSinglePhysicsStep(BASE_DT); // Pass proper delta time
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
        objectDistancePercent = parseFloat(distanceSlider.value);
        const distanceM = getActualDistanceMeters();
        distanceVal.textContent = `${distanceM.toFixed(2)}`;
    };
    const initialDistanceM = getActualDistanceMeters();
    distanceVal.textContent = `${initialDistanceM.toFixed(2)}`;
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
