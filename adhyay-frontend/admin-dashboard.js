
const API = "http://localhost:8081/api";

async function loadLectures() {
    const count = document.getElementById("totalLectures");

    try {
        const response = await fetch(`${API}/lectures`);
        if (!response.ok) throw new Error();

        const lectures = await response.json();
        count.textContent = lectures.length;
    } catch {
        count.textContent = "Unavailable";
    }
}

async function loadUsers(role, containerId) {
    const container = document.getElementById(containerId);

    container.textContent = "Loading...";

    try {
        const response = await fetch(
            `${API}/admin/users?role=${role}`
        );

        if (!response.ok) throw new Error();

        const users = await response.json();
        container.replaceChildren();

        if (users.length === 0) {
            container.textContent = `No ${role.toLowerCase()} records found.`;
            return;
        }

        users.forEach(user => {
            const card = document.createElement("div");
            card.className = "course-card";

            const name = document.createElement("strong");
            name.textContent = user.name || "Unnamed user";

            const email = document.createElement("p");
            email.textContent = user.email || "No email available";

            card.append(name, email);
            container.appendChild(card);
        });
    } catch {
        container.textContent =
            "Unable to load records. Please check the backend.";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadLectures();

    loadUsers("STUDENT", "student-records");
    loadUsers("FACULTY", "faculty-records");
});
