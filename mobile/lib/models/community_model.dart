import 'live_class_model.dart';

class ClassCommunityModel {
  final String id;
  final String? classId;
  final String targetClass;
  final String name;
  final String description;
  final String? bannerUrl;
  final String icon;
  final String accentColor;
  final String badge;
  final String facultyMentor;
  final int memberCount;
  final int postCount;
  final bool isMember;
  final int liveNowCount;

  ClassCommunityModel({
    required this.id,
    this.classId,
    required this.targetClass,
    required this.name,
    required this.description,
    this.bannerUrl,
    required this.icon,
    required this.accentColor,
    required this.badge,
    required this.facultyMentor,
    required this.memberCount,
    required this.postCount,
    required this.isMember,
    required this.liveNowCount,
  });

  factory ClassCommunityModel.fromJson(Map<String, dynamic> json) {
    return ClassCommunityModel(
      id: json['id']?.toString() ?? '',
      classId: json['class_id']?.toString(),
      targetClass: json['target_class'] ?? 'Class 12',
      name: json['name'] ?? 'Class Community',
      description: json['description'] ?? '',
      bannerUrl: json['banner_url'],
      icon: json['icon'] ?? '🎓',
      accentColor: json['accent_color'] ?? 'bg-indigo-500',
      badge: json['badge'] ?? 'Class Group',
      facultyMentor: json['faculty_mentor'] ?? 'CA Manish Kalra',
      memberCount: (json['member_count'] as num?)?.toInt() ?? 0,
      postCount: (json['post_count'] as num?)?.toInt() ?? 0,
      isMember: json['is_member'] == true || json['is_member'] == 1,
      liveNowCount: (json['live_now_count'] as num?)?.toInt() ?? 0,
    );
  }
}

class CommunityCommentModel {
  final int id;
  final int postId;
  final String userId;
  final String authorName;
  final String authorRole;
  final String? authorAvatar;
  final String content;
  final DateTime createdAt;

  CommunityCommentModel({
    required this.id,
    required this.postId,
    required this.userId,
    required this.authorName,
    required this.authorRole,
    this.authorAvatar,
    required this.content,
    required this.createdAt,
  });

  factory CommunityCommentModel.fromJson(Map<String, dynamic> json) {
    DateTime dt;
    try {
      dt = DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String());
    } catch (_) {
      dt = DateTime.now();
    }
    return CommunityCommentModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      postId: (json['post_id'] as num?)?.toInt() ?? 0,
      userId: json['user_id']?.toString() ?? '',
      authorName: json['author_name'] ?? 'Member',
      authorRole: json['author_role'] ?? 'student',
      authorAvatar: json['author_avatar'],
      content: json['content'] ?? '',
      createdAt: dt,
    );
  }
}

class CommunityPostModel {
  final int id;
  final String communityId;
  final String userId;
  final String authorName;
  final String authorRole;
  final String? authorAvatar;
  final String postType; // 'live_class_update', 'announcement', 'doubt', 'discussion'
  final String? title;
  final String content;
  final String? liveClassId;
  final String? liveClassTitle;
  final String? liveClassStatus;
  final DateTime? liveClassStartTime;
  final String? attachmentUrl;
  final String? attachmentType; // 'image', 'pdf'
  final bool isPinned;
  final int likesCount;
  final int commentsCount;
  final DateTime createdAt;
  final List<CommunityCommentModel> comments;

  CommunityPostModel({
    required this.id,
    required this.communityId,
    required this.userId,
    required this.authorName,
    required this.authorRole,
    this.authorAvatar,
    required this.postType,
    this.title,
    required this.content,
    this.liveClassId,
    this.liveClassTitle,
    this.liveClassStatus,
    this.liveClassStartTime,
    this.attachmentUrl,
    this.attachmentType,
    required this.isPinned,
    required this.likesCount,
    required this.commentsCount,
    required this.createdAt,
    this.comments = const [],
  });

  bool get isLiveUpdate => postType == 'live_class_update';
  bool get isAnnouncement => postType == 'announcement';
  bool get isDoubt => postType == 'doubt';
  bool get hasAttachment => attachmentUrl != null && attachmentUrl!.isNotEmpty;

  factory CommunityPostModel.fromJson(Map<String, dynamic> json) {
    DateTime dt;
    try {
      dt = DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String());
    } catch (_) {
      dt = DateTime.now();
    }

    DateTime? lStartTime;
    if (json['live_class_start_time'] != null) {
      try {
        lStartTime = DateTime.parse(json['live_class_start_time']);
      } catch (_) {}
    }

    final rawComments = json['comments'] as List? ?? [];
    final commentsList = rawComments.map((c) => CommunityCommentModel.fromJson(c)).toList();

    return CommunityPostModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      communityId: json['community_id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      authorName: json['author_name'] ?? 'Instructor',
      authorRole: json['author_role'] ?? 'student',
      authorAvatar: json['author_avatar'],
      postType: json['post_type'] ?? 'announcement',
      title: json['title'],
      content: json['content'] ?? '',
      liveClassId: json['live_class_id']?.toString(),
      liveClassTitle: json['live_class_title'],
      liveClassStatus: json['live_class_status'],
      liveClassStartTime: lStartTime,
      attachmentUrl: json['attachment_url'],
      attachmentType: json['attachment_type'],
      isPinned: json['is_pinned'] == 1 || json['is_pinned'] == true,
      likesCount: (json['likes_count'] as num?)?.toInt() ?? 0,
      commentsCount: (json['comments_count'] as num?)?.toInt() ?? 0,
      createdAt: dt,
      comments: commentsList,
    );
  }
}

class CommunityMemberModel {
  final int id;
  final String userId;
  final String name;
  final String email;
  final String? avatarUrl;
  final String role;
  final String? school;
  final String? city;
  final String? targetClass;
  final DateTime joinedAt;

  CommunityMemberModel({
    required this.id,
    required this.userId,
    required this.name,
    required this.email,
    this.avatarUrl,
    required this.role,
    this.school,
    this.city,
    this.targetClass,
    required this.joinedAt,
  });

  factory CommunityMemberModel.fromJson(Map<String, dynamic> json) {
    DateTime dt;
    try {
      dt = DateTime.parse(json['joined_at'] ?? DateTime.now().toIso8601String());
    } catch (_) {
      dt = DateTime.now();
    }
    return CommunityMemberModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      userId: json['user_id']?.toString() ?? '',
      name: json['name'] ?? 'Student',
      email: json['email'] ?? '',
      avatarUrl: json['avatar_url'],
      role: json['role'] ?? 'student',
      school: json['school'],
      city: json['city'],
      targetClass: json['target_class'],
      joinedAt: dt,
    );
  }
}
