import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Log from './pages/Log';
import Quests from './pages/Quests';
import Stats from './pages/Stats';
import Profile from './pages/Profile';

export default function App() {
  return (
    <div className="max-w-lg mx-auto relative">
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<Log />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}
