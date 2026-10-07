// ===============================
// ADHYAY STUDENT DASHBOARD
// ===============================

// Get logged-in user
const storedUser = localStorage.getItem("adhyayUser");


// -------------------------------
// LOGIN CHECK
// -------------------------------

if (!storedUser) {

    window.location.href = "login.html";

} else {

    const user = JSON.parse(storedUser);

    // Security check
    if (user.role !== "STUDENT") {

        alert("Access denied. Student account required.");
        window.location.href = "login.html";

    } else {

        loadStudentData(user);
    }
}


// -------------------------------
// LOAD STUDENT INFORMATION
// -------------------------------

function loadStudentData(user) {

    const studentName = document.getElementById("studentName");
    const welcomeName = document.getElementById("welcomeName");

    if (studentName) {
        studentName.textContent = user.name;
    }

    if (welcomeName) {
        welcomeName.textContent = user.name;
    }
}


// -------------------------------
// SEARCH
// -------------------------------

function searchLectures() {

    const searchInput =
        document.getElementById("lectureSearch");

    const searchText =
        searchInput.value.toLowerCase().trim();

    console.log("Searching for:", searchText);

    // Real lecture search will be connected
    // to the Spring Boot API later.
}


// -------------------------------
// LOGOUT
// -------------------------------

function logout() {

    localStorage.removeItem("adhyayUser");

    window.location.href = "login.html";
}