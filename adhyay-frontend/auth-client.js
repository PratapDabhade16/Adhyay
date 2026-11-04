// ========================================================
// ADHYAY — Centralized JWT Auth & Auto-Refreshing API Client
// Handles Access Tokens (15 min), Refresh Tokens (7 days),
// automatic 401 interception, token rotation and logout.
// ========================================================

const AUTH_API_BASE = "http://localhost:8081/api";

const TOKEN_KEYS = {
    ACCESS: "adhyayAccessToken",
    REFRESH: "adhyayRefreshToken",
    USER: "adhyayUser"
};

function getAccessToken() {
    return localStorage.getItem(TOKEN_KEYS.ACCESS);
}

function getRefreshToken() {
    return localStorage.getItem(TOKEN_KEYS.REFRESH);
}

function getCurrentUser() {
    try {
        const raw = localStorage.getItem(TOKEN_KEYS.USER);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setAuthSession(data) {
    if (!data) return;
    if (data.accessToken) {
        localStorage.setItem(TOKEN_KEYS.ACCESS, data.accessToken);
    }
    if (data.refreshToken) {
        localStorage.setItem(TOKEN_KEYS.REFRESH, data.refreshToken);
    }
    const user = data.user || (data.email ? data : null);
    if (user) {
        localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
    }
}

function clearAuthSession() {
    localStorage.removeItem(TOKEN_KEYS.ACCESS);
    localStorage.removeItem(TOKEN_KEYS.REFRESH);
    localStorage.removeItem(TOKEN_KEYS.USER);
}

// Global promise lock to prevent concurrent refresh requests
let refreshPromise = null;

async function refreshAccessToken() {
    if (refreshPromise) {
        return refreshPromise;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        clearAuthSession();
        redirectToLogin();
        return null;
    }

    refreshPromise = (async () => {
        try {
            const res = await _nativeFetch(`${AUTH_API_BASE}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken })
            });

            if (!res.ok) {
                console.warn("Session expired or refresh token revoked. Redirecting to login.");
                clearAuthSession();
                redirectToLogin();
                return null;
            }

            const data = await res.json();
            setAuthSession(data);
            return data.accessToken;

        } catch (err) {
            console.error("Token refresh network failed:", err);
            clearAuthSession();
            redirectToLogin();
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

function redirectToLogin() {
    const path = window.location.pathname;
    if (!path.endsWith("login.html") && !path.endsWith("index.html") && path !== "/") {
        window.location.href = "login.html";
    }
}

// Native fetch reference
const _nativeFetch = window.fetch;

async function authenticatedFetch(input, init = {}) {
    const url = typeof input === "string" ? input : (input && input.url ? input.url : "");
    const isBackendApi = url.includes(":8081/api");
    const isAuthEndpoint = url.includes("/api/auth/login") || 
                           url.includes("/api/auth/refresh") || 
                           url.includes("/api/auth/register") ||
                           url.includes("/api/auth/send-otp") ||
                           url.includes("/api/auth/verify-otp");

    const opts = { ...init };
    opts.headers = new Headers(opts.headers || {});

    // Attach access token to backend API calls
    if (isBackendApi && !isAuthEndpoint) {
        const token = getAccessToken();
        if (token && !opts.headers.has("Authorization")) {
            opts.headers.set("Authorization", `Bearer ${token}`);
        }
    }

    let response;
    try {
        response = await _nativeFetch(input, opts);
    } catch (err) {
        console.error("Fetch request error:", err);
        throw err;
    }

    // Intercept 401 Unauthorized
    if (isBackendApi && response.status === 401 && !isAuthEndpoint) {
        console.warn(`[401 Unauthorized] on ${url}. Attempting silent token refresh...`);
        const newAccessToken = await refreshAccessToken();

        if (newAccessToken) {
            // Retry the original request with the fresh access token
            opts.headers.set("Authorization", `Bearer ${newAccessToken}`);
            return _nativeFetch(input, opts);
        }
    }

    return response;
}

// Transparently wrap window.fetch so all dashboard API calls benefit from JWT & auto-refresh
window.fetch = authenticatedFetch;

async function logoutUser() {
    const refreshToken = getRefreshToken();
    try {
        if (refreshToken) {
            await _nativeFetch(`${AUTH_API_BASE}/auth/logout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken })
            });
        }
    } catch (err) {
        console.warn("Logout error:", err);
    } finally {
        clearAuthSession();
        window.location.href = "login.html";
    }
}

// Expose globally
window.getAccessToken = getAccessToken;
window.getRefreshToken = getRefreshToken;
window.getCurrentUser = getCurrentUser;
window.setAuthSession = setAuthSession;
window.clearAuthSession = clearAuthSession;
window.authenticatedFetch = authenticatedFetch;
window.logoutUser = logoutUser;

// ========================================================
// UNIVERSAL NOTIFICATION BELL & DROPDOWN (PHASE 3)
// ========================================================
let notifPollInterval = null;

async function fetchUnreadNotificationCount() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const res = await fetch(`${AUTH_API_BASE}/notifications/unread-count`);
        if (!res.ok) return;
        const data = await res.json();
        const badge = document.getElementById("adhyayNotifBadge");
        if (badge) {
            const count = data.unreadCount || 0;
            if (count > 0) {
                badge.textContent = count > 99 ? "99+" : count;
                badge.style.display = "inline-flex";
            } else {
                badge.style.display = "none";
            }
        }
    } catch (err) {
        // Silently ignore polling network errors
    }
}

