// =========================================
// ADHYAY — Admin Dashboard
// =========================================

const API = "http://localhost:8081/api";

async function loadStatsAndUsers() {
    const totalLecturesEl = document.getElementById("totalLectures");
    const studentCountEl = document.getElementById("studentCount");
    const facultyCountEl = document.getElementById("facultyCount");
    const userTableBody = document.getElementById("userTableBody");

    let students = [];
    let faculties = [];
    let lectures = [];

    // 1. Fetch Lectures
    try {
        const response = await fetch(`${API}/lectures`);
        if (response.ok) {
            lectures = await response.json();
            if (totalLecturesEl) totalLecturesEl.textContent = String(lectures.length);
        } else {
            if (totalLecturesEl) totalLecturesEl.textContent = "0";
        }
    } catch {
        if (totalLecturesEl) totalLecturesEl.textContent = "0";
    }

    // 2. Fetch Students
    try {
        const response = await fetch(`${API}/admin/users?role=STUDENT`);
        if (response.ok) {
            students = await response.json();
            if (studentCountEl) studentCountEl.textContent = String(students.length);
        } else {
            if (studentCountEl) studentCountEl.textContent = "0";
        }
    } catch {
        if (studentCountEl) studentCountEl.textContent = "0";
    }

    // 3. Fetch Faculty
    try {
        const response = await fetch(`${API}/admin/users?role=FACULTY`);
        if (response.ok) {
            faculties = await response.json();
            if (facultyCountEl) facultyCountEl.textContent = String(faculties.length);
        } else {
            if (facultyCountEl) facultyCountEl.textContent = "0";
        }
    } catch {
        if (facultyCountEl) facultyCountEl.textContent = "0";
    }

    // 4. Render User Directory Table
    if (userTableBody) {
        userTableBody.innerHTML = "";
        const allUsers = [...students, ...faculties];

        if (allUsers.length === 0) {
            userTableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center;color:var(--muted);padding:36px;">
                        No registered users yet. Accounts created in ADHYAY will appear here.
                    </td>
                </tr>
            `;
            return;
        }

        allUsers.forEach(user => {
            const row = document.createElement("tr");
            const role = (user.role || "Student").toUpperCase();
            const isFaculty = role === "FACULTY";
            const initial = (user.name || "U").charAt(0).toUpperCase();

            row.innerHTML = `
                <td>
                    <div class="user-avatar-cell">
                        <div class="user-cell-circle" style="${isFaculty ? 'background:#FDF3D8;color:#8A5B00;' : ''}">${escapeHTML(initial)}</div>
                        <strong>${escapeHTML(user.name || "Unnamed")}</strong>
                    </div>
                </td>
                <td style="color:var(--text-2);">${escapeHTML(user.email || "—")}</td>
                <td>
                    <span class="chip ${isFaculty ? 'chip-amber' : 'chip-green'}">
                        ${isFaculty ? 'Faculty' : 'Student'}
                    </span>
                </td>
                <td style="color:var(--muted);">Registered</td>
            `;
            userTableBody.appendChild(row);
        });
    }
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

document.addEventListener("DOMContentLoaded", () => {
    // Current admin user check
    const stored = localStorage.getItem("adhyayUser");
    if (!stored) {
        window.location.href = "login.html";
        return;
    }

    let user = null;
    try {
        user = JSON.parse(stored);
    } catch {
        localStorage.removeItem("adhyayUser");
        window.location.href = "login.html";
        return;
    }

    const role = String(user?.role || "").toUpperCase();
    if (role !== "ADMIN") {
        if (role === "FACULTY") {
            window.location.href = "faculty-dashboard.html";
        } else if (role === "STUDENT") {
            window.location.href = "student-dashboard.html";
        } else {
            window.location.href = "login.html";
        }
        return;
    }

    const nameEl = document.querySelector(".sidebar-user-name");
    if (nameEl && user.name) nameEl.textContent = user.name;

    loadStatsAndUsers();

    // User Search filter
    const searchInput = document.getElementById("userSearch");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            const rows = document.querySelectorAll("#userTableBody tr");
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? "" : "none";
            });
        });
    }
});
