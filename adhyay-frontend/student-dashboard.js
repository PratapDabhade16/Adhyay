
/* =========================================
   ADHYAY - Student Dashboard
   File: student-dashboard.js
   ========================================= */

const API_URL = (window.ADHYAY_CONFIG && window.ADHYAY_CONFIG.API_BASE)
    ? window.ADHYAY_CONFIG.API_BASE
    : "http://localhost:8081/api";
const AUTH_KEY = "adhyayUser";
const PROGRESS_KEY = "adhyayLectureProgress";
const BOOKMARKS_KEY = "adhyayLectureBookmarks";
const COMMENTS_KEY = "adhyayLectureComments";
const LIKES_KEY = "adhyayLectureLikes";

/* ---------- Auth Headers Helper ---------- */
function getAuthHeaders(extra = {}) {
    const token = (typeof getAccessToken === "function" ? getAccessToken() : null) || localStorage.getItem("adhyayAccessToken");
    const headers = { "Accept": "application/json", ...extra };
    if (token) headers["Authorization"] = "Bearer " + token;
    return headers;
}

/* ---------- Application State ---------- */

let currentUser = null;
let allLectures = [];
let filteredLectures = [];
let currentLecture = null;
let currentStudentView = "home"; // "home", "continue", "saved", "history"
let showSavedOnly = false;
let searchText = "";
let selectedSubject = "all";
let isLoading = false;

/* ---------- DOM Helpers ---------- */

const $ = (selector) => document.querySelector(selector);

function getElement(...ids) {
    for (const id of ids) {
        const element = document.getElementById(id);
        if (element) return element;
    }
    return null;
}

/* ---------- Local Storage Helpers ---------- */

function readJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.error(`Unable to read ${key}:`, error);
        return fallback;
    }
}

function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Unable to save ${key}:`, error);
        showMessage("Your browser could not save this information.", "error");
    }
}

function getProgress() {
    return readJSON(PROGRESS_KEY, {});
}

function getBookmarks() {
    return readJSON(BOOKMARKS_KEY, []);
}

function getLectureId(lecture) {
    return String(lecture?.id ?? lecture?._id ?? "");
}

function getLectureProgress(lecture) {
    const id = getLectureId(lecture);
    return getProgress()[id] || {
        currentTime: 0,
        duration: 0,
        completed: false
    };
}

/* ---------- Authentication ---------- */

function initializeUser() {
    currentUser = readJSON(AUTH_KEY, null);

    if (!currentUser) {
        window.location.href = "login.html";
        return false;
    }

    const role = String(currentUser.role || "").toUpperCase();

    if (role === "FACULTY") {
        window.location.href = "faculty-dashboard.html";
        return false;
    }

    if (role === "ADMIN") {
        window.location.href = "admin-dashboard.html";
        return false;
    }

    if (role !== "STUDENT") {
        localStorage.removeItem(AUTH_KEY);
        window.location.href = "login.html";
        return false;
    }

    const name =
        currentUser.name ||
        currentUser.fullName ||
        currentUser.username ||
        currentUser.email?.split("@")[0] ||
        "Student";

    const nameElement = getElement("studentName", "userName", "welcomeName");
    if (nameElement) nameElement.textContent = name;

    const avatarElement = getElement("sidebarAvatar", "studentAvatar", "userAvatar");
    if (avatarElement) avatarElement.textContent = name.charAt(0).toUpperCase();

    const welcomeTitle = document.getElementById("welcomeTitle");
    if (welcomeTitle) {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        welcomeTitle.textContent = `${greeting}, ${name.split(" ")[0]}.`;
    }

    return true;
}

function logout() {
    if (typeof logoutUser === "function") {
        logoutUser();
    } else {
        localStorage.removeItem(AUTH_KEY);
        window.location.href = "login.html";
    }
}

/* ---------- Messages ---------- */

function showMessage(message, type = "info") {
    const element = getElement("pageMessage", "messageBox");

    if (!element) {
        if (type === "error") {
            console.error(message);
        }
        return;
    }

    element.textContent = message;
    element.className = `page-message visible ${type}`;
}

function clearMessage() {
    const element = getElement("pageMessage", "messageBox");

    if (!element) return;

    element.textContent = "";
    element.className = "page-message";
}

/* ---------- API Requests ---------- */

async function fetchLectures() {
    if (isLoading) return;

    isLoading = true;
    clearMessage();

    renderLoadingState();

    try {
        const response = await fetch(`${API_URL}/lectures`, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `Could not load lectures. Server returned ${response.status}.`
            );
        }

        const result = await response.json();

        if (Array.isArray(result)) {
            allLectures = result;
        } else if (Array.isArray(result.content)) {
            allLectures = result.content;
        } else if (Array.isArray(result.data)) {
            allLectures = result.data;
        } else {
            allLectures = [];
        }

        allLectures = allLectures.filter(
            lecture => lecture && getLectureId(lecture)
        );

        populateSubjectFilter();
        updateStatistics();
        applyFilters();
        renderContinueWatching();
    } catch (error) {
        console.error("Lecture loading failed:", error);

        allLectures = [];
        filteredLectures = [];

        renderLectureCards();
        renderContinueWatching();

        showMessage(
            "Unable to load lectures. Make sure the ADHYAY backend is running on port 8081 and MongoDB is connected.",
            "error"
        );
    } finally {
        isLoading = false;
    }
}

/* ---------- Subject Filter ---------- */

function populateSubjectFilter() {
    const select = getElement("subjectFilter", "subjectSelect");

    if (!select) return;

    const previousValue = selectedSubject;
    const subjects = [
        ...new Set(
            allLectures
                .map(lecture => String(lecture.subject || "").trim())
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    select.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All Subjects";
    select.appendChild(allOption);

    subjects.forEach(subject => {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        select.appendChild(option);
    });

    if (
        previousValue === "all" ||
        subjects.includes(previousValue)
    ) {
        select.value = previousValue;
    } else {
        selectedSubject = "all";
        select.value = "all";
    }
}

/* ---------- Statistics ---------- */

function updateStatistics() {
    const subjectCount = new Set(
        allLectures
            .map(lecture => String(lecture.subject || "").trim())
            .filter(Boolean)
    ).size;

    const progress = getProgress();

    const startedCount = allLectures.filter(lecture => {
        const item = progress[getLectureId(lecture)];

        return item &&
            Number(item.currentTime) > 0 &&
            !item.completed;
    }).length;

    const savedCount = getBookmarks().length;

    setText(["totalLectures", "lectureCount"], allLectures.length);
    setText(["totalSubjects", "subjectCount"], subjectCount);
    setText(["startedLectures", "startedCount"], startedCount);
    setText(["savedLecturesCount", "bookmarkCount"], savedCount);
}

function setText(ids, value) {
    const element = getElement(...ids);

    if (element) {
        element.textContent = String(value);
    }
}

/* ---------- Search and Filtering ---------- */

function applyFilters() {
    const bookmarks = getBookmarks();
    const progressMap = getProgress();

    filteredLectures = allLectures.filter(lecture => {
        const id = getLectureId(lecture);
        const prog = progressMap[id] || {};

        const subject = String(lecture.subject || "").trim();
        const matchesSubject =
            selectedSubject === "all" ||
            subject.toLowerCase() === selectedSubject.toLowerCase();

        const searchableText = [
            lecture.title,
            lecture.description,
            lecture.subject,
            lecture.unit,
            lecture.lectureNumber,
            lecture.uploadedBy
        ]
            .map(value => String(value ?? ""))
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchableText.includes(
            searchText.trim().toLowerCase()
        );

        let matchesView = true;
        if (currentStudentView === "saved") {
            matchesView = bookmarks.includes(id);
        } else if (currentStudentView === "continue") {
            matchesView = Number(prog.currentTime) > 0 && !prog.completed;
        } else if (currentStudentView === "history") {
            matchesView = Number(prog.currentTime) > 0 || Boolean(prog.completed);
        }

        return matchesSubject && matchesSearch && matchesView;
    });

    renderLectureCards();
    updateResultCount();
}

function updateResultCount() {
    const element = getElement("resultCount", "lectureResultCount");

    if (element) {
        element.textContent =
            `${filteredLectures.length} lecture${filteredLectures.length === 1 ? "" : "s"}`;
    }
}

/* ---------- Loading State ---------- */

function renderLoadingState() {
    const grid = getElement("lectureGrid", "lecturesGrid");

    if (!grid) return;

    grid.innerHTML = `
        <div class="loading-card">
            Loading lectures...
        </div>
    `;
}

/* ---------- HTML Safety ---------- */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

/* ---------- Lecture Cards ---------- */

function renderLectureCards() {
    const grid = getElement("lectureGrid", "lecturesGrid");

    if (!grid) {
        console.error("Lecture grid element was not found in student-dashboard.html.");
        return;
    }

    grid.innerHTML = "";

    if (filteredLectures.length === 0) {
        let message = "No lectures match your search or filter.";
        if (currentStudentView === "saved") {
            message = "No saved lectures. Bookmark a lecture to save it here.";
        } else if (currentStudentView === "continue") {
            message = "No ongoing lectures. Click any lecture from Home to start watching!";
        } else if (currentStudentView === "history") {
            message = "No watch history recorded yet. Start watching lectures to track your progress.";
        }
        grid.innerHTML = `<p style="color:var(--muted);grid-column:1/-1;padding:8px 0;">${escapeHTML(message)}</p>`;
        return;
    }

    filteredLectures.forEach(lecture => {
        grid.appendChild(createLectureCard(lecture));
    });
}

const THUMB_COLORS = ["#2a5c4e", "#1a3d35", "#4a3220", "#3b4a30", "#1e3a5f", "#5c3a2a"];

function createLectureCard(lecture) {
    const card = document.createElement("article");
    card.className = "lecture-card";

    const id = getLectureId(lecture);
    const bookmarks = getBookmarks();
    const isSaved = bookmarks.includes(id);
    const progress = getLectureProgress(lecture);

    const title = lecture.title || "Untitled Lecture";
    const subject = lecture.subject || "General";
    const unit = lecture.unit ?? "";
    const lectureNumber = lecture.lectureNumber ?? "";
    const uploadedBy = lecture.uploadedBy || "Faculty";

    const percent = progress.duration > 0
        ? Math.min(100, Math.round((progress.currentTime / progress.duration) * 100))
        : 0;
    const hasProgress = Number(progress.currentTime) > 0 && !progress.completed;

    // Pick deterministic thumb colour
    const colorIndex = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % THUMB_COLORS.length;
    const thumbColor = THUMB_COLORS[colorIndex];

    card.innerHTML = `
        <div class="card-thumb thumb-colors" style="--c:${thumbColor}">
            <div class="card-thumb-play">▶</div>
        </div>
        <div class="card-body">
            <div class="card-chip-row">
                <span class="chip chip-green">${escapeHTML(subject)}</span>
                ${unit ? `<span class="chip chip-muted">Unit ${escapeHTML(String(unit))}</span>` : ""}
                ${lectureNumber ? `<span class="chip chip-muted">Lecture ${escapeHTML(String(lectureNumber))}</span>` : ""}
            </div>
            <div class="card-title">${escapeHTML(title)}</div>
            <div class="card-meta">${escapeHTML(uploadedBy)} · ${escapeHTML(formatDate(lecture.createdAt))}</div>
            ${
                hasProgress
                    ? `<div class="card-progress"><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div></div>`
                    : ""
            }
        </div>
    `;

    // click card to watch
    if (lecture.videoUrl) {
        card.style.cursor = "pointer";
        card.addEventListener("click", () => openVideo(id));
    }
    return card;
}

function formatDate(value) {
    if (!value) return "Recently added";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Recently added";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

/* ---------- Continue Watching ---------- */

async function renderContinueWatching() {
    const section = getElement("continueSection", "continueWatchingSection");
    const grid = getElement("continueGrid", "continueWatchingGrid");

    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/progress/continue-watching`);
        if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list) && list.length > 0) {
                const progressMap = getProgress();
                list.forEach(p => {
                    progressMap[p.lectureId] = {
                        currentTime: p.positionSeconds,
                        duration: p.durationSeconds,
                        completed: p.completed
                    };
                });
                writeJSON(PROGRESS_KEY, progressMap);

                const continueLects = list.map(p => allLectures.find(l => getLectureId(l) === p.lectureId)).filter(Boolean);
                if (continueLects.length > 0) {
                    if (section) section.hidden = false;
                    grid.innerHTML = "";
                    continueLects.slice(0, 3).forEach(lecture => {
                        grid.appendChild(createLectureCard(lecture));
                    });
                    return;
                }
            }
        }
    } catch (e) {
        console.warn("Backend continue watching sync error:", e);
    }

    const progress = getProgress();

    const continueLectures = allLectures.filter(lecture => {
        const item = progress[getLectureId(lecture)];

        return item &&
            Number(item.currentTime) > 0 &&
            !item.completed;
    });

    continueLectures.sort((a, b) => {
        const progressA = progress[getLectureId(a)];
        const progressB = progress[getLectureId(b)];

        return Number(progressB.currentTime) -
            Number(progressA.currentTime);
    });

    grid.innerHTML = "";

    if (continueLectures.length === 0) {
        if (section) section.hidden = true;
        return;
    }

    if (section) section.hidden = false;

    continueLectures.slice(0, 3).forEach(lecture => {
        grid.appendChild(createLectureCard(lecture));
    });
}

/* ---------- Subject Progress (Phase 3) ---------- */

async function loadSubjectProgressStats() {
    const grid = document.getElementById("subjectProgressGrid");
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/progress/subject-stats`);
        if (!res.ok) return;
        const stats = await res.json();
        const entries = Object.entries(stats);

        if (entries.length === 0) {
            grid.innerHTML = `<p style="color:var(--muted);font-size:13.5px;grid-column:1/-1;">No enrolled subject progress recorded yet. Watch 90% of a lecture to mark it complete!</p>`;
            return;
        }

        grid.innerHTML = entries.map(([subject, data]) => {
            const percent = Math.min(100, Math.round(data.progressPercent || 0));
            const completed = data.completedLectures || 0;
            const total = data.totalLectures || 0;
            return `
                <div style="background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-weight:700;font-size:14.5px;color:#0F172A;">${escapeHTML(subject)}</span>
                        <span style="font-weight:700;font-size:13px;color:#0D3E36;">${percent}%</span>
                    </div>
                    <div style="background:#E2E8F0;height:7px;border-radius:99px;overflow:hidden;margin-bottom:8px;">
                        <div style="background:#15803D;width:${percent}%;height:100%;border-radius:99px;transition:width 0.3s ease;"></div>
                    </div>
                    <div style="font-size:12px;color:#64748B;">
                        ${completed} of ${total} lectures completed (≥90% watched)
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        console.warn("Could not load subject progress stats:", err);
    }
}

/* ---------- Bookmarks ---------- */

function toggleBookmark(id) {
    const bookmarks = getBookmarks();
    const index = bookmarks.indexOf(id);

    if (index >= 0) {
        bookmarks.splice(index, 1);
        showMessage("Lecture removed from saved lectures.", "success");
    } else {
        bookmarks.push(id);
        showMessage("Lecture saved successfully.", "success");
    }

    writeJSON(BOOKMARKS_KEY, bookmarks);

    updateStatistics();
    applyFilters();
    renderContinueWatching();
}

function toggleSavedLectures() {
    showSavedOnly = !showSavedOnly;

    const subjectsSection = document.getElementById("subjectsSection");
    const bookmarksSection = document.getElementById("bookmarksSection");

    if (subjectsSection) subjectsSection.hidden = showSavedOnly;
    if (bookmarksSection) bookmarksSection.hidden = !showSavedOnly;

    // When showing saved, render bookmarked cards into bookmarksGrid
    if (showSavedOnly) {
        const bGrid = document.getElementById("bookmarksGrid");
        if (bGrid) {
            bGrid.innerHTML = "";
            const bookmarks = getBookmarks();
            const saved = allLectures.filter(l => bookmarks.includes(getLectureId(l)));
            if (saved.length === 0) {
                bGrid.innerHTML = `<p style="color:var(--muted);grid-column:1/-1;">No saved lectures yet. Bookmark a lecture to see it here.</p>`;
            } else {
                saved.forEach(l => bGrid.appendChild(createLectureCard(l)));
            }
        }
    }
}

/* ---------- Lecture Details ---------- */

function showLectureDetails(id) {
    const lecture = allLectures.find(
        item => getLectureId(item) === String(id)
    );

    if (!lecture) return;

    const details = [
        `Title: ${lecture.title || "Untitled Lecture"}`,
        `Subject: ${lecture.subject || "General"}`,
        `Unit: ${lecture.unit ?? "—"}`,
        `Lecture Number: ${lecture.lectureNumber ?? "—"}`,
        `Faculty: ${lecture.uploadedBy || "Not specified"}`,
        `Description: ${lecture.description || "No description available."}`
    ];

    alert(details.join("\n\n"));
}

/* ---------- Video Player ---------- */

/* ---------- Video Player (YouTube-Style Watch Theater) ---------- */

function openVideo(id) {
    const lecture = allLectures.find(
        item => getLectureId(item) === String(id)
    );

    if (!lecture) {
        showMessage("Lecture could not be found.", "error");
        return;
    }

    if (!lecture.videoUrl) {
        showMessage("This lecture does not have a video URL.", "error");
        return;
    }

    const modal = document.getElementById("videoModal");
    const player = document.getElementById("lecturePlayer");

    if (!modal || !player) {
        showMessage("The video player elements are missing.", "error");
        return;
    }

    currentLecture = lecture;
    const lectureId = getLectureId(lecture);

    // Record view analytics on backend
    if (lectureId) {
        fetch(`${API_URL}/lectures/${lectureId}/view`, { method: "POST" }).catch(() => {});
    }

    // Title elements
    const titleElement = document.getElementById("playerTitle");
    const quickTitle = document.getElementById("playerQuickTitle");
    if (titleElement) titleElement.textContent = lecture.title || "Lecture";
    if (quickTitle) quickTitle.textContent = lecture.title || "Lecture";

    // Tags & Badges
    const subjectBadge = document.getElementById("playerSubjectBadge");
    const subjectTag = document.getElementById("playerSubjectTag");
    const unitTag = document.getElementById("playerUnitTag");
    const numberTag = document.getElementById("playerNumberTag");

    const subjectName = lecture.subject || "General";
    if (subjectBadge) subjectBadge.textContent = subjectName;
    if (subjectTag) subjectTag.textContent = subjectName;
    if (unitTag) unitTag.textContent = lecture.unit !== undefined && lecture.unit !== null ? `Unit ${lecture.unit}` : "Unit —";
    if (numberTag) numberTag.textContent = lecture.lectureNumber !== undefined && lecture.lectureNumber !== null ? `Lecture ${lecture.lectureNumber}` : "Lecture";

    // Faculty info
    const facultyName = document.getElementById("playerFacultyName");
    const facultyAvatar = document.getElementById("facultyAvatar");
    const instructor = lecture.uploadedBy || "Faculty Instructor";
    if (facultyName) facultyName.textContent = instructor;
    if (facultyAvatar) facultyAvatar.textContent = instructor.charAt(0).toUpperCase();

    // Current user comment avatar
    const commentUserAvatar = document.getElementById("commentUserAvatar");
    if (commentUserAvatar) {
        const studentInitial = (currentUser && (currentUser.name || currentUser.username) ? (currentUser.name || currentUser.username).charAt(0).toUpperCase() : "S");
        commentUserAvatar.textContent = studentInitial;
    }

    // Date & Description
    const uploadDate = document.getElementById("watchUploadDate");
    const description = document.getElementById("playerDescription");
    if (uploadDate) uploadDate.textContent = `Uploaded ${formatDate(lecture.createdAt)}`;
    if (description) {
        description.textContent = lecture.description && lecture.description.trim()
            ? lecture.description
            : "No extra lecture notes provided by the instructor.";
    }

    // Update buttons UI
    updateLikeButtonUI(lectureId);
    updateWatchBookmarkUI(lectureId);

    // Render Comments & Playlist
    renderComments(lectureId);
    renderWatchPlaylist();

    // Clear comment input
    const commentInput = document.getElementById("commentInput");
    const submitBtn = document.getElementById("submitCommentBtn");
    if (commentInput) commentInput.value = "";
    if (submitBtn) submitBtn.disabled = true;

    // Load and play video
    player.pause();
    player.src = lecture.videoUrl;
    player.load();

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    // Restore saved progress
    const savedProgress = getLectureProgress(lecture);
    const restorePosition = () => {
        if (
            savedProgress.currentTime > 0 &&
            player.duration > 0 &&
            savedProgress.currentTime < player.duration - 2
        ) {
            player.currentTime = savedProgress.currentTime;
            showResumeToast(savedProgress.currentTime);
        }
        player.removeEventListener("loadedmetadata", restorePosition);
    };

    player.addEventListener("loadedmetadata", restorePosition);

    // Fetch backend synced progress and auto-resume
    (async () => {
        try {
            const progRes = await fetch(`${API_URL}/progress/${encodeURIComponent(lectureId)}`);
            if (progRes.ok) {
                const bp = await progRes.json();
                if (bp && bp.positionSeconds > 3 && !bp.completed) {
                    savedProgress.currentTime = bp.positionSeconds;
                    if (player.duration > 0 && bp.positionSeconds < player.duration - 2) {
                        player.currentTime = bp.positionSeconds;
                        showResumeToast(bp.positionSeconds);
                    }
                }
            }
        } catch (e) {
            console.warn("Backend progress check:", e);
        }
    })();

    player.play().catch(error => {
        console.warn("Autoplay was prevented by browser:", error);
    });
}

function showResumeToast(seconds) {
    const toast = document.getElementById("resumeToast");
    const msg = document.getElementById("resumeToastMsg");
    if (!toast || !msg) return;
    msg.textContent = `Auto-resumed from ${formatAiTimestamp(seconds)}`;
    toast.style.display = "flex";
    setTimeout(() => {
        toast.style.display = "none";
    }, 4500);
}

function closeVideo() {
    const modal = document.getElementById("videoModal");
    const player = document.getElementById("lecturePlayer");

    if (player) {
        savePlaybackProgress();
        player.pause();
        player.removeAttribute("src");
        player.load();
    }

    if (modal) {
        modal.hidden = true;
    }

    document.body.style.overflow = "";
    currentLecture = null;

    updateStatistics();
    renderContinueWatching();
    loadSubjectProgressStats();
    applyFilters();
}

function formatTextWithTimestamps(rawText) {
    if (!rawText) return "";
    const safe = escapeHTML(rawText);
    // Matches patterns like [02:30], [⏱ 02:30], ⏱ 02:30, 02:30, 1:23:45
    return safe.replace(/(?:\[?\s*⏱?\s*)?(\b\d{1,2}:\d{2}(?::\d{2})?\b)(?:\s*\])?/g, (match, ts) => {
        return `<button type="button" class="timestamp-chip" onclick="seekLectureTimestamp('${ts}')" title="Jump to ${ts}">⏱ ${ts}</button>`;
    });
}

window.tagCurrentVideoTimestamp = function() {
    const player = document.getElementById("lecturePlayer");
    const input = document.getElementById("commentInput");
    if (!player || !input) return;
    const ts = formatAiTimestamp(player.currentTime || 0);
    const tag = `[⏱ ${ts}] `;
    if (!input.value.includes(tag)) {
        input.value = tag + input.value;
    }
    input.focus();
    const submitBtn = document.getElementById("submitCommentBtn");
    if (submitBtn) submitBtn.disabled = false;
};

let lastBackendProgressSync = 0;
function syncProgressToBackend(lectureId, cur, dur) {
    const now = Date.now();
    if (now - lastBackendProgressSync < 10000) return;
    lastBackendProgressSync = now;

    fetch(`${API_URL}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            lectureId: lectureId,
            positionSeconds: cur,
            durationSeconds: dur
        })
    }).catch(err => console.warn("Background progress sync error:", err));
}

function savePlaybackProgress() {
    const player = document.getElementById("lecturePlayer");
    if (!currentLecture || !player) return;

    // Dynamically update UI controls
    const cur = player.currentTime || 0;
    const dur = Number.isFinite(player.duration) ? player.duration : 0;
    const timeDisplay = document.getElementById("videoTimeDisplay");
    if (timeDisplay) {
        timeDisplay.textContent = `${formatAiTimestamp(cur)} / ${formatAiTimestamp(dur)}`;
    }
    const timelineFill = document.getElementById("timelineFill");
    if (timelineFill && dur > 0) {
        timelineFill.style.width = `${Math.min(100, (cur / dur) * 100)}%`;
    }
    const currentTimeTagDisplay = document.getElementById("currentTimeTagDisplay");
    if (currentTimeTagDisplay) {
        currentTimeTagDisplay.textContent = formatAiTimestamp(cur);
    }

    const id = getLectureId(currentLecture);
    if (!id || !Number.isFinite(cur)) return;

    const progress = getProgress();
    // 90% watched marks lecture as completed
    const completed = dur > 0 && cur >= 0.90 * dur;

    progress[id] = {
        currentTime: completed ? 0 : cur,
        duration: dur,
        completed
    };

    writeJSON(PROGRESS_KEY, progress);

    // Sync progress to backend every 10 seconds
    syncProgressToBackend(id, cur, dur);
}

/* ---------- Theater Mode & Fullscreen ---------- */

function toggleTheaterMode() {
    const modal = document.getElementById("videoModal");
    const btnText = document.getElementById("theaterBtnText");
    if (!modal) return;

    modal.classList.toggle("theater-expanded");
    const isExpanded = modal.classList.contains("theater-expanded");
    if (btnText) {
        btnText.textContent = isExpanded ? "Default View" : "Theater Mode";
    }
}

function toggleFullScreen() {
    const player = document.getElementById("lecturePlayer");
    if (!player) return;

    if (!document.fullscreenElement) {
        if (player.requestFullscreen) {
            player.requestFullscreen();
        } else if (player.webkitRequestFullscreen) {
            player.webkitRequestFullscreen();
        } else if (player.msRequestFullscreen) {
            player.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/* ---------- Watch View Likes & Bookmarks ---------- */

function getLectureLikes() {
    return readJSON(LIKES_KEY, {});
}

function toggleLectureLike(id) {
    const likes = getLectureLikes();
    const isLiked = !likes[id];
    likes[id] = isLiked;
    writeJSON(LIKES_KEY, likes);
    updateLikeButtonUI(id);
}

function updateLikeButtonUI(id) {
    const btn = document.getElementById("likeLectureBtn");
    const countSpan = document.getElementById("likeLectureCount");
    const textSpan = document.getElementById("likeLectureText");
    const likes = getLectureLikes();
    const isLiked = Boolean(likes[id]);

    if (btn) btn.classList.toggle("active", isLiked);
    if (textSpan) textSpan.textContent = isLiked ? "Helpful" : "Helpful";
    if (countSpan) {
        const base = 12;
        countSpan.textContent = isLiked ? (base + 1) : base;
    }
}

function updateWatchBookmarkUI(id) {
    const bookmarks = getBookmarks();
    const isSaved = bookmarks.includes(id);
    const icon = document.getElementById("bookmarkIcon");
    const text = document.getElementById("bookmarkBtnText");
    const btn = document.getElementById("bookmarkCurrentBtn");

    if (btn) btn.classList.toggle("active", isSaved);
    if (icon) icon.textContent = isSaved ? "♥" : "♡";
    if (text) text.textContent = isSaved ? "Saved" : "Save";
}

/* ---------- Comment System (Discussions & Doubts) ---------- */

function getLectureComments(lectureId) {
    const store = readJSON(COMMENTS_KEY, {});
    if (!store[lectureId]) {
        store[lectureId] = [];
    }
    return store[lectureId];
}

function timeAgo(dateOrTimestamp) {
    const timestamp = typeof dateOrTimestamp === "number" ? dateOrTimestamp : new Date(dateOrTimestamp).getTime();
    if (isNaN(timestamp)) return "recently";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

async function renderComments(lectureId) {
    const list = document.getElementById("commentsList");
    const countBadge = document.getElementById("doubtsCountBadge") || document.getElementById("commentsCountBadge");
    if (!list) return;

    if (!lectureId) {
        list.innerHTML = `<p style="color:var(--muted);font-size:13px;padding:8px 0;">No lecture selected.</p>`;
        return;
    }

    try {
        const res = await fetch(`${API_URL}/lectures/${encodeURIComponent(lectureId)}/doubts`);
        if (!res.ok) throw new Error("Failed to load doubts");
        const doubts = await res.json();

        if (countBadge) countBadge.textContent = doubts.length;

        if (!Array.isArray(doubts) || doubts.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:32px 20px;background:#fff;border:1px dashed #CBD5E1;border-radius:12px;color:#64748B;">
                    <div style="font-size:32px;margin-bottom:8px;">💡</div>
                    <strong style="color:#0F172A;font-size:15px;display:block;margin-bottom:4px;">No doubts asked yet</strong>
                    <span style="font-size:13px;">Have a question about what the professor covered? Ask above and get an official reply!</span>
                </div>
            `;
            return;
        }

        const currentUserId = (currentUser && (currentUser.id || currentUser._id)) || "";
        const currentUserEmail = (currentUser && currentUser.email) || "";

        list.innerHTML = doubts.map(doubt => {
            const authorInitial = (doubt.studentName || "S").charAt(0).toUpperCase();
            const isOwn = (currentUserId && doubt.studentId === currentUserId) ||
                          (currentUserEmail && doubt.studentEmail === currentUserEmail);
            const isAnswered = Boolean(doubt.facultyReply) || doubt.status === "RESOLVED" || doubt.status === "ANSWERED";

            let facultyReplyHtml = "";
            if (doubt.facultyReply) {
                facultyReplyHtml = `
                    <div class="faculty-reply-box">
                        <div class="faculty-reply-header">
                            <div class="faculty-badge-row">
                                <span class="faculty-verified-tag">🎓 Faculty Reply</span>
                                <span class="faculty-replier-name">${escapeHTML(doubt.repliedBy || "Course Faculty")}</span>
                            </div>
                            <span class="faculty-reply-time">${escapeHTML(timeAgo(doubt.repliedAt))}</span>
                        </div>
                        <p class="faculty-reply-text">${formatTextWithTimestamps(doubt.facultyReply)}</p>
                    </div>
                `;
            }

            return `
                <div class="doubt-item-card" data-doubt-id="${escapeHTML(doubt.id)}">
                    <div class="doubt-card-header">
                        <div class="doubt-author-group">
                            <div class="doubt-author-avatar">${escapeHTML(authorInitial)}</div>
                            <div class="doubt-author-meta">
                                <span class="doubt-author-name">${escapeHTML(doubt.studentName || "Student")}</span>
                                <span class="doubt-time-ago">${escapeHTML(timeAgo(doubt.createdAt))}</span>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span class="doubt-status-pill ${isAnswered ? 'answered' : 'open'}">
                                ${isAnswered ? '✓ Answered' : '⏳ Awaiting Reply'}
                            </span>
                            ${isOwn ? `
                                <button type="button" class="doubt-delete-btn" title="Delete your doubt" onclick="deleteDoubt('${doubt.id}', '${lectureId}')">
                                    🗑 Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <p class="doubt-question-body">${formatTextWithTimestamps(doubt.question)}</p>
                    ${facultyReplyHtml}
                </div>
            `;
        }).join("");

    } catch (err) {
        console.warn("Could not load doubts:", err);
        list.innerHTML = `<p style="color:#B91C1C;font-size:13px;padding:12px;">Could not load doubts from server.</p>`;
    }
}

window.handlePostDoubt = async function() {
    if (!currentLecture) return;
    const lectureId = getLectureId(currentLecture);
    const input = document.getElementById("commentInput");
    const submitBtn = document.getElementById("submitCommentBtn");
    const text = (input?.value || "").trim();

    if (!text) {
        alert("Please enter your question before posting.");
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Posting...";
    }

    try {
        const user = currentUser || readJSON(AUTH_KEY, {});
        const studentName = user.name || user.username || "Student";
        const studentEmail = user.email || "student@walchandsangli.ac.in";
        const studentId = user.id || user._id || "";

        const res = await fetch(`${API_URL}/lectures/${encodeURIComponent(lectureId)}/doubts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-User-Name": studentName,
                "X-User-Email": studentEmail,
                "X-User-Id": studentId
            },
            body: JSON.stringify({
                question: text,
                studentId: studentId,
                studentName: studentName,
                studentEmail: studentEmail
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            alert(errData.message || "Failed to post doubt.");
            return;
        }

        if (input) input.value = "";
        await renderComments(lectureId);

    } catch (err) {
        console.error("Error posting doubt:", err);
        alert("Network error connecting to backend server.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "<span>❓ Ask Faculty</span>";
        }
    }
};

window.deleteDoubt = async function(doubtId, lectureId) {
    if (!confirm("Are you sure you want to delete this doubt?")) return;
    try {
        const res = await fetch(`${API_URL}/doubts/${encodeURIComponent(doubtId)}`, {
            method: "DELETE"
        });
        if (res.ok) {
            await renderComments(lectureId);
        } else {
            alert("Could not delete doubt.");
        }
    } catch (err) {
        console.error("Delete doubt error:", err);
    }
};

function addComment(lectureId, text) {
    handlePostDoubt();
}

/* ---------- Course Playlist (YouTube-Style Sidebar) ---------- */

function renderWatchPlaylist() {
    const playlistContainer = document.getElementById("watchPlaylist");
    const subjectTitle = document.getElementById("playlistSubjectTitle");
    const countSpan = document.getElementById("playlistCount");
    if (!playlistContainer || !currentLecture) return;

    const currentId = getLectureId(currentLecture);

    // Filter playlist by subject if possible, or all
    let playlist = allLectures.filter(lec => (lec.subject || "") === (currentLecture.subject || ""));
    if (playlist.length <= 1) {
        playlist = allLectures;
    }

    if (subjectTitle) {
        subjectTitle.textContent = currentLecture.subject ? `${currentLecture.subject}` : "All Lectures";
    }
    if (countSpan) {
        countSpan.textContent = `${playlist.length} lectures`;
    }

    playlistContainer.innerHTML = playlist.map((lecture, index) => {
        const id = getLectureId(lecture);
        const isActive = id === currentId;
        const lecNum = lecture.lectureNumber ?? (index + 1);
        const faculty = lecture.uploadedBy || "Faculty";
        return `
            <div
                class="playlist-card ${isActive ? 'active' : ''}"
                data-playlist-id="${escapeHTML(id)}"
            >
                <div class="playlist-thumbnail">
                    <span class="playlist-thumb-icon">▶</span>
                    <span class="playlist-lec-badge">L${escapeHTML(lecNum)}</span>
                </div>
                <div class="playlist-card-content">
                    <p class="playlist-card-title">${escapeHTML(lecture.title || "Untitled Lecture")}</p>
                    <span class="playlist-card-faculty">👨‍🏫 ${escapeHTML(faculty)}</span>
                    ${isActive ? `
                        <span class="playlist-card-status">
                            <span class="now-playing-pulse"></span> Now Playing
                        </span>
                    ` : ""}
                </div>
            </div>
        `;
    }).join("");
}

/* ---------- Event Listeners ---------- */

function setupEventListeners() {
    const searchInput = getElement("searchInput", "lectureSearch");

    if (searchInput) {
        searchInput.addEventListener("input", event => {
            searchText = event.target.value;
            applyFilters();
        });
    }

    const subjectFilter = getElement("subjectFilter", "subjectSelect");

    if (subjectFilter) {
        subjectFilter.addEventListener("change", event => {
            selectedSubject = event.target.value;
            applyFilters();
        });
    }

    const savedButton = getElement("savedLecturesBtn", "showSavedBtn", "showBookmarksBtn");

    if (savedButton) {
        savedButton.addEventListener("click", toggleSavedLectures);
    }

    const logoutButton = getElement("logoutBtn", "logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    // Sidebar Navigation Tabs (Home, Continue watching, Saved lectures, Watch history, Materials, Announcements)
    const navButtons = {
        home: document.getElementById("navHome"),
        continue: document.getElementById("navContinue"),
        saved: document.getElementById("navSaved"),
        history: document.getElementById("navHistory"),
        materials: document.getElementById("navMaterials"),
        announcements: document.getElementById("navAnnouncements")
    };

    function switchStudentTab(viewKey) {
        currentStudentView = viewKey;

        Object.entries(navButtons).forEach(([key, btn]) => {
            if (btn) btn.classList.toggle("active", key === viewKey);
        });

        const titleEl = document.getElementById("lecturesSectionTitle");
        const welcomeTitle = document.getElementById("welcomeTitle");
        const continueSec = document.getElementById("continueSection");
        const subjProgSec = document.getElementById("subjectProgressSection");
        const subjectsSec = document.getElementById("subjectsSection");
        const materialsSec = document.getElementById("materialsSection");
        const announcementsSec = document.getElementById("announcementsSection");
        const bookmarksSec = document.getElementById("bookmarksSection");
        const historySec = document.getElementById("historySection");

        if (materialsSec) materialsSec.hidden = (viewKey !== "materials");
        if (announcementsSec) announcementsSec.hidden = (viewKey !== "announcements");
        if (bookmarksSec) bookmarksSec.hidden = true;
        if (historySec) historySec.hidden = true;

        if (viewKey === "home") {
            if (subjProgSec) subjProgSec.hidden = false;
            if (subjectsSec) subjectsSec.hidden = false;
            if (titleEl) titleEl.textContent = "All lectures";
            if (welcomeTitle) welcomeTitle.textContent = "Good to see you.";
            renderContinueWatching();
            loadSubjectProgressStats();
            applyFilters();
        } else if (viewKey === "continue") {
            if (continueSec) continueSec.hidden = true;
            if (subjProgSec) subjProgSec.hidden = true;
            if (subjectsSec) subjectsSec.hidden = false;
            if (titleEl) titleEl.textContent = "Continue watching";
            if (welcomeTitle) welcomeTitle.textContent = "Continue your progress";
            applyFilters();
        } else if (viewKey === "saved") {
            if (continueSec) continueSec.hidden = true;
            if (subjProgSec) subjProgSec.hidden = true;
            if (subjectsSec) subjectsSec.hidden = false;
            if (titleEl) titleEl.textContent = "Saved lectures";
            if (welcomeTitle) welcomeTitle.textContent = "Your saved lectures";
            applyFilters();
        } else if (viewKey === "history") {
            if (continueSec) continueSec.hidden = true;
            if (subjProgSec) subjProgSec.hidden = true;
            if (subjectsSec) subjectsSec.hidden = false;
            if (titleEl) titleEl.textContent = "Watch history";
            if (welcomeTitle) welcomeTitle.textContent = "Your watch history";
            applyFilters();
        } else if (viewKey === "materials") {
            if (continueSec) continueSec.hidden = true;
            if (subjProgSec) subjProgSec.hidden = true;
            if (subjectsSec) subjectsSec.hidden = true;
            loadStudentMaterials();
        } else if (viewKey === "announcements") {
            if (continueSec) continueSec.hidden = true;
            if (subjProgSec) subjProgSec.hidden = true;
            if (subjectsSec) subjectsSec.hidden = true;
            loadStudentAnnouncements();
        }
    }

    if (navButtons.home) navButtons.home.addEventListener("click", () => switchStudentTab("home"));
    if (navButtons.continue) navButtons.continue.addEventListener("click", () => switchStudentTab("continue"));
    if (navButtons.saved) navButtons.saved.addEventListener("click", () => switchStudentTab("saved"));
    if (navButtons.history) navButtons.history.addEventListener("click", () => switchStudentTab("history"));
    if (navButtons.materials) navButtons.materials.addEventListener("click", () => switchStudentTab("materials"));
    if (navButtons.announcements) navButtons.announcements.addEventListener("click", () => switchStudentTab("announcements"));

    const backToAllBtn = document.getElementById("backToAllBtn");
    if (backToAllBtn) backToAllBtn.addEventListener("click", () => switchStudentTab("home"));
    const backToAllFromHist = document.getElementById("backToAllFromHistoryBtn");
    if (backToAllFromHist) backToAllFromHist.addEventListener("click", () => switchStudentTab("home"));
    const backFromMat = document.getElementById("backToAllFromMaterialsBtn");
    if (backFromMat) backFromMat.addEventListener("click", () => switchStudentTab("home"));
    const backFromAnn = document.getElementById("backToAllFromAnnouncementsBtn");
    if (backFromAnn) backFromAnn.addEventListener("click", () => switchStudentTab("home"));

    // Main document click delegation
    document.addEventListener("click", event => {
        // Lecture card action buttons
        const actionButton = event.target.closest("[data-action]");
        if (actionButton) {
            const action = actionButton.dataset.action;
            const id = actionButton.dataset.id;

            if (action === "bookmark") {
                toggleBookmark(id);
            } else if (action === "watch") {
                openVideo(id);
            } else if (action === "details") {
                showLectureDetails(id);
            }
            return;
        }

        // Playlist card click in watch view
        const playlistCard = event.target.closest("[data-playlist-id]");
        if (playlistCard) {
            const id = playlistCard.dataset.playlistId;
            if (id && (!currentLecture || getLectureId(currentLecture) !== id)) {
                openVideo(id);
            }
            return;
        }

        // Comment like/delete buttons
        const commentBtn = event.target.closest("[data-comment-action]");
        if (commentBtn && currentLecture) {
            const lectureId = getLectureId(currentLecture);
            const commentAction = commentBtn.dataset.commentAction;
            const commentId = commentBtn.dataset.commentId;

            if (commentAction === "like") {
                toggleCommentLike(lectureId, commentId);
            } else if (commentAction === "delete") {
                if (confirm("Are you sure you want to delete this comment?")) {
                    deleteComment(lectureId, commentId);
                }
            }
            return;
        }

        // Back to all lectures button
        if (event.target.closest("#backToAllBtn")) {
            showSavedOnly = false;
            const savedButton = getElement("savedLecturesBtn", "showSavedBtn", "showBookmarksBtn");
            if (savedButton) {
                savedButton.setAttribute("aria-pressed", "false");
                savedButton.textContent = "Saved Lectures";
            }
            const savedSection = getElement("savedSection", "savedLecturesSection", "bookmarksSection");
            if (savedSection) savedSection.hidden = true;
            applyFilters();
        }
    });

    // Watch view specific buttons
    const closeBackBtn = document.getElementById("closePlayerBtn");
    const closeIconBtn = document.getElementById("closePlayerIconBtn");
    if (closeBackBtn) closeBackBtn.addEventListener("click", closeVideo);
    if (closeIconBtn) closeIconBtn.addEventListener("click", closeVideo);

    const theaterBtn = document.getElementById("theaterToggleBtn");
    if (theaterBtn) theaterBtn.addEventListener("click", toggleTheaterMode);

    const fullscreenBtn = document.getElementById("playerFullscreenBtn");
    if (fullscreenBtn) fullscreenBtn.addEventListener("click", toggleFullScreen);

    const likeLectureBtn = document.getElementById("likeLectureBtn");
    if (likeLectureBtn) {
        likeLectureBtn.addEventListener("click", () => {
            if (currentLecture) toggleLectureLike(getLectureId(currentLecture));
        });
    }

    const bookmarkCurrentBtn = document.getElementById("bookmarkCurrentBtn");
    if (bookmarkCurrentBtn) {
        bookmarkCurrentBtn.addEventListener("click", () => {
            if (currentLecture) {
                const id = getLectureId(currentLecture);
                toggleBookmark(id);
                updateWatchBookmarkUI(id);
            }
        });
    }

    const shareBtn = document.getElementById("shareLectureBtn");
    if (shareBtn) {
        shareBtn.addEventListener("click", () => {
            if (navigator.clipboard && window.location.href) {
                navigator.clipboard.writeText(window.location.href);
                alert("Lecture link copied to clipboard!");
            } else {
                alert("Share link: " + window.location.href);
            }
        });
    }

    // Comment form inputs
    const commentInput = document.getElementById("commentInput");
    const submitCommentBtn = document.getElementById("submitCommentBtn");
    const cancelCommentBtn = document.getElementById("cancelCommentBtn");

    if (commentInput && submitCommentBtn) {
        commentInput.addEventListener("input", () => {
            submitCommentBtn.disabled = !commentInput.value.trim();
        });

        submitCommentBtn.addEventListener("click", () => {
            if (!currentLecture || !commentInput.value.trim()) return;
            addComment(getLectureId(currentLecture), commentInput.value);
            commentInput.value = "";
            submitCommentBtn.disabled = true;
        });
    }

    if (cancelCommentBtn && commentInput) {
        cancelCommentBtn.addEventListener("click", () => {
            commentInput.value = "";
            if (submitCommentBtn) submitCommentBtn.disabled = true;
        });
    }

    // Video Player events
    const player = document.getElementById("lecturePlayer");
    const centerPlayBtn = document.getElementById("centerPlayBtn");
    if (player) {
        player.addEventListener("timeupdate", savePlaybackProgress);
        player.addEventListener("pause", () => {
            savePlaybackProgress();
            if (centerPlayBtn) centerPlayBtn.style.opacity = "1";
        });
        player.addEventListener("play", () => {
            if (centerPlayBtn) centerPlayBtn.style.opacity = "0";
        });

        const timeline = document.querySelector(".video-timeline");
        if (timeline) {
            timeline.addEventListener("click", e => {
                if (!Number.isFinite(player.duration) || player.duration <= 0) return;
                const rect = timeline.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                player.currentTime = pos * player.duration;
                savePlaybackProgress();
            });
        }

        player.addEventListener("ended", () => {
            if (!currentLecture) return;
            const progress = getProgress();
            const id = getLectureId(currentLecture);
            progress[id] = {
                currentTime: 0,
                duration: Number.isFinite(player.duration) ? player.duration : 0,
                completed: true
            };
            writeJSON(PROGRESS_KEY, progress);
            updateStatistics();
            renderContinueWatching();
            renderWatchPlaylist();
        });
    }


    // Keyboard shortcuts: F (fullscreen), T (theater), Space (play/pause), Esc (close)
    document.addEventListener("keydown", event => {
        if (!currentLecture) return;

        const isInput = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);

        if (event.key === "Escape") {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                closeVideo();
            }
        } else if (!isInput) {
            if (event.key.toLowerCase() === "f") {
                event.preventDefault();
                toggleFullScreen();
            } else if (event.key.toLowerCase() === "t") {
                event.preventDefault();
                toggleTheaterMode();
            } else if (event.key === " " && player) {
                event.preventDefault();
                if (player.paused) player.play();
                else player.pause();
            }
        }
    });

    window.addEventListener("beforeunload", savePlaybackProgress);
}

/* ---------- Student Materials & Assignments (Phase 3) ---------- */

async function loadStudentMaterials() {
    const grid = document.getElementById("studentMaterialsGrid");
    if (!grid) return;
    grid.innerHTML = `<p style="color:var(--muted);grid-column:1/-1;padding:24px 0;">Loading course materials & assignments...</p>`;

    try {
        const res = await fetch(`${API_URL}/materials`);
        if (!res.ok) throw new Error("Could not load materials");
        const list = await res.json();

        if (!Array.isArray(list) || list.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:40px 20px;background:#fff;border:1px dashed #CBD5E1;border-radius:12px;color:#64748B;">
                    <div style="font-size:36px;margin-bottom:8px;">📁</div>
                    <strong style="color:#0F172A;font-size:16px;display:block;margin-bottom:4px;">No materials or assignments uploaded yet</strong>
                    <span>Check back when your faculty uploads lecture notes, slides, or assignments.</span>
                </div>
            `;
            return;
        }

        grid.innerHTML = list.map(item => {
            const isAssn = Boolean(item.isAssignment);
            const badgeBg = isAssn ? "#FEF3C7" : "#E0F2FE";
            const badgeColor = isAssn ? "#92400E" : "#0369A1";
            const badgeText = isAssn ? "📝 Assignment" : "📚 Lecture Notes";

            let deadlineHtml = "";
            if (isAssn && item.deadline) {
                const dueTime = new Date(item.deadline).getTime();
                const now = Date.now();
                const diffHours = (dueTime - now) / (1000 * 60 * 60);
                const isUrgent = diffHours > 0 && diffHours <= 24;
                const isPast = diffHours <= 0;

                const statusColor = isPast ? "#DC2626" : (isUrgent ? "#D97706" : "#15803D");
                const statusText = isPast ? "⚠️ Past Deadline" : (isUrgent ? `⏰ Due Soon (${Math.round(diffHours)}h left)` : `Due: ${new Date(item.deadline).toLocaleString()}`);

                deadlineHtml = `
                    <div style="margin-top:10px;padding:8px 12px;background:#F8FAFC;border:1px solid #E2E8F0;border-left:3px solid ${statusColor};border-radius:6px;font-size:12.5px;font-weight:600;color:${statusColor};">
                        ${statusText}
                    </div>
                `;
            }

            return `
                <div style="background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:20px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                            <span style="font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:99px;background:${badgeBg};color:${badgeColor};">${badgeText}</span>
                            <span style="font-size:12px;color:#64748B;">${escapeHTML(item.subjectName || "General")}</span>
                        </div>
                        <h3 style="font-size:16px;font-weight:700;color:#0F172A;margin:0 0 6px 0;">${escapeHTML(item.title)}</h3>
                        <p style="font-size:13px;color:#475569;margin:0 0 14px 0;line-height:1.45;">${escapeHTML(item.description || "No description provided.")}</p>
                        ${deadlineHtml}
                    </div>
                    <div style="margin-top:18px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #F1F5F9;padding-top:14px;">
                        <span style="font-size:11.5px;color:#94A3B8;">By ${escapeHTML(item.uploadedByName || "Faculty")}</span>
                        <a href="${escapeHTML(item.fileUrl)}" target="_blank" download class="btn-primary" style="text-decoration:none;font-size:12.5px;padding:7px 14px;border-radius:8px;display:inline-flex;align-items:center;gap:6px;">
                            <span>⬇️</span> Download ${escapeHTML(item.fileType || "File")}
                        </a>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        grid.innerHTML = `<p style="color:#EF4444;grid-column:1/-1;">Error loading materials: ${escapeHTML(err.message)}</p>`;
    }
}

/* ---------- Student Announcements (Phase 3) ---------- */

async function loadStudentAnnouncements() {
    const listEl = document.getElementById("studentAnnouncementsList");
    if (!listEl) return;
    listEl.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px;">Loading announcements...</p>`;

    try {
        const res = await fetch(`${API_URL}/announcements`);
        if (!res.ok) throw new Error("Could not load announcements");
        const list = await res.json();

        if (!Array.isArray(list) || list.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center;padding:40px 20px;background:#fff;border:1px dashed #CBD5E1;border-radius:12px;color:#64748B;">
                    <div style="font-size:36px;margin-bottom:8px;">📢</div>
                    <strong style="color:#0F172A;font-size:16px;display:block;margin-bottom:4px;">No announcements posted yet</strong>
                    <span>Important departmental and subject notices will appear here.</span>
                </div>
            `;
            return;
        }

        listEl.innerHTML = list.map(ann => {
            return `
                <div style="background:#fff;border:1px solid #E2E8F0;border-left:4px solid #0D3E36;border-radius:12px;padding:20px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                        <div style="display:flex;gap:8px;align-items:center;">
                            <span style="font-weight:700;font-size:16px;color:#0F172A;">${escapeHTML(ann.title)}</span>
                            ${ann.subjectName ? `<span style="font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:99px;background:#E0F2FE;color:#0369A1;">${escapeHTML(ann.subjectName)}</span>` : ""}
                            ${ann.targetBranch ? `<span style="font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:99px;background:#FEF3C7;color:#92400E;">${escapeHTML(ann.targetBranch)}</span>` : ""}
                        </div>
                        <span style="font-size:12px;color:#94A3B8;">${escapeHTML(timeAgo(ann.createdAt))}</span>
                    </div>
                    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 14px 0;white-space:pre-wrap;">${escapeHTML(ann.content)}</p>
                    <div style="font-size:12px;color:#64748B;display:flex;align-items:center;gap:6px;">
                        <span>👤 Posted by <strong>${escapeHTML(ann.postedByName || "Faculty / Admin")}</strong></span>
                    </div>
                </div>
            `;
        }).join("");
    } catch (err) {
        listEl.innerHTML = `<p style="color:#EF4444;text-align:center;">Error loading announcements: ${escapeHTML(err.message)}</p>`;
    }
}

/* ---------- Initialize Dashboard ---------- */

function initDashboard() {
    if (!initializeUser()) return;
    setupEventListeners();
    fetchLectures();
    loadSubjectProgressStats();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
} else {
    initDashboard();
}



/* ========================================================
   ADHYAY AI LECTURE ASSISTANT (Groq Whisper + LLaMA 3.3)
   ======================================================== */

let aiPollingInterval = null;
let isAiAsking = false;

window.switchSidebarTab = function(tab) {
    const tabBtnAi = document.getElementById("tabBtnAi");
    const tabBtnPlaylist = document.getElementById("tabBtnPlaylist");
    const tabContentAi = document.getElementById("tabContentAi");
    const tabContentPlaylist = document.getElementById("tabContentPlaylist");

    if (tab === "ai") {
        tabBtnAi?.classList.add("active");
        tabBtnPlaylist?.classList.remove("active");
        if (tabContentAi) tabContentAi.style.display = "flex";
        if (tabContentPlaylist) tabContentPlaylist.style.display = "none";
    } else {
        tabBtnAi?.classList.remove("active");
        tabBtnPlaylist?.classList.add("active");
        if (tabContentAi) tabContentAi.style.display = "none";
        if (tabContentPlaylist) tabContentPlaylist.style.display = "flex";
    }
};

window.seekLecturePlayer = function(seconds) {
    const player = document.getElementById("lecturePlayer");
    if (!player) return;
    const s = Math.max(0, Number(seconds) || 0);
    player.currentTime = s;
    player.play().catch(() => {});
};

window.seekLectureTimestamp = function(tsStr) {
    if (!tsStr) return;
    const clean = String(tsStr).replace(/[\[\]\(\)]/g, "").trim();
    const parts = clean.split(":").map(Number);
    let totalSeconds = 0;
    if (parts.length === 2) {
        totalSeconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    seekLecturePlayer(totalSeconds);
};

function formatAiTimestamp(seconds) {
    const s = Math.round(Number(seconds) || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

async function initLectureAiAssistant(lecture) {
    if (aiPollingInterval) {
        clearInterval(aiPollingInterval);
        aiPollingInterval = null;
    }

    const badge = document.getElementById("aiTranscriptStatusBadge");
    const banner = document.getElementById("aiDisabledBanner");
    const bannerMsg = document.getElementById("aiDisabledMessage");
    const bannerIcon = document.getElementById("aiDisabledIcon");
    const chatBody = document.getElementById("aiChatBody");
    const input = document.getElementById("aiQuestionInput");
    const sendBtn = document.getElementById("aiSendBtn");

    if (!lecture) return;
    const lectureId = getLectureId(lecture);

    // Initial state check
    await checkTranscriptStatus(lectureId);

    async function checkTranscriptStatus(id) {
        try {
            const res = await fetch(`${API_URL}/lectures/${encodeURIComponent(id)}/transcript-status`);
            if (!res.ok) throw new Error("Status check failed");
            const data = await res.json();
            const status = (data.status || "NONE").toUpperCase();

            if (status === "DONE") {
                if (badge) {
                    badge.className = "ai-status-badge done";
                    badge.textContent = "✓ AI Ready";
                }
                if (banner) banner.style.display = "none";
                if (chatBody) chatBody.style.display = "flex";
                if (input) input.disabled = false;
                if (sendBtn) sendBtn.disabled = false;

                if (aiPollingInterval) {
                    clearInterval(aiPollingInterval);
                    aiPollingInterval = null;
                }
            } else if (status === "PENDING") {
                if (badge) {
                    badge.className = "ai-status-badge pending";
                    badge.textContent = "⏳ Transcribing...";
                }
                if (banner) {
                    banner.style.display = "block";
                    if (bannerIcon) bannerIcon.textContent = "⏳";
                    if (bannerMsg) bannerMsg.textContent = "AI is currently transcribing this lecture and generating timestamps. Checking status every 10s...";
                }
                if (chatBody) chatBody.style.display = "none";
                if (input) input.disabled = true;
                if (sendBtn) sendBtn.disabled = true;

                if (!aiPollingInterval) {
                    aiPollingInterval = setInterval(() => checkTranscriptStatus(id), 10000);
                }
            } else if (status === "FAILED") {
                if (badge) {
                    badge.className = "ai-status-badge disabled";
                    badge.textContent = "✗ Failed";
                }
                if (banner) {
                    banner.style.display = "block";
                    if (bannerIcon) bannerIcon.textContent = "⚠️";
                    const err = data.error ? ` Reason: ${data.error}` : "";
                    if (bannerMsg) bannerMsg.textContent = "Transcription could not be completed for this lecture." + err;
                }
                if (chatBody) chatBody.style.display = "none";
                if (input) input.disabled = true;
                if (sendBtn) sendBtn.disabled = true;

                if (aiPollingInterval) {
                    clearInterval(aiPollingInterval);
                    aiPollingInterval = null;
                }
            } else {
                if (badge) {
                    badge.className = "ai-status-badge";
                    badge.textContent = "Not Ready";
                }
                if (banner) {
                    banner.style.display = "block";
                    if (bannerIcon) bannerIcon.textContent = "ℹ️";
                    if (bannerMsg) bannerMsg.textContent = "AI Assistant transcript has not been generated for this lecture yet.";
                }
                if (chatBody) chatBody.style.display = "none";
                if (input) input.disabled = true;
                if (sendBtn) sendBtn.disabled = true;

                if (aiPollingInterval) {
                    clearInterval(aiPollingInterval);
                    aiPollingInterval = null;
                }
            }
        } catch (err) {
            console.warn("Could not check transcript status:", err);
        }
    }
}

window.submitQuickQuestion = function(question) {
    const input = document.getElementById("aiQuestionInput");
    if (input) {
        input.value = question;
        handleAiQuestionSubmit();
    }
};

window.handleAiQuestionSubmit = async function(event) {
    if (event) event.preventDefault();
    if (isAiAsking || !currentLecture) return;

    const input = document.getElementById("aiQuestionInput");
    const question = (input?.value || "").trim();
    if (!question) return;

    const lectureId = getLectureId(currentLecture);
    const messagesScroll = document.getElementById("aiMessagesScroll");
    const loadingIndicator = document.getElementById("aiLoadingIndicator");
    const sendBtn = document.getElementById("aiSendBtn");

    // Append student bubble
    appendChatBubble("user", question);
    if (input) input.value = "";

    isAiAsking = true;
    if (sendBtn) sendBtn.disabled = true;
    if (loadingIndicator) loadingIndicator.style.display = "flex";
    if (messagesScroll) messagesScroll.scrollTop = messagesScroll.scrollHeight;

    try {
        const user = currentUser || readJSON(AUTH_KEY, {});
        const role = user.role || "STUDENT";
        const userId = user.id || user._id || "";
        const email = user.email || "";

        const res = await fetch(`${API_URL}/lectures/${encodeURIComponent(lectureId)}/ask`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-User-Id": userId,
                "X-User-Role": role,
                "X-User-Email": email
            },
            body: JSON.stringify({
                question: question,
                userId: userId,
                userRole: role,
                userEmail: email
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const errorMsg = data.message || `Error ${res.status}: Unable to get answer.`;
            appendChatBubble("bot", `⚠️ ${errorMsg}`);
            return;
        }

        // Render Answer with clickable timestamps and source links
        appendChatBubble("bot", data.answer || "No answer returned.", data.sources);

    } catch (err) {
        console.error("AI Ask error:", err);
        appendChatBubble("bot", "⚠️ Network error connecting to AI assistant on port 8081.");
    } finally {
        isAiAsking = false;
        if (sendBtn) sendBtn.disabled = false;
        if (loadingIndicator) loadingIndicator.style.display = "none";
        if (messagesScroll) messagesScroll.scrollTop = messagesScroll.scrollHeight;
    }
};

function appendChatBubble(sender, rawText, sources) {
    const messagesScroll = document.getElementById("aiMessagesScroll");
    if (!messagesScroll) return;

    const bubble = document.createElement("div");
    bubble.className = `ai-bubble ${sender === "user" ? "ai-user-bubble" : "ai-bot-bubble"}`;

    if (sender === "user") {
        bubble.innerHTML = `
            <div class="ai-bubble-content">${escapeHTML(rawText)}</div>
        `;
    } else {
        let formattedHtml = escapeHTML(rawText);

        // Format bold and italics
        formattedHtml = formattedHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedHtml = formattedHtml.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Replace timestamps like [MM:SS] or MM:SS into clickable chips
        formattedHtml = formattedHtml.replace(/(?:\[|\()?\b(\d{1,2}:\d{2}(?::\d{2})?)\b(?:\]|\))?/g, (match, p1) => {
            return `<button type="button" class="timestamp-chip" onclick="seekLectureTimestamp('${p1}')">⏱ ${p1}</button>`;
        });

        // Add Source Snippets if present
        let sourcesHtml = "";
        if (Array.isArray(sources) && sources.length > 0) {
            sourcesHtml = `
                <div class="ai-sources-container">
                    <div class="ai-sources-title">Key Lecture Timestamps:</div>
                    ${sources.map(s => `
                        <div class="ai-source-item">
                            <button type="button" class="timestamp-chip" onclick="seekLecturePlayer(${s.startTime})">⏱ ${escapeHTML(s.formattedTime || formatAiTimestamp(s.startTime))}</button>
                            <span style="opacity:0.85;">${escapeHTML(s.text.length > 90 ? s.text.substring(0, 90) + '...' : s.text)}</span>
                        </div>
                    `).join("")}
                </div>
            `;
        }

        bubble.innerHTML = `
            <div class="ai-bot-avatar">🤖</div>
            <div class="ai-bubble-content">
                <div style="white-space:pre-wrap;">${formattedHtml}</div>
                ${sourcesHtml}
            </div>
        `;
    }

    messagesScroll.appendChild(bubble);
    messagesScroll.scrollTop = messagesScroll.scrollHeight;
}

// Hook into existing video open function so AI assistant loads whenever a lecture is opened
const originalOpenVideo = typeof openVideo === "function" ? openVideo : null;
if (originalOpenVideo) {
    openVideo = function(...args) {
        const result = originalOpenVideo.apply(this, args);
        if (currentLecture) {
            initLectureAiAssistant(currentLecture);
        }
        return result;
    };
}
