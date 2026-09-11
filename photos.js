const YADISK_PUBLIC_KEY = 'https://disk.yandex.ru/d/PdHlbN_mQPjXUQ';
const YADISK_API = 'https://cloud-api.yandex.net/v1/disk/public/resources';
const HIGHLIGHT_NAME = 'sila_highlight.mp4';
const HIGHLIGHT_RUTUBE = '10161363abff6031eccc1a99455b355e';

function isHighlightItem(item) {
    return (item.name || '').toLowerCase() === HIGHLIGHT_NAME;
}

function isVideoItem(item) {
    return (item.media_type === 'video') || (item.mime_type || '').startsWith('video/');
}

function pickPreview(item, preferred) {
    const sizes = item.sizes || [];
    for (const name of preferred) {
        const found = sizes.find((size) => size.name === name);
        if (found && found.url) return found.url;
    }
    return item.preview || '';
}

async function fetchAlbumItems() {
    const items = [];
    let offset = 0;
    const limit = 200;

    while (true) {
        const params = new URLSearchParams({
            public_key: YADISK_PUBLIC_KEY,
            limit: String(limit),
            offset: String(offset),
            preview_size: 'XL',
        });
        const response = await fetch(`${YADISK_API}?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить архив с Яндекс Диска');
        }
        const data = await response.json();
        const batch = (data._embedded && data._embedded.items) || [];
        items.push(...batch.filter((item) => item.type === 'file'));
        const total = (data._embedded && data._embedded.total) || items.length;
        offset += batch.length;
        if (offset >= total || batch.length === 0) break;
    }

    return items.sort((a, b) => a.name.localeCompare(b.name, 'ru', { numeric: true }));
}

function renderTile(item, index) {
    const video = isVideoItem(item);
    const thumb = pickPreview(item, ['XL', 'L', 'DEFAULT', 'M']);
    const full = video
        ? (item.file || thumb)
        : pickPreview(item, ['XXXL', 'XXL', 'XL', 'ORIGINAL', 'DEFAULT']);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-tile';
    button.dataset.kind = video ? 'video' : 'image';
    button.dataset.full = full;
    button.dataset.preview = thumb;
    button.dataset.index = String(index);
    button.setAttribute('aria-label', video ? `Видео ${item.name}` : `Фото ${item.name}`);

    if (thumb) {
        const img = document.createElement('img');
        img.referrerPolicy = 'no-referrer';
        img.src = thumb;
        img.alt = item.name;
        img.loading = 'lazy';
        button.appendChild(img);
    }

    if (video) {
        const badge = document.createElement('span');
        badge.className = 'photo-tile-play';
        badge.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i>';
        button.appendChild(badge);
    }

    return button;
}

function renderHighlight() {
    const wrap = document.getElementById('photosHighlight');
    const frame = document.getElementById('photosHighlightFrame');
    if (!wrap || !frame) return;

    const player = document.createElement('iframe');
    player.src = `https://rutube.ru/play/embed/${HIGHLIGHT_RUTUBE}`;
    player.title = 'Хайлайт рилс турнира СИЛА УЛИЦ #1';
    player.allow = 'clipboard-write; autoplay';
    player.allowFullscreen = true;
    frame.replaceChildren(player);
    wrap.hidden = false;
}

function applyFilter(grid, filter) {
    grid.querySelectorAll('.photo-tile').forEach((tile) => {
        tile.hidden = filter !== 'all' && tile.dataset.kind !== filter;
    });
}

function openLightbox(items, startIndex) {
    const visible = items.filter((el) => !el.hidden);
    if (!visible.length) return;

    let index = visible.findIndex((el) => el === items[startIndex] || Number(el.dataset.index) === startIndex);
    if (index < 0) index = 0;

    const overlay = document.getElementById('photoLightbox');
    const stage = document.getElementById('photoLightboxStage');
    const closeBtn = document.getElementById('photoLightboxClose');
    const prevBtn = document.getElementById('photoLightboxPrev');
    const nextBtn = document.getElementById('photoLightboxNext');
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let axis = null;
    let didSwipe = false;
    let scale = 1;
    let startScale = 1;
    let pinchStartDist = 0;
    let pinching = false;
    let panning = false;
    let translateX = 0;
    let translateY = 0;
    let lastTX = 0;
    let lastTY = 0;
    let panStartX = 0;
    let panStartY = 0;
    let lastTap = 0;

    function mediaEl() {
        return stage.querySelector('.photo-lightbox-media');
    }

    function isImage() {
        const media = mediaEl();
        return Boolean(media && media.tagName === 'IMG');
    }

    function applyTransform(animate) {
        const media = mediaEl();
        if (!media) return;
        media.style.transition = animate ? 'transform 0.2s ease' : 'none';
        media.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    function resetZoom(animate) {
        scale = 1;
        startScale = 1;
        translateX = 0;
        translateY = 0;
        lastTX = 0;
        lastTY = 0;
        applyTransform(animate);
        const media = mediaEl();
        if (media) media.style.cursor = '';
    }

    function clampScale(value) {
        return Math.min(4, Math.max(1, value));
    }

    function zoomAt(nextScale, clientX, clientY, animate) {
        if (!isImage()) return;
        const media = mediaEl();
        const next = clampScale(nextScale);
        if (next === scale) return;
        if (clientX != null && clientY != null && media) {
            const rect = media.getBoundingClientRect();
            const ox = clientX - (rect.left + rect.width / 2);
            const oy = clientY - (rect.top + rect.height / 2);
            const ratio = next / scale;
            translateX -= ox * (ratio - 1);
            translateY -= oy * (ratio - 1);
        }
        scale = next;
        lastTX = translateX;
        lastTY = translateY;
        if (scale <= 1.02) {
            resetZoom(animate);
            return;
        }
        applyTransform(animate);
        media.style.cursor = 'grab';
    }

    function pinchDistance(touches) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    }

    function show(nextIndex) {
        index = (nextIndex + visible.length) % visible.length;
        const tile = visible[index];
        tracking = false;
        pinching = false;
        panning = false;
        axis = null;
        scale = 1;
        startScale = 1;
        translateX = 0;
        translateY = 0;
        lastTX = 0;
        lastTY = 0;
        stage.replaceChildren();
        if (tile.dataset.kind === 'video') {
            const video = document.createElement('video');
            video.className = 'photo-lightbox-media';
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            video.referrerPolicy = 'no-referrer';
            video.poster = tile.dataset.preview || '';
            video.src = tile.dataset.full;
            stage.appendChild(video);
        } else {
            const img = document.createElement('img');
            img.className = 'photo-lightbox-media';
            img.referrerPolicy = 'no-referrer';
            img.draggable = false;
            img.alt = tile.getAttribute('aria-label') || '';
            img.src = tile.dataset.full || tile.dataset.preview;
            img.style.cursor = 'zoom-in';
            stage.appendChild(img);
        }
    }

    function onTouchStart(event) {
        if (event.target.closest('button')) return;

        if (event.touches.length === 2 && isImage()) {
            event.preventDefault();
            pinching = true;
            tracking = false;
            panning = false;
            axis = null;
            startScale = scale;
            pinchStartDist = pinchDistance(event.touches) || 1;
            applyTransform(false);
            return;
        }

        if (event.touches.length !== 1) return;

        pinching = false;
        if (scale > 1 && isImage()) {
            panning = true;
            tracking = false;
            axis = null;
            panStartX = event.touches[0].clientX;
            panStartY = event.touches[0].clientY;
            applyTransform(false);
            return;
        }

        const now = Date.now();
        if (isImage() && now - lastTap < 280) {
            event.preventDefault();
            lastTap = 0;
            if (scale > 1) {
                resetZoom(true);
            } else {
                scale = 2;
                startScale = 2;
                applyTransform(true);
            }
            return;
        }
        lastTap = now;

        tracking = true;
        panning = false;
        axis = null;
        didSwipe = false;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
    }

    function lockPageScroll() {
        const scrollY = window.scrollY;
        document.documentElement.classList.add('lightbox-open');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.body.dataset.lightboxScroll = String(scrollY);
    }

    function unlockPageScroll() {
        const scrollY = Number(document.body.dataset.lightboxScroll || 0);
        document.documentElement.classList.remove('lightbox-open');
        document.documentElement.style.overflow = previousHtmlOverflow;
        document.body.style.overflow = previousOverflow;
        document.body.style.position = previousBodyPosition;
        document.body.style.top = previousBodyTop;
        document.body.style.left = previousBodyLeft;
        document.body.style.right = previousBodyRight;
        document.body.style.width = previousBodyWidth;
        delete document.body.dataset.lightboxScroll;
        window.scrollTo(0, scrollY);
    }

    function shouldAllowNativeTouch(event) {
        return Boolean(event.target.closest('video'));
    }

    function onDocTouchMove(event) {
        if (!shouldAllowNativeTouch(event)) event.preventDefault();
    }

    function onTouchMove(event) {
        if (!shouldAllowNativeTouch(event)) event.preventDefault();

        if (pinching && event.touches.length >= 2 && isImage()) {
            event.preventDefault();
            const dist = pinchDistance(event.touches);
            scale = Math.min(4, Math.max(1, startScale * (dist / pinchStartDist)));
            applyTransform(false);
            didSwipe = true;
            return;
        }

        if (panning && event.touches.length === 1 && scale > 1) {
            event.preventDefault();
            translateX = lastTX + (event.touches[0].clientX - panStartX);
            translateY = lastTY + (event.touches[0].clientY - panStartY);
            applyTransform(false);
            didSwipe = true;
            return;
        }

        if (!tracking || scale > 1) return;
        const dx = event.touches[0].clientX - startX;
        const dy = event.touches[0].clientY - startY;
        if (!axis) {
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        }
        if (axis !== 'h') return;
        didSwipe = Math.abs(dx) > 12;
        translateX = dx;
        translateY = 0;
        scale = 1;
        applyTransform(false);
    }

    function onTouchEnd(event) {
        if (pinching) {
            if (event.touches.length >= 2) return;
            pinching = false;
            startScale = scale;
            lastTX = translateX;
            lastTY = translateY;
            if (scale <= 1.05) {
                resetZoom(true);
                return;
            }
            if (event.touches.length === 1) {
                panning = true;
                panStartX = event.touches[0].clientX;
                panStartY = event.touches[0].clientY;
                applyTransform(false);
                return;
            }
            applyTransform(true);
            return;
        }

        if (panning) {
            panning = false;
            lastTX = translateX;
            lastTY = translateY;
            applyTransform(true);
            return;
        }

        if (!tracking) return;
        tracking = false;
        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch) {
            axis = null;
            resetZoom(true);
            return;
        }
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        const horizontal = axis === 'h';
        axis = null;
        if (horizontal && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            didSwipe = true;
            show(dx < 0 ? index + 1 : index - 1);
            return;
        }
        resetZoom(true);
    }

    function onWheel(event) {
        if (!isImage()) return;
        event.preventDefault();
        const factor = Math.exp(-event.deltaY * 0.0025);
        zoomAt(scale * factor, event.clientX, event.clientY, false);
        startScale = scale;
    }

    function onGestureStart(event) {
        if (!isImage()) return;
        event.preventDefault();
        startScale = scale;
    }

    function onGestureChange(event) {
        if (!isImage()) return;
        event.preventDefault();
        zoomAt(startScale * event.scale, event.clientX, event.clientY, false);
    }

    function onGestureEnd(event) {
        event.preventDefault();
        startScale = scale;
        lastTX = translateX;
        lastTY = translateY;
        if (scale <= 1.05) resetZoom(true);
    }

    function onPointerDown(event) {
        if (event.pointerType === 'touch' || !isImage() || scale <= 1) return;
        if (event.target.closest('button')) return;
        panning = true;
        didSwipe = true;
        panStartX = event.clientX;
        panStartY = event.clientY;
        applyTransform(false);
        const media = mediaEl();
        if (media) media.style.cursor = 'grabbing';
        if (overlay.setPointerCapture) overlay.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
        if (event.pointerType === 'touch' || !panning || scale <= 1) return;
        translateX = lastTX + (event.clientX - panStartX);
        translateY = lastTY + (event.clientY - panStartY);
        applyTransform(false);
    }

    function onPointerUp(event) {
        if (event.pointerType === 'touch' || !panning) return;
        panning = false;
        lastTX = translateX;
        lastTY = translateY;
        const media = mediaEl();
        if (media) media.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    }

    function onDoubleClick(event) {
        if (!isImage() || event.target.closest('button')) return;
        event.preventDefault();
        if (scale > 1) resetZoom(true);
        else zoomAt(2.2, event.clientX, event.clientY, true);
    }

    function close() {
        const playing = stage.querySelector('video');
        if (playing) playing.pause();
        stage.replaceChildren();
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        unlockPageScroll();
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('touchmove', onDocTouchMove);
        overlay.removeEventListener('touchstart', onTouchStart);
        overlay.removeEventListener('touchmove', onTouchMove);
        overlay.removeEventListener('touchend', onTouchEnd);
        overlay.removeEventListener('touchcancel', onTouchEnd);
        overlay.removeEventListener('wheel', onWheel);
        overlay.removeEventListener('gesturestart', onGestureStart);
        overlay.removeEventListener('gesturechange', onGestureChange);
        overlay.removeEventListener('gestureend', onGestureEnd);
        overlay.removeEventListener('pointerdown', onPointerDown);
        overlay.removeEventListener('pointermove', onPointerMove);
        overlay.removeEventListener('pointerup', onPointerUp);
        overlay.removeEventListener('pointercancel', onPointerUp);
        overlay.removeEventListener('dblclick', onDoubleClick);
    }

    function onKey(event) {
        if (event.key === 'Escape') close();
        if (event.key === 'ArrowRight') show(index + 1);
        if (event.key === 'ArrowLeft') show(index - 1);
    }

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    lockPageScroll();
    show(index);
    document.addEventListener('keydown', onKey);
    document.addEventListener('touchmove', onDocTouchMove, { passive: false });
    overlay.addEventListener('touchstart', onTouchStart, { passive: false });
    overlay.addEventListener('touchmove', onTouchMove, { passive: false });
    overlay.addEventListener('touchend', onTouchEnd);
    overlay.addEventListener('touchcancel', onTouchEnd);
    overlay.addEventListener('wheel', onWheel, { passive: false });
    overlay.addEventListener('gesturestart', onGestureStart);
    overlay.addEventListener('gesturechange', onGestureChange);
    overlay.addEventListener('gestureend', onGestureEnd);
    overlay.addEventListener('pointerdown', onPointerDown);
    overlay.addEventListener('pointermove', onPointerMove);
    overlay.addEventListener('pointerup', onPointerUp);
    overlay.addEventListener('pointercancel', onPointerUp);
    overlay.addEventListener('dblclick', onDoubleClick);
    closeBtn.onclick = close;
    prevBtn.onclick = () => show(index - 1);
    nextBtn.onclick = () => show(index + 1);
    overlay.onclick = (event) => {
        if (didSwipe) {
            didSwipe = false;
            return;
        }
        if (event.target === overlay) close();
    };
}

async function initPhotosAlbum() {
    const grid = document.getElementById('photosGrid');
    const status = document.getElementById('photosStatus');
    const filters = document.getElementById('photosFilters');
    if (!grid || !status || grid.dataset.ready === '1') return;
    grid.dataset.ready = '1';

    try {
        const items = await fetchAlbumItems();
        const albumItems = items.filter((item) => !isHighlightItem(item));
        const photos = albumItems.filter((item) => !isVideoItem(item)).length;
        const videos = albumItems.length - photos;
        status.textContent = `${photos} фото · ${videos} видео`;

        renderHighlight();

        const tiles = albumItems.map((item, index) => renderTile(item, index));
        grid.replaceChildren(...tiles);
        applyFilter(grid, 'image');

        tiles.forEach((tile, index) => {
            tile.addEventListener('click', () => openLightbox(tiles, index));
        });

        if (filters) {
            filters.addEventListener('click', (event) => {
                const button = event.target.closest('[data-filter]');
                if (!button) return;
                filters.querySelectorAll('[data-filter]').forEach((el) => {
                    el.classList.toggle('is-active', el === button);
                });
                applyFilter(grid, button.dataset.filter);
            });
        }
    } catch (error) {
        status.innerHTML = `Не получилось открыть архив прямо здесь. <a href="${YADISK_PUBLIC_KEY}" target="_blank" rel="noopener noreferrer">Открыть папку на Яндекс Диске</a>`;
        grid.innerHTML = '';
        grid.dataset.ready = '';
    }
}

window.initPhotosAlbum = initPhotosAlbum;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhotosAlbum);
} else {
    initPhotosAlbum();
}
