// ========================================================
// ADHYAY Frontend Central Configuration
// Works automatically both on localhost and in cloud deployment!
// ========================================================

(function () {
    const isLocalhost = window.location.hostname === "localhost" || 
                        window.location.hostname === "127.0.0.1" || 
                        window.location.hostname === "";

    // 1. Check if user/teammate specified a custom backend URL in localStorage
    const savedUrl = localStorage.getItem("adhyayBackendUrl");

    // 2. Default production backend URL (Teammates can update this URL once deployed)
    const DEFAULT_PROD_URL = "https://adhyay-backend.onrender.com/api";

    const API_BASE = isLocalhost 
        ? "http://localhost:8081/api" 
        : (savedUrl || DEFAULT_PROD_URL);

    window.ADHYAY_CONFIG = {
        API_BASE: API_BASE,
        AUTH_BASE: `${API_BASE}/auth`,
        isLocal: isLocalhost,
        setBackendUrl: function(newUrl) {
            if (newUrl) {
                localStorage.setItem("adhyayBackendUrl", newUrl.replace(/\/$/, ""));
                window.location.reload();
            }
        }
    };

    console.log(`[ADHYAY] Connected to API: ${window.ADHYAY_CONFIG.API_BASE}`);
})();

