import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StudentOnboardingModal } from '../components/student/StudentOnboardingModal';
import {
  LayoutDashboard,
  BookOpen,
  Radio,
  Video,
  ShoppingBag,
  FileText,
  ClipboardList,
  Award,
  CalendarCheck,
  Crown,
  CreditCard,
  LifeBuoy,
  User,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  FolderDown
} from 'lucide-react';

export function StudentLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navSections = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Learning',
      items: [
        { label: 'My Courses', path: '/student/courses', icon: BookOpen },
        { label: 'Study Notes', path: '/student/notes', icon: FileText },
        { label: 'Live Classes', path: '/student/live', icon: Radio },
        { label: 'Recordings', path: '/student/recordings', icon: Video },
        { label: 'Offline Downloads', path: '/student/downloads', icon: FolderDown },
        { label: 'My Books', path: '/student/books', icon: ShoppingBag },
      ]
    },
    {
      title: 'Assessments',
      items: [
        { label: 'Assignments', path: '/student/assignments', icon: ClipboardList },
        { label: 'Mock Tests', path: '/student/tests', icon: Award },
        { label: 'Attendance', path: '/student/attendance', icon: CalendarCheck },
      ]
    },
    {
      title: 'Account',
      items: [
        { label: 'VIP Membership', path: '/student/membership', icon: Crown },
        { label: 'Payments', path: '/student/payments', icon: CreditCard },
        { label: 'Support', path: '/student/support', icon: LifeBuoy },
        { label: 'Profile', path: '/student/profile', icon: User },
      ]
    }
  ];

  const SidebarContent = ({ onLinkClick }) => (
    <div className="flex flex-col h-full">
      {/* Sidebar Brand */}
      <div className="p-5 pb-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/favicon.png"
            alt="Success Mantra"
            className="w-9 h-9 object-contain rounded-xl"
          />
          <div className="flex flex-col">
            <span className="font-heading font-black text-sm text-slate-900 tracking-tight leading-none">SUCCESS MANTRA</span>
            <span className="text-[9px] font-bold text-indigo-600 tracking-widest uppercase mt-0.5">Student Portal</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-5 pb-4">
        {navSections.map(section => (
          <div key={section.title} className="space-y-0.5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              {section.title}
            </p>
            {section.items.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path === '/student/notes' && location.pathname === '/student/materials');
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

      {/* User Card at Bottom */}
      <div className="p-3 border-t border-slate-100">
        <div className="p-3 rounded-xl bg-slate-50 flex items-center gap-3">
          <img
            src={user?.avatar_url || user?.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'SM'}&backgroundColor=6366f1&textColor=ffffff`}
            alt={user?.name}
            className="w-9 h-9 rounded-lg object-cover bg-indigo-100 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
            <div className="text-[10px] font-mono font-bold text-indigo-600 truncate">
              {user?.student_id || user?.profile?.student_id || 'SM-2026-STUDENT'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const needsOnboarding = user && user.role === 'student' && (!user.profile?.school || !user.profile?.academic_goal);

  return (
    <div className="flex h-screen bg-[var(--color-surface)] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-white border-r border-slate-200 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fadeIn">
          <div className="w-[290px] bg-white border-r border-slate-200 h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Success Mantra" className="h-7 w-auto object-contain" />
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <SidebarContent onLinkClick={() => setMobileMenuOpen(false)} />
            </div>
          </div>
          <div className="flex-1 bg-black/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white/90 backdrop-blur-lg border-b border-slate-200/80 px-3.5 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo on mobile topbar */}
            <Link to="/" className="lg:hidden flex items-center shrink-0">
              <img src="/logo.png" alt="Success Mantra" className="h-8 max-h-8 max-w-[125px] sm:max-w-[150px] w-auto object-contain" />
            </Link>

            {/* Breadcrumb on tablet/desktop */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-medium">Student</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-bold text-slate-700 capitalize">
                {location.pathname.split('/').pop().replace(/-/g, ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user?.student_id && (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-mono font-bold">
                ID: {user.student_id}
              </span>
            )}

            {/* Direct Logout Button on Mobile & Desktop */}
            <div className="flex items-center gap-1.5 p-1 pl-2.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-bold text-slate-800 max-w-[85px] sm:max-w-[120px] truncate">
                {user?.name?.split(' ')[0] || 'Student'}
              </span>
              <button
                onClick={logout}
                title="Log Out of Student Portal"
                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-8">
          <Outlet />
        </main>
      </div>

      <StudentOnboardingModal isOpen={needsOnboarding} onComplete={() => {}} />
    </div>
  );
}
