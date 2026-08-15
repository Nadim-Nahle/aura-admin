import React, { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./Dashboard.css";
import Modal from "../../components/Modal";
import Navbar from "../../components/Navbar";
import { apiRequest, getErrorMessage, jsonRequest } from "../../api/client";
import { useAuth } from "../../contexts/authContext";

const MAX_BARCODE_BYTES = 5 * 1024 * 1024;
const ALLOWED_BARCODE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const toCsvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const oneMonthFromNow = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
};

const emptyUser = () => ({
  name: "",
  email: "",
  password: "",
  phoneNumber: "",
  role: "user",
  membership: "none",
  privateSessions: "0",
  startDate: new Date(),
  endDate: oneMonthFromNow(),
  barcodeFile: null,
});

const parseDate = (value, fallback) => {
  if (!value || value === "none") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const normalizeUser = (user) => ({
  ...user,
  name: user.displayName || user.name || "",
  startDate: parseDate(user.startDate, null),
  endDate: parseDate(user.endDate, null),
});

const sortUsers = (users) =>
  [...users].sort(
    (a, b) =>
      (b.endDate?.getTime?.() || 0) - (a.endDate?.getTime?.() || 0),
  );

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
  return (
    <span className="avatar" aria-hidden="true">
      {hasImage(user.profilePicture) && !failed ? (
        <img
          src={user.profilePicture}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(user.name)
      )}
    </span>
  );
};

