const YADISK_PUBLIC_KEY = 'https://disk.yandex.ru/d/PdHlbN_mQPjXUQ';
const YADISK_API = 'https://cloud-api.yandex.net/v1/disk/public/resources';

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

    function show(nextIndex) {
        index = (nextIndex + visible.length) % visible.length;
        const tile = visible[index];
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
            img.alt = tile.getAttribute('aria-label') || '';
            img.src = tile.dataset.full || tile.dataset.preview;
            stage.appendChild(img);
        }
    }

    function close() {
        const playing = stage.querySelector('video');
        if (playing) playing.pause();
        stage.replaceChildren();
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        document.removeEventListener('keydown', onKey);
    }

    function onKey(event) {
        if (event.key === 'Escape') close();
        if (event.key === 'ArrowRight') show(index + 1);
        if (event.key === 'ArrowLeft') show(index - 1);
    }

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    show(index);
    document.addEventListener('keydown', onKey);
    closeBtn.onclick = close;
    prevBtn.onclick = () => show(index - 1);
    nextBtn.onclick = () => show(index + 1);
    overlay.onclick = (event) => {
        if (event.target === overlay) close();
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('photosGrid');
    const status = document.getElementById('photosStatus');
    const filters = document.getElementById('photosFilters');
    if (!grid || !status) return;

    try {
        const items = await fetchAlbumItems();
        const photos = items.filter((item) => !isVideoItem(item)).length;
        const videos = items.length - photos;
        status.textContent = `${photos} фото · ${videos} видео`;

        const tiles = items.map((item, index) => renderTile(item, index));
        grid.replaceChildren(...tiles);

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
    }
});
