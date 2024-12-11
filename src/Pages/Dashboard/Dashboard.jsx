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
    membership: "none",
    privateSessions: "none",
    startDate: new Date(),
    endDate: new Date(),
    barcodeFile: null,
  }); // New/Edit user fields
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  const authApiToken = "f80db53c-2ca4-4e38-a0d3-588a69bc7281"; 
  const api = "https://us-central1-aura-9c98c.cloudfunctions.net/api/users/";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get("https://us-central1-aura-9c98c.cloudfunctions.net/api/users/admin/topSecret", {
          headers: { "auth-api": authApiToken },
        });
        const processedUsers = response.data.map((user) => ({
          ...user,
          startDate: user.startDate === "none" ? new Date() : new Date(user.startDate),
          endDate: user.endDate === "none" ? oneMonthFromNow : new Date(user.endDate),
        }));
        setUsers(processedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openAddEditModal = (user = null) => {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    if (user) {
      setNewUser({
        name: user.name || "",
        email: user.email || "",
        password: "", // Password reset handled separately
        phoneNumber: user.phoneNumber || "",
        role: user.role || "user",
        membership: user.membership || "none",
        privateSessions: user.privateSessions || "none",
        startDate: user.startDate === "none" ? new Date() : new Date(user.startDate),
        endDate: user.endDate === "none" ? oneMonthFromNow : new Date(user.endDate),
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
        membership: "none",
        privateSessions: "none",
        startDate: new Date(),
        endDate: oneMonthFromNow,
        barcodeFile: null,
      });
      setCurrentUserId(null);
    }
    setIsAddEditModalOpen(true);
  };

  const updateMemberships = async () => {
    try {
      // Show a loading state or message if needed
      console.log('Updating expired memberships...');
  
      // Make the POST request to the API
      const response = await fetch('https://us-central1-aura-9c98c.cloudfunctions.net/api/update-expired-memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Make sure the server knows you're sending JSON
          'auth-api': 'f80db53c-2ca4-4e38-a0d3-588a69bc7281', // Add the auth-api header here
        },
        body: JSON.stringify({}), // Add any necessary payload here (empty object for now)
      });
  
      // Check if the response is okay (status 200-299)
      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data); // Handle success, maybe show a success message
      } else {
        console.error('Failed to update expired memberships:', response.statusText);
        // Handle failure, maybe show an error message
      }
    } catch (error) {
      console.error('Error during update:', error);
      // Handle network or other errors
    }
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
        privateSessions: newUser.privateSessions,
        startDate: newUser.startDate,
        endDate: newUser.endDate,
        privateSessions: newUser.privateSessions,
        barcode: barcodeDownloadURL || undefined,
      };

      if (currentUserId) {
        // Edit user
        const response = await axios.put(`${api}${currentUserId}`, userData, {
          headers: { "auth-api": authApiToken },
        });
        const updatedUser = {
          ...response.data.user,
          name: response.data.user.displayName, // Map displayName to name
        };
        setUsers((prev) =>
          prev.map((user) =>
            user.id === currentUserId ? { ...user, ...updatedUser } : user
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
      if(error?.response?.data?.message[0] == "P"){
        console.log(error.response)
        setFeedbackMessage("Phone Number already exists")
      }
      else if(error?.response?.data?.message == "The email address is already in use by another account."){
        setFeedbackMessage("email already exists")
      }
      else{
      setFeedbackMessage(error?.response?.data?.message[0]);
      }
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
        <button onClick={() => updateMemberships()}>Update Memberships</button>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone Number</th>
              <th>Role</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Qr Code</th>
              <th>Membership</th>
              <th>Private</th>
              <th>Picture</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phoneNumber}</td>
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
                <td style={{
                    backgroundColor:
                      user.membership === "student" || user.membership === "regular"
                        ? "green"
                        : "red",
                    color: user.membership === "student" || user.membership === "regular" ? "white" : "inherit",
                  }}>{user.membership}</td>
                <td>{user.privateSessions}</td>
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
                  <option value="freelance">Freelance</option>
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
                  <option value="none">none</option>
                  <option value="regular">Regular</option>
                  <option value="student">Student</option>
                </select>
              </div>

              <div className="form-group">
                <label className="gow-label" htmlFor="privateSessions">Private</label>
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

              {/* Barcode upload section */}
              <div className="form-group">
                <label className="gow-label" htmlFor="barcodeFile">Barcode</label>
                <input
                  type="file"
                  id="barcodeFile"
                  name="barcodeFile"
                  accept="image/*"
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
