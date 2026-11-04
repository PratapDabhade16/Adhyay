// ============================================================
// ADHYAY — Institutional Administration Engine
// 1. User Management
// 2. Activate / Deactivate Accounts
// 3. Remove Unauthorized Users
// 4. Registration Approval
// 5. Academic Management
// 6. Lecture Moderation & Management
// 7. Dashboard Analytics
// 8. Security & Activity Audit Logs
// ============================================================

const API = "http://localhost:8081/api";

let currentAdminUser = null;
let currentTab = "overview";

// In-memory data caches for fast filtering
let cachedUsers = [];
let cachedLectures = [];
let cachedSubjects = [];
let cachedLogs = [];

let confirmCallback = null;

// ============================================================
// UTILITIES
// ============================================================
function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);
}

function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? "var(--red)" : "var(--green-dark)";
    toast.style.display = "block";
    setTimeout(() => {
        toast.style.display = "none";
    }, 3200);
}

function openConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById("confirmModal");
    const titleEl = document.getElementById("confirmModalTitle");
    const msgEl = document.getElementById("confirmModalMessage");
    if (!modal) return;

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    confirmCallback = onConfirm;
    modal.classList.add("open");
}

function closeConfirmModal() {
    const modal = document.getElementById("confirmModal");
    if (modal) modal.classList.remove("open");
    confirmCallback = null;
}

function formatDateTime(isoString) {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// ============================================================
// TAB NAVIGATION
// ============================================================
function setupTabSwitching() {
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("pageTitle");
    const pageSubtitle = document.getElementById("pageSubtitle");

    const titles = {
        overview: {
            title: "Campus overview",
            subtitle: "Everything happening across ADHYAY at a glance."
        },
        users: {
            title: "User Directory & Access",
            subtitle: "Manage student and faculty accounts, authorizations, and statuses."
        },
        academic: {
            title: "Academic Curriculum",
            subtitle: "Manage institutional course codes, semesters, and faculty allocations."
        },
        lectures: {
            title: "Lecture Moderation",
            subtitle: "Review, approve, edit, and organize uploaded class recordings."
        },
        logs: {
            title: "Security & Activity Logs",
            subtitle: "Real-time audit log of all administrative actions and security events."
        }
    };

    function switchTab(tabKey) {
        currentTab = tabKey;

        navItems.forEach(btn => {
            const isMatch = btn.getAttribute("data-tab") === tabKey;
            btn.classList.toggle("active", isMatch);
        });

        tabContents.forEach(section => {
            const viewId = "view" + tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
            section.classList.toggle("active", section.id === viewId);
        });

        if (titles[tabKey]) {
            if (pageTitle) pageTitle.textContent = titles[tabKey].title;
            if (pageSubtitle) pageSubtitle.textContent = titles[tabKey].subtitle;
        }

        // Refresh tab data
        if (tabKey === "overview") loadOverviewAnalytics();
        if (tabKey === "users") loadUsers();
        if (tabKey === "academic") loadAcademicSubjects();
        if (tabKey === "lectures") loadLectures();
        if (tabKey === "logs") loadActivityLogs();
    }

    navItems.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabKey = btn.getAttribute("data-tab");
            if (tabKey) switchTab(tabKey);
        });
    });

    document.querySelectorAll("[data-tab-switch]").forEach(el => {
        el.addEventListener("click", () => {
            const target = el.getAttribute("data-tab-switch");
            if (target) switchTab(target);
        });
    });

    const pendingBtn = document.getElementById("btnGoToPendingUsers");
    if (pendingBtn) {
        pendingBtn.addEventListener("click", () => {
            switchTab("users");
            const statusSelect = document.getElementById("userFilterStatus");
            if (statusSelect) {
                statusSelect.value = "PENDING_APPROVAL";
                filterUsers();
            }
        });
    }
}

// ============================================================
// 1 & 7. OVERVIEW & ANALYTICS
// ============================================================
let uploadsChartInstance = null;
let usersChartInstance = null;
let aiHealthChartInstance = null;

