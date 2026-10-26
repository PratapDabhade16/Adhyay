
/* =========================================
   ADHYAY - Faculty Dashboard
   File: faculty-dashboard.js
   ========================================= */

const API_URL = "http://localhost:8081/api";

const UPLOAD_TIMEOUT = 5 * 60 * 1000; // 5 minutes

let currentUser = null;
let uploadInProgress = false;

/* =========================================
   PAGE INITIALIZATION
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    loadLectures();
    loadUsers("STUDENT", "student-records");
    loadUsers("FACULTY", "faculty-records");
});

    if (!storedUser) {
        window.location.href = "login.html";
        return;
    }

    try {
        currentUser = JSON.parse(storedUser);
    } catch (error) {
        localStorage.removeItem("adhyayUser");
        window.location.href = "login.html";
        return;
    }

    if (
        !currentUser ||
        String(currentUser.role || "").toUpperCase() !== "FACULTY"
    ) {
        alert("Faculty access required.");
        window.location.href = "login.html";
        return;
    }

    displayUser();
    setupFileSelection();
    setupUploadForm();
    setupLogout();
    setupLectureListActions();

    await loadLectures();
});

/* =========================================
   DISPLAY FACULTY DETAILS
========================================= */

function displayUser() {
    const name =
        currentUser.name ||
        currentUser.fullName ||
        currentUser.email ||
        "Faculty";

    const facultyName = document.getElementById("facultyName");
    const welcomeName = document.getElementById("welcomeName");

    if (facultyName) {
        facultyName.textContent = name;
    }

    if (welcomeName) {
        welcomeName.textContent = name;
    }
}

/* =========================================
   FILE SELECTION
========================================= */

function setupFileSelection() {
    const videoInput = document.getElementById("video");
    const selectedFile = document.getElementById("selectedFile");

    if (!videoInput || !selectedFile) {
        console.error("Video input or selected-file display is missing.");
        return;
    }

    videoInput.addEventListener("change", () => {
        const file = videoInput.files?.[0];

        if (!file) {
            selectedFile.textContent = "No video selected";
            selectedFile.classList.remove("selected");
            return;
        }

        const sizeMB = file.size / (1024 * 1024);
        const extension = file.name.split(".").pop().toLowerCase();

        const allowedExtensions = [
            "mp4", "mov", "avi", "webm", "mkv", "m4v"
        ];

        if (!allowedExtensions.includes(extension)) {
            showMessage(
                "Unsupported video format. Choose MP4, MOV, AVI, WebM, MKV, or M4V.",
                "error"
            );

            videoInput.value = "";
            selectedFile.textContent = "No video selected";
            selectedFile.classList.remove("selected");
            return;
        }

        if (file.size === 0) {
            showMessage("The selected video file is empty.", "error");
            videoInput.value = "";
            selectedFile.textContent = "No video selected";
            selectedFile.classList.remove("selected");
            return;
        }

        if (sizeMB > 500) {
            showMessage(
                "The video exceeds the configured 500 MB limit.",
                "error"
            );

            videoInput.value = "";
            selectedFile.textContent = "No video selected";
            selectedFile.classList.remove("selected");
            return;
        }

        clearMessage();

        selectedFile.textContent =
            `${file.name} — ${sizeMB.toFixed(2)} MB`;

        selectedFile.classList.add("selected");
    });
}

/* =========================================
   UPLOAD FORM
========================================= */

function setupUploadForm() {
    const form = document.getElementById("uploadForm");

    if (!form) {
        console.error("Upload form was not found.");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (uploadInProgress) {
            return;
        }

        await uploadLecture();
    });
}

/* =========================================
   UPLOAD LECTURE
========================================= */

function uploadLecture() {
    return new Promise((resolve) => {
        const videoInput = document.getElementById("video");
        const titleInput = document.getElementById("title");
        const descriptionInput = document.getElementById("description");
        const subjectInput = document.getElementById("subject");
        const unitInput = document.getElementById("unit");
        const lectureNumberInput =
            document.getElementById("lectureNumber");

        if (
            !videoInput ||
            !titleInput ||
            !descriptionInput ||
            !subjectInput ||
            !unitInput ||
            !lectureNumberInput
        ) {
            showMessage(
                "Some upload form fields are missing. Check faculty-dashboard.html.",
                "error"
            );
            resolve();
            return;
        }

        const video = videoInput.files?.[0];
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const subject = subjectInput.value.trim();
        const unit = unitInput.value.trim();
        const lectureNumber = lectureNumberInput.value.trim();

        if (!video) {
            showMessage("Please select a lecture video.", "error");
            resolve();
            return;
        }

        if (!title || !subject || !unit || !lectureNumber) {
            showMessage(
                "Please fill in the title, subject, unit, and lecture number.",
                "error"
            );
            resolve();
            return;
        }

        if (
            !Number.isInteger(Number(lectureNumber)) ||
            Number(lectureNumber) < 1
        ) {
            showMessage(
                "Lecture number must be a positive whole number.",
                "error"
            );
            resolve();
            return;
        }

        const uploadedBy = currentUser.email || currentUser.name;

        if (!uploadedBy) {
            showMessage(
                "Faculty account information is missing. Please log in again.",
                "error"
            );
            resolve();
            return;
        }

        const formData = new FormData();

        formData.append("video", video);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("subject", subject);
        formData.append("unit", unit);
        formData.append("lectureNumber", lectureNumber);
        formData.append("uploadedBy", uploadedBy);

        const xhr = new XMLHttpRequest();
        let finished = false;

        function finish() {
            if (finished) return false;

            finished = true;
            uploadInProgress = false;
            setLoading(false);

            return true;
        }

        xhr.open("POST", `${API_URL}/lectures/upload`, true);

        // Prevent an indefinitely spinning upload interface.
        xhr.timeout = UPLOAD_TIMEOUT;

        xhr.setRequestHeader("Accept", "application/json");

        /* ----- Upload Progress ----- */

        xhr.upload.addEventListener("progress", (event) => {
            if (!event.lengthComputable) return;

            const percent = Math.min(
                100,
                Math.round((event.loaded / event.total) * 100)
            );

            const progressContainer =
                document.getElementById("progressContainer");

            const progressBar =
                document.getElementById("uploadProgress");

            const uploadStatus =
                document.getElementById("uploadStatus");

            if (progressContainer) {
                progressContainer.style.display = "block";
            }

            if (progressBar) {
                progressBar.style.width = `${percent}%`;
                progressBar.textContent = `${percent}%`;
                progressBar.setAttribute("aria-valuenow", String(percent));
            }

            if (uploadStatus) {
                uploadStatus.textContent =
                    percent < 100
                        ? `Sending video to server... ${percent}%`
                        : "Video sent. Waiting for Cloudinary and database confirmation...";
            }
        });

        /* ----- Server Response ----- */

        xhr.onload = async () => {
            if (!finish()) return;

            if (xhr.status >= 200 && xhr.status < 300) {
                showMessage(
                    "Lecture uploaded successfully! The server confirmed the upload.",
                    "success"
                );

                const form = document.getElementById("uploadForm");
                if (form) form.reset();

                const selectedFile =
                    document.getElementById("selectedFile");

                if (selectedFile) {
                    selectedFile.textContent = "No video selected";
                    selectedFile.classList.remove("selected");
                }

                const progressContainer =
                    document.getElementById("progressContainer");

                if (progressContainer) {
                    progressContainer.style.display = "none";
                }

                const uploadStatus =
                    document.getElementById("uploadStatus");

                if (uploadStatus) {
                    uploadStatus.textContent = "Upload complete.";
                }

                await loadLectures();
            } else {
                const serverMessage = parseServerError(xhr.responseText);

                showMessage(
                    `Upload failed (${xhr.status}): ${serverMessage}`,
                    "error"
                );

                const uploadStatus =
                    document.getElementById("uploadStatus");

                if (uploadStatus) {
                    uploadStatus.textContent = "Upload failed.";
                }
            }

            resolve();
        };

        /* ----- Network Failure ----- */

        xhr.onerror = () => {
            if (!finish()) return;

            showMessage(
                "Network error. Check that the backend is running on port 8081 and that your browser can reach it.",
                "error"
            );

            resolve();
        };

        /* ----- Timeout ----- */

        xhr.ontimeout = () => {
            if (!finish()) return;

            showMessage(
                "The upload timed out after 5 minutes. The backend or Cloudinary may still be processing the video. Check the backend console before retrying to avoid uploading a duplicate.",
                "error"
            );

            const uploadStatus =
                document.getElementById("uploadStatus");

            if (uploadStatus) {
                uploadStatus.textContent = "Upload timed out.";
            }

            resolve();
        };

        /* ----- Request Aborted ----- */

        xhr.onabort = () => {
            if (!finish()) return;

            showMessage(
                "The upload request was interrupted. Check the backend before retrying.",
                "error"
            );

            resolve();
        };

        uploadInProgress = true;
        setLoading(true);
        clearMessage();

        const progressContainer =
            document.getElementById("progressContainer");

        const progressBar =
            document.getElementById("uploadProgress");

        const uploadStatus =
            document.getElementById("uploadStatus");

        if (progressContainer) {
            progressContainer.style.display = "block";
        }

        if (progressBar) {
            progressBar.style.width = "0%";
            progressBar.textContent = "0%";
            progressBar.setAttribute("aria-valuenow", "0");
        }

        if (uploadStatus) {
            uploadStatus.textContent = "Preparing video upload...";
        }

        try {
            // Do not manually set Content-Type for FormData.
            // The browser must add the multipart boundary itself.
            xhr.send(formData);
        } catch (error) {
            finish();

            showMessage(
                `Could not start upload: ${error.message}`,
                "error"
            );

            resolve();
        }
    });
}

