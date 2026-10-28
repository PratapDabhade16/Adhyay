// =========================================
// ADHYAY — Faculty Dashboard
// Complete Drag-and-Drop & File Upload System
// =========================================

const API_URL = "http://localhost:8081/api";
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

function displayLectures(lectures) {
    const tbody = document.getElementById("lecturesTableBody");
    if (!tbody) return;

    const list = Array.isArray(lectures) ? lectures : [];

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;color:var(--muted);padding:32px;">
                    No lectures uploaded yet. Drop a recording above to upload your first lecture.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";
    list.forEach(lecture => {
        const id = lecture.id || lecture._id || "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight:600;color:var(--text);">${escapeHTML(lecture.title || "Untitled")}</td>
            <td style="color:var(--muted);">${escapeHTML(lecture.subject || "General")}</td>
            <td style="color:var(--muted);">Unit ${escapeHTML(String(lecture.unit ?? "—"))}</td>
            <td style="text-align:right;">
                <button class="action-delete-btn" type="button" data-action="delete" data-id="${escapeHTML(id)}">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/* =========================================
   DELETE LECTURE
========================================= */
function setupLectureListActions() {
    document.addEventListener("click", async (e) => {
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
        const res = await fetch("http://localhost:8081/api/moodle/courses");
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
        courses: document.getElementById("moodlePanel")
    };

    navItems.forEach(btn => {
        btn.addEventListener("click", () => {
            navItems.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const page = btn.getAttribute("data-page");
            const targetEl = targets[page];
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
                targetEl.style.transition = "box-shadow 0.3s ease";
                targetEl.style.boxShadow = "0 0 0 2px var(--green-mid)";
                setTimeout(() => {
                    targetEl.style.boxShadow = "";
                }, 1200);
            }
        });
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("adhyayUser");
            window.location.href = "login.html";
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