async function loadOverviewAnalytics() {
    const kpiStudents = document.getElementById("kpiStudents");
    const kpiFaculty = document.getElementById("kpiFaculty");
    const kpiLectures = document.getElementById("kpiLectures");
    const kpiActiveUsers = document.getElementById("kpiActiveUsers");
    const pendingAlertBanner = document.getElementById("pendingAlertBanner");
    const pendingAlertText = document.getElementById("pendingAlertText");
    const mostWatchedList = document.getElementById("mostWatchedList");
    const overviewLogsList = document.getElementById("overviewLogsList");
    const kpiTotalUsersLabel = document.getElementById("kpiTotalUsersLabel");
    const adminStorageBadge = document.getElementById("adminStorageBadge");

    try {
        const res = await fetch(`${API}/admin/analytics`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (kpiStudents) kpiStudents.textContent = data.studentCount ?? 0;
        if (kpiFaculty) kpiFaculty.textContent = data.facultyCount ?? 0;
        if (kpiLectures) kpiLectures.textContent = data.totalLectures ?? 0;
        if (kpiActiveUsers) kpiActiveUsers.textContent = `${data.activeUsers ?? 0} / ${data.totalUsers ?? 0}`;

        // Pending banner
        if (data.pendingUsers > 0) {
            if (pendingAlertBanner) pendingAlertBanner.style.display = "block";
            if (pendingAlertText) pendingAlertText.textContent = `${data.pendingUsers} registration approval${data.pendingUsers > 1 ? 's' : ''} awaiting your action.`;
        } else {
            if (pendingAlertBanner) pendingAlertBanner.style.display = "none";
        }

        // Most watched lectures
        if (mostWatchedList) {
            const list = data.mostWatchedLectures || [];
            if (list.length === 0) {
                mostWatchedList.innerHTML = `
                    <div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;">
                        No video lectures have recorded watch views yet.
                    </div>
                `;
            } else {
                mostWatchedList.innerHTML = list.map((l, idx) => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-light);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-weight:700;color:var(--muted);font-size:14px;width:18px;">#${idx + 1}</span>
                            <div>
                                <strong style="font-size:14px;color:var(--text);display:block;">${escapeHTML(l.title)}</strong>
                                <span style="font-size:12px;color:var(--muted);">${escapeHTML(l.subject || "Subject")} · Unit ${escapeHTML(String(l.unit || "1"))}</span>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <span class="chip chip-green" style="font-weight:700;">${Number(l.views || 0)} views</span>
                        </div>
                    </div>
                `).join("");
            }
        }
    } catch (e) {
        console.error("Failed to load analytics", e);
    }

    // Phase 4 Institutional Analytics & Chart.js Visualizations
    try {
        const instRes = await fetch(`${API}/analytics/admin`);
        if (instRes.ok) {
            const anData = await instRes.json();

            if (kpiTotalUsersLabel && anData.users) {
                kpiTotalUsersLabel.textContent = `${anData.users.total} Total Accounts`;
            }
            if (adminStorageBadge && anData.storage) {
                adminStorageBadge.textContent = `Est. ${anData.storage.estimatedGB} GB | ${anData.storage.totalMaterials} Notes`;
            }

            if (typeof Chart !== "undefined") {
                // 1. Weekly Uploads Bar Chart
                const uploadsCanvas = document.getElementById("adminWeeklyUploadsChart");
                if (uploadsCanvas && anData.weeklyUploads) {
                    if (uploadsChartInstance) uploadsChartInstance.destroy();
                    uploadsChartInstance = new Chart(uploadsCanvas.getContext("2d"), {
                        type: "bar",
                        data: {
                            labels: anData.weeklyUploads.labels || [],
                            datasets: [{
                                label: "Uploads",
                                data: anData.weeklyUploads.counts || [],
                                backgroundColor: "rgba(13, 62, 54, 0.8)",
                                borderRadius: 4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                        }
                    });
                }

                // 2. User Roles Doughnut Chart
                const usersCanvas = document.getElementById("adminUsersChart");
                if (usersCanvas && anData.users) {
                    if (usersChartInstance) usersChartInstance.destroy();
                    usersChartInstance = new Chart(usersCanvas.getContext("2d"), {
                        type: "doughnut",
                        data: {
                            labels: ["Students", "Faculty", "Admins"],
                            datasets: [{
                                data: [anData.users.students || 0, anData.users.faculty || 0, anData.users.admin || 0],
                                backgroundColor: ["#0D3E36", "#EBA83A", "#3B82F6"]
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } }
                            }
                        }
                    });
                }

                // 3. AI Pipeline Health Pie Chart
                const aiCanvas = document.getElementById("adminAiHealthChart");
                if (aiCanvas && anData.aiHealth) {
                    if (aiHealthChartInstance) aiHealthChartInstance.destroy();
                    aiHealthChartInstance = new Chart(aiCanvas.getContext("2d"), {
                        type: "doughnut",
                        data: {
                            labels: ["Transcribed", "In Progress", "Failed"],
                            datasets: [{
                                data: [
                                    Math.max(1, anData.aiHealth.transcriptionsReady || 0),
                                    anData.aiHealth.transcriptionsPending || 0,
                                    anData.aiHealth.transcriptionsFailed || 0
                                ],
                                backgroundColor: ["#15803D", "#EAB308", "#EF4444"]
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } }
                            }
                        }
                    });
                }
            }
        }
    } catch (e) {
        console.warn("Could not load institutional analytics charts:", e);
    }

    // Mini recent logs on Overview
    try {
        const res = await fetch(`${API}/admin/logs`);
        if (res.ok) {
            const logs = await res.json();
            if (overviewLogsList) {
                const recent = logs.slice(0, 5);
                if (recent.length === 0) {
                    overviewLogsList.innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px;">No events recorded.</p>`;
                } else {
                    overviewLogsList.innerHTML = recent.map(log => `
                        <div style="padding:8px 0;border-bottom:1px solid var(--border-light);font-size:13px;">
                            <div style="display:flex;justify-content:space-between;gap:8px;">
                                <strong style="color:var(--text-2);">${escapeHTML(log.action.replace(/_/g, " "))}</strong>
                                <span style="color:var(--muted);font-size:11px;">${escapeHTML(formatDateTime(log.timestamp))}</span>
                            </div>
                            <div style="color:var(--muted);font-size:12px;margin-top:2px;">${escapeHTML(log.details || log.target || "")}</div>
                        </div>
                    `).join("");
                }
            }
        }
    } catch (e) {
        console.error("Failed to load logs preview", e);
    }
}

