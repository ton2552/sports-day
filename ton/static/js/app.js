// State Management
const state = {
    adminPin: sessionStorage.getItem("sports_admin_pin") || "",
    leaderboard: [],
    teams: [],
    sports: [],
    logs: [],
    settings: {
        title: "มหกรรมกีฬาสีสัมพันธ์ 2026",
        gold_points: 10,
        silver_points: 7,
        bronze_points: 5
    },
    autoRefresh: true,
    refreshTimer: null,
    countdownSeconds: 10,
    countdownTimer: null,
    previousTopTeamId: null
};

// Utility: API call with Admin PIN header if present
async function apiCall(url, options = {}) {
    options.headers = options.headers || {};
    if (state.adminPin) {
        options.headers["X-Admin-PIN"] = state.adminPin;
    }
    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.detail || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
    return data;
}

// Check admin status
function isAdmin() {
    return !!state.adminPin;
}

function updateAdminUI() {
    const adminBadges = document.querySelectorAll(".admin-only");
    const loginBtn = document.getElementById("admin-login-btn");
    const userStatusText = document.getElementById("user-status-text");

    if (isAdmin()) {
        adminBadges.forEach(el => el.classList.remove("hidden"));
        if (loginBtn) {
            loginBtn.innerHTML = `
                <span class="inline-flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full font-medium hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    ผู้ดูแล (ออกจากระบบ)
                </span>
            `;
            loginBtn.onclick = handleLogout;
        }
        if (userStatusText) userStatusText.textContent = "โหมดผู้ดูแลระบบ";
    } else {
        adminBadges.forEach(el => el.classList.add("hidden"));
        if (loginBtn) {
            loginBtn.innerHTML = `
                <span class="inline-flex items-center gap-1.5 text-xs bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    เข้าสู่ระบบผู้ดูแล
                </span>
            `;
            loginBtn.onclick = () => openModal("modal-login");
        }
        if (userStatusText) userStatusText.textContent = "โหมดผู้ชมทั่วไป";
    }
}

