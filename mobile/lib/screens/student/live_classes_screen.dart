import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../providers/live_class_provider.dart';

class LiveClassesScreen extends StatefulWidget {
  const LiveClassesScreen({super.key});

  @override
  State<LiveClassesScreen> createState() => _LiveClassesScreenState();
}

class _LiveClassesScreenState extends State<LiveClassesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<LiveClassProvider>(context, listen: false).fetchLiveClasses();
    });
  }

  @override
  Widget build(BuildContext context) {
    final liveProvider = Provider.of<LiveClassProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Live Batches', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () => liveProvider.fetchLiveClasses(),
        child: liveProvider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : liveProvider.liveClasses.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.live_tv_rounded, size: 64, color: AppTheme.textSecondary.withOpacity(0.5)),
                          const SizedBox(height: 16),
                          Text(
                            'No Scheduled Batches',
                            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Upcoming interactive live classroom sessions will be listed here.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(20),
                    itemCount: liveProvider.liveClasses.length,
                    itemBuilder: (context, index) {
                      final liveClass = liveProvider.liveClasses[index];
                      final isLive = liveClass.isLive;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isLive ? Colors.red.withOpacity(0.5) : AppTheme.border,
                            width: isLive ? 1.5 : 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: isLive ? Colors.red.withOpacity(0.08) : Colors.black.withOpacity(0.02),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isLive ? const Color(0xFFFEE2E2) : AppTheme.primaryLight,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (isLive) ...[
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                        ),
                                        const SizedBox(width: 6),
                                      ],
                                      Text(
                                        isLive ? 'LIVE NOW' : 'SCHEDULED',
                                        style: TextStyle(
                                          color: isLive ? Colors.red : AppTheme.primary,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  DateFormat('MMM dd, hh:mm a').format(liveClass.scheduledAt),
                                  style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            Text(
                              liveClass.title,
                              style: GoogleFonts.outfit(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Faculty: ${liveClass.facultyName} • Class: ${liveClass.targetClass}',
                              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                            ),
                            const SizedBox(height: 16),

                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        isLive
                                            ? 'Connecting to Live Studio Room...'
                                            : 'This batch will go live at ${DateFormat('hh:mm a').format(liveClass.scheduledAt)}',
                                      ),
                                    ),
                                  );
                                },
                                icon: Icon(isLive ? Icons.sensors_rounded : Icons.alarm_rounded, size: 16),
                                label: Text(isLive ? 'Join Live Room' : 'Set Reminder'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isLive ? Colors.red : AppTheme.primary,
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
