class QuestionModel {
  final String id;
  final String text;
  final List<String> options;
  final int correctOptionIndex;
  final String? explanation;

  QuestionModel({
    required this.id,
    required this.text,
    required this.options,
    required this.correctOptionIndex,
    this.explanation,
  });

  factory QuestionModel.fromJson(Map<String, dynamic> json) {
    var rawOptions = json['options'];
    List<String> parsedOptions = [];
    if (rawOptions is List) {
      parsedOptions = rawOptions.map((e) => e.toString()).toList();
    } else if (rawOptions is Map) {
      parsedOptions = rawOptions.values.map((e) => e.toString()).toList();
    }

    return QuestionModel(
      id: json['id']?.toString() ?? '',
      text: json['text'] ?? json['question'] ?? '',
      options: parsedOptions,
      correctOptionIndex: json['correct_index'] ?? json['answer'] ?? 0,
      explanation: json['explanation'],
    );
  }
}

class TestModel {
  final String id;
  final String title;
  final String? description;
  final String targetClass;
  final int durationMinutes;
  final int totalMarks;
  final List<QuestionModel> questions;

  TestModel({
    required this.id,
    required this.title,
    this.description,
    required this.targetClass,
    this.durationMinutes = 30,
    this.totalMarks = 50,
    this.questions = const [],
  });

  factory TestModel.fromJson(Map<String, dynamic> json) {
    var rawQuestions = json['questions'];
    List<QuestionModel> parsedQuestions = [];
    if (rawQuestions is List) {
      parsedQuestions = rawQuestions
          .map((q) => QuestionModel.fromJson(q as Map<String, dynamic>))
          .toList();
    }

    return TestModel(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'],
      targetClass: json['target_class'] ?? json['class'] ?? 'Class 12',
      durationMinutes: json['duration_minutes'] ?? (json['duration'] != null ? int.tryParse(json['duration'].toString()) ?? 30 : 30),
      totalMarks: json['total_marks'] ?? 50,
      questions: parsedQuestions,
    );
  }
}
