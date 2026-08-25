import React, { useCallback, useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./Dashboard.css";
import Modal from "../../components/Modal";
import Navbar from "../../components/Navbar";
import {
  apiRequest,
  apiRequestWithResponse,
  getErrorMessage,
  jsonRequest,
} from "../../api/client";
import { useAuth } from "../../contexts/authContext";

const MAX_BARCODE_BYTES = 5 * 1024 * 1024;
const DIRECTORY_PAGE_LIMIT = 50;
const DIRECTORY_SKELETON_ROWS = 8;
const ALLOWED_BARCODE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const createDefaultFilters = () => ({
  sort: "end-newest",
  membership: "",
  status: "",
  dateField: "endDate",
  dateFrom: "",
  dateTo: "",
});
const emptySummary = {
  totalMembers: 0,
  activeMembers: 0,
  payingMembers: 0,
  expiringSoon: 0,
};

const toCsvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const emptyUser = () => ({
  name: "",
  email: "",
  password: "",
  phoneNumber: "",
  role: "user",
  membership: "none",
  privateSessions: "0",
  startDate: null,
  endDate: null,
  barcodeFile: null,
});

const parseDate = (value, fallback) => {
  if (!value || value === "none") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const getDefaultMembershipDates = (today = new Date()) => {
  const startDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const targetMonth = new Date(
    startDate.getFullYear(),
    startDate.getMonth() + 1,
    1,
  );
  const lastDayOfTargetMonth = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0,
  ).getDate();
  const endDate = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth(),
    Math.min(startDate.getDate(), lastDayOfTargetMonth),
  );

  return { startDate, endDate };
};

const normalizeUser = (user) => ({
  ...user,
  name: user.displayName || user.name || "",
  startDate: parseDate(user.startDate, null),
  endDate: parseDate(user.endDate, null),
});

const formatDate = (value) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB");
};

const getInitials = (name = "Member") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";

const hasImage = (value) => Boolean(value && value !== "none");

