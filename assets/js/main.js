/*
	Phantom by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	var	$window = $(window),
		$body = $('body');

	// Breakpoints.
		breakpoints({
			xlarge:   [ '1281px',  '1680px' ],
			large:    [ '981px',   '1280px' ],
			medium:   [ '737px',   '980px'  ],
			small:    [ '481px',   '736px'  ],
			xsmall:   [ '361px',   '480px'  ],
			xxsmall:  [ null,      '360px'  ]
		});

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Touch?
		if (browser.mobile)
			$body.addClass('is-touch');

	// Forms.
		var $form = $('form');

		// Auto-resizing textareas.
			$form.find('textarea').each(function() {

				var $this = $(this),
					$wrapper = $('<div class="textarea-wrapper"></div>'),
					$submits = $this.find('input[type="submit"]');

				$this
					.wrap($wrapper)
					.attr('rows', 1)
					.css('overflow', 'hidden')
					.css('resize', 'none')
					.on('keydown', function(event) {

						if (event.keyCode == 13
						&&	event.ctrlKey) {

							event.preventDefault();
							event.stopPropagation();

							$(this).blur();

						}

					})
					.on('blur focus', function() {
						$this.val($.trim($this.val()));
					})
					.on('input blur focus --init', function() {

						$wrapper
							.css('height', $this.height());

						$this
							.css('height', 'auto')
							.css('height', $this.prop('scrollHeight') + 'px');

					})
					.on('keyup', function(event) {

						if (event.keyCode == 9)
							$this
								.select();

					})
					.triggerHandler('--init');

				// Fix.
					if (browser.name == 'ie'
					||	browser.mobile)
						$this
							.css('max-height', '10em')
							.css('overflow-y', 'auto');

			});

	// Theme Toggle.
		var $themeToggleButton = $('#theme-toggle');

		if ($themeToggleButton.length) {
			var $sunIcon = $themeToggleButton.find('.fa-sun');
			var $moonIcon = $themeToggleButton.find('.fa-moon');
			var prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
			var scrollThreshold = 50; // Hide when scrolled more than 50px

			// Function to check scroll and toggle button visibility
			function checkScrollAndToggleThemeButton() {
				var scrollTop = $window.scrollTop(); // $window is already defined at the top of your main.js

				if (scrollTop > scrollThreshold) {
					// If scrolled past the threshold and button is not already hidden
					if (!$themeToggleButton.hasClass('is-hidden-on-scroll')) {
						$themeToggleButton.addClass('is-hidden-on-scroll');
					}
				} else {
					// If scrolled to the top (or less than threshold) and button is hidden
					if ($themeToggleButton.hasClass('is-hidden-on-scroll')) {
						$themeToggleButton.removeClass('is-hidden-on-scroll');
					}
				}
			}

			// Attach the function to the scroll event, namespaced for easy removal if needed
			$window.on('scroll.themeToggleHide', checkScrollAndToggleThemeButton);

			// Call it once on page load to set the initial state
			// (e.g., if the page loads already scrolled down)
			checkScrollAndToggleThemeButton();

			if (!$sunIcon.length || !$moonIcon.length) {
				console.error('Theme icons not found in toggle button');
			} else {
				function getCurrentTheme() {
					let theme = window.localStorage.getItem('theme');
					if (theme) {
						return theme;
					}
					return prefersDarkScheme.matches ? 'dark' : 'light';
				}

				function loadTheme(theme) {
					$body.removeClass('light-mode dark-mode').addClass(theme + '-mode');

					if (theme === 'dark') {
						$sunIcon.hide();
						$moonIcon.css('display', 'inline-block'); // Ensure it's inline-block
						$themeToggleButton.attr('title', 'Switch to light mode');
						var $moonLabel = $moonIcon.find('.label');
						if ($moonLabel.length) $moonLabel.text('Light Mode');
					} else {
						$sunIcon.css('display', 'inline-block'); // Ensure it's inline-block
						$moonIcon.hide();
						$themeToggleButton.attr('title', 'Switch to dark mode');
						var $sunLabel = $sunIcon.find('.label');
						if ($sunLabel.length) $sunLabel.text('Dark Mode');
					}
				}

				$themeToggleButton.on('click', function() {
					let currentTheme = $body.hasClass('dark-mode') ? 'dark' : 'light';
					let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
					window.localStorage.setItem('theme', newTheme);
					loadTheme(newTheme);
				});

				// Load initial theme
				// Ensure this runs after $body is fully available and classes can be applied
				// $window.on('load') might be too late if it affects initial rendering,
				// but for now, this placement is fine. For critical FOUC, consider an inline script in <head>.
				loadTheme(getCurrentTheme());

				// Listen for changes in system preference (vanilla JS is fine here)
				prefersDarkScheme.addEventListener('change', function(e) {
					// Only switch if no user preference is stored
					if (!window.localStorage.getItem('theme')) {
						loadTheme(e.matches ? 'dark' : 'light');
					}
				});
			}
		} else {
			// console.warn('Theme toggle button #theme-toggle not found.'); // Optional: for debugging
		}


	// Menu.
		var $menu = $('#menu');

		$menu.wrapInner('<div class="inner"></div>');

		$menu._locked = false;

		$menu._lock = function() {

			if ($menu._locked)
				return false;

			$menu._locked = true;

			window.setTimeout(function() {
				$menu._locked = false;
			}, 350);

			return true;

		};

		$menu._show = function() {

			if ($menu._lock())
				$body.addClass('is-menu-visible');

		};

		$menu._hide = function() {

			if ($menu._lock())
				$body.removeClass('is-menu-visible');

		};

		$menu._toggle = function() {

			if ($menu._lock())
				$body.toggleClass('is-menu-visible');

		};

		$menu
			.appendTo($body)
			.on('click', function(event) {
				event.stopPropagation();
			})
			.on('click', 'a', function(event) {

				var href = $(this).attr('href');

				event.preventDefault();
				event.stopPropagation();

				// Hide.
					$menu._hide();

				// Redirect.
					if (href == '#menu')
						return;

					window.setTimeout(function() {
						window.location.href = href;
					}, 350);

			})
			.append('<a class="close" href="#menu">Close</a>');

		$body
			.on('click', 'a[href="#menu"]', function(event) {

				event.stopPropagation();
				event.preventDefault();

				// Toggle.
					$menu._toggle();

			})
			.on('click', function(event) {

				// Hide.
					$menu._hide();

			})
			.on('keydown', function(event) {

				// Hide on escape.
					if (event.keyCode == 27)
						$menu._hide();

			});

})(jQuery);