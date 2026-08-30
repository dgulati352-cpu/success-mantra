class CertificateModel {
  final String id;
  final String studentName;
  final String? studentPhone;
  final String courseName;
  final String verificationCode;
  final String issueDate;
  final String? grade;

  CertificateModel({
    required this.id,
    required this.studentName,
    this.studentPhone,
    required this.courseName,
    required this.verificationCode,
    required this.issueDate,
    this.grade,
  });

  factory CertificateModel.fromJson(Map<String, dynamic> json) {
    return CertificateModel(
      id: json['id']?.toString() ?? '',
      studentName: json['student_name'] ?? json['name'] ?? '',
      studentPhone: json['student_phone'] ?? json['phone']?.toString(),
      courseName: json['course_name'] ?? json['course'] ?? 'Academic Course',
      verificationCode: json['verification_code'] ?? json['code'] ?? '',
      issueDate: json['issue_date'] ?? json['created_at'] ?? '2026-08-28',
      grade: json['grade'] ?? 'Distinction (A+)',
    );
  }

  String get verificationUrl => 'https://www.camanishkalra.com/verify-certificate?code=$verificationCode';
}
