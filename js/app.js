document.addEventListener('DOMContentLoaded', () => {
    function isMobileDevice() {
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS|Tablet|Touch/i.test(ua);
        const isSmallScreen = window.innerWidth <= 768;
        return isMobileUA || isSmallScreen;
    }

    function detectUserPlatform() {
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        if (/Android/i.test(ua)) return 'android';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
        if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
        if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'linux';
        if (/Windows/i.test(ua)) return 'windows';
        return 'desktop';
    }

    function updatePlatformDownloadButtons() {
        const heroBtn = document.getElementById('hero-download-btn');
        const heroText = document.getElementById('hero-download-text');
        const heroIcon = document.getElementById('hero-download-icon');
        if (!heroBtn || !heroText) return;

        // Guarantee clicking redirects to the bottom #downloads section
        heroBtn.href = '#downloads';

        const isMobile = isMobileDevice();

        if (isMobile) {
            heroText.textContent = 'Download APK';
            if (heroIcon) heroIcon.textContent = 'android';
        } else {
            heroText.textContent = 'Download Desktop';
            if (heroIcon) heroIcon.textContent = 'desktop_windows';
        }
    }

    window.addEventListener('resize', updatePlatformDownloadButtons);

    // ═══════════════════════ DOM ELEMENTS & RELEASES ═══════════════════════
    const logo = document.getElementById('logo');
    const downloadToast = document.getElementById('downloadToast');
    const toastMsg = document.getElementById('downloadToastMessage');
    const toastIcon = document.getElementById('downloadToastIcon');
    const ossVersionBadge = document.getElementById('oss-version-badge');
    const androidVersionBadge = document.getElementById('android-version-badge');
    const windowsVersionBadge = document.getElementById('windows-version-badge');

    // Dynamic releases fetched directly from GitHub API
    let allReleases = [];
    let stableReleases = [];
    let nightlyReleases = [];
    let latestStableAndroidRelease = null;
    let latestNightlyAndroidRelease = null;
    let latestRelease = null;
    let desktopReleases = [];
    let latestDesktopRelease = null;
    let selectedAndroidBuildType = 'stable'; // 'stable' | 'nightly'

    function isPrerelease(release) {
        if (!release) return false;
        if (release.prerelease === true) return true;
        const tag = (release.tag_name || '').toLowerCase();
        const name = (release.name || '').toLowerCase();
        return tag.includes('night') || tag.includes('beta') || tag.includes('alpha') || tag.includes('rc') || tag.includes('pre') ||
               name.includes('night') || name.includes('beta') || name.includes('alpha') || name.includes('pre-release') || name.includes('prerelease');
    }

    function deduplicateReleases(list) {
        if (!Array.isArray(list)) return [];
        const seen = new Set();
        const result = [];
        for (const rel of list) {
            if (!rel) continue;
            const key = rel.id ? String(rel.id) : (rel.tag_name ? String(rel.tag_name) : (rel.name || JSON.stringify(rel)));
            if (!seen.has(key)) {
                seen.add(key);
                if (Array.isArray(rel.assets)) {
                    const seenAsset = new Set();
                    rel.assets = rel.assets.filter(asset => {
                        if (!asset || !asset.browser_download_url) return false;
                        const aKey = asset.id ? String(asset.id) : (asset.name || asset.browser_download_url);
                        if (seenAsset.has(aKey)) return false;
                        seenAsset.add(aKey);
                        return true;
                    });
                }
                result.push(rel);
            }
        }
        return result;
    }

    // 1. Toast Notification Helper & Direct Download Handler
    let toastTimeout = null;
    function showToast(msg, iconName = 'cloud_download') {
        if (!downloadToast || !toastMsg) return;
        toastMsg.textContent = msg;
        if (toastIcon) {
            toastIcon.textContent = iconName;
        }
        downloadToast.classList.add('show');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => downloadToast.classList.remove('show'), 3000);
    }

    function triggerDownload(url, defaultName) {
        if (!url || url === '#' || url.startsWith('javascript:')) return;
        const filename = defaultName || url.split('/').pop().split('?')[0] || 'AirBeats';
        showToast('Download started', 'cloud_download');

        try {
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            link.setAttribute('rel', 'noopener noreferrer');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
            }, 2000);
        } catch (e) {
            window.location.href = url;
        }
    }
    window.showToast = showToast;
    window.triggerDownload = triggerDownload;

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
                    showToast('Playing rhythm sample', 'music_note');
                }).catch(err => {
                    console.warn('Audio playback error:', err);
                    showToast('Error playing audio', 'error');
                });
            } else {
                audioPlayer.pause();
                isPlayingAudio = false;
                logo.classList.remove('playing');
                showToast('Audio paused', 'pause');
            }
        });

        audioPlayer.addEventListener('ended', () => {
            isPlayingAudio = false;
            logo.classList.remove('playing');
            showToast('Playback finished', 'check_circle');
        });
    }

    // 3. GitHub Desktop Releases API Fetching
    async function fetchDesktopReleases() {
        // Fetch latest desktop release
        const latestEndpoints = [
            "/api/desktop-releases/latest",
            "https://api.github.com/repos/d0x-dev/airbeats-desktop/releases/latest"
        ];

        for (const url of latestEndpoints) {
            try {
                const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.tag_name) {
                        latestDesktopRelease = data;
                        if (!desktopReleases.some(r => r.id === data.id || r.tag_name === data.tag_name)) {
                            desktopReleases.unshift(data);
                        } else {
                            const idx = desktopReleases.findIndex(r => r.id === data.id || r.tag_name === data.tag_name);
                            desktopReleases[idx] = data;
                        }
                        desktopReleases = deduplicateReleases(desktopReleases);
                        updateVersionBadges();
                        break;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch latest desktop release from", url, e);
            }
        }

        // Fetch all desktop releases
        const allEndpoints = [
            "/api/desktop-releases",
            "https://api.github.com/repos/d0x-dev/airbeats-desktop/releases"
        ];

        for (const url of allEndpoints) {
            try {
                const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
                if (res.ok) {
                    const data = await res.json();
                    const rawList = Array.isArray(data) ? data : (Array.isArray(data.releases) ? data.releases : null);
                    if (rawList && rawList.length > 0) {
                        const deduped = deduplicateReleases(rawList);
                        desktopReleases = deduped.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
                        latestDesktopRelease = desktopReleases.find(r => !isPrerelease(r)) || desktopReleases[0];
                        updateVersionBadges();
                        break;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch all desktop releases from", url, e);
            }
        }

        updateVersionBadges();
    }

    // 4. GitHub Android Releases API Fetching
    async function fetchReleases() {
        const endpoints = [
            "/api/releases",
            "https://api.github.com/repos/d0x-dev/AirBeats/releases",
            "https://api.github.com/repos/drkvenom786/Airbeats/releases"
        ];
        
        for (const url of endpoints) {
            try {
                const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
                if (res.ok) {
                    const data = await res.json();
                    const rawList = Array.isArray(data) ? data : (Array.isArray(data.releases) ? data.releases : (Array.isArray(data.value) ? data.value : null));
                    if (rawList && rawList.length > 0) {
                        const deduped = deduplicateReleases(rawList);
                        allReleases = deduped.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
                        stableReleases = allReleases.filter(r => !isPrerelease(r) && r.assets && r.assets.some(isAndroidAsset));
                        nightlyReleases = allReleases.filter(r => isPrerelease(r) && r.assets && r.assets.some(isAndroidAsset));
                        latestStableAndroidRelease = stableReleases[0] || null;
                        latestNightlyAndroidRelease = nightlyReleases[0] || null;
                        latestRelease = latestStableAndroidRelease || allReleases.find(r => !isPrerelease(r)) || allReleases[0] || null;
                        updateVersionBadges();
                        break;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch GitHub releases from", url, e);
            }
        }

        await fetchDesktopReleases();
        updateVersionBadges();
    }

    function formatVersionTag(tag) {
        if (!tag) return '';
        return tag.startsWith('v') || tag.startsWith('V') ? tag : `v${tag}`;
    }

    // Asset Platform Checkers (Exact extensions from API)
    function isAndroidAsset(asset) {
        if (!asset || !asset.name) return false;
        return /\.(apk|aab)$/i.test(asset.name);
    }

    function isWindowsAsset(asset) {
        if (!asset || !asset.name) return false;
        return /\.(exe|msi)$/i.test(asset.name) || /-(win|windows)/i.test(asset.name);
    }

    function isLinuxAsset(asset) {
        if (!asset || !asset.name) return false;
        return /\.(appimage|deb|snap|rpm|tar\.gz|tar\.xz|pkg\.tar\.zst)$/i.test(asset.name) || /-linux/i.test(asset.name);
    }

    function isMacAsset(asset) {
        if (!asset || !asset.name) return false;
        return /\.(dmg|pkg|app\.zip)$/i.test(asset.name) || /-(mac|macos|darwin|osx)/i.test(asset.name);
    }

    function getAssetMeta(asset) {
        const name = asset.name || '';
        const sizeMb = asset.size ? (asset.size / (1024 * 1024)).toFixed(1) + ' MB' : '';

        let typeTitle = name;
        let badgeText = 'Binary';
        let desc = 'Official release binary';
        let icon = 'download';
        let btnColor = 'primary';

        if (/\.appimage$/i.test(name)) {
            typeTitle = 'AppImage Package (.AppImage)';
            badgeText = 'Universal';
            desc = 'Runs on all Linux distributions • Ubuntu, Fedora, Arch, Debian';
            icon = 'package_2';
            btnColor = 'secondary';
        } else if (/\.deb$/i.test(name)) {
            typeTitle = 'Debian / Ubuntu Package (.deb)';
            badgeText = 'Debian';
            desc = 'Native package for Ubuntu, Debian, Linux Mint & Pop!_OS';
            icon = 'folder_zip';
            btnColor = 'primary';
        } else if (/\.snap$/i.test(name)) {
            typeTitle = 'Snap Package (.snap)';
            badgeText = 'Snapcraft';
            desc = 'Universal sandboxed package with snapd support';
            icon = 'deployed_code';
            btnColor = 'tertiary';
        } else if (/\.rpm$/i.test(name)) {
            typeTitle = 'RPM Package (.rpm)';
            badgeText = 'Fedora / RHEL';
            desc = 'Package for Fedora, Red Hat & openSUSE';
            icon = 'folder_zip';
            btnColor = 'primary';
        } else if (/\.dmg$/i.test(name)) {
            typeTitle = 'macOS Disk Image (.dmg)';
            badgeText = /arm64|apple/i.test(name) ? 'Apple Silicon' : (/x64|intel/i.test(name) ? 'Intel Mac' : 'Universal Mac');
            desc = 'Direct DMG installer for macOS';
            icon = 'laptop_mac';
            btnColor = 'tertiary';
        } else if (/\.pkg$/i.test(name)) {
            typeTitle = 'macOS Installer Package (.pkg)';
            badgeText = 'macOS';
            desc = 'Native macOS installer package';
            icon = 'inventory_2';
            btnColor = 'tertiary';
        } else if (/\.exe$/i.test(name)) {
            if (/setup/i.test(name)) {
                typeTitle = 'Setup File (.exe)';
                badgeText = 'Recommended';
                desc = 'Full Windows installer • Desktop shortcut & auto-updates';
                icon = 'install_desktop';
                btnColor = 'primary';
            } else if (/portable|potable/i.test(name)) {
                typeTitle = 'Portable File (.exe)';
                badgeText = 'No Install';
                desc = 'Standalone executable • Run directly without installation';
                icon = 'inventory_2';
                btnColor = 'secondary';
            } else {
                typeTitle = 'Windows Executable (.exe)';
                badgeText = 'Windows';
                desc = 'Executable binary for PC';
                icon = 'laptop_windows';
                btnColor = 'primary';
            }
        } else if (/\.apk$/i.test(name)) {
            typeTitle = 'Android Package (.apk)';
            badgeText = 'Signed APK';
            desc = 'Official signed package for Android';
            icon = 'android';
            btnColor = 'tertiary';
        }

        return { typeTitle, badgeText, desc, icon, btnColor, sizeMb };
    }

    function renderPlatformDialog(dialogId, platformTitle, platformIcon, rel, assetFilter) {
        const dialog = document.getElementById(dialogId);
        if (!dialog) return;

        const tag = rel ? formatVersionTag(rel.tag_name) : '';
        const versionEl = dialog.querySelector('.dialog-header p');
        if (versionEl) {
            versionEl.textContent = tag ? `${tag} (Latest Release)` : 'Release details';
        }

        const container = dialog.querySelector('.dialog-content');
        if (!container) return;

        const assets = (rel && rel.assets) ? rel.assets.filter(assetFilter) : [];

        if (assets.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">${platformIcon}</span>
                    <p class="text-on-surface font-semibold text-base">No builds available for this version</p>
                    <p class="text-xs text-on-surface-variant mt-1">There are no downloadable assets uploaded for this operating system yet.</p>
                </div>
            `;
            dialog.showModal();
            return;
        }

        let buttonsHtml = `<p class="text-on-surface-variant text-sm mb-1">Select your preferred download package from release <strong>${tag}</strong>:</p>`;

        assets.forEach(asset => {
            const meta = getAssetMeta(asset);
            const colorClass = meta.btnColor === 'secondary' ? 'bg-secondary-container/30 text-secondary' : (meta.btnColor === 'tertiary' ? 'bg-tertiary-container/30 text-tertiary' : 'bg-primary-container/30 text-primary');
            const badgeColor = meta.btnColor === 'secondary' ? 'bg-secondary/20 text-secondary' : (meta.btnColor === 'tertiary' ? 'bg-tertiary/20 text-tertiary' : 'bg-primary/20 text-primary');

            buttonsHtml += `
                <button type="button" class="dialog-asset-download-btn w-full text-left p-4 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest border border-white/10 hover:border-${meta.btnColor}/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group cursor-pointer overflow-hidden" data-url="${asset.browser_download_url}" data-filename="${asset.name}">
                    <div class="flex items-center gap-3.5 min-w-0 flex-1">
                        <div class="w-11 h-11 rounded-xl ${colorClass} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            <span class="material-symbols-outlined" style="font-size:22px">${meta.icon}</span>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-bold text-on-surface text-sm sm:text-base">${meta.typeTitle}</span>
                                <span class="px-2 py-0.5 rounded-full ${badgeColor} text-[10px] font-bold tracking-wide uppercase">${meta.badgeText}</span>
                            </div>
                            <p class="text-xs text-on-surface-variant mt-0.5 truncate">${meta.desc}</p>
                            <p class="text-[11px] text-on-surface-variant font-mono mt-1 flex items-center gap-1 truncate">
                                <span class="material-symbols-outlined flex-shrink-0" style="font-size:13px">description</span>
                                <span class="truncate">${asset.name}</span>
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/5 w-full sm:w-auto">
                        <span class="text-xs text-slate-400 font-mono font-medium whitespace-nowrap">${meta.sizeMb}</span>
                        <span class="bg-primary text-on-primary px-4 py-2 rounded-full text-xs font-semibold ambient-glow group-hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-1.5 shadow-md flex-shrink-0 whitespace-nowrap">
                            <span class="material-symbols-outlined" style="font-size:16px">download</span>
                            <span>Download</span>
                        </span>
                    </div>
                </button>
            `;
        });

        container.innerHTML = buttonsHtml;

        container.querySelectorAll('.dialog-asset-download-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.dataset.url;
                const filename = btn.dataset.filename;
                dialog.close();
                triggerDownload(url, filename);
            });
        });

        dialog.showModal();
    }

    function updateAndroidCard() {
        const androidDownloadBtn = document.getElementById('android-download-btn');
        const androidDownloadText = document.getElementById('android-download-text');
        const androidDownloadIcon = document.getElementById('android-download-icon');
        const androidVersionBadge = document.getElementById('android-version-badge');
        const androidBuildChip = document.getElementById('android-build-chip');
        const androidAssetSize = document.getElementById('android-asset-size');
        const tabStable = document.getElementById('android-tab-stable');
        const tabNightly = document.getElementById('android-tab-nightly');

        // Update tab appearance
        if (tabStable && tabNightly) {
            if (selectedAndroidBuildType === 'stable') {
                tabStable.className = 'android-build-tab active-stable px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all';
                tabStable.setAttribute('aria-selected', 'true');
                tabNightly.className = 'android-build-tab inactive px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all';
                tabNightly.setAttribute('aria-selected', 'false');
            } else {
                tabNightly.className = 'android-build-tab active-nightly px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all';
                tabNightly.setAttribute('aria-selected', 'true');
                tabStable.className = 'android-build-tab inactive px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all';
                tabStable.setAttribute('aria-selected', 'false');
            }
        }

        const isNightly = selectedAndroidBuildType === 'nightly';
        const activeRelease = isNightly ? latestNightlyAndroidRelease : latestStableAndroidRelease;

        if (activeRelease) {
            const tag = formatVersionTag(activeRelease.tag_name) || activeRelease.name || 'Release';
            const apkAsset = activeRelease.assets && activeRelease.assets.find(isAndroidAsset);

            if (androidBuildChip) {
                if (isNightly) {
                    androidBuildChip.className = 'version-chip version-chip--nightly';
                    androidBuildChip.textContent = '⚡ Nightly Build';
                } else {
                    androidBuildChip.className = 'version-chip version-chip--stable';
                    androidBuildChip.textContent = 'Stable Build';
                }
            }

            if (androidVersionBadge) {
                androidVersionBadge.textContent = isNightly ? (activeRelease.name || tag) : tag;
            }

            if (androidAssetSize) {
                if (apkAsset && apkAsset.size) {
                    const sizeMb = (apkAsset.size / (1024 * 1024)).toFixed(1) + ' MB';
                    androidAssetSize.textContent = `• ${sizeMb}`;
                } else {
                    androidAssetSize.textContent = '';
                }
            }

            if (androidDownloadBtn) {
                if (apkAsset && apkAsset.browser_download_url) {
                    androidDownloadBtn.href = apkAsset.browser_download_url;
                    androidDownloadBtn.dataset.filename = apkAsset.name || '';
                    androidDownloadBtn.classList.remove('opacity-50', 'pointer-events-none', 'cursor-not-allowed');
                } else {
                    androidDownloadBtn.href = '#';
                    delete androidDownloadBtn.dataset.filename;
                    androidDownloadBtn.classList.add('opacity-50', 'pointer-events-none', 'cursor-not-allowed');
                }
            }

            if (androidDownloadIcon) {
                androidDownloadIcon.textContent = isNightly ? 'bolt' : 'download';
            }

            if (androidDownloadText) {
                if (apkAsset && apkAsset.browser_download_url) {
                    androidDownloadText.textContent = isNightly ? 'Download Nightly APK' : `Download APK (${tag})`;
                } else {
                    androidDownloadText.textContent = 'No APK in build';
                }
            }

            const versionNote = document.getElementById('versionNote');
            if (versionNote) {
                const stableTag = latestStableAndroidRelease ? formatVersionTag(latestStableAndroidRelease.tag_name) : tag;
                versionNote.innerHTML = `Latest Stable Release: <strong>${stableTag}</strong>`;
            }
        } else {
            // No releases for this build type in GitHub API
            if (androidBuildChip) {
                androidBuildChip.className = isNightly ? 'version-chip version-chip--nightly' : 'version-chip version-chip--stable';
                androidBuildChip.textContent = isNightly ? '⚡ Nightly Build' : 'Stable Build';
            }
            if (androidVersionBadge) {
                androidVersionBadge.textContent = isNightly ? 'None Available' : 'Coming Soon';
            }
            if (androidAssetSize) {
                androidAssetSize.textContent = '';
            }
            if (androidDownloadBtn) {
                androidDownloadBtn.href = '#';
                delete androidDownloadBtn.dataset.filename;
                androidDownloadBtn.classList.add('opacity-50', 'pointer-events-none', 'cursor-not-allowed');
            }
            if (androidDownloadIcon) {
                androidDownloadIcon.textContent = isNightly ? 'bolt' : 'download';
            }
            if (androidDownloadText) {
                androidDownloadText.textContent = isNightly ? 'No Nightly Builds' : 'Coming Soon';
            }
        }
    }

    function updateVersionBadges() {
        // Overall header badge: show latest stable version
        const latestStableDesktop = desktopReleases.find(r => !isPrerelease(r)) || desktopReleases[0];
        const latestOverall = latestStableDesktop || latestStableAndroidRelease || allReleases.find(r => !isPrerelease(r)) || allReleases[0];
        if (latestOverall && ossVersionBadge) {
            ossVersionBadge.textContent = `${formatVersionTag(latestOverall.tag_name)} (Latest Stable Version)`;
        }

        // 1. Android: update based on selected build type
        updateAndroidCard();

        // 2. Windows: find latest release with Windows .exe
        const winRelease = desktopReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isWindowsAsset)) || allReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isWindowsAsset)) || desktopReleases.find(r => r.assets && r.assets.some(isWindowsAsset));
        const winDownloadBtn = document.getElementById('windows-download-btn');
        if (winRelease) {
            const winTag = formatVersionTag(winRelease.tag_name);
            if (windowsVersionBadge) windowsVersionBadge.textContent = winTag;
            if (winDownloadBtn) {
                winDownloadBtn.classList.remove('opacity-50', 'pointer-events-none');
            }
        } else if (desktopReleases.length > 0) {
            if (windowsVersionBadge) windowsVersionBadge.textContent = 'Coming Soon';
            if (winDownloadBtn) {
                winDownloadBtn.classList.add('opacity-50', 'pointer-events-none');
            }
        }

        // 3. Linux: find latest release with Linux assets (.AppImage, .deb, .snap)
        const linuxRelease = desktopReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isLinuxAsset)) || desktopReleases.find(r => r.assets && r.assets.some(isLinuxAsset));
        const linuxVersionBadge = document.getElementById('linux-version-badge');
        const linuxDownloadBtn = document.getElementById('linux-download-btn');
        if (linuxRelease) {
            const linuxTag = formatVersionTag(linuxRelease.tag_name);
            if (linuxVersionBadge) linuxVersionBadge.textContent = linuxTag;
            if (linuxDownloadBtn) {
                linuxDownloadBtn.classList.remove('opacity-50', 'pointer-events-none');
                const btnText = document.getElementById('linux-download-text');
                if (btnText) btnText.textContent = 'Download for Linux';
            }
        } else if (desktopReleases.length > 0) {
            if (linuxVersionBadge) linuxVersionBadge.textContent = 'Coming Soon';
            if (linuxDownloadBtn) {
                linuxDownloadBtn.classList.add('opacity-50', 'pointer-events-none');
                const btnText = document.getElementById('linux-download-text');
                if (btnText) btnText.textContent = 'Coming Soon';
            }
        }

        // 4. macOS: find latest release with macOS assets (.dmg, .pkg)
        const macosRelease = desktopReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isMacAsset)) || desktopReleases.find(r => r.assets && r.assets.some(isMacAsset));
        const macosVersionBadge = document.getElementById('macos-version-badge');
        const macosDownloadBtn = document.getElementById('macos-download-btn');
        if (macosRelease) {
            const macTag = formatVersionTag(macosRelease.tag_name);
            if (macosVersionBadge) macosVersionBadge.textContent = macTag;
            if (macosDownloadBtn) {
                macosDownloadBtn.classList.remove('opacity-50', 'pointer-events-none');
                const btnText = document.getElementById('macos-download-text');
                if (btnText) btnText.textContent = 'Download for macOS (.dmg)';
            }
        } else if (desktopReleases.length > 0) {
            if (macosVersionBadge) macosVersionBadge.textContent = 'Coming Soon';
            if (macosDownloadBtn) {
                macosDownloadBtn.classList.add('opacity-50', 'pointer-events-none');
                const btnText = document.getElementById('macos-download-text');
                if (btnText) btnText.textContent = 'Coming Soon';
            }
        }

        updatePlatformDownloadButtons();
    }

    // Android Build Selection Tabs Event Listeners
    const tabAndroidStable = document.getElementById('android-tab-stable');
    const tabAndroidNightly = document.getElementById('android-tab-nightly');

    if (tabAndroidStable) {
        tabAndroidStable.addEventListener('click', () => {
            selectedAndroidBuildType = 'stable';
            updateAndroidCard();
        });
    }

    if (tabAndroidNightly) {
        tabAndroidNightly.addEventListener('click', () => {
            selectedAndroidBuildType = 'nightly';
            updateAndroidCard();
        });
    }

    function openWindowsDownloadDialog() {
        const winRel = desktopReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isWindowsAsset)) || allReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isWindowsAsset)) || desktopReleases.find(r => r.assets && r.assets.some(isWindowsAsset));
        renderPlatformDialog('windows-download-dialog', 'Download for Windows', 'laptop_windows', winRel, isWindowsAsset);
    }

    function openLinuxDownloadDialog() {
        const linuxRel = desktopReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isLinuxAsset)) || desktopReleases.find(r => r.assets && r.assets.some(isLinuxAsset));
        renderPlatformDialog('linux-download-dialog', 'Download for Linux', 'terminal', linuxRel, isLinuxAsset);
    }

    function openMacOSDownloadDialog() {
        const macosRel = desktopReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isMacAsset)) || desktopReleases.find(r => r.assets && r.assets.some(isMacAsset));
        renderPlatformDialog('macos-download-dialog', 'Download for macOS', 'laptop_mac', macosRel, isMacAsset);
    }

    // Direct Download Click Handlers
    const androidDownloadBtn = document.getElementById('android-download-btn');
    const winDownloadBtn = document.getElementById('windows-download-btn');
    const linuxDownloadBtn = document.getElementById('linux-download-btn');
    const macosDownloadBtn = document.getElementById('macos-download-btn');
    const genericDownloadBtn = document.getElementById('downloadBtn');

    if (androidDownloadBtn) {
        androidDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const href = androidDownloadBtn.getAttribute('href');
            if (!href || href === '#' || href.startsWith('javascript:')) return;
            const filename = androidDownloadBtn.dataset.filename || '';
            triggerDownload(href, filename);
        });
    }

    if (winDownloadBtn) {
        winDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openWindowsDownloadDialog();
        });
    }

    if (linuxDownloadBtn) {
        linuxDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openLinuxDownloadDialog();
        });
    }

    if (macosDownloadBtn) {
        macosDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openMacOSDownloadDialog();
        });
    }

    if (genericDownloadBtn) {
        genericDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const href = genericDownloadBtn.getAttribute('href') || genericDownloadBtn.href;
            triggerDownload(href);
        });
    }

    updatePlatformDownloadButtons();

    // 4. Screenshots Section Accordion & Carousel
    const screenshotsToggle = document.getElementById('screenshots-toggle');
    const screenshotsContent = document.getElementById('screenshots-content');
    const screenshotsIcon = document.getElementById('screenshots-icon');

    if (screenshotsToggle && screenshotsContent) {
        screenshotsToggle.addEventListener('click', () => {
            const isCollapsed = screenshotsContent.style.maxHeight === '0px';
            if (isCollapsed) {
                screenshotsContent.style.maxHeight = '2500px';
                if (screenshotsIcon) screenshotsIcon.classList.add('rotated');
            } else {
                screenshotsContent.style.maxHeight = '0px';
                if (screenshotsIcon) screenshotsIcon.classList.remove('rotated');
            }
        });
    }

    // Interface Platform Switcher (App Interface vs Desktop Interface)
    const tabApp = document.getElementById('interface-tab-app');
    const tabDesktop = document.getElementById('interface-tab-desktop');
    const viewApp = document.getElementById('interface-view-app');
    const viewDesktop = document.getElementById('interface-view-desktop');
    const desktopPreviewDownloadBtn = document.getElementById('desktop-preview-download-btn');

    function switchInterfaceView(view) {
        if (view === 'desktop') {
            if (tabApp) {
                tabApp.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
                tabApp.classList.add('text-on-surface-variant', 'hover:text-on-surface');
            }
            if (tabDesktop) {
                tabDesktop.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
                tabDesktop.classList.remove('text-on-surface-variant', 'hover:text-on-surface');
            }
            if (viewApp) viewApp.classList.add('hidden');
            if (viewDesktop) viewDesktop.classList.remove('hidden');
        } else {
            if (tabDesktop) {
                tabDesktop.classList.remove('bg-primary', 'text-on-primary', 'shadow-sm');
                tabDesktop.classList.add('text-on-surface-variant', 'hover:text-on-surface');
            }
            if (tabApp) {
                tabApp.classList.add('bg-primary', 'text-on-primary', 'shadow-sm');
                tabApp.classList.remove('text-on-surface-variant', 'hover:text-on-surface');
            }
            if (viewDesktop) viewDesktop.classList.add('hidden');
            if (viewApp) viewApp.classList.remove('hidden');
        }
    }

    if (tabApp) {
        tabApp.addEventListener('click', (e) => {
            e.stopPropagation();
            switchInterfaceView('app');
        });
    }

    if (tabDesktop) {
        tabDesktop.addEventListener('click', (e) => {
            e.stopPropagation();
            switchInterfaceView('desktop');
        });
    }

    if (desktopPreviewDownloadBtn) {
        desktopPreviewDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openWindowsDownloadDialog();
        });
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth < 768 && viewDesktop && !viewDesktop.classList.contains('hidden')) {
            switchInterfaceView('app');
        }
    });

    // 1. Mobile App Screenshots Carousel Logic
    const appTrack = document.getElementById('screenshots-track');
    const appSlides = document.querySelectorAll('#interface-view-app .screenshots-slide');
    const appPrevBtn = document.getElementById('screenshots-prev');
    const appNextBtn = document.getElementById('screenshots-next');
    const appTitleEl = document.getElementById('screenshots-title');
    const appDescEl = document.getElementById('screenshots-description');
    const appIndexEl = document.getElementById('screenshots-current-index');
    const appIndicatorsEl = document.getElementById('screenshots-indicators');
    const appPreviewCards = document.querySelectorAll('#interface-view-app .screenshots-preview-card');

    let currentAppSlide = 0;
    const totalAppSlides = appSlides.length;

    function buildAppIndicators() {
        if (!appIndicatorsEl) return;
        appIndicatorsEl.innerHTML = '';
        for (let i = 0; i < totalAppSlides; i++) {
            const dot = document.createElement('div');
            dot.className = `screenshots-indicator ${i === currentAppSlide ? 'is-active' : ''}`;
            dot.addEventListener('click', () => goToAppSlide(i));
            appIndicatorsEl.appendChild(dot);
        }
    }

    function goToAppSlide(index) {
        if (index < 0) index = totalAppSlides - 1;
        if (index >= totalAppSlides) index = 0;
        currentAppSlide = index;

        if (appTrack) {
            appTrack.style.transform = `translateX(-${currentAppSlide * 100}%)`;
        }

        const activeSlide = appSlides[currentAppSlide];
        if (activeSlide) {
            if (appTitleEl) appTitleEl.textContent = activeSlide.dataset.title || 'Vista previa';
            if (appDescEl) appDescEl.textContent = activeSlide.dataset.description || '';
        }

        if (appIndexEl) {
            appIndexEl.textContent = String(currentAppSlide + 1).padStart(2, '0');
        }

        if (appIndicatorsEl) {
            const dots = appIndicatorsEl.querySelectorAll('.screenshots-indicator');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('is-active', idx === currentAppSlide);
            });
        }

        appPreviewCards.forEach((card, idx) => {
            card.classList.toggle('is-active', idx === currentAppSlide);
        });
    }

    if (appPrevBtn) appPrevBtn.addEventListener('click', () => goToAppSlide(currentAppSlide - 1));
    if (appNextBtn) appNextBtn.addEventListener('click', () => goToAppSlide(currentAppSlide + 1));

    appPreviewCards.forEach((card, idx) => {
        card.addEventListener('click', () => goToAppSlide(idx));
    });

    buildAppIndicators();

    // Touch Swipe for App Carousel
    if (appTrack) {
        let touchStartX = 0;
        let touchEndX = 0;
        let isSwiping = false;

        appTrack.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                isSwiping = true;
            }
        }, { passive: true });

        appTrack.addEventListener('touchmove', (e) => {
            if (isSwiping && e.touches.length === 1) {
                touchEndX = e.touches[0].clientX;
            }
        }, { passive: true });

        appTrack.addEventListener('touchend', () => {
            if (!isSwiping) return;
            const swipeThreshold = 35;
            const diff = touchEndX - touchStartX;
            if (touchEndX !== 0 && Math.abs(diff) > swipeThreshold) {
                if (diff < 0) {
                    goToAppSlide(currentAppSlide + 1);
                } else {
                    goToAppSlide(currentAppSlide - 1);
                }
            }
            touchStartX = 0;
            touchEndX = 0;
            isSwiping = false;
        }, { passive: true });
    }

    // 2. Desktop Screenshots Carousel Logic
    const desktopTrack = document.getElementById('desktop-screenshots-track');
    const desktopSlides = document.querySelectorAll('#interface-view-desktop .screenshots-slide');
    const desktopPrevBtn = document.getElementById('desktop-screenshots-prev');
    const desktopNextBtn = document.getElementById('desktop-screenshots-next');
    const desktopTitleEl = document.getElementById('desktop-screenshots-title');
    const desktopDescEl = document.getElementById('desktop-screenshots-description');
    const desktopIndexEl = document.getElementById('desktop-screenshots-current-index');
    const desktopIndicatorsEl = document.getElementById('desktop-screenshots-indicators');
    const desktopPreviewCards = document.querySelectorAll('.desktop-preview-card');

    let currentDesktopSlide = 0;
    const totalDesktopSlides = desktopSlides.length;

    function buildDesktopIndicators() {
        if (!desktopIndicatorsEl) return;
        desktopIndicatorsEl.innerHTML = '';
        for (let i = 0; i < totalDesktopSlides; i++) {
            const dot = document.createElement('div');
            dot.className = `screenshots-indicator ${i === currentDesktopSlide ? 'is-active' : ''}`;
            dot.addEventListener('click', () => goToDesktopSlide(i));
            desktopIndicatorsEl.appendChild(dot);
        }
    }

    function goToDesktopSlide(index) {
        if (index < 0) index = totalDesktopSlides - 1;
        if (index >= totalDesktopSlides) index = 0;
        currentDesktopSlide = index;

        if (desktopTrack) {
            desktopTrack.style.transform = `translateX(-${currentDesktopSlide * 100}%)`;
        }

        const activeSlide = desktopSlides[currentDesktopSlide];
        if (activeSlide) {
            if (desktopTitleEl) desktopTitleEl.textContent = activeSlide.dataset.title || 'Desktop View';
            if (desktopDescEl) desktopDescEl.textContent = activeSlide.dataset.description || '';
        }

        if (desktopIndexEl) {
            desktopIndexEl.textContent = String(currentDesktopSlide + 1).padStart(2, '0');
        }

        if (desktopIndicatorsEl) {
            const dots = desktopIndicatorsEl.querySelectorAll('.screenshots-indicator');
            dots.forEach((dot, idx) => {
                dot.classList.toggle('is-active', idx === currentDesktopSlide);
            });
        }

        desktopPreviewCards.forEach((card, idx) => {
            card.classList.toggle('is-active', idx === currentDesktopSlide);
        });
    }

    if (desktopPrevBtn) desktopPrevBtn.addEventListener('click', () => goToDesktopSlide(currentDesktopSlide - 1));
    if (desktopNextBtn) desktopNextBtn.addEventListener('click', () => goToDesktopSlide(currentDesktopSlide + 1));

    desktopPreviewCards.forEach((card, idx) => {
        card.addEventListener('click', () => goToDesktopSlide(idx));
    });

    buildDesktopIndicators();

    // Touch Swipe for Desktop Carousel
    if (desktopTrack) {
        let touchStartX = 0;
        let touchEndX = 0;
        let isSwiping = false;

        desktopTrack.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                isSwiping = true;
            }
        }, { passive: true });

        desktopTrack.addEventListener('touchmove', (e) => {
            if (isSwiping && e.touches.length === 1) {
                touchEndX = e.touches[0].clientX;
            }
        }, { passive: true });

        desktopTrack.addEventListener('touchend', () => {
            if (!isSwiping) return;
            const swipeThreshold = 35;
            const diff = touchEndX - touchStartX;
            if (touchEndX !== 0 && Math.abs(diff) > swipeThreshold) {
                if (diff < 0) {
                    goToDesktopSlide(currentDesktopSlide + 1);
                } else {
                    goToDesktopSlide(currentDesktopSlide - 1);
                }
            }
            touchStartX = 0;
            touchEndX = 0;
            isSwiping = false;
        }, { passive: true });
    }

    // Mobile Navigation Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNavMenu = document.getElementById('mobile-nav-menu');
    const mobileMenuIcon = document.getElementById('mobile-menu-icon');

    if (mobileMenuBtn && mobileNavMenu) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = mobileNavMenu.classList.contains('hidden');
            if (isHidden) {
                mobileNavMenu.classList.remove('hidden');
                mobileNavMenu.classList.add('flex');
                if (mobileMenuIcon) mobileMenuIcon.textContent = 'close';
            } else {
                mobileNavMenu.classList.add('hidden');
                mobileNavMenu.classList.remove('flex');
                if (mobileMenuIcon) mobileMenuIcon.textContent = 'menu';
            }
        });

        // Auto close mobile menu when clicking any nav link
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileNavMenu.classList.add('hidden');
                mobileNavMenu.classList.remove('flex');
                if (mobileMenuIcon) mobileMenuIcon.textContent = 'menu';
            });
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!mobileNavMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                mobileNavMenu.classList.add('hidden');
                mobileNavMenu.classList.remove('flex');
                if (mobileMenuIcon) mobileMenuIcon.textContent = 'menu';
            }
        });
    }

    // 5. Changelog Modal Triggers
    const changelogTrigger = document.getElementById('changelog-trigger');
    const windowsChangelogTrigger = document.getElementById('windows-changelog-trigger');
    const linuxChangelogTrigger = document.getElementById('linux-changelog-trigger');
    const macosChangelogTrigger = document.getElementById('macos-changelog-trigger');
    const changelogDialog = document.getElementById('changelog-dialog');
    const changelogContent = document.getElementById('changelog-content');

    function openChangelogModal(targetRel) {
        if (!changelogDialog || !changelogContent) return;
        const rel = targetRel || latestRelease;
        if (!rel) {
            showToast('No release notes available.');
            return;
        }
        changelogDialog.showModal();
        let bodyMarkdown = `### ${rel.name || formatVersionTag(rel.tag_name) || 'AirBeats'} Release Notes\n\n${rel.body || 'No release details.'}`;
        if (window.marked) {
            changelogContent.innerHTML = `<div class="prose prose-invert max-w-none text-on-surface-variant">${window.marked.parse(bodyMarkdown)}</div>`;
        } else {
            changelogContent.innerHTML = `<pre class="text-sm text-on-surface-variant whitespace-pre-wrap">${bodyMarkdown}</pre>`;
        }
    }

    if (changelogTrigger) {
        changelogTrigger.addEventListener('click', () => {
            const rel = selectedAndroidBuildType === 'nightly'
                ? (latestNightlyAndroidRelease || allReleases.find(r => isPrerelease(r) && r.assets && r.assets.some(isAndroidAsset)))
                : (latestStableAndroidRelease || allReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isAndroidAsset)));
            openChangelogModal(rel);
        });
    }
    if (windowsChangelogTrigger) {
        windowsChangelogTrigger.addEventListener('click', () => {
            const winRel = desktopReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isWindowsAsset)) || latestDesktopRelease;
            openChangelogModal(winRel);
        });
    }
    if (linuxChangelogTrigger) {
        linuxChangelogTrigger.addEventListener('click', () => {
            const linuxRel = desktopReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isLinuxAsset)) || latestDesktopRelease;
            openChangelogModal(linuxRel);
        });
    }
    if (macosChangelogTrigger) {
        macosChangelogTrigger.addEventListener('click', () => {
            const macRel = desktopReleases.find(r => !isPrerelease(r) && r.assets && r.assets.some(isMacAsset)) || latestDesktopRelease;
            openChangelogModal(macRel);
        });
    }

    // 6. Previous Versions Modal Popup Logic (Android, Windows, Linux, macOS)
    const versionsTrigger = document.getElementById('versions-trigger');
    const windowsVersionsTrigger = document.getElementById('windows-versions-trigger');
    const linuxVersionsTrigger = document.getElementById('linux-versions-trigger');
    const macosVersionsTrigger = document.getElementById('macos-versions-trigger');
    const versionsDialog = document.getElementById('versions-dialog');
    const versionsList = document.getElementById('versions-list');

    function renderVersionsModal(filterPlatform = 'all', buildType = null) {
        if (!versionsDialog || !versionsList) return;

        const dialogTitle = versionsDialog.querySelector('.dialog-header h3');
        let assetFilter = () => true;
        let candidateReleases = allReleases;
        let platformName = 'Versions';
        let filterBuild = buildType;
        let activeRelease = null;

        if (filterPlatform === 'windows') {
            platformName = 'Windows';
            assetFilter = isWindowsAsset;
            candidateReleases = desktopReleases.length > 0 ? desktopReleases : allReleases;
            candidateReleases = candidateReleases.filter(r => !isPrerelease(r));
            activeRelease = candidateReleases.find(r => r.assets && r.assets.some(isWindowsAsset));
            if (dialogTitle) dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">laptop_windows</span> Previous Windows Versions (.exe)</span>`;
        } else if (filterPlatform === 'linux') {
            platformName = 'Linux';
            assetFilter = isLinuxAsset;
            candidateReleases = desktopReleases.filter(r => !isPrerelease(r));
            activeRelease = candidateReleases.find(r => r.assets && r.assets.some(isLinuxAsset));
            if (dialogTitle) dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-secondary">terminal</span> Previous Linux Versions</span>`;
        } else if (filterPlatform === 'macos') {
            platformName = 'macOS';
            assetFilter = isMacAsset;
            candidateReleases = desktopReleases.filter(r => !isPrerelease(r));
            activeRelease = candidateReleases.find(r => r.assets && r.assets.some(isMacAsset));
            if (dialogTitle) dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-tertiary">laptop_mac</span> Previous macOS Versions (.dmg)</span>`;
        } else if (filterPlatform === 'android') {
            platformName = 'Android';
            assetFilter = isAndroidAsset;
            if (!filterBuild) {
                filterBuild = selectedAndroidBuildType;
            }
            if (filterBuild === 'nightly') {
                // Strictly ONLY Nightly / Pre-releases, NO stable builds
                candidateReleases = allReleases.filter(r => isPrerelease(r));
                activeRelease = latestNightlyAndroidRelease || candidateReleases.find(r => r.assets && r.assets.some(isAndroidAsset));
                if (dialogTitle) dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-amber-400">bolt</span> Previous Android Nightly Builds (.apk)</span>`;
            } else {
                // Strictly ONLY Stable releases, NO nightly builds
                candidateReleases = allReleases.filter(r => !isPrerelease(r));
                activeRelease = latestStableAndroidRelease || candidateReleases.find(r => r.assets && r.assets.some(isAndroidAsset));
                if (dialogTitle) dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-tertiary">android</span> Previous Android Stable Versions (.apk)</span>`;
            }
        } else {
            if (dialogTitle) dialogTitle.innerHTML = `<span class="flex items-center gap-2"><span class="material-symbols-outlined text-primary">history</span> Previous Versions</span>`;
        }

        // Deduplicate candidate releases
        candidateReleases = deduplicateReleases(candidateReleases);

        // Filter releases having assets for this platform
        const releasesWithAssets = candidateReleases.filter(rel => rel && rel.assets && rel.assets.some(assetFilter));

        // Previous versions means versions prior to the currently active/latest version
        const previousReleases = activeRelease
            ? releasesWithAssets.filter(rel => (rel.id ? rel.id !== activeRelease.id : true) && (rel.tag_name ? rel.tag_name !== activeRelease.tag_name : true))
            : releasesWithAssets;

        // Subheader navigation for Android inside the modal to switch between Stable and Nightly easily
        let topBarHtml = '';
        if (filterPlatform === 'android') {
            topBarHtml = `
                <div class="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10 flex-wrap">
                    <div class="inline-flex items-center p-1 bg-surface-container rounded-full border border-white/10 shadow-inner">
                        <button type="button" class="modal-android-tab ${filterBuild === 'stable' ? 'active-stable' : 'inactive'} px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer" data-build="stable">
                            <span class="material-symbols-outlined" style="font-size:15px">verified</span>
                            <span>Stable Versions</span>
                        </button>
                        <button type="button" class="modal-android-tab ${filterBuild === 'nightly' ? 'active-nightly' : 'inactive'} px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer" data-build="nightly">
                            <span class="material-symbols-outlined" style="font-size:15px">bolt</span>
                            <span>Nightly Builds</span>
                        </button>
                    </div>
                    <span class="text-xs text-on-surface-variant font-medium">${previousReleases.length} previous build(s) found</span>
                </div>
            `;
        }

        if (!previousReleases || previousReleases.length === 0) {
            versionsList.innerHTML = `
                ${topBarHtml}
                <div class="text-center py-10">
                    <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">info</span>
                    <p class="text-on-surface font-semibold text-base">No previous ${filterBuild ? filterBuild + ' ' : ''}${platformName} versions found</p>
                    <p class="text-xs text-on-surface-variant mt-1">There are no older releases available in the repository history.</p>
                </div>
            `;
            versionsList.querySelectorAll('.modal-android-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const targetBuild = tab.dataset.build;
                    renderVersionsModal('android', targetBuild);
                });
            });
            versionsDialog.showModal();
            return;
        }

        let html = topBarHtml;
        previousReleases.forEach(rel => {
            const isNightly = isPrerelease(rel);
            const tag = isNightly ? (rel.name || rel.tag_name || 'Nightly') : (formatVersionTag(rel.tag_name) || rel.name || 'Release');
            const pubDate = rel.published_at ? new Date(rel.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';
            const rawNotes = rel.body ? rel.body.split('\n').filter(l => l.trim())[0] || (isNightly ? 'Nightly experimental pre-release build' : 'Official stable release') : (isNightly ? 'Nightly experimental pre-release build' : 'Official stable release');
            const cleanNotes = rawNotes.replace(/[#*`]/g, '').substring(0, 110);

            // Exact downloadable assets for this platform
            const downloadableAssets = (rel.assets || []).filter(assetFilter);

            let assetButtons = '';
            downloadableAssets.forEach(asset => {
                const meta = getAssetMeta(asset);
                const btnClass = isNightly
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                    : (meta.btnColor === 'secondary' ? 'bg-secondary-container text-on-secondary-container hover:brightness-110' : (meta.btnColor === 'tertiary' ? 'bg-tertiary-container text-on-tertiary-container hover:brightness-110' : 'bg-primary-container text-on-primary-container hover:brightness-110'));

                assetButtons += `
                    <a href="${asset.browser_download_url}" data-filename="${asset.name}" class="version-download-link ${btnClass} px-4 py-2 rounded-full text-xs font-semibold no-underline inline-flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer">
                        <span class="material-symbols-outlined" style="font-size:16px">${isNightly ? 'bolt' : meta.icon}</span>
                        ${asset.name} (${meta.sizeMb})
                    </a>
                `;
            });

            const badgeMarkup = isNightly
                ? `<span class="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1"><span class="material-symbols-outlined" style="font-size:14px">bolt</span>${tag}</span>`
                : `<span class="px-3 py-1 rounded-full bg-primary/20 text-primary font-bold text-xs">${tag}</span>`;

            html += `
                <div class="bg-surface-container-high p-5 rounded-2xl mb-4 border border-white/5 shadow-md flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            ${badgeMarkup}
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

        // Add event listeners for modal Android build toggle tabs
        versionsList.querySelectorAll('.modal-android-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetBuild = tab.dataset.build;
                renderVersionsModal('android', targetBuild);
            });
        });

        versionsDialog.showModal();
    }

    if (versionsList) {
        versionsList.addEventListener('click', (e) => {
            const link = e.target.closest('.version-download-link');
            if (link) {
                e.preventDefault();
                const url = link.getAttribute('href');
                const filename = link.dataset.filename || 'AirBeats';
                triggerDownload(url, filename);
            }
        });
    }

    if (versionsTrigger) {
        versionsTrigger.addEventListener('click', () => renderVersionsModal('android'));
    }
    if (windowsVersionsTrigger) {
        windowsVersionsTrigger.addEventListener('click', () => renderVersionsModal('windows'));
    }
    if (linuxVersionsTrigger) {
        linuxVersionsTrigger.addEventListener('click', () => renderVersionsModal('linux'));
    }
    if (macosVersionsTrigger) {
        macosVersionsTrigger.addEventListener('click', () => renderVersionsModal('macos'));
    }

    fetchReleases();
});




/* Demo Controller: Desktop 3D Flip Card & Mobile Fullscreen Modal Handler */
function initAirBeatsDemoController() {
  const heroFlipCard = document.getElementById('heroFlipCard');
  const heroDemoBtn = document.getElementById('hero-demo-btn');
  const heroDemoBtnIcon = document.getElementById('heroDemoBtnIcon');
  const heroDemoBtnText = document.getElementById('heroDemoBtnText');
  const heroCardFront = document.getElementById('heroCardFront');
  const btnFlipBack = document.getElementById('btnFlipBack');
  const navDemoLink = document.getElementById('navDemoLink');
  const mobileFullscreenModal = document.getElementById('mobileFullscreenModal');
  const btnCloseMobileModal = document.getElementById('btnCloseMobileModal');

  function setButtonState(active) {
    if (heroDemoBtnText) {
      heroDemoBtnText.textContent = active ? 'Close Demo' : 'Try Demo';
    }
    if (heroDemoBtnIcon) {
      heroDemoBtnIcon.textContent = active ? 'cancel' : 'play_circle';
      heroDemoBtnIcon.className = active ? 'material-symbols-outlined text-rose-400' : 'material-symbols-outlined text-emerald-400';
    }
  }

  function toggleDemo(e) {
    if (e) e.preventDefault();
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      if (mobileFullscreenModal) {
        if (!mobileFullscreenModal.classList.contains('active')) {
          mobileFullscreenModal.classList.add('active');
          document.body.style.overflow = 'hidden';
          setButtonState(true);
        } else {
          closeMobileModal();
        }
      }
    } else {
      if (heroFlipCard) {
        if (!heroFlipCard.classList.contains('flipped')) {
          heroFlipCard.classList.add('flipped');
          heroFlipCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setButtonState(true);
        } else {
          flipToFront(e);
        }
      }
    }
  }

  function closeMobileModal(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (mobileFullscreenModal) {
      mobileFullscreenModal.classList.remove('active');
      document.body.style.overflow = '';
      setButtonState(false);
    }
  }

  function flipToFront(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (heroFlipCard) {
      heroFlipCard.classList.remove('flipped');
      setButtonState(false);
    }
  }

  if (heroDemoBtn) heroDemoBtn.addEventListener('click', toggleDemo);
  if (heroCardFront) heroCardFront.addEventListener('click', toggleDemo);
  if (navDemoLink) navDemoLink.addEventListener('click', toggleDemo);
  if (btnFlipBack) btnFlipBack.addEventListener('click', flipToFront);
  if (btnCloseMobileModal) btnCloseMobileModal.addEventListener('click', closeMobileModal);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAirBeatsDemoController);
} else {
  initAirBeatsDemoController();
}

/* ==========================================================================
   AirBeats Application Engine & Search Controller
   Dev By DxV STUDIO 亗 | Android Music Emulator
   ========================================================================== */

const USER_AVATAR_URL = "https://avatars.githubusercontent.com/u/241423835?v=4";

const FALLBACK_MUSIC_DATABASE = [
  {
    trackId: 101,
    trackName: "O Maahi",
    artistName: "Arijit Singh & Pritam",
    collectionName: "Dunki (Original Motion Picture Soundtrack)",
    primaryGenreName: "Bollywood",
    releaseDate: "2024-01-01T00:00:00Z",
    artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/5a/08/90/5a089063-2615-5858-a532-a548bc889d1a/8902894362146.jpg/600x600bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/4a/60/76/4a60768e-9905-234b-449e-c8ff46fb1fef/mzaf_16560934091629853381.plus.aac.p.m4a"
  },
  {
    trackId: 102,
    trackName: "Tum Kya Mile - Lofi",
    artistName: "Arijit Singh, Shreya Ghoshal & Pritam",
    collectionName: "Rocky Aur Rani Kii Prem Kahaani",
    primaryGenreName: "Bollywood",
    releaseDate: "2023-06-28T00:00:00Z",
    artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/80/47/9b/80479b08-360e-8902-6c39-2a9a4e76a66a/8902894357593.jpg/600x600bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/b8/91/30/b891307b-841a-a5f6-17b5-2d4e73f4e3c9/mzaf_10677561877478065099.plus.aac.p.m4a"
  },
  {
    trackId: 103,
    trackName: "Jhoom - Vishal Mishra",
    artistName: "Vishal Mishra & Mithoon",
    collectionName: "Gadar 2",
    primaryGenreName: "Bollywood",
    releaseDate: "2023-08-01T00:00:00Z",
    artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/37/ef/8537ef67-17b1-2180-2882-73a74c4ed464/8902894358828.jpg/600x600bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/05/65/59/05655979-3c81-8078-433c-352210fbfa5a/mzaf_13506927954131557022.plus.aac.p.m4a"
  },
  {
    trackId: 104,
    trackName: "ESSE CARA! (Sped Up)",
    artistName: "Sayfalse, Scythermane & TRXSHBXY",
    collectionName: "ESSE CARA! (Sped Up) - Single",
    primaryGenreName: "Phonk",
    releaseDate: "2024-01-01T00:00:00Z",
    artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/7e/83/ce/7e83ce5c-cb1c-0cb9-5fcd-89f797172317/1043254.jpg/600x600bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/af/87/8a/af878a06-42f9-b957-c67c-13619e8a6272/mzaf_12187353444091077030.plus.aac.p.m4a"
  },
  {
    trackId: 105,
    trackName: "FUNK MI CAMINO",
    artistName: "Sayfalse & Junior RCE",
    collectionName: "Funk Mi Camino - Single",
    primaryGenreName: "Phonk",
    releaseDate: "2023-05-10T00:00:00Z",
    artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/c8/58/f3/c858f365-b207-651d-13ca-39015bba75b9/7721.jpg/600x600bb.jpg",
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f7/16/2d/f7162dd1-2002-cd4b-f63a-bb01cb22596f/mzaf_17850094322210168746.plus.aac.p.m4a"
  }
];

function getCuratedFallbackResults(term) {
  const q = term ? term.toLowerCase() : '';
  const filtered = FALLBACK_MUSIC_DATABASE.filter(item => 
    item.trackName.toLowerCase().includes(q) || 
    item.artistName.toLowerCase().includes(q) ||
    item.primaryGenreName.toLowerCase().includes(q)
  );
  return filtered.length > 0 ? filtered : FALLBACK_MUSIC_DATABASE;
}

async function queryiTunesAPI(searchTerm, limit = 25) {
  try {
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=${limit}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.results && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (err) {
    console.warn("Direct fetch notice, attempting fallback...", err);
  }

  return new Promise((resolve) => {
    const callbackName = 'itunes_cb_' + Math.floor(Math.random() * 1000000);
    const scriptUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=${limit}&callback=${callbackName}`;
    let isHandled = false;

    const timeout = setTimeout(() => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        resolve(getCuratedFallbackResults(searchTerm));
      }
    }, 2500);

    window[callbackName] = function(data) {
      if (isHandled) return;
      isHandled = true;
      clearTimeout(timeout);
      cleanup();
      if (data && data.results && data.results.length > 0) {
        resolve(data.results);
      } else {
        resolve(getCuratedFallbackResults(searchTerm));
      }
    };

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.onerror = function() {
      if (isHandled) return;
      isHandled = true;
      clearTimeout(timeout);
      cleanup();
      resolve(getCuratedFallbackResults(searchTerm));
    };

    function cleanup() {
      try {
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      } catch (e) {}
    }

    document.body.appendChild(script);
  });
}

