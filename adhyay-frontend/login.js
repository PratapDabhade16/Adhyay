// =====================================================
// ADHYAY — Institutional Authentication System
// Strict @walchandsangli.ac.in Domain Enforcement
// Instant Account Creation & Direct Sign In + Google SSO
// =====================================================

const API_URL = "http://localhost:8081/api/auth";
const REQUIRED_DOMAIN = "@walchandsangli.ac.in";

let selectedRole = "STUDENT";
let currentTab = "signin"; // 'signin' or 'create'

const ROLE_HINTS = {
    STUDENT: "Students watch, bookmark and ask doubts in lectures.",
    FACULTY: "Faculty upload lectures, manage courses and resolve doubts.",
    ADMIN: "Administrators manage campus users, courses and institutional access."
};

document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const tabSignIn = document.getElementById("tabSignIn");
    const tabCreate = document.getElementById("tabCreate");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    const pageHeading = document.getElementById("pageHeading");
    const pageSubheading = document.getElementById("pageSubheading");
    const roleHintText = document.getElementById("roleHintText");
    const roleButtons = document.querySelectorAll(".role-btn");
    const loginMessage = document.getElementById("loginMessage");
    const registerMessage = document.getElementById("registerMessage");
    const switchToRegister = document.getElementById("switchToRegister");
    const switchToLogin = document.getElementById("switchToLogin");
    const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

    // Google SSO Elements
    const googleSignInBtn = document.getElementById("googleSignInBtn");
    const googleModal = document.getElementById("googleModal");
    const btnCloseGoogleModal = document.getElementById("btnCloseGoogleModal");
    const quickWceAccount = document.getElementById("quickWceAccount");
    const btnGoogleCustomLogin = document.getElementById("btnGoogleCustomLogin");
    const googleCustomEmail = document.getElementById("googleCustomEmail");
    const googleModalMessage = document.getElementById("googleModalMessage");

    // =====================================================
    // HELPER: Validate @walchandsangli.ac.in Domain
    // =====================================================
    function isCollegeDomain(email) {
        if (!email) return false;
        return email.trim().toLowerCase().endsWith(REQUIRED_DOMAIN.toLowerCase());
    }

    // =====================================================
    // TAB SWITCHING
    // =====================================================
    function setTab(tab) {
        currentTab = tab;
        clearMessage(loginMessage);
        clearMessage(registerMessage);

        if (tab === "signin") {
            tabSignIn.classList.add("active");
            tabCreate.classList.remove("active");
            loginForm.classList.remove("hidden");
            registerForm.classList.add("hidden");

            if (pageHeading) pageHeading.textContent = "Sign in";
            if (pageSubheading) pageSubheading.textContent = "Use your Walchand College email to continue.";
        } else {
            tabCreate.classList.add("active");
            tabSignIn.classList.remove("active");
            registerForm.classList.remove("hidden");
            loginForm.classList.add("hidden");

            if (pageHeading) pageHeading.textContent = "Create your account";
            if (pageSubheading) pageSubheading.textContent = "Only @walchandsangli.ac.in college accounts can register.";
        }
    }

    if (tabSignIn) tabSignIn.addEventListener("click", () => setTab("signin"));
    if (tabCreate) tabCreate.addEventListener("click", () => setTab("create"));
    if (switchToRegister) switchToRegister.addEventListener("click", () => setTab("create"));
    if (switchToLogin) switchToLogin.addEventListener("click", () => setTab("signin"));

    // Role selector
    roleButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            roleButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedRole = btn.getAttribute("data-role") || "STUDENT";

            if (roleHintText) {
                roleHintText.textContent = ROLE_HINTS[selectedRole] || ROLE_HINTS.STUDENT;
            }

            clearMessage(loginMessage);
            clearMessage(registerMessage);
        });
    });

    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener("click", (e) => {
            e.preventDefault();
            alert("Please contact the Walchand College IT administrator to reset your college credentials.");
        });
    }

    // =====================================================
    // 1. SIGN IN SUBMIT (Direct & Instant)
    // =====================================================
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearMessage(loginMessage);

            const email = document.getElementById("loginEmail").value.trim().toLowerCase();
            const password = document.getElementById("loginPassword").value;
            const submitBtn = document.getElementById("loginButton");
            const btnText = document.getElementById("loginButtonText");

            if (!email) {
                showMessage(loginMessage, "Please enter your college email.", "error");
                document.getElementById("loginEmail").focus();
                return;
            }

            // Strict domain check
            if (!isCollegeDomain(email)) {
                showMessage(loginMessage, `Access restricted: Only official ${REQUIRED_DOMAIN} college accounts are permitted.`, "error");
                document.getElementById("loginEmail").focus();
                return;
            }

            if (!password) {
                showMessage(loginMessage, "Please enter your password.", "error");
                document.getElementById("loginPassword").focus();
                return;
            }

            submitBtn.disabled = true;
            if (btnText) btnText.textContent = "Signing in...";

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const errorMsg = data?.message || "Invalid email or password.";
                    showMessage(loginMessage, errorMsg, "error");
                    return;
                }

                // Successful direct sign-in
                const serverRole = String(data.role || selectedRole).toUpperCase();
                localStorage.setItem("adhyayUser", JSON.stringify(data));

                showMessage(loginMessage, `Welcome back! Redirecting to ${serverRole.toLowerCase()} dashboard...`, "success");

                setTimeout(() => {
                    redirectByRole(serverRole);
                }, 500);

            } catch (err) {
                console.error("Login check failed:", err);
                showMessage(loginMessage, "Unable to connect to backend on port 8081.", "error");
            } finally {
                submitBtn.disabled = false;
                if (btnText) btnText.textContent = "Sign in";
            }
        });
    }

    // =====================================================
    // 2. CREATE ACCOUNT SUBMIT (Direct & Instant)
    // =====================================================
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearMessage(registerMessage);

            const name = document.getElementById("registerName").value.trim();
            const department = document.getElementById("registerDept").value.trim();
            const email = document.getElementById("registerEmail").value.trim().toLowerCase();
            const password = document.getElementById("registerPassword").value;
            const confirmPassword = document.getElementById("confirmPassword").value;
            const termsAgree = document.getElementById("termsAgree")?.checked;
            const submitBtn = document.getElementById("registerButton");

            if (!name) {
                showMessage(registerMessage, "Please enter your full name.", "error");
                document.getElementById("registerName").focus();
                return;
            }

            // Strict domain check
            if (!email || !isCollegeDomain(email)) {
                showMessage(registerMessage, `Access restricted: Only official ${REQUIRED_DOMAIN} college accounts are permitted.`, "error");
                document.getElementById("registerEmail").focus();
                return;
            }

            if (!password || password.length < 6) {
                showMessage(registerMessage, "Password must be at least 6 characters.", "error");
                document.getElementById("registerPassword").focus();
                return;
            }

            if (password !== confirmPassword) {
                showMessage(registerMessage, "Passwords do not match. Please re-enter.", "error");
                document.getElementById("confirmPassword").focus();
                return;
            }

            if (!termsAgree) {
                showMessage(registerMessage, "Please agree to the Walchand College policies.", "error");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Creating account...";

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                        role: selectedRole,
                        department: department || "General"
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    showMessage(registerMessage, data.message || "Registration failed. Email may already be in use.", "error");
                    return;
                }

                // Account successfully registered! Auto-login
                const serverRole = String(data.role || selectedRole).toUpperCase();
                localStorage.setItem("adhyayUser", JSON.stringify(data));

                showMessage(registerMessage, `Account created successfully! Logging you into your dashboard...`, "success");

                setTimeout(() => {
                    redirectByRole(serverRole);
                }, 600);

            } catch (err) {
                console.error("Register failed:", err);
                showMessage(registerMessage, "Unable to connect to backend on port 8081.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Create account";
            }
        });
    }

    // =====================================================
    // 3. GOOGLE SSO WORKFLOW (@walchandsangli.ac.in restricted)
    // =====================================================
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener("click", () => {
            clearMessage(googleModalMessage);
            googleModal.classList.remove("hidden");
        });
    }

    if (btnCloseGoogleModal) {
        btnCloseGoogleModal.addEventListener("click", () => {
            googleModal.classList.add("hidden");
        });
    }

    // Quick account click
    if (quickWceAccount) {
        quickWceAccount.addEventListener("click", async () => {
            const email = document.getElementById("quickAccEmail").textContent.trim();
            const name = document.getElementById("quickAccName").textContent.trim();
            await executeGoogleLogin(email, name);
        });
    }

    // Custom WCE email click in modal
    if (btnGoogleCustomLogin) {
        btnGoogleCustomLogin.addEventListener("click", async () => {
            const email = googleCustomEmail.value.trim().toLowerCase();
            clearMessage(googleModalMessage);

            if (!email) {
                showMessage(googleModalMessage, "Please enter your college Google email.", "error");
                return;
            }

            if (!isCollegeDomain(email)) {
                showMessage(googleModalMessage, `Access Denied: Only official ${REQUIRED_DOMAIN} Google accounts are permitted.`, "error");
                return;
            }

            const inferredName = email.split("@")[0].replace(".", " ").replace(/\b\w/g, c => c.toUpperCase());
            await executeGoogleLogin(email, inferredName);
        });
    }

    async function executeGoogleLogin(email, name) {
        if (!isCollegeDomain(email)) {
            showMessage(googleModalMessage, `Access Denied: Only ${REQUIRED_DOMAIN} accounts allowed.`, "error");
            return;
        }

        showMessage(googleModalMessage, "Authenticating with Walchand College SSO...", "success");

        try {
            const response = await fetch(`${API_URL}/google-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    name,
                    role: selectedRole,
                    department: "Engineering"
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(googleModalMessage, data.message || "Google authentication failed.", "error");
                return;
            }

            localStorage.setItem("adhyayUser", JSON.stringify(data));
            showMessage(googleModalMessage, `Authenticated as ${data.name}! Redirecting...`, "success");

            setTimeout(() => {
                redirectByRole(data.role || selectedRole);
            }, 600);

        } catch (err) {
            console.error("Google login failed:", err);
            showMessage(googleModalMessage, "Unable to complete Google authentication.", "error");
        }
    }

    // =====================================================
    // UI HELPERS
    // =====================================================
    function showMessage(element, text, type) {
        if (!element) return;
        element.textContent = text;
        element.className = `login-message ${type}`;
        element.style.display = "block";
    }

    function clearMessage(element) {
        if (!element) return;
        element.textContent = "";
        element.className = "login-message";
        element.style.display = "none";
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
});