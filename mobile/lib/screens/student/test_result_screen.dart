import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/app_theme.dart';
import '../../models/test_model.dart';
import '../../widgets/custom_button.dart';

class TestResultScreen extends StatelessWidget {
  final TestModel test;
  final Map<String, dynamic> results;
  final Map<int, int> userAnswers;

  const TestResultScreen({
    super.key,
    required this.test,
    required this.results,
    required this.userAnswers,
  });

  @override
  Widget build(BuildContext context) {
    final score = results['score'] ?? 0.0;
    final totalMarks = results['totalMarks'] ?? test.totalMarks;
    final percentage = results['percentage'] ?? '0';
    final correct = results['correct'] ?? 0;
    final wrong = results['wrong'] ?? 0;
    final unattempted = results['unattempted'] ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Test Performance Analysis'),
        automaticallyImplyLeading: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Score Summary Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primary, Color(0xFF6366F1)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withOpacity(0.3),
                    blurRadius: 15,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  const Text(
                    'YOUR FINAL SCORE',
                    style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${score.toStringAsFixed(1)} / $totalMarks',
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Accuracy: $percentage%',
                    style: const TextStyle(color: Color(0xFFFDE68A), fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Metrics Breakdown
            Row(
              children: [
                _buildMetricCard('Correct', '$correct', AppTheme.success, Icons.check_circle_outline),
                const SizedBox(width: 10),
                _buildMetricCard('Wrong', '$wrong', AppTheme.error, Icons.cancel_outlined),
                const SizedBox(width: 10),
                _buildMetricCard('Skipped', '$unattempted', AppTheme.textSecondary, Icons.help_outline),
              ],
            ),
            const SizedBox(height: 24),

            // Question Solutions Review
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Solutions & Answer Key',
                style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 12),

            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: test.questions.length,
              itemBuilder: (context, index) {
                final q = test.questions[index];
                final userAns = userAnswers[index];
                final isCorrect = userAns == q.correctOptionIndex;

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            isCorrect ? Icons.check_circle : Icons.cancel,
                            color: isCorrect ? AppTheme.success : AppTheme.error,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Q${index + 1}: ${q.text}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Correct Answer: ${q.options[q.correctOptionIndex]}',
                        style: const TextStyle(color: AppTheme.success, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      if (q.explanation != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Explanation: ${q.explanation}',
                          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 16),

            CustomButton(
              text: 'Return to Dashboard',
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard(String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold)),
            Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}
