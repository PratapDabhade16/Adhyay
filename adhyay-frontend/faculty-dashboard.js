// =========================================
// ADHYAY — Faculty Dashboard
// Complete Drag-and-Drop & File Upload System
// =========================================

const API_URL = (window.ADHYAY_CONFIG && window.ADHYAY_CONFIG.API_BASE)
    ? window.ADHYAY_CONFIG.API_BASE
    : "http://localhost:8081/api";
const UPLOAD_TIMEOUT = 10 * 60 * 1000; // 10 minutes

let currentUser = null;
let uploadInProgress = false;
let selectedVideoFile = null;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialize user
    const storedUser = localStorage.getItem("adhyayUser");
    if (!storedUser) {
        window.location.href = "login.html";
        return;
    }

    try {
        currentUser = JSON.parse(storedUser);
    } catch {
        localStorage.removeItem("adhyayUser");
        window.location.href = "login.html";
        return;
    }

    const role = String(currentUser?.role || "").toUpperCase();
    if (role !== "FACULTY") {
        if (role === "STUDENT") {
            window.location.href = "student-dashboard.html";
        } else if (role === "ADMIN") {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "login.html";
        }
        return;
    }

    displayUser();
    setupFileSelection();
    setupUploadForm();
    setupLogout();
    setupNavSwitching();
    setupLectureListActions();

    await loadLectures();
    await loadMoodleCourses();
    await loadFacultyDoubts();
});

/* =========================================
   USER INFO DISPLAY
========================================= */
function displayUser() {
    const name = currentUser.name || currentUser.fullName || currentUser.email || "Faculty";
    const facultyNameEl = document.getElementById("facultyName");
    const sidebarAvatar = document.getElementById("sidebarAvatar");

    if (facultyNameEl) facultyNameEl.textContent = name;
    if (sidebarAvatar) sidebarAvatar.textContent = name.charAt(0).toUpperCase();
}

/* =========================================
   FILE SELECTION & DRAG-AND-DROP
========================================= */
function setupFileSelection() {
    const dropArea = document.getElementById("dropArea");
    const videoInput = document.getElementById("videoFileInput") || document.getElementById("video");
    const fileLabel = document.getElementById("fileLabel");
    const dropSub = dropArea ? dropArea.querySelector(".dropzone-sub") : null;

    if (!dropArea || !videoInput) {
        console.error("Dropzone or file input missing.");
        return;
    }

    // 1. Clicking dropArea triggers the file picker
    dropArea.addEventListener("click", () => {
        videoInput.click();
    });

    // 2. Drag & Drop events
    ["dragenter", "dragover"].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropArea.classList.add("dragover");
            dropArea.style.borderColor = "#0D3E36";
            dropArea.style.backgroundColor = "#E2ECE7";
        });
    });

    ["dragleave", "dragend"].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropArea.classList.remove("dragover");
            dropArea.style.borderColor = "";
            dropArea.style.backgroundColor = "";
        });
    });

    dropArea.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove("dragover");
        dropArea.style.borderColor = "";
        dropArea.style.backgroundColor = "";

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleSelectedFile(files[0]);
        }
    });

    // 3. File Input Change (browse button)
    videoInput.addEventListener("change", () => {
        const file = videoInput.files?.[0];
        if (file) {
            handleSelectedFile(file);
        }
    });

    function handleSelectedFile(file) {
        if (!file) return;

        const sizeMB = file.size / (1024 * 1024);
        const extension = file.name.split(".").pop().toLowerCase();
        const allowedExtensions = ["mp4", "mov", "avi", "webm", "mkv", "m4v"];

        if (!allowedExtensions.includes(extension)) {
            showMessage("Unsupported video format. Please upload MP4, WebM, MOV, or MKV.", "error");
            selectedVideoFile = null;
            videoInput.value = "";
            resetDropzoneUI();
            return;
        }

        if (sizeMB > 500) {
            showMessage("The video exceeds the 500 MB limit.", "error");
            selectedVideoFile = null;
            videoInput.value = "";
            resetDropzoneUI();
            return;
        }

        clearMessage();
        selectedVideoFile = file;

        // Auto-fill Title if empty
        const titleInput = document.getElementById("titleInput") || document.getElementById("title");
        if (titleInput && !titleInput.value.trim()) {
            const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
            titleInput.value = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
        }

        // Update Dropzone UI
        if (fileLabel) {
            fileLabel.innerHTML = `<strong>Selected:</strong> ${escapeHTML(file.name)}`;
        }
        if (dropSub) {
            dropSub.innerHTML = `<span style="color:#0D3E36;font-weight:600;">✓ Ready to upload (${sizeMB.toFixed(1)} MB)</span> — Click or drop another to replace`;
        }
        dropArea.style.borderColor = "#0D3E36";
        dropArea.style.backgroundColor = "#E8F2ED";
    }

    function resetDropzoneUI() {
        if (fileLabel) fileLabel.textContent = "Drop your video here";
        if (dropSub) dropSub.textContent = "or choose a file. Maximum size 100 MB.";
        dropArea.style.borderColor = "";
        dropArea.style.backgroundColor = "";
    }
}

