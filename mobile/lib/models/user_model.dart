class UserModel {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String role;
  final String? targetClass;
  final String? school;
  final String? city;
  final String? address;
  final String? state;
  final String? pincode;
  final String? academicGoal;
  final String? bio;
  final bool isOnboarded;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.role,
    this.targetClass,
    this.school,
    this.city,
    this.address,
    this.state,
    this.pincode,
    this.academicGoal,
    this.bio,
    this.isOnboarded = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final profile = json['profile'] is Map<String, dynamic> ? json['profile'] : {};
    final bool onboarded = json['is_onboarded'] == true ||
        json['is_onboarded'] == 1 ||
        profile['is_onboarded'] == true;
    return UserModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone']?.toString(),
      role: json['role'] ?? 'student',
      targetClass: profile['target_class'] ?? json['target_class'],
      school: profile['school'] ?? json['school'],
      city: profile['city'] ?? json['city'],
      address: profile['address'] ?? json['address'],
      state: profile['state'] ?? json['state'],
      pincode: profile['pincode'] ?? json['pincode'],
      academicGoal: profile['academic_goal'] ?? json['academic_goal'],
      bio: profile['bio'] ?? json['bio'],
      isOnboarded: onboarded,
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
      'address': address,
      'state': state,
      'pincode': pincode,
      'academic_goal': academicGoal,
      'bio': bio,
      'is_onboarded': isOnboarded,
    };
  }
}