// ============================================================
// 1, 2, 3, 4. USER MANAGEMENT (Search, Filters, Toggle, Delete, Approve/Reject)
// ============================================================
async function loadUsers() {
    const tableBody = document.getElementById("userTableBody");
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted);">Loading users...</td></tr>`;
    }

    try {
        const res = await fetch(`${API}/admin/users`);
        if (!res.ok) throw new Error();
        cachedUsers = await res.json();
        renderUsers(cachedUsers);
    } catch {
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:24px;">Failed to load user directory.</td></tr>`;
        }
    }
}

function filterUsers() {
    const searchVal = document.getElementById("userFilterSearch")?.value.toLowerCase().trim() || "";
    const roleVal = document.getElementById("userFilterRole")?.value || "ALL";
    const statusVal = document.getElementById("userFilterStatus")?.value || "ALL";

    const filtered = cachedUsers.filter(u => {
        const matchRole = roleVal === "ALL" || (u.role || "").toUpperCase() === roleVal;
        const matchStatus = statusVal === "ALL" || (u.status || "ACTIVE").toUpperCase() === statusVal;
        const matchSearch = !searchVal || 
            (u.name || "").toLowerCase().includes(searchVal) ||
            (u.email || "").toLowerCase().includes(searchVal) ||
            (u.department || "").toLowerCase().includes(searchVal) ||
            (u.rollNumber || "").toLowerCase().includes(searchVal);
        return matchRole && matchStatus && matchSearch;
    });

    renderUsers(filtered);
}

