// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function () {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function () {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Smooth scrolling for navigation links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }

            // Close mobile menu if open
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                navToggle.classList.remove('active');
            }
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

    // Header background on scroll
    window.addEventListener('scroll', function () {
        const header = document.querySelector('.header');
        if (window.scrollY > 100) {
            header.style.background = 'rgba(16, 16, 16, 0.92)';
        } else {
            header.style.background = 'rgba(16, 16, 16, 0.78)';
        }
    });

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

    // Observe all cards and sections
    const animatedElements = document.querySelectorAll('.about-card, .group-card, .discipline-card, .award-item, .info-card, .contact-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

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

        function updateCarousel() {
            const translateX = -currentSlide * 100;
            carouselTrack.style.transform = `translateX(${translateX}%)`;

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
            document.addEventListener('keydown', (e) => {
                if (!imageModal.classList.contains('active')) return;
                if (e.key === 'Escape') closeModal();
                if (e.key === 'ArrowRight') modalNextSlide();
                if (e.key === 'ArrowLeft') modalPrevSlide();
            });

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

    // Audio Player Functionality
    const audioToggleBtn = document.getElementById('audio-toggle-btn');
    const bgAudio = document.getElementById('bg-audio');
    const audioTooltip = document.getElementById('audio-tooltip');
    let isPlaying = false;

    if (audioToggleBtn && bgAudio) {
        // Hide tooltip after 10 seconds
        const tooltipTimeout = setTimeout(() => {
            if (audioTooltip) {
                audioTooltip.classList.add('hidden');
            }
        }, 10000);

        audioToggleBtn.addEventListener('click', function () {
            // Hide tooltip immediately on click
            if (audioTooltip) {
                audioTooltip.classList.add('hidden');
                clearTimeout(tooltipTimeout);
            }

            if (isPlaying) {
                bgAudio.pause();
                audioToggleBtn.classList.remove('playing');
                // Optional: change icon back to play state
                audioToggleBtn.innerHTML = '<i class="fas fa-play"></i>';
            } else {
                bgAudio.play().catch(error => {
                    console.log('Автовоспроизведение было заблокировано браузером', error);
                });
                audioToggleBtn.classList.add('playing');
                // Change icon to pause or active music state
                audioToggleBtn.innerHTML = '<i class="fas fa-music"></i>';
            }
            isPlaying = !isPlaying;
        });

        // Initial icon state
        audioToggleBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
});

