import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DemoSwitcherModal } from '../components/common/DemoSwitcherModal';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Radio,
  CreditCard,
  Tag,
  FileText,
  LifeBuoy,
  Award,
  Activity,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  Shield
} from 'lucide-react';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navSections = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Management',
      items: [
        { label: 'Students', path: '/admin/students', icon: Users },
        { label: 'Courses & LMS', path: '/admin/courses', icon: BookOpen },
        { label: 'Live Classes', path: '/admin/live-classes', icon: Radio },
      ]
    },
    {
      title: 'Commerce',
      items: [
        { label: 'Orders & Payments', path: '/admin/orders', icon: CreditCard },
        { label: 'Coupons', path: '/admin/coupons', icon: Tag },
      ]
    },
    {
      title: 'Platform',
      items: [
        { label: 'CMS', path: '/admin/cms', icon: FileText },
        { label: 'Support', path: '/admin/support', icon: LifeBuoy },
        { label: 'Certificates', path: '/admin/certificates', icon: Award },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: Activity },
      ]
    }
  ];

  const SidebarContent = ({ onLinkClick }) => (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-500/25">
            SM
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-black text-sm text-slate-900 tracking-tight leading-none">Success Mantra</span>
            <span className="text-[9px] font-bold text-indigo-600 tracking-widest uppercase mt-0.5">Admin & ERP</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-5 pb-4">
        {navSections.map(section => (
          <div key={section.title} className="space-y-0.5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{section.title}</p>
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onLinkClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white/60"></div>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="p-3 rounded-xl bg-slate-50 flex items-center gap-3">
          <img
            src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'A'}&backgroundColor=4f46e5&textColor=ffffff`}
            alt={user?.name}
            className="w-9 h-9 rounded-lg object-cover bg-indigo-100"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
            <div className="text-[10px] text-indigo-600 font-bold uppercase">Super Admin</div>
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
              <span className="font-medium">Admin</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-bold text-slate-700 capitalize">{location.pathname.split('/').pop().replace(/-/g, ' ')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Firebase & DB Online
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
