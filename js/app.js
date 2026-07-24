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
        },
        {
            tag_name: "5.6.0",
            name: "AirBeats v5.6.0",
            published_at: "2026-06-01T08:00:00Z",
            body: "### ✨ AirBeats v5.6.0 Dual Release\n- 💻 **Windows Desktop Executable**\n- 📱 **Android Signed APK**",
            assets: [
                { name: "Airbeats-v5.6.0-setup.exe", size: 44000000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.6.0/Airbeats-v5.6.0-setup.exe" },
                { name: "Airbeats-v5.6.0-Potable.exe", size: 41000000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.6.0/Airbeats-v5.6.0-Potable.exe" },
                { name: "AirBeats_v5.6.0_signed.apk", size: 33500000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.6.0/AirBeats_v5.6.0_signed.apk" }
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

        // Find latest Windows release containing .exe
        const winRelease = allReleases.find(r => r.assets && r.assets.some(a => /\.exe$/i.test(a.name)));
        if (windowsVersionBadge && winRelease) {
            windowsVersionBadge.textContent = formatVersionTag(winRelease.tag_name);
            const winDownloadBtn = document.getElementById('windows-download-btn');
            const winExeAsset = winRelease.assets.find(a => /\.exe$/i.test(a.name));
            if (winDownloadBtn && winExeAsset) {
                winDownloadBtn.href = winExeAsset.browser_download_url;
            }
        }
    }

    // 4. Screenshots Section Accordion & Carousel Stage
    const screenshotsHeader = document.getElementById('screenshots-header');
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

    // Screenshots Carousel Logic
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

        if (indicatorsEl) {
            const dots = indicatorsEl.querySelectorAll('.screenshots-indicator');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('is-active', idx === currentSlide);
            });
        }

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

    // 5. Changelog Modal Triggers
    const changelogTrigger = document.getElementById('changelog-trigger');
    const windowsChangelogTrigger = document.getElementById('windows-changelog-trigger');
    const changelogDialog = document.getElementById('changelog-dialog');
    const changelogContent = document.getElementById('changelog-content');

    function openChangelogModal(targetRel) {
        if (!changelogDialog || !changelogContent) return;
        changelogDialog.showModal();
        const rel = targetRel || latestRelease;
        if (!rel) return;

        let bodyMarkdown = `### ${rel.name || formatVersionTag(rel.tag_name)} Release Notes\n\n${rel.body || 'No release notes provided.'}`;
        if (window.marked) {
            changelogContent.innerHTML = `<div class="prose prose-invert max-w-none text-on-surface-variant">${window.marked.parse(bodyMarkdown)}</div>`;
        } else {
            changelogContent.innerHTML = `<pre class="text-sm text-on-surface-variant whitespace-pre-wrap">${bodyMarkdown}</pre>`;
        }
    }

    if (changelogTrigger) {
        changelogTrigger.addEventListener('click', () => openChangelogModal(latestRelease));
    }
    if (windowsChangelogTrigger) {
        windowsChangelogTrigger.addEventListener('click', () => {
            const winRel = allReleases.find(r => r.assets && r.assets.some(a => /\.exe$/i.test(a.name)));
            openChangelogModal(winRel || latestRelease);
        });
    }

    // 6. Previous Versions Modal Popup Logic (Android & Windows)
    const versionsTrigger = document.getElementById('versions-trigger');
    const windowsVersionsTrigger = document.getElementById('windows-versions-trigger');
    const versionsDialog = document.getElementById('versions-dialog');
    const versionsList = document.getElementById('versions-list');

    function renderVersionsModal(filterPlatform = 'all') {
        if (!versionsDialog || !versionsList) return;

        const dialogTitle = versionsDialog.querySelector('.dialog-header h3');
        if (dialogTitle) {
            if (filterPlatform === 'windows') {
                dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">laptop_windows</span> Previous Windows Desktop Builds (.exe)</span>`;
            } else if (filterPlatform === 'android') {
                dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-tertiary">android</span> Previous Android Releases (.apk)</span>`;
            } else {
                dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">history</span> Previous Releases &amp; Builds</span>`;
            }
        }

        let filteredReleases = allReleases;
        if (filterPlatform === 'windows') {
            filteredReleases = allReleases.filter(rel => rel.assets && rel.assets.some(a => /\.exe$/i.test(a.name)));
        } else if (filterPlatform === 'android') {
            filteredReleases = allReleases.filter(rel => rel.assets && rel.assets.some(a => /\.apk$/i.test(a.name)));
        }

        if (!filteredReleases || filteredReleases.length === 0) {
            versionsList.innerHTML = `<p class="text-on-surface-variant text-center py-6">No previous ${filterPlatform} releases found in repository history.</p>`;
            versionsDialog.showModal();
            return;
        }

        let html = '';
        filteredReleases.forEach(rel => {
            const tag = formatVersionTag(rel.tag_name);
            const pubDate = rel.published_at ? new Date(rel.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';
            const rawNotes = rel.body ? rel.body.split('\n').filter(l => l.trim())[0] || 'Feature release' : 'Feature release';
            const cleanNotes = rawNotes.replace(/[#*`]/g, '').substring(0, 110);

            let downloadableAssets = [];
            if (filterPlatform === 'windows') {
                downloadableAssets = (rel.assets || []).filter(a => a.name && /\.exe$/i.test(a.name));
            } else if (filterPlatform === 'android') {
                downloadableAssets = (rel.assets || []).filter(a => a.name && /\.apk$/i.test(a.name));
            } else {
                downloadableAssets = rel.assets || [];
            }

            let assetButtons = '';
            downloadableAssets.forEach(asset => {
                const size = (asset.size / (1024 * 1024)).toFixed(2);
                const isSetup = /setup/i.test(asset.name);
                const isPortable = /portable|potable/i.test(asset.name);
                const isExe = /\.exe$/i.test(asset.name);

                const label = isExe ? (isSetup ? 'Setup (.exe)' : isPortable ? 'Portable (.exe)' : 'Windows (.exe)') : 'APK Download';
                const icon = isExe ? (isSetup ? 'laptop_windows' : 'inventory_2') : 'android';
                const btnClass = isExe ? 'bg-primary-container text-on-primary-container hover:brightness-110' : 'bg-tertiary-container text-on-tertiary-container hover:brightness-110';

                assetButtons += `
                    <a href="${asset.browser_download_url}" target="_blank" rel="noopener noreferrer" class="${btnClass} px-4 py-2 rounded-full text-xs font-semibold no-underline inline-flex items-center gap-1.5 active:scale-95 transition-all">
                        <span class="material-symbols-outlined" style="font-size:16px">${icon}</span>
                        ${label} (${size} MB)
                    </a>
                `;
            });

            html += `
                <div class="bg-surface-container-high p-5 rounded-2xl mb-4 border border-white/5 shadow-md flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="px-3 py-1 rounded-full bg-primary/20 text-primary font-bold text-xs">${tag}</span>
                            <span class="text-xs text-on-surface-variant">${pubDate}</span>
                        </div>
                        <span class="text-xs text-on-surface-variant font-medium">${downloadableAssets.length} file(s)</span>
                    </div>
                    <p class="text-xs text-on-surface-variant leading-relaxed">✨ ${cleanNotes}</p>
                    <div class="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                        ${assetButtons}
                    </div>
                </div>
            `;
        });

        versionsList.innerHTML = html;
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
