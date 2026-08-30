class UserModel {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String role;
  final String? targetClass;
  final String? school;
  final String? city;
  final String? academicGoal;
  final String? bio;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    this.targetClass,
    this.school,
    this.city,
    this.academicGoal,
    this.bio,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final profile = json['profile'] is Map<String, dynamic> ? json['profile'] : {};
    return UserModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone']?.toString(),
      role: json['role'] ?? 'student',
      targetClass: profile['target_class'] ?? json['target_class'],
      school: profile['school'] ?? json['school'],
      city: profile['city'] ?? json['city'],
      academicGoal: profile['academic_goal'] ?? json['academic_goal'],
      bio: profile['bio'] ?? json['bio'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
      'role': role,
      'target_class': targetClass,
      'school': school,
      'city': city,
      'academic_goal': academicGoal,
      'bio': bio,
    };
  }
}
