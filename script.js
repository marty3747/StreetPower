const PERSIST_AUDIO_IDS = ['bg-audio', 'audio-tooltip', 'audio-toggle-btn'];
const pageCleanups = [];

function cleanupPage() {
    while (pageCleanups.length) {
        try { pageCleanups.pop()(); } catch (error) { /* ignore */ }
    }
}

function closeMobileNav() {
    document.querySelector('.nav-links')?.classList.remove('active');
    document.querySelector('.nav-toggle')?.classList.remove('active');
}

function loadEventMap() {
    const box = document.querySelector('.map-container[data-src]');
    if (!box || box.dataset.mapReady === '1') return;
    const src = box.getAttribute('data-src');
    if (!src) return;

    box.dataset.mapReady = '1';
    const x = window.scrollX;
    const y = window.scrollY;
    const pin = () => window.scrollTo(x, y);

    const iframe = document.createElement('iframe');
    iframe.title = 'Яндекс карта — место проведения';
    iframe.tabIndex = -1;
    iframe.setAttribute('loading', 'lazy');
    iframe.addEventListener('load', pin, { once: true });
    iframe.src = src;
    box.appendChild(iframe);

    pin();
    requestAnimationFrame(pin);
    setTimeout(pin, 50);
    setTimeout(pin, 250);
}

function initEventMap() {
    const box = document.querySelector('.map-container[data-src]');
    if (!box) return;

    const io = new IntersectionObserver((entries) => {
        const visible = entries.some((entry) => {
            if (!entry.isIntersecting) return false;
            const rect = entry.boundingClientRect;
            const vh = window.innerHeight || 0;
            return rect.top < vh + 80 && rect.bottom > -80;
        });
        if (!visible) return;
        loadEventMap();
        io.disconnect();
    }, { rootMargin: '80px 0px', threshold: 0.01 });

    io.observe(box);
    pageCleanups.push(() => io.disconnect());
}

function scrollToHash(hash) {
    if (!hash || hash === '#') return false;
    const target = document.querySelector(hash);
    if (!target) return false;
    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
    window.scrollTo({
        top: target.getBoundingClientRect().top + window.pageYOffset - headerHeight,
        behavior: 'smooth'
    });
    return true;
}

