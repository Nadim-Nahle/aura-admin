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
    <h1>website under maintainance</h1>
  );
};

export default App;
