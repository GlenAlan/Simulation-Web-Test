document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const siteHeader = document.getElementById('header');
    
    const simPageInner = document.querySelector('#main > .inner');
    if (!simPageInner) return;

    const controlsPanel = simPageInner.querySelector('#simulationControlsPanel');
    const fullscreenToggleBtn = simPageInner.querySelector('.sim-fullscreen-toggle');
    const panelToggleBtn = simPageInner.querySelector('.sim-panel-toggle-button');
    const simCanvas = simPageInner.querySelector('#simulationCanvas');
    const actionButtonsOverlay = document.querySelector('.sim-action-buttons-overlay'); // Get the overlay

    const openPanelIcon = '<span class="icon solid fa-cog"><span class="label">Open Settings</span></span>';
    const closePanelIcon = '<span class="icon solid fa-times"><span class="label">Close Settings</span></span>';
    
    const fullscreenIconExpand = '<span class="icon solid fa-expand"><span class="label">Enter Fullscreen</span></span>';
    const fullscreenIconContract = '<span class="icon solid fa-compress"><span class="label">Exit Fullscreen</span></span>';

    function updateButtonIcons() {
        if (fullscreenToggleBtn) {
             fullscreenToggleBtn.innerHTML = body.classList.contains('sim-fullscreen-active') ? fullscreenIconContract : fullscreenIconExpand;
        }
        if (panelToggleBtn && controlsPanel) {
            panelToggleBtn.innerHTML = controlsPanel.classList.contains('panel-open') ? closePanelIcon : openPanelIcon;
        }
    }

    function updatePanelPositionAndHeight() {
        // Panel positioning logic
        if (controlsPanel) { 
            let panelTopOffset = '0px';
            let panelHeight = '100vh';
            if (siteHeader && !body.classList.contains('sim-fullscreen-active')) {
                panelTopOffset = `${siteHeader.offsetHeight}px`;
                panelHeight = `calc(100vh - ${siteHeader.offsetHeight}px)`;
            }
            controlsPanel.style.top = panelTopOffset;
            controlsPanel.style.height = panelHeight;
        } else {
            // console.warn('Controls panel not found for positioning.');
        }

        // Buttons positioning logic
        if (actionButtonsOverlay) {
            const verticalGapForFullscreen = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sim-button-offset'), 10) || 0; // Default to 0 if not found

            if (body.classList.contains('sim-fullscreen-active')) {
                actionButtonsOverlay.style.position = 'fixed';
                // Set top position directly using verticalGapForFullscreen (which is 0px due to --sim-button-offset).
                // This ensures the buttons are at the very top edge of the viewport in fullscreen.
                actionButtonsOverlay.style.top = `${verticalGapForFullscreen}px`;

                // Set CSS variable for button overlay height
                const overlayHeight = actionButtonsOverlay.offsetHeight;
                document.documentElement.style.setProperty('--sim-action-buttons-overlay-height', `${overlayHeight}px`);

            } else { // Non-fullscreen mode
                actionButtonsOverlay.style.position = 'absolute';
                const simulationAreaWrapper = document.querySelector('.simulation-area-wrapper');
                const displayContainer = document.querySelector('.simulation-display-container');
                let calculatedTopPx = 0; // Default to 0 if elements aren't found or calculation fails

                if (simulationAreaWrapper && displayContainer) {
                    // Calculate the visual top of displayContainer relative to the visual top of simulationAreaWrapper.
                    // This assumes actionButtonsOverlay is a child of simulationAreaWrapper.
                    const areaWrapperRect = simulationAreaWrapper.getBoundingClientRect();
                    const displayContainerRect = displayContainer.getBoundingClientRect();
                    
                    calculatedTopPx = displayContainerRect.top - areaWrapperRect.top;

                } else if (simCanvas) { 
                    // Fallback: If specific wrappers aren't found, try to align with canvas top relative to document.
                    // This is less reliable as it depends on actionButtonsOverlay's offset parent being the document body or similar.
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const canvasRect = simCanvas.getBoundingClientRect();
                    calculatedTopPx = canvasRect.top + scrollTop;
                    // console.warn('Using fallback positioning for action buttons in non-fullscreen.');
                }
                // Ensure the calculated top is not negative, which could happen with unusual scrolling or element positions.
                actionButtonsOverlay.style.top = `${Math.max(0, calculatedTopPx)}px`;
                document.documentElement.style.removeProperty('--sim-action-buttons-overlay-height'); // Clean up variable
            }
        } else {
            // console.warn('Action buttons overlay not found for positioning.');
        }
    }

    if (panelToggleBtn && controlsPanel) {
        panelToggleBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from bubbling to document listener
            const isOpen = controlsPanel.classList.toggle('panel-open');
            panelToggleBtn.setAttribute('aria-expanded', isOpen.toString());
            body.classList.toggle('sim-panel-active', isOpen); // Add/remove class on body
            updateButtonIcons();
        });
    }

    if (fullscreenToggleBtn && simCanvas) {
        fullscreenToggleBtn.addEventListener('click', () => {
            const isEnteringFullscreen = !body.classList.contains('sim-fullscreen-active');
            body.classList.toggle('sim-fullscreen-active');
            
            fullscreenToggleBtn.setAttribute('aria-expanded', isEnteringFullscreen.toString());
            updateButtonIcons();
            updatePanelPositionAndHeight(); // Re-evaluate panel AND BUTTONS top/height
            
            window.dispatchEvent(new Event('resize')); // Crucial for canvas to redraw
        });
    }
    
    // Initial setup
    updateButtonIcons();
    updatePanelPositionAndHeight();


    window.addEventListener('resize', () => {
        updatePanelPositionAndHeight();
        // Canvas resolution is handled by convection_core.js's resize listeners
    });

    const fpsDisplay = document.getElementById('fpsDisplay');
    if (fpsDisplay) {
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (!(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
                    fpsDisplay.style.display = fpsDisplay.style.display === 'block' ? 'none' : 'block';
                    e.preventDefault();
                }
            }
        });
    }
});