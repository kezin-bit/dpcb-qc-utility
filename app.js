/**
 * Accubits Invent Lab — Batch QC & Handover Suite (Web Edition)
 * Pure Client-Side Architecture for Browser & GitHub Pages Deployment.
 * Zero-Server, 100% Offline Capable, Client-Side PDF Generation.
 */

(function () {
    'use strict';

    // Subsystem mapping matching desktop utility
    const SUBSYSTEM_MAP = {
        'dpcb': { prefix: 'DP', name: 'DPCB Assembly', platform: 'SensNia / FeSa / TMUX-TB' },
        'sensnia': { prefix: 'SN', name: 'SensNia Main PCB', platform: 'SensNia Diagnostic Station' },
        'tmux': { prefix: 'TM', name: 'TMUX-TB Cartridge', platform: 'TMUX-TB Multi-Sensor Suite' }
    };

    const STORAGE_KEY_BATCHES = 'ail_batch_qc_batches_v1';
    const STORAGE_KEY_SETTINGS = 'ail_batch_qc_settings_v1';

    // User Accounts Specification
    const ACCOUNTS = [
        {
            email: 'kezin@ainvent.org',
            pass: 'Kezin@7009891',
            name: 'Kezin B Wilson',
            role: 'Lead Product Engineer (Admin)',
            isAdmin: true
        },
        {
            email: 'aswini@ainvent.org',
            pass: 'Aswini@2026',
            name: 'Aswini Shaji',
            role: 'QC Inspector / Technician',
            isAdmin: false
        }
    ];

    const STORAGE_KEY_AUTH_USER = 'ail_batch_qc_auth_user_v1';
    const STORAGE_KEY_AUTH_LOG = 'ail_batch_qc_auth_history_v1';
    const STORAGE_KEY_GITHUB = 'ail_batch_qc_github_v1';

    let currentUser = null;
    let authHistory = [];

    // State
    let batches = [];
    let settings = {
        stationId: 'AIL-LAB-BENCH-01',
        defaultInspector: 'Aswini Shaji',
        defaultHandover: 'MS Team (Material Science)'
    };

    // GitHub Multi-Station Live Sync Configuration
    let githubConfig = {
        owner: 'kezin-bit',
        repo: 'dpcb-qc-utility',
        branch: 'main',
        path: 'batch_registry.md',
        token: ''
    };
    let currentGithubSha = null;
    let isSyncingWithGithub = false;

    // DOM Elements - Authentication & Profile
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    const loginForm = document.getElementById('loginForm');
    const txtLoginEmail = document.getElementById('txtLoginEmail');
    const txtLoginPassword = document.getElementById('txtLoginPassword');
    const loginAlert = document.getElementById('loginAlert');

    const lblUserName = document.getElementById('lblUserName');
    const lblUserRole = document.getElementById('lblUserRole');
    const btnLogout = document.getElementById('btnLogout');

    const lblFormInspectorName = document.getElementById('lblFormInspectorName');
    const lblFormInspectorRole = document.getElementById('lblFormInspectorRole');

    // DOM Elements - Configuration
    const cmbSubsystem = document.getElementById('cmbSubsystem');
    const spnQty = document.getElementById('spnQty');
    const txtHandover = document.getElementById('txtHandover');
    const lblBatchId = document.getElementById('lblBatchId');
    const lblSerialRange = document.getElementById('lblSerialRange');

    const btnGeneratePackage = document.getElementById('btnGeneratePackage');
    const btnDownloadChecklist = document.getElementById('btnDownloadChecklist');
    const btnDownloadGuidelines = document.getElementById('btnDownloadGuidelines');
    const btnDownloadCsv = document.getElementById('btnDownloadCsv');

    const btnExportDb = document.getElementById('btnExportDb');
    const btnModalExportDb = document.getElementById('btnModalExportDb');
    const fileImportDb = document.getElementById('fileImportDb');

    const btnSettings = document.getElementById('btnSettings');
    const settingsModal = document.getElementById('settingsModal');
    const btnCloseSettings = document.getElementById('btnCloseSettings');
    const btnCancelSettings = document.getElementById('btnCancelSettings');
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    const btnSafeArchiveReset = document.getElementById('btnSafeArchiveReset');
    const txtStationId = document.getElementById('txtStationId');

    const batchesTbody = document.getElementById('batchesTbody');
    const lblTableStats = document.getElementById('lblTableStats');
    const txtSearch = document.getElementById('txtSearch');
    const btnRefresh = document.getElementById('btnRefresh');
    const btnSyncRepoDb = document.getElementById('btnSyncRepoDb');
    const btnOpenMdDb = document.getElementById('btnOpenMdDb');

    // Markdown DB Live Editor Modal Elements
    const mdDbModal = document.getElementById('mdDbModal');
    const btnCloseMdDb = document.getElementById('btnCloseMdDb');
    const btnCancelMdDb = document.getElementById('btnCancelMdDb');
    const btnApplyMdDb = document.getElementById('btnApplyMdDb');
    const btnCopyMdDb = document.getElementById('btnCopyMdDb');
    const btnDownloadMdDb = document.getElementById('btnDownloadMdDb');
    const txtMdDbContent = document.getElementById('txtMdDbContent');
    const lblCopyMdBtnText = document.getElementById('lblCopyMdBtnText');

    // Cloud Sync Badge & GitHub Settings DOM Elements
    const cloudSyncBadge = document.getElementById('cloudSyncBadge');
    const cloudStatusDot = document.getElementById('cloudStatusDot');
    const lblCloudSyncStatus = document.getElementById('lblCloudSyncStatus');

    const txtGithubRepo = document.getElementById('txtGithubRepo');
    const txtGithubBranch = document.getElementById('txtGithubBranch');
    const txtGithubToken = document.getElementById('txtGithubToken');
    const btnToggleTokenVisibility = document.getElementById('btnToggleTokenVisibility');
    const btnTestGithubConnection = document.getElementById('btnTestGithubConnection');
    const lblGithubConnectionStatus = document.getElementById('lblGithubConnectionStatus');

    const logConsole = document.getElementById('logConsole');
    const tabBtnLoginHistory = document.getElementById('tabBtnLoginHistory');
    const tabBtnOperationalLog = document.getElementById('tabBtnOperationalLog');
    const authHistoryPanel = document.getElementById('authHistoryPanel');
    const operationalLogPanel = document.getElementById('operationalLogPanel');
    const btnClearHistory = document.getElementById('btnClearHistory');
    const authHistoryTbody = document.getElementById('authHistoryTbody');
    const lblAuthCount = document.getElementById('lblAuthCount');

    // =========================================================================
    // Initialization & Event Listeners
    // =========================================================================

    async function init() {
        loadSettings();
        loadBatches();
        loadAuthHistory();
        setupListeners();
        renderTable();
        renderAuthHistoryTable();
        const loggedIn = checkSession();
        if (loggedIn) {
            updatePreviews();
        }

        // Initial live sync with repository database
        await fetchFromGitHubApi(true);

        // Background polling every 45 seconds when window is active
        setInterval(() => {
            if (!document.hidden && (githubConfig.token || githubConfig.repo)) {
                fetchFromGitHubApi(true);
            }
        }, 45000);

        // Auto-sync whenever operator switches back to this tab
        window.addEventListener('focus', () => {
            if (githubConfig.token || githubConfig.repo) {
                fetchFromGitHubApi(true);
            }
        });

        log('System ready. Multi-station sync active. Ready to generate QC packages.');
    }

    function setupListeners() {
        if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
        if (btnLogout) btnLogout.addEventListener('click', handleLogout);

        cmbSubsystem.addEventListener('change', updatePreviews);
        spnQty.addEventListener('input', updatePreviews);

        const btnQtyUp = document.getElementById('btnQtyUp');
        const btnQtyDown = document.getElementById('btnQtyDown');
        if (btnQtyUp && spnQty) {
            btnQtyUp.addEventListener('click', () => {
                try {
                    spnQty.stepUp();
                } catch (e) {
                    spnQty.value = (parseInt(spnQty.value, 10) || 0) + 1;
                }
                spnQty.dispatchEvent(new Event('input', { bubbles: true }));
            });
        }
        if (btnQtyDown && spnQty) {
            btnQtyDown.addEventListener('click', () => {
                try {
                    spnQty.stepDown();
                } catch (e) {
                    spnQty.value = Math.max(1, (parseInt(spnQty.value, 10) || 2) - 1);
                }
                spnQty.dispatchEvent(new Event('input', { bubbles: true }));
            });
        }

        btnGeneratePackage.addEventListener('click', handleGenerateFullPackage);
        btnDownloadChecklist.addEventListener('click', handleDownloadChecklistOnly);
        btnDownloadGuidelines.addEventListener('click', handleDownloadGuidelinesOnly);
        if (btnDownloadCsv) btnDownloadCsv.addEventListener('click', handleDownloadCsvOnly);

        if (btnExportDb) btnExportDb.addEventListener('click', exportMasterMarkdownDb);
        btnModalExportDb.addEventListener('click', exportMasterMarkdownDb);
        fileImportDb.addEventListener('change', handleImportDbFile);

        // GitHub Live Cloud Sync & In-App Editor
        if (cloudSyncBadge) {
            cloudSyncBadge.addEventListener('click', () => {
                log('Manual cloud sync requested via status badge.');
                fetchFromGitHubApi(false);
            });
        }
        if (btnSyncRepoDb) {
            btnSyncRepoDb.addEventListener('click', () => fetchFromGitHubApi(false));
        }
        if (btnToggleTokenVisibility) {
            btnToggleTokenVisibility.addEventListener('click', toggleTokenVisibility);
        }
        if (btnTestGithubConnection) {
            btnTestGithubConnection.addEventListener('click', testGithubConnection);
        }

        if (btnOpenMdDb) {
            btnOpenMdDb.addEventListener('click', openMdDbModal);
        }
        if (btnCloseMdDb) btnCloseMdDb.addEventListener('click', closeMdDbModal);
        if (btnCancelMdDb) btnCancelMdDb.addEventListener('click', closeMdDbModal);
        if (btnApplyMdDb) btnApplyMdDb.addEventListener('click', handleApplyMdDb);
        if (btnCopyMdDb) btnCopyMdDb.addEventListener('click', handleCopyMdDb);
        if (btnDownloadMdDb) btnDownloadMdDb.addEventListener('click', handleDownloadMdDb);

        if (btnSettings) btnSettings.addEventListener('click', openSettingsModal);
        btnCloseSettings.addEventListener('click', closeSettingsModal);
        btnCancelSettings.addEventListener('click', closeSettingsModal);
        btnSaveSettings.addEventListener('click', saveSettingsFromModal);
        btnSafeArchiveReset.addEventListener('click', handleSafeArchiveAndReset);

        txtSearch.addEventListener('input', () => renderTable(txtSearch.value));
        btnRefresh.addEventListener('click', () => {
            loadBatches();
            renderTable();
            updatePreviews();
            log('Registry refreshed.');
        });

        if (tabBtnLoginHistory && tabBtnOperationalLog) {
            tabBtnLoginHistory.addEventListener('click', () => {
                tabBtnLoginHistory.classList.add('active');
                tabBtnOperationalLog.classList.remove('active');
                if (authHistoryPanel) authHistoryPanel.style.display = 'block';
                if (operationalLogPanel) operationalLogPanel.style.display = 'none';
            });

            tabBtnOperationalLog.addEventListener('click', () => {
                tabBtnOperationalLog.classList.add('active');
                tabBtnLoginHistory.classList.remove('active');
                if (operationalLogPanel) operationalLogPanel.style.display = 'block';
                if (authHistoryPanel) authHistoryPanel.style.display = 'none';
            });
        }

        if (btnClearHistory) {
            btnClearHistory.addEventListener('click', () => {
                const isHistoryTab = tabBtnLoginHistory && tabBtnLoginHistory.classList.contains('active');
                if (isHistoryTab) {
                    if (confirm('Are you sure you want to clear all recorded authentication & login history?')) {
                        authHistory = [];
                        saveAuthHistory();
                        renderAuthHistoryTable();
                        log('Authentication audit history cleared by administrator.');
                    }
                } else {
                    if (logConsole) {
                        logConsole.innerHTML = '<div class="log-entry"><span class="log-ts">[Log]</span> Console cleared.</div>';
                    }
                }
            });
        }

        // Discreet Admin Shortcuts (Ctrl+Shift+S for Settings, Ctrl+Shift+E for Export DB)
        window.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
                e.preventDefault();
                document.body.classList.toggle('admin-mode');
                openSettingsModal();
                log('Admin controls toggled.');
            } else if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
                e.preventDefault();
                exportMasterMarkdownDb();
            }
        });

        // Discreet Logo Triple-Click to reveal Admin Controls & open Settings
        const headerLogo = document.getElementById('headerLogo');
        let logoClicks = 0;
        let logoTimer = null;
        if (headerLogo) {
            headerLogo.style.cursor = 'pointer';
            headerLogo.addEventListener('click', function () {
                logoClicks++;
                clearTimeout(logoTimer);
                if (logoClicks >= 3) {
                    logoClicks = 0;
                    document.body.classList.toggle('admin-mode');
                    openSettingsModal();
                    log('Admin controls toggled.');
                } else {
                    logoTimer = setTimeout(() => { logoClicks = 0; }, 800);
                }
            });
        }
    }

    // =========================================================================
    // Authentication & Session Management
    // =========================================================================

    function checkSession() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_AUTH_USER);
            if (raw) {
                const stored = JSON.parse(raw);
                const matched = ACCOUNTS.find(a => a.email.toLowerCase() === (stored.email || '').toLowerCase());
                if (matched) {
                    setAuthenticatedUser(matched);
                    return true;
                }
            }
        } catch (e) {
            console.error('Failed to restore session:', e);
        }
        showLoginScreen();
        return false;
    }

    function setAuthenticatedUser(user) {
        currentUser = user;
        localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));

        if (lblUserName) lblUserName.textContent = user.name;
        if (lblUserRole) lblUserRole.textContent = user.role;

        if (lblFormInspectorName) lblFormInspectorName.textContent = user.name;
        if (lblFormInspectorRole) lblFormInspectorRole.textContent = `${user.role} • ${user.email}`;

        // Admin Access Control:
        if (user.isAdmin) {
            document.body.classList.add('admin-mode');
        } else {
            document.body.classList.remove('admin-mode');
        }

        if (loginScreen) loginScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'flex';

        updatePreviews();
        renderAuthHistoryTable();
        log(`User verified: ${user.name} (${user.role}).`);
    }

    function showLoginScreen() {
        currentUser = null;
        localStorage.removeItem(STORAGE_KEY_AUTH_USER);
        document.body.classList.remove('admin-mode');
        if (appContainer) appContainer.style.display = 'none';
        if (loginScreen) loginScreen.style.display = 'flex';
        if (txtLoginEmail) txtLoginEmail.value = '';
        if (txtLoginPassword) txtLoginPassword.value = '';
        if (loginAlert) loginAlert.style.display = 'none';
        if (txtLoginEmail) setTimeout(() => txtLoginEmail.focus(), 100);
    }

    function handleLoginSubmit(e) {
        e.preventDefault();
        const emailVal = txtLoginEmail.value.trim().toLowerCase();
        const passVal = txtLoginPassword.value.trim();

        const found = ACCOUNTS.find(a => a.email.toLowerCase() === emailVal && a.pass === passVal);
        if (found) {
            if (loginAlert) loginAlert.style.display = 'none';
            recordAuthEvent('SIGN_IN', found, 'SUCCESS');
            setAuthenticatedUser(found);
            // Sync sign-in event across lab network if PAT is configured
            if (githubConfig.token) {
                commitMarkdownDbToGitHub(`Audit: Operator ${found.name} signed in at ${settings.stationId || 'AIL-BENCH'}`);
            }
        } else {
            recordAuthEvent('FAILED_LOGIN', { name: 'Unauthorized Operator', email: emailVal || 'unknown', role: 'Security Warning' }, 'FAILED');
            if (loginAlert) {
                loginAlert.textContent = 'Invalid email or password. Access restricted to authorized personnel.';
                loginAlert.style.display = 'block';
            }
            if (txtLoginPassword) {
                txtLoginPassword.value = '';
                txtLoginPassword.focus();
            }
        }
    }

    function handleLogout() {
        if (confirm('Are you sure you want to sign out of this QC workstation?')) {
            if (currentUser) {
                recordAuthEvent('SIGN_OUT', currentUser, 'SUCCESS');
                if (githubConfig.token) {
                    commitMarkdownDbToGitHub(`Audit: Operator ${currentUser.name} signed out at ${settings.stationId || 'AIL-BENCH'}`);
                }
            }
            showLoginScreen();
            log('User signed out.');
        }
    }

    function log(message) {
        const timeStr = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `<span class="log-ts">[${timeStr}]</span> ${message}`;
        if (logConsole) {
            logConsole.appendChild(entry);
            logConsole.scrollTop = logConsole.scrollHeight;
        }
    }

    // =========================================================================
    // User Access & Login History Audit Handlers
    // =========================================================================

    function loadAuthHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_AUTH_LOG);
            authHistory = raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to load auth history:', e);
            authHistory = [];
        }
    }

    function saveAuthHistory() {
        try {
            localStorage.setItem(STORAGE_KEY_AUTH_LOG, JSON.stringify(authHistory));
        } catch (e) {
            console.error('Failed to save auth history:', e);
        }
    }

    function recordAuthEvent(eventType, userOrData, status) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

        let name = 'Unknown Operator';
        let email = typeof userOrData === 'string' ? userOrData : (userOrData?.email || 'unspecified');
        let role = typeof userOrData === 'object' && userOrData ? (userOrData.role || 'Visitor / Unauthorized') : 'Unauthorized Attempt';

        if (typeof userOrData === 'object' && userOrData && userOrData.name) {
            name = userOrData.name;
        }

        const entry = {
            id: 'AUTH-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            timestamp: `${formattedDate}, ${formattedTime}`,
            iso: now.toISOString(),
            event: eventType, // 'SIGN_IN' | 'SIGN_OUT' | 'FAILED_LOGIN'
            userName: name,
            email: email,
            role: role,
            status: status || 'SUCCESS',
            stationId: settings.stationId || 'AIL-LAB-BENCH-01'
        };

        authHistory.unshift(entry);
        if (authHistory.length > 150) authHistory.pop();
        saveAuthHistory();
        renderAuthHistoryTable();
    }

    function renderAuthHistoryTable() {
        if (lblAuthCount) lblAuthCount.textContent = authHistory.length;
        if (!authHistoryTbody) return;

        if (authHistory.length === 0) {
            authHistoryTbody.innerHTML = '<tr><td colspan="6" class="empty-state">No authentication events recorded yet.</td></tr>';
            return;
        }

        authHistoryTbody.innerHTML = authHistory.map(entry => {
            let eventBadge = '';
            if (entry.event === 'SIGN_IN') {
                eventBadge = '<span class="badge-event-signin"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Signed In</span>';
            } else if (entry.event === 'SIGN_OUT') {
                eventBadge = '<span class="badge-event-signout"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Signed Out</span>';
            } else {
                eventBadge = '<span class="badge-event-failed"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Failed Login</span>';
            }

            let statusBadge = entry.status === 'SUCCESS'
                ? '<span class="badge-status-pass">SUCCESS</span>'
                : '<span class="badge-status-fail">FAILED</span>';

            const stationText = entry.stationId ? `<span style="font-size: 10px; color: var(--text-muted); display: block;">${escapeHtml(entry.stationId)}</span>` : '';

            return `<tr>
                <td style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-muted);">${escapeHtml(entry.timestamp)}${stationText}</td>
                <td><strong style="color: var(--text-main);">${escapeHtml(entry.userName)}</strong></td>
                <td style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 11.5px;">${escapeHtml(entry.email)}</td>
                <td style="color: var(--text-muted); font-size: 11.5px;">${escapeHtml(entry.role)}</td>
                <td>${eventBadge}</td>
                <td>${statusBadge}</td>
            </tr>`;
        }).join('');
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // =========================================================================
    // State & Storage Handlers
    // =========================================================================

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (raw) {
                settings = Object.assign(settings, JSON.parse(raw));
                if (txtStationId) txtStationId.value = settings.stationId || 'AIL-LAB-BENCH-01';
                if (txtHandover) txtHandover.value = settings.defaultHandover || 'MS Team (Material Science)';
            }

            const ghRaw = localStorage.getItem(STORAGE_KEY_GITHUB);
            if (ghRaw) {
                githubConfig = Object.assign(githubConfig, JSON.parse(ghRaw));
            }
            if (txtGithubRepo) txtGithubRepo.value = `${githubConfig.owner}/${githubConfig.repo}`;
            if (txtGithubBranch) txtGithubBranch.value = githubConfig.branch || 'main';
            if (txtGithubToken) txtGithubToken.value = githubConfig.token || '';

            updateCloudStatusFromConfig();
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
            localStorage.setItem(STORAGE_KEY_GITHUB, JSON.stringify(githubConfig));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    function loadBatches() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_BATCHES);
            if (raw) {
                batches = JSON.parse(raw);
            } else {
                batches = [];
            }
        } catch (e) {
            console.error('Failed to load batches:', e);
            batches = [];
        }
    }

    function persistBatches() {
        try {
            localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(batches));
            updatePreviews();
            renderTable();
        } catch (e) {
            console.error('Failed to persist batches:', e);
        }
    }

    function getSelectedInspector() {
        return currentUser ? currentUser.name : 'Kezin B Wilson';
    }

    // =========================================================================
    // ID & Serial Calculation
    // =========================================================================

    function getTodayDateStr() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}${day}`;
    }

    function getNextBatchId() {
        const dateStr = getTodayDateStr();
        const prefix = `BATCH-${dateStr}-`;
        const usedLetters = new Set();

        batches.forEach(b => {
            if (b.batchId && b.batchId.startsWith(prefix)) {
                const char = b.batchId.replace(prefix, '').charAt(0);
                if (char) usedLetters.add(char.toUpperCase());
            }
        });

        for (let i = 65; i <= 90; i++) {
            const letter = String.fromCharCode(i);
            if (!usedLetters.has(letter)) {
                return `${prefix}${letter}`;
            }
        }
        return `${prefix}Z1`;
    }

    function getNextSerialCounter(prefix) {
        let maxNum = 0;
        const regex = new RegExp(`${prefix}(\\d+)`, 'g');

        batches.forEach(b => {
            if (b.serialRange) {
                let m;
                while ((m = regex.exec(b.serialRange)) !== null) {
                    const val = parseInt(m[1], 10);
                    if (!isNaN(val) && val > maxNum) {
                        maxNum = val;
                    }
                }
            }
        });

        return maxNum + 1;
    }

    function updatePreviews() {
        const subKey = cmbSubsystem.value;
        const subInfo = SUBSYSTEM_MAP[subKey] || SUBSYSTEM_MAP['dpcb'];
        const prefix = subInfo.prefix;
        const qty = parseInt(spnQty.value, 10) || 20;

        const nextBatchId = getNextBatchId();
        const startSerial = getNextSerialCounter(prefix);
        const endSerial = startSerial + qty - 1;

        lblBatchId.textContent = nextBatchId;
        lblSerialRange.textContent = `${prefix}${startSerial} to ${prefix}${endSerial}`;
    }

    // =========================================================================
    // Master Registry Table Rendering
    // =========================================================================

    function renderTable(filterQuery = '') {
        const query = filterQuery.toLowerCase().trim();
        const filtered = batches.filter(b => {
            if (!query) return true;
            return (
                (b.batchId && b.batchId.toLowerCase().includes(query)) ||
                (b.subsystem && b.subsystem.toLowerCase().includes(query)) ||
                (b.serialRange && b.serialRange.toLowerCase().includes(query)) ||
                (b.inspector && b.inspector.toLowerCase().includes(query)) ||
                (b.handover && b.handover.toLowerCase().includes(query))
            );
        });

        lblTableStats.textContent = `Active recorded batches: ${batches.length}`;

        if (filtered.length === 0) {
            batchesTbody.innerHTML = `<tr><td colspan="9" class="empty-state">${query ? 'No matching batches found.' : 'No batches created yet. Enter details above and click "Generate Batch Package".'}</td></tr>`;
            return;
        }

        let html = '';
        filtered.forEach(b => {
            html += `
                <tr>
                    <td><strong>${b.batchId}</strong></td>
                    <td>${b.subsystem}</td>
                    <td>${b.qty}</td>
                    <td><code>${b.serialRange}</code></td>
                    <td>${b.createdDate}</td>
                    <td>${b.inspector}</td>
                    <td><span class="status-badge">${b.status || 'PASSED'}</span></td>
                    <td>${b.handover}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-subtle btn-sm btn-re-download" data-id="${b.batchId}">Download PDF</button>
                    </td>
                </tr>
            `;
        });

        batchesTbody.innerHTML = html;

        // Re-download button handlers
        document.querySelectorAll('.btn-re-download').forEach(btn => {
            btn.addEventListener('click', function () {
                const bId = this.getAttribute('data-id');
                const batchRecord = batches.find(x => x.batchId === bId);
                if (batchRecord) {
                    const doc = generateChecklistPDFDoc(batchRecord);
                    doc.save(`${batchRecord.batchId}_checklist.pdf`);
                    log(`Re-downloaded checklist for ${batchRecord.batchId}.`);
                }
            });
        });
    }

    // =========================================================================
    // Client-Side PDF Generation Engine (ReportLab Compatible)
    // =========================================================================

    function drawPageDecorations(doc, pageNumber, pageCount) {
        const pageWidth = 215.9;  // Letter width mm
        const pageHeight = 279.4; // Letter height mm

        // Header Top Bar
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42); // Deep Navy #0F172A
        doc.text('ACCUBITS INVENT LAB - QUALITY CONTROL', 12.7, 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate #64748B
        doc.text('DPCB Assembly Inspection Sheet | AIL-CHK-DPCB-2026', pageWidth - 12.7, 10, { align: 'right' });

        doc.setDrawColor(2, 132, 199); // Cyan #0284C7
        doc.setLineWidth(0.4);
        doc.line(12.7, 11.5, pageWidth - 12.7, 11.5);

        // Footer Bottom Bar
        doc.setDrawColor(226, 232, 240); // Light Slate
        doc.setLineWidth(0.2);
        doc.line(12.7, pageHeight - 11, pageWidth - 12.7, pageHeight - 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Confidential - Accubits Invent Lab Quality Management System', 12.7, pageHeight - 6);
        doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - 12.7, pageHeight - 6, { align: 'right' });
    }

    function generateChecklistPDFDoc(batch) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        const PRIMARY = [15, 23, 42];     // #0F172A
        const SECONDARY = [2, 132, 199];  // #0284C7
        const BORDER_COLOR = [148, 163, 184]; // #94A3B8
        const BG_LIGHT = [241, 245, 249]; // #F1F5F9

        // ==================== PAGE 1 ====================
        let cursorY = 18;

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text('Daughter PCB (DPCB) Quality Control & Inspection Sheet', 12.7, cursorY);
        cursorY += 5;

        // Subtitle
        doc.setFontSize(8.5);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.text('6-Stage Acceptance Protocol, Soldering Standards & Batch Handover Sign-Off', 12.7, cursorY);
        cursorY += 4.5;

        // 1. Metadata Table
        const metaBody = [
            [
                { content: 'Batch ID:', styles: { fontStyle: 'bold' } }, batch.batchId,
                { content: 'Serial Range:', styles: { fontStyle: 'bold' } }, batch.serialRange
            ],
            [
                { content: 'Inspector / Tech:', styles: { fontStyle: 'bold' } }, batch.inspector,
                { content: 'Inspection Date:', styles: { fontStyle: 'bold' } }, batch.inspectionDate || batch.createdDate
            ],
            [
                { content: 'Target Platform:', styles: { fontStyle: 'bold' } }, batch.platform || 'SensNia / FeSa / TMUX-TB',
                { content: 'Handover Recipient:', styles: { fontStyle: 'bold' } }, batch.handover
            ]
        ];

        doc.autoTable({
            startY: cursorY,
            margin: { left: 12.7, right: 12.7 },
            body: metaBody,
            theme: 'grid',
            styles: {
                fontSize: 8,
                textColor: PRIMARY,
                cellPadding: 2,
                lineColor: BORDER_COLOR,
                lineWidth: 0.15
            },
            columnStyles: {
                0: { cellWidth: 32, fillColor: BG_LIGHT },
                1: { cellWidth: 63 },
                2: { cellWidth: 32, fillColor: BG_LIGHT },
                3: { cellWidth: 63 }
            }
        });
        cursorY = doc.lastAutoTable.finalY + 4.5;

        // 2. Stage 1 to 6 Protocol Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text('6-Stage Quality Control Protocol & Verification Criteria', 12.7, cursorY);
        cursorY += 2;

        const stageBody = [
            [
                { content: 'Stage 1', styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'Bare PCB Delivery & Inspection', styles: { fontStyle: 'bold' } },
                'Inspect raw PCB upon manufacturer delivery. Verify zero solder mask bleed, scratches, or substrate defects. Confirm clean V-slot cutout milling and copper pad integrity.'
            ],
            [
                { content: 'Stage 2', styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'Berg Strip Cutting & Jig Mounting', styles: { fontStyle: 'bold' } },
                'Cut two 6-pin Berg headers from standard 40-pin 2.54mm breakaway strip; trim side burrs flush. Mount into 3D-printed inverted soldering jig (AIL-SUPP-DPCB-JIG); confirm active sensing air gap.'
            ],
            [
                { content: 'Stage 3', styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'Reverse Soldering & Flux Mitigation', styles: { fontStyle: 'bold' } },
                'Solder 12 pins exclusively from reverse side (<3s iron dwell) with minimal solder volume. All fillets must be shiny concave (zero dry joints or solder blobs). Slide off black plastic housing, clean flux with IPA, and re-insert housing in reversed orientation.'
            ],
            [
                { content: 'Stage 4', styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'Pin Straightness & Alignment Check', styles: { fontStyle: 'bold' } },
                'Strict zero pin bending tolerance. All 12 pins must be 100% perpendicular and parallel at exact 2.54mm pitch across both rows. Re-align with precision needle pliers if required.'
            ],
            [
                { content: 'Stage 5', styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'Test Slot Fitment & Continuity', styles: { fontStyle: 'bold' } },
                'Insert DPCB into physical Test Slot gauge. Must achieve smooth, effortless slide-in insertion and extraction without binding. Verify pin-to-pad electrical continuity (<50 mOhm) and channel isolation (>10 MOhm).'
            ],
            [
                { content: 'Stage 6', styles: { fontStyle: 'bold', halign: 'center' } },
                { content: 'Serial Tagging & MS Team Handover', styles: { fontStyle: 'bold' } },
                'Assign sequential Serial Number (DP1..DPx) and Batch ID on silkscreen margin. Measure dry sensor baseline (>100 kOhm). Package in anti-tarnish vacuum ESD bags for formal handover to MS Team (Material Science).'
            ]
        ];

        doc.autoTable({
            startY: cursorY,
            margin: { left: 12.7, right: 12.7 },
            head: [['Stage', 'Process / Quality Gate', 'Acceptance Criteria & Inspection Standard']],
            body: stageBody,
            theme: 'grid',
            headStyles: {
                fillColor: SECONDARY,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center'
            },
            styles: {
                fontSize: 7.5,
                textColor: PRIMARY,
                cellPadding: 2.2,
                lineColor: BORDER_COLOR,
                lineWidth: 0.15
            },
            columnStyles: {
                0: { cellWidth: 18 },
                1: { cellWidth: 54 },
                2: { cellWidth: 118 }
            },
            alternateRowStyles: {
                fillColor: BG_LIGHT
            }
        });
        cursorY = doc.lastAutoTable.finalY + 4.5;

        // 3. Final Authorization Sign-Off
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text('Final Quality Authorization & Handover Sign-Off', 12.7, cursorY);
        cursorY += 2;

        const dateVal = batch.inspectionDate || batch.createdDate;
        const signBody = [
            ['Inspector / Technician', batch.inspector, '', dateVal],
            ['Lead Product Engineer (AIL)', 'Kezin B Wilson', '', dateVal],
            ['MS Team Receiver', '____________________', '', '____ / ____ / 2026']
        ];

        doc.autoTable({
            startY: cursorY,
            margin: { left: 12.7, right: 12.7 },
            head: [['Role', 'Printed Name', 'Signature / Stamp', 'Date']],
            body: signBody,
            theme: 'grid',
            headStyles: {
                fillColor: PRIMARY,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8
            },
            styles: {
                fontSize: 8,
                textColor: PRIMARY,
                cellPadding: 2.5,
                lineColor: BORDER_COLOR,
                lineWidth: 0.15
            },
            columnStyles: {
                0: { cellWidth: 46 },
                1: { cellWidth: 62 },
                2: { cellWidth: 50 },
                3: { cellWidth: 32 }
            }
        });

        // ==================== PAGE 2: MANUAL BATCH MATRIX ====================
        doc.addPage();
        let p2CursorY = 18;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text('Stage 1-6 Batch Verification Matrix (Manual Inspection Sheet)', 12.7, p2CursorY);
        p2CursorY += 5;

        doc.setFontSize(8.5);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.text(`Batch ID: ${batch.batchId}  |  Serial Range: ${batch.serialRange}  |  Inspector: ${batch.inspector}`, 12.7, p2CursorY);
        p2CursorY += 4;

        // Generate unit list from serial range
        let units = [];
        const match = /([A-Za-z]+)(\d+)\s*(?:to|-)\s*([A-Za-z]+)?(\d+)/.exec(batch.serialRange);
        if (match) {
            const pfx = match[1];
            const startIdx = parseInt(match[2], 10);
            const endIdx = parseInt(match[4], 10);
            for (let i = startIdx; i <= endIdx; i++) {
                units.push(`${pfx}${i}`);
            }
        } else {
            for (let i = 1; i <= batch.qty; i++) {
                units.push(`DP${i}`);
            }
        }

        // Blank rows for manual ticking/entry
        const matrixBody = units.map(u => [
            { content: u, styles: { fontStyle: 'bold', halign: 'center' } },
            '', '', '', '', '', '', ''
        ]);

        doc.autoTable({
            startY: p2CursorY,
            margin: { left: 12.7, right: 12.7 },
            head: [[
                'DPCB Unit',
                'Stage 1\nBare PCB',
                'Stage 2\nBerg / Jig',
                'Stage 3\nSoldering',
                'Stage 4\nPins Check',
                'Stage 5\nSlot Fit',
                'Stage 6\nHandover',
                'Final Result'
            ]],
            body: matrixBody,
            theme: 'grid',
            headStyles: {
                fillColor: SECONDARY,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7.5,
                halign: 'center',
                valign: 'middle'
            },
            styles: {
                fontSize: 8,
                textColor: PRIMARY,
                cellPadding: 2,
                minCellHeight: 6.5, // Comfortable row height for manual pen entry
                lineColor: BORDER_COLOR,
                lineWidth: 0.15,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 24 },
                1: { cellWidth: 23 },
                2: { cellWidth: 23 },
                3: { cellWidth: 23 },
                4: { cellWidth: 23 },
                5: { cellWidth: 23 },
                6: { cellWidth: 23 },
                7: { cellWidth: 28 }
            },
            alternateRowStyles: {
                fillColor: BG_LIGHT
            }
        });

        // Add headers/footers to all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            drawPageDecorations(doc, i, totalPages);
        }

        return doc;
    }

    // =========================================================================
    // Guidelines PDF Generator
    // =========================================================================

    function generateGuidelinesPDFDoc() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

        const PRIMARY = [15, 23, 42];
        const SECONDARY = [2, 132, 199];
        const BORDER_COLOR = [148, 163, 184];

        let cursorY = 18;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        doc.text('DPCB Quality Control & Soldering Guidelines', 12.7, cursorY);
        cursorY += 5;

        doc.setFontSize(8.5);
        doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.text('Engineering Standards, Reverse Soldering & Insulator Reversal Protocol', 12.7, cursorY);
        cursorY += 6;

        const sections = [
            {
                title: '1. Purpose & Scope',
                body: 'Defines mandatory assembly, soldering, and inspection criteria for Daughter PCBs across SensNia, FeSa, and TMUX-TB platforms to achieve zero-defect production before MS Team handover.'
            },
            {
                title: '2. Incoming Bare PCB Acceptance Criteria',
                body: 'Inspect PCB substrate thickness (1.6mm), V-slot cutout milling, pad registration, and anti-tarnish packaging. Zero mask bleed or scratches.'
            },
            {
                title: '3. Reverse Soldering & Inverted Jig Setup',
                body: 'All soldering must utilize the 3D-printed DPCB Inverted Soldering Jig (AIL-SUPP-DPCB-JIG) to shield active chemiresistive sensing coatings from toxic flux vapors. Solder exclusively from reverse side with concave fillets.'
            },
            {
                title: '4. Insulator Housing Reversal Protocol',
                body: 'Slide off black Berg plastic insulator strip, thoroughly clean all rosin flux residues with 99.9% IPA, and re-seat plastic housing in reversed orientation.'
            },
            {
                title: '5. Mechanical Alignment & Test Slot Verification',
                body: 'Zero pin bending allowed. All 12 pins must maintain exact 2.54mm pitch. Test with physical slot gauge for smooth, bind-free insertion.'
            },
            {
                title: '6. Serial Numbering & ESD Vacuum Packaging',
                body: 'Tag sequential serial number (DP1..DPx) and Batch ID. Confirm dry baseline resistance > 100 kOhm. Package in anti-static ESD bags for handover.'
            }
        ];

        sections.forEach(sec => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
            doc.text(sec.title, 12.7, cursorY);
            cursorY += 4.5;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(60, 70, 85);
            const lines = doc.splitTextToSize(sec.body, 190);
            doc.text(lines, 12.7, cursorY);
            cursorY += (lines.length * 4) + 4;
        });

        // Summary Criteria Table
        doc.autoTable({
            startY: cursorY + 2,
            margin: { left: 12.7, right: 12.7 },
            head: [['Inspection Parameter', 'Acceptance Standard', 'Verification Tool']],
            body: [
                ['Bare PCB Substrate', 'Clean copper pads, zero mask bleed, scratch-free', '10x Optical Microscope'],
                ['Soldering Quality', 'Reverse side, concave fillet, minimal solder volume', 'Visual & IPA Clean Check'],
                ['Pin Straightness', 'Zero pin bending; 100% perpendicular and parallel', 'Precision Alignment Gauge'],
                ['Test Slot Fitment', 'Effortless smooth slide-in & extraction', 'Physical Slot Gauge'],
                ['Electrical Continuity', '< 50 mOhm contact resistance, > 100 kOhm dry baseline', 'Digital Multimeter'],
                ['MS Team Handover', 'Silkscreen serial tag, signed QC checklist, ESD sealed', 'Physical Tag & Signed QC Log']
            ],
            theme: 'grid',
            headStyles: { fillColor: SECONDARY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 8, textColor: PRIMARY, cellPadding: 2, lineColor: BORDER_COLOR, lineWidth: 0.15 },
            columnStyles: {
                0: { cellWidth: 38 },
                1: { cellWidth: 106 },
                2: { cellWidth: 46 }
            }
        });

        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            drawPageDecorations(doc, i, totalPages);
        }

        return doc;
    }

    // =========================================================================
    // CSV Generator
    // =========================================================================

    function generateBatchCsvContent(batch) {
        const headers = [
            'Serial Number',
            'Batch ID',
            'Subsystem',
            'Inspector',
            'Inspection Date',
            'Visual Fillet (Concave/Clean)',
            'Insulator Reversal (Applied)',
            'Pin Straightness (0 Bending)',
            'Test Slot Fitment',
            'Dry Baseline Resistance (kOhm)',
            'QC Status',
            'Handover Recipient'
        ];

        let units = [];
        const match = /([A-Za-z]+)(\d+)\s*(?:to|-)\s*([A-Za-z]+)?(\d+)/.exec(batch.serialRange);
        if (match) {
            const pfx = match[1];
            const startIdx = parseInt(match[2], 10);
            const endIdx = parseInt(match[4], 10);
            for (let i = startIdx; i <= endIdx; i++) {
                units.push(`${pfx}${i}`);
            }
        } else {
            for (let i = 1; i <= batch.qty; i++) {
                units.push(`DP${i}`);
            }
        }

        const dateVal = batch.inspectionDate || batch.createdDate;
        const rows = [headers.join(',')];

        units.forEach(u => {
            rows.push([
                u,
                batch.batchId,
                `"${batch.subsystem}"`,
                `"${batch.inspector}"`,
                dateVal,
                '"PASS (Concave Fillet, Minimal Solder)"',
                '"PASS (Reversed Housing Fitted)"',
                '"PASS (Zero Pin Bending)"',
                '"PASS (Smooth Slot Fitment)"',
                '"> 100 kOhm"',
                'PASSED',
                `"${batch.handover}"`
            ].join(','));
        });

        return rows.join('\r\n');
    }

    // =========================================================================
    // Package & Download Actions
    // =========================================================================

    function createBatchRecord() {
        const subKey = cmbSubsystem.value;
        const subInfo = SUBSYSTEM_MAP[subKey] || SUBSYSTEM_MAP['dpcb'];
        const prefix = subInfo.prefix;
        const qty = parseInt(spnQty.value, 10) || 20;

        const batchId = getNextBatchId();
        const startSerial = getNextSerialCounter(prefix);
        const endSerial = startSerial + qty - 1;
        const serialRange = `${prefix}${startSerial} to ${prefix}${endSerial}`;
        const inspector = getSelectedInspector();
        const handover = txtHandover.value.trim() || 'MS Team (Material Science)';
        const createdDate = new Date().toISOString().split('T')[0];
        const inspectionDate = new Date().toLocaleDateString('en-GB');

        const record = {
            batchId,
            subsystem: subInfo.name,
            platform: subInfo.platform,
            qty,
            serialRange,
            inspector,
            handover,
            createdDate,
            inspectionDate,
            status: 'PASSED'
        };

        batches.unshift(record);
        persistBatches();
        return record;
    }

    async function handleGenerateFullPackage() {
        // Sync latest state from GitHub first so serial range and batch IDs are globally fresh
        if (githubConfig.token || githubConfig.repo) {
            log('Synchronizing latest registry from GitHub before allocating serial numbers...');
            await fetchFromGitHubApi(true);
        }

        const batch = createBatchRecord();
        log(`Initiating full package generation: ${batch.batchId} (${batch.serialRange}) for ${batch.inspector}...`);

        try {
            // Generate Checklist PDF
            const checklistDoc = generateChecklistPDFDoc(batch);
            const checklistBlob = checklistDoc.output('blob');

            // Generate Guidelines PDF
            const guidelinesDoc = generateGuidelinesPDFDoc();
            const guidelinesBlob = guidelinesDoc.output('blob');

            // Generate CSV
            const csvContent = generateBatchCsvContent(batch);
            const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

            // Create ZIP using JSZip
            const zip = new window.JSZip();
            const folder = zip.folder(batch.batchId);
            folder.file('checklist.pdf', checklistBlob);
            folder.file('guidelines.pdf', guidelinesBlob);
            folder.file('batch_summary.csv', csvBlob);

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            triggerDownload(zipBlob, `${batch.batchId}_Package.zip`);

            log(`[OK] Created & Downloaded complete ZIP package for ${batch.batchId}!`);

            // Commit updated batch registry to GitHub
            let syncNotice = '';
            if (githubConfig.token) {
                const commitRes = await commitMarkdownDbToGitHub(`Record QC Batch ${batch.batchId} (${batch.serialRange}) - Inspector: ${batch.inspector}`);
                if (commitRes.success) {
                    syncNotice = '\n\n• GitHub Live Sync: Automatically synchronized with repository! All workstations and inspectors are updated.';
                } else {
                    syncNotice = `\n\n• GitHub Sync Notice: Could not commit to GitHub (${commitRes.error || 'Token error'}). Stored locally on this machine.`;
                }
            } else {
                syncNotice = '\n\n• Notice: GitHub Personal Access Token not configured in Settings. Saved in this browser only. Configure PAT in Settings to share records with other lab benches.';
            }

            alert(`Batch ${batch.batchId} created successfully!\n\n• Serial Range: ${batch.serialRange}\n• Inspector: ${batch.inspector}\n• Package ZIP has been downloaded to your machine.${syncNotice}`);
        } catch (err) {
            console.error(err);
            log(`ERROR generating batch package: ${err.message}`);
            alert(`Error: ${err.message}`);
        }
    }

    async function handleDownloadChecklistOnly() {
        if (githubConfig.token || githubConfig.repo) {
            await fetchFromGitHubApi(true);
        }
        const batch = createBatchRecord();
        const doc = generateChecklistPDFDoc(batch);
        doc.save(`${batch.batchId}_checklist.pdf`);
        log(`[OK] Generated and downloaded checklist.pdf for ${batch.batchId}`);
        if (githubConfig.token) {
            commitMarkdownDbToGitHub(`Record QC Batch ${batch.batchId} (${batch.serialRange}) - Checklist downloaded`);
        }
    }

    function handleDownloadGuidelinesOnly() {
        const doc = generateGuidelinesPDFDoc();
        doc.save('DPCB_QC_Guidelines.pdf');
        log('[OK] Downloaded DPCB Quality Guidelines PDF.');
    }

    async function handleDownloadCsvOnly() {
        if (githubConfig.token || githubConfig.repo) {
            await fetchFromGitHubApi(true);
        }
        const batch = createBatchRecord();
        const csvContent = generateBatchCsvContent(batch);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `${batch.batchId}_summary.csv`);
        log(`[OK] Exported serialized summary CSV for ${batch.batchId}`);
        if (githubConfig.token) {
            commitMarkdownDbToGitHub(`Record QC Batch ${batch.batchId} (${batch.serialRange}) - CSV downloaded`);
        }
    }

    function triggerDownload(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    // =========================================================================
    // Master Registry Markdown Import / Export
    // =========================================================================

    // =========================================================================
    // Master Registry Markdown Flat-File Database Logic
    // =================================================================    // =========================================================================
    // UTF-8 Safe Base64 Encoding & Decoding for GitHub REST API
    // =========================================================================

    function encodeBase64Utf8(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
            return String.fromCharCode(parseInt(p1, 16));
        }));
    }

    function decodeBase64Utf8(base64Str) {
        const clean = base64Str.replace(/\s/g, '');
        return decodeURIComponent(Array.prototype.map.call(atob(clean), function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    // =========================================================================
    // Cloud Status Badge & Configuration Helpers
    // =========================================================================

    function updateCloudStatusUI(status, labelText, tooltipTitle) {
        if (cloudStatusDot) {
            cloudStatusDot.className = 'cloud-status-dot ' + status;
        }
        if (lblCloudSyncStatus) {
            lblCloudSyncStatus.textContent = labelText;
        }
        if (cloudSyncBadge && tooltipTitle) {
            cloudSyncBadge.title = tooltipTitle;
        }
    }

    function updateCloudStatusFromConfig() {
        if (!githubConfig.token) {
            updateCloudStatusUI('warning', 'Read-Only (No Token)', 'Public repository sync. Add a Personal Access Token in Settings to enable automatic commits from this workstation.');
        } else {
            updateCloudStatusUI('synced', 'GitHub Synced', `Live multi-station sync active on ${githubConfig.owner}/${githubConfig.repo} (${githubConfig.branch}). Click to sync immediately.`);
        }
    }

    // =========================================================================
    // Master Registry Markdown Flat-File Database Logic
    // =========================================================================

    function generateMarkdownDbContent() {
        let md = `# Accubits Invent Lab — Master QC Batch Registry\n\n`;
        md += `> Flat-file Markdown database for DPCB Batch QC & Serialization Suite.\n`;
        md += `> You can edit this file directly on GitHub or in any text editor to track hardware batches.\n`;
        md += `> Station: ${settings.stationId || 'AIL-LAB-BENCH-01'} | Last Synced: ${new Date().toLocaleString()}\n\n`;
        md += `---\n\n`;
        md += `## Active Batches\n\n`;
        md += `| Batch ID | Subsystem | Total Qty | Serial Range | Created Date | Inspector | QC Status | Handover Target |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

        if (batches.length === 0) {
            md += `<!-- No active batches recorded yet -->\n`;
        } else {
            batches.forEach(b => {
                md += `| \`${b.batchId}\` | ${b.subsystem} | ${b.qty} | \`${b.serialRange}\` | ${b.createdDate} | ${b.inspector} | ${b.status || 'PASSED'} | ${b.handover} |\n`;
            });
        }

        md += `\n---\n\n## Station Access & Sign-In History\n\n`;
        md += `| Timestamp | Operator | Email | Role | Event | Status | Station ID |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

        if (authHistory.length === 0) {
            md += `<!-- No station authentication events recorded yet -->\n`;
        } else {
            authHistory.slice(0, 50).forEach(a => {
                md += `| ${a.timestamp} | ${a.userName} | \`${a.email}\` | ${a.role} | ${a.event} | ${a.status} | ${a.stationId || settings.stationId || 'AIL-LAB-BENCH-01'} |\n`;
            });
        }

        md += `\n---\n\n## Historical Batch Logs\n\n`;
        md += `| Batch ID | Subsystem | Total Qty | Serial Range | Created Date | Inspector | QC Status | Handover Target |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n\n`;
        md += `---\n\n`;
        md += `*Accubits Invent Lab  |  Quality Control Division*\n`;
        return md;
    }

    function parseMarkdownDb(content) {
        const lines = content.split('\n');
        let currentSection = '';
        const parsedBatches = [];
        const parsedAuth = [];

        for (let line of lines) {
            const l = line.trim();
            if (l.startsWith('## Active Batches')) {
                currentSection = 'batches';
                continue;
            } else if (l.startsWith('## Station Access & Sign-In History')) {
                currentSection = 'auth';
                continue;
            } else if (l.startsWith('## ')) {
                currentSection = '';
                continue;
            }

            if (l.startsWith('|') && !l.includes(':---')) {
                const parts = l.split('|').map(x => x.trim().replace(/`/g, '')).slice(1, -1);
                if (currentSection === 'batches') {
                    if (parts.length >= 8 && parts[0] !== 'Batch ID' && !parts[0].startsWith('<!--')) {
                        parsedBatches.push({
                            batchId: parts[0],
                            subsystem: parts[1],
                            qty: parseInt(parts[2], 10) || 20,
                            serialRange: parts[3],
                            createdDate: parts[4],
                            inspector: parts[5],
                            status: parts[6],
                            handover: parts[7]
                        });
                    }
                } else if (currentSection === 'auth') {
                    if (parts.length >= 6 && parts[0] !== 'Timestamp' && !parts[0].startsWith('<!--')) {
                        parsedAuth.push({
                            id: 'AUTH-SYNC-' + parts[0].replace(/[^a-zA-Z0-9]/g, '') + '-' + (parts[2] || ''),
                            timestamp: parts[0],
                            userName: parts[1],
                            email: parts[2],
                            role: parts[3],
                            event: parts[4],
                            status: parts[5],
                            stationId: parts[6] || 'AIL-BENCH'
                        });
                    }
                }
            }
        }
        return { batches: parsedBatches, authHistory: parsedAuth };
    }

    function parseMarkdownTableToBatches(content) {
        return parseMarkdownDb(content).batches;
    }

    function mergeBatches(incomingBatches) {
        if (!incomingBatches || incomingBatches.length === 0) return false;
        let changed = false;
        const batchMap = new Map();

        // 1. Map incoming batches
        incomingBatches.forEach(b => {
            if (b && b.batchId) batchMap.set(b.batchId, b);
        });

        // 2. Preserve any locally created batches not yet present on remote
        batches.forEach(b => {
            if (b && b.batchId && !batchMap.has(b.batchId)) {
                batchMap.set(b.batchId, b);
                changed = true;
            }
        });

        const merged = Array.from(batchMap.values());
        if (JSON.stringify(merged) !== JSON.stringify(batches)) {
            batches = merged;
            persistBatches();
            changed = true;
        }
        return changed;
    }

    function mergeAuthHistory(incomingAuth) {
        if (!incomingAuth || incomingAuth.length === 0) return false;
        let changed = false;
        const seen = new Set();
        const merged = [];

        [...authHistory, ...incomingAuth].forEach(item => {
            const key = `${item.timestamp}_${item.email}_${item.event}`;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(item);
            }
        });

        if (merged.length !== authHistory.length) {
            authHistory = merged.slice(0, 150);
            saveAuthHistory();
            renderAuthHistoryTable();
            changed = true;
        }
        return changed;
    }

    // =========================================================================
    // GitHub API Direct Live Synchronization Engine
    // =========================================================================

    async function fetchFromGitHubApi(silent = false) {
        if (isSyncingWithGithub) return false;
        isSyncingWithGithub = true;
        updateCloudStatusUI('syncing', 'Syncing...', 'Checking GitHub repository for latest batches...');

        try {
            const repoPath = `${githubConfig.owner}/${githubConfig.repo}`;
            const apiUrl = `https://api.github.com/repos/${repoPath}/contents/${githubConfig.path}?ref=${githubConfig.branch}&t=${Date.now()}`;

            const headers = {
                'Accept': 'application/vnd.github+json'
            };
            if (githubConfig.token) {
                headers['Authorization'] = `Bearer ${githubConfig.token}`;
            }

            const resp = await fetch(apiUrl, { headers });

            if (resp.status === 200) {
                const data = await resp.json();
                currentGithubSha = data.sha;
                const rawMarkdown = decodeBase64Utf8(data.content);
                const parsed = parseMarkdownDb(rawMarkdown);

                const batchChanged = mergeBatches(parsed.batches);
                const authChanged = mergeAuthHistory(parsed.authHistory);

                if (batchChanged || authChanged) {
                    renderTable();
                    renderAuthHistoryTable();
                    updatePreviews();
                    log(`[CLOUD SYNC] Synchronized ${parsed.batches.length} batch(es) and ${parsed.authHistory.length} audit entry/entries from GitHub (${repoPath}).`);
                }

                if (githubConfig.token) {
                    updateCloudStatusUI('synced', 'GitHub Synced', `Last synchronized at ${new Date().toLocaleTimeString()} on ${githubConfig.branch}`);
                } else {
                    updateCloudStatusUI('warning', 'Read-Only (No Token)', 'Fetched from GitHub. To commit updates from this workstation, enter a Personal Access Token in Settings.');
                }

                if (!silent) {
                    alert(`Sync Complete!\n\n• Repository: ${repoPath}\n• Batches in DB: ${batches.length}\n• Audit Entries: ${authHistory.length}`);
                }
                isSyncingWithGithub = false;
                return true;
            } else if (resp.status === 404) {
                currentGithubSha = null;
                updateCloudStatusUI('warning', 'DB Not on Repo', 'batch_registry.md not found on branch. Generating a batch with PAT configured will create it automatically.');
                isSyncingWithGithub = false;
                return false;
            } else {
                // Try fallback to raw.githubusercontent.com or local file
                const fallbackSuccess = await fetchFallbackRawMarkdown(silent);
                isSyncingWithGithub = false;
                return fallbackSuccess;
            }
        } catch (err) {
            console.warn('GitHub API fetch failed, trying fallback:', err.message);
            const fallbackSuccess = await fetchFallbackRawMarkdown(silent);
            isSyncingWithGithub = false;
            return fallbackSuccess;
        }
    }

    async function fetchFallbackRawMarkdown(silent = false) {
        try {
            // First attempt: raw.githubusercontent.com
            const rawUrl = `https://raw.githubusercontent.com/${githubConfig.owner}/${githubConfig.repo}/${githubConfig.branch}/${githubConfig.path}?t=${Date.now()}`;
            let resp = await fetch(rawUrl).catch(() => null);

            // Second attempt: local file relative to server
            if (!resp || !resp.ok) {
                resp = await fetch(`batch_registry.md?t=${Date.now()}`);
            }

            if (!resp || !resp.ok) throw new Error('Repository file inaccessible.');

            const content = await resp.text();
            const parsed = parseMarkdownDb(content);

            mergeBatches(parsed.batches);
            mergeAuthHistory(parsed.authHistory);
            renderTable();
            renderAuthHistoryTable();
            updatePreviews();

            updateCloudStatusUI('warning', 'Read-Only (Fallback)', 'Synchronized from public raw content. Configure Personal Access Token in Settings to enable direct cloud writing.');
            log(`[FALLBACK SYNC] Loaded ${parsed.batches.length} batch(es) via fallback.`);
            if (!silent) alert(`Synchronized ${parsed.batches.length} batch(es) from repository.`);
            return true;
        } catch (err) {
            updateCloudStatusUI('error', 'Sync Failed', `Could not reach GitHub: ${err.message}`);
            log(`[CLOUD SYNC NOTICE] Unable to reach GitHub (${err.message}). Local workstation database active.`);
            if (!silent) alert(`Could not connect to GitHub repository: ${err.message}`);
            return false;
        }
    }

    async function fetchRepoMarkdownDb(silent = false) {
        return await fetchFromGitHubApi(silent);
    }

    async function commitMarkdownDbToGitHub(commitMessage) {
        if (!githubConfig.token) {
            log('[NOTICE] No GitHub Personal Access Token configured. Saved to local browser storage.');
            updateCloudStatusUI('warning', 'Local Only (No Token)', 'Enter a Personal Access Token in Settings to synchronize across lab workstations.');
            return { success: false, reason: 'no-token' };
        }

        updateCloudStatusUI('syncing', 'Saving to GitHub...', 'Pushing updated batch registry to GitHub...');
        try {
            const repoPath = `${githubConfig.owner}/${githubConfig.repo}`;
            
            // 1. Fetch latest SHA to prevent HTTP 409 Conflict
            const getUrl = `https://api.github.com/repos/${repoPath}/contents/${githubConfig.path}?ref=${githubConfig.branch}&t=${Date.now()}`;
            const getResp = await fetch(getUrl, {
                headers: {
                    'Authorization': `Bearer ${githubConfig.token}`,
                    'Accept': 'application/vnd.github+json'
                }
            });

            if (getResp.ok) {
                const getData = await getResp.json();
                currentGithubSha = getData.sha;
            }

            // 2. Prepare PUT payload
            const putUrl = `https://api.github.com/repos/${repoPath}/contents/${githubConfig.path}`;
            const contentStr = generateMarkdownDbContent();
            const base64Content = encodeBase64Utf8(contentStr);

            const putBody = {
                message: commitMessage || `Update QC batch registry [${settings.stationId || 'AIL-BENCH'}]`,
                content: base64Content,
                branch: githubConfig.branch
            };
            if (currentGithubSha) {
                putBody.sha = currentGithubSha;
            }

            const putResp = await fetch(putUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${githubConfig.token}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(putBody)
            });

            if (!putResp.ok) {
                const errData = await putResp.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP ${putResp.status}`);
            }

            const resData = await putResp.json();
            currentGithubSha = resData.content?.sha || currentGithubSha;

            updateCloudStatusUI('synced', 'GitHub Synced', `Last pushed to GitHub at ${new Date().toLocaleTimeString()} on ${githubConfig.branch}`);
            log(`[CLOUD SYNC OK] Committed updated batch registry to GitHub (${githubConfig.branch}).`);
            return { success: true };
        } catch (err) {
            console.error('GitHub Commit Error:', err);
            updateCloudStatusUI('error', 'Sync Error', `Commit failed: ${err.message}`);
            log(`[CLOUD SYNC ERROR] Could not push to GitHub: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    function exportMasterMarkdownDb() {
        const md = generateMarkdownDbContent();
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
        triggerDownload(blob, 'batch_registry.md');
        log('[OK] Exported live registry as batch_registry.md');
    }

    function handleImportDbFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (evt) {
            const content = evt.target.result;
            try {
                if (file.name.endsWith('.json')) {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                        batches = parsed;
                        persistBatches();
                        renderTable();
                        updatePreviews();
                        log(`[OK] Imported ${batches.length} batches from JSON.`);
                        closeSettingsModal();
                        return;
                    }
                }

                const imported = parseMarkdownTableToBatches(content);
                if (imported.length > 0) {
                    batches = imported;
                    persistBatches();
                    renderTable();
                    updatePreviews();
                    log(`[OK] Successfully imported ${imported.length} batches from ${file.name}`);
                    alert(`Imported ${imported.length} batches from ${file.name}`);
                    closeSettingsModal();
                } else {
                    alert('No valid batch records found in the uploaded file.');
                }
            } catch (err) {
                alert(`Error parsing database file: ${err.message}`);
            }
        };
        reader.readAsText(file);
    }

    // Live In-App Markdown DB Modal Editor
    function openMdDbModal() {
        if (!mdDbModal) return;
        txtMdDbContent.value = generateMarkdownDbContent();
        mdDbModal.classList.add('active');
    }

    function closeMdDbModal() {
        if (!mdDbModal) return;
        mdDbModal.classList.remove('active');
    }

    async function handleApplyMdDb() {
        const content = txtMdDbContent.value.trim();
        if (!content) return;
        const parsed = parseMarkdownDb(content);
        if (parsed.batches.length > 0) {
            batches = parsed.batches;
            persistBatches();
            if (parsed.authHistory.length > 0) {
                mergeAuthHistory(parsed.authHistory);
            }
            renderTable();
            updatePreviews();
            log(`[MD DB] Applied ${parsed.batches.length} batches from edited Markdown.`);

            if (githubConfig.token) {
                log('Pushing edited Markdown database to GitHub repository...');
                const commitRes = await commitMarkdownDbToGitHub('Direct update to batch_registry.md via In-App Editor');
                if (commitRes.success) {
                    alert(`Applied ${parsed.batches.length} batch(es) and synchronized with GitHub repository!`);
                } else {
                    alert(`Applied ${parsed.batches.length} batch(es) to this workstation. GitHub push warning: ${commitRes.error}`);
                }
            } else {
                alert(`Applied ${parsed.batches.length} batch(es) to workstation database.`);
            }
            closeMdDbModal();
        } else {
            alert('Could not find any active batch rows in the table. Ensure the "## Active Batches" table format is preserved.');
        }
    }

    function handleCopyMdDb() {
        const text = txtMdDbContent.value;
        navigator.clipboard.writeText(text).then(() => {
            if (lblCopyMdBtnText) {
                lblCopyMdBtnText.textContent = 'Copied!';
                setTimeout(() => { lblCopyMdBtnText.textContent = 'Copy Markdown'; }, 2000);
            }
            log('[OK] Markdown database copied to clipboard.');
        }).catch(err => {
            alert('Failed to copy to clipboard: ' + err.message);
        });
    }

    function handleDownloadMdDb() {
        const blob = new Blob([txtMdDbContent.value], { type: 'text/markdown;charset=utf-8;' });
        triggerDownload(blob, 'batch_registry.md');
        log('[OK] Downloaded updated batch_registry.md');
    }

    // =========================================================================
    // Safe Archival & Reset ("Delete All Data / Start Fresh")
    // =========================================================================

    function handleSafeArchiveAndReset() {
        if (batches.length === 0) {
            alert('The database is already fresh and empty (0 batches).');
            return;
        }

        const confirmReset = confirm(
            `Confirm Safe Reset & Archival:\n\n` +
            `Your existing records (${batches.length} batches) will NOT be lost:\n` +
            `• A complete timestamped backup markdown file will be downloaded immediately.\n` +
            `• The active database will reset so Batch IDs restart from BATCH-A and serial numbers from DP1.\n\n` +
            `Proceed with safe archival and reset?`
        );

        if (confirmReset) {
            const nowStr = new Date().toISOString().replace(/[:.]/g, '-');
            const archiveFilename = `batch_registry_archived_${nowStr}.md`;

            let md = `# Accubits Invent Lab — Archived QC Batch Registry (${nowStr})\n\n`;
            md += `| Batch ID | Subsystem | Total Qty | Serial Range | Created Date | Inspector | QC Status | Handover Target |\n`;
            md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
            batches.forEach(b => {
                md += `| \`${b.batchId}\` | ${b.subsystem} | ${b.qty} | \`${b.serialRange}\` | ${b.createdDate} | ${b.inspector} | ${b.status || 'PASSED'} | ${b.handover} |\n`;
            });

            const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
            triggerDownload(blob, archiveFilename);

            batches = [];
            persistBatches();
            log(`[SAFE RESET] Data safely archived to ${archiveFilename}. Active database reset to clean state.`);

            if (githubConfig.token) {
                commitMarkdownDbToGitHub(`Safe Archive & Reset triggered by ${settings.stationId}`);
            }

            alert(`Database Safely Archived!\n\nBackup file: ${archiveFilename}\n\nActive registry is now clean and ready for fresh production runs.`);
            closeSettingsModal();
        }
    }

    // =========================================================================
    // Settings Modal & GitHub Verification Handlers
    // =========================================================================

    function openSettingsModal() {
        txtStationId.value = settings.stationId || 'AIL-LAB-BENCH-01';
        txtGithubRepo.value = `${githubConfig.owner}/${githubConfig.repo}`;
        txtGithubBranch.value = githubConfig.branch || 'main';
        txtGithubToken.value = githubConfig.token || '';
        if (lblGithubConnectionStatus) {
            lblGithubConnectionStatus.textContent = '';
            lblGithubConnectionStatus.style.color = '';
        }
        settingsModal.classList.add('active');
    }

    function closeSettingsModal() {
        settingsModal.classList.remove('active');
    }

    function saveSettingsFromModal() {
        settings.stationId = txtStationId.value.trim() || 'AIL-LAB-BENCH-01';

        const repoVal = txtGithubRepo.value.trim();
        if (repoVal.includes('/')) {
            const parts = repoVal.split('/');
            githubConfig.owner = parts[0].trim();
            githubConfig.repo = parts[1].trim();
        }
        githubConfig.branch = txtGithubBranch.value.trim() || 'main';
        githubConfig.token = txtGithubToken.value.trim();

        saveSettings();
        closeSettingsModal();
        updateCloudStatusFromConfig();

        log(`Settings saved. Workstation: ${settings.stationId} | Target: ${githubConfig.owner}/${githubConfig.repo} (${githubConfig.branch})`);

        // Test sync immediately
        fetchFromGitHubApi(false);
    }

    function toggleTokenVisibility() {
        if (!txtGithubToken || !btnToggleTokenVisibility) return;
        if (txtGithubToken.type === 'password') {
            txtGithubToken.type = 'text';
            btnToggleTokenVisibility.textContent = 'Hide';
        } else {
            txtGithubToken.type = 'password';
            btnToggleTokenVisibility.textContent = 'Show';
        }
    }

    async function testGithubConnection() {
        if (!lblGithubConnectionStatus) return;
        const repoVal = (txtGithubRepo.value || '').trim();
        const tokenVal = (txtGithubToken.value || '').trim();

        if (!repoVal || !repoVal.includes('/')) {
            lblGithubConnectionStatus.textContent = '❌ Enter repository in format "owner/repo"';
            lblGithubConnectionStatus.style.color = 'var(--danger)';
            return;
        }

        const [owner, repo] = repoVal.split('/').map(s => s.trim());
        lblGithubConnectionStatus.textContent = '⏳ Testing connection...';
        lblGithubConnectionStatus.style.color = 'var(--accent-cyan)';

        try {
            const headers = {
                'Accept': 'application/vnd.github+json'
            };
            if (tokenVal) {
                headers['Authorization'] = `Bearer ${tokenVal}`;
            }

            const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
            if (resp.status === 401) {
                lblGithubConnectionStatus.textContent = '❌ Invalid Token (401 Unauthorized)';
                lblGithubConnectionStatus.style.color = 'var(--danger)';
                return;
            }
            if (resp.status === 404) {
                lblGithubConnectionStatus.textContent = '❌ Repo not found or Token lacks access (404)';
                lblGithubConnectionStatus.style.color = 'var(--danger)';
                return;
            }
            if (!resp.ok) {
                lblGithubConnectionStatus.textContent = `❌ HTTP ${resp.status}`;
                lblGithubConnectionStatus.style.color = 'var(--danger)';
                return;
            }

            const repoData = await resp.json();
            const canPush = repoData.permissions && repoData.permissions.push;
            if (tokenVal && canPush) {
                lblGithubConnectionStatus.textContent = '✅ Connected! Read & Write permissions verified.';
                lblGithubConnectionStatus.style.color = 'var(--success)';
            } else if (tokenVal) {
                lblGithubConnectionStatus.textContent = '⚠️ Connected, but Token lacks write permission (Read-Only).';
                lblGithubConnectionStatus.style.color = 'var(--warning)';
            } else {
                lblGithubConnectionStatus.textContent = '⚠️ Public Read-Only access (No Token).';
                lblGithubConnectionStatus.style.color = 'var(--warning)';
            }
        } catch (err) {
            lblGithubConnectionStatus.textContent = `❌ Connection failed: ${err.message}`;
            lblGithubConnectionStatus.style.color = 'var(--danger)';
        }
    }

    // Initialize on DOM ready
    window.addEventListener('DOMContentLoaded', init);

})();
