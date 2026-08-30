class LiveClassModel {
  final String id;
  final String title;
  final String? description;
  final String targetClass;
  final String facultyName;
  final String status; // 'scheduled', 'live', 'ended'
  final DateTime scheduledAt;
  final String? roomId;

  LiveClassModel({
    required this.id,
    required this.title,
    this.description,
    required this.targetClass,
    required this.facultyName,
    required this.status,
    required this.scheduledAt,
    this.roomId,
  });

  bool get isLive => status == 'live';

  factory LiveClassModel.fromJson(Map<String, dynamic> json) {
    DateTime parsedDate;
    try {
      parsedDate = DateTime.parse(json['scheduled_at'] ?? json['date'] ?? DateTime.now().toIso8601String());
    } catch (_) {
      parsedDate = DateTime.now();
    }

    return LiveClassModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      targetClass: json['target_class'] ?? json['class'] ?? 'Commerce',
      facultyName: json['faculty_name'] ?? json['teacher'] ?? 'CA Manish Kalra',
      status: json['status'] ?? 'scheduled',
      scheduledAt: parsedDate,
      roomId: json['room_id'] ?? json['id']?.toString(),
    );
  }
}
