import React, { useState, useEffect } from "react";
import "./Dashboard.css"; // Adjust the path as needed
import Modal from "../../components/Modal"; // Import the Modal component
import Navbar from "../../components/Navbar";
import axios from "axios"; // Import Axios
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import Firebase Storage
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // Import DatePicker CSS

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false); // State to control the overlay
  const [feedbackMessage, setFeedbackMessage] = useState(""); // Feedback message

  const [isModalOpen, setIsModalOpen] = useState(false); // State to control the delete modal
  const [userIdToDelete, setUserIdToDelete] = useState(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false); // For the Add/Edit modal
  const [currentUserId, setCurrentUserId] = useState(null); // ID of the user being edited or deleted
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    role: "user",
    membership: "regular",
    startDate: new Date(),
    endDate: new Date(),
    barcodeFile: null,
  }); // New/Edit user fields

  const authApiToken = "f80db53c-2ca4-4e38-a0d3-588a69bc7281"; // Replace this with your actual auth token
  const api = "https://us-central1-aura-9c98c.cloudfunctions.net/api/users/";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(api, {
          headers: { "auth-api": authApiToken },
        });
        setUsers(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openAddEditModal = (user = null) => {
    if (user) {
      setNewUser({
        name: user.name || "",
        email: user.email || "",
        password: "", // Password reset handled separately
        phoneNumber: user.phoneNumber || "",
        role: user.role || "user",
        membership: user.membership || "regular",
        startDate: user.startDate || new Date(),
        endDate: user.endDate || new Date(),
        barcodeFile: null, // Barcode update is optional
      });
      setCurrentUserId(user.id);
    } else {
      setNewUser({
        name: "",
        email: "",
        password: "",
        phoneNumber: "",
        role: "user",
        membership: "regular",
        startDate: new Date(),
        endDate: new Date(),
        barcodeFile: null,
      });
      setCurrentUserId(null);
    }
    setIsAddEditModalOpen(true);
  };

  const openDeleteModal = (userId) => {
    setUserIdToDelete(userId); // Set the user ID to be deleted
    setIsModalOpen(true); // Open the modal
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${api}${userIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'auth-api': authApiToken,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete the user');
      }

      setUsers(users.filter(user => user.id !== userIdToDelete)); // Remove user
      setFeedbackMessage('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      setFeedbackMessage('Error deleting user');
    } finally {
      setLoading(false);
      setIsModalOpen(false); // Close the modal
    }
  };

  const handleAddEditUser = async () => {
    setLoading(true);

    try {
      let barcodeDownloadURL = "";
      if (newUser.barcodeFile) {
        const storage = getStorage();
        const filename = newUser.barcodeFile.name;
        const storageRef = ref(storage, `barcodes/${filename}`);
        await uploadBytes(storageRef, newUser.barcodeFile);
        barcodeDownloadURL = await getDownloadURL(storageRef);
      }

      const userData = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password || undefined,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        membership: newUser.membership,
        startDate: newUser.startDate,
        endDate: newUser.endDate,
        membership: newUser.membership,
        barcode: barcodeDownloadURL || undefined,
      };

      if (currentUserId) {
        // Edit user
        const response = await axios.put(`${api}${currentUserId}`, userData, {
          headers: { "auth-api": authApiToken },
        });
        setUsers((prev) =>
          prev.map((user) =>
            user.id === currentUserId ? { ...user, ...response.data.user } : user
          )
        );
        setFeedbackMessage("User updated successfully");
      } else {
        // Add user
        const response = await axios.post(api, userData, {
          headers: { "auth-api": authApiToken },
        });
        setUsers((prev) => [...prev, response.data.user]);
        setFeedbackMessage("User added successfully");
      }
    } catch (error) {
      console.error("Error adding/editing user:", error);
      setFeedbackMessage(error?.response?.data?.message[0]);
    } finally {
      setLoading(false);
      setIsAddEditModalOpen(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  return (
    <>
      <Navbar title="User Dashboard" />
      <div className="dashboard">
        {loading && (
          <div className="overlay">
            <div className="spinner"></div>
          </div>
        )}
        {feedbackMessage && <div className="feedback-message">{feedbackMessage}</div>}

        <button onClick={() => openAddEditModal()}>Add User</button>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Qr Code</th>
              <th>Membership</th>
              <th>Picture</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{new Date(user.startDate).toLocaleDateString("en-GB")}</td>
                <td>{new Date(user.endDate).toLocaleDateString("en-GB")}</td>
                <td>
                  {user.barcode === "none" ? (
                    <img
                      src={"https://www.freeiconspng.com/thumbs/x-png/x-png-33.png"}
                      style={{ width: 50, height: 50 }}
                    />
                  ) : (
                    <img src={user.barcode} style={{ width: 50, height: 50 }} />
                  )}
                </td>
                <td>{user.membership}</td>
                <td>
                  {user.profilePicture === "1" ? (
                    <img
                      src={"https://www.freeiconspng.com/thumbs/x-png/x-png-33.png"}
                      style={{ width: 50, height: 50 }}
                    />
                  ) : (
                    <img src={user.profilePicture} style={{ width: 50, height: 50 }} />
                  )}
                </td>
                <td>
                  <button onClick={() => openAddEditModal(user)}>Edit</button>
                  <button onClick={() => openDeleteModal(user.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)} // Close the modal
            onConfirm={handleDelete} // Trigger the delete action
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
                <label className="gow-label" htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Name"
                  value={newUser.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="gow-label" htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={handleInputChange}
                />
              </div>

              {!currentUserId && (
                <div className="form-group">
                  <label className="gow-label" htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="gow-label" htmlFor="phoneNumber">Phone Number</label>
                <input
                  type="text"
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="Phone Number"
                  value={newUser.phoneNumber}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="gow-label" htmlFor="startDate">Start Date</label>
                <DatePicker
                  selected={newUser.startDate}
                  onChange={(date) => setNewUser((prev) => ({ ...prev, startDate: date }))}
                  dateFormat="dd/MM/yyyy"
                  className="datepicker-wrapper"
                />
              </div>

              <div className="form-group">
                <label className="gow-label" htmlFor="endDate">End Date</label>
                <DatePicker
                  selected={newUser.endDate}
                  onChange={(date) => setNewUser((prev) => ({ ...prev, endDate: date }))}
                  dateFormat="dd/MM/yyyy"
                  className="datepicker-wrapper"
                />
              </div>

              <div className="form-group">
                <label className="gow-label" htmlFor="role">Role</label>
                <select
                  name="role"
                  id="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label className="gow-label" htmlFor="membership">Membership</label>
                <select
                  name="membership"
                  id="membership"
                  value={newUser.membership}
                  onChange={handleInputChange}
                >
                  <option value="regular">Regular</option>
                  <option value="student">Student</option>
                </select>
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
