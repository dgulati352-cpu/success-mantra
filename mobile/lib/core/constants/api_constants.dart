class ApiConstants {
  // Production Base URL
  static const String liveBaseUrl = 'https://www.camanishkalra.com/api';
  
  // Local Emulator Base URL (for debugging on Android emulator)
  static const String localEmulatorBaseUrl = 'http://10.0.2.2:5000/api';

  // Active Base URL
  static const String baseUrl = liveBaseUrl;

  // Auth Endpoints
  static const String login = '$baseUrl/auth/login';
  static const String register = '$baseUrl/auth/register';
  static const String profile = '$baseUrl/auth/profile';
  static const String forgotPassword = '$baseUrl/auth/forgot-password';
  static const String resetPassword = '$baseUrl/auth/reset-password';

  // Student Endpoints
  static const String studentDashboard = '$baseUrl/student/dashboard';
  static const String enrolledCourses = '$baseUrl/student/courses';
  static const String courseDetails = '$baseUrl/student/courses';
  static const String liveClasses = '$baseUrl/student/live-classes';
  static const String tests = '$baseUrl/student/tests';
  static const String notes = '$baseUrl/student/materials';
  static const String books = '$baseUrl/student/books';
  static const String certificates = '$baseUrl/student/certificates';
  static const String deleteAccount = '$baseUrl/student/account';

  // Public Endpoints
  static const String verifyCertificate = '$baseUrl/public/certificates';
  static const String systemStatus = '$baseUrl/public/system-status';

  // Payment Endpoints
  static const String createOrder = '$baseUrl/payment/create-order';
  static const String verifyPayment = '$baseUrl/payment/verify';
}