function renderUsers(users) {
    const tableBody = document.getElementById("userTableBody");
    if (!tableBody) return;

    if (users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:var(--muted);padding:36px;">
                    No accounts match the selected filters.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = users.map(user => {
        const role = (user.role || "STUDENT").toUpperCase();
        const isFaculty = role === "FACULTY";
        const isAdmin = role === "ADMIN";
        const initial = (user.name || "U").charAt(0).toUpperCase();
        const status = (user.status || "ACTIVE").toUpperCase();

        const isDeactivated = status === "DEACTIVATED";
        const isPending = status === "PENDING_APPROVAL";

        let statusBadge = `<span class="badge-status badge-active"><span class="status-dot"></span> Active</span>`;
        if (isDeactivated) {
            statusBadge = `<span class="badge-status badge-deactivated"><span class="status-dot"></span> Deactivated</span>`;
        } else if (isPending) {
            statusBadge = `<span class="badge-status badge-pending"><span class="status-dot"></span> Pending Approval</span>`;
        }

        const roleChip = isAdmin
            ? `<span class="chip" style="background:#E0E7FF;color:#3730A3;">Admin</span>`
            : (isFaculty
                ? `<span class="chip chip-amber">Faculty</span>`
                : `<span class="chip chip-green">Student</span>`);

        return `
            <tr>
                <td>
                    <div class="user-avatar-cell">
                        <div class="user-cell-circle" style="${isFaculty ? 'background:#FDF3D8;color:#8A5B00;' : ''}">${escapeHTML(initial)}</div>
                        <div>
                            <strong>${escapeHTML(user.name || "Unnamed")}</strong>
                            <div style="font-size:12px;color:var(--muted);">
                                ${escapeHTML(user.department || "General")}${user.rollNumber ? ` · ${escapeHTML(user.rollNumber)}` : ""}
                            </div>
                        </div>
                    </div>
                </td>
                <td style="color:var(--text-2);font-size:13px;">${escapeHTML(user.email || "—")}</td>
                <td>${roleChip}</td>
                <td>${statusBadge}</td>
                <td style="text-align:right;">
                    <div style="display:inline-flex;gap:6px;align-items:center;">
                        ${isPending ? `
                            <button class="btn-action btn-action-approve" onclick="approveUser('${user.id}')" title="Approve Registration">Approve</button>
                            <button class="btn-action btn-action-reject" onclick="rejectUser('${user.id}')" title="Reject Registration">Reject</button>
                        ` : `
                            <button class="btn-action ${isDeactivated ? 'btn-action-activate' : 'btn-action-deactivate'}" onclick="toggleUserStatus('${user.id}')" title="${isDeactivated ? 'Enable account' : 'Temporarily disable account'}">
                                ${isDeactivated ? 'Activate' : 'Deactivate'}
                            </button>
                        `}
                        <button class="btn-action btn-action-delete" onclick="promptDeleteUser('${user.id}', '${escapeHTML(user.email)}')" title="Permanently remove user">
                            Remove
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

window.toggleUserStatus = async function(userId) {
    const adminName = currentAdminUser?.name || "Administrator";
    try {
        const res = await fetch(`${API}/admin/users/${userId}/toggle-status?adminName=${encodeURIComponent(adminName)}`, {
            method: "PATCH"
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message || "Account status updated");
            loadUsers();
            loadOverviewAnalytics();
        } else {
            showToast(data.message || "Failed to update status", true);
        }
    } catch {
        showToast("Error updating user status", true);
    }
};

window.approveUser = async function(userId) {
    const adminName = currentAdminUser?.name || "Administrator";
    try {
        const res = await fetch(`${API}/admin/users/${userId}/approve?adminName=${encodeURIComponent(adminName)}`, {
            method: "POST"
        });
        if (res.ok) {
            showToast("User registration approved");
            loadUsers();
            loadOverviewAnalytics();
        } else {
            showToast("Failed to approve user", true);
        }
    } catch {
        showToast("Error approving registration", true);
    }
};

window.rejectUser = async function(userId) {
    const adminName = currentAdminUser?.name || "Administrator";
    try {
        const res = await fetch(`${API}/admin/users/${userId}/reject?adminName=${encodeURIComponent(adminName)}`, {
            method: "POST"
        });
        if (res.ok) {
            showToast("User registration rejected");
            loadUsers();
            loadOverviewAnalytics();
        } else {
            showToast("Failed to reject user", true);
        }
    } catch {
        showToast("Error rejecting registration", true);
    }
};

window.promptDeleteUser = function(userId, email) {
    openConfirmModal(
        "Remove Unauthorized User",
        `Are you sure you want to permanently delete the account for ${email}? This action removes their access but can never be undone.`,
        async () => {
            const adminName = currentAdminUser?.name || "Administrator";
            try {
                const res = await fetch(`${API}/admin/users/${userId}?adminName=${encodeURIComponent(adminName)}`, {
                    method: "DELETE"
                });
                if (res.ok) {
                    showToast("User removed successfully");
                    loadUsers();
                    loadOverviewAnalytics();
                } else {
                    showToast("Failed to delete user", true);
                }
            } catch {
                showToast("Error removing user", true);
            }
        }
    );
};

// ============================================================
// 5. ACADEMIC MANAGEMENT (Subjects, Semesters, Faculty Allocation)
// ============================================================
async function loadAcademicSubjects() {
    const tableBody = document.getElementById("academicTableBody");
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted);">Loading curriculum...</td></tr>`;
    }

    try {
        const res = await fetch(`${API}/admin/academic/subjects`);
        if (!res.ok) throw new Error();
        cachedSubjects = await res.json();
        renderSubjects(cachedSubjects);
    } catch {
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:24px;">Failed to load subjects.</td></tr>`;
        }
    }
}

function renderSubjects(subjects) {
    const tableBody = document.getElementById("academicTableBody");
    if (!tableBody) return;

    if (subjects.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:var(--muted);padding:36px;">
                    No academic subjects configured. Click "+ Add New Subject" to create curriculum courses.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = subjects.map(sub => `
        <tr>
            <td>
                <strong>${escapeHTML(sub.name)}</strong>
                <div style="font-size:12px;color:var(--muted);">${escapeHTML(sub.code || "No code")}</div>
            </td>
            <td><span class="chip chip-muted">${escapeHTML(sub.semester || "Semester")}</span></td>
            <td style="color:var(--text-2);font-size:13px;">${escapeHTML(sub.department || "General")}</td>
            <td>
                <strong>${escapeHTML(sub.assignedFacultyName || "Unassigned")}</strong>
                <div style="font-size:12px;color:var(--muted);">${escapeHTML(sub.assignedFacultyEmail || "—")}</div>
            </td>
            <td style="text-align:right;">
                <div style="display:inline-flex;gap:6px;">
                    <button class="btn-action" style="background:#F0FDF4;color:#166534;" onclick="openEditSubjectModal('${sub.id}')">Edit</button>
                    <button class="btn-action btn-action-delete" onclick="promptDeleteSubject('${sub.id}', '${escapeHTML(sub.name)}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");
}

function setupSubjectModal() {
    const modal = document.getElementById("subjectModal");
    const form = document.getElementById("subjectForm");
    const btnOpen = document.getElementById("btnOpenAddSubjectModal");
    const btnClose = document.getElementById("btnCloseSubjectModal");
    const btnCancel = document.getElementById("btnCancelSubjectModal");
    const titleEl = document.getElementById("subjectModalTitle");

    function closeModal() {
        if (modal) modal.classList.remove("open");
        if (form) form.reset();
        document.getElementById("subjectId").value = "";
    }

    if (btnOpen) {
        btnOpen.addEventListener("click", () => {
            if (titleEl) titleEl.textContent = "Add Academic Subject";
            if (form) form.reset();
            document.getElementById("subjectId").value = "";
            modal.classList.add("open");
        });
    }

    if (btnClose) btnClose.addEventListener("click", closeModal);
    if (btnCancel) btnCancel.addEventListener("click", closeModal);

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("subjectId").value;
            const name = document.getElementById("subjectName").value.trim();
            const code = document.getElementById("subjectCode").value.trim();
            const semester = document.getElementById("subjectSemester").value;
            const department = document.getElementById("subjectDept").value.trim();
            const assignedFacultyName = document.getElementById("subjectFacultyName").value.trim();
            const assignedFacultyEmail = document.getElementById("subjectFacultyEmail").value.trim();

            const adminName = currentAdminUser?.name || "Administrator";
            const payload = { name, code, semester, department, assignedFacultyName, assignedFacultyEmail };

            try {
                let res;
                if (id) {
                    res = await fetch(`${API}/admin/academic/subjects/${id}?adminName=${encodeURIComponent(adminName)}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                } else {
                    res = await fetch(`${API}/admin/academic/subjects?adminName=${encodeURIComponent(adminName)}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                }

                if (res.ok) {
                    showToast(id ? "Subject updated successfully" : "New subject added successfully");
                    closeModal();
                    loadAcademicSubjects();
                } else {
                    const err = await res.json().catch(() => ({}));
                    showToast(err.message || "Failed to save subject", true);
                }
            } catch {
                showToast("Network error saving subject", true);
            }
        });
    }
}

window.openEditSubjectModal = function(id) {
    const sub = cachedSubjects.find(s => s.id === id);
    if (!sub) return;

    document.getElementById("subjectId").value = sub.id;
    document.getElementById("subjectName").value = sub.name || "";
    document.getElementById("subjectCode").value = sub.code || "";
    document.getElementById("subjectSemester").value = sub.semester || "Semester 1";
    document.getElementById("subjectDept").value = sub.department || "";
    document.getElementById("subjectFacultyName").value = sub.assignedFacultyName || "";
    document.getElementById("subjectFacultyEmail").value = sub.assignedFacultyEmail || "";

    const titleEl = document.getElementById("subjectModalTitle");
    if (titleEl) titleEl.textContent = "Edit Academic Subject";

    const modal = document.getElementById("subjectModal");
    if (modal) modal.classList.add("open");
};

window.promptDeleteSubject = function(id, name) {
    openConfirmModal(
        "Delete Subject",
        `Are you sure you want to delete ${name}? Faculty and student listings will no longer associate with this course code.`,
        async () => {
            const adminName = currentAdminUser?.name || "Administrator";
            try {
                const res = await fetch(`${API}/admin/academic/subjects/${id}?adminName=${encodeURIComponent(adminName)}`, {
                    method: "DELETE"
                });
                if (res.ok) {
                    showToast("Subject removed");
                    loadAcademicSubjects();
                } else {
                    showToast("Failed to delete subject", true);
                }
            } catch {
                showToast("Error deleting subject", true);
            }
        }
    );
};

// ============================================================
// 6. LECTURE MANAGEMENT (View, Approve, Reject, Edit, Delete)
// ============================================================
async function loadLectures() {
    const tableBody = document.getElementById("lecturesTableBody");
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted);">Loading lectures...</td></tr>`;
    }

    try {
        const res = await fetch(`${API}/admin/lectures`);
        if (!res.ok) throw new Error();
        cachedLectures = await res.json();
        renderLectures(cachedLectures);
    } catch {
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:24px;">Failed to load lectures.</td></tr>`;
        }
    }
}

function filterLectures() {
    const searchVal = document.getElementById("lectureFilterSearch")?.value.toLowerCase().trim() || "";
    const statusVal = document.getElementById("lectureFilterStatus")?.value || "ALL";

    const filtered = cachedLectures.filter(l => {
        const matchStatus = statusVal === "ALL" || (l.status || "APPROVED").toUpperCase() === statusVal;
        const matchSearch = !searchVal ||
            (l.title || "").toLowerCase().includes(searchVal) ||
            (l.subject || "").toLowerCase().includes(searchVal) ||
            (l.uploadedBy || "").toLowerCase().includes(searchVal);
        return matchStatus && matchSearch;
    });

    renderLectures(filtered);
}

function renderLectures(lectures) {
    const tableBody = document.getElementById("lecturesTableBody");
    if (!tableBody) return;

    if (lectures.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;color:var(--muted);padding:36px;">
                    No lectures match the search criteria.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = lectures.map(l => {
        const status = (l.status || "APPROVED").toUpperCase();
        let statusBadge = `<span class="badge-status badge-active"><span class="status-dot"></span> Approved</span>`;
        if (status === "PENDING") {
            statusBadge = `<span class="badge-status badge-pending"><span class="status-dot"></span> Pending</span>`;
        } else if (status === "REJECTED") {
            statusBadge = `<span class="badge-status badge-deactivated"><span class="status-dot"></span> Rejected</span>`;
        }

        return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <button onclick="playLecturePreview('${l.videoUrl || ''}', '${escapeHTML(l.title)}')" style="border:none;background:var(--green-dark);color:#fff;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;cursor:pointer;flex-shrink:0;">▶</button>
                        <div>
                            <strong>${escapeHTML(l.title)}</strong>
                            <div style="font-size:12px;color:var(--muted);">${statusBadge} · ${escapeHTML(formatDateTime(l.createdAt))}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="chip chip-green">${escapeHTML(l.subject || "Subject")}</span>
                    <span class="chip chip-muted">Unit ${escapeHTML(String(l.unit || "1"))}</span>
                </td>
                <td style="color:var(--text-2);font-size:13px;">${escapeHTML(l.uploadedBy || "Faculty")}</td>
                <td><strong>${Number(l.views || 0)}</strong></td>
                <td style="text-align:right;">
                    <div style="display:inline-flex;gap:6px;">
                        ${status === "PENDING" || status === "REJECTED" ? `
                            <button class="btn-action btn-action-approve" onclick="setLectureStatus('${l.id}', 'APPROVED')">Approve</button>
                        ` : `
                            <button class="btn-action btn-action-deactivate" onclick="setLectureStatus('${l.id}', 'REJECTED')">Reject</button>
                        `}
                        <button class="btn-action" style="background:#F0FDF4;color:#166534;" onclick="openEditLectureModal('${l.id}')">Edit</button>
                        <button class="btn-action btn-action-delete" onclick="promptDeleteLecture('${l.id}', '${escapeHTML(l.title)}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

window.playLecturePreview = function(url, title) {
    if (!url) {
        showToast("No video URL found for this lecture", true);
        return;
    }
    const modal = document.getElementById("videoModal");
    const video = document.getElementById("adminVideoPlayer");
    const titleEl = document.getElementById("videoModalTitle");

    if (titleEl) titleEl.textContent = title;
    if (video) {
        video.src = url;
        video.play().catch(() => {});
    }
    if (modal) modal.classList.add("open");
};

function setupVideoModal() {
    const modal = document.getElementById("videoModal");
    const btnClose = document.getElementById("btnCloseVideoModal");
    const video = document.getElementById("adminVideoPlayer");

    function close() {
        if (modal) modal.classList.remove("open");
        if (video) {
            video.pause();
            video.src = "";
        }
    }

    if (btnClose) btnClose.addEventListener("click", close);
}

window.setLectureStatus = async function(id, status) {
    const adminName = currentAdminUser?.name || "Administrator";
    try {
        const res = await fetch(`${API}/admin/lectures/${id}/status?status=${status}&adminName=${encodeURIComponent(adminName)}`, {
            method: "PATCH"
        });
        if (res.ok) {
            showToast(`Lecture marked as ${status.toLowerCase()}`);
            loadLectures();
            loadOverviewAnalytics();
        } else {
            showToast("Failed to update lecture status", true);
        }
    } catch {
        showToast("Error updating lecture status", true);
    }
};

window.openEditLectureModal = function(id) {
    const lecture = cachedLectures.find(l => l.id === id);
    if (!lecture) return;

    document.getElementById("editLectureId").value = lecture.id;
    document.getElementById("editLectureTitle").value = lecture.title || "";
    document.getElementById("editLectureSubject").value = lecture.subject || "";
    document.getElementById("editLectureUnit").value = lecture.unit || "";
    document.getElementById("editLectureNumber").value = lecture.lectureNumber || 1;
    document.getElementById("editLectureStatus").value = (lecture.status || "APPROVED").toUpperCase();

    const modal = document.getElementById("lectureEditModal");
    if (modal) modal.classList.add("open");
};

function setupLectureEditModal() {
    const modal = document.getElementById("lectureEditModal");
    const form = document.getElementById("lectureEditForm");
    const btnClose = document.getElementById("btnCloseLectureEditModal");
    const btnCancel = document.getElementById("btnCancelLectureEditModal");

    function close() {
        if (modal) modal.classList.remove("open");
        if (form) form.reset();
    }

    if (btnClose) btnClose.addEventListener("click", close);
    if (btnCancel) btnCancel.addEventListener("click", close);

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("editLectureId").value;
            const title = document.getElementById("editLectureTitle").value.trim();
            const subject = document.getElementById("editLectureSubject").value.trim();
            const unit = document.getElementById("editLectureUnit").value.trim();
            const lectureNumber = parseInt(document.getElementById("editLectureNumber").value, 10) || 1;
            const status = document.getElementById("editLectureStatus").value;

            const adminName = currentAdminUser?.name || "Administrator";

            try {
                const res = await fetch(`${API}/admin/lectures/${id}?adminName=${encodeURIComponent(adminName)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, subject, unit, lectureNumber, status })
                });

                if (res.ok) {
                    showToast("Lecture updated successfully");
                    close();
                    loadLectures();
                } else {
                    showToast("Failed to update lecture", true);
                }
            } catch {
                showToast("Network error updating lecture", true);
            }
        });
    }
}

window.promptDeleteLecture = function(id, title) {
    openConfirmModal(
        "Delete Lecture",
        `Are you sure you want to delete "${title}"? This permanently removes the video file from Cloudinary and campus course listings.`,
        async () => {
            const adminName = currentAdminUser?.name || "Administrator";
            try {
                const res = await fetch(`${API}/admin/lectures/${id}?adminName=${encodeURIComponent(adminName)}`, {
                    method: "DELETE"
                });
                if (res.ok) {
                    showToast("Lecture deleted successfully");
                    loadLectures();
                    loadOverviewAnalytics();
                } else {
                    showToast("Failed to delete lecture", true);
                }
            } catch {
                showToast("Error deleting lecture", true);
            }
        }
    );
};

// ============================================================
// 8. SECURITY & ACTIVITY AUDIT LOGS
// ============================================================
async function loadActivityLogs() {
    const tableBody = document.getElementById("logsTableBody");
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--muted);">Loading audit logs...</td></tr>`;
    }

    try {
        const res = await fetch(`${API}/admin/logs`);
        if (!res.ok) throw new Error();
        cachedLogs = await res.json();
        renderLogs(cachedLogs);
    } catch {
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--red);padding:24px;">Failed to load logs.</td></tr>`;
        }
    }
}

function filterLogs() {
    const q = document.getElementById("logsSearch")?.value.toLowerCase().trim() || "";
    const filtered = cachedLogs.filter(log => {
        return !q ||
            (log.action || "").toLowerCase().includes(q) ||
            (log.performedBy || "").toLowerCase().includes(q) ||
            (log.target || "").toLowerCase().includes(q) ||
            (log.details || "").toLowerCase().includes(q);
    });
    renderLogs(filtered);
}

function renderLogs(logs) {
    const tableBody = document.getElementById("logsTableBody");
    if (!tableBody) return;

    if (logs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center;color:var(--muted);padding:36px;">
                    No security or administrative activity recorded yet.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = logs.map(log => {
        const action = log.action || "EVENT";
        let chipClass = "chip-muted";
        if (action.includes("ACTIVATED") || action.includes("APPROVED")) {
            chipClass = "chip-green";
        } else if (action.includes("DEACTIVATED") || action.includes("REJECTED") || action.includes("DELETED")) {
            chipClass = "btn-action-delete";
        } else if (action.includes("CREATED") || action.includes("EDITED")) {
            chipClass = "chip-amber";
        }

        return `
            <tr>
                <td style="color:var(--muted);font-size:12px;white-space:nowrap;">${escapeHTML(formatDateTime(log.timestamp))}</td>
                <td><span class="chip ${chipClass}" style="font-weight:600;font-size:11px;">${escapeHTML(action.replace(/_/g, " "))}</span></td>
                <td><strong>${escapeHTML(log.performedBy || "Admin")}</strong></td>
                <td style="color:var(--text-2);font-size:13px;">
                    <div>${escapeHTML(log.details || "")}</div>
                    ${log.target ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">Target: ${escapeHTML(log.target)}</div>` : ""}
                </td>
            </tr>
        `;
    }).join("");
}

// ============================================================
// PHASE 4: AUDIT LOGS CSV EXPORT
// ============================================================
window.exportAuditLogsCsv = async function() {
    const btn = document.getElementById("btnExportLogsCsv");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Exporting...";
    }
    try {
        const searchVal = document.getElementById("logsSearch")?.value.trim() || "";
        let url = `${API}/analytics/admin/audit-logs/export`;
        if (searchVal) url += `?userEmail=${encodeURIComponent(searchVal)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Export failed with status " + res.status);
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `adhyay_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        showToast("Audit logs exported to CSV successfully.");
    } catch (err) {
        showToast("Failed to export audit logs: " + err.message, true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<span>📥</span> Export CSV`;
        }
    }
};

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Authenticate user from session
    const stored = localStorage.getItem("adhyayUser");
    if (!stored) {
        window.location.href = "login.html";
        return;
    }

    try {
        currentAdminUser = JSON.parse(stored);
    } catch {
        localStorage.removeItem("adhyayUser");
        window.location.href = "login.html";
        return;
    }

    const role = String(currentAdminUser?.role || "").toUpperCase();
    if (role !== "ADMIN") {
        if (role === "FACULTY") window.location.href = "faculty-dashboard.html";
        else if (role === "STUDENT") window.location.href = "student-dashboard.html";
        else window.location.href = "login.html";
        return;
    }

    const adminNameEl = document.getElementById("adminHeaderName");
    if (adminNameEl && currentAdminUser.name) {
        adminNameEl.textContent = currentAdminUser.name;
    }

    // 2. Setup Navigation and Modals
    setupTabSwitching();
    setupSubjectModal();
    setupLectureEditModal();
    setupVideoModal();

    // Confirm modal handlers
    const btnConfirmCancel = document.getElementById("btnConfirmCancel");
    const btnConfirmClose = document.getElementById("btnCloseConfirmModal");
    const btnConfirmOk = document.getElementById("btnConfirmOk");

    if (btnConfirmCancel) btnConfirmCancel.addEventListener("click", closeConfirmModal);
    if (btnConfirmClose) btnConfirmClose.addEventListener("click", closeConfirmModal);
    if (btnConfirmOk) {
        btnConfirmOk.addEventListener("click", () => {
            if (typeof confirmCallback === "function") {
                confirmCallback();
            }
            closeConfirmModal();
        });
    }

    // 3. Setup Filter listeners
    document.getElementById("userFilterSearch")?.addEventListener("input", filterUsers);
    document.getElementById("userFilterRole")?.addEventListener("change", filterUsers);
    document.getElementById("userFilterStatus")?.addEventListener("change", filterUsers);

    document.getElementById("lectureFilterSearch")?.addEventListener("input", filterLectures);
    document.getElementById("lectureFilterStatus")?.addEventListener("change", filterLectures);

    document.getElementById("logsSearch")?.addEventListener("input", filterLogs);

    // 4. Initial load
    loadOverviewAnalytics();
});