/* =========================================
   UPLOAD FORM HANDLING
========================================= */
function setupUploadForm() {
    const form = document.getElementById("uploadForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (uploadInProgress) return;
        await uploadLecture();
    });
}

function uploadLecture() {
    return new Promise((resolve) => {
        const videoInput = document.getElementById("videoFileInput") || document.getElementById("video");
        const titleInput = document.getElementById("titleInput") || document.getElementById("title");
        const descriptionInput = document.getElementById("descriptionInput") || document.getElementById("description");
        const subjectInput = document.getElementById("subjectInput") || document.getElementById("subject");
        const unitInput = document.getElementById("unitInput") || document.getElementById("unit");
        const lectureInput = document.getElementById("lectureInput") || document.getElementById("lectureNumber");
        const submitBtn = document.getElementById("submitBtn") || document.getElementById("uploadBtn");

        const video = selectedVideoFile || videoInput?.files?.[0];
        const title = titleInput?.value?.trim();
        const description = descriptionInput?.value?.trim() || "";
        const subject = subjectInput?.value?.trim() || "General";
        const unit = unitInput?.value?.trim() || "Unit 1";
        const lectureNumber = parseInt(lectureInput?.value?.trim() || "1", 10);

        if (!video) {
            showMessage("Please select or drop a lecture video file first.", "error");
            const dropArea = document.getElementById("dropArea");
            if (dropArea) {
                dropArea.style.borderColor = "#C0392B";
                dropArea.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            resolve();
            return;
        }

        if (!title) {
            showMessage("Please enter a title for the lecture.", "error");
            if (titleInput) titleInput.focus();
            resolve();
            return;
        }

        const uploadedBy = currentUser.email || currentUser.name || "Faculty";

        const formData = new FormData();
        formData.append("video", video);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("subject", subject);
        formData.append("unit", unit);
        formData.append("lectureNumber", lectureNumber);
        formData.append("uploadedBy", uploadedBy);

        uploadInProgress = true;
        clearMessage();

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Uploading...";
        }

        const progressContainer = document.getElementById("progressContainer");
        const progressBar = document.getElementById("uploadProgressBar");
        const progressText = document.getElementById("progressText");

        if (progressContainer) progressContainer.style.display = "block";
        if (progressBar) progressBar.style.width = "0%";
        if (progressText) progressText.textContent = "0%";

        const xhr = new XMLHttpRequest();
        let finished = false;

        function finish() {
            if (finished) return false;
            finished = true;
            uploadInProgress = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Publish lecture";
            }
            return true;
        }

        xhr.open("POST", `${API_URL}/lectures/upload`, true);
        xhr.timeout = UPLOAD_TIMEOUT;
        xhr.setRequestHeader("Accept", "application/json");

        xhr.upload.addEventListener("progress", (e) => {
            if (!e.lengthComputable) return;
            const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressText) {
                progressText.textContent = percent < 100 ? `${percent}%` : "Processing with Cloudinary...";
            }
        });

        xhr.onload = async () => {
            if (!finish()) return;

            if (xhr.status >= 200 && xhr.status < 300) {
                showMessage("Lecture published successfully! It is now available for students.", "success");

                // Reset form and file state
                const form = document.getElementById("uploadForm");
                if (form) form.reset();
                selectedVideoFile = null;
                if (videoInput) videoInput.value = "";

                const fileLabel = document.getElementById("fileLabel");
                const dropArea = document.getElementById("dropArea");
                const dropSub = dropArea ? dropArea.querySelector(".dropzone-sub") : null;
                if (fileLabel) fileLabel.textContent = "Drop your video here";
                if (dropSub) dropSub.textContent = "or choose a file. Maximum size 100 MB.";
                if (dropArea) {
                    dropArea.style.borderColor = "";
                    dropArea.style.backgroundColor = "";
                }

                if (progressContainer) progressContainer.style.display = "none";

                await loadLectures();
            } else {
                let errText = xhr.responseText;
                try {
                    const parsed = JSON.parse(xhr.responseText);
                    errText = parsed.message || parsed.error || xhr.responseText;
                } catch {}
                showMessage(`Upload failed (${xhr.status}): ${errText}`, "error");
            }
            resolve();
        };

        xhr.onerror = () => {
            if (!finish()) return;
            showMessage("Network error. Verify that backend is running on port 8081.", "error");
            resolve();
        };

        xhr.ontimeout = () => {
            if (!finish()) return;
            showMessage("Upload timed out. The file may still be uploading to Cloudinary.", "error");
            resolve();
        };

        try {
            xhr.send(formData);
        } catch (err) {
            finish();
            showMessage(`Could not send request: ${err.message}`, "error");
            resolve();
        }
    });
}

