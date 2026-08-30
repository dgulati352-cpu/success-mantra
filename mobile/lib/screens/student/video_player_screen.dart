import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../models/lesson_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/course_provider.dart';

class VideoPlayerScreen extends StatefulWidget {
  final LessonModel lesson;

  const VideoPlayerScreen({super.key, required this.lesson});

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  double _playbackSpeed = 1.0;
  bool _isPlaying = true;

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user;
    final courseProvider = Provider.of<CourseProvider>(context);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          widget.lesson.title,
          style: const TextStyle(color: Colors.white, fontSize: 15),
        ),
      ),
      body: Column(
        children: [
          // Simulated Secure Video Player Frame with DRM Watermark
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Stack(
              children: [
                Container(
                  color: const Color(0xFF0F172A),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          onPressed: () => setState(() => _isPlaying = !_isPlaying),
                          icon: Icon(
                            _isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled,
                            color: Colors.white,
                            size: 64,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Streaming: ${widget.lesson.title}',
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),

                // Floating Security Watermark
                Positioned(
                  bottom: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${user?.phone ?? user?.email ?? "Student"} • SM-DRM',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.4),
                        fontSize: 9,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Speed & Quality Controls
          Container(
            color: const Color(0xFF1E293B),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.speed_rounded, color: Colors.white70, size: 16),
                    const SizedBox(width: 6),
                    DropdownButton<double>(
                      value: _playbackSpeed,
                      dropdownColor: const Color(0xFF1E293B),
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      underline: const SizedBox(),
                      items: [0.75, 1.0, 1.25, 1.5, 2.0].map((s) {
                        return DropdownMenuItem(value: s, child: Text('${s}x'));
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _playbackSpeed = val);
                      },
                    ),
                  ],
                ),
                TextButton.icon(
                  onPressed: () async {
                    await courseProvider.markLessonCompleted(widget.lesson.id);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Lesson marked as completed!')),
                      );
                    }
                  },
                  icon: const Icon(Icons.check_circle_outline, color: AppTheme.success, size: 16),
                  label: const Text('Mark Complete', style: TextStyle(color: AppTheme.success, fontSize: 12)),
                ),
              ],
            ),
          ),

          // Lesson Details Section
          Expanded(
            child: Container(
              color: AppTheme.background,
              padding: const EdgeInsets.all(20),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.lesson.title,
                      style: GoogleFonts.outfit(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Duration: ${widget.lesson.formattedDuration}',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 16),

                    if (widget.lesson.description != null && widget.lesson.description!.isNotEmpty) ...[
                      Text(
                        'Lecture Notes & Summary',
                        style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        widget.lesson.description!,
                        style: const TextStyle(fontSize: 13, color: AppTheme.textPrimary, height: 1.4),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
