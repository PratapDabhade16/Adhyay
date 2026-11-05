// =====================================================
// ADHYAY — Walchand College of Engineering
// Sign In & Account Registration with PRN NO & Branch
// Strict @walchandsangli.ac.in Domain Enforcement
// =====================================================

const API_URL = (window.ADHYAY_CONFIG && window.ADHYAY_CONFIG.AUTH_BASE)
    ? window.ADHYAY_CONFIG.AUTH_BASE
    : "http://localhost:8081/api/auth";
const REQUIRED_DOMAIN = "@walchandsangli.ac.in";

let selectedRole = "STUDENT";
let currentTab = "signin"; // 'signin' or 'create'

const ROLE_HINTS = {
    STUDENT: "Students watch, bookmark and ask doubts in lectures.",
    FACULTY: "Faculty upload lectures, manage courses and resolve doubts.",
    ADMIN: "Administrators manage campus users, courses and institutional access."
};

function isCollegeDomain(email) {
    if (!email) return false;
    return email.trim().toLowerCase().endsWith(REQUIRED_DOMAIN.toLowerCase());
}

function setTab(tab) {
    currentTab = tab;
    const tabSignIn = document.getElementById("tabSignIn");
    const tabCreate = document.getElementById("tabCreate");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const pageHeading = document.getElementById("pageHeading");
    const pageSubheading = document.getElementById("pageSubheading");
    const loginMessage = document.getElementById("loginMessage");
    const registerMessage = document.getElementById("registerMessage");

    clearMessage(loginMessage);
    clearMessage(registerMessage);

    if (tab === "signin") {
        if (tabSignIn) tabSignIn.classList.add("active");
        if (tabCreate) tabCreate.classList.remove("active");
        if (loginForm) loginForm.classList.remove("hidden");
        if (registerForm) registerForm.classList.add("hidden");

        if (pageHeading) pageHeading.textContent = "Sign In";
        if (pageSubheading) pageSubheading.textContent = "Enter your email and password to access your dashboard.";
    } else {
        if (tabCreate) tabCreate.classList.add("active");
        if (tabSignIn) tabSignIn.classList.remove("active");
        if (registerForm) registerForm.classList.remove("hidden");
        if (loginForm) loginForm.classList.add("hidden");

        if (pageHeading) pageHeading.textContent = "Create Account";
        if (pageSubheading) pageSubheading.textContent = "Fill in your details, PRN NO and Branch to register.";
    }
}

