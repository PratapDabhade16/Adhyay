const API_URL = "http://localhost:8080";

let currentUser = null;


/* =========================
   PAGE LOAD
========================= */

document.addEventListener("DOMContentLoaded", () => {

    const storedUser = localStorage.getItem("adhyayUser");

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


    if (currentUser.role !== "FACULTY") {

        alert("Faculty access required.");

        window.location.href = "login.html";

        return;
    }


    displayUser();

    setupFileSelection();

    setupUploadForm();

    setupLogout();

    loadLectures();

});


/* =========================
   DISPLAY USER
========================= */

function displayUser() {

    const name =
        currentUser.name ||
        currentUser.email ||
        "Faculty";

    document.getElementById("facultyName").textContent = name;

    document.getElementById("welcomeName").textContent = name;

}


/* =========================
   FILE SELECTION
========================= */

function setupFileSelection() {

    const videoInput =
        document.getElementById("video");

    const selectedFile =
        document.getElementById("selectedFile");


    videoInput.addEventListener("change", () => {

        const file = videoInput.files[0];

        if (!file) {

            selectedFile.textContent =
                "No video selected";

            selectedFile.classList.remove("selected");

            return;
        }


        const sizeMB =
            (file.size / (1024 * 1024)).toFixed(2);


        selectedFile.textContent =
            `${file.name} — ${sizeMB} MB`;

        selectedFile.classList.add("selected");

    });

}


/* =========================
   UPLOAD FORM
========================= */

function setupUploadForm() {

    const form =
        document.getElementById("uploadForm");


    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        await uploadLecture();

    });

}


/* =========================
   UPLOAD LECTURE
========================= */

function uploadLecture() {

    return new Promise((resolve) => {

        const video =
            document.getElementById("video").files[0];

        const title =
            document.getElementById("title").value.trim();

        const description =
            document.getElementById("description").value.trim();

        const subject =
            document.getElementById("subject").value.trim();

        const unit =
            document.getElementById("unit").value;

        const lectureNumber =
            document.getElementById("lectureNumber").value;


        if (!video) {

            showMessage(
                "Please select a lecture video.",
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

        formData.append(
            "uploadedBy",
            currentUser.email || currentUser.name
        );


        const xhr = new XMLHttpRequest();

        xhr.open(
            "POST",
            `${API_URL}/api/lectures/upload`
        );


        /* =========================
           PROGRESS
        ========================= */

        xhr.upload.addEventListener(
            "progress",
            (event) => {

                if (!event.lengthComputable) {
                    return;
                }

                const percent =
                    Math.round(
                        (event.loaded / event.total) * 100
                    );


                document.getElementById(
                    "progressContainer"
                ).style.display = "block";


                const progress =
                    document.getElementById(
                        "uploadProgress"
                    );


                progress.style.width =
                    `${percent}%`;

                progress.textContent =
                    `${percent}%`;


                document.getElementById(
                    "uploadStatus"
                ).textContent =
                    percent < 100
                        ? `Uploading video... ${percent}%`
                        : "Processing video...";
            }
        );


        /* =========================
           SUCCESS
        ========================= */

        xhr.onload = () => {

            setLoading(false);


            if (
                xhr.status >= 200 &&
                xhr.status < 300
            ) {

                showMessage(
                    "Lecture uploaded successfully to Cloudinary!",
                    "success"
                );


                document.getElementById(
                    "uploadForm"
                ).reset();


                document.getElementById(
                    "selectedFile"
                ).textContent =
                    "No video selected";


                document.getElementById(
                    "selectedFile"
                ).classList.remove("selected");


                document.getElementById(
                    "progressContainer"
                ).style.display = "none";


                loadLectures();

            } else {

                let errorMessage =
                    "Lecture upload failed.";

                try {

                    errorMessage =
                        JSON.parse(xhr.responseText);

                } catch (_) {

                    if (xhr.responseText) {
                        errorMessage =
                            xhr.responseText;
                    }

                }


                showMessage(
                    errorMessage,
                    "error"
                );

            }

            resolve();

        };


        /* =========================
           NETWORK ERROR
        ========================= */

        xhr.onerror = () => {

            setLoading(false);

            showMessage(
                "Cannot connect to the ADHYAY backend.",
                "error"
            );

            resolve();

        };


        setLoading(true);

        xhr.send(formData);

    });

}


/* =========================
   LOADING STATE
========================= */

function setLoading(loading) {

    const button =
        document.getElementById("uploadBtn");

    const buttonText =
        document.getElementById("uploadBtnText");

    const spinner =
        document.getElementById("uploadSpinner");


    button.disabled = loading;

    if (loading) {

        buttonText.textContent =
            "Uploading...";

        spinner.style.display =
            "inline-block";

    } else {

        buttonText.textContent =
            "Upload Lecture";

        spinner.style.display =
            "none";
    }

}


/* =========================
   LOAD LECTURES
========================= */

async function loadLectures() {

    const list =
        document.getElementById("lectureList");


    try {

        const response =
            await fetch(
                `${API_URL}/api/lectures/faculty/${encodeURIComponent(
                    currentUser.email || currentUser.name
                )}`
            );


        if (!response.ok) {
            throw new Error(
                "Failed to load lectures"
            );
        }


        const lectures =
            await response.json();


        displayLectures(lectures);

    } catch (error) {

        console.error(error);

        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h4>Unable to load lectures</h4>
                <p>Make sure the backend is running.</p>
            </div>
        `;

    }

}


/* =========================
   DISPLAY LECTURES
========================= */

function displayLectures(lectures) {

    const list =
        document.getElementById("lectureList");


    document.getElementById(
        "totalLectures"
    ).textContent = lectures.length;


    document.getElementById(
        "uploadedVideos"
    ).textContent = lectures.length;


    const subjects =
        new Set(
            lectures.map(
                lecture => lecture.subject
            )
        );


    document.getElementById(
        "subjectCount"
    ).textContent = subjects.size;


    if (!lectures.length) {

        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎥</div>
                <h4>No lectures uploaded yet</h4>
                <p>
                    Your uploaded lectures will appear here.
                </p>
            </div>
        `;

        return;
    }


    list.innerHTML = "";


    lectures
        .sort(
            (a, b) =>
                a.lectureNumber - b.lectureNumber
        )
        .forEach(lecture => {

            const item =
                document.createElement("div");

            item.className =
                "lecture-item";


            item.innerHTML = `

                <div class="lecture-info">

                    <h4>
                        Lecture ${lecture.lectureNumber}:
                        ${escapeHtml(lecture.title)}
                    </h4>

                    <div class="lecture-meta">

                        ${escapeHtml(lecture.subject)}
                        •
                        ${escapeHtml(lecture.unit)}

                    </div>

                </div>


                <div class="lecture-actions">

                    <a
                        class="watch-btn"
                        href="${lecture.videoUrl}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ▶ Watch
                    </a>


                    <button
                        class="delete-btn"
                        onclick="deleteLecture('${lecture.id}')"
                    >
                        Delete
                    </button>

                </div>
            `;


            list.appendChild(item);

        });

}


/* =========================
   DELETE
========================= */

async function deleteLecture(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this lecture?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/api/lectures/${id}`,
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.text();


        if (!response.ok) {
            throw new Error(result);
        }


        showMessage(
            "Lecture deleted successfully.",
            "success"
        );


        loadLectures();

    } catch (error) {

        showMessage(
            error.message ||
            "Unable to delete lecture.",
            "error"
        );

    }

}


/* =========================
   LOGOUT
========================= */

function setupLogout() {

    document
        .getElementById("logoutBtn")
        .addEventListener("click", () => {

            localStorage.removeItem(
                "adhyayUser"
            );

            window.location.href =
                "login.html";

        });

}


/* =========================
   MESSAGE
========================= */

function showMessage(message, type) {

    const element =
        document.getElementById("message");


    element.textContent = message;

    element.className =
        `message ${type}`;


    setTimeout(() => {

        element.className =
            "message";

        element.textContent =
            "";

    }, 6000);

}


/* =========================
   HTML SAFETY
========================= */

function escapeHtml(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}