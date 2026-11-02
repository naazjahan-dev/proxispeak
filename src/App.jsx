import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AudioProvider } from './context/AudioContext';
import Navbar from './components/common/Navbar';
import MiniPlayer from './components/player/MiniPlayer';
import AudioPlayer from './components/player/AudioPlayer';

import Dashboard from './pages/Dashboard';
import NearbyAudio from './pages/NearbyAudio';
import AudioLibrary from './pages/AudioLibrary';
import MapPage from './pages/MapPage';
import Processing from './pages/Processing';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AudioProvider>
          <div className="app-container">
            {/* Persistent Global Navigation */}
            <Navbar />

            {/* Dynamic Route Viewport */}
            <main className="app-content">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<Dashboard />} />
                <Route path="/nearby" element={<NearbyAudio />} />
                <Route path="/library" element={<AudioLibrary />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/processing" element={<Processing />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Synchronized Audio Player Interfaces */}
            <MiniPlayer />
            <AudioPlayer />
          </div>
        </AudioProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
