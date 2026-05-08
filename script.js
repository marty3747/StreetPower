// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Smooth scrolling for navigation links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
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
        registrationForm.addEventListener('submit', async function(e) {
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
                alert('Спасибо за регистрацию! Мы свяжемся с вами в ближайшее время.');
                this.reset();
                
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
    window.addEventListener('scroll', function() {
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

    const observer = new IntersectionObserver(function(entries) {
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
        
        // Auto-play (optional)
        setInterval(nextSlide, 5000);
    }
});

