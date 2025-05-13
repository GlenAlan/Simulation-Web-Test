document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    const mainContent = document.querySelector('main');
    const menuToggle = document.querySelector('header .menu-toggle');
    const navUl = document.querySelector('header nav ul');

    let lastScrollTop = 0;
    const scrollThresholdDesktop = 50; // Pixels to scroll before shrinking header on desktop
    const headerInitialHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-initial-height')) || 70;
    const headerScrolledHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-scrolled-height')) || 50;

    // Function to adjust main content's top margin
    function adjustMainMargin(currentHeaderHeight) {
        if (mainContent) {
            mainContent.style.marginTop = `${currentHeaderHeight}px`;
        }
    }
    // Initial adjustment
    if (header) adjustMainMargin(header.offsetHeight);


    // Mobile menu toggle
    if (menuToggle && navUl) {
        menuToggle.addEventListener('click', () => {
            navUl.classList.toggle('active');
            const isExpanded = navUl.classList.contains('active');
            menuToggle.setAttribute('aria-expanded', isExpanded);
            menuToggle.innerHTML = isExpanded ? '×' : '☰';
        });
    }

    // Header scroll behavior
    if (header) {
        window.addEventListener('scroll', () => {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const isDesktop = window.innerWidth > 768;

            if (isDesktop) {
                // Desktop: Shrink header
                if (scrollTop > scrollThresholdDesktop) {
                    header.classList.add('header-scrolled');
                    adjustMainMargin(headerScrolledHeight);
                } else {
                    header.classList.remove('header-scrolled');
                    adjustMainMargin(headerInitialHeight);
                }
            } else {
                // Mobile: Hide/show header
                if (scrollTop > lastScrollTop && scrollTop > headerInitialHeight) {
                    // Scrolling Down
                    header.classList.add('header-hidden');
                    if (navUl && navUl.classList.contains('active')) { // Close mobile menu if open
                        navUl.classList.remove('active');
                        menuToggle.setAttribute('aria-expanded', 'false');
                        menuToggle.innerHTML = '☰';
                    }
                } else if (scrollTop < lastScrollTop) {
                    // Scrolling Up
                    header.classList.remove('header-hidden');
                }
                // No margin adjustment needed for mobile hide/show as it uses transform
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
        }, false);
    }
    
    // Adjust main margin on resize too, as header height might change due to responsive styles
    window.addEventListener('resize', () => {
        if (header) {
            const isDesktop = window.innerWidth > 768;
            if (isDesktop) {
                 adjustMainMargin(header.classList.contains('header-scrolled') ? headerScrolledHeight : headerInitialHeight);
            } else {
                // For mobile, the fixed header doesn't change main margin in the same way
                // but we ensure the initial margin is set correctly if switching from desktop
                adjustMainMargin(headerInitialHeight);
            }
        }
    });
});