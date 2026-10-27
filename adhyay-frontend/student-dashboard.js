
/* =========================================
   ADHYAY - Student Dashboard
   File: student-dashboard.js
   ========================================= */

const API_URL = "http://localhost:8081/api";
const AUTH_KEY = "adhyayUser";
const PROGRESS_KEY = "adhyayLectureProgress";
const BOOKMARKS_KEY = "adhyayLectureBookmarks";
const COMMENTS_KEY = "adhyayLectureComments";
const LIKES_KEY = "adhyayLectureLikes";

/* ---------- Application State ---------- */

let currentUser = null;
let allLectures = [];
let filteredLectures = [];
let currentLecture = null;
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
    localStorage.removeItem(AUTH_KEY);
    window.location.href = "login.html";
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

    filteredLectures = allLectures.filter(lecture => {
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

        const matchesSaved =
            !showSavedOnly ||
            bookmarks.includes(getLectureId(lecture));

        return matchesSubject && matchesSearch && matchesSaved;
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
        const message = showSavedOnly
            ? "No saved lectures. Bookmark a lecture to save it here."
            : "No lectures match your search or filter.";
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

function renderContinueWatching() {
    const section = getElement("continueSection", "continueWatchingSection");
    const grid = getElement("continueGrid", "continueWatchingGrid");

    if (!grid) return;

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
        }
        player.removeEventListener("loadedmetadata", restorePosition);
    };

    player.addEventListener("loadedmetadata", restorePosition);
    player.play().catch(error => {
        console.warn("Autoplay was prevented by browser:", error);
    });
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
    applyFilters();
}

function savePlaybackProgress() {
    const player = document.getElementById("lecturePlayer");
    if (!currentLecture || !player) return;

    const id = getLectureId(currentLecture);
    if (!id || !Number.isFinite(player.currentTime)) return;

    const progress = getProgress();
    const completed = player.duration > 0 &&
        player.currentTime >= player.duration - 3;

    progress[id] = {
        currentTime: completed ? 0 : player.currentTime,
        duration: Number.isFinite(player.duration) ? player.duration : 0,
        completed
    };

    writeJSON(PROGRESS_KEY, progress);
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

function renderComments(lectureId) {
    const list = document.getElementById("commentsList");
    const countBadge = document.getElementById("commentsCountBadge");
    if (!list) return;

    const comments = getLectureComments(lectureId);
    if (countBadge) countBadge.textContent = comments.length;

    if (comments.length === 0) {
        list.innerHTML = `
            <div class="comments-empty-state">
                <span>💬</span>
                <strong>No comments or doubts yet</strong>
                <p>Be the first to ask a question or leave feedback on this lecture!</p>
            </div>
        `;
        return;
    }

    const currentUserName = (currentUser && (currentUser.name || currentUser.username)) || "Student";

    list.innerHTML = comments
        .slice()
        .reverse()
        .map(comment => {
            const authorInitial = (comment.author || "S").charAt(0).toUpperCase();
            const isOwn = comment.author === currentUserName;
            const isFaculty = comment.role === "FACULTY" || comment.role === "Faculty";
            return `
                <div class="comment-item" data-comment-id="${escapeHTML(comment.id)}">
                    <div class="comment-item-avatar">${escapeHTML(authorInitial)}</div>
                    <div class="comment-item-content">
                        <div class="comment-meta-bar">
                            <span class="comment-author-name">${escapeHTML(comment.author || "Student")}</span>
                            <span class="comment-role-chip ${isFaculty ? 'faculty' : ''}">
                                ${escapeHTML(comment.role || "Student")}
                            </span>
                            <span class="comment-time-ago">${escapeHTML(timeAgo(comment.timestamp))}</span>
                        </div>
                        <p class="comment-text-body">${escapeHTML(comment.text)}</p>
                        <div class="comment-actions-bar">
                            <button
                                class="comment-action-btn ${comment.liked ? 'liked' : ''}"
                                type="button"
                                data-comment-action="like"
                                data-comment-id="${escapeHTML(comment.id)}"
                            >
                                <span>👍</span>
                                <span>${comment.likes || 0}</span>
                            </button>
                            ${
                                isOwn
                                    ? `
                                    <button
                                        class="comment-action-btn delete"
                                        type="button"
                                        data-comment-action="delete"
                                        data-comment-id="${escapeHTML(comment.id)}"
                                    >
                                        <span>🗑 Delete</span>
                                    </button>
                                `
                                    : ""
                            }
                        </div>
                    </div>
                </div>
            `;
        })
        .join("");
}

function addComment(lectureId, text) {
    if (!text || !text.trim()) return;
    const store = readJSON(COMMENTS_KEY, {});
    if (!store[lectureId]) store[lectureId] = [];

    const currentUserName = (currentUser && (currentUser.name || currentUser.username)) || "Student";
    const currentUserRole = (currentUser && currentUser.role) || "Student";

    const newComment = {
        id: "c_" + Date.now(),
        author: currentUserName,
        role: currentUserRole,
        text: text.trim(),
        timestamp: Date.now(),
        likes: 0,
        liked: false
    };

    store[lectureId].push(newComment);
    writeJSON(COMMENTS_KEY, store);
    renderComments(lectureId);
}

function toggleCommentLike(lectureId, commentId) {
    const store = readJSON(COMMENTS_KEY, {});
    const list = store[lectureId];
    if (!list) return;

    const comment = list.find(c => c.id === commentId);
    if (!comment) return;

    comment.liked = !comment.liked;
    comment.likes = (comment.likes || 0) + (comment.liked ? 1 : -1);
    if (comment.likes < 0) comment.likes = 0;

    writeJSON(COMMENTS_KEY, store);
    renderComments(lectureId);
}

function deleteComment(lectureId, commentId) {
    const store = readJSON(COMMENTS_KEY, {});
    const list = store[lectureId];
    if (!list) return;

    store[lectureId] = list.filter(c => c.id !== commentId);
    writeJSON(COMMENTS_KEY, store);
    renderComments(lectureId);
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
    if (player) {
        player.addEventListener("timeupdate", savePlaybackProgress);
        player.addEventListener("pause", savePlaybackProgress);

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

/* ---------- Initialize Dashboard ---------- */

document.addEventListener("DOMContentLoaded", () => {
    if (!initializeUser()) return;

    setupEventListeners();
    fetchLectures();
});