const INITIAL_CURATED_TRACKS = [
  {
    id: "itunes_1648938363",
    title: "ESSE CARA! (Sped Up)",
    artist: "Sayfalse, Scythermane & TRXSHBXY",
    album: "ESSE CARA! (Sped Up) - Single",
    genre: "Phonk / Electronic",
    year: "2024",
    art: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/7e/83/ce/7e83ce5c-cb1c-0cb9-5fcd-89f797172317/1043254.jpg/600x600bb.jpg",
    artThumb: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/7e/83/ce/7e83ce5c-cb1c-0cb9-5fcd-89f797172317/1043254.jpg/300x300bb.jpg",
    audio: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/af/87/8a/af878a06-42f9-b957-c67c-13619e8a6272/mzaf_12187353444091077030.plus.aac.p.m4a",
    duration: 30,
    liked: true
  },
  {
    id: "itunes_1971887309",
    title: "FUNK MI CAMINO",
    artist: "Sayfalse & Junior RCE",
    album: "Funk Mi Camino - Single",
    genre: "Phonk",
    year: "2023",
    art: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/c8/58/f3/c858f365-b207-651d-13ca-39015bba75b9/7721.jpg/600x600bb.jpg",
    artThumb: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/c8/58/f3/c858f365-b207-651d-13ca-39015bba75b9/7721.jpg/300x300bb.jpg",
    audio: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f7/16/2d/f7162dd1-2002-cd4b-f63a-bb01cb22596f/mzaf_17850094322210168746.plus.aac.p.m4a",
    duration: 30,
    liked: false
  },
  {
    id: "itunes_840780180",
    title: "Nachde Ne Saare",
    artist: "Jasleen Royal, Harshdeep Kaur & Siddharth",
    album: "Baar Baar Dekho",
    genre: "Bollywood / Dance",
    year: "2016",
    art: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/14/b8/58/14b85883-40a4-0a2e-de65-130f55726ee6/840780180390.png/600x600bb.jpg",
    artThumb: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/14/b8/58/14b85883-40a4-0a2e-de65-130f55726ee6/840780180390.png/300x300bb.jpg",
    audio: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/ef/d5/96/efd5965b-1084-4f5e-23c5-774c22ffb682/mzaf_17530489274193688460.plus.aac.p.m4a",
    duration: 30,
    liked: true
  },
  {
    id: "itunes_14797123",
    title: "NUNCA MUDA?",
    artist: "Scythermane, NXGHT! & MC Fabinho",
    album: "NUNCA MUDA? - Single",
    genre: "Phonk / Funk",
    year: "2024",
    art: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/45/75/1f/45751fab-8a44-70ec-ce16-695290892499/14797.jpg/600x600bb.jpg",
    artThumb: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/45/75/1f/45751fab-8a44-70ec-ce16-695290892499/14797.jpg/300x300bb.jpg",
    audio: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/fa/3a/34/fa3a34fb-0fa4-5f66-8234-4a408f57200c/mzaf_7185755272822523038.plus.aac.p.m4a",
    duration: 30,
    liked: false
  },
  {
    id: "itunes_42925456",
    title: "Thumka",
    artist: "Kunal Ganjawala, Sahir Ali Bagga & Sana",
    album: "Thumka - Single",
    genre: "Pop / World",
    year: "2020",
    art: "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/aa/96/ba/aa96badb-128d-fe1b-3058-3f5fa2376191/cover.jpg/600x600bb.jpg",
    artThumb: "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/aa/96/ba/aa96badb-128d-fe1b-3058-3f5fa2376191/cover.jpg/300x300bb.jpg",
    audio: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/ad/52/66/ad526602-0e58-dfea-48e5-c2ed3e65bfbe/mzaf_4292545678407866085.plus.aac.p.m4a",
    duration: 30,
    liked: false
  }
];

