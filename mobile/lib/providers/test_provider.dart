import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/test_model.dart';

class TestProvider with ChangeNotifier {
  List<TestModel> _availableTests = [];
  TestModel? _activeTest;
  int _currentQuestionIndex = 0;
  final Map<int, int> _selectedAnswers = {}; // questionIndex -> optionIndex
  int _remainingSeconds = 0;
  Timer? _timer;
  bool _isLoading = false;

  List<TestModel> get availableTests => _availableTests;
  TestModel? get activeTest => _activeTest;
  int get currentQuestionIndex => _currentQuestionIndex;
  Map<int, int> get selectedAnswers => _selectedAnswers;
  int get remainingSeconds => _remainingSeconds;
  bool get isLoading => _isLoading;

  String get formattedRemainingTime {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  Future<void> fetchTests() async {
    _isLoading = true;
    notifyListeners();

    final res = await ApiClient.get(ApiConstants.tests);
    _isLoading = false;

    if (res.success && res.data != null) {
      final List rawList = res.data['tests'] ?? res.data['data'] ?? [];
      _availableTests = rawList.map((item) => TestModel.fromJson(item)).toList();
      notifyListeners();
    }
  }

  void startTest(TestModel test) {
    _activeTest = test;
    _currentQuestionIndex = 0;
    _selectedAnswers.clear();
    _remainingSeconds = test.durationMinutes * 60;

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        _remainingSeconds--;
        notifyListeners();
      } else {
        _timer?.cancel();
        notifyListeners();
      }
    });
    notifyListeners();
  }

  void selectAnswer(int questionIndex, int optionIndex) {
    _selectedAnswers[questionIndex] = optionIndex;
    notifyListeners();
  }

  void goToQuestion(int index) {
    if (_activeTest != null && index >= 0 && index < _activeTest!.questions.length) {
      _currentQuestionIndex = index;
      notifyListeners();
    }
  }

  Map<String, dynamic> calculateResults() {
    _timer?.cancel();
    if (_activeTest == null) return {};

    int correct = 0;
    int wrong = 0;
    int unattempted = 0;

    for (int i = 0; i < _activeTest!.questions.length; i++) {
      final q = _activeTest!.questions[i];
      if (_selectedAnswers.containsKey(i)) {
        if (_selectedAnswers[i] == q.correctOptionIndex) {
          correct++;
        } else {
          wrong++;
        }
      } else {
        unattempted++;
      }
    }

    final total = _activeTest!.questions.length;
    final score = total > 0 ? (correct / total) * _activeTest!.totalMarks : 0;

    return {
      'totalQuestions': total,
      'correct': correct,
      'wrong': wrong,
      'unattempted': unattempted,
      'score': score.toDouble(),
      'totalMarks': _activeTest!.totalMarks,
      'percentage': total > 0 ? ((correct / total) * 100).toStringAsFixed(1) : '0',
    };
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
