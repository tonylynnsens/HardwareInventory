import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Assets from "@/pages/Assets";
import AssetDetail from "@/pages/AssetDetail";
import Maintenance from "@/pages/Maintenance";
import Employees from "@/pages/Employees";
import Locations from "@/pages/Locations";
import Categories from "@/pages/Categories";
import Settings from "@/pages/Settings";

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/assets" element={<Protected><Assets /></Protected>} />
          <Route path="/assets/:id" element={<Protected><AssetDetail /></Protected>} />
          <Route path="/maintenance" element={<Protected><Maintenance /></Protected>} />
          <Route path="/employees" element={<Protected><Employees /></Protected>} />
          <Route path="/locations" element={<Protected><Locations /></Protected>} />
          <Route path="/categories" element={<Protected><Categories /></Protected>} />
          <Route path="/settings" element={<Protected><Settings /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