// Fetch all necessary data
async function loadData(showToast = false) {
    try {
        const [lbData, scoresData, sportsData, teamsData] = await Promise.all([
            apiCall("/api/leaderboard"),
            apiCall("/api/scores?limit=30"),
            apiCall("/api/sports"),
            apiCall("/api/teams")
        ]);

        state.leaderboard = lbData.teams || [];
        state.settings = { ...state.settings, ...(lbData.settings || {}), title: lbData.title };
        state.logs = scoresData || [];
        state.sports = sportsData || [];
        state.teams = teamsData || [];

        // Check if top team changed
        if (state.leaderboard.length > 0) {
            const currentTop = state.leaderboard[0];
            if (state.previousTopTeamId !== null && state.previousTopTeamId !== currentTop.id) {
                triggerConfetti();
            }
            state.previousTopTeamId = currentTop.id;
        }

        renderHeader();
        renderPodium();
        renderScoreboard();
        renderRecentLogs();
        populateSportOptions();
        populateTeamOptions();

        if (showToast && typeof Swal !== "undefined") {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
            Toast.fire({ icon: 'success', title: 'อัปเดตข้อมูลล่าสุดเรียบร้อย' });
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

// Render dynamic title & points in UI
function renderHeader() {
    const titleEl = document.getElementById("event-title");
    if (titleEl && state.settings.title) {
        titleEl.textContent = state.settings.title;
        document.title = `${state.settings.title} | Live Scoreboard`;
    }

    // Update point pills in Add Score modal
    const goldPtsEl = document.getElementById("label-gold-pts");
    const silverPtsEl = document.getElementById("label-silver-pts");
    const bronzePtsEl = document.getElementById("label-bronze-pts");
    if (goldPtsEl) goldPtsEl.textContent = `(+${state.settings.gold_points})`;
    if (silverPtsEl) silverPtsEl.textContent = `(+${state.settings.silver_points})`;
    if (bronzePtsEl) bronzePtsEl.textContent = `(+${state.settings.bronze_points})`;
}

// Render Top 3 Podium
function renderPodium() {
    const container = document.getElementById("podium-container");
    if (!container) return;

    if (state.leaderboard.length === 0) {
        container.innerHTML = `
            <div class="col-span-3 text-center py-12 text-slate-400">
                ยังไม่มีข้อมูลคะแนน เริ่มต้นบันทึกคะแนนกีฬาเลย!
            </div>
        `;
        return;
    }

    const first = state.leaderboard[0] || null;
    const second = state.leaderboard[1] || null;
    const third = state.leaderboard[2] || null;

    const renderCard = (team, place, medal, heightClass, orderClass, glowClass) => {
        if (!team) {
            return `
                <div class="${orderClass} flex flex-col items-center justify-end">
                    <div class="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 text-center text-slate-500">
                        รอผู้ชนะอันดับ ${place}
                    </div>
                </div>
            `;
        }

        const isFirst = place === 1;

        return `
            <div class="${orderClass} flex flex-col items-center justify-end transition-all duration-300">
                <!-- Mascot / Trophy Header -->
                <div class="relative -mb-6 z-10 flex flex-col items-center">
                    <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-xl ${glowClass} border-4 border-slate-900 bg-slate-800 transform hover:scale-110 transition-transform">
                        ${medal}
                    </div>
                    ${isFirst ? '<span class="absolute -top-4 text-yellow-400 text-2xl animate-bounce">👑</span>' : ''}
                </div>

                <!-- Main Card -->
                <div class="w-full pt-8 pb-5 px-4 rounded-3xl ${heightClass} flex flex-col justify-between relative overflow-hidden shadow-2xl border transition-all duration-300 hover:shadow-cyan-500/10"
                     style="background: linear-gradient(180deg, ${team.color_code}22 0%, rgba(15, 23, 42, 0.95) 70%); border-color: ${team.color_code}66;">
                    
                    <div class="text-center">
                        <span class="inline-block px-3 py-0.5 rounded-full text-xs font-semibold tracking-wider text-slate-300 bg-slate-800/80 border border-slate-700 mb-2">
                            อันดับที่ ${place}
                        </span>
                        <h3 class="text-lg sm:text-xl font-bold truncate text-white" title="${team.name}">
                            ${team.name}
                        </h3>
                    </div>

                    <!-- Score display -->
                    <div class="my-4 text-center">
                        <div class="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                            ${team.total_score.toLocaleString()}
                        </div>
                        <span class="text-xs text-slate-400 uppercase tracking-widest font-medium">คะแนนรวม</span>
                    </div>

                    <!-- Medals Count Badges -->
                    <div class="grid grid-cols-3 gap-1 bg-slate-900/80 rounded-xl p-2 border border-slate-800 text-center text-xs">
                        <div class="flex flex-col items-center">
                            <span class="text-base">🥇</span>
                            <span class="font-bold text-yellow-400">${team.gold_count}</span>
                        </div>
                        <div class="flex flex-col items-center border-x border-slate-800">
                            <span class="text-base">🥈</span>
                            <span class="font-bold text-slate-300">${team.silver_count}</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span class="text-base">🥉</span>
                            <span class="font-bold text-amber-500">${team.bronze_count}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    container.innerHTML = `
        <!-- Rank 2: Silver (Left) -->
        ${renderCard(second, 2, '🥈', 'min-h-[260px]', 'order-2 md:order-1', 'shadow-slate-400/20')}
        
        <!-- Rank 1: Gold (Center & Tallest) -->
        ${renderCard(first, 1, '🥇', 'min-h-[300px] border-yellow-500/50', 'order-1 md:order-2', 'shadow-yellow-500/30')}
        
        <!-- Rank 3: Bronze (Right) -->
        ${renderCard(third, 3, '🥉', 'min-h-[230px]', 'order-3 md:order-3', 'shadow-amber-700/20')}
    `;
}

// Render full table of all teams
function renderScoreboard() {
    const tbody = document.getElementById("scoreboard-body");
    if (!tbody) return;

    if (state.leaderboard.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-slate-400">ยังไม่มีข้อมูลคะแนน</td>
            </tr>
        `;
        return;
    }

    const maxScore = Math.max(...state.leaderboard.map(t => t.total_score), 1);

    tbody.innerHTML = state.leaderboard.map((team, idx) => {
        const percent = Math.round((team.total_score / maxScore) * 100);
        let rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-slate-800 text-slate-300">${idx + 1}</span>`;
        if (idx === 0) rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-base font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">🥇</span>`;
        if (idx === 1) rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-base font-bold bg-slate-400/20 text-slate-200 border border-slate-400/40">🥈</span>`;
        if (idx === 2) rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-base font-bold bg-amber-600/20 text-amber-400 border border-amber-600/40">🥉</span>`;

        return `
            <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
                <td class="py-3.5 px-4 text-center font-bold">${rankBadge}</td>
                <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                        <div class="w-4 h-4 rounded-full shadow" style="background-color: ${team.color_code}; box-shadow: 0 0 10px ${team.color_code}88;"></div>
                        <div class="font-semibold text-white text-base">${team.name}</div>
                    </div>
                    <!-- Relative Score Progress Bar -->
                    <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-700" style="width: ${percent}%; background-color: ${team.color_code};"></div>
                    </div>
                </td>
                <td class="py-3.5 px-4 text-center font-semibold text-yellow-400 text-base">
                    ${team.gold_count > 0 ? team.gold_count : '<span class="text-slate-600">-</span>'}
                </td>
                <td class="py-3.5 px-4 text-center font-semibold text-slate-300 text-base">
                    ${team.silver_count > 0 ? team.silver_count : '<span class="text-slate-600">-</span>'}
                </td>
                <td class="py-3.5 px-4 text-center font-semibold text-amber-500 text-base">
                    ${team.bronze_count > 0 ? team.bronze_count : '<span class="text-slate-600">-</span>'}
                </td>
                <td class="py-3.5 px-4 text-center text-xs text-slate-400">
                    ${team.log_count} รายการ
                </td>
                <td class="py-3.5 px-4 text-right">
                    <span class="text-xl sm:text-2xl font-black text-white" style="color: ${team.color_code}">
                        ${team.total_score.toLocaleString()}
                    </span>
                    <span class="text-xs text-slate-400 ml-1">แต้ม</span>
                </td>
            </tr>
        `;
    }).join("");
}

// Render Recent Score Logs
function renderRecentLogs() {
    const listEl = document.getElementById("recent-logs-list");
    if (!listEl) return;

    if (state.logs.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-8 text-slate-500 text-sm">
                ยังไม่มีประวัติการบันทึกคะแนน
            </div>
        `;
        return;
    }

    listEl.innerHTML = state.logs.map(log => {
        let awardBadge = `<span class="bg-slate-700 text-slate-200 px-2.5 py-0.5 rounded text-xs font-semibold">+${log.points} แต้ม</span>`;
        if (log.award_type === "gold") {
            awardBadge = `<span class="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">🥇 ทอง (+${log.points})</span>`;
        } else if (log.award_type === "silver") {
            awardBadge = `<span class="bg-slate-400/20 text-slate-200 border border-slate-400/30 px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">🥈 เงิน (+${log.points})</span>`;
        } else if (log.award_type === "bronze") {
            awardBadge = `<span class="bg-amber-600/20 text-amber-400 border border-amber-600/30 px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1">🥉 ทองแดง (+${log.points})</span>`;
        }

        const deleteBtn = isAdmin() ? `
            <button onclick="handleDeleteScore(${log.id})" title="ลบรายการนี้" class="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        ` : '';

        return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-3.5 h-3.5 rounded-full shrink-0" style="background-color: ${log.team_color}"></div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-white text-sm">${log.team_name}</span>
                            <span class="text-slate-400 text-xs">• ${log.sport_name}</span>
                            ${awardBadge}
                        </div>
                        ${log.description ? `<p class="text-xs text-slate-400 mt-0.5">${log.description}</p>` : ''}
                        <div class="text-[11px] text-slate-500 mt-0.5">
                            บันทึกโดย: ${log.recorded_by} | ${log.created_at}
                        </div>
                    </div>
                </div>
                <div>
                    ${deleteBtn}
                </div>
            </div>
        `;
    }).join("");
}

// Populate Dropdown for Add Score Modal
function populateSportOptions() {
    const datalist = document.getElementById("sport-datalist");
    if (!datalist) return;
    datalist.innerHTML = state.sports.map(s => `<option value="${s.name}">${s.category}</option>`).join("");
}

function populateTeamOptions() {
    const container = document.getElementById("team-radio-group");
    if (!container) return;

    container.innerHTML = state.teams.map((t, i) => `
        <label class="cursor-pointer border border-slate-700 rounded-xl p-3 flex items-center justify-between hover:border-slate-500 transition-colors peer-checked:border-white">
            <div class="flex items-center gap-2.5">
                <input type="radio" name="score_team_id" value="${t.id}" class="accent-indigo-500" ${i === 0 ? 'checked' : ''} required>
                <div class="w-4 h-4 rounded-full" style="background-color: ${t.color_code}"></div>
                <span class="font-semibold text-white text-sm">${t.name}</span>
            </div>
        </label>
    `).join("");
}

// Action: Handle Admin Login
async function handleLogin(e) {
    e.preventDefault();
    const pinInput = document.getElementById("login-pin-input");
    const pin = pinInput.value.trim();
    if (!pin) return;

    try {
        await apiCall("/api/auth/verify", {
            method: "POST",
            body: { pin }
        });
        state.adminPin = pin;
        sessionStorage.setItem("sports_admin_pin", pin);
        closeModal("modal-login");
        updateAdminUI();
        renderRecentLogs();
        Swal.fire({
            icon: 'success',
            title: 'ยินดีต้อนรับผู้ดูแลระบบ',
            text: 'คุณสามารถบันทึกคะแนน แก้ไข และตั้งค่าระบบได้แล้ว',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'รหัส PIN ไม่ถูกต้อง',
            text: 'กรุณาตรวจสอบรหัสผ่านอีกครั้ง (ค่าเริ่มต้นคือ 1234)'
        });
    }
}

function handleLogout() {
    state.adminPin = "";
    sessionStorage.removeItem("sports_admin_pin");
    updateAdminUI();
    renderRecentLogs();
    Swal.fire({
        icon: 'info',
        title: 'ออกจากระบบผู้ดูแลแล้ว',
        timer: 1500,
        showConfirmButton: false
    });
}

// Action: Submit New Score
async function handleAddScore(e) {
    e.preventDefault();
    if (!isAdmin()) {
        openModal("modal-login");
        return;
    }

    const teamRadio = document.querySelector('input[name="score_team_id"]:checked');
    const sportInput = document.getElementById("score-sport-input");
    const awardRadio = document.querySelector('input[name="score_award_type"]:checked');
    const customPointsInput = document.getElementById("score-custom-points");
    const descInput = document.getElementById("score-desc-input");
    const recorderInput = document.getElementById("score-recorder-input");

    if (!teamRadio || !sportInput.value.trim() || !awardRadio) {
        Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        return;
    }

    const awardType = awardRadio.value;
    let points = null;
    if (awardType === "custom") {
        points = parseInt(customPointsInput.value) || 0;
    }

    try {
        const payload = {
            team_id: parseInt(teamRadio.value),
            sport_name: sportInput.value.trim(),
            award_type: awardType,
            points: points,
            description: descInput.value.trim() || null,
            recorded_by: recorderInput.value.trim() || "กรรมการ"
        };

        const res = await apiCall("/api/scores", {
            method: "POST",
            body: payload
        });

        // Add sport automatically if new
        const exists = state.sports.some(s => s.name === payload.sport_name);
        if (!exists) {
            await apiCall("/api/sports", {
                method: "POST",
                body: { name: payload.sport_name, category: "ทั่วไป" }
            }).catch(() => {});
        }

        closeModal("modal-add-score");
        triggerConfetti();

        Swal.fire({
            icon: 'success',
            title: 'บันทึกคะแนนเรียบร้อย!',
            text: res.message,
            timer: 2000,
            showConfirmButton: false
        });

        // Reset form
        sportInput.value = "";
        descInput.value = "";
        customPointsInput.value = "1";
        document.getElementById("custom-points-wrapper").classList.add("hidden");
        document.querySelector('input[name="score_award_type"][value="gold"]').checked = true;

        await loadData();
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    }
}

// Action: Delete Score
async function handleDeleteScore(scoreId) {
    if (!isAdmin()) {
        openModal("modal-login");
        return;
    }

    const result = await Swal.fire({
        title: 'ยืนยันการลบรายการนี้?',
        text: 'คะแนนที่เคยบวกจะถูกหักออกทันที และไม่สามารถกู้คืนได้',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#475569',
        confirmButtonText: 'ใช่, ลบคะแนนนี้',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        try {
            await apiCall(`/api/scores/${scoreId}`, { method: "DELETE" });
            Swal.fire({
                icon: 'success',
                title: 'ลบสำเร็จ',
                timer: 1500,
                showConfirmButton: false
            });
            await loadData();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
        }
    }
}

// Action: Save Settings
async function handleSaveSettings(e) {
    e.preventDefault();
    if (!isAdmin()) return;

    const title = document.getElementById("setting-title").value.trim();
    const gold = parseInt(document.getElementById("setting-gold").value);
    const silver = parseInt(document.getElementById("setting-silver").value);
    const bronze = parseInt(document.getElementById("setting-bronze").value);
    const newPin = document.getElementById("setting-pin").value.trim();

    try {
        const payload = {
            title,
            gold_points: gold,
            silver_points: silver,
            bronze_points: bronze
        };
        if (newPin) payload.new_admin_pin = newPin;

        await apiCall("/api/settings", {
            method: "PUT",
            body: payload
        });

        if (newPin) {
            state.adminPin = newPin;
            sessionStorage.setItem("sports_admin_pin", newPin);
        }

        closeModal("modal-settings");
        Swal.fire({ icon: 'success', title: 'บันทึกการตั้งค่าสำเร็จ', timer: 1500, showConfirmButton: false });
        await loadData();
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    }
}

// Action: Reset All Scores
async function handleResetScores() {
    if (!isAdmin()) return;

    const result = await Swal.fire({
        title: '⚠️ รีเซ็ตคะแนนทั้งหมด?',
        text: 'ข้อมูลคะแนนและเหรียญรางวัลทั้งหมดจะถูกล้างเป็น 0 สำหรับเริ่มงานใหม่',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'ยืนยันล้างข้อมูลคะแนนทั้งหมด',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        try {
            await apiCall("/api/reset-scores", { method: "POST" });
            closeModal("modal-settings");
            Swal.fire({ icon: 'success', title: 'รีเซ็ตข้อมูลเรียบร้อยแล้ว' });
            await loadData();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
        }
    }
}

// Action: Create New Team
async function handleCreateTeam(e) {
    e.preventDefault();
    if (!isAdmin()) return;

    const nameInput = document.getElementById("new-team-name");
    const colorInput = document.getElementById("new-team-color");

    try {
        await apiCall("/api/teams", {
            method: "POST",
            body: {
                name: nameInput.value.trim(),
                color_code: colorInput.value
            }
        });
        nameInput.value = "";
        Swal.fire({ icon: 'success', title: 'เพิ่มสีใหม่สำเร็จ', timer: 1500, showConfirmButton: false });
        await loadData();
        renderTeamsManageList();
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    }
}

// Action: Delete Team
async function handleDeleteTeam(teamId, teamName) {
    if (!isAdmin()) return;

    const result = await Swal.fire({
        title: `ลบ ${teamName}?`,
        text: 'คะแนนที่บันทึกของสีนี้จะถูกลบไปด้วย',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#475569',
        confirmButtonText: 'ลบสีนี้',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        try {
            await apiCall(`/api/teams/${teamId}`, { method: "DELETE" });
            await loadData();
            renderTeamsManageList();
            Swal.fire({ icon: 'success', title: 'ลบเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
        }
    }
}

function renderTeamsManageList() {
    const listEl = document.getElementById("manage-teams-list");
    if (!listEl) return;
    listEl.innerHTML = state.teams.map(t => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700">
            <div class="flex items-center gap-3">
                <div class="w-5 h-5 rounded-full shadow" style="background-color: ${t.color_code}"></div>
                <span class="font-semibold text-white">${t.name}</span>
            </div>
            <button onclick="handleDeleteTeam(${t.id}, '${t.name}')" class="text-slate-400 hover:text-red-400 p-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>
    `).join("");
}

// Confetti Effect
function triggerConfetti() {
    if (typeof confetti === "function") {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}

// Modal Helpers
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");

    if (id === "modal-settings") {
        document.getElementById("setting-title").value = state.settings.title;
        document.getElementById("setting-gold").value = state.settings.gold_points;
        document.getElementById("setting-silver").value = state.settings.silver_points;
        document.getElementById("setting-bronze").value = state.settings.bronze_points;
        document.getElementById("setting-pin").value = "";
    } else if (id === "modal-manage-teams") {
        renderTeamsManageList();
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
}

// Fullscreen toggle for Projector / TV mode
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        document.body.classList.add("fullscreen-mode");
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        document.body.classList.remove("fullscreen-mode");
    }
}

// Auto-refresh countdown
function startAutoRefresh() {
    state.countdownSeconds = 10;
    if (state.countdownTimer) clearInterval(state.countdownTimer);

    state.countdownTimer = setInterval(() => {
        if (!state.autoRefresh) return;
        state.countdownSeconds--;
        const badge = document.getElementById("auto-refresh-countdown");
        if (badge) badge.textContent = `${state.countdownSeconds}s`;

        if (state.countdownSeconds <= 0) {
            state.countdownSeconds = 10;
            loadData(false);
        }
    }, 1000);
}

// Event Listeners Initialization
document.addEventListener("DOMContentLoaded", () => {
    updateAdminUI();
    loadData();
    startAutoRefresh();

    // Toggle custom points input visibility
    document.querySelectorAll('input[name="score_award_type"]').forEach(radio => {
        radio.addEventListener("change", (e) => {
            const customWrapper = document.getElementById("custom-points-wrapper");
            if (e.target.value === "custom") {
                customWrapper.classList.remove("hidden");
            } else {
                customWrapper.classList.add("hidden");
            }
        });
    });

    // Forms
    const loginForm = document.getElementById("form-login");
    if (loginForm) loginForm.addEventListener("submit", handleLogin);

    const scoreForm = document.getElementById("form-add-score");
    if (scoreForm) scoreForm.addEventListener("submit", handleAddScore);

    const settingsForm = document.getElementById("form-settings");
    if (settingsForm) settingsForm.addEventListener("submit", handleSaveSettings);

    const teamForm = document.getElementById("form-create-team");
    if (teamForm) teamForm.addEventListener("submit", handleCreateTeam);

    // Close modals on clicking backdrop
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) {
                backdrop.classList.add("hidden");
            }
        });
    });
});

