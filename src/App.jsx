import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Dashboard from './pages/Dashboard';
import NearbyAudio from './pages/NearbyAudio';
import AudioLibrary from './pages/AudioLibrary';
import MapPage from './pages/MapPage';
import Processing from './pages/Processing';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppRoutes() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <div className="app-container">
        {user && <Navbar />}
        <main className={user ? "app-content" : "auth-content"}>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
            <Route path="/*" element={user ? <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/nearby" element={<NearbyAudio />} />
              <Route path="/library" element={<AudioLibrary />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/processing" element={<Processing />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes> : <Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