function setRole(role) {
    selectedRole = role;
    const roleButtons = document.querySelectorAll(".role-btn");
    const roleHintText = document.getElementById("roleHintText");
    const loginMessage = document.getElementById("loginMessage");
    const registerMessage = document.getElementById("registerMessage");

    roleButtons.forEach(btn => {
        if (btn.getAttribute("data-role") === role) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    if (roleHintText) {
        roleHintText.textContent = ROLE_HINTS[role] || ROLE_HINTS.STUDENT;
    }
    clearMessage(loginMessage);
    clearMessage(registerMessage);
}

function showMessage(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = `auth-message ${type}`;
    el.style.display = "block";
}

function clearMessage(el) {
    if (!el) return;
    el.textContent = "";
    el.className = "auth-message";
    el.style.display = "none";
}

function redirectByRole(role) {
    const normalized = String(role || "").toUpperCase();
    if (normalized === "FACULTY") {
        window.location.href = "faculty-dashboard.html";
    } else if (normalized === "ADMIN") {
        window.location.href = "admin-dashboard.html";
    } else {
        window.location.href = "student-dashboard.html";
    }
}

// Make functions globally available
window.setTab = setTab;
window.setRole = setRole;

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const loginMessage = document.getElementById("loginMessage");
    const registerMessage = document.getElementById("registerMessage");

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("tab") === "register" || urlParams.get("tab") === "create") {
        setTab("create");
    }

    // =====================================================
    // 1. SIGN IN SUBMIT
    // =====================================================
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearMessage(loginMessage);

            const emailInput = document.getElementById("loginEmail");
            const passwordInput = document.getElementById("loginPassword");
            const submitBtn = document.getElementById("loginButton");
            const btnText = document.getElementById("loginButtonText");

            const email = (emailInput?.value || "").trim().toLowerCase();
            const password = passwordInput?.value || "";

            if (!email) {
                showMessage(loginMessage, "Please enter your college email address.", "error");
                emailInput?.focus();
                return;
            }

            if (!isCollegeDomain(email)) {
                showMessage(loginMessage, `Access Denied: Only official ${REQUIRED_DOMAIN} college accounts are allowed.`, "error");
                emailInput?.focus();
                return;
            }

            if (!password) {
                showMessage(loginMessage, "Please enter your password.", "error");
                passwordInput?.focus();
                return;
            }

            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.textContent = "Signing In...";

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const msg = data.message || "Invalid email or password. If you don't have an account, click 'Create Account'.";
                    showMessage(loginMessage, msg, "error");
                    return;
                }

                setAuthSession(data);
                const user = data.user || data;
                const role = user.role || selectedRole;
                showMessage(loginMessage, `Welcome back, ${user.name || "User"}! Redirecting...`, "success");

                setTimeout(() => {
                    redirectByRole(role);
                }, 500);

            } catch (err) {
                console.error("Login failed:", err);
                showMessage(loginMessage, "Unable to connect to backend on port 8081.", "error");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (btnText) btnText.textContent = "Sign In";
            }
        });
    }

    // =====================================================
    // 2. CREATE ACCOUNT SUBMIT
    // =====================================================
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearMessage(registerMessage);

            const nameInput = document.getElementById("registerName");
            const emailInput = document.getElementById("registerEmail");
            const prnInput = document.getElementById("registerPrn");
            const branchInput = document.getElementById("registerBranch");
            const passwordInput = document.getElementById("registerPassword");
            const confirmPasswordInput = document.getElementById("confirmPassword");
            const submitBtn = document.getElementById("registerButton");
            const btnText = document.getElementById("registerButtonText");

            const name = (nameInput?.value || "").trim();
            const email = (emailInput?.value || "").trim().toLowerCase();
            const prn = (prnInput?.value || "").trim();
            const branch = (branchInput?.value || "Computer Science & Engineering").trim();
            const password = passwordInput?.value || "";
            const confirmPassword = confirmPasswordInput?.value || "";

            if (!name) {
                showMessage(registerMessage, "Please enter your full name.", "error");
                nameInput?.focus();
                return;
            }

            if (!email || !isCollegeDomain(email)) {
                showMessage(registerMessage, `Only official ${REQUIRED_DOMAIN} college emails can register.`, "error");
                emailInput?.focus();
                return;
            }

            if (!prn) {
                showMessage(registerMessage, "Please enter your PRN NO (WCE Roll/Registration number).", "error");
                prnInput?.focus();
                return;
            }

            if (!password || password.length < 6) {
                showMessage(registerMessage, "Password must be at least 6 characters long.", "error");
                passwordInput?.focus();
                return;
            }

            if (password !== confirmPassword) {
                showMessage(registerMessage, "Passwords do not match. Please re-enter.", "error");
                confirmPasswordInput?.focus();
                return;
            }

            if (submitBtn) submitBtn.disabled = true;
            if (btnText) btnText.textContent = "Creating Account...";

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                        role: selectedRole,
                        department: branch,
                        branch: branch,
                        rollNumber: prn,
                        prnNumber: prn
                    })
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    showMessage(registerMessage, data.message || "Registration failed. Email may already be registered.", "error");
                    return;
                }

                setAuthSession(data);
                const user = data.user || data;
                const role = user.role || selectedRole;
                showMessage(registerMessage, `Account created for ${user.name}! Taking you to your dashboard...`, "success");

                setTimeout(() => {
                    redirectByRole(role);
                }, 600);

            } catch (err) {
                console.error("Register failed:", err);
                showMessage(registerMessage, "Unable to connect to backend on port 8081.", "error");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (btnText) btnText.textContent = "Create Account";
            }
        });
    }
});