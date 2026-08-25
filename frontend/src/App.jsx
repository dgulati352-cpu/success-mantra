import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Common Components
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';

// Public Pages
import { Home } from './pages/public/Home';
import { Courses } from './pages/public/Courses';
import { CourseDetail } from './pages/public/CourseDetail';
import { LiveClasses } from './pages/public/LiveClasses';
import { Membership } from './pages/public/Membership';
import { Faculty } from './pages/public/Faculty';
import { Store } from './pages/public/Store';
import { VerifyCertificate } from './pages/public/VerifyCertificate';
import { About } from './pages/public/About';
import { Contact } from './pages/public/Contact';
import { Login } from './pages/public/Login';
import { Register } from './pages/public/Register';

// Layouts
import { StudentLayout } from './layouts/StudentLayout';
import { FacultyLayout } from './layouts/FacultyLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentCourses } from './pages/student/StudentCourses';
import { StudentBooks } from './pages/student/StudentBooks';
import { StudentCourseView } from './pages/student/StudentCourseView';
import { StudentVideoPlayer } from './pages/student/StudentVideoPlayer';
import { StudentLive } from './pages/student/StudentLive';
import { StudentRecordings } from './pages/student/StudentRecordings';
import { StudentMaterials } from './pages/student/StudentMaterials';
import { StudentAssignments } from './pages/student/StudentAssignments';
import { StudentTests } from './pages/student/StudentTests';
import { StudentTestEngine } from './pages/student/StudentTestEngine';
import { StudentTestResult } from './pages/student/StudentTestResult';
import { StudentAttendance } from './pages/student/StudentAttendance';
import { StudentMembership } from './pages/student/StudentMembership';
import { StudentPayments } from './pages/student/StudentPayments';
import { StudentSupport } from './pages/student/StudentSupport';
import { StudentProfile } from './pages/student/StudentProfile';

// Faculty Pages
import { FacultyDashboard } from './pages/faculty/FacultyDashboard';
import { FacultyLiveClasses } from './pages/faculty/FacultyLiveClasses';
import { FacultyAssignments } from './pages/faculty/FacultyAssignments';
import { FacultyMaterials } from './pages/faculty/FacultyMaterials';
import { FacultyTests } from './pages/faculty/FacultyTests';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminClasses } from './pages/admin/AdminClasses';
import { AdminCourses } from './pages/admin/AdminCourses';
import { AdminBooks } from './pages/admin/AdminBooks';
import { AdminTests } from './pages/admin/AdminTests';
import { AdminMemberships } from './pages/admin/AdminMemberships';
import { AdminLiveClasses } from './pages/admin/AdminLiveClasses';
import { AdminLiveRoom } from './pages/admin/AdminLiveRoom';
import { AdminLiveSummary } from './pages/admin/AdminLiveSummary';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCoupons } from './pages/admin/AdminCoupons';
import { AdminCMS } from './pages/admin/AdminCMS';
import { AdminSupport } from './pages/admin/AdminSupport';
import { AdminCertificates } from './pages/admin/AdminCertificates';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';

// Student Live Classroom Room
import { StudentLiveRoom } from './pages/student/StudentLiveRoom';

// Dev Minimal WebRTC Lab
import { WebRTCTest } from './pages/dev/WebRTCTest';

// Protected Route Guard
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin' || user.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'faculty') return <Navigate to="/faculty/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }
  return children;
}

// Public Shell with Navbar and Footer
function PublicShell({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* 1. Public Marketing Routes */}
            <Route path="/" element={<PublicShell><Home /></PublicShell>} />
            <Route path="/courses" element={<PublicShell><Courses /></PublicShell>} />
            <Route path="/courses/:slug" element={<PublicShell><CourseDetail /></PublicShell>} />
            <Route path="/live-classes" element={<PublicShell><LiveClasses /></PublicShell>} />
            <Route path="/membership" element={<PublicShell><Membership /></PublicShell>} />
            <Route path="/store" element={<PublicShell><Store /></PublicShell>} />
            <Route path="/faculty" element={<PublicShell><Faculty /></PublicShell>} />
            <Route path="/verify-certificate" element={<PublicShell><VerifyCertificate /></PublicShell>} />
            <Route path="/about" element={<PublicShell><About /></PublicShell>} />
            <Route path="/contact" element={<PublicShell><Contact /></PublicShell>} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />

            {/* 2. Student Portal Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student', 'admin', 'super_admin', 'faculty']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="courses" element={<StudentCourses />} />
              <Route path="courses/:id" element={<StudentCourseView />} />
              <Route path="books" element={<StudentBooks />} />
              <Route path="lessons/:id" element={<StudentVideoPlayer />} />
              <Route path="live" element={<StudentLive />} />
              <Route path="recordings" element={<StudentRecordings />} />
              <Route path="materials" element={<StudentMaterials />} />
              <Route path="assignments" element={<StudentAssignments />} />
              <Route path="tests" element={<StudentTests />} />
              <Route path="tests/:id/take" element={<StudentTestEngine />} />
              <Route path="tests/:id/result" element={<StudentTestResult />} />
              <Route path="attendance" element={<StudentAttendance />} />
              <Route path="membership" element={<StudentMembership />} />
              <Route path="payments" element={<StudentPayments />} />
              <Route path="support" element={<StudentSupport />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>

            {/* 3. Faculty Portal Routes */}
            <Route
              path="/faculty"
              element={
                <ProtectedRoute allowedRoles={['faculty', 'admin', 'super_admin']}>
                  <FacultyLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/faculty/dashboard" replace />} />
              <Route path="dashboard" element={<FacultyDashboard />} />
              <Route path="classes" element={<FacultyLiveClasses />} />
              <Route path="assignments" element={<FacultyAssignments />} />
              <Route path="materials" element={<FacultyMaterials />} />
              <Route path="tests" element={<FacultyTests />} />
            </Route>

            {/* 4. Admin ERP & CMS Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="classes" element={<AdminClasses />} />
              <Route path="academic-classes" element={<Navigate to="/admin/classes" replace />} />
              <Route path="academic_classes" element={<Navigate to="/admin/classes" replace />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="tests" element={<AdminTests />} />
              <Route path="memberships" element={<AdminMemberships />} />
              <Route path="books" element={<AdminBooks />} />
              <Route path="live-classes" element={<AdminLiveClasses />} />
              <Route path="live_classes" element={<Navigate to="/admin/live-classes" replace />} />
              <Route path="live classes" element={<Navigate to="/admin/live-classes" replace />} />
              <Route path="live-classes/:id/summary" element={<AdminLiveSummary />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="cms" element={<AdminCMS />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="certificates" element={<AdminCertificates />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
            </Route>

            {/* 5. Native Live Classroom Studio & Student Rooms (Immersive Fullscreen) */}
            <Route
              path="/admin/live-classes/:id/room"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin', 'faculty']}>
                  <AdminLiveRoom />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/live-classes/:id/room"
              element={
                <ProtectedRoute allowedRoles={['student', 'admin', 'super_admin']}>
                  <StudentLiveRoom />
                </ProtectedRoute>
              }
            />

            {/* 6. Minimal Standalone WebRTC Lab for Direct Diagnostic Testing */}
            <Route path="/dev/webrtc-test" element={<WebRTCTest />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
