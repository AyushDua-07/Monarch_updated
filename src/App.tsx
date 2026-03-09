import { Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import BottomNav from './components/BottomNav';
import PageLoader from './components/PageLoader';
import SplashScreen from './components/SplashScreen';
import Dashboard from './pages/Dashboard';
import Log from './pages/Log';
import Quests from './pages/Quests';
import Stats from './pages/Stats';
import Profile from './pages/Profile';

export default function App() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const prevPath = useRef(location.pathname);

  // Page transition loader
  useEffect(() => {
    if (showSplash) return; // don't trigger during splash
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname;
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 400);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, showSplash]);

  // Splash screen on initial load
  if (showSplash) {
    return (
      <AnimatePresence>
        <SplashScreen onComplete={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  return (
    <div className="max-w-lg mx-auto relative">
      <PageLoader isLoading={isLoading} />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/log" element={<Log />} />
        <Route path="/quests" element={<Quests />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