function initPage() {
    cleanupPage();

    // Smooth scrolling for navigation links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }

            closeMobileNav();
        });
    });

    // Registration form submission
    const registrationForm = document.querySelector('.registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(this);

            // Basic validation
            const surname = formData.get('surname');
            const name = formData.get('name');
            const age = formData.get('age');
            const telegram = formData.get('telegram');
            const privacy = formData.get('privacy');

            if (!surname || !name || !age || !telegram) {
                alert('Пожалуйста, заполните все обязательные поля');
                return;
            }

            if (!privacy) {
                alert('Необходимо согласие на обработку персональных данных');
                return;
            }

            if (age < 15) {
                alert('Минимальный возраст для участия - 15 лет');
                return;
            }

            // Show loading state
            const submitButton = this.querySelector('.submit-button');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Отправка...';
            submitButton.disabled = true;

            try {
                // Отправляем данные в Google Sheets через GET запрос
                const params = new URLSearchParams({
                    surname: surname,
                    name: name,
                    patronymic: formData.get('patronymic') || '',
                    age: age,
                    telegram: telegram
                });

                const response = await fetch(`https://script.google.com/macros/s/AKfycbxfIh2RT08CpjQF9bygcVwqWm-ShLERB9PYSDI03mB-vLJvvNkf8Cg45KwalkgpZ7ZE/exec?${params}`, {
                    method: 'GET',
                    mode: 'no-cors'
                });

                // При использовании no-cors мы не можем прочитать ответ
                // Но если запрос выполнился без ошибки, считаем успешным
                document.getElementById('registration-title').style.display = 'none';
                document.getElementById('registration-form').style.display = 'none';
                document.getElementById('registration-success').style.display = 'block';

                // Скролл к секции регистрации после успеха
                const regSection = document.getElementById('registration');
                if (regSection) {
                    const headerHeight = document.querySelector('.header') ? document.querySelector('.header').offsetHeight : 0;
                    window.scrollTo({
                        top: regSection.offsetTop - headerHeight,
                        behavior: 'smooth'
                    });
                }

            } catch (error) {
                alert('Произошла ошибка при отправке формы. Проверьте подключение к интернету и попробуйте еще раз.');
                console.error('Ошибка:', error);
            } finally {
                // Reset button state
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        });
    }

    // Add animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    pageCleanups.push(() => observer.disconnect());

    // Observe all cards and sections
    const animatedElements = document.querySelectorAll('.about-card, .group-card, .discipline-card, .award-item, .info-card, .contact-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    initEventMap();

    // Partners image fallback
    const partnerImg = document.querySelector('.partner-img');
    const partnerPlaceholder = document.querySelector('.partner-placeholder');
    if (partnerImg && partnerPlaceholder) {
        partnerImg.addEventListener('error', () => {
            partnerImg.style.display = 'none';
            partnerPlaceholder.style.display = 'inline-block';
        });
    }

    // Carousel functionality
    const carouselTrack = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const indicators = document.querySelectorAll('.indicator');

    if (carouselTrack && prevBtn && nextBtn) {
        let currentSlide = 0;
        const totalSlides = carouselTrack.children.length;

        const RUTUBE_ID = '10161363abff6031eccc1a99455b355e';

        function stopCarouselVideo() {
            const player = carouselTrack.querySelector('.carousel-video-player');
            if (player) {
                player.src = '';
                player.remove();
            }
            const poster = document.getElementById('carouselVideo');
            if (poster) poster.hidden = false;
        }

        function playCarouselVideo() {
            const slide = carouselTrack.querySelector('.carousel-slide--video');
            const poster = document.getElementById('carouselVideo');
            if (!slide || !poster) return;

            poster.hidden = true;
            let player = slide.querySelector('.carousel-video-player');
            if (!player) {
                player = document.createElement('iframe');
                player.className = 'carousel-video-player';
                player.title = 'Хайлайт турнира СИЛА УЛИЦ';
                player.setAttribute('allow', 'clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture');
                player.setAttribute('allowfullscreen', '');
                player.setAttribute('frameborder', '0');
                slide.appendChild(player);
            }
            player.src = `https://rutube.ru/play/embed/${RUTUBE_ID}?autoplay=1`;
        }

        function updateCarousel() {
            const translateX = -currentSlide * 100;
            carouselTrack.style.transform = `translateX(${translateX}%)`;

            if (!carouselTrack.children[currentSlide].classList.contains('carousel-slide--video')) {
                stopCarouselVideo();
            }

            // Update indicators
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === currentSlide);
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            updateCarousel();
        }

        function prevSlide() {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            updateCarousel();
        }

        // Event listeners
        nextBtn.addEventListener('click', nextSlide);
        prevBtn.addEventListener('click', prevSlide);

        const videoPoster = document.getElementById('carouselVideo');
        if (videoPoster) {
            videoPoster.addEventListener('click', (e) => {
                e.stopPropagation();
                playCarouselVideo();
            });
        }

        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                currentSlide = index;
                updateCarousel();
            });
        });

        // Touch events for mobile swipe
        let startX = 0;
        let isDragging = false;

        carouselTrack.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            // Optional: stop auto-play when user interacts
        }, { passive: true });

        carouselTrack.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const currentX = e.touches[0].clientX;
            const diff = startX - currentX;

            // Если свайп достаточно длинный (например, > 50px), переключаем слайд
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
                isDragging = false; // Отключаем дальнейшее срабатывание до нового touchstart
            }
        }, { passive: true });

        carouselTrack.addEventListener('touchend', () => {
            isDragging = false;
        });

        // Auto-play (optional)
        // setInterval(nextSlide, 5000); // Disabled to prevent annoying jumps when user reads or interacts

        // --- Image Modal functionality ---
        const imageModal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImg');
        const modalClose = document.getElementById('modalClose');
        const modalPrev = document.getElementById('modalPrev');
        const modalNext = document.getElementById('modalNext');
        const carouselImages = document.querySelectorAll('.carousel-img');

        let currentModalIndex = 0;

        function openModal(index) {
            currentModalIndex = index;
            modalImg.src = carouselImages[currentModalIndex].src;
            imageModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // prevent bg scroll
        }

        function closeModal() {
            imageModal.classList.remove('active');
            document.body.style.overflow = '';
        }

        function modalNextSlide() {
            currentModalIndex = (currentModalIndex + 1) % carouselImages.length;
            modalImg.src = carouselImages[currentModalIndex].src;
        }

        function modalPrevSlide() {
            currentModalIndex = (currentModalIndex - 1 + carouselImages.length) % carouselImages.length;
            modalImg.src = carouselImages[currentModalIndex].src;
        }

        carouselImages.forEach((img, index) => {
            img.addEventListener('click', () => {
                openModal(index);
            });
        });

        if (imageModal) {
            modalClose.addEventListener('click', closeModal);
            modalNext.addEventListener('click', (e) => { e.stopPropagation(); modalNextSlide(); });
            modalPrev.addEventListener('click', (e) => { e.stopPropagation(); modalPrevSlide(); });

            // Close when clicking outside image
            imageModal.addEventListener('click', (e) => {
                if (e.target === imageModal || e.target.classList.contains('modal-content-wrapper')) {
                    closeModal();
                }
            });

            // Keyboard navigation
            const onModalKey = (e) => {
                if (!imageModal.classList.contains('active')) return;
                if (e.key === 'Escape') closeModal();
                if (e.key === 'ArrowRight') modalNextSlide();
                if (e.key === 'ArrowLeft') modalPrevSlide();
            };
            document.addEventListener('keydown', onModalKey);
            pageCleanups.push(() => document.removeEventListener('keydown', onModalKey));

            // Modal Swipe, Pan, and Zoom for Mobile
            let modalStartX = 0;
            let modalStartY = 0;
            let modalIsDragging = false;

            let currentScale = 1;
            let initialDistance = 0;
            let isPinching = false;
            let lastTapTime = 0;

            let translateX = 0;
            let translateY = 0;
            let lastTranslateX = 0;
            let lastTranslateY = 0;

            function resetZoom() {
                currentScale = 1;
                translateX = 0;
                translateY = 0;
                lastTranslateX = 0;
                lastTranslateY = 0;
                modalImg.style.transform = `translate(0px, 0px) scale(1)`;
                modalImg.style.cursor = 'grab';
            }

            modalNext.addEventListener('click', resetZoom);
            modalPrev.addEventListener('click', resetZoom);

            imageModal.addEventListener('touchstart', (e) => {
                if (e.touches.length === 2) {
                    isPinching = true;
                    modalIsDragging = false;
                    initialDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    modalImg.style.transition = 'none';
                } else if (e.touches.length === 1) {
                    const currentTime = new Date().getTime();
                    const tapLength = currentTime - lastTapTime;
                    if (tapLength < 300 && tapLength > 0) {
                        e.preventDefault();
                        if (currentScale > 1) {
                            resetZoom();
                        } else {
                            currentScale = 2;
                            modalImg.style.transform = `translate(0px, 0px) scale(${currentScale})`;
                            modalImg.style.transition = 'transform 0.25s ease';
                        }
                    } else {
                        modalImg.style.transition = 'none';
                    }
                    lastTapTime = currentTime;

                    isPinching = false;
                    modalStartX = e.touches[0].clientX;
                    modalStartY = e.touches[0].clientY;
                    modalIsDragging = true;
                }
            }, { passive: false });

            imageModal.addEventListener('touchmove', (e) => {
                if (isPinching && e.touches.length === 2) {
                    e.preventDefault();
                    const currentDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    const scaleDiff = currentDistance / initialDistance;
                    let newScale = currentScale * scaleDiff;

                    if (newScale < 1) newScale = 1;
                    if (newScale > 4) newScale = 4;

                    modalImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${newScale})`;
                } else if (modalIsDragging && e.touches.length === 1) {
                    const diffX = e.touches[0].clientX - modalStartX;
                    const diffY = e.touches[0].clientY - modalStartY;

                    if (currentScale > 1) {
                        e.preventDefault();
                        translateX = lastTranslateX + diffX;
                        translateY = lastTranslateY + diffY;
                        modalImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
                    } else {
                        if (Math.abs(diffX) > 50) {
                            if (diffX > 0) {
                                resetZoom();
                                modalPrevSlide();
                            } else {
                                resetZoom();
                                modalNextSlide();
                            }
                            modalIsDragging = false;
                        }
                    }
                }
            }, { passive: false });

            imageModal.addEventListener('touchend', (e) => {
                if (isPinching) {
                    isPinching = false;
                    const transform = modalImg.style.transform;
                    const match = transform.match(/scale\(([^)]+)\)/);
                    if (match) currentScale = parseFloat(match[1]);
                    lastTranslateX = translateX;
                    lastTranslateY = translateY;
                } else if (modalIsDragging) {
                    modalIsDragging = false;
                    lastTranslateX = translateX;
                    lastTranslateY = translateY;
                }
                modalImg.style.transition = 'transform 0.25s ease';
            });

            // PC Double click zoom
            modalImg.addEventListener('dblclick', () => {
                if (currentScale > 1) {
                    resetZoom();
                } else {
                    currentScale = 2;
                    modalImg.style.transform = `translate(0px, 0px) scale(${currentScale})`;
                    modalImg.style.cursor = 'zoom-out';
                }
            });
        }
    }

}

function initAudioOnce() {
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    const bgAudio = document.getElementById('bg-audio');
    const audioTooltip = document.getElementById('audio-tooltip');
    if (!audioToggleBtn || !bgAudio || audioToggleBtn.dataset.bound === '1') return;

    audioToggleBtn.dataset.bound = '1';
    bgAudio.volume = 1;
    bgAudio.preload = 'auto';
    let isPlaying = false;

    const setStopped = () => {
        isPlaying = false;
        audioToggleBtn.classList.remove('playing');
        audioToggleBtn.innerHTML = '<i class="fas fa-play"></i>';
    };

    const setPlaying = () => {
        isPlaying = true;
        audioToggleBtn.classList.add('playing');
        audioToggleBtn.innerHTML = '<i class="fas fa-music"></i>';
    };

    const tooltipTimeout = setTimeout(() => {
        if (audioTooltip) audioTooltip.classList.add('hidden');
    }, 10000);

    bgAudio.addEventListener('error', () => {
        console.error('Не удалось загрузить аудио', bgAudio.error);
        setStopped();
    });

    audioToggleBtn.addEventListener('click', function () {
        if (audioTooltip) {
            audioTooltip.classList.add('hidden');
            clearTimeout(tooltipTimeout);
        }

        if (isPlaying) {
            bgAudio.pause();
            setStopped();
            return;
        }

        const playPromise = bgAudio.play();
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(setPlaying).catch((error) => {
                console.error('Не удалось включить музыку', error);
                setStopped();
            });
        } else {
            setPlaying();
        }
    });

    setStopped();
}

function initHeaderScroll() {
    window.addEventListener('scroll', function () {
        const header = document.querySelector('.header');
        if (!header) return;
        header.style.background = window.scrollY > 100
            ? 'rgba(16, 16, 16, 0.92)'
            : 'rgba(16, 16, 16, 0.78)';
    });
}

function shouldHandleInternally(anchor, event) {
    if (!anchor || event.defaultPrevented || event.button !== 0) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (anchor.target && anchor.target !== '_self') return false;
    if (anchor.hasAttribute('download')) return false;
    const raw = anchor.getAttribute('href');
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return false;
    let dest;
    try { dest = new URL(anchor.href); } catch { return false; }
    if (dest.origin !== location.origin) return false;
    if (/\.(pdf|docx?|xlsx?|zip|mp3|mp4)$/i.test(dest.pathname)) return false;
    return dest;
}

function freezeResolvedAssets(doc, pageUrl) {
    const base = doc.createElement('base');
    base.href = new URL(pageUrl, location.origin).href;
    doc.head.prepend(base);

    doc.querySelectorAll('[src], [poster]').forEach((el) => {
        ['src', 'poster'].forEach((attr) => {
            if (!el.hasAttribute(attr)) return;
            const raw = el.getAttribute(attr);
            if (!raw || /^(data:|blob:|javascript:)/i.test(raw)) return;
            const resolved = el[attr];
            if (resolved) el.setAttribute(attr, resolved);
        });
    });
}

async function ensurePageScriptsFromList(scripts, pageUrl) {
    for (const script of scripts) {
        const src = script.getAttribute('src');
        if (!src) continue;
        const abs = new URL(src, pageUrl).href;
        if (/\/script\.js(\?|$)/.test(abs)) continue;
        if ([...document.scripts].some((existing) => existing.src === abs)) continue;
        await new Promise((resolve, reject) => {
            const el = document.createElement('script');
            el.src = abs;
            el.onload = resolve;
            el.onerror = reject;
            document.body.appendChild(el);
        });
    }
}

let navigating = false;

async function navigateTo(url, push) {
    if (navigating) return;
    navigating = true;
    try {
        const response = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } });
        if (!response.ok) throw new Error('nav');
        const html = await response.text();
        const next = new DOMParser().parseFromString(html, 'text/html');
        const persist = PERSIST_AUDIO_IDS
            .map((id) => document.getElementById(id))
            .filter(Boolean);
        const dest = new URL(url, location.href);
        const extraScripts = [...next.querySelectorAll('script[src]')];
        next.querySelectorAll('script').forEach((el) => el.remove());
        PERSIST_AUDIO_IDS.forEach((id) => next.getElementById(id)?.remove());
        freezeResolvedAssets(next, dest.href);
        [...document.body.children].forEach((el) => {
            if (!persist.includes(el)) el.remove();
        });
        while (next.body.firstChild) {
            document.body.insertBefore(next.body.firstChild, persist[0] || null);
        }
        persist.forEach((el) => document.body.appendChild(el));

        document.title = next.title;
        document.body.className = next.body.className;
        if (push) history.pushState({ url: dest.href }, next.title, dest.href);

        closeMobileNav();
        window.scrollTo(0, 0);
        await ensurePageScriptsFromList(extraScripts, dest.href);
        initPage();
        if (typeof window.initPhotosAlbum === 'function') {
            window.initPhotosAlbum();
        }
        if (dest.hash) {
            requestAnimationFrame(() => scrollToHash(dest.hash));
        }
    } catch (error) {
        location.href = url;
    } finally {
        navigating = false;
    }
}

function bindPersistentNavigation() {
    document.addEventListener('click', (event) => {
        const toggle = event.target.closest('.nav-toggle');
        if (toggle) {
            document.querySelector('.nav-links')?.classList.toggle('active');
            document.querySelector('.nav-toggle')?.classList.toggle('active');
            return;
        }

        const anchor = event.target.closest('a');
        const dest = shouldHandleInternally(anchor, event);
        if (!dest) return;

        const samePage = dest.pathname === location.pathname && dest.search === location.search;
        if (samePage) {
            if (dest.hash) {
                event.preventDefault();
                scrollToHash(dest.hash);
                closeMobileNav();
            }
            return;
        }

        event.preventDefault();
        navigateTo(dest.href, true);
    });

    window.addEventListener('popstate', () => {
        navigateTo(location.href, false);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    initAudioOnce();
    initHeaderScroll();
    initPage();
    bindPersistentNavigation();
});

