class CourseModel {
  final String id;
  final String title;
  final String? description;
  final String? targetClass;
  final String? thumbnail;
  final double price;
  final int totalLessons;
  final int completedLessons;
  final double progressPercent;

  CourseModel({
    required this.id,
    required this.title,
    this.description,
    this.targetClass,
    this.thumbnail,
    required this.price,
    this.totalLessons = 0,
    this.completedLessons = 0,
    this.progressPercent = 0.0,
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    final total = json['total_lessons'] ?? json['lessons_count'] ?? 0;
    final completed = json['completed_lessons'] ?? 0;
    final progress = total > 0 ? (completed / total) * 100 : 0.0;

    return CourseModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      targetClass: json['target_class'] ?? json['class'],
      thumbnail: json['thumbnail_url'] ?? json['thumbnail'],
      price: (json['price'] != null) ? double.tryParse(json['price'].toString()) ?? 0.0 : 0.0,
      totalLessons: total,
      completedLessons: completed,
      progressPercent: progress.toDouble(),
    );
  }
}
