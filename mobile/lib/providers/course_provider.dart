import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/course_model.dart';
import '../models/lesson_model.dart';

class CourseProvider with ChangeNotifier {
  List<CourseModel> _enrolledCourses = [];
  List<LessonModel> _courseLessons = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<CourseModel> get enrolledCourses => _enrolledCourses;
  List<LessonModel> get courseLessons => _courseLessons;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchEnrolledCourses() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final res = await ApiClient.get(ApiConstants.enrolledCourses);
    _isLoading = false;

    if (res.success && res.data != null) {
      final List rawList = res.data['courses'] ?? res.data['data'] ?? [];
      _enrolledCourses = rawList.map((item) => CourseModel.fromJson(item)).toList();
      notifyListeners();
    } else {
      _errorMessage = res.message ?? 'Failed to load courses';
      notifyListeners();
    }
  }

  Future<void> fetchCourseLessons(String courseId) async {
    _isLoading = true;
    _courseLessons = [];
    notifyListeners();

    final res = await ApiClient.get('${ApiConstants.courseDetails}/$courseId/lessons');
    _isLoading = false;

    if (res.success && res.data != null) {
      final List rawList = res.data['lessons'] ?? res.data['data'] ?? [];
      _courseLessons = rawList.map((item) => LessonModel.fromJson(item)).toList();
      notifyListeners();
    } else {
      _errorMessage = res.message ?? 'Failed to load lessons';
      notifyListeners();
    }
  }

  Future<void> markLessonCompleted(String lessonId) async {
    await ApiClient.post('${ApiConstants.baseUrl}/student/lessons/$lessonId/complete');
    final index = _courseLessons.indexWhere((l) => l.id == lessonId);
    if (index != -1) {
      _courseLessons[index] = LessonModel(
        id: _courseLessons[index].id,
        courseId: _courseLessons[index].courseId,
        title: _courseLessons[index].title,
        description: _courseLessons[index].description,
        videoUrl: _courseLessons[index].videoUrl,
        durationSeconds: _courseLessons[index].durationSeconds,
        orderIndex: _courseLessons[index].orderIndex,
        isCompleted: true,
        pdfAttachmentUrl: _courseLessons[index].pdfAttachmentUrl,
      );
      notifyListeners();
    }
  }
}
