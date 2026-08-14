import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./Dashboard.css";
import Modal from "../../components/Modal";
import Navbar from "../../components/Navbar";
import { apiRequest, getErrorMessage, jsonRequest } from "../../api/client";
import { useAuth } from "../../contexts/authContext";

const missingImage = "https://www.freeiconspng.com/thumbs/x-png/x-png-33.png";

const toCsvCell = (value) => {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text.trimStart())) {
    text = `'${text}`;
  }
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
  startDate: parseDate(user.startDate, new Date()),
  endDate: parseDate(user.endDate, oneMonthFromNow()),
});

const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB");
};

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [newUser, setNewUser] = useState(emptyUser);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await apiRequest("/admin/users");
        const sortedUsers = data
          .map(normalizeUser)
          .sort((a, b) => b.endDate - a.endDate);
        setUsers(sortedUsers);
      } catch (error) {
        setFeedbackMessage(getErrorMessage(error, "Unable to load users"));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const openAddEditModal = (user = null) => {
    setFeedbackMessage("");
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

  const openDeleteModal = (userId) => {
    setUserIdToDelete(userId);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiRequest(`/admin/users/${userIdToDelete}`, { method: "DELETE" });
      setUsers((previous) =>
        previous.filter((user) => user.id !== userIdToDelete),
      );
      setFeedbackMessage("User deleted successfully");
    } catch (error) {
      setFeedbackMessage(getErrorMessage(error, "Unable to delete user"));
    } finally {
      setLoading(false);
      setIsDeleteModalOpen(false);
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

  const handleAddEditUser = async () => {
    if (
      !newUser.name.trim() ||
      !newUser.email.trim() ||
      !newUser.phoneNumber.trim() ||
      (!currentUserId && newUser.password.length < 8) ||
      !newUser.startDate ||
      !newUser.endDate
    ) {
      setFeedbackMessage(
        "Complete all required fields. New passwords must contain at least 8 characters.",
      );
      return;
    }

    setLoading(true);
    setFeedbackMessage("");
    let createdUser = null;
    try {
      const userData = {
        name: newUser.name,
        email: newUser.email,
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
        currentUserId
          ? previous.map((user) =>
              user.id === currentUserId ? savedUser : user,
            )
          : [...previous, savedUser],
      );
      setFeedbackMessage(
        currentUserId ? "User updated successfully" : "User added successfully",
      );
      setIsAddEditModalOpen(false);
    } catch (error) {
      if (createdUser) {
        setUsers((previous) => [...previous, normalizeUser(createdUser)]);
        setIsAddEditModalOpen(false);
        setFeedbackMessage(
          `User created, but the barcode upload failed: ${getErrorMessage(error)}`,
        );
      } else {
        setFeedbackMessage(
          getErrorMessage(error, "Unable to save the user. Please try again."),
        );
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
        phoneNumber: localNumber ? `+961${localNumber}` : "",
      }));
      return;
    }

    setNewUser((previous) => ({
      ...previous,
      [name]: files ? files[0] : value,
    }));
  };

  const exportUsers = () => {
    if (users.length === 0) {
      setFeedbackMessage("No data available to export");
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
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "UserRecords.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Navbar title="User Dashboard" />
      <div className="dashboard">
        {loading && (
          <div className="overlay">
            <div className="spinner" />
          </div>
        )}
        {feedbackMessage && (
          <div className="feedback-message">{feedbackMessage}</div>
        )}

        <button onClick={() => openAddEditModal()}>Add User</button>
        <button onClick={exportUsers}>Export users</button>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone Number</th>
              <th>Role</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>QR Code</th>
              <th>Membership</th>
              <th>Private</th>
              <th>Picture</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isCurrentAdmin = user.id === currentUser?.uid;
              return (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phoneNumber}</td>
                  <td>{user.role}</td>
                  <td>{formatDate(user.startDate)}</td>
                  <td>{formatDate(user.endDate)}</td>
                  <td>
                    <img
                      src={
                        !user.barcode || user.barcode === "none"
                          ? missingImage
                          : user.barcode
                      }
                      alt={
                        user.barcode === "none"
                          ? "No barcode"
                          : `${user.name} barcode`
                      }
                      style={{ width: 50, height: 50 }}
                    />
                  </td>
                  <td
                    style={{
                      backgroundColor:
                        user.membership === "student" ||
                        user.membership === "regular"
                          ? "green"
                          : "red",
                      color:
                        user.membership === "student" ||
                        user.membership === "regular"
                          ? "white"
                          : "inherit",
                    }}
                  >
                    {user.membership}
                  </td>
                  <td>{user.privateSessions}</td>
                  <td>
                    <img
                      src={
                        !user.profilePicture || user.profilePicture === "none"
                          ? missingImage
                          : user.profilePicture
                      }
                      alt={
                        user.profilePicture
                          ? `${user.name} profile`
                          : "No profile"
                      }
                      style={{ width: 50, height: 50 }}
                    />
                  </td>
                  <td>
                    <button onClick={() => openAddEditModal(user)}>Edit</button>
                    <button
                      disabled={isCurrentAdmin}
                      title={
                        isCurrentAdmin
                          ? "You cannot delete your own account"
                          : ""
                      }
                      onClick={() => openDeleteModal(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {isDeleteModalOpen && (
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleDelete}
            title="Confirm Delete"
            message="Are you sure you want to delete this user?"
            confirmText="Delete"
            cancelText="Cancel"
          />
        )}

        <Modal
          isOpen={isAddEditModalOpen}
          onClose={() => setIsAddEditModalOpen(false)}
          onConfirm={handleAddEditUser}
          title={currentUserId ? "Edit User" : "Add User"}
          message={
            <>
              <div className="form-group">
                <label className="gow-label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="gow-label" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              {!currentUserId && (
                <div className="form-group">
                  <label className="gow-label" htmlFor="password">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={newUser.password}
                    onChange={handleInputChange}
                    minLength={8}
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label className="gow-label" htmlFor="phoneNumber">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={newUser.phoneNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="gow-label">Start Date</label>
                <DatePicker
                  selected={newUser.startDate}
                  onChange={(date) =>
                    setNewUser((previous) => ({ ...previous, startDate: date }))
                  }
                  dateFormat="dd/MM/yyyy"
                  className="datepicker-wrapper"
                />
              </div>
              <div className="form-group">
                <label className="gow-label">End Date</label>
                <DatePicker
                  selected={newUser.endDate}
                  onChange={(date) =>
                    setNewUser((previous) => ({ ...previous, endDate: date }))
                  }
                  dateFormat="dd/MM/yyyy"
                  className="datepicker-wrapper"
                />
              </div>
              <div className="form-group">
                <label className="gow-label" htmlFor="role">
                  Role
                </label>
                <select
                  name="role"
                  id="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  disabled={currentUserId === currentUser?.uid}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="gow-label" htmlFor="membership">
                  Membership
                </label>
                <select
                  name="membership"
                  id="membership"
                  value={newUser.membership}
                  onChange={handleInputChange}
                >
                  <option value="none">None</option>
                  <option value="regular">Regular</option>
                  <option value="student">Student</option>
                </select>
              </div>
              <div className="form-group">
                <label className="gow-label" htmlFor="privateSessions">
                  Private
                </label>
                <select
                  name="privateSessions"
                  id="privateSessions"
                  value={newUser.privateSessions}
                  onChange={handleInputChange}
                >
                  <option value="0">None</option>
                  <option value="1">1 Session</option>
                  <option value="12">12 Sessions</option>
                  <option value="16">16 Sessions</option>
                  <option value="20">20 Sessions</option>
                </select>
              </div>
              <div className="form-group">
                <label className="gow-label" htmlFor="barcodeFile">
                  Barcode
                </label>
                <input
                  type="file"
                  id="barcodeFile"
                  name="barcodeFile"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleInputChange}
                />
              </div>
            </>
          }
          confirmText={currentUserId ? "Update User" : "Add User"}
        />
      </div>
    </>
  );
};

export default Dashboard;
