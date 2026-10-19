
/* =========================================
   ADHYAY - Student Dashboard
   File: student-dashboard.js
   ========================================= */

const API_URL = "http://localhost:8081/api";
const AUTH_KEY = "adhyayUser";
const PROGRESS_KEY = "adhyayLectureProgress";
const BOOKMARKS_KEY = "adhyayLectureBookmarks";

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

    if (role !== "STUDENT") {
        showMessage("Your account role could not be verified. Please log in again.", "error");
        return false;
    }

    const name =
        currentUser.name ||
        currentUser.fullName ||
        currentUser.username ||
        currentUser.email?.split("@")[0] ||
        "Student";

    const nameElement = getElement("studentName", "userName", "welcomeName");

    if (nameElement) {
        nameElement.textContent = name;
    }

    const avatarElement = getElement("studentAvatar", "userAvatar");

    if (avatarElement) {
        avatarElement.textContent = name.charAt(0).toUpperCase();
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
            ? "No saved lectures found. Use the bookmark icon on a lecture to save it."
            : "Try another search term or choose a different subject.";

        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <strong>No lectures found</strong>
                <p>${escapeHTML(message)}</p>
                ${
                    showSavedOnly
                        ? `<button class="btn btn-outline" id="backToAllBtn" type="button">View All Lectures</button>`
                        : ""
                }
            </div>
        `;

        return;
    }

    filteredLectures.forEach(lecture => {
        grid.appendChild(createLectureCard(lecture));
    });
}

function createLectureCard(lecture) {
    const card = document.createElement("article");
    card.className = "lecture-card";

    const id = getLectureId(lecture);
    const bookmarks = getBookmarks();
    const isSaved = bookmarks.includes(id);
    const progress = getLectureProgress(lecture);

    const title = lecture.title || "Untitled Lecture";
    const subject = lecture.subject || "General";
    const unit = lecture.unit ?? "—";
    const lectureNumber = lecture.lectureNumber ?? "—";
    const description = lecture.description || "No description available.";
    const uploadedBy = lecture.uploadedBy || "Faculty";

    const percent = progress.duration > 0
        ? Math.min(
            100,
            Math.round((progress.currentTime / progress.duration) * 100)
        )
        : 0;

    const hasProgress = Number(progress.currentTime) > 0 &&
        !progress.completed;

    card.innerHTML = `
        <div class="lecture-cover">
            <div class="cover-icon" aria-hidden="true">▶</div>

            <span class="cover-label">
                ${escapeHTML(subject)}
            </span>

            <button
                class="bookmark-btn ${isSaved ? "is-saved" : ""}"
                type="button"
                data-action="bookmark"
                data-id="${escapeHTML(id)}"
                aria-label="${isSaved ? "Remove bookmark" : "Save lecture"}"
                aria-pressed="${isSaved}"
                title="${isSaved ? "Remove bookmark" : "Save lecture"}"
            >${isSaved ? "★" : "☆"}</button>
        </div>

        <div class="lecture-info">
            <div class="lecture-tags">
                <span class="lecture-tag">
                    Unit ${escapeHTML(unit)}
                </span>

                <span class="lecture-tag neutral">
                    Lecture ${escapeHTML(lectureNumber)}
                </span>
            </div>

            <h3 class="lecture-title">
                ${escapeHTML(title)}
            </h3>

            <p class="lecture-description">
                ${escapeHTML(description)}
            </p>

            <div class="lecture-meta">
                <span>👤 ${escapeHTML(uploadedBy)}</span>
                <span>${escapeHTML(formatDate(lecture.createdAt))}</span>
            </div>

            ${
                hasProgress
                    ? `
                        <div class="lecture-progress">
                            <div class="progress-label">
                                <span>Continue watching</span>
                                <span>${percent}%</span>
                            </div>

                            <div class="progress-track">
                                <div class="progress-fill" style="width: ${percent}%"></div>
                            </div>
                        </div>
                    `
                    : ""
            }

            <div class="lecture-actions">
                <button
                    class="watch-btn"
                    type="button"
                    data-action="watch"
                    data-id="${escapeHTML(id)}"
                    ${lecture.videoUrl ? "" : "disabled"}
                >
                    ▶ ${hasProgress ? "Continue" : "Watch Lecture"}
                </button>

                <button
                    class="details-btn"
                    type="button"
                    data-action="details"
                    data-id="${escapeHTML(id)}"
                >
                    Details
                </button>
            </div>
        </div>
    `;

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

    const button = getElement("savedLecturesBtn", "showSavedBtn");

    if (button) {
        button.setAttribute("aria-pressed", String(showSavedOnly));
        button.textContent = showSavedOnly
            ? "Show All Lectures"
            : "Saved Lectures";
    }

    const savedSection = getElement("savedSection", "savedLecturesSection");

    if (savedSection) {
        savedSection.hidden = !showSavedOnly;
    }

    applyFilters();

    const heading = getElement("lectureSectionTitle", "lecturesHeading");

    if (heading) {
        heading.textContent = showSavedOnly
            ? "Saved Lectures"
            : "Explore Lectures";
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

    const modal = getElement("videoModal", "lectureModal");
    const player = getElement("lecturePlayer", "videoPlayer");

    if (!modal || !player) {
        showMessage(
            "The video player elements are missing from student-dashboard.html.",
            "error"
        );
        return;
    }

    currentLecture = lecture;

    const titleElement = getElement("modalLectureTitle", "videoTitle");

    if (titleElement) {
        titleElement.textContent = lecture.title || "Lecture";
    }

    const subjectElement = getElement("modalLectureInfo", "videoSubtitle");

    if (subjectElement) {
        subjectElement.textContent =
            `${lecture.subject || "General"} · Unit ${lecture.unit ?? "—"}`;
    }

    player.pause();
    player.src = lecture.videoUrl;
    player.load();

    modal.hidden = false;
    document.body.style.overflow = "hidden";

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
        console.warn("Playback did not start automatically:", error);
    });
}

function closeVideo() {
    const modal = getElement("videoModal", "lectureModal");
    const player = getElement("lecturePlayer", "videoPlayer");

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
    const player = getElement("lecturePlayer", "videoPlayer");

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

    const savedButton = getElement("savedLecturesBtn", "showSavedBtn");

    if (savedButton) {
        savedButton.addEventListener("click", toggleSavedLectures);
    }

    const logoutButton = getElement("logoutBtn", "logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    document.addEventListener("click", event => {
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

        if (event.target.closest("#backToAllBtn")) {
            showSavedOnly = false;

            const savedButton = getElement("savedLecturesBtn", "showSavedBtn");

            if (savedButton) {
                savedButton.setAttribute("aria-pressed", "false");
                savedButton.textContent = "Saved Lectures";
            }

            const savedSection = getElement("savedSection", "savedLecturesSection");

            if (savedSection) {
                savedSection.hidden = true;
            }

            applyFilters();
        }
    });

    const modal = getElement("videoModal", "lectureModal");
    const closeButton = getElement("closeVideoBtn", "closeModalBtn");
    const player = getElement("lecturePlayer", "videoPlayer");

    if (closeButton) {
        closeButton.addEventListener("click", closeVideo);
    }

    if (modal) {
        modal.addEventListener("click", event => {
            if (
                event.target.classList.contains("modal-backdrop") ||
                event.target === modal
            ) {
                closeVideo();
            }
        });
    }

    if (player) {
        player.addEventListener("timeupdate", savePlaybackProgress);
        player.addEventListener("pause", savePlaybackProgress);

        player.addEventListener("ended", () => {
            if (!currentLecture) return;

            const progress = getProgress();
            const id = getLectureId(currentLecture);

            progress[id] = {
                currentTime: 0,
                duration: Number.isFinite(player.duration)
                    ? player.duration
                    : 0,
                completed: true
            };

            writeJSON(PROGRESS_KEY, progress);
            updateStatistics();
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && currentLecture) {
            closeVideo();
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