class AirBeatsApp {
  constructor() {
    this.playlist = [...INITIAL_CURATED_TRACKS];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isShuffle = false;
    this.isDraggingTimeline = false;
    this.sleepTimer = null;
    this.activeViewId = 'viewHome';
    this.previousViewId = 'viewHome';
    this.hasUserPlayedSong = false;
    this.isMiniPlayerDismissed = false;

    this.recentSearches = ['songs', 'fonk', 'bollywood', 'pop'];

    this.audio = document.getElementById('mainAudioPlayer');
    this.init();
  }

  async init() {
    this.bindEvents();
    this.bindSearchInputEvents();
    this.bindResultsEvents();
    this.bindLibraryEvents();
    this.bindSettingsEvents();
    this.bindExploreEvents();
    this.bindStatsEvents();
    this.bindAllBackArrows();
    this.initTimelineScrubber();
    this.initMiniPlayerSlideDown();

    this.loadTrack(this.currentIndex, false);
    this.renderQuickPicks();
    this.renderLikedTracks();
    this.renderRecentSearches();
    this.startClock();

    this.fetchGlobalStats();
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      minutes = minutes < 10 ? '0' + minutes : minutes;
      document.querySelectorAll('.status-time').forEach(el => el.textContent = `${hours}:${minutes}`);
    };
    updateTime();
    setInterval(updateTime, 30000);
  }

  switchView(viewId) {
    if (this.activeViewId !== viewId) {
      this.previousViewId = this.activeViewId;
    }
    this.activeViewId = viewId;
    
    document.querySelectorAll('.screen-view').forEach(v => v.classList.remove('active-view'));
    
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active-view');

    document.querySelectorAll('.liquid-nav-item').forEach(btn => {
      const target = btn.getAttribute('data-target');
      const isMatch = (target === viewId) || (target === 'viewSearch' && (viewId === 'viewSearchInput' || viewId === 'viewSearchResults'));
      btn.classList.toggle('active', isMatch);
    });

    this.updateMiniPlayerVisibility();
  }

  goBack() {
    const target = (this.previousViewId && this.previousViewId !== this.activeViewId) ? this.previousViewId : 'viewHome';
    this.switchView(target);
  }

  bindAllBackArrows() {
    const backBtnIds = [
      'btnSearchInputBackHome',
      'btnResultsBackToSearch',
      'btnNPAckHome',
      'btnLikedBackToLib',
      'btnStatsBackHome'
    ];

    backBtnIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.goBack();
        });
      }
    });
  }

  updateMiniPlayerVisibility() {
    const miniPlayer = document.getElementById('screenMiniPlayer');
    if (!miniPlayer) return;

    if (!this.hasUserPlayedSong || this.isMiniPlayerDismissed || this.activeViewId === 'viewNowPlaying') {
      miniPlayer.classList.add('hidden');
    } else {
      miniPlayer.classList.remove('hidden');
      miniPlayer.classList.remove('sliding-down');
    }
  }

  loadTrack(index, autoPlay = true) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    const track = this.playlist[index];

    this.audio.src = track.audio;
    this.audio.load();

    this.updateUI(track);
    this.resetTimeline();

    if (autoPlay) {
      this.playAudio();
    }
  }

  playAudio() {
    this.hasUserPlayedSong = true;
    this.isMiniPlayerDismissed = false;
    this.updateMiniPlayerVisibility();

    this.audio.play().then(() => {
      this.isPlaying = true;
      this.updatePlayStateUI();
    }).catch(err => {
      console.warn("Audio playback notice:", err);
      this.isPlaying = false;
      this.updatePlayStateUI();
    });
  }

  pauseAudio() {
    this.audio.pause();
    this.isPlaying = false;
    this.updatePlayStateUI();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pauseAudio();
    } else {
      this.playAudio();
    }
  }

  nextTrack() {
    let nextIndex;
    if (this.isShuffle) {
      nextIndex = Math.floor(Math.random() * this.playlist.length);
    } else {
      nextIndex = (this.currentIndex + 1) % this.playlist.length;
    }
    this.loadTrack(nextIndex, true);
  }

  prevTrack() {
    let prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.loadTrack(prevIndex, true);
  }

  updateUI(track) {
    const npImg = document.getElementById('npTrackImg');
    if (npImg) npImg.src = track.art || track.artThumb;
    
    const npTitle = document.getElementById('npTrackTitle');
    if (npTitle) npTitle.textContent = track.title;
    
    const npArtist = document.getElementById('npTrackArtist');
    if (npArtist) npArtist.textContent = track.artist;

    const npAlbumTag = document.getElementById('npTrackAlbumTag');
    if (npAlbumTag) npAlbumTag.textContent = `${track.album || 'Single'} • ${track.genre || 'Music'}`;

    const npLike = document.getElementById('btnNPLike');
    if (npLike) npLike.classList.toggle('liked', !!track.liked);

    const keepImg = document.getElementById('keepTrackImg');
    if (keepImg) keepImg.src = track.artThumb || track.art;

    const keepTitle = document.getElementById('keepTrackTitle');
    if (keepTitle) keepTitle.textContent = track.title;

    const keepArtist = document.getElementById('keepTrackArtist');
    if (keepArtist) keepArtist.textContent = track.artist;

    const keepLike = document.getElementById('keepLikeBtn');
    if (keepLike) keepLike.classList.toggle('liked', !!track.liked);

    const miniThumb = document.getElementById('miniThumb');
    if (miniThumb) miniThumb.src = track.artThumb || track.art;

    const miniTitle = document.getElementById('miniTitle');
    if (miniTitle) miniTitle.textContent = track.title;

    const miniArtist = document.getElementById('miniArtist');
    if (miniArtist) miniArtist.textContent = track.artist;

    const miniLike = document.getElementById('miniLikeBtn');
    if (miniLike) {
      miniLike.innerHTML = track.liked ? '<i class="fa-solid fa-heart text-pink"></i>' : '<i class="fa-regular fa-heart"></i>';
    }

    document.querySelectorAll('.track-item').forEach((item) => {
      const tid = item.getAttribute('data-id');
      item.classList.toggle('playing', tid === track.id);
    });
  }

  updatePlayStateUI() {
    const playIcon = document.getElementById('playIcon');
    const miniPlayBtn = document.getElementById('miniPlayBtn');
    const screen = document.getElementById('phoneScreen');

    if (this.isPlaying) {
      if (playIcon) playIcon.className = 'fa-solid fa-pause';
      if (miniPlayBtn) miniPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      if (screen) screen.classList.add('playing');
    } else {
      if (playIcon) playIcon.className = 'fa-solid fa-play';
      if (miniPlayBtn) miniPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      if (screen) screen.classList.remove('playing');
    }
  }

  // --- Dedicated Search Input Screen Events ---
  bindSearchInputEvents() {
    const input = document.getElementById('phoneSearchInput');
    if (input) {
      let debounceTimer = null;
      input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(debounceTimer);
        if (query.length >= 1) {
          debounceTimer = setTimeout(() => {
            this.fetchTextSuggestions(query);
          }, 200);
        } else {
          const suggestionsContainer = document.getElementById('textSuggestionsContainer');
          const recentContainer = document.getElementById('recentSearchesContainer');
          if (suggestionsContainer) suggestionsContainer.classList.add('hidden');
          if (recentContainer) recentContainer.classList.remove('hidden');
        }
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const query = input.value.trim();
          if (query) {
            this.executePhoneSearch(query, true);
          }
        }
      });
    }
  }

  addRecentSearch(query) {
    if (!query) return;
    this.recentSearches = this.recentSearches.filter(q => q.toLowerCase() !== query.toLowerCase());
    this.recentSearches.unshift(query);
    if (this.recentSearches.length > 8) this.recentSearches.pop();
    this.renderRecentSearches();
  }

  renderRecentSearches() {
    const container = document.getElementById('recentSearchesContainer');
    if (!container) return;

    container.innerHTML = '';
    this.recentSearches.forEach((query) => {
      const row = document.createElement('div');
      row.className = 'recent-search-row';
      row.setAttribute('data-query', query);
      row.innerHTML = `
        <div class="recent-search-left">
          <div class="history-clock-box">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </div>
          <span class="recent-query-text">${query}</span>
        </div>
        <div class="recent-search-right">
          <button class="recent-action-btn remove-history-btn" title="Remove"><i class="fa-solid fa-xmark"></i></button>
          <button class="recent-action-btn fill-query-btn" title="Use Query"><i class="fa-solid fa-arrow-up-long" style="transform: rotate(-45deg);"></i></button>
        </div>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.remove-history-btn')) {
          e.stopPropagation();
          this.recentSearches = this.recentSearches.filter(q => q !== query);
          this.renderRecentSearches();
        } else if (e.target.closest('.fill-query-btn')) {
          e.stopPropagation();
          const input = document.getElementById('phoneSearchInput');
          if (input) input.value = query;
          this.fetchTextSuggestions(query);
        } else {
          const input = document.getElementById('phoneSearchInput');
          if (input) input.value = query;
          this.executePhoneSearch(query, true);
        }
      });

      container.appendChild(row);
    });
  }

  // --- Fetch Text-Only Song Suggestions ---
  async fetchTextSuggestions(query) {
    if (!query) return;

    const recentContainer = document.getElementById('recentSearchesContainer');
    const suggestionsContainer = document.getElementById('textSuggestionsContainer');

    if (recentContainer) recentContainer.classList.add('hidden');
    if (suggestionsContainer) {
      suggestionsContainer.classList.remove('hidden');
    }

    const results = await queryiTunesAPI(query, 14);

    if (suggestionsContainer) {
      suggestionsContainer.innerHTML = '';

      if (results && results.length > 0) {
        results.forEach((item) => {
          const songTitle = item.trackName;
          const artistName = item.artistName;

          const row = document.createElement('div');
          row.className = 'recent-search-row';
          row.innerHTML = `
            <div class="recent-search-left">
              <div class="history-clock-box">
                <i class="fa-solid fa-magnifying-glass"></i>
              </div>
              <span class="recent-query-text">${songTitle} <span style="font-weight:400; color:#a3c99c; font-size:13px;">• ${artistName}</span></span>
            </div>
            <div class="recent-search-right">
              <button class="recent-action-btn fill-query-btn" title="Use Query"><i class="fa-solid fa-arrow-up-long" style="transform: rotate(-45deg);"></i></button>
            </div>
          `;

          row.addEventListener('click', (e) => {
            if (e.target.closest('.fill-query-btn')) {
              e.stopPropagation();
              const input = document.getElementById('phoneSearchInput');
              if (input) input.value = songTitle;
              this.fetchTextSuggestions(songTitle);
            } else {
              const input = document.getElementById('phoneSearchInput');
              if (input) input.value = songTitle;
              this.executePhoneSearch(songTitle, true);
            }
          });

          suggestionsContainer.appendChild(row);
        });
      } else {
        suggestionsContainer.innerHTML = `<div class="text-muted" style="padding:16px; font-size:13px; text-align:center;">No song suggestions for "${query}"</div>`;
      }
    }
  }

  // --- Display Exact Result Screen Matching result screen.jpeg ---
  async executePhoneSearch(query, saveToHistory = true) {
    if (!query) return;

    if (saveToHistory) this.addRecentSearch(query);

    this.switchView('viewSearchResults');

    const headerTitle = document.getElementById('resultsHeaderTitle');
    const topList = document.getElementById('resultsTopList');
    const playlistsList = document.getElementById('resultsPlaylistsList');

    if (headerTitle) headerTitle.textContent = query;
    if (topList) topList.innerHTML = '<div class="text-muted" style="padding:16px 0; text-align:center;">Searching tracks...</div>';
    if (playlistsList) playlistsList.innerHTML = '<div class="text-muted" style="padding:16px 0; text-align:center;">Loading playlists...</div>';

    const results = await queryiTunesAPI(query, 25);

    if (results && results.length > 0) {
      const fetchedTracks = results.map((item) => {
        const rawArt = item.artworkUrl100 || '';
        const artHD = rawArt ? rawArt.replace(/\/100x100bb/g, '/600x600bb').replace(/\/100x100/g, '/600x600') : 'esse_cara.jpg';
        const artThumb = rawArt ? rawArt.replace(/\/100x100bb/g, '/300x300bb').replace(/\/100x100/g, '/300x300') : 'esse_cara.jpg';

        return {
          id: `itunes_${item.trackId}`,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName || "Single",
          genre: item.primaryGenreName || "Music",
          year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : "",
          art: artHD,
          artThumb: artThumb,
          audio: item.previewUrl,
          duration: 30,
          liked: false
        };
      });

      // Render Section 1: Top result
      if (topList) {
        topList.innerHTML = '';
        fetchedTracks.slice(0, 3).forEach(track => {
          const item = document.createElement('div');
          item.className = 'track-item';
          item.innerHTML = `
            <div class="track-left">
              <img src="${track.artThumb}" alt="${track.title}" class="track-thumb" onerror="this.src='esse_cara.jpg'">
              <div class="track-details">
                <h4>${track.title}</h4>
                <p>Episode • ${track.artist}</p>
              </div>
            </div>
            <button class="track-more-btn" title="Options"><i class="fa-solid fa-ellipsis-vertical"></i></button>
          `;

          item.addEventListener('click', (e) => {
            if (!e.target.closest('.track-more-btn')) {
              this.playSpecificTrack(track);
            }
          });

          topList.appendChild(item);
        });
      }

      // Render Section 2: Playlists
      if (playlistsList) {
        playlistsList.innerHTML = '';
        const playlistTitles = [
          `Lata Mangeshkar: 70s Hits`,
          `Hindi Hits 2025`,
          `Slow Romantic Punjabi Songs`,
          `Motivational songs | Inspirational Songs`,
          `All HIT Songs of Dharmendra`,
          `Govinda's Hit Songs`
        ];

        fetchedTracks.slice(0, 6).forEach((track, idx) => {
          const title = playlistTitles[idx] || `${track.artist} Playlist`;
          const subText = idx % 2 === 0 ? `YouTube Music • ${40 + idx * 10} songs` : `SuperHit Gaane • ${(idx + 2) * 3}.5M views`;

          const item = document.createElement('div');
          item.className = 'track-item';
          item.innerHTML = `
            <div class="track-left">
              <img src="${track.artThumb}" alt="${title}" class="track-thumb" onerror="this.src='esse_cara.jpg'">
              <div class="track-details">
                <h4>${title}</h4>
                <p>${subText}</p>
              </div>
            </div>
            <button class="track-more-btn" title="Options"><i class="fa-solid fa-ellipsis-vertical"></i></button>
          `;

          item.addEventListener('click', (e) => {
            if (!e.target.closest('.track-more-btn')) {
              this.playSpecificTrack(track);
            }
          });

          playlistsList.appendChild(item);
        });
      }
    } else {
      if (topList) topList.innerHTML = `<div class="text-muted" style="padding:16px 0; text-align:center;">No top results found.</div>`;
      if (playlistsList) playlistsList.innerHTML = `<div class="text-muted" style="padding:16px 0; text-align:center;">No playlists found.</div>`;
    }
  }

  bindResultsEvents() {
    document.querySelectorAll('.results-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.results-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  playSpecificTrack(track) {
    const existingIdx = this.playlist.findIndex(t => t.id === track.id);
    if (existingIdx !== -1) {
      this.loadTrack(existingIdx, true);
    } else {
      this.playlist.unshift(track);
      this.renderQuickPicks();
      this.loadTrack(0, true);
    }
    this.switchView('viewNowPlaying');
  }

  // --- Explore Screen Cards Interaction ---
  bindExploreEvents() {
    document.querySelectorAll('.explore-card').forEach(card => {
      card.addEventListener('click', () => {
        const query = card.getAttribute('data-query');
        if (query) {
          this.switchView('viewSearchInput');
          const phoneInput = document.getElementById('phoneSearchInput');
          if (phoneInput) phoneInput.value = query;
          this.executePhoneSearch(query, true);
        }
      });
    });
  }

  // --- Stats API Integration (https://database.airbeats.app/read?file=airbeats/global_stats.json) ---
  async fetchGlobalStats() {
    try {
      const res = await fetch('https://database.airbeats.app/read?file=airbeats/global_stats.json');
      const json = await res.json();
      if (json && json.data && json.data.users) {
        this.renderGlobalStats(json.data.users);
      }
    } catch (err) {
      console.warn("Global Stats API error:", err);
    }
  }

  renderGlobalStats(users) {
    const container = document.getElementById('globalStatsList');
    if (!container) return;

    if (!users || users.length === 0) {
      container.innerHTML = '<div class="text-muted" style="padding:20px; text-align:center;">No stats available</div>';
      return;
    }

    const topUser = users[0];
    const topHours = Math.floor(topUser.totalListenMs / (1000 * 60 * 60));

    const hlTopListener = document.getElementById('hlTopListener');
    if (hlTopListener) hlTopListener.textContent = `${topHours}h`;

    const globalSub = document.getElementById('globalStatsMostListened');
    if (globalSub) globalSub.textContent = `Most listened: ${topUser.name} • Total Use...`;

    const venomUser = users.find(u => u.name && u.name.toLowerCase().includes('venom')) || users[3];
    const hlYourRank = document.getElementById('hlYourRank');
    if (hlYourRank && venomUser) hlYourRank.textContent = `#${venomUser.rank}`;

    container.innerHTML = '';
    users.slice(0, 30).forEach((user) => {
      const hours = Math.floor(user.totalListenMs / (1000 * 60 * 60));
      const isVenom = user.name && user.name.toLowerCase().includes('venom');
      
      const item = document.createElement('div');
      item.className = `leaderboard-item ${isVenom ? 'user-highlight' : ''}`;
      
      let avatarHTML = '';
      if (isVenom) {
        avatarHTML = `<img src="${USER_AVATAR_URL}" alt="${user.name}" class="lb-avatar">`;
      } else if (user.profileUrl) {
        avatarHTML = `<img src="${user.profileUrl}" alt="${user.name}" class="lb-avatar" onerror="this.onerror=null; this.outerHTML='<div class=\\'lb-avatar\\'>${user.name.charAt(0).toUpperCase()}</div>';">`;
      } else {
        const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
        avatarHTML = `<div class="lb-avatar">${initial}</div>`;
      }

      let badgeHTML = '';
      if (user.rank === 1) badgeHTML = '<span class="lb-badge">🎯</span>';
      else if (user.rank <= 5) badgeHTML = '<span class="lb-badge">🎯</span>';

      item.innerHTML = `
        <div class="lb-left">
          <span class="lb-rank">#${user.rank}</span>
          ${avatarHTML}
          <span class="lb-name">${user.name} ${badgeHTML}</span>
        </div>
        <span class="lb-hours">${hours}h</span>
      `;
      container.appendChild(item);
    });
  }

  bindStatsEvents() {
    const btnRefreshStats = document.getElementById('btnRefreshStats');
    if (btnRefreshStats) {
      btnRefreshStats.addEventListener('click', () => {
        this.fetchGlobalStats();
      });
    }

    const chipHomeStats = document.getElementById('chipHomeStats');
    if (chipHomeStats) {
      chipHomeStats.addEventListener('click', () => {
        this.switchView('viewStats');
        this.fetchGlobalStats();
      });
    }

    document.querySelectorAll('.stats-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.stats-pill-btn').forEach(b => b.classList.remove('active-green'));
        btn.classList.add('active-green');
      });
    });
  }

  // --- Mini Player Slide Down / Swipe Gestures & Audio Auto-Pause ---
  initMiniPlayerSlideDown() {
    const miniPlayer = document.getElementById('screenMiniPlayer');
    const miniCloseBtn = document.getElementById('miniCloseBtn');
    if (!miniPlayer) return;

    const dismissMiniPlayer = () => {
      this.isMiniPlayerDismissed = true;
      this.pauseAudio();
      miniPlayer.classList.add('sliding-down');
      setTimeout(() => {
        miniPlayer.classList.add('hidden');
      }, 250);
    };

    if (miniCloseBtn) {
      miniCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissMiniPlayer();
      });
    }

    let startY = 0;
    let currentY = 0;
    let isSwiping = false;

    miniPlayer.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        startY = e.touches[0].clientY;
        isSwiping = true;
      }
    });

    miniPlayer.addEventListener('touchmove', (e) => {
      if (!isSwiping || !e.touches || !e.touches[0]) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        miniPlayer.style.transform = `translateY(${deltaY}px)`;
      }
    });

    miniPlayer.addEventListener('touchend', () => {
      if (!isSwiping) return;
      isSwiping = false;
      const deltaY = currentY - startY;

      if (deltaY > 40) {
        dismissMiniPlayer();
      } else {
        miniPlayer.style.transform = 'translateY(0)';
      }
      startY = 0;
      currentY = 0;
    });

    let isMouseDown = false;
    miniPlayer.addEventListener('mousedown', (e) => {
      if (e.target.closest('.mini-controls')) return;
      startY = e.clientY;
      isMouseDown = true;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      currentY = e.clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        miniPlayer.style.transform = `translateY(${deltaY}px)`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      const deltaY = currentY - startY;
      if (deltaY > 40) {
        dismissMiniPlayer();
      } else {
        miniPlayer.style.transform = 'translateY(0)';
      }
      startY = 0;
      currentY = 0;
    });
  }

  // --- Interactive Timeline Engine ---
  initTimelineScrubber() {
    const wrapper = document.getElementById('timelineWrapper');
    if (!wrapper) return;

    const updateFromPosition = (clientX) => {
      const rect = wrapper.getBoundingClientRect();
      let offsetX = clientX - rect.left;
      let ratio = offsetX / rect.width;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;

      const dur = this.audio.duration || 30;
      const targetTime = ratio * dur;
      this.audio.currentTime = targetTime;
      this.updateTimelineUI(targetTime, dur);
    };

    wrapper.addEventListener('click', (e) => updateFromPosition(e.clientX));

    const onMouseMove = (e) => {
      if (this.isDraggingTimeline) updateFromPosition(e.clientX);
    };

    const onMouseUp = () => {
      if (this.isDraggingTimeline) {
        this.isDraggingTimeline = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
    };

    wrapper.addEventListener('mousedown', (e) => {
      this.isDraggingTimeline = true;
      updateFromPosition(e.clientX);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    wrapper.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        this.isDraggingTimeline = true;
        updateFromPosition(e.touches[0].clientX);
      }
    });

    wrapper.addEventListener('touchmove', (e) => {
      if (this.isDraggingTimeline && e.touches && e.touches[0]) {
        updateFromPosition(e.touches[0].clientX);
      }
    });

    wrapper.addEventListener('touchend', () => {
      this.isDraggingTimeline = false;
    });

    this.audio.addEventListener('loadedmetadata', () => {
      const dur = this.audio.duration || 30;
      document.getElementById('totalTimeText').textContent = this.formatTime(dur);
    });

    this.audio.addEventListener('timeupdate', () => {
      if (!this.isDraggingTimeline) {
        const cur = this.audio.currentTime || 0;
        const dur = this.audio.duration || 30;
        this.updateTimelineUI(cur, dur);
      }
    });

    this.audio.addEventListener('ended', () => this.nextTrack());
  }

  resetTimeline() {
    this.updateTimelineUI(0, 30);
  }

  updateTimelineUI(currentTime, duration) {
    const dur = duration > 0 ? duration : 30;
    const pct = Math.min(Math.max((currentTime / dur) * 100, 0), 100);

    const progressBar = document.getElementById('timelineProgress');
    const thumb = document.getElementById('timelineThumb');
    const miniLine = document.getElementById('miniProgressLine');

    if (progressBar) progressBar.style.width = `${pct}%`;
    if (thumb) thumb.style.left = `${pct}%`;
    if (miniLine) miniLine.style.width = `${pct}%`;

    const curText = document.getElementById('currentTimeText');
    if (curText) curText.textContent = this.formatTime(currentTime);

    const durText = document.getElementById('totalTimeText');
    if (durText) durText.textContent = this.formatTime(dur);
  }

  // --- Settings Screen Events ---
  bindSettingsEvents() {
    const items = [
      { id: 'itemAppearance', name: 'Appearance' },
      { id: 'itemAOD', name: 'Always On Display' },
      { id: 'itemAccount', name: 'Account' },
      { id: 'itemContent', name: 'Content' },
      { id: 'itemPlayerAudio', name: 'Player and audio' },
      { id: 'itemListenTogether', name: 'Listen Together' }
    ];

    items.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.addEventListener('click', () => {
          // Silent
        });
      }
    });
  }

  // --- Library Events & Actions ---
  bindLibraryEvents() {
    const btnLibSearch = document.getElementById('btnLibSearch');
    if (btnLibSearch) btnLibSearch.addEventListener('click', () => this.switchView('viewSearchInput'));

    const btnLibSettings = document.getElementById('btnLibSettings');
    if (btnLibSettings) btnLibSettings.addEventListener('click', () => this.switchView('viewSettings'));

    document.querySelectorAll('.lib-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.lib-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const tab = chip.getAttribute('data-tab');
        if (tab === 'playlists' || tab === 'songs') {
          this.openLikedSongsScreen();
        }
      });
    });

    const btnLibSort = document.getElementById('btnLibSort');
    if (btnLibSort) {
      btnLibSort.addEventListener('click', () => {
        this.playlist.reverse();
        this.renderQuickPicks();
        this.renderLikedTracks();
      });
    }

    const cardLibLiked = document.getElementById('cardLibLiked');
    if (cardLibLiked) {
      cardLibLiked.addEventListener('click', () => {
        this.openLikedSongsScreen();
      });
    }
  }

  openLikedSongsScreen() {
    this.renderLikedTracks();
    this.switchView('viewLikedSongs');
  }

  renderQuickPicks() {
    const container = document.getElementById('quickPicksList');
    if (!container) return;

    container.innerHTML = '';
    this.playlist.forEach((track, index) => {
      const item = document.createElement('div');
      item.className = `track-item ${index === this.currentIndex ? 'playing' : ''}`;
      item.setAttribute('data-id', track.id);
      item.innerHTML = `
        <div class="track-left">
          <img src="${track.artThumb || track.art}" alt="${track.title}" class="track-thumb" onerror="this.src='esse_cara.jpg'">
          <div class="track-details">
            <h4>${track.title}</h4>
            <p>${track.artist}</p>
          </div>
        </div>
        <button class="track-more-btn" data-index="${index}"><i class="fa-solid fa-ellipsis-vertical"></i></button>
      `;

      item.addEventListener('click', (e) => {
        if (!e.target.closest('.track-more-btn')) {
          this.loadTrack(index, true);
          this.switchView('viewNowPlaying');
        }
      });

      container.appendChild(item);
    });
  }

  renderLikedTracks() {
    const container = document.getElementById('likedTracksList');
    const subtitle = document.getElementById('likedCountSubtitle');
    if (!container) return;

    const liked = this.playlist.filter(t => t.liked);
    if (subtitle) subtitle.textContent = `${liked.length} favorite songs`;

    container.innerHTML = '';

    if (liked.length === 0) {
      container.innerHTML = '<div class="text-muted" style="padding:24px 0; text-align:center;">No liked songs yet. Tap ❤️ on any track to add!</div>';
      return;
    }

    liked.forEach((track) => {
      const item = document.createElement('div');
      item.className = 'track-item';
      item.setAttribute('data-id', track.id);
      item.innerHTML = `
        <div class="track-left">
          <img src="${track.artThumb || track.art}" alt="${track.title}" class="track-thumb" onerror="this.src='esse_cara.jpg'">
          <div class="track-details">
            <h4>${track.title}</h4>
            <p>${track.artist} • ${track.album}</p>
          </div>
        </div>
        <button class="icon-btn play-search-btn" title="Play Track"><i class="fa-solid fa-play"></i></button>
      `;
      item.addEventListener('click', () => {
        const idx = this.playlist.findIndex(t => t.id === track.id);
        if (idx !== -1) {
          this.loadTrack(idx, true);
          this.switchView('viewNowPlaying');
        }
      });
      container.appendChild(item);
    });
  }

  bindEvents() {
    document.querySelectorAll('.liquid-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-target');
        this.switchView(targetView);
      });
    });

    const miniInfo = document.getElementById('miniPlayerOpenNowPlaying');
    if (miniInfo) {
      miniInfo.addEventListener('click', () => this.switchView('viewNowPlaying'));
    }

    const btnGoSearch = document.getElementById('btnGoSearch');
    if (btnGoSearch) {
      btnGoSearch.addEventListener('click', () => {
        this.switchView('viewSearchInput');
        setTimeout(() => {
          const input = document.getElementById('phoneSearchInput');
          if (input) input.focus();
        }, 100);
      });
    }

    const btnGoSettings = document.getElementById('btnGoSettings');
    if (btnGoSettings) {
      btnGoSettings.addEventListener('click', () => this.switchView('viewSettings'));
    }

    const playBtn = document.getElementById('btnPlayPause');
    if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());

    const miniPlayBtn = document.getElementById('miniPlayBtn');
    if (miniPlayBtn) miniPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    const prevBtn = document.getElementById('btnPrev');
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevTrack());

    const nextBtn = document.getElementById('btnNext');
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextTrack());

    const shuffleBtn = document.getElementById('btnShuffle');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        this.isShuffle = !this.isShuffle;
        shuffleBtn.classList.toggle('active', this.isShuffle);
      });
    }

    const webSearchBtn = document.getElementById('webSearchBtn');
    const webSearchInput = document.getElementById('webSearchInput');
    if (webSearchBtn && webSearchInput) {
      const doWebSearch = () => {
        const q = webSearchInput.value.trim();
        if (q) {
          const phoneInput = document.getElementById('phoneSearchInput');
          if (phoneInput) phoneInput.value = q;
          this.switchView('viewSearchInput');
          this.executePhoneSearch(q, true);
        }
      };
      webSearchBtn.addEventListener('click', doWebSearch);
      webSearchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') doWebSearch(); });
    }

    document.querySelectorAll('.chip-item').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip-item').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.getAttribute('data-filter');
        if (filter === 'history') {
          this.renderQuickPicks();
        } else if (filter === 'stats') {
          this.switchView('viewStats');
          this.fetchGlobalStats();
        } else if (filter === 'liked') {
          this.openLikedSongsScreen();
        } else {
          this.switchView('viewSearchInput');
          const phoneInput = document.getElementById('phoneSearchInput');
          if (phoneInput) phoneInput.value = filter;
          this.executePhoneSearch(filter, true);
        }
      });
    });

    const btnDownload = document.getElementById('btnDownload');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        const cur = this.playlist[this.currentIndex];
        if (cur && cur.audio) {
          if (window.triggerDownload) {
            window.triggerDownload(cur.audio, `${cur.title || 'Track'}.mp3`);
          } else {
            window.open(cur.audio, '_blank');
          }
        }
      });
    }

    const btnRadio = document.getElementById('btnRadio');
    if (btnRadio) {
      btnRadio.addEventListener('click', () => {
        const cur = this.playlist[this.currentIndex];
        this.switchView('viewSearchInput');
        const phoneInput = document.getElementById('phoneSearchInput');
        if (phoneInput) phoneInput.value = cur.artist;
        this.executePhoneSearch(cur.artist, true);
      });
    }

    const btnSleepTimer = document.getElementById('btnSleepTimer');
    if (btnSleepTimer) {
      btnSleepTimer.addEventListener('click', () => {
        document.getElementById('sleepTimerModal').classList.remove('hidden');
      });
    }

    const closeSleepModal = document.getElementById('closeSleepModal');
    if (closeSleepModal) {
      closeSleepModal.addEventListener('click', () => {
        document.getElementById('sleepTimerModal').classList.add('hidden');
      });
    }

    document.querySelectorAll('.timer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mins = parseInt(btn.getAttribute('data-time'));

        if (this.sleepTimer) clearTimeout(this.sleepTimer);
        if (mins > 0) {
          this.sleepTimer = setTimeout(() => {
            this.pauseAudio();
          }, mins * 60 * 1000);
          document.getElementById('timerStatusText').textContent = `Timer set for ${mins} minutes`;
        } else {
          document.getElementById('timerStatusText').textContent = "No timer set";
        }
        document.getElementById('sleepTimerModal').classList.add('hidden');
      });
    });

    const toggleLikeCurrent = () => {
      const cur = this.playlist[this.currentIndex];
      cur.liked = !cur.liked;
      this.updateUI(cur);
      this.renderLikedTracks();
    };

    const npLike = document.getElementById('btnNPLike');
    if (npLike) npLike.addEventListener('click', toggleLikeCurrent);

    const keepLike = document.getElementById('keepLikeBtn');
    if (keepLike) keepLike.addEventListener('click', toggleLikeCurrent);

    const miniLike = document.getElementById('miniLikeBtn');
    if (miniLike) miniLike.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLikeCurrent();
    });
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  showToast() {}
}

document.addEventListener('DOMContentLoaded', () => {
  window.airBeats = new AirBeatsApp();

  // Support Form Handler (proxied via Worker backend at /api/submit)
  const form = document.getElementById('form');
  if (form && !form.dataset.boundWorker) {
    form.dataset.boundWorker = "true";
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Sending...";
        submitBtn.disabled = true;
        try {
          const response = await fetch("/api/submit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (response.ok && data.success) {
            alert("Success! Your message has been sent.");
            form.reset();
            const dialog = document.getElementById('support-dialog');
            if (dialog) dialog.close();
          } else {
            alert("Error: " + (data.message || "Failed to send message."));
          }
        } catch (error) {
          alert("Something went wrong connecting to server.");
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });
    }
  }
});
