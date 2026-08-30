import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Common Components & System States
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { OfflineBanner } from './components/common/OfflineBanner';
import { CookieConsent } from './components/common/CookieConsent';
import { OfferNotificationPrompt } from './components/common/OfferNotificationPrompt';

// Public Marketing & Portal Pages
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
import { ForgotPassword } from './pages/public/ForgotPassword';
import { ResetPassword } from './pages/public/ResetPassword';

// Legal & Compliance Pages
import { PrivacyPolicy } from './pages/public/PrivacyPolicy';
import { TermsOfService } from './pages/public/TermsOfService';
import { RefundPolicy } from './pages/public/RefundPolicy';
import { ShippingPolicy } from './pages/public/ShippingPolicy';
import { CookiePolicy } from './pages/public/CookiePolicy';
import { Disclaimer } from './pages/public/Disclaimer';
import { AccessibilityStatement } from './pages/public/AccessibilityStatement';
import { SecurityPolicy } from './pages/public/SecurityPolicy';
import { CommunityGuidelines } from './pages/public/CommunityGuidelines';

// Payment Lifecycle Pages
import { PaymentSuccess } from './pages/payment/PaymentSuccess';
import { PaymentFailed } from './pages/payment/PaymentFailed';
import { PaymentPending } from './pages/payment/PaymentPending';

// UX & System States
import { NotFound } from './pages/public/NotFound';
import { Forbidden } from './pages/public/Forbidden';
import { Maintenance } from './pages/public/Maintenance';

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
import { AdminMaterials } from './pages/admin/AdminMaterials';
import { AdminBooks } from './pages/admin/AdminBooks';
import { AdminTests } from './pages/admin/AdminTests';
import { AdminMemberships } from './pages/admin/AdminMemberships';
import { AdminLiveClasses } from './pages/admin/AdminLiveClasses';
import { AdminRecordings } from './pages/admin/AdminRecordings';
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
    return <Navigate to="/403" replace />;
  }
  return children;
}

// Public Shell with Navbar, Footer, and Global States
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
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <OfflineBanner />
            <CookieConsent />
            <OfferNotificationPrompt />
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

              {/* 2. Customer Lifecycle & Authentication Routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />

              {/* 3. Legal & Compliance Routes */}
              <Route path="/privacy-policy" element={<PublicShell><PrivacyPolicy /></PublicShell>} />
              <Route path="/terms-of-service" element={<PublicShell><TermsOfService /></PublicShell>} />
              <Route path="/refund-policy" element={<PublicShell><RefundPolicy /></PublicShell>} />
              <Route path="/shipping-policy" element={<PublicShell><ShippingPolicy /></PublicShell>} />
              <Route path="/cookie-policy" element={<PublicShell><CookiePolicy /></PublicShell>} />
              <Route path="/disclaimer" element={<PublicShell><Disclaimer /></PublicShell>} />
              <Route path="/accessibility" element={<PublicShell><AccessibilityStatement /></PublicShell>} />
              <Route path="/security" element={<PublicShell><SecurityPolicy /></PublicShell>} />
              <Route path="/community-guidelines" element={<PublicShell><CommunityGuidelines /></PublicShell>} />

              {/* 4. Payment Lifecycle Routes */}
              <Route
                path="/payment/success"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin', 'super_admin', 'faculty']}>
                    <PublicShell><PaymentSuccess /></PublicShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment/failed"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin', 'super_admin', 'faculty']}>
                    <PublicShell><PaymentFailed /></PublicShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment/pending"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin', 'super_admin', 'faculty']}>
                    <PublicShell><PaymentPending /></PublicShell>
                  </ProtectedRoute>
                }
              />

              {/* 5. Student Portal Routes */}
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
                <Route path="notes" element={<StudentMaterials />} />
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

              {/* 6. Faculty Portal Routes */}
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

              {/* 7. Admin ERP & CMS Routes */}
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
                <Route path="courses" element={<AdminCourses />} />
                <Route path="materials" element={<AdminMaterials />} />
                <Route path="notes" element={<Navigate to="/admin/materials" replace />} />
                <Route path="tests" element={<AdminTests />} />
                <Route path="books" element={<AdminBooks />} />
                <Route path="memberships" element={<AdminMemberships />} />
                <Route path="live-classes" element={<AdminLiveClasses />} />
                <Route path="recordings" element={<AdminRecordings />} />
                <Route path="live-classes/:id/summary" element={<AdminLiveSummary />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="cms" element={<AdminCMS />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="certificates" element={<AdminCertificates />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
              </Route>

              {/* 8. Native Live Classroom Studio & Student Rooms */}
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

              {/* 9. Minimal Standalone WebRTC Lab */}
              <Route path="/dev/webrtc-test" element={<WebRTCTest />} />

              {/* 10. System States & Fallback Routes */}
              <Route path="/403" element={<Forbidden />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="*" element={<PublicShell><NotFound /></PublicShell>} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
