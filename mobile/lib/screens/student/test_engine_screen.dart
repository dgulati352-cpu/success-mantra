import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../models/test_model.dart';
import '../../providers/test_provider.dart';
import 'test_result_screen.dart';

class TestEngineScreen extends StatefulWidget {
  final TestModel test;

  const TestEngineScreen({super.key, required this.test});

  @override
  State<TestEngineScreen> createState() => _TestEngineScreenState();
}

class _TestEngineScreenState extends State<TestEngineScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<TestProvider>(context, listen: false).startTest(widget.test);
    });
  }

  void _submitTest() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Submit Test?'),
        content: const Text('Are you sure you want to finish and view your score breakdown?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Continue Test'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              final testProvider = Provider.of<TestProvider>(context, listen: false);
              final results = testProvider.calculateResults();
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                  builder: (_) => TestResultScreen(
                    test: widget.test,
                    results: results,
                    userAnswers: testProvider.selectedAnswers,
                  ),
                ),
              );
            },
            child: const Text('Submit Now'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final testProvider = Provider.of<TestProvider>(context);
    final questions = widget.test.questions;

    if (questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.test.title)),
        body: const Center(child: Text('No questions available in this test.')),
      );
    }

    final currentIndex = testProvider.currentQuestionIndex;
    final currentQ = questions[currentIndex];
    final selectedOption = testProvider.selectedAnswers[currentIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.test.title, style: const TextStyle(fontSize: 15)),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.primaryLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.timer_outlined, size: 16, color: AppTheme.primary),
                const SizedBox(width: 4),
                Text(
                  testProvider.formattedRemainingTime,
                  style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Question Progress Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Question ${currentIndex + 1} of ${questions.length}',
                  style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold),
                ),
                Text(
                  '${testProvider.selectedAnswers.length} Attempted',
                  style: const TextStyle(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Question Text Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.border),
              ),
              child: Text(
                currentQ.text,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary, height: 1.4),
              ),
            ),
            const SizedBox(height: 16),

            // Options List
            Expanded(
              child: ListView.builder(
                itemCount: currentQ.options.length,
                itemBuilder: (context, optIdx) {
                  final isSelected = selectedOption == optIdx;
                  return GestureDetector(
                    onTap: () => testProvider.selectAnswer(currentIndex, optIdx),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.primaryLight : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected ? AppTheme.primary : AppTheme.border,
                          width: isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: isSelected ? AppTheme.primary : const Color(0xFFF1F5F9),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                String.fromCharCode(65 + optIdx), // A, B, C, D
                                style: TextStyle(
                                  color: isSelected ? Colors.white : AppTheme.textPrimary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              currentQ.options[optIdx],
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                color: isSelected ? AppTheme.primary : AppTheme.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Bottom Navigation & Submit
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (currentIndex > 0)
                  OutlinedButton.icon(
                    onPressed: () => testProvider.goToQuestion(currentIndex - 1),
                    icon: const Icon(Icons.arrow_back_rounded, size: 16),
                    label: const Text('Prev'),
                  )
                else
                  const SizedBox(),

                if (currentIndex < questions.length - 1)
                  ElevatedButton.icon(
                    onPressed: () => testProvider.goToQuestion(currentIndex + 1),
                    icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                    label: const Text('Next'),
                  )
                else
                  ElevatedButton.icon(
                    onPressed: _submitTest,
                    icon: const Icon(Icons.check_rounded, size: 16),
                    label: const Text('Finish Test'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.success),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