/* =========================================
   LOADING STATE
========================================= */

function setLoading(loading) {
    const button = document.getElementById("uploadBtn");
    const buttonText = document.getElementById("uploadBtnText");
    const spinner = document.getElementById("uploadSpinner");

    if (button) {
        button.disabled = loading;
    }

    if (buttonText) {
        buttonText.textContent = loading
            ? "Uploading..."
            : "Upload Lecture";
    }

    if (spinner) {
        spinner.style.display = loading
            ? "inline-block"
            : "none";
    }
}

/* =========================================
   LOAD FACULTY LECTURES
========================================= */

async function loadLectures() {
    const list = document.getElementById("lectureList");

    if (!list || !currentUser) return;

    list.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <h4>Loading lectures...</h4>
        </div>
    `;

    try {
        const uploadedBy = currentUser.email || currentUser.name;

        const response = await fetch(
            `${API_URL}/lectures/faculty/${encodeURIComponent(uploadedBy)}`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                `Server returned HTTP ${response.status}.`
            );
        }

        const result = await response.json();

        const lectures = Array.isArray(result)
            ? result
            : Array.isArray(result.content)
                ? result.content
                : Array.isArray(result.data)
                    ? result.data
                    : [];

        displayLectures(lectures);
    } catch (error) {
        console.error("Unable to load faculty lectures:", error);

        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h4>Unable to load lectures</h4>
                <p>Check your backend connection and try refreshing.</p>
            </div>
        `;
    }
}

/* =========================================
   DISPLAY FACULTY LECTURES
========================================= */