async function loadNotificationsDropdown() {
    const listEl = document.getElementById("adhyayNotifList");
    if (!listEl) return;

    listEl.innerHTML = `<p style="text-align:center;color:#64748B;font-size:13px;padding:20px;">Loading notifications...</p>`;

    try {
        const res = await fetch(`${AUTH_API_BASE}/notifications`);
        if (!res.ok) throw new Error("Failed to load");
        const list = await res.json();

        if (!Array.isArray(list) || list.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center;padding:32px 16px;color:#94A3B8;">
                    <div style="font-size:28px;margin-bottom:6px;">🔔</div>
                    <strong style="color:#0F172A;font-size:13.5px;display:block;margin-bottom:2px;">All caught up!</strong>
                    <span style="font-size:12px;">No new alerts or deadlines.</span>
                </div>
            `;
            return;
        }

        listEl.innerHTML = list.map(item => {
            let icon = "🔔";
            if (item.type === "NEW_LECTURE") icon = "🎥";
            else if (item.type === "MATERIAL_UPLOADED") icon = "📄";
            else if (item.type === "ASSIGNMENT_DEADLINE") icon = "⏰";
            else if (item.type === "ANNOUNCEMENT") icon = "📢";

            const unreadClass = !item.read ? "background:#F0FDF4;font-weight:600;" : "background:#FFFFFF;";
            const unreadDot = !item.read ? `<span style="width:7px;height:7px;border-radius:50%;background:#16A34A;display:inline-block;margin-left:auto;flex-shrink:0;"></span>` : "";

            return `
                <div class="adhyay-notif-item" style="display:flex;gap:12px;padding:12px 14px;border-bottom:1px solid #F1F5F9;cursor:pointer;transition:background 0.15s;${unreadClass}" onclick="handleNotifItemClick('${item.id}', '${item.link || ''}')">
                    <div style="font-size:18px;line-height:1;flex-shrink:0;margin-top:2px;">${icon}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="font-size:13px;color:#0F172A;line-height:1.3;">${escapeNotifHtml(item.title || "Notification")}</span>
                            ${unreadDot}
                        </div>
                        <p style="font-size:12px;color:#475569;margin:2px 0 4px 0;line-height:1.4;word-break:break-word;">${escapeNotifHtml(item.message || "")}</p>
                        <span style="font-size:11px;color:#94A3B8;">${formatNotifTime(item.createdAt)}</span>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        listEl.innerHTML = `<p style="color:#EF4444;font-size:12.5px;padding:16px;">Failed to load notifications.</p>`;
    }
}

window.handleNotifItemClick = async function(id, link) {
    try {
        await fetch(`${AUTH_API_BASE}/notifications/${encodeURIComponent(id)}/read`, { method: "PUT" });
        fetchUnreadNotificationCount();
    } catch {}

    const dropdown = document.getElementById("adhyayNotifDropdown");
    if (dropdown) dropdown.style.display = "none";

    if (link && link.trim()) {
        window.location.href = link;
    }
};

window.markAllNotifsRead = async function() {
    try {
        await fetch(`${AUTH_API_BASE}/notifications/read-all`, { method: "PUT" });
        fetchUnreadNotificationCount();
        loadNotificationsDropdown();
    } catch (err) {
        console.warn("Could not mark all as read:", err);
    }
};

window.toggleNotifDropdown = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("adhyayNotifDropdown");
    if (!dropdown) return;

    if (dropdown.style.display === "none" || !dropdown.style.display) {
        dropdown.style.display = "block";
        loadNotificationsDropdown();
    } else {
        dropdown.style.display = "none";
    }
};

function formatNotifTime(isoStr) {
    if (!isoStr) return "";
    const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function escapeNotifHtml(str) {
    return String(str || "").replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
}

function mountNotificationWidget() {
    // Look for dashboard header actions container
    const headerActions = document.querySelector(".page-header > div:last-child, .admin-top-actions, .faculty-header-actions");
    if (!headerActions || document.getElementById("adhyayNotifBtn")) return;

    const wrap = document.createElement("div");
    wrap.style.cssText = "position:relative;display:inline-block;";
    wrap.innerHTML = `
        <button type="button" id="adhyayNotifBtn" onclick="toggleNotifDropdown(event)" style="position:relative;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;color:#334155;transition:all 0.15s ease;" title="Notifications">
            🔔
            <span id="adhyayNotifBadge" style="position:absolute;top:-4px;right:-4px;background:#EF4444;color:#FFFFFF;font-size:10px;font-weight:800;padding:2px 6px;border-radius:99px;border:2px solid #FFFFFF;display:none;line-height:1;">0</span>
        </button>

        <div id="adhyayNotifDropdown" style="display:none;position:absolute;right:0;top:48px;width:340px;max-width:90vw;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 10px 30px rgba(15,23,42,0.12);z-index:9999;overflow:hidden;animation:fadeIn 0.15s ease;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #F1F5F9;background:#FAFBFD;">
                <strong style="font-size:14px;color:#0F172A;">Notifications</strong>
                <button type="button" onclick="markAllNotifsRead()" style="background:none;border:none;color:#0D3E36;font-size:12px;font-weight:600;cursor:pointer;padding:0;">Mark all read</button>
            </div>
            <div id="adhyayNotifList" style="max-height:360px;overflow-y:auto;">
                <!-- dynamic notifs -->
            </div>
        </div>
    `;

    headerActions.insertBefore(wrap, headerActions.firstChild);

    // Close on outside click
    document.addEventListener("click", e => {
        const dropdown = document.getElementById("adhyayNotifDropdown");
        const btn = document.getElementById("adhyayNotifBtn");
        if (dropdown && dropdown.style.display !== "none") {
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.style.display = "none";
            }
        }
    });

    fetchUnreadNotificationCount();
    if (!notifPollInterval) {
        notifPollInterval = setInterval(fetchUnreadNotificationCount, 30000); // Poll every 30s
    }
}

// Auto mount on DOM load
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountNotificationWidget);
} else {
    mountNotificationWidget();
}
