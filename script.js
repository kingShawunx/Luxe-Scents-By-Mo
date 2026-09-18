function toggleMenu() {
    var nav = document.getElementById("nav-menu");
    var btn = document.querySelector(".menu-btn");
    var expanded = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("active");
}

function initGallery(gallery) {
    var slides = Array.prototype.slice.call(gallery.querySelectorAll("[data-gallery-slide]"));
    var dotsContainer = gallery.querySelector(".gallery-dots");
    var counter = gallery.querySelector(".gallery-counter-current");
    if (slides.length < 2 || !dotsContainer) return;

    var currentIndex = 0;
    var dots = [];
    var timer;

    function createDots() {
        slides.forEach(function (_, index) {
            var dot = document.createElement("span");
            dot.setAttribute("aria-hidden", "true");
            dotsContainer.appendChild(dot);
            dots.push(dot);
        });
    }

    function showSlide(nextIndex) {
        currentIndex = (nextIndex + slides.length) % slides.length;

        slides.forEach(function (slide, index) {
            var isActive = index === currentIndex;
            slide.classList.toggle("is-active", isActive);
            slide.setAttribute("aria-hidden", String(!isActive));
        });

        dots.forEach(function (dot, index) {
            dot.classList.toggle("is-active", index === currentIndex);
        });

        if (counter) {
            counter.textContent = String(currentIndex + 1).padStart(2, "0");
        }
    }

    function advance() {
        showSlide(currentIndex + 1);
    }

    function start() {
        if (!timer) {
            timer = window.setInterval(advance, 4000);
        }
    }

    function stop() {
        window.clearInterval(timer);
        timer = null;
    }

    createDots();
    showSlide(0);
    start();

    gallery.addEventListener("mouseenter", stop);
    gallery.addEventListener("mouseleave", start);
    gallery.addEventListener("focusin", stop);
    gallery.addEventListener("focusout", start);

    window.addEventListener("pagehide", stop);
}

Array.prototype.slice.call(document.querySelectorAll("[data-gallery-slider]")).forEach(initGallery);