const MemberAvatar = ({ user }) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = hasImage(user.profilePicture) && !failed;

  return (
    <span className="avatar" aria-hidden="true">
      <span className="avatar__fallback">{getInitials(user.name)}</span>
      {showImage && (
        <img
          className={loaded ? "media-loaded" : ""}
          src={user.profilePicture}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
};

const BarcodePreview = ({ user }) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = hasImage(user.barcode) && !failed;

  return (
    <span className="barcode-shell">
      <span className="image-placeholder" aria-hidden={showImage && loaded}>
        {showImage ? "QR" : "No QR"}
      </span>
      {showImage && (
        <img
          className={`barcode-preview${loaded ? " media-loaded" : ""}`}
          src={user.barcode}
          alt={`${user.name} barcode`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
};

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [filters, setFilters] = useState(createDefaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageToken, setPageToken] = useState(null);
  const [previousPageTokens, setPreviousPageTokens] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState(emptySummary);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [hasLoadedDirectory, setHasLoadedDirectory] = useState(false);
  const [hasLoadedSummary, setHasLoadedSummary] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [modalError, setModalError] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [newUser, setNewUser] = useState(emptyUser);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      setSummary(await apiRequest("/admin/reports/summary"));
    } catch (error) {
      setFeedback({
        type: "error",
        text: getErrorMessage(error, "Unable to load member totals"),
      });
    } finally {
      setSummaryLoading(false);
      setHasLoadedSummary(true);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, refreshVersion]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveSearch(searchInput.trim());
      setPageToken(null);
      setPreviousPageTokens([]);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    const fetchUsers = async () => {
      setDirectoryLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(DIRECTORY_PAGE_LIMIT),
        });
        if (pageToken) params.set("pageToken", pageToken);
        if (activeSearch) params.set("search", activeSearch);
        if (filters.sort) params.set("sort", filters.sort);
        if (filters.membership) params.set("membership", filters.membership);
        if (filters.status) params.set("status", filters.status);
        if (filters.dateFrom || filters.dateTo) {
          params.set("dateField", filters.dateField);
          if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
          if (filters.dateTo) params.set("dateTo", filters.dateTo);
        }
        const result = await apiRequestWithResponse(
          `/admin/users?${params.toString()}`,
        );
        if (!active) return;
        const data = result.data;
        setUsers(data.map(normalizeUser));
        setNextPageToken(result.headers.get("X-Next-Page-Token"));
        const responseTotal = Number(result.headers.get("X-Total-Count"));
        setTotalCount(Number.isFinite(responseTotal) ? responseTotal : data.length);
      } catch (error) {
        if (!active) return;
        setFeedback({
          type: "error",
          text: getErrorMessage(error, "Unable to load members"),
        });
      } finally {
        if (active) {
          setDirectoryLoading(false);
          setHasLoadedDirectory(true);
        }
      }
    };
    fetchUsers();
    return () => {
      active = false;
    };
  }, [activeSearch, filters, pageToken, refreshVersion]);

  const resetDirectoryPage = () => {
    setPageToken(null);
    setPreviousPageTokens([]);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
    resetDirectoryPage();
  };

  const clearFilters = () => {
    setFilters(createDefaultFilters());
    resetDirectoryPage();
  };

  const goToNextPage = () => {
    if (!nextPageToken) return;
    setPreviousPageTokens((previous) => [...previous, pageToken]);
    setPageToken(nextPageToken);
  };

  const goToPreviousPage = () => {
    setPreviousPageTokens((previous) => {
      if (previous.length === 0) return previous;
      const updated = [...previous];
      setPageToken(updated.pop() ?? null);
      return updated;
    });
  };

  const openAddEditModal = (user = null) => {
    setFeedback(null);
    setModalError("");
    if (user) {
      setNewUser({
        name: user.name || "",
        email: user.email || "",
        password: "",
        phoneNumber: user.phoneNumber || "",
        role: user.role || "user",
        membership: user.membership || "none",
        privateSessions: user.privateSessions || "0",
        startDate: parseDate(user.startDate, null),
        endDate: parseDate(user.endDate, null),
        barcodeFile: null,
      });
      setCurrentUserId(user.id);
    } else {
      setNewUser(emptyUser());
      setCurrentUserId(null);
    }
    setIsAddEditModalOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setActionLoading(true);
    try {
      await apiRequest(`/admin/users/${userToDelete.id}`, { method: "DELETE" });
      setUsers((previous) =>
        previous.filter((user) => user.id !== userToDelete.id),
      );
      setFeedback({ type: "success", text: `${userToDelete.name} was deleted.` });
      setRefreshVersion((version) => version + 1);
      setUserToDelete(null);
    } catch (error) {
      setFeedback({
        type: "error",
        text: getErrorMessage(error, "Unable to delete this member"),
      });
    } finally {
      setActionLoading(false);
      setUserToDelete(null);
    }
  };

  const uploadBarcode = async (userId, file) => {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("Unable to read barcode image"));
      reader.readAsDataURL(file);
    });
    return jsonRequest(`/admin/users/${userId}/barcode`, "POST", {
      contentType: file.type,
      data,
    });
  };

  const validateMember = () => {
    if (!newUser.name.trim()) return "Enter the member's name.";
    if (!/^\S+@\S+\.\S+$/.test(newUser.email.trim())) return "Enter a valid email address.";
    if (!/^\+961\d{7,8}$/.test(newUser.phoneNumber)) {
      return "Enter a valid Lebanese phone number after +961.";
    }
    if (!currentUserId && newUser.password.length < 8) {
      return "New passwords must contain at least 8 characters.";
    }
    if (newUser.membership !== "none") {
      if (!newUser.startDate || !newUser.endDate) return "Choose both membership dates.";
      if (newUser.endDate < newUser.startDate) {
        return "The membership end date must be after the start date.";
      }
    }
    return "";
  };

  const handleAddEditUser = async () => {
    const validationError = validateMember();
    if (validationError) {
      setModalError(validationError);
      return;
    }

    setActionLoading(true);
    setModalError("");
    let createdUser = null;
    try {
      const userData = {
        name: newUser.name.trim(),
        email: newUser.email.trim().toLowerCase(),
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        membership: newUser.membership,
        privateSessions: newUser.privateSessions,
        startDate: newUser.membership === "none" ? "none" : newUser.startDate.toISOString(),
        endDate: newUser.membership === "none" ? "none" : newUser.endDate.toISOString(),
        ...(!currentUserId ? { password: newUser.password } : {}),
      };

      let result = currentUserId
        ? await jsonRequest(`/admin/users/${currentUserId}`, "PUT", userData)
        : await jsonRequest("/admin/users", "POST", userData);
      createdUser = currentUserId ? null : result.user;
      const userId = currentUserId || result.user.id;

      if (newUser.barcodeFile) {
        result = await uploadBarcode(userId, newUser.barcodeFile);
      }

      const savedUser = normalizeUser(result.user);
      setUsers((previous) =>
        currentUserId
          ? previous.map((user) => (user.id === currentUserId ? savedUser : user))
          : [...previous, savedUser],
      );
      setFeedback({
        type: "success",
        text: currentUserId ? "Member updated successfully." : "Member added successfully.",
      });
      setRefreshVersion((version) => version + 1);
      setIsAddEditModalOpen(false);
    } catch (error) {
      if (createdUser) {
        setUsers((previous) => [...previous, normalizeUser(createdUser)]);
        setIsAddEditModalOpen(false);
        setFeedback({
          type: "error",
          text: `Member created, but the barcode upload failed: ${getErrorMessage(error)}`,
        });
        setRefreshVersion((version) => version + 1);
      } else {
        setModalError(getErrorMessage(error, "Unable to save this member."));
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value, files } = event.target;

    if (name === "phoneNumber") {
      const digits = value.replace(/\D/g, "");
      const localNumber = digits.startsWith("961") ? digits.slice(3) : digits;
      setNewUser((previous) => ({
        ...previous,
        phoneNumber: localNumber ? `+961${localNumber.slice(0, 8)}` : "",
      }));
      return;
    }

    if (name === "membership") {
      const membershipDates =
        value === "none"
          ? { startDate: null, endDate: null }
          : getDefaultMembershipDates();
      setNewUser((previous) => ({
        ...previous,
        membership: value,
        ...membershipDates,
      }));
      return;
    }

    if (files) {
      const file = files[0] || null;
      if (file && !ALLOWED_BARCODE_TYPES.has(file.type)) {
        setModalError("Choose a JPG, PNG, or WebP barcode image.");
        event.target.value = "";
        return;
      }
      if (file && file.size > MAX_BARCODE_BYTES) {
        setModalError("Barcode images must be 5 MB or smaller.");
        event.target.value = "";
        return;
      }
      setModalError("");
      setNewUser((previous) => ({ ...previous, [name]: file }));
      return;
    }

    setNewUser((previous) => ({ ...previous, [name]: value }));
  };

  const exportUsers = () => {
    if (users.length === 0) {
      setFeedback({ type: "error", text: "There are no members to export." });
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone Number",
      "Role",
      "Start Date",
      "End Date",
      "Membership",
      "Private Sessions",
    ];
    const rows = users.map((user) => [
      user.name,
      user.email,
      user.phoneNumber,
      user.role,
      formatDate(user.startDate),
      formatDate(user.endDate),
      user.membership,
      user.privateSessions,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(toCsvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "GrowFitness-members.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const initialPageLoading = !hasLoadedDirectory || !hasLoadedSummary;
  const activeFilterCount =
    Number(filters.sort !== "end-newest") +
    Number(Boolean(filters.membership)) +
    Number(Boolean(filters.status)) +
    Number(Boolean(filters.dateFrom || filters.dateTo));
  const hasDirectoryFilters = activeFilterCount > 0 || Boolean(activeSearch);

  return (
    <>
      <Navbar title="Members" />
      <main className="page-shell">
        <header className="page-header">
          <div>
            <p className="page-eyebrow">Member operations</p>
            <h1 className="page-title">Members</h1>
            <p className="page-subtitle">
              Manage accounts, membership dates, private sessions, roles, and reception QR codes.
            </p>
          </div>
          <div className="toolbar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={exportUsers}
              disabled={initialPageLoading || directoryLoading}
            >
              Export current page
            </button>
            <button type="button" className="btn btn-primary" onClick={() => openAddEditModal()}>
              + Add member
            </button>
          </div>
        </header>

        {feedback && (
          <div className={`alert alert--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>
            <span>{feedback.text}</span>
            <button className="alert__dismiss" type="button" onClick={() => setFeedback(null)} aria-label="Dismiss message">
              ×
            </button>
          </div>
        )}

        <section
          className="stat-grid"
          aria-label="Member summary"
          aria-busy={summaryLoading}
        >
          <article className="stat-card stat-card--accent">
            <p className="stat-label">Total members</p>
            <p className="stat-value">
              {initialPageLoading ? <span className="skeleton-block skeleton-stat" /> : summary.totalMembers}
            </p>
            <p className="stat-detail">All managed accounts</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Active</p>
            <p className="stat-value">
              {initialPageLoading ? <span className="skeleton-block skeleton-stat" /> : summary.activeMembers}
            </p>
            <p className="stat-detail">Current memberships</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Expiring soon</p>
            <p className="stat-value">
              {initialPageLoading ? <span className="skeleton-block skeleton-stat" /> : summary.expiringSoon}
            </p>
            <p className="stat-detail">Within 30 days</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Paying members</p>
            <p className="stat-value">
              {initialPageLoading ? <span className="skeleton-block skeleton-stat" /> : summary.payingMembers}
            </p>
            <p className="stat-detail">With a selected membership</p>
          </article>
        </section>

        <section
          className={`surface-card directory-card${directoryLoading && !initialPageLoading ? " directory-card--refreshing" : ""}`}
          aria-label="Member directory"
          aria-busy={directoryLoading}
        >
          <div className="surface-card__header">
            <div>
              <h2>Member directory</h2>
              <p>
                {initialPageLoading ? (
                  <span className="skeleton-block skeleton-meta" aria-label="Loading members" />
                ) : (
                  <>{users.length} shown · {totalCount} {hasDirectoryFilters ? "matches" : "accounts"}</>
                )}
              </p>
            </div>
            <div className="directory-tools">
              <input
                className="search-control"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search name, email, phone…"
                aria-label="Search members"
              />
              <button
                type="button"
                className={`btn btn-secondary filter-toggle${filtersOpen ? " filter-toggle--open" : ""}`}
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                aria-controls="member-filters"
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="filter-count" aria-label={`${activeFilterCount} active filters`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="filter-bar" id="member-filters" aria-label="Member filters">
              <label className="filter-control">
                <span>Sort by</span>
                <select name="sort" value={filters.sort} onChange={handleFilterChange}>
                  <option value="end-newest">End date: newest (default)</option>
                  <option value="name-asc">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                  <option value="start-newest">Start date: newest</option>
                  <option value="start-oldest">Start date: oldest</option>
                  <option value="end-oldest">End date: oldest</option>
                </select>
              </label>

              <label className="filter-control">
                <span>Membership</span>
                <select name="membership" value={filters.membership} onChange={handleFilterChange}>
                  <option value="">All memberships</option>
                  <option value="regular">Regular</option>
                  <option value="student">Student</option>
                  <option value="none">None</option>
                </select>
              </label>

              <label className="filter-control">
                <span>Status</span>
                <select name="status" value={filters.status} onChange={handleFilterChange}>
                  <option value="">Any status</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="no-membership">No membership</option>
                </select>
              </label>

              <label className="filter-control">
                <span>Date field</span>
                <select name="dateField" value={filters.dateField} onChange={handleFilterChange}>
                  <option value="startDate">Membership start</option>
                  <option value="endDate">Membership end</option>
                </select>
              </label>

              <label className="filter-control">
                <span>From</span>
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  max={filters.dateTo || undefined}
                  onChange={handleFilterChange}
                />
              </label>

              <label className="filter-control">
                <span>To</span>
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  min={filters.dateFrom || undefined}
                  onChange={handleFilterChange}
                />
              </label>

              <button
                type="button"
                className="btn btn-ghost btn-small filter-clear"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                Clear filters
              </button>
            </div>
          )}

          <div
            className={`directory-progress${directoryLoading && !initialPageLoading ? " directory-progress--active" : ""}`}
            aria-hidden="true"
          />

          <div className="data-table-wrap directory-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Membership</th>
                  <th>Period</th>
                  <th>Email</th>
                  <th>QR code</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialPageLoading ? (
                  Array.from({ length: DIRECTORY_SKELETON_ROWS }, (_, rowIndex) => (
                    <tr className="skeleton-row" key={`skeleton-${rowIndex}`} aria-hidden="true">
                      {Array.from({ length: 8 }, (_, cellIndex) => (
                        <td key={`skeleton-${rowIndex}-${cellIndex}`}>
                          <span className="skeleton-block skeleton-cell" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.map((user) => {
                  const isCurrentAdmin = user.id === currentUser?.uid;
                  const isActive =
                    user.membership !== "none" &&
                    Boolean(user.endDate) &&
                    user.endDate.getTime() >= Date.now();
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="member-cell">
                          <MemberAvatar user={user} />
                          <div>
                            <div className="table-primary">{user.name || "Unnamed member"}</div>
                          </div>
                        </div>
                      </td>
                      <td>{user.phoneNumber || "—"}</td>
                      <td>
                        <span className={`badge${user.role === "admin" ? " badge--admin" : ""}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isActive ? "badge--active" : "badge--inactive"}`}>
                          {user.membership}
                        </span>
                      </td>
                      <td>
                        {user.membership === "none" ? (
                          <div className="table-secondary">No membership dates</div>
                        ) : (
                          <>
                            <div className="table-primary">{formatDate(user.endDate)}</div>
                            <div className="table-secondary">from {formatDate(user.startDate)}</div>
                          </>
                        )}
                      </td>
                      <td>{user.email || "—"}</td>
                      <td><BarcodePreview user={user} /></td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn btn-secondary btn-small" onClick={() => openAddEditModal(user)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-small"
                            disabled={isCurrentAdmin}
                            title={isCurrentAdmin ? "You cannot delete your own account" : `Delete ${user.name}`}
                            onClick={() => setUserToDelete(user)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!initialPageLoading && !directoryLoading && users.length === 0 && (
              <div className="empty-state">
                <strong>{hasDirectoryFilters ? "No matching members" : "No members yet"}</strong>
                {hasDirectoryFilters
                  ? "Adjust the search or filters and try again."
                  : "Add your first member to get started."}
              </div>
            )}
          </div>
          <div className="pagination-bar" aria-label="Member directory pages">
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={goToPreviousPage}
              disabled={previousPageTokens.length === 0 || directoryLoading}
            >
              Previous
            </button>
            <span>
              {initialPageLoading
                ? "Loading members…"
                : `Page ${previousPageTokens.length + 1} · ${totalCount} total`}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={goToNextPage}
              disabled={!nextPageToken || directoryLoading}
            >
              Next
            </button>
          </div>
        </section>

        <Modal
          isOpen={Boolean(userToDelete)}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDelete}
          title="Delete member"
          confirmText="Delete permanently"
          destructive
          busy={actionLoading}
        >
          <p>
            Delete <strong>{userToDelete?.name}</strong> and their associated account data? This action cannot be undone.
          </p>
        </Modal>

        <Modal
          isOpen={isAddEditModalOpen}
          onClose={() => !actionLoading && setIsAddEditModalOpen(false)}
          onConfirm={handleAddEditUser}
          title={currentUserId ? "Edit member" : "Add member"}
          confirmText={currentUserId ? "Save changes" : "Add member"}
          busy={actionLoading}
          wide
        >
          {modalError && <div className="alert alert--error" role="alert">{modalError}</div>}
          <div className="field-grid">
            <div className="field">
              <label htmlFor="member-name">Name</label>
              <input id="member-name" name="name" value={newUser.name} onChange={handleInputChange} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="member-email">Email</label>
              <input type="email" id="member-email" name="email" value={newUser.email} onChange={handleInputChange} autoComplete="email" />
            </div>
            {!currentUserId && (
              <div className="field">
                <label htmlFor="member-password">Temporary password</label>
                <input type="password" id="member-password" name="password" value={newUser.password} onChange={handleInputChange} minLength={8} autoComplete="new-password" />
                <p className="field-hint">At least 8 characters.</p>
              </div>
            )}
            <div className="field">
              <label htmlFor="member-phone">Phone number</label>
              <input id="member-phone" name="phoneNumber" value={newUser.phoneNumber} onChange={handleInputChange} inputMode="tel" placeholder="+961 70 123 456" />
            </div>
            <div className="field-pair">
              <div className="field">
                <label htmlFor="member-role">Role</label>
                <select name="role" id="member-role" value={newUser.role} onChange={handleInputChange} disabled={currentUserId === currentUser?.uid}>
                  <option value="user">Member</option>
                  <option value="admin">Administrator</option>
                </select>
                {currentUserId === currentUser?.uid && <p className="field-hint">You cannot remove your own admin role.</p>}
              </div>
              <div className="field">
                <label htmlFor="member-membership">Membership</label>
                <select name="membership" id="member-membership" value={newUser.membership} onChange={handleInputChange}>
                  <option value="none">None</option>
                  <option value="regular">Regular</option>
                  <option value="student">Student</option>
                </select>
              </div>
            </div>
            <div className="field-pair">
              <div className="field">
                <label htmlFor="member-start">Start date</label>
                <DatePicker id="member-start" selected={newUser.startDate} onChange={(date) => setNewUser((previous) => ({ ...previous, startDate: date }))} dateFormat="dd/MM/yyyy" className="datepicker-input" disabled={newUser.membership === "none"} />
              </div>
              <div className="field">
                <label htmlFor="member-end">End date</label>
                <DatePicker id="member-end" selected={newUser.endDate} minDate={newUser.startDate} onChange={(date) => setNewUser((previous) => ({ ...previous, endDate: date }))} dateFormat="dd/MM/yyyy" className="datepicker-input" disabled={newUser.membership === "none"} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="member-private">Private sessions</label>
              <select name="privateSessions" id="member-private" value={newUser.privateSessions} onChange={handleInputChange}>
                <option value="0">None</option>
                <option value="1">1 session</option>
                <option value="12">12 sessions</option>
                <option value="16">16 sessions</option>
                <option value="20">20 sessions</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="member-barcode">Reception QR code</label>
              <input type="file" id="member-barcode" name="barcodeFile" accept="image/jpeg,image/png,image/webp" onChange={handleInputChange} />
              <p className="field-hint">JPG, PNG, or WebP up to 5 MB.</p>
            </div>
          </div>
        </Modal>

        {actionLoading && (
          <div className="loading-overlay" role="status" aria-live="polite">
            <div className="loading-panel"><span className="spinner" aria-hidden="true" />Working…</div>
          </div>
        )}
      </main>
    </>
  );
};

export default Dashboard;
