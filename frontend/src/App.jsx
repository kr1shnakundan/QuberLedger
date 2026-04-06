import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMe } from "./store/authSlice.js";

import Layout                  from "./components/Layout.jsx";
import ProtectedRoute          from "./components/ProtectedRoute.jsx";
import LoginPage               from "./pages/LoginPage.jsx";
import RegisterPage            from "./pages/RegisterPage.jsx";
import DashboardPage           from "./pages/DashboardPage.jsx";
import RecordsPage             from "./pages/RecordsPage.jsx";
import UsersPage               from "./pages/UsersPage.jsx";
import ProfilePage             from "./pages/ProfilePage.jsx";
import CategoricalAnalysisPage from "./pages/CategoricalAnalysisPage.jsx";

export default function App() {
  const dispatch = useDispatch();
  const { token, initialized } = useSelector((s) => s.auth);

  useEffect(() => {
    if (token) dispatch(fetchMe());
    else dispatch({ type: "auth/fetchMe/rejected" });
  }, []);

  if (token && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — redirect to home if already logged in */}
        <Route path="/login"    element={token ? <Navigate to="/" replace /> : <LoginPage />}    />
        <Route path="/register" element={token ? <Navigate to="/" replace /> : <RegisterPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index              element={<DashboardPage />}           />
            <Route path="records"     element={<RecordsPage />}             />
            <Route path="categorical" element={<CategoricalAnalysisPage />} />
            <Route path="users"       element={<UsersPage />}               />
            <Route path="profile"     element={<ProfilePage />}             />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
