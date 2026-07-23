document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const themeToggle = document.getElementById('themeToggle');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadBtnText = document.getElementById('downloadBtnText');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const shareBtn = document.getElementById('shareBtn');
    const backToTop = document.getElementById('backToTop');
    const downloadToast = document.getElementById('downloadToast');
    const toastMsg = document.getElementById('downloadToastMessage');
    const visualizer = document.getElementById('visualizer');
    const versionNote = document.getElementById('versionNote');
    const platformTabs = document.getElementById('platformTabs');
    const downloadModal = document.getElementById('downloadModal');
    const masterHeader = document.getElementById('masterHeader');
    const versionMasterContainer = document.getElementById('versionMasterContainer');
    const compactList = document.getElementById('compactVersionsList');
    const releaseCountBadge = document.getElementById('releaseCountBadge');

    let currentPlatform = detectPlatform();
    let latestRelease = null;
    let allReleases = [];

    // 1. Theme Switcher
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
        }
    }
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            setTheme(current === 'dark' ? 'light' : 'dark');
        });
    }

    // 2. Platform Detection
    function detectPlatform() {
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        if (/Windows/i.test(ua)) return 'windows';
        return 'android';
    }

    function setPlatform(p) {
        currentPlatform = p;
        if (platformTabs) {
            platformTabs.querySelectorAll('.platform-tab').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.platform === p);
            });
        }
        updateMainButton();
        renderCompactVersionList();
    }

    if (platformTabs) {
        platformTabs.querySelectorAll('.platform-tab').forEach(btn => {
            btn.addEventListener('click', () => setPlatform(btn.dataset.platform));
        });
        document.querySelectorAll('.platform-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.platform === currentPlatform);
        });
    }

    // 3. Robust Platform Release Resolution Logic
    // Finds the latest release that actually has the specified platform binary (.exe for Windows, .apk for Android)
    function getLatestReleaseForPlatform(platform) {
        if (!allReleases || allReleases.length === 0) return latestRelease;

        if (platform === 'windows') {
            const winRelease = allReleases.find(rel => 
                rel.assets && rel.assets.some(a => /\.exe$/i.test(a.name))
            );
            return winRelease || latestRelease;
        } else {
            const apkRelease = allReleases.find(rel => 
                rel.assets && rel.assets.some(a => /\.apk$/i.test(a.name))
            );
            return apkRelease || latestRelease;
        }
    }

    // 4. GitHub Releases API Fetching
    async function fetchReleases() {
        const repos = [
            "https://api.github.com/repos/drkvenom786/Airbeats/releases",
            "https://api.github.com/repos/d0x-dev/Airbeats/releases",
            "https://api.github.com/repos/d0x-dev/air-beats/releases"
        ];
        
        for (const url of repos) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        allReleases = data.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
                        latestRelease = allReleases[0];
                        updateMainButton();
                        renderCompactVersionList();
                        return;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch releases from", url, e);
            }
        }

        // Fallback releases if API rate limit triggers
        allReleases = [
            {
                tag_name: "v5.9.0",
                name: "AirBeats v5.9.0",
                published_at: "2026-07-20T08:00:00Z",
                assets: [
                    { name: "AirBeats_v5.9.0_signed.apk", size: 35000000, browser_download_url: "https://github.com/drkvenom786/Airbeats/releases" }
                ]
            },
            {
                tag_name: "v5.7.0",
                name: "AirBeats v5.7.0",
                published_at: "2026-06-15T08:00:00Z",
                assets: [
                    { name: "AirBeats_v5.7.0_Setup.exe", size: 45000000, browser_download_url: "https://github.com/drkvenom786/Airbeats/releases" },
                    { name: "AirBeats_v5.7.0_signed.apk", size: 34000000, browser_download_url: "https://github.com/drkvenom786/Airbeats/releases" }
                ]
            }
        ];
        latestRelease = allReleases[0];
        updateMainButton();
        renderCompactVersionList();
    }

    function updateMainButton() {
        const release = getLatestReleaseForPlatform(currentPlatform);
        if (!release) return;

        if (currentPlatform === 'windows') {
            downloadBtnText.textContent = 'Download for Windows';
            versionNote.innerHTML = `Windows 10/11 · Latest Available: ${release.tag_name}`;
        } else {
            downloadBtnText.textContent = 'Download APK';
            versionNote.innerHTML = `Android 8.0+ · Secure APK · Latest: ${release.tag_name}`;
        }
    }

    // 5. Version History Accordion List Rendering
    function renderCompactVersionList() {
        if (!compactList || !allReleases || allReleases.length === 0) return;

        let filteredReleases = allReleases;
        if (currentPlatform === 'windows') {
            filteredReleases = allReleases.filter(rel => rel.assets && rel.assets.some(a => /\.exe$/i.test(a.name)));
        } else {
            filteredReleases = allReleases.filter(rel => rel.assets && rel.assets.some(a => /\.apk$/i.test(a.name)));
        }

        if (releaseCountBadge) {
            releaseCountBadge.textContent = `${filteredReleases.length} ${currentPlatform} releases`;
        }

        if (filteredReleases.length === 0) {
            compactList.innerHTML = `<div class="note">No ${currentPlatform} build releases available.</div>`;
            return;
        }

        let html = '';
        filteredReleases.forEach(rel => {
            const versionTag = rel.tag_name || 'v?.?.?';
            const pubDate = rel.published_at ? new Date(rel.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';
            const notes = rel.body ? rel.body.split('\n').filter(l => l.trim())[0] || 'Feature release' : 'Feature release';

            let downloadableAssets = [];
            if (currentPlatform === 'windows') {
                downloadableAssets = (rel.assets || []).filter(a => a.name && /\.exe$/i.test(a.name));
            } else {
                downloadableAssets = (rel.assets || []).filter(a => a.name && /\.apk$/i.test(a.name));
            }

            let assetButtons = '';
            downloadableAssets.forEach(asset => {
                const size = (asset.size / (1024 * 1024)).toFixed(2);
                const isSetup = /setup/i.test(asset.name);
                const label = currentPlatform === 'windows' ? (isSetup ? 'Setup (.exe)' : 'Windows (.exe)') : 'APK Download';
                const icon = currentPlatform === 'windows' ? (isSetup ? 'bi-windows' : 'bi-box-seam') : 'bi-android2';
                assetButtons += `<a href="${asset.browser_download_url}" class="download-sm-btn" target="_blank" rel="noopener noreferrer"><i class="bi ${icon}"></i> ${label} (${size} MB)</a>`;
            });

            html += `
                <div class="version-compact-item">
                    <div class="version-compact-header">
                        <span class="version-tag-sm">${versionTag}</span>
                        <span class="version-date-sm">${pubDate}</span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-muted); margin:0.3rem 0;">✨ ${notes.substring(0, 100)}</div>
                    <div class="version-download-sm">
                        ${assetButtons}
                    </div>
                </div>
            `;
        });
        compactList.innerHTML = html;
    }

    if (masterHeader && versionMasterContainer) {
        masterHeader.addEventListener('click', () => {
            versionMasterContainer.classList.toggle('open');
        });
    }

    // 6. Modal & Toast Handling
    function showToast(msg) {
        if (!downloadToast || !toastMsg) return;
        toastMsg.textContent = msg;
        downloadToast.classList.add('show');
        setTimeout(() => downloadToast.classList.remove('show'), 3000);
    }

    function openDownloadModal() {
        if (!downloadModal) return;
        const modalOptions = document.getElementById('modalOptions');
        const modalTitle = document.getElementById('modalTitle');
        const modalSubtitle = document.getElementById('modalSubtitle');

        if (!modalOptions) return;
        modalOptions.innerHTML = '';

        const targetRelease = getLatestReleaseForPlatform(currentPlatform);
        if (!targetRelease) return;

        if (currentPlatform === 'windows') {
            modalTitle.textContent = 'Download AirBeats for Windows';
            modalSubtitle.textContent = `Latest Available Windows Build: ${targetRelease.tag_name}`;

            const exeAssets = (targetRelease.assets || []).filter(a => /\.exe$/i.test(a.name));
            if (exeAssets.length > 0) {
                exeAssets.forEach(asset => {
                    const size = (asset.size / (1024 * 1024)).toFixed(2);
                    const isSetup = /setup/i.test(asset.name);
                    const label = isSetup ? 'Windows Setup Installer' : 'Windows Executable';
                    const icon = isSetup ? 'bi-windows' : 'bi-box-seam';
                    modalOptions.innerHTML += `
                        <a href="${asset.browser_download_url}" class="modal-option-btn" target="_blank" rel="noopener noreferrer">
                            <div class="modal-option-left">
                                <div class="modal-option-icon"><i class="bi ${icon}"></i></div>
                                <div class="modal-option-text">
                                    <strong>${label}</strong>
                                    <div style="font-size:0.8rem; color:var(--text-muted);">${asset.name}</div>
                                </div>
                            </div>
                            <span class="modal-option-size">${size} MB</span>
                        </a>
                    `;
                });
            } else {
                modalOptions.innerHTML = `<a href="https://github.com/drkvenom786/Airbeats/releases" class="modal-option-btn" target="_blank">View All Releases on GitHub</a>`;
            }
        } else {
            modalTitle.textContent = 'Download AirBeats for Android';
            modalSubtitle.textContent = `Latest Available Android Build: ${targetRelease.tag_name}`;

            const apkAssets = (targetRelease.assets || []).filter(a => /\.apk$/i.test(a.name));
            if (apkAssets.length > 0) {
                apkAssets.forEach(asset => {
                    const size = (asset.size / (1024 * 1024)).toFixed(2);
                    modalOptions.innerHTML += `
                        <a href="${asset.browser_download_url}" class="modal-option-btn" target="_blank" rel="noopener noreferrer">
                            <div class="modal-option-left">
                                <div class="modal-option-icon"><i class="bi bi-android2"></i></div>
                                <div class="modal-option-text">
                                    <strong>Android Signed APK</strong>
                                    <div style="font-size:0.8rem; color:var(--text-muted);">${asset.name}</div>
                                </div>
                            </div>
                            <span class="modal-option-size">${size} MB</span>
                        </a>
                    `;
                });
            } else {
                modalOptions.innerHTML = `<a href="https://github.com/drkvenom786/Airbeats/releases" class="modal-option-btn" target="_blank">View All Releases on GitHub</a>`;
            }
        }

        downloadModal.classList.add('show');
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openDownloadModal();
        });
    }

    if (downloadModal) {
        downloadModal.addEventListener('click', (e) => {
            if (e.target === downloadModal) {
                downloadModal.classList.remove('show');
            }
        });
    }

    // 7. Copy Link & Web Share API
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            navigator.clipboard.writeText('https://airbeats.app/');
            showToast('Link copied to clipboard!');
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const shareData = {
                title: 'AirBeats – Free Immersive Music Streaming App',
                text: 'Step into the future of music with AirBeats. Ad-free audio streaming, sound visualizers, and custom equalizers!',
                url: 'https://airbeats.app/'
            };

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (e) {
                    if (e.name !== 'AbortError') showToast('Sharing cancelled');
                }
            } else {
                navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
                showToast('Share link copied to clipboard!');
            }
        });
    }

    // 8. Sound Visualizer Bar Animation
    function initVisualizer() {
        if (!visualizer) return;
        visualizer.innerHTML = '';
        const barCount = window.innerWidth < 640 ? 24 : 40;
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            visualizer.appendChild(bar);
        }

        function animateVisualizer() {
            const bars = visualizer.querySelectorAll('.visualizer-bar');
            bars.forEach((bar, i) => {
                const wave = Math.sin(Date.now() * 0.003 + i * 0.2) * 0.5 + 0.5;
                bar.style.height = `${15 + wave * 75}%`;
            });
            requestAnimationFrame(animateVisualizer);
        }
        animateVisualizer();
    }
    initVisualizer();
    window.addEventListener('resize', initVisualizer);

    // 9. Scroll to Top
    if (backToTop) {
        window.addEventListener('scroll', () => {
            backToTop.style.display = window.scrollY > 400 ? 'flex' : 'none';
        });
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    fetchReleases();
});
