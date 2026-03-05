import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Search, Home, BarChart3, MessageSquare } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '../../lib/utils';

export function AppLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
        return;
      }

      if (!isEditing && e.altKey) {
        if (e.key === '1') { e.preventDefault(); navigate('/'); }
        else if (e.key === '2') { e.preventDefault(); navigate('/search'); }
        else if (e.key === '3') { e.preventDefault(); navigate('/stats'); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const navItems = [
    { to: '/', icon: Home, label: 'Conversations' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
  ];

  return (
    <div className="flex h-screen">
      <nav className="w-16 bg-[#e8f0eb] flex flex-col items-center py-4 gap-2 border-r border-[#d0ddd5]">
        <div className="w-10 h-10 rounded-lg bg-[#7ec8a0] flex items-center justify-center mb-4 text-white">
          <MessageSquare size={20} />
        </div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'w-12 h-12 rounded-lg flex items-center justify-center transition-colors',
              isActive ? 'bg-[#7ec8a0] text-white shadow-sm' : 'text-[#6b8578] hover:bg-[#d4e6da] hover:text-[#3d5248]'
            )}
            title={item.label}
            end={item.to === '/'}
          >
            <item.icon size={20} />
          </NavLink>
        ))}
        <div className="mt-auto text-[10px] text-[#9aafa3] text-center leading-tight px-1">
          <div>⌘K Search</div>
          <div>Alt+1-3</div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden bg-[#f7faf8]">
        <Outlet />
      </main>
    </div>
  );
}
