// =====================================================
// ADHYAY LOGIN SYSTEM
// =====================================================

const API_URL = "http://localhost:8080/api/auth";


// =====================================================
// CURRENT ROLE
// =====================================================

let selectedRole = "STUDENT";


// =====================================================
// ELEMENTS
// =====================================================

const roleButtons =
    document.querySelectorAll(".role-btn");

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");

const showRegister =
    document.getElementById("showRegister");

const showLogin =
    document.getElementById("showLogin");

const loginMessage =
    document.getElementById("loginMessage");

const registerMessage =
    document.getElementById("registerMessage");


// =====================================================
// ROLE SELECTION
// =====================================================

roleButtons.forEach(button => {

    button.addEventListener("click", function () {

        roleButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        this.classList.add("active");

        selectedRole =
            this.getAttribute("data-role");

        console.log(
            "Selected role:",
            selectedRole
        );

        const roleText =
            document.getElementById(
                "registerRoleText"
            );

        if (roleText) {

            if (selectedRole === "STUDENT") {
                roleText.textContent = "Student";
            }

            else if (selectedRole === "FACULTY") {
                roleText.textContent = "Faculty";
            }

            else if (selectedRole === "ADMIN") {
                roleText.textContent = "Admin";
            }
        }
    });

});


// =====================================================
// PASSWORD TOGGLE
// =====================================================

function setupPasswordToggle(
    buttonId,
    inputId
) {

    const button =
        document.getElementById(buttonId);

    const input =
        document.getElementById(inputId);

    if (!button || !input) {
        return;
    }

    button.addEventListener(
        "click",
        function () {

            if (input.type === "password") {

                input.type = "text";

                this.innerHTML =
                    '<i class="bi bi-eye-slash"></i>';

            } else {

                input.type = "password";

                this.innerHTML =
                    '<i class="bi bi-eye"></i>';
            }

        }
    );
}


setupPasswordToggle(
    "toggleLoginPassword",
    "loginPassword"
);

setupPasswordToggle(
    "toggleRegisterPassword",
    "registerPassword"
);


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(
    element,
    message,
    type
) {

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        "message " + type;
}


// =====================================================
// CLEAR MESSAGE
// =====================================================

function clearMessage(element) {

    if (!element) {
        return;
    }

    element.textContent = "";

    element.className = "message";
}


// =====================================================
// SHOW REGISTER
// =====================================================

if (showRegister) {

    showRegister.addEventListener(
        "click",
        function () {

            loginForm.classList.add("d-none");

            document
                .querySelector(".role-section")
                .classList.add("d-none");

            document
                .querySelector(".login-options")
                .classList.add("d-none");

            registerForm.classList.remove("d-none");

            clearMessage(loginMessage);

        }
    );

}


// =====================================================
// SHOW LOGIN
// =====================================================

if (showLogin) {

    showLogin.addEventListener(
        "click",
        function () {

            registerForm.classList.add("d-none");

            loginForm.classList.remove("d-none");

            document
                .querySelector(".role-section")
                .classList.remove("d-none");

            document
                .querySelector(".login-options")
                .classList.remove("d-none");

            clearMessage(registerMessage);

        }
    );

}


// =====================================================
// LOGIN
// =====================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            console.log(
                "LOGIN BUTTON CLICKED"
            );

            clearMessage(loginMessage);

            const emailInput =
                document.getElementById(
                    "loginEmail"
                );

            const passwordInput =
                document.getElementById(
                    "loginPassword"
                );

            const loginButton =
                document.getElementById(
                    "loginButton"
                );

            const buttonText =
                document.getElementById(
                    "loginButtonText"
                );

            const spinner =
                document.getElementById(
                    "loginSpinner"
                );


            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;


            // -----------------------------------------
            // VALIDATION
            // -----------------------------------------

            if (!email) {

                showMessage(
                    loginMessage,
                    "Please enter your email address.",
                    "error"
                );

                emailInput.focus();

                return;
            }


            if (!password) {

                showMessage(
                    loginMessage,
                    "Please enter your password.",
                    "error"
                );

                passwordInput.focus();

                return;
            }


            // -----------------------------------------
            // LOADING
            // -----------------------------------------

            loginButton.disabled = true;

            buttonText.textContent =
                "Logging in...";

            spinner.classList.remove("d-none");


            try {

                console.log(
                    "Connecting to:",
                    API_URL + "/login"
                );


                // -----------------------------------------
                // API REQUEST
                // -----------------------------------------

                const response =
                    await fetch(
                        API_URL + "/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                email: email,
                                password: password
                            })
                        }
                    );


                console.log(
                    "HTTP status:",
                    response.status
                );


                // -----------------------------------------
                // READ RESPONSE
                // -----------------------------------------

                const responseText =
                    await response.text();

                console.log(
                    "Server response:",
                    responseText
                );


                let data;

                try {

                    data =
                        JSON.parse(
                            responseText
                        );

                } catch (error) {

                    data =
                        responseText;
                }


                // -----------------------------------------
                // LOGIN FAILED
                // -----------------------------------------

                if (!response.ok) {

                    let errorMessage =
                        "Invalid email or password.";

                    if (
                        typeof data ===
                        "string" &&
                        data.length > 0
                    ) {

                        errorMessage = data;

                    }

                    else if (
                        data &&
                        data.message
                    ) {

                        errorMessage =
                            data.message;
                    }


                    showMessage(
                        loginMessage,
                        errorMessage,
                        "error"
                    );

                    return;
                }


                // -----------------------------------------
                // CHECK RESPONSE
                // -----------------------------------------

                if (
                    !data ||
                    typeof data !== "object"
                ) {

                    showMessage(
                        loginMessage,
                        "Invalid response received from server.",
                        "error"
                    );

                    return;
                }


                console.log(
                    "Logged in user:",
                    data
                );


                // -----------------------------------------
                // CHECK ROLE
                // -----------------------------------------

                const serverRole =
                    String(
                        data.role || ""
                    ).toUpperCase();


                if (
                    serverRole !==
                    selectedRole
                ) {

                    showMessage(
                        loginMessage,

                        "Wrong role selected. " +
                        "This account is registered as " +
                        serverRole + ".",

                        "error"
                    );

                    return;
                }


                // -----------------------------------------
                // SAVE USER
                // -----------------------------------------

                localStorage.setItem(
                    "adhyayUser",
                    JSON.stringify(data)
                );


                // -----------------------------------------
                // SUCCESS
                // -----------------------------------------

                showMessage(
                    loginMessage,
                    "Login successful! Redirecting...",
                    "success"
                );


                // -----------------------------------------
                // REDIRECT
                // -----------------------------------------

                setTimeout(
                    function () {

                        if (
                            serverRole ===
                            "STUDENT"
                        ) {

                            window.location.href =
                                "student-dashboard.html";
                        }

                        else if (
                            serverRole ===
                            "FACULTY"
                        ) {

                            window.location.href =
                                "faculty-dashboard.html";
                        }

                        else if (
                            serverRole ===
                            "ADMIN"
                        ) {

                            window.location.href =
                                "admin-dashboard.html";
                        }

                        else {

                            showMessage(
                                loginMessage,
                                "Unknown user role: " +
                                serverRole,
                                "error"
                            );
                        }

                    },
                    700
                );

            }

            catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );

                showMessage(
                    loginMessage,

                    "Cannot connect to ADHYAY backend. " +
                    "Make sure Spring Boot is running on port 8080.",

                    "error"
                );

            }

            finally {

                loginButton.disabled = false;

                buttonText.textContent =
                    "Login";

                spinner.classList.add(
                    "d-none"
                );
            }

        }
    );

}


