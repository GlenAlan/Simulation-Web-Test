document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const header = document.querySelector('header');
    const mainContent = document.querySelector('main');
    const menuToggle = document.querySelector('header .menu-toggle');
    const navUl = document.querySelector('header nav ul');

    let lastScrollTop = 0;
    const scrollThresholdDesktop = 50;
    const headerInitialHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-initial-height')) || 70;
    const headerScrolledHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-scrolled-height')) || 50;

    const openSettingsIconSVG = `
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="display: block;">
            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
        </svg>`;
    const closeSettingsIconSVG = `
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style="display: block;">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"/>
        </svg>`;
    
    const fullscreenIconExpand = '⤢'; // Diagonal arrows outward (alternative expand)
    const fullscreenIconContract = '⤤'; // Diagonal arrows inward

    function adjustMainMargin(currentHeaderHeight) {
        if (mainContent && !body.classList.contains('sim-fullscreen-active')) {
            mainContent.style.marginTop = `${currentHeaderHeight}px`;
        } else if (mainContent) {
            mainContent.style.marginTop = '0px';
        }
    }
    if (header) adjustMainMargin(header.offsetHeight);

    if (menuToggle && navUl) {
        menuToggle.addEventListener('click', () => {
            navUl.classList.toggle('active');
            const isExpanded = navUl.classList.contains('active');
            menuToggle.setAttribute('aria-expanded', isExpanded.toString());
            menuToggle.innerHTML = isExpanded ? '×' : '☰';
        });
    }

    if (header) {
        window.addEventListener('scroll', () => {
            if (body.classList.contains('sim-fullscreen-active')) return;

            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const isDesktop = window.innerWidth > 768;

            if (isDesktop) {
                if (scrollTop > scrollThresholdDesktop) {
                    header.classList.add('header-scrolled');
                    adjustMainMargin(headerScrolledHeight);
                } else {
                    header.classList.remove('header-scrolled');
                    adjustMainMargin(headerInitialHeight);
                }
            } else {
                if (scrollTop > lastScrollTop && scrollTop > headerInitialHeight) {
                    header.classList.add('header-hidden');
                    if (navUl && navUl.classList.contains('active')) {
                        navUl.classList.remove('active');
                        menuToggle.setAttribute('aria-expanded', 'false');
                        menuToggle.innerHTML = '☰';
                    }
                } else if (scrollTop < lastScrollTop) {
                    header.classList.remove('header-hidden');
                }
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
            if(!body.classList.contains('sim-fullscreen-active')) { // Don't adjust if fullscreen panel is active
                adjustControlsPanelTop();
            }
        }, false);
    }
    
    window.addEventListener('resize', () => {
        if (header && !body.classList.contains('sim-fullscreen-active')) {
            const isDesktop = window.innerWidth > 768;
            if (isDesktop) {
                 adjustMainMargin(header.classList.contains('header-scrolled') ? headerScrolledHeight : headerInitialHeight);
            } else {
                adjustMainMargin(headerInitialHeight);
            }
        } else if (mainContent && body.classList.contains('sim-fullscreen-active')) {
            adjustMainMargin(0); 
        }
        handleFullscreenButtonLayout();
        adjustControlsPanelTop();
    });

    const simPageRoot = document.querySelector('main.simulation-page');
    if (simPageRoot) {
        const simPageTitle = simPageRoot.querySelector('.simulation-container > h2');
        const simDescription = simPageRoot.querySelector('.description-area');
        const footer = document.querySelector('footer');
        const fullscreenToggleBtn = simPageRoot.querySelector('.sim-fullscreen-toggle');
        const simCanvasContainer = simPageRoot.querySelector('.sim-canvas-container');
        const simDisplayArea = simPageRoot.querySelector('.simulation-display-area');
        
        const controlsToggleDesktopBtn = simPageRoot.querySelector('.sim-controls-toggle-desktop');
        const controlsPanelDesktop = simPageRoot.querySelector('.sim-controls-panel');
        const simMainContentWrapper = simPageRoot.querySelector('.simulation-content-main');

        function handleFullscreenButtonLayout() {
            if (!fullscreenToggleBtn || !simDisplayArea || !simCanvasContainer) return;
            
            const isDesktopNonFullscreen = window.innerWidth > 768 && !body.classList.contains('sim-fullscreen-active');

            if (isDesktopNonFullscreen) {
                simDisplayArea.classList.add('desktop-button-layout');
                fullscreenToggleBtn.classList.add('desktop-side-button');
                fullscreenToggleBtn.classList.remove('mobile-overlay-button');
                simCanvasContainer.style.position = 'static'; 
            } else {
                simDisplayArea.classList.remove('desktop-button-layout');
                fullscreenToggleBtn.classList.remove('desktop-side-button');
                fullscreenToggleBtn.classList.add('mobile-overlay-button');
                simCanvasContainer.style.position = 'relative'; 
            }
        }

        if (fullscreenToggleBtn && simCanvasContainer) {
            fullscreenToggleBtn.innerHTML = fullscreenIconExpand;
            fullscreenToggleBtn.addEventListener('click', () => {
                const isEnteringFullscreen = !body.classList.contains('sim-fullscreen-active');
                body.classList.toggle('sim-fullscreen-active');
                
                fullscreenToggleBtn.setAttribute('aria-expanded', isEnteringFullscreen.toString());
                fullscreenToggleBtn.innerHTML = isEnteringFullscreen ? fullscreenIconContract : fullscreenIconExpand;

                if (header) header.style.display = isEnteringFullscreen ? 'none' : '';
                if (footer) footer.style.display = isEnteringFullscreen ? 'none' : '';
                if (simPageTitle) simPageTitle.style.display = isEnteringFullscreen ? 'none' : '';
                if (simDescription) simDescription.style.display = isEnteringFullscreen ? 'none' : '';
                
                if (isEnteringFullscreen) {
                    mainContent.style.marginTop = '0px';
                } else { 
                    if (header) adjustMainMargin(header.offsetHeight);
                }
                
                handleFullscreenButtonLayout(); 
                adjustControlsPanelTop(); 
                window.dispatchEvent(new Event('resize')); 
            });
        }
        
        const adjustControlsPanelTop = () => {
            if (!controlsPanelDesktop || !controlsToggleDesktopBtn) return;

            const isTrulyDesktopWidth = window.innerWidth > 768;
            const isInFullscreen = body.classList.contains('sim-fullscreen-active');

            controlsPanelDesktop.classList.remove('desktop-style-panel', 'fullscreen-mode-controls');
            controlsToggleDesktopBtn.classList.remove('fullscreen-mode-controls');
            controlsToggleDesktopBtn.style.display = 'none';

            if (isInFullscreen) {
                controlsPanelDesktop.classList.add('fullscreen-mode-controls');
                controlsToggleDesktopBtn.classList.add('fullscreen-mode-controls');
                controlsToggleDesktopBtn.style.display = 'flex';

                controlsPanelDesktop.style.top = `0px`;
                controlsPanelDesktop.style.height = `100vh`;
                controlsToggleDesktopBtn.style.top = `15px`;
                 if (controlsPanelDesktop.classList.contains('desktop-open')) {
                    controlsToggleDesktopBtn.style.left = `calc(var(--desktop-controls-width) - 1px)`;
                } else {
                    controlsToggleDesktopBtn.style.left = '-1px';
                }
            } else if (isTrulyDesktopWidth) {
                controlsPanelDesktop.classList.add('desktop-style-panel');
                controlsToggleDesktopBtn.style.display = 'flex';

                let topOffset = 0;
                if (header && header.style.display !== 'none') {
                    topOffset = header.offsetHeight;
                }
                controlsPanelDesktop.style.top = `${topOffset}px`;
                controlsPanelDesktop.style.height = `calc(100vh - ${topOffset}px)`;
                controlsToggleDesktopBtn.style.top = `${topOffset + 15}px`;

                if (controlsPanelDesktop.classList.contains('desktop-open')) {
                    controlsToggleDesktopBtn.style.left = `calc(var(--desktop-controls-width) - 1px)`;
                } else {
                    controlsToggleDesktopBtn.style.left = '-1px';
                }
                if (simMainContentWrapper) {
                    simMainContentWrapper.style.marginLeft = controlsPanelDesktop.classList.contains('desktop-open') ? `var(--desktop-controls-width)` : '0px';
                }
            } else { // Mobile, not in fullscreen
                if (simMainContentWrapper) simMainContentWrapper.style.marginLeft = '0px';
                controlsPanelDesktop.style.top = '';
                controlsPanelDesktop.style.height = '';
                // If panel was open from desktop/fullscreen, close it when going to mobile
                if (controlsPanelDesktop.classList.contains('desktop-open')) {
                    controlsPanelDesktop.classList.remove('desktop-open');
                    if(controlsToggleDesktopBtn) { // Check exists, might be hidden
                       controlsToggleDesktopBtn.innerHTML = openSettingsIconSVG;
                       controlsToggleDesktopBtn.setAttribute('aria-expanded', 'false');
                    }
                }
            }
        };
        
        if (controlsToggleDesktopBtn && controlsPanelDesktop && simMainContentWrapper) {
            controlsToggleDesktopBtn.innerHTML = openSettingsIconSVG; 

            controlsToggleDesktopBtn.addEventListener('click', () => {
                const isOpen = controlsPanelDesktop.classList.toggle('desktop-open');
                controlsToggleDesktopBtn.setAttribute('aria-expanded', isOpen.toString());
                controlsToggleDesktopBtn.innerHTML = isOpen ? closeSettingsIconSVG : openSettingsIconSVG;

                const isDesktopStyled = controlsPanelDesktop.classList.contains('desktop-style-panel') || 
                                        controlsPanelDesktop.classList.contains('fullscreen-mode-controls');

                if (isOpen) {
                    if (isDesktopStyled) { // Only shift content if panel is a sidebar
                         if (simMainContentWrapper && !body.classList.contains('sim-fullscreen-active') && controlsPanelDesktop.classList.contains('desktop-style-panel') ) {
                            simMainContentWrapper.style.marginLeft = `var(--desktop-controls-width)`;
                        }
                        controlsToggleDesktopBtn.style.left = `calc(var(--desktop-controls-width) - 1px)`;
                    }
                } else {
                    if (isDesktopStyled) {
                        if (simMainContentWrapper) simMainContentWrapper.style.marginLeft = '0px';
                        controlsToggleDesktopBtn.style.left = '-1px';
                    }
                }
            });
        }
        handleFullscreenButtonLayout(); // Initial call
        adjustControlsPanelTop(); // Initial setup
    }
});