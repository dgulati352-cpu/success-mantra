class LessonModel {
  final String id;
  final String courseId;
  final String title;
  final String? description;
  final String videoUrl;
  final int durationSeconds;
  final int orderIndex;
  final bool isCompleted;
  final String? pdfAttachmentUrl;

  LessonModel({
    required this.id,
    required this.courseId,
    required this.title,
    this.description,
    required this.videoUrl,
    this.durationSeconds = 0,
    this.orderIndex = 1,
    this.isCompleted = false,
    this.pdfAttachmentUrl,
  });

  factory LessonModel.fromJson(Map<String, dynamic> json) {
    return LessonModel(
      id: json['id']?.toString() ?? '',
      courseId: json['course_id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      videoUrl: json['video_url'] ?? json['url'] ?? '',
      durationSeconds: json['duration_seconds'] ?? (json['duration'] != null ? int.tryParse(json['duration'].toString()) ?? 0 : 0),
      orderIndex: json['order_index'] ?? 1,
      isCompleted: json['is_completed'] ?? false,
      pdfAttachmentUrl: json['pdf_url'] ?? json['attachment_url'],
    );
  }

  String get formattedDuration {
    final minutes = durationSeconds ~/ 60;
    final seconds = durationSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
}
