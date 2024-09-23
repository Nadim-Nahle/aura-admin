import React, { useState, useEffect } from 'react';
import './Dashboard.css'; // Adjust the path as needed
import Modal from '../../components/Modal'; // Import the Modal component
import Navbar from '../../components/Navbar';

const Dashboard = () => {
  const [users, setUsers] = useState([]);
  const [loadingId] = useState(null); // State to track the loading user ID
  const [loading, setLoading] = useState(false); // State to control the overlay
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control the modal
  const [userIdToDelete, setUserIdToDelete] = useState(null); // User ID to delete
  const [feedbackMessage, setFeedbackMessage] = useState(''); // Feedback message
  const authApiToken = 'f80db53c-2ca4-4e38-a0d3-588a69bc7281'; // Replace this with your actual auth token
  const api = 'http://127.0.0.1:5001/aura-9c98c/us-central1/api/users';

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
      const response = await fetch(`${api}/${userIdToDelete}`, {
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
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Subscription</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.displayName}</td>
              <td>{user.email}</td>
              <td>{user.subscription}</td>
              <td>{user.startDate}</td>
              <td>{user.endDate}</td>
              <td>{user.role}</td>
              <td>
                <button onClick={() => handleEdit(user.id)}>Edit</button>
                <button
                  onClick={() => openDeleteModal(user.id)}
                  disabled={loadingId === user.id}
                >
                  {loadingId === user.id ? (
                    <span className="loader"></span> // Loader class
                  ) : (
                    'Delete'
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this user?"
        confirmText="Delete"
      />
    </div>
    </>
  );
};

export default Dashboard;
