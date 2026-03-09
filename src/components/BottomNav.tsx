import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, PenLine, Swords, BarChart3, UserCircle } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/',       label: 'Dashboard', icon: LayoutDashboard },
  { path: '/log',    label: 'Log',       icon: PenLine },
  { path: '/quests', label: 'Quests',    icon: Swords },
  { path: '/stats',  label: 'Stats',     icon: BarChart3 },
  { path: '/profile',label: 'Profile',   icon: UserCircle },
];

export default function BottomNav() {
  const location = useLocation();
  const activeIndex = NAV_ITEMS.findIndex(item => item.path === location.pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#060a18]/95 backdrop-blur-md border-t border-cyan-500/10">
      <div className="max-w-lg mx-auto relative">
        {/* Indicator bar — positioned via percentage, no layout dependency */}
        {activeIndex >= 0 && (
          <div
            className="absolute top-0 h-[2px] bg-cyan-400 rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${100 / NAV_ITEMS.length}%`,
              left: `${(activeIndex / NAV_ITEMS.length) * 100}%`,
              boxShadow: '0 0 8px rgba(0, 212, 255, 0.6)',
            }}
          >
            {/* Inner glow centered within the tab width */}
            <div className="absolute inset-0 flex justify-center">
              <div className="w-10 h-full bg-cyan-400 rounded-full" />
            </div>
          </div>
        )}

        <div className="flex items-center h-16 px-2">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className="flex-1">
                <div className="flex flex-col items-center gap-0.5 py-2">
                  <Icon size={20} className={`transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                  <span className={`text-[10px] font-medium tracking-wide transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