function displayLectures(lectures) {
    const list = document.getElementById("lectureList");

    if (!list) return;

    const validLectures = Array.isArray(lectures) ? lectures : [];

    const totalLectures = document.getElementById("totalLectures");
    const uploadedVideos = document.getElementById("uploadedVideos");
    const subjectCount = document.getElementById("subjectCount");

    if (totalLectures) {
        totalLectures.textContent = validLectures.length;
    }

    if (uploadedVideos) {
        uploadedVideos.textContent = validLectures.length;
    }

    const subjects = new Set(
        validLectures
            .map(lecture => String(lecture.subject || "").trim())
            .filter(Boolean)
    );

    if (subjectCount) {
        subjectCount.textContent = subjects.size;
    }

    if (validLectures.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎥</div>
                <h4>No lectures uploaded yet</h4>
                <p>Your uploaded lectures will appear here.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = "";

    [...validLectures]
        .sort((a, b) => Number(a.lectureNumber) - Number(b.lectureNumber))
        .forEach(lecture => {
            const item = document.createElement("div");
            item.className = "lecture-item";

            const lectureId = String(lecture.id ?? lecture._id ?? "");

            const info = document.createElement("div");
            info.className = "lecture-info";

            const heading = document.createElement("h4");
            heading.textContent =
                `Lecture ${lecture.lectureNumber ?? "—"}: ${lecture.title || "Untitled Lecture"}`;

            const meta = document.createElement("div");
            meta.className = "lecture-meta";
            meta.textContent =
                `${lecture.subject || "General"} • Unit ${lecture.unit ?? "—"}`;

            info.append(heading, meta);

            const actions = document.createElement("div");
            actions.className = "lecture-actions";

            if (lecture.videoUrl) {
                const watchLink = document.createElement("a");
                watchLink.className = "watch-btn";
                watchLink.href = lecture.videoUrl;
                watchLink.target = "_blank";
                watchLink.rel = "noopener noreferrer";
                watchLink.textContent = "▶ Watch";
                actions.appendChild(watchLink);
            }

            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-btn";
            deleteButton.type = "button";
            deleteButton.dataset.action = "delete";
            deleteButton.dataset.id = lectureId;
            deleteButton.textContent = "Delete";
            actions.appendChild(deleteButton);

            item.append(info, actions);
            list.appendChild(item);
        });
}

/* =========================================
   DELETE LECTURE
========================================= */

async function deleteLecture(id) {
    if (!id) {
        showMessage("Lecture ID is missing.", "error");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete this lecture?"
    );

    if (!confirmed) return;

    try {
        const response = await fetch(
            `${API_URL}/lectures/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        const result = await response.text();

        if (!response.ok) {
            throw new Error(result || `HTTP ${response.status}`);
        }

        showMessage("Lecture deleted successfully.", "success");
        await loadLectures();
    } catch (error) {
        console.error("Delete failed:", error);

        showMessage(
            error.message || "Unable to delete lecture.",
            "error"
        );
    }
}

function setupLectureListActions() {
    const list = document.getElementById("lectureList");

    if (!list) return;

    list.addEventListener("click", event => {
        const button = event.target.closest('[data-action="delete"]');

        if (button) {
            deleteLecture(button.dataset.id);
        }
    });
}

/* =========================================
   LOGOUT
========================================= */

function setupLogout() {
    const logoutButton = document.getElementById("logoutBtn");

    if (!logoutButton) return;

    logoutButton.addEventListener("click", () => {
        localStorage.removeItem("adhyayUser");
        window.location.href = "login.html";
    });
}

/* =========================================
   MESSAGES
========================================= */

function showMessage(message, type = "info") {
    const element = document.getElementById("message");

    if (!element) {
        console.log(message);
        return;
    }

    element.textContent = message;
    element.className = `message ${type}`;
}

function clearMessage() {
    const element = document.getElementById("message");

    if (!element) return;

    element.textContent = "";
    element.className = "message";
}

/* =========================================
   ERROR RESPONSE PARSER
========================================= */

function parseServerError(responseText) {
    if (!responseText) {
        return "The server did not provide an error message.";
    }

    try {
        const parsed = JSON.parse(responseText);

        if (typeof parsed === "string") {
            return parsed;
        }

        return (
            parsed.message ||
            parsed.error ||
            parsed.detail ||
            parsed.title ||
            responseText
        );
    } catch {
        return responseText;
    }
}
