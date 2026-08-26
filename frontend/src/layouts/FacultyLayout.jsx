import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Radio,
  ClipboardList,
  FileText,
  Award,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  UserCheck
} from 'lucide-react';

export function FacultyLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
    { label: 'Live Classes', path: '/faculty/classes', icon: Radio },
    { label: 'Assignments', path: '/faculty/assignments', icon: ClipboardList },
    { label: 'Study Materials', path: '/faculty/materials', icon: FileText },
    { label: 'Test Creator', path: '/faculty/tests', icon: Award },
  ];

  const SidebarContent = ({ onLinkClick }) => (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-emerald-500/25">
            SM
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-black text-sm text-slate-900 tracking-tight leading-none">Success Mantra</span>
            <span className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase mt-0.5">Faculty Portal</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-4">
        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Educator Tools</p>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className="flex-1">{item.label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="p-3 rounded-xl bg-slate-50 flex items-center gap-3">
          <img
            src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'F'}&backgroundColor=059669&textColor=ffffff`}
            alt={user?.name}
            className="w-9 h-9 rounded-lg object-cover bg-emerald-100"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
            <div className="text-[10px] text-emerald-600 font-semibold">Senior Faculty</div>
          </div>
          <button onClick={logout} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--color-surface)] overflow-hidden">
      <aside className="hidden lg:flex flex-col w-[260px] bg-white border-r border-slate-200 shrink-0">
        <SidebarContent />
      </aside>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-[280px] bg-white border-r border-slate-200 h-full shadow-2xl">
            <div className="flex items-center justify-end p-3">
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent onLinkClick={() => setMobileMenuOpen(false)} />
          </div>
          <div className="flex-1 bg-black/30 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-medium">Faculty</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-bold text-slate-700 capitalize">{location.pathname.split('/').pop().replace(/-/g, ' ')}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
