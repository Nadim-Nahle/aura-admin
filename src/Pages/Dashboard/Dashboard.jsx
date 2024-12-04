import React, { useState, useEffect } from 'react';
import './Dashboard.css'; // Adjust the path as needed
import Modal from '../../components/Modal'; // Import the Modal component
import Navbar from '../../components/Navbar';
import axios from 'axios'; // Import Axios
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import Firebase Storage

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [loadingId] = useState(null); // State to track the loading user ID
  const [loading, setLoading] = useState(false); // State to control the overlay
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control the delete modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false); // State for the Add User modal
  const [userIdToDelete, setUserIdToDelete] = useState(null); // User ID to delete
  const [feedbackMessage, setFeedbackMessage] = useState(''); // Feedback message
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'user',
    membership: 'regular',
  }); // New user fields
  const authApiToken = 'f80db53c-2ca4-4e38-a0d3-588a69bc7281'; // Replace this with your actual auth token
  const api = 'https://us-central1-aura-9c98c.cloudfunctions.net/api/users/';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Show overlay during data fetch
      try {
        const response = await fetch(api, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'auth-api': authApiToken,
          },
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false); // Hide overlay after data fetch
      }
    };

    fetchData();
  }, []);

  const handleEdit = (userId) => {
    // Logic to handle editing a user
    console.log(`Edit user with ID: ${userId}`);
  };

  const handleDelete = async () => {
    setLoading(true); // Show overlay during delete
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

      // Remove the deleted user from the state
      setUsers(users.filter(user => user.id !== userIdToDelete));
      setFeedbackMessage('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      setFeedbackMessage('Error deleting user');
    } finally {
      setLoading(false); // Hide overlay after delete
      setIsModalOpen(false); // Close confirmation modal
    }
  };

  const openDeleteModal = (userId) => {
    setUserIdToDelete(userId);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleAddUser = async () => {
    setLoading(true);

    try {
      let barcodeDownloadURL = '';

      // Check if barcode file exists
      if (newUser.barcodeFile) {
        const storage = getStorage();
        const filename = newUser.barcodeFile.name; // Use file name
        const storageRef = ref(storage, `barcodes/${filename}`);

        // Convert the file to a blob
        const blob = new Blob([newUser.barcodeFile], { type: newUser.barcodeFile.type });
        await uploadBytes(storageRef, blob);

        // Get download URL
        barcodeDownloadURL = await getDownloadURL(storageRef);
      }

      // Create the new user object
      const userData = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        phoneNumber: newUser.phoneNumber,
        role: newUser.role,
        membership: newUser.membership,
        barcode: barcodeDownloadURL, // Use the uploaded barcode URL
      };

      // Send data to the API
      const response = await axios.post(api, userData, {
        headers: {
          'Content-Type': 'application/json',
          'auth-api': authApiToken,
        },
      });

      if (response.status === 200 || response.status === 201 || response.status === 204) {
        setUsers((prevUsers) => [...prevUsers, response.data.user]); // Update state with the new user
        setFeedbackMessage('User added successfully');
      } else {
        throw new Error('Failed to add user');
      }
    } catch (error) {
      console.error('Error adding user:', error?.response?.data?.message);
      setFeedbackMessage(error?.response?.data?.message || 'Error adding user');
    } finally {
      setLoading(false);
      setIsAddModalOpen(false); // Close the modal
    }
  };


  const handleInputChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'barcode') {
      const file = files[0]; // Get the uploaded file
      setNewUser((prevUser) => ({
        ...prevUser,
        barcodeFile: file, // Save the file for upload
      }));
    } else {
      setNewUser((prevUser) => ({
        ...prevUser,
        [name]: value,
      }));
    }
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
        {feedbackMessage && (
          <div className="feedback-message">
            {feedbackMessage}
          </div>
        )}

        {/* Button to open the Add User modal */}
        <button onClick={openAddModal}>Add User</button>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>membership</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Barcode</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.name || user.displayName}</td> {/* Ensure correct property */}
                <td>{user.email}</td>
                <td>{user.membership}</td>
                <td>{user.startDate}</td>
                <td>{user.endDate}</td>
                <td>{user.barcode == "none" ? <img src={"https://www.freeiconspng.com/thumbs/x-png/x-png-33.png"} style={{ width: 50, height: 50 }} /> : <img src={user.barcode} style={{ width: 50, height: 50 }} />}</td>
                <td>{user.role}</td>
                <td>
                  <button onClick={() => handleEdit(user.id)}>Edit</button>
                  <button onClick={() => openDeleteModal(user.id)} disabled={loadingId === user.id}>
                    {loadingId === user.id ? <span className="loader"></span> : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Modal for adding a user */}
        {isAddModalOpen && (
          <Modal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onConfirm={handleAddUser}
            title="Add New User"
            message={
              <>
                <div>
                  <label>Name:</label>
                  <input
                    type="text"
                    name="name"
                    value={newUser.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label>Password:</label>
                  <input
                    type="password"
                    name="password"
                    value={newUser.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label>Phone Number:</label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={newUser.phoneNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label>Barcode:</label>
                  <input
                    type="text"
                    name="barcode"
                    value={newUser.barcode}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </>
            }
            confirmText="Add User"
          />
        )}

        {/* Confirmation Modal for Deleting User */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onConfirm={handleAddUser}
          title="Add New User"
          message={
            <>
              <div>
                <label>Name:</label>
                <input
                  type="text"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label>Password:</label>
                <input
                  type="password"
                  name="password"
                  value={newUser.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label>Phone Number:</label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={newUser.phoneNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label>Type:</label>
                <select
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="freelance">Freelance</option>
                </select>
              </div>
              <div>
                <label>Membership:</label>
                <select
                  name="membership"
                  value={newUser.membership}
                  onChange={handleInputChange}
                  required
                >
                  <option value="regular">regular</option>
                  <option value="student">student</option>
                </select>
              </div>
              <div>
                <label>Barcode:</label>
                <input
                  type="file"
                  name="barcode"
                  accept="image/*"
                  onChange={handleInputChange}
                  required
                />
              </div>
            </>
          }
          confirmText="Add User"
        />

      </div>
    </>
  );
};

export default Dashboard;