// =====================================================
// REGISTER
// =====================================================

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            clearMessage(registerMessage);


            const name =
                document.getElementById(
                    "registerName"
                ).value.trim();

            const email =
                document.getElementById(
                    "registerEmail"
                ).value.trim();

            const password =
                document.getElementById(
                    "registerPassword"
                ).value;


            // -----------------------------------------
            // VALIDATION
            // -----------------------------------------

            if (!name) {

                showMessage(
                    registerMessage,
                    "Please enter your name.",
                    "error"
                );

                return;
            }


            if (!email) {

                showMessage(
                    registerMessage,
                    "Please enter your email.",
                    "error"
                );

                return;
            }


            if (!password) {

                showMessage(
                    registerMessage,
                    "Please create a password.",
                    "error"
                );

                return;
            }


            if (password.length < 6) {

                showMessage(
                    registerMessage,
                    "Password must contain at least 6 characters.",
                    "error"
                );

                return;
            }


            try {

                console.log(
                    "Registering user..."
                );


                const response =
                    await fetch(
                        API_URL + "/register",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({

                                name: name,

                                email: email,

                                password: password,

                                role: selectedRole

                            })
                        }
                    );


                const responseText =
                    await response.text();


                let data;

                try {

                    data =
                        JSON.parse(
                            responseText
                        );

                } catch (error) {

                    data =
                        responseText;
                }


                if (!response.ok) {

                    let message =
                        "Registration failed.";

                    if (
                        typeof data ===
                        "string"
                    ) {

                        message = data;

                    }

                    else if (
                        data &&
                        data.message
                    ) {

                        message =
                            data.message;
                    }


                    showMessage(
                        registerMessage,
                        message,
                        "error"
                    );

                    return;
                }


                // -----------------------------------------
                // SUCCESS
                // -----------------------------------------

                showMessage(
                    registerMessage,
                    "Registration successful! Please login.",
                    "success"
                );


                // Clear fields

                document.getElementById(
                    "registerName"
                ).value = "";

                document.getElementById(
                    "registerEmail"
                ).value = "";

                document.getElementById(
                    "registerPassword"
                ).value = "";


                // Go back to login

                setTimeout(
                    function () {

                        registerForm.classList.add(
                            "d-none"
                        );

                        loginForm.classList.remove(
                            "d-none"
                        );

                        document
                            .querySelector(
                                ".role-section"
                            )
                            .classList.remove(
                                "d-none"
                            );

                        document
                            .querySelector(
                                ".login-options"
                            )
                            .classList.remove(
                                "d-none"
                            );

                        clearMessage(
                            registerMessage
                        );

                    },
                    1200
                );

            }

            catch (error) {

                console.error(
                    "REGISTER ERROR:",
                    error
                );

                showMessage(
                    registerMessage,
                    "Cannot connect to ADHYAY backend.",
                    "error"
                );
            }

        }
    );

}


// =====================================================
// FORGOT PASSWORD
// =====================================================

const forgotPassword =
    document.getElementById(
        "forgotPassword"
    );

if (forgotPassword) {

    forgotPassword.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            alert(
                "Forgot password functionality will be added soon."
            );

        }
    );

}


// =====================================================
// PAGE LOADED
// =====================================================

console.log(
    "ADHYAY login.js loaded successfully."
);

console.log(
    "API:",
    API_URL
);

console.log(
    "Default role:",
    selectedRole
);