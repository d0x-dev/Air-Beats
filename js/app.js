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
    }

    if (platformTabs) {
        platformTabs.querySelectorAll('.platform-tab').forEach(btn => {
            btn.addEventListener('click', () => setPlatform(btn.dataset.platform));
        });
        document.querySelectorAll('.platform-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.platform === currentPlatform);
        });
    }

    // 3. GitHub Releases API Fetching
    async function fetchReleases() {
        const repos = [
            "https://api.github.com/repos/drkvenom786/Airbeats/releases",
            "https://api.github.com/repos/d0x-dev/Airbeats/releases"
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
                        return;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch releases from", url, e);
            }
        }

        // Fallback release if API limits trigger
        latestRelease = {
            tag_name: "v3.1.0",
            name: "AirBeats v3.1.0",
            assets: [
                { name: "AirBeats_v3.1.0_signed.apk", size: 34128498, browser_download_url: "https://github.com/drkvenom786/Airbeats/releases" }
            ]
        };
        updateMainButton();
    }

    function updateMainButton() {
        if (!latestRelease) return;

        if (currentPlatform === 'windows') {
            downloadBtnText.textContent = 'Download for Windows';
            versionNote.innerHTML = `Windows 10/11 · Latest Release: ${latestRelease.tag_name}`;
        } else {
            downloadBtnText.textContent = 'Download APK';
            versionNote.innerHTML = `Android 8.0+ · Secure APK · Latest: ${latestRelease.tag_name}`;
        }
    }

    // 4. Modal & Toast Handling
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

        if (!modalOptions || !latestRelease) return;
        modalOptions.innerHTML = '';

        if (currentPlatform === 'windows') {
            modalTitle.textContent = 'Download AirBeats for Windows';
            modalSubtitle.textContent = `Version ${latestRelease.tag_name}`;

            const exeAssets = (latestRelease.assets || []).filter(a => /\.exe$/i.test(a.name));
            if (exeAssets.length > 0) {
                exeAssets.forEach(asset => {
                    const size = (asset.size / (1024 * 1024)).toFixed(2);
                    modalOptions.innerHTML += `
                        <a href="${asset.browser_download_url}" class="modal-option-btn" target="_blank" rel="noopener noreferrer">
                            <div>
                                <strong>${asset.name}</strong>
                                <div style="font-size:0.8rem; color:var(--text-muted);">Windows Installer</div>
                            </div>
                            <span>${size} MB</span>
                        </a>
                    `;
                });
            } else {
                modalOptions.innerHTML = `<div class="note">Visit release page to download Windows build.</div>`;
            }
        } else {
            modalTitle.textContent = 'Download AirBeats for Android';
            modalSubtitle.textContent = `Version ${latestRelease.tag_name}`;

            const apkAssets = (latestRelease.assets || []).filter(a => /\.apk$/i.test(a.name));
            if (apkAssets.length > 0) {
                apkAssets.forEach(asset => {
                    const size = (asset.size / (1024 * 1024)).toFixed(2);
                    modalOptions.innerHTML += `
                        <a href="${asset.browser_download_url}" class="modal-option-btn" target="_blank" rel="noopener noreferrer">
                            <div>
                                <strong>${asset.name}</strong>
                                <div style="font-size:0.8rem; color:var(--text-muted);">Android Signed APK</div>
                            </div>
                            <span>${size} MB</span>
                        </a>
                    `;
                });
            } else {
                modalOptions.innerHTML = `<a href="https://github.com/drkvenom786/Airbeats/releases" class="modal-option-btn" target="_blank">Download Latest APK</a>`;
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

    // 5. Copy Link & Web Share API
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

    // 6. Sound Visualizer Bar Animation
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

    // 7. Scroll to Top
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
