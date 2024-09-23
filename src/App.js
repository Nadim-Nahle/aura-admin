import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Pages/Home/Home';
import Dashboard from './Pages/Dashboard/Dashboard';
import PackagePage from './Pages/Packages/PackagePage';
import SignIn from './Pages/SignIn/SignIn';
import { AuthProvider } from './contexts/authContext';
import ProtectedRoute from './contexts/ProtectedRoute';

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/" element={<ProtectedRoute element={<Home />} />} />
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route path="/packages" element={<ProtectedRoute element={<PackagePage />} />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