const BarcodePreview = ({ user }) => {
  const [failed, setFailed] = useState(false);
  if (!hasImage(user.barcode) || failed) {
    return <span className="image-placeholder">No QR</span>;
  }
  return (
    <img
      className="barcode-preview"
      src={user.barcode}
      alt={`${user.name} barcode`}
      onError={() => setFailed(true)}
    />
  );
};

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [modalError, setModalError] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [newUser, setNewUser] = useState(emptyUser);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await apiRequest("/admin/users");
        setUsers(sortUsers(data.map(normalizeUser)));
      } catch (error) {
        setFeedback({
          type: "error",
          text: getErrorMessage(error, "Unable to load members"),
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const active = users.filter(
      (user) =>
        user.membership !== "none" &&
        Boolean(user.endDate) &&
        user.endDate.getTime() >= now,
    ).length;
    const expiring = users.filter((user) => {
      const remaining = user.endDate ? user.endDate.getTime() - now : -1;
      return user.membership !== "none" && remaining >= 0 && remaining <= thirtyDays;
    }).length;
    return {
      total: users.length,
      active,
      admins: users.filter((user) => user.role === "admin").length,
      expiring,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.name, user.email, user.phoneNumber, user.membership, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search, users]);

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
        startDate: parseDate(user.startDate, new Date()),
        endDate: parseDate(user.endDate, oneMonthFromNow()),
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
    setLoading(true);
    try {
      await apiRequest(`/admin/users/${userToDelete.id}`, { method: "DELETE" });
      setUsers((previous) =>
        previous.filter((user) => user.id !== userToDelete.id),
      );
      setFeedback({ type: "success", text: `${userToDelete.name} was deleted.` });
      setUserToDelete(null);
    } catch (error) {
      setFeedback({
        type: "error",
        text: getErrorMessage(error, "Unable to delete this member"),
      });
    } finally {
      setLoading(false);
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
    if (!newUser.startDate || !newUser.endDate) return "Choose both membership dates.";
    if (newUser.endDate < newUser.startDate) {
      return "The membership end date must be after the start date.";
    }
    return "";
  };

  const handleAddEditUser = async () => {
    const validationError = validateMember();
    if (validationError) {
      setModalError(validationError);
      return;
    }

    setLoading(true);
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
        startDate: newUser.startDate.toISOString(),
        endDate: newUser.endDate.toISOString(),
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
        sortUsers(
          currentUserId
            ? previous.map((user) => (user.id === currentUserId ? savedUser : user))
            : [...previous, savedUser],
        ),
      );
      setFeedback({
        type: "success",
        text: currentUserId ? "Member updated successfully." : "Member added successfully.",
      });
      setIsAddEditModalOpen(false);
    } catch (error) {
      if (createdUser) {
        setUsers((previous) => sortUsers([...previous, normalizeUser(createdUser)]));
        setIsAddEditModalOpen(false);
        setFeedback({
          type: "error",
          text: `Member created, but the barcode upload failed: ${getErrorMessage(error)}`,
        });
      } else {
        setModalError(getErrorMessage(error, "Unable to save this member."));
      }
    } finally {
      setLoading(false);
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
            <button type="button" className="btn btn-secondary" onClick={exportUsers}>
              Export CSV
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

        <section className="stat-grid" aria-label="Member summary">
          <article className="stat-card stat-card--accent">
            <p className="stat-label">Total members</p>
            <p className="stat-value">{stats.total}</p>
            <p className="stat-detail">All managed accounts</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Active</p>
            <p className="stat-value">{stats.active}</p>
            <p className="stat-detail">Current memberships</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Expiring soon</p>
            <p className="stat-value">{stats.expiring}</p>
            <p className="stat-detail">Within 30 days</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Administrators</p>
            <p className="stat-value">{stats.admins}</p>
            <p className="stat-detail">Privileged accounts</p>
          </article>
        </section>

        <section className="surface-card">
          <div className="surface-card__header">
            <div>
              <h2>Member directory</h2>
              <p>{filteredUsers.length} of {users.length} accounts</p>
            </div>
            <input
              className="search-control"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, phone…"
              aria-label="Search members"
            />
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Membership</th>
                  <th>Period</th>
                  <th>Private</th>
                  <th>QR code</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
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
                            <div className="table-secondary">{user.email}</div>
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
                        <div className="table-primary">{formatDate(user.startDate)}</div>
                        <div className="table-secondary">to {formatDate(user.endDate)}</div>
                      </td>
                      <td>{user.privateSessions === "0" || user.privateSessions === "none" ? "None" : user.privateSessions}</td>
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
            {!loading && filteredUsers.length === 0 && (
              <div className="empty-state">
                <strong>{users.length ? "No matching members" : "No members yet"}</strong>
                {users.length ? "Try a different search term." : "Add your first member to get started."}
              </div>
            )}
          </div>
        </section>

        <Modal
          isOpen={Boolean(userToDelete)}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDelete}
          title="Delete member"
          confirmText="Delete permanently"
          destructive
          busy={loading}
        >
          <p>
            Delete <strong>{userToDelete?.name}</strong> and their associated account data? This action cannot be undone.
          </p>
        </Modal>

        <Modal
          isOpen={isAddEditModalOpen}
          onClose={() => !loading && setIsAddEditModalOpen(false)}
          onConfirm={handleAddEditUser}
          title={currentUserId ? "Edit member" : "Add member"}
          confirmText={currentUserId ? "Save changes" : "Add member"}
          busy={loading}
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
            <div className="field">
              <label htmlFor="member-start">Start date</label>
              <DatePicker id="member-start" selected={newUser.startDate} onChange={(date) => setNewUser((previous) => ({ ...previous, startDate: date }))} dateFormat="dd/MM/yyyy" className="datepicker-input" />
            </div>
            <div className="field">
              <label htmlFor="member-end">End date</label>
              <DatePicker id="member-end" selected={newUser.endDate} minDate={newUser.startDate} onChange={(date) => setNewUser((previous) => ({ ...previous, endDate: date }))} dateFormat="dd/MM/yyyy" className="datepicker-input" />
            </div>
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

        {loading && (
          <div className="loading-overlay" role="status" aria-live="polite">
            <div className="loading-panel"><span className="spinner" aria-hidden="true" />Working…</div>
          </div>
        )}
      </main>
    </>
  );
};

export default Dashboard;