/* =========================================
   LOAD & RENDER FACULTY LECTURES
========================================= */
async function loadLectures() {
    const tbody = document.getElementById("lecturesTableBody");
    if (!tbody) return;

    try {
        let lectures = [];
        const uploadedBy = currentUser.email || currentUser.name;

        // Try faculty-specific endpoint first
        try {
            const res = await fetch(`${API_URL}/lectures/faculty/${encodeURIComponent(uploadedBy)}`);
            if (res.ok) lectures = await res.json();
        } catch {}

        // Fallback to all lectures if faculty endpoint returns empty
        if (!Array.isArray(lectures) || lectures.length === 0) {
            const resAll = await fetch(`${API_URL}/lectures`);
            if (resAll.ok) {
                const all = await resAll.json();
                lectures = Array.isArray(all) ? all.filter(l => l.uploadedBy === uploadedBy || !l.uploadedBy) : [];
                if (lectures.length === 0 && Array.isArray(all)) lectures = all;
            }
        }

        displayLectures(lectures);
    } catch (err) {
        console.error("Failed to load lectures:", err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">No lectures uploaded yet.</td></tr>`;
    }
}

let pollingTimer = null;

function displayLectures(lectures) {
    const tbody = document.getElementById("lecturesTableBody");
    if (!tbody) return;

    const list = Array.isArray(lectures) ? lectures : [];

    // Clear any previous poll timer
    if (pollingTimer) {
        clearTimeout(pollingTimer);
        pollingTimer = null;
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:var(--muted);padding:32px;">
                    No lectures uploaded yet. Drop a recording above to upload your first lecture.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";
    let hasPending = false;

    list.forEach(lecture => {
        const id = lecture.id || lecture._id || "";
        const status = (lecture.transcriptStatus || "NONE").toUpperCase();
        if (status === "PENDING") {
            hasPending = true;
        }

        let aiBadge = "";
        if (status === "DONE") {
            aiBadge = `<span class="chip-ai done">✓ Ready</span>`;
        } else if (status === "PENDING") {
            aiBadge = `<span class="chip-ai pending">⏳ Transcribing...</span>`;
        } else if (status === "FAILED") {
            const err = lecture.transcriptError ? escapeHTML(lecture.transcriptError) : "Failed";
            aiBadge = `
                <span class="chip-ai failed" title="${err}">✗ Failed</span>
                <button class="btn-retry-ai" type="button" data-action="retry-ai" data-id="${escapeHTML(id)}">Retry</button>
            `;
        } else {
            aiBadge = `
                <button class="btn-retry-ai" type="button" data-action="retry-ai" data-id="${escapeHTML(id)}">Transcribe</button>
            `;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight:600;color:var(--text);">${escapeHTML(lecture.title || "Untitled")}</td>
            <td style="color:var(--muted);">${escapeHTML(lecture.subject || "General")}</td>
            <td style="color:var(--muted);">Unit ${escapeHTML(String(lecture.unit ?? "—"))}</td>
            <td>${aiBadge}</td>
            <td style="text-align:right;">
                <button class="action-delete-btn" type="button" data-action="delete" data-id="${escapeHTML(id)}">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Requirement: Poll every 10 seconds while any lecture is pending transcription
    if (hasPending) {
        pollingTimer = setTimeout(() => {
            console.log("Polling lecture transcript statuses...");
            loadLectures();
        }, 10000);
    }
}

/* =========================================
   DELETE & RETRY LECTURE ACTIONS
========================================= */
function setupLectureListActions() {
    document.addEventListener("click", async (e) => {
        // Handle Retry AI Transcript
        const retryBtn = e.target.closest('[data-action="retry-ai"]');
        if (retryBtn) {
            const id = retryBtn.getAttribute("data-id");
            if (!id) return;

            retryBtn.disabled = true;
            retryBtn.textContent = "Starting...";
            try {
                const res = await fetch(`${API_URL}/lectures/${encodeURIComponent(id)}/retry-transcript`, {
                    method: "POST"
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.message || "Failed to trigger retry");
                }
                showMessage("AI transcription restarted for this lecture.", "success");
                await loadLectures();
            } catch (err) {
                showMessage("Unable to retry AI transcription: " + err.message, "error");
                retryBtn.disabled = false;
                retryBtn.textContent = "Retry";
            }
            return;
        }

        // Handle Delete Lecture
        const btn = e.target.closest('[data-action="delete"]');
        if (!btn) return;

        const id = btn.getAttribute("data-id");
        if (!id) return;

        if (!confirm("Are you sure you want to delete this lecture?")) return;

        try {
            const res = await fetch(`${API_URL}/lectures/${encodeURIComponent(id)}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            showMessage("Lecture deleted successfully.", "success");
            await loadLectures();
        } catch (err) {
            showMessage("Unable to delete lecture. " + err.message, "error");
        }
    });
}

/* =========================================
   MOODLE COURSES
========================================= */
async function loadMoodleCourses() {
    const container = document.getElementById("moodleCoursesList");
    if (!container) return;

    try {
        const res = await (typeof authenticatedFetch === "function" 
            ? authenticatedFetch(`${API_URL}/moodle/courses`) 
            : fetch(`${API_URL}/moodle/courses`));
        if (!res.ok) throw new Error();
        const courses = await res.json();
        if (Array.isArray(courses) && courses.length > 0) {
            container.innerHTML = courses.map(c => `
                <div class="moodle-item">
                    <span>${escapeHTML(c.fullname || c.displayname || c.shortname || "Course")}</span>
                    <span class="chip chip-moodle">Moodle</span>
                </div>
            `).join("");
        }
    } catch {
        // Keep default Moodle courses displayed
    }
}

/* =========================================
   NAV SWITCHING & LOGOUT
========================================= */
function setupNavSwitching() {
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    const targets = {
        upload: document.getElementById("uploadPanel"),
        mylectures: document.getElementById("myLecturesPanel"),
        materials: document.getElementById("materialsPanel"),
        announcements: document.getElementById("announcementsPanel"),
        courses: document.getElementById("moodlePanel"),
        doubts: document.getElementById("doubtsPanel")
    };

    navItems.forEach(btn => {
        btn.addEventListener("click", () => {
            navItems.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const page = btn.getAttribute("data-page");
            const targetEl = targets[page];
            if (targetEl) {
                targetEl.style.display = "block";
                targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
                targetEl.style.transition = "box-shadow 0.3s ease";
                targetEl.style.boxShadow = "0 0 0 2px var(--green-mid)";
                setTimeout(() => {
                    targetEl.style.boxShadow = "";
                }, 1200);

                if (page === "materials") loadFacultyMaterials();
                if (page === "announcements") loadFacultyAnnouncements();
            }
        });
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (typeof logoutUser === "function") {
                logoutUser();
            } else {
                localStorage.removeItem("adhyayUser");
                window.location.href = "login.html";
            }
        });
    }
}

function showMessage(msg, type = "info") {
    const el = document.getElementById("uploadMessage") || document.getElementById("deleteMessage");
    if (!el) return;
    el.textContent = msg;
    el.className = `msg-banner ${type}`;
    el.style.display = "block";
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearMessage() {
    const el = document.getElementById("uploadMessage") || document.getElementById("deleteMessage");
    if (!el) return;
    el.textContent = "";
    el.className = "msg-banner";
    el.style.display = "none";
}

function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);
}

/* ========================================================
   FACULTY DOUBTS MANAGEMENT (STUDENT Q&A)
   ======================================================== */
function timeAgoFaculty(val) {
    if (!val) return "Just now";
    const ts = typeof val === "number" ? val : new Date(val).getTime();
    if (isNaN(ts)) return "Just now";
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ts).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

window.loadFacultyDoubts = async function() {
    const container = document.getElementById("facultyDoubtsContainer");
    const badge = document.getElementById("facultyDoubtsBadge");
    const statusFilter = document.getElementById("doubtFilterStatus")?.value || "ALL";

    if (!container) return;

    try {
        let url = `${API_URL}/doubts`;
        if (statusFilter && statusFilter !== "ALL") {
            url += `?status=${encodeURIComponent(statusFilter)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch doubts");
        const doubts = await res.json();

        // Update pending count badge
        const allRes = await fetch(`${API_URL}/doubts?status=OPEN`).catch(() => null);
        if (allRes && allRes.ok) {
            const openDoubts = await allRes.json();
            const openCount = Array.isArray(openDoubts) ? openDoubts.length : 0;
            if (badge) {
                if (openCount > 0) {
                    badge.style.display = "inline-block";
                    badge.textContent = openCount;
                } else {
                    badge.style.display = "none";
                }
            }
        }

        if (!Array.isArray(doubts) || doubts.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:40px 20px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:12px;color:#64748B;">
                    <div style="font-size:32px;margin-bottom:8px;">🎉</div>
                    <strong style="color:#0F172A;font-size:15px;display:block;margin-bottom:4px;">No student doubts found</strong>
                    <span style="font-size:13px;">${statusFilter === "OPEN" ? "All questions have been answered!" : "Students have not asked any doubts yet."}</span>
                </div>
            `;
            return;
        }

        container.innerHTML = doubts.map(doubt => {
            const isAnswered = Boolean(doubt.facultyReply) || doubt.status === "RESOLVED" || doubt.status === "ANSWERED";
            
            let replySectionHtml = "";
            if (isAnswered) {
                replySectionHtml = `
                    <div class="faculty-reply-active-box" id="activeReplyBox_${escapeHTML(doubt.id)}">
                        <div class="head">
                            <span>🎓 Answered by ${escapeHTML(doubt.repliedBy || "Faculty")} (${escapeHTML(timeAgoFaculty(doubt.repliedAt))})</span>
                            <button type="button" class="action-delete-btn" style="color:#0D3E36;font-size:12px;text-decoration:none;" onclick="toggleEditDoubtReply('${escapeHTML(doubt.id)}')">✏️ Edit Answer</button>
                        </div>
                        <p>${escapeHTML(doubt.facultyReply)}</p>
                    </div>

                    <!-- Hidden Edit Form -->
                    <div class="faculty-reply-section" id="editReplyForm_${escapeHTML(doubt.id)}" style="display:none;">
                        <textarea class="faculty-reply-textarea" id="replyInput_${escapeHTML(doubt.id)}" rows="3">${escapeHTML(doubt.facultyReply)}</textarea>
                        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                            <button type="button" class="btn-ghost" style="font-size:12px;padding:5px 12px;" onclick="toggleEditDoubtReply('${escapeHTML(doubt.id)}')">Cancel</button>
                            <button type="button" class="faculty-reply-btn" onclick="submitFacultyReply('${escapeHTML(doubt.id)}')">Update Answer</button>
                        </div>
                    </div>
                `;
            } else {
                replySectionHtml = `
                    <div class="faculty-reply-section">
                        <textarea class="faculty-reply-textarea" id="replyInput_${escapeHTML(doubt.id)}" placeholder="Write your official response to help this student..." rows="3"></textarea>
                        <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                            <button type="button" class="faculty-reply-btn" onclick="submitFacultyReply('${escapeHTML(doubt.id)}')">
                                Send Answer to Student ➤
                            </button>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="faculty-doubt-card" id="card_doubt_${escapeHTML(doubt.id)}">
                    <div class="faculty-doubt-top">
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                            <span class="lecture-context-pill">
                                📚 ${escapeHTML(doubt.lectureTitle || "Lecture")}
                            </span>
                            <div class="student-meta-inline">
                                <span class="student-meta-name">${escapeHTML(doubt.studentName || "Student")}</span>
                                <span>·</span>
                                <span>${escapeHTML(doubt.studentEmail || "")}</span>
                                <span>·</span>
                                <span>${escapeHTML(timeAgoFaculty(doubt.createdAt))}</span>
                            </div>
                        </div>
                        <div>
                            <span class="chip-ai ${isAnswered ? 'done' : 'pending'}">
                                ${isAnswered ? '✓ Answered' : '⏳ Pending Reply'}
                            </span>
                        </div>
                    </div>
                    
                    <p class="faculty-doubt-q">
                        <strong>Q:</strong> ${escapeHTML(doubt.question)}
                    </p>

                    ${replySectionHtml}
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Could not load faculty doubts:", err);
        container.innerHTML = `<p style="color:#B91C1C;padding:16px;">Failed to load doubts. Please verify the backend is running.</p>`;
    }
};

window.toggleEditDoubtReply = function(doubtId) {
    const activeBox = document.getElementById(`activeReplyBox_${doubtId}`);
    const editForm = document.getElementById(`editReplyForm_${doubtId}`);
    if (!editForm) return;

    if (editForm.style.display === "none") {
        editForm.style.display = "block";
        if (activeBox) activeBox.style.display = "none";
    } else {
        editForm.style.display = "none";
        if (activeBox) activeBox.style.display = "block";
    }
};

window.submitFacultyReply = async function(doubtId) {
    const textarea = document.getElementById(`replyInput_${doubtId}`);
    const msgEl = document.getElementById("doubtReplyMessage");
    const replyText = (textarea?.value || "").trim();

    if (!replyText) {
        alert("Please type a response before submitting.");
        return;
    }

    const facultyName = currentUser?.name || currentUser?.fullName || "Prof. Faculty";
    const facultyEmail = currentUser?.email || "faculty@walchandsangli.ac.in";

    try {
        const res = await fetch(`${API_URL}/doubts/${encodeURIComponent(doubtId)}/reply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-User-Name": facultyName,
                "X-User-Email": facultyEmail
            },
            body: JSON.stringify({
                reply: replyText,
                facultyName: facultyName,
                facultyEmail: facultyEmail
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            alert(errData.message || "Failed to send reply.");
            return;
        }

        if (msgEl) {
            msgEl.textContent = "Reply sent successfully! Student can now view it.";
            msgEl.className = "msg-banner success";
            msgEl.style.display = "block";
            setTimeout(() => { msgEl.style.display = "none"; }, 4000);
        }

        await loadFacultyDoubts();

    } catch (err) {
        console.error("Error replying to doubt:", err);
        alert("Network error connecting to backend server.");
    }
};

/* ========================================================
   COURSE MATERIALS & ASSIGNMENTS (PHASE 3)
   ======================================================== */
window.toggleMaterialUploadForm = function() {
    const card = document.getElementById("materialUploadCard");
    if (!card) return;
    card.style.display = card.style.display === "none" ? "block" : "none";
};

window.toggleAssignmentDeadline = function(isAssignment) {
    const wrap = document.getElementById("matDeadlineWrap");
    const input = document.getElementById("matDeadline");
    if (!wrap) return;
    wrap.style.display = isAssignment ? "block" : "none";
    if (input) input.required = isAssignment;
};

window.handleMaterialUpload = async function(event) {
    if (event) event.preventDefault();

    const title = document.getElementById("matTitle")?.value.trim();
    const subject = document.getElementById("matSubject")?.value;
    const desc = document.getElementById("matDescription")?.value.trim();
    const fileInput = document.getElementById("matFileInput");
    const isAssignment = Boolean(document.getElementById("matIsAssignment")?.checked);
    const deadlineVal = document.getElementById("matDeadline")?.value;
    const submitBtn = document.getElementById("matSubmitBtn");
    const msgEl = document.getElementById("materialMsg");

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Please select a file to upload.");
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("subjectName", subject);
    if (desc) formData.append("description", desc);
    formData.append("isAssignment", String(isAssignment));

    if (isAssignment && deadlineVal) {
        formData.append("deadline", new Date(deadlineVal).toISOString());
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Uploading to Cloudinary...";
    }

    try {
        const res = await fetch(`${API_URL}/materials/upload`, {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.message || "Failed to upload material.");
            return;
        }

        if (msgEl) {
            msgEl.textContent = `✓ Successfully uploaded "${title}" and notified students!`;
            msgEl.className = "msg-banner success";
            msgEl.style.display = "block";
            setTimeout(() => { msgEl.style.display = "none"; }, 5000);
        }

        // Reset form
        document.getElementById("materialForm")?.reset();
        window.toggleMaterialUploadForm();
        window.toggleAssignmentDeadline(false);

        await loadFacultyMaterials();

    } catch (err) {
        console.error("Material upload error:", err);
        alert("Upload failed. Verify network connection and file size.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Upload & Notify Students";
        }
    }
};

window.loadFacultyMaterials = async function() {
    const container = document.getElementById("facultyMaterialsContainer");
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/materials`);
        if (!res.ok) throw new Error("Could not load");
        const list = await res.json();

        if (!Array.isArray(list) || list.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:36px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:12px;color:#64748B;">
                    <div style="font-size:32px;margin-bottom:8px;">📄</div>
                    <strong style="color:#0F172A;font-size:15px;display:block;margin-bottom:4px;">No materials uploaded yet</strong>
                    <span style="font-size:13px;">Upload reference notes, PDFs or assignments for your students above.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                ${list.map(item => `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;gap:16px;">
                        <div style="display:flex;align-items:center;gap:14px;min-width:0;">
                            <div style="width:40px;height:40px;border-radius:8px;background:${item.isAssignment ? '#FEF3C7' : '#E0F2FE'};color:${item.isAssignment ? '#B45309' : '#0369A1'};display:grid;place-items:center;font-weight:800;font-size:12px;flex-shrink:0;">
                                ${escapeHTML(item.fileType || "PDF")}
                            </div>
                            <div style="min-width:0;">
                                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                    <strong style="color:#0F172A;font-size:15px;">${escapeHTML(item.title)}</strong>
                                    ${item.isAssignment ? '<span style="background:#FEF3C7;color:#92400E;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;">📝 Assignment</span>' : ''}
                                    <span style="background:#F1F5F9;color:#475569;font-size:11.5px;padding:2px 8px;border-radius:6px;">${escapeHTML(item.subjectName || "General")}</span>
                                </div>
                                <p style="font-size:13px;color:#64748B;margin:3px 0 0 0;line-height:1.4;">${escapeHTML(item.description || "No description")}</p>
                                ${item.isAssignment && item.deadline ? `<span style="font-size:12px;color:#D97706;font-weight:600;display:block;margin-top:4px;">⏰ Due: ${new Date(item.deadline).toLocaleString()}</span>` : ''}
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                            <a href="${escapeHTML(item.fileUrl)}" target="_blank" download class="btn-outline" style="font-size:12.5px;padding:6px 14px;text-decoration:none;">📥 Open</a>
                            <button type="button" class="btn-ghost" style="color:#EF4444;font-size:12.5px;padding:6px 10px;" onclick="deleteFacultyMaterial('${item.id}')">🗑</button>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;

    } catch (err) {
        container.innerHTML = `<p style="color:#EF4444;padding:16px;">Failed to load materials.</p>`;
    }
};

window.deleteFacultyMaterial = async function(id) {
    if (!confirm("Are you sure you want to delete this material?")) return;
    try {
        const res = await fetch(`${API_URL}/materials/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (res.ok) {
            loadFacultyMaterials();
        } else {
            alert("Could not delete material.");
        }
    } catch {
        alert("Network error.");
    }
};

/* ========================================================
   ANNOUNCEMENTS (PHASE 3)
   ======================================================== */
window.handlePostAnnouncement = async function(event) {
    if (event) event.preventDefault();

    const title = document.getElementById("annTitle")?.value.trim();
    const content = document.getElementById("annContent")?.value.trim();
    const subject = document.getElementById("annSubject")?.value;
    const submitBtn = document.getElementById("annSubmitBtn");
    const msgEl = document.getElementById("announcementMsg");

    if (!title || !content) {
        alert("Please provide both title and content.");
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Broadcasting...";
    }

    try {
        const res = await fetch(`${API_URL}/announcements`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: title,
                content: content,
                subjectName: subject,
                branch: "ALL"
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(err.message || "Failed to post announcement.");
            return;
        }

        if (msgEl) {
            msgEl.textContent = "✓ Announcement broadcasted! Notifications and emails dispatched.";
            msgEl.className = "msg-banner success";
            msgEl.style.display = "block";
            setTimeout(() => { msgEl.style.display = "none"; }, 5000);
        }

        document.getElementById("announcementForm")?.reset();
        await loadFacultyAnnouncements();

    } catch (err) {
        alert("Network error posting announcement.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "📢 Post Announcement";
        }
    }
};

window.loadFacultyAnnouncements = async function() {
    const container = document.getElementById("facultyAnnouncementsContainer");
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/announcements`);
        if (!res.ok) throw new Error("Failed to load");
        const list = await res.json();

        if (!Array.isArray(list) || list.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:36px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:12px;color:#64748B;">
                    <div style="font-size:32px;margin-bottom:8px;">📢</div>
                    <strong style="color:#0F172A;font-size:15px;display:block;margin-bottom:4px;">No announcements posted</strong>
                    <span style="font-size:13px;">Broadcast a notice above to inform your students.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:14px;">
                ${list.map(item => `
                    <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:18px 20px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <span style="background:#0D3E36;color:#FFFFFF;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;">📢 Notice</span>
                                <strong style="font-size:16px;color:#0F172A;">${escapeHTML(item.title)}</strong>
                                <span style="background:#F1F5F9;color:#64748B;font-size:12px;padding:2px 8px;border-radius:6px;">${escapeHTML(item.subjectName || "All Subjects")}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <span style="font-size:12px;color:#94A3B8;">${new Date(item.createdAt).toLocaleDateString()}</span>
                                <button type="button" class="btn-ghost" style="color:#EF4444;font-size:12px;padding:4px 8px;" onclick="deleteFacultyAnnouncement('${item.id}')">🗑</button>
                            </div>
                        </div>
                        <p style="font-size:14px;color:#334155;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHTML(item.content)}</p>
                    </div>
                `).join("")}
            </div>
        `;

    } catch (err) {
        container.innerHTML = `<p style="color:#EF4444;padding:16px;">Failed to load announcements.</p>`;
    }
};

window.deleteFacultyAnnouncement = async function(id) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
        const res = await fetch(`${API_URL}/announcements/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (res.ok) {
            loadFacultyAnnouncements();
        } else {
            alert("Could not delete announcement.");
        }
    } catch {
        alert("Network error.");
    }
};
