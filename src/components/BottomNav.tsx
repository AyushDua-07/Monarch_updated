import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, PenLine, Swords, BarChart3, UserCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { path: '/',       label: 'Dashboard', icon: LayoutDashboard },
  { path: '/log',    label: 'Log',       icon: PenLine },
  { path: '/quests', label: 'Quests',    icon: Swords },
  { path: '/stats',  label: 'Stats',     icon: BarChart3 },
  { path: '/profile',label: 'Profile',   icon: UserCircle },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#060a18]/95 backdrop-blur-md border-t border-cyan-500/10">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path}>
              <div className="flex flex-col items-center gap-0.5 relative px-3 py-1">
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-cyan-400 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(0, 212, 255, 0.6)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={20} className={`transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                <span className={`text-[10px] font-medium tracking-wide transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
