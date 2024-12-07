import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Pages/Home/Home';
import Dashboard from './Pages/Dashboard/Dashboard';
import PackagePage from './Pages/Packages/PackagePage';
import SignIn from './Pages/SignIn/SignIn';
import { AuthProvider } from './contexts/authContext';
import ProtectedRoute from './contexts/ProtectedRoute';
import ReportPage from './Pages/Report/ReportPage';

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/" element={<ProtectedRoute element={<Home />} />} />
        <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
        <Route path="/packages" element={<ProtectedRoute element={<PackagePage />} />} />
        <Route path="/reports" element={<ProtectedRoute element={<ReportPage />} />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
