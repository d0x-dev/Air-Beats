document.addEventListener('DOMContentLoaded', () => {
    // ═══════════════════════ CANVAS BACKGROUND ═══════════════════════
    const canvas = document.getElementById('bgCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        const particles = Array.from({ length: 35 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 3 + 1,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.4 + 0.1
        }));

        function drawParticles() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(139, 92, 246, ${p.alpha})`;
                ctx.fill();
            });
            requestAnimationFrame(drawParticles);
        }
        drawParticles();
    }

    // ═══════════════════════ RELEASES & API DATA ═══════════════════════
    let allReleases = [
        {
            tag_name: "5.9.0",
            name: "AirBeats v5.9.0",
            published_at: "2026-07-20T08:00:00Z",
            body: "### ✨ AirBeats v5.9.0 Release Notes\n- 🎵 **Enhanced YouTube Music Integration**\n- ⚡ Lower RAM consumption & fluid Material Design 3 UI\n- 🎨 Custom audio visualizers and pitch black OLED mode",
            assets: [
                { name: "AirBeats_v5.9.0_signed.apk", size: 35000000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.9.0/AirBeats_v5.9.0_signed.apk" }
            ]
        },
        {
            tag_name: "V5.8.0",
            name: "AirBeats V5.8.0",
            published_at: "2026-07-10T08:00:00Z",
            body: "### ✨ AirBeats V5.8.0\n- Android Signed APK release v5.8.0 with performance fixes",
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
            body: "### ✨ AirBeats v5.6.0\n- Windows Setup & Portable Executables\n- Android signed APK build",
            assets: [
                { name: "Airbeats-v5.6.0-setup.exe", size: 44000000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.6.0/Airbeats-v5.6.0-setup.exe" },
                { name: "Airbeats-v5.6.0-Potable.exe", size: 41000000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.6.0/Airbeats-v5.6.0-Potable.exe" },
                { name: "AirBeats_v5.6.0_signed.apk", size: 33500000, browser_download_url: "https://github.com/d0x-dev/AirBeats/releases/download/5.6.0/AirBeats_v5.6.0_signed.apk" }
            ]
        }
    ];

    let latestRelease = allReleases[0];

    // ═══════════════════════ TOAST NOTIFIER ═══════════════════════
    const appToast = document.getElementById('appToast');
    const appToastMsg = document.getElementById('appToastMsg');

    function showToast(msg) {
        if (!appToast || !appToastMsg) return;
        appToastMsg.textContent = msg;
        appToast.classList.add('show');
        setTimeout(() => appToast.classList.remove('show'), 3500);
    }

    // ═══════════════════════ AUDIO PREVIEW PLAYER ═══════════════════════
    const audioPlayer = new Audio('rhythm.mp3');
    let isPlaying = false;

    const playAudioBtn = document.getElementById('playAudioBtn');
    const playIcon = document.getElementById('playIcon');
    const playBtnText = document.getElementById('playBtnText');
    const navLogo = document.getElementById('navLogo');
    const cardLogo = document.getElementById('cardLogo');
    const spectrumBars = document.querySelectorAll('#cardSpectrum .spectrum-bar');

    let spectrumInterval;

    function toggleAudio() {
        if (!isPlaying) {
            audioPlayer.play().then(() => {
                isPlaying = true;
                if (playIcon) playIcon.textContent = 'pause';
                if (playBtnText) playBtnText.textContent = 'Pause Preview';
                if (navLogo) navLogo.classList.add('playing');
                if (cardLogo) cardLogo.classList.add('playing');
                showToast('🎵 Playing AirBeats Rhythm sample audio...');
                animateSpectrum();
            }).catch(err => {
                console.warn("Audio playback failed:", err);
                showToast('Unable to play audio sample.');
            });
        } else {
            audioPlayer.pause();
            isPlaying = false;
            if (playIcon) playIcon.textContent = 'play_arrow';
            if (playBtnText) playBtnText.textContent = 'Play Preview';
            if (navLogo) navLogo.classList.remove('playing');
            if (cardLogo) cardLogo.classList.remove('playing');
            showToast('⏸️ Audio playback paused.');
            resetSpectrum();
        }
    }

    function animateSpectrum() {
        clearInterval(spectrumInterval);
        spectrumInterval = setInterval(() => {
            spectrumBars.forEach(bar => {
                const height = Math.floor(Math.random() * 85) + 15;
                bar.style.height = `${height}%`;
            });
        }, 100);
    }

    function resetSpectrum() {
        clearInterval(spectrumInterval);
        spectrumBars.forEach(bar => {
            bar.style.height = '15%';
        });
    }

    if (playAudioBtn) playAudioBtn.addEventListener('click', toggleAudio);
    if (navLogo) navLogo.addEventListener('click', toggleAudio);
    if (cardLogo) cardLogo.addEventListener('click', toggleAudio);

    audioPlayer.addEventListener('ended', () => {
        isPlaying = false;
        if (playIcon) playIcon.textContent = 'play_arrow';
        if (playBtnText) playBtnText.textContent = 'Play Preview';
        if (navLogo) navLogo.classList.remove('playing');
        if (cardLogo) cardLogo.classList.remove('playing');
        resetSpectrum();
        showToast('🎵 Rhythm audio sample finished playing.');
    });

    // ═══════════════════════ FETCH GITHUB RELEASES ═══════════════════════
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
                        updateBadges();
                        return;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch releases from", url, e);
            }
        }
        updateBadges();
    }

    function formatTag(tag) {
        if (!tag) return 'v5.9.0';
        return tag.startsWith('v') || tag.startsWith('V') ? tag : `v${tag}`;
    }

    function updateBadges() {
        const androidBadge = document.getElementById('androidVersionBadge');
        const windowsBadge = document.getElementById('windowsVersionBadge');
        const androidBtn = document.getElementById('androidDownloadBtn');
        const windowsBtn = document.getElementById('windowsDownloadBtn');

        if (androidBadge && latestRelease) {
            androidBadge.textContent = formatTag(latestRelease.tag_name);
            const apk = latestRelease.assets.find(a => /\.apk$/i.test(a.name));
            if (apk && androidBtn) androidBtn.href = apk.browser_download_url;
        }

        const winRel = allReleases.find(r => r.assets && r.assets.some(a => /\.exe$/i.test(a.name)));
        if (winRel) {
            if (windowsBadge) windowsBadge.textContent = formatTag(winRel.tag_name);
            const exe = winRel.assets.find(a => /\.exe$/i.test(a.name));
            if (exe && windowsBtn) windowsBtn.href = exe.browser_download_url;
        }
    }

    // ═══════════════════════ CHANGELOG MODAL ═══════════════════════
    const changelogDialog = document.getElementById('changelog-dialog');
    const changelogBody = document.getElementById('changelogBody');
    const androidChangelogBtn = document.getElementById('androidChangelogBtn');
    const windowsChangelogBtn = document.getElementById('windowsChangelogBtn');

    function openChangelog(rel) {
        if (!changelogDialog || !changelogBody) return;
        const release = rel || latestRelease;
        const tag = formatTag(release.tag_name);

        let notes = release.body || '### Release Notes\nNo details provided.';
        if (window.marked) {
            changelogBody.innerHTML = `<div class="prose prose-invert max-w-none text-slate-300 text-sm">${window.marked.parse(notes)}</div>`;
        } else {
            changelogBody.innerHTML = `<pre class="text-xs text-slate-300 whitespace-pre-wrap">${notes}</pre>`;
        }
        changelogDialog.showModal();
    }

    if (androidChangelogBtn) androidChangelogBtn.addEventListener('click', () => openChangelog(latestRelease));
    if (windowsChangelogBtn) windowsChangelogBtn.addEventListener('click', () => {
        const winRel = allReleases.find(r => r.assets && r.assets.some(a => /\.exe$/i.test(a.name)));
        openChangelog(winRel || latestRelease);
    });

    // ═══════════════════════ PREVIOUS VERSIONS MODAL ═══════════════════════
    const versionsDialog = document.getElementById('versions-dialog');
    const versionsBody = document.getElementById('versionsModalBody');
    const versionsTitle = document.getElementById('versionsModalTitle');
    const prevModalBtn = document.getElementById('prevModalBtn');
    const androidPrevBtn = document.getElementById('androidPrevBtn');
    const windowsPrevBtn = document.getElementById('windowsPrevBtn');
    const modalTabAndroid = document.getElementById('modalTabAndroid');
    const modalTabWindows = document.getElementById('modalTabWindows');

    let currentModalPlatform = 'android';

    function renderVersionsModal(platform = 'android') {
        currentModalPlatform = platform;
        if (!versionsDialog || !versionsBody) return;

        if (modalTabAndroid && modalTabWindows) {
            modalTabAndroid.classList.toggle('bg-purple-600/40', platform === 'android');
            modalTabWindows.classList.toggle('bg-purple-600/40', platform === 'windows');
        }

        let filtered = [];
        if (platform === 'windows') {
            filtered = allReleases.filter(r => r.assets && r.assets.some(a => /\.exe$/i.test(a.name)));
            if (versionsTitle) versionsTitle.innerHTML = `<i class="bi bi-windows text-cyan-400"></i> Windows Builds (.exe)`;
        } else {
            filtered = allReleases.filter(r => r.assets && r.assets.some(a => /\.apk$/i.test(a.name)));
            if (versionsTitle) versionsTitle.innerHTML = `<i class="bi bi-android2 text-green-400"></i> Android Releases (.apk)`;
        }

        if (filtered.length === 0) {
            versionsBody.innerHTML = `<p class="text-slate-400 text-center py-6">No previous ${platform} builds found.</p>`;
            versionsDialog.showModal();
            return;
        }

        let html = '';
        filtered.forEach(rel => {
            const tag = formatTag(rel.tag_name);
            const date = rel.published_at ? new Date(rel.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';
            const rawNotes = rel.body ? rel.body.split('\n').filter(l => l.trim())[0] || 'Official Release' : 'Official Release';
            const notes = rawNotes.replace(/[#*`]/g, '').substring(0, 100);

            let assets = [];
            if (platform === 'windows') {
                assets = (rel.assets || []).filter(a => a.name && /\.exe$/i.test(a.name));
            } else {
                assets = (rel.assets || []).filter(a => a.name && /\.apk$/i.test(a.name));
            }

            let btns = '';
            assets.forEach(a => {
                const size = (a.size / (1024 * 1024)).toFixed(2);
                const isSetup = /setup/i.test(a.name);
                const isPortable = /portable|potable/i.test(a.name);
                const label = platform === 'windows' ? (isSetup ? 'Setup (.exe)' : isPortable ? 'Portable (.exe)' : 'Windows (.exe)') : 'APK Download';
                const icon = platform === 'windows' ? 'bi-laptop' : 'bi-android2';

                btns += `
                    <a href="${a.browser_download_url}" target="_blank" rel="noopener noreferrer" class="btn-glow text-xs py-1.5 px-4 no-underline">
                        <i class="bi ${icon}"></i> ${label} (${size} MB)
                    </a>
                `;
            });

            html += `
                <div class="m3-version-card">
                    <div class="flex items-center justify-between mb-2">
                        <span class="px-3 py-1 rounded-full bg-purple-900/40 text-purple-300 text-xs font-bold">${tag}</span>
                        <span class="text-xs text-slate-400"><i class="bi bi-calendar3"></i> ${date}</span>
                    </div>
                    <p class="text-xs text-slate-300 mb-3">✨ ${notes}</p>
                    <div class="flex flex-wrap gap-2 pt-2 border-t border-white/5 justify-end">
                        ${btns}
                    </div>
                </div>
            `;
        });

        versionsBody.innerHTML = html;
        versionsDialog.showModal();
    }

    if (prevModalBtn) prevModalBtn.addEventListener('click', () => renderVersionsModal('android'));
    if (androidPrevBtn) androidPrevBtn.addEventListener('click', () => renderVersionsModal('android'));
    if (windowsPrevBtn) windowsPrevBtn.addEventListener('click', () => renderVersionsModal('windows'));

    if (modalTabAndroid) modalTabAndroid.addEventListener('click', () => renderVersionsModal('android'));
    if (modalTabWindows) modalTabWindows.addEventListener('click', () => renderVersionsModal('windows'));

    // ═══════════════════════ ONE-CLICK COPY ═══════════════════════
    const copyGitBtn = document.getElementById('copyGitBtn');
    const gitCloneText = document.getElementById('gitCloneText');

    if (copyGitBtn && gitCloneText) {
        copyGitBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(gitCloneText.textContent);
            showToast('📋 Git clone command copied to clipboard!');
        });
    }

    // ═══════════════════════ FAB BACK TO TOP ═══════════════════════
    const fabTop = document.getElementById('fabTop');
    if (fabTop) {
        window.addEventListener('scroll', () => {
            fabTop.style.display = window.scrollY > 400 ? 'flex' : 'none';
        });
        fabTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Initialize API fetch
    fetchReleases();
});
