import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation
import './Navbar.css'; // Create a CSS file for styling if needed
import { doSignOut } from '../firebase/auth';

const Navbar = ({ title }) => {
  const navigate = useNavigate(); // Initialize useNavigate hook

  return (
    <header className="navbar-header">
      <div className="logo-placeholder">
        <h1>{title}</h1>
      </div>
      <nav className="navbar">
        <button onClick={() => navigate('/dashboard')}>Users</button>
        <button onClick={() => navigate('/packages')}>Packages</button>
        <button onClick={() => navigate('/reports')}>Reports</button>
        <button onClick={() => {doSignOut().then(()=>{navigate('/signin')})}}>Logout</button>
      </nav>
    </header>
  );
};

export default Navbar;
