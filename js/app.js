document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const logo = document.getElementById('logo');
    const downloadToast = document.getElementById('downloadToast');
    const toastMsg = document.getElementById('downloadToastMessage');
    const ossVersionBadge = document.getElementById('oss-version-badge');
    const androidVersionBadge = document.getElementById('android-version-badge');
    const windowsVersionBadge = document.getElementById('windows-version-badge');

    let allReleases = [
        {
            tag_name: "5.9.0",
            name: "AirBeats v5.9.0",
            published_at: "2026-07-20T08:00:00Z",
            body: "### ✨ AirBeats v5.9.0 Release Notes\n- 🎵 **Enhanced YouTube Music Integration**\n- ⚡ Performance optimizations and lower RAM consumption\n- 🎨 Material Design 3 UI polish and dynamic color updates",
            assets: [
                { name: "AirBeats_v5.9.0_signed.apk", size: 35000000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.9.0/AirBeats_v5.9.0_signed.apk" }
            ]
        },
        {
            tag_name: "V5.8.0",
            name: "AirBeats V5.8.0",
            published_at: "2026-07-10T08:00:00Z",
            body: "### ✨ AirBeats V5.8.0\n- Android Signed APK release v5.8.0",
            assets: [
                { name: "AirBeats_v5.8.0_signed.apk", size: 34800000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/V5.8.0/AirBeats_v5.8.0_signed.apk" }
            ]
        },
        {
            tag_name: "5.7.0",
            name: "AirBeats v5.7.0",
            published_at: "2026-06-15T08:00:00Z",
            body: "### ✨ AirBeats v5.7.0 Dual Release\n- 💻 **Windows Desktop Setup & Portable Builds**\n- 📱 **Android Signed APK**",
            assets: [
                { name: "Airbeats-v5.7.0-setup.exe", size: 45000000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.7.0/Airbeats-v5.7.0-setup.exe" },
                { name: "Airbeats-v5.7.0-potable.exe", size: 42000000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.7.0/Airbeats-v5.7.0-potable.exe" },
                { name: "AirBeats_v5.7.0_signed.apk", size: 34000000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.7.0/AirBeats_v5.7.0_signed.apk" }
            ]
        }
    ];

    let latestRelease = allReleases[0];

    // 1. Toast Notification Helper
    function showToast(msg) {
        if (!downloadToast || !toastMsg) return;
        toastMsg.textContent = msg;
        downloadToast.classList.add('show');
        setTimeout(() => downloadToast.classList.remove('show'), 3500);
    }

    // 2. Logo Rhythm Audio Player
    let audioPlayer = new Audio('rhythm.mp3');
    let isPlayingAudio = false;

    if (logo) {
        logo.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isPlayingAudio) {
                audioPlayer.play().then(() => {
                    isPlayingAudio = true;
                    logo.classList.add('playing');
                    showToast('🎵 Playing AirBeats Rhythm audio sample...');
                }).catch(err => {
                    console.warn('Audio playback error:', err);
                    showToast('Error playing rhythm.mp3 audio');
                });
            } else {
                audioPlayer.pause();
                isPlayingAudio = false;
                logo.classList.remove('playing');
                showToast('⏸️ Rhythm sample audio paused');
            }
        });

        audioPlayer.addEventListener('ended', () => {
            isPlayingAudio = false;
            logo.classList.remove('playing');
            showToast('🎵 Rhythm sample playback finished');
        });
    }

    // 3. GitHub Releases API Fetching
    async function fetchReleases() {
        const repos = [
            "https://api.github.com/repos/d0x-dev/AirBeats/releases",
            "https://api.github.com/repos/drkvenom786/Airbeats/releases"
        ];
        
        for (const url of repos) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        allReleases = data.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
                        latestRelease = allReleases[0];
                        updateVersionBadges();
                        return;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch GitHub releases from", url, e);
            }
        }
        updateVersionBadges();
    }

    function formatVersionTag(tag) {
        if (!tag) return 'v5.9.0';
        return tag.startsWith('v') || tag.startsWith('V') ? tag : `v${tag}`;
    }

    function updateVersionBadges() {
        if (!latestRelease) return;
        const tag = formatVersionTag(latestRelease.tag_name);

        if (ossVersionBadge) ossVersionBadge.textContent = `${tag} (Latest Stable)`;
        if (androidVersionBadge) androidVersionBadge.textContent = tag;

        // Find latest Windows release
        const winRelease = allReleases.find(r => r.assets && r.assets.some(a => /\.exe$/i.test(a.name)));
        if (windowsVersionBadge && winRelease) {
            windowsVersionBadge.textContent = formatVersionTag(winRelease.tag_name);
        }
    }

    // 4. Screenshots Section Accordion & Carousel
    const screenshotsHeader = document.getElementById('screenshots-header');
    const screenshotsToggle = document.getElementById('screenshots-toggle');
    const screenshotsContent = document.getElementById('screenshots-content');
    const screenshotsIcon = document.getElementById('screenshots-icon');

    if (screenshotsHeader && screenshotsContent) {
        screenshotsHeader.addEventListener('click', () => {
            const isCollapsed = screenshotsContent.style.maxHeight === '0px';
            if (isCollapsed) {
                screenshotsContent.style.maxHeight = '2000px';
                if (screenshotsIcon) screenshotsIcon.classList.add('rotated');
            } else {
                screenshotsContent.style.maxHeight = '0px';
                if (screenshotsIcon) screenshotsIcon.classList.remove('rotated');
            }
        });
    }

    // Screenshots Stage Navigation
    const track = document.getElementById('screenshots-track');
    const slides = document.querySelectorAll('.screenshots-slide');
    const prevBtn = document.getElementById('screenshots-prev');
    const nextBtn = document.getElementById('screenshots-next');
    const titleEl = document.getElementById('screenshots-title');
    const descEl = document.getElementById('screenshots-description');
    const indexEl = document.getElementById('screenshots-current-index');
    const indicatorsEl = document.getElementById('screenshots-indicators');
    const previewCards = document.querySelectorAll('.screenshots-preview-card');

    let currentSlide = 0;
    const totalSlides = slides.length;

    function buildIndicators() {
        if (!indicatorsEl) return;
        indicatorsEl.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('div');
            dot.className = `screenshots-indicator ${i === currentSlide ? 'is-active' : ''}`;
            dot.addEventListener('click', () => goToSlide(i));
            indicatorsEl.appendChild(dot);
        }
    }

    function goToSlide(index) {
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        currentSlide = index;

        if (track) {
            track.style.transform = `translateX(-${currentSlide * 100}%)`;
        }

        const activeSlide = slides[currentSlide];
        if (activeSlide) {
            if (titleEl) titleEl.textContent = activeSlide.dataset.title || 'Screen View';
            if (descEl) descEl.textContent = activeSlide.dataset.description || '';
        }

        if (indexEl) {
            indexEl.textContent = String(currentSlide + 1).padStart(2, '0');
        }

        // Update indicators
        if (indicatorsEl) {
            const dots = indicatorsEl.querySelectorAll('.screenshots-indicator');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('is-active', idx === currentSlide);
            });
        }

        // Update preview rail
        previewCards.forEach((card, idx) => {
            card.classList.toggle('is-active', idx === currentSlide);
        });
    }

    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

    previewCards.forEach((card, idx) => {
        card.addEventListener('click', () => goToSlide(idx));
    });

    buildIndicators();

    // 5. Changelog Modal Trigger (Parses markdown via marked.js)
    const changelogTrigger = document.getElementById('changelog-trigger');
    const changelogDialog = document.getElementById('changelog-dialog');
    const changelogContent = document.getElementById('changelog-content');

    if (changelogTrigger && changelogDialog) {
        changelogTrigger.addEventListener('click', () => {
            changelogDialog.showModal();
            if (!latestRelease) return;

            let bodyMarkdown = latestRelease.body || '### Release Notes\nNo release notes provided.';
            if (window.marked) {
                changelogContent.innerHTML = `<div class="prose prose-invert max-w-none text-on-surface-variant">${window.marked.parse(bodyMarkdown)}</div>`;
            } else {
                changelogContent.innerHTML = `<pre class="text-sm text-on-surface-variant whitespace-pre-wrap">${bodyMarkdown}</pre>`;
            }
        });
    }

    // 6. Previous Versions Modal Trigger
    const versionsTrigger = document.getElementById('versions-trigger');
    const windowsVersionsTrigger = document.getElementById('windows-versions-trigger');
    const versionsDialog = document.getElementById('versions-dialog');
    const versionsList = document.getElementById('versions-list');

    function renderVersionsModal(filterPlatform = 'all') {
        if (!versionsDialog || !versionsList) return;

        let html = '';
        allReleases.forEach(rel => {
            const tag = formatVersionTag(rel.tag_name);
            const pubDate = rel.published_at ? new Date(rel.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';

            let apkAssets = (rel.assets || []).filter(a => a.name && /\.apk$/i.test(a.name));
            let exeAssets = (rel.assets || []).filter(a => a.name && /\.exe$/i.test(a.name));

            let buttonsHtml = '';
            apkAssets.forEach(a => {
                const size = (a.size / (1024 * 1024)).toFixed(2);
                buttonsHtml += `<a href="${a.browser_download_url}" target="_blank" rel="noopener noreferrer" class="dialog-filled-btn text-xs no-underline flex items-center gap-1"><span class="material-symbols-outlined" style="font-size:16px">android</span> APK (${size} MB)</a>`;
            });
            exeAssets.forEach(a => {
                const size = (a.size / (1024 * 1024)).toFixed(2);
                buttonsHtml += `<a href="${a.browser_download_url}" target="_blank" rel="noopener noreferrer" class="dialog-text-btn border border-primary text-xs no-underline flex items-center gap-1"><span class="material-symbols-outlined" style="font-size:16px">laptop_windows</span> .exe (${size} MB)</a>`;
            });

            if (buttonsHtml !== '') {
                html += `
                    <div class="bg-surface-container-high p-4 rounded-xl mb-3 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-title-md text-on-surface font-bold">${tag}</span>
                                <span class="text-xs text-on-surface-variant">${pubDate}</span>
                            </div>
                            <p class="text-xs text-on-surface-variant mt-1">${rel.name || 'Official Release'}</p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${buttonsHtml}
                        </div>
                    </div>
                `;
            }
        });

        versionsList.innerHTML = html || `<p class="text-on-surface-variant text-center py-4">No previous versions found.</p>`;
        versionsDialog.showModal();
    }

    if (versionsTrigger) {
        versionsTrigger.addEventListener('click', () => renderVersionsModal('android'));
    }
    if (windowsVersionsTrigger) {
        windowsVersionsTrigger.addEventListener('click', () => renderVersionsModal('windows'));
    }

    fetchReleases();
});
