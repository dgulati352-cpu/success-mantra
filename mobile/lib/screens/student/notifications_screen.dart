import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../models/notification_model.dart';
import '../../providers/notification_provider.dart';
import 'courses_screen.dart';
import 'live_classes_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  String _selectedFilter = 'all'; // 'all' | 'offer' | 'live_class' | 'announcement'

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
    });
  }

  String _formatTime(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.day}/${date.month}/${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    final notifProvider = Provider.of<NotificationProvider>(context);
    final allNotifs = notifProvider.notifications;

    final filteredNotifs = allNotifs.where((n) {
      if (_selectedFilter == 'all') return true;
      if (_selectedFilter == 'offer') {
        return n.type == 'offer' || (n.couponCode != null && n.couponCode!.isNotEmpty);
      }
      if (_selectedFilter == 'live_class') {
        return n.type == 'live_class';
      }
      if (_selectedFilter == 'announcement') {
        return n.type == 'announcement' || n.type == 'general';
      }
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (notifProvider.unreadCount > 0)
            TextButton.icon(
              onPressed: () => notifProvider.markAllAsRead(),
              icon: const Icon(Icons.done_all_rounded, size: 16, color: AppTheme.primary),
              label: const Text(
                'Mark Read',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primary),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _buildFilterChip('All', 'all', allNotifs.length),
                const SizedBox(width: 8),
                _buildFilterChip('🎁 Offers', 'offer', allNotifs.where((n) => n.type == 'offer' || n.couponCode != null).length),
                const SizedBox(width: 8),
                _buildFilterChip('🔴 Live Classes', 'live_class', allNotifs.where((n) => n.type == 'live_class').length),
                const SizedBox(width: 8),
                _buildFilterChip('📢 Announcements', 'announcement', allNotifs.where((n) => n.type == 'announcement' || n.type == 'general').length),
              ],
            ),
          ),

          // Notification List
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => notifProvider.fetchNotifications(),
              child: notifProvider.isLoading && allNotifs.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : filteredNotifs.isEmpty
                      ? _buildEmptyState()
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: filteredNotifs.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            return _buildNotificationCard(filteredNotifs[index]);
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, int count) {
    final isSelected = _selectedFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppTheme.primary : Colors.grey.shade300,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? Colors.white : AppTheme.textPrimary,
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white.withOpacity(0.25) : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : Colors.grey.shade700,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationCard(NotificationModel item) {
    final isOffer = item.type == 'offer' || (item.couponCode != null && item.couponCode!.isNotEmpty);
    final isLive = item.type == 'live_class';

    Color cardBg = Colors.white;
    Color iconBg = AppTheme.primaryLight;
    Color iconColor = AppTheme.primary;
    IconData icon = Icons.notifications_active_outlined;

    if (isOffer) {
      cardBg = const Color(0xFFFFFBEB); // amber-50
      iconBg = const Color(0xFFFEF3C7);
      iconColor = const Color(0xFFD97706);
      icon = Icons.card_giftcard_rounded;
    } else if (isLive) {
      cardBg = const Color(0xFFFFF1F2); // rose-50
      iconBg = const Color(0xFFFFE4E6);
      iconColor = const Color(0xFFE11D48);
      icon = Icons.sensors_rounded;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: item.isRead ? Colors.white : cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: item.isRead ? Colors.grey.shade200 : iconColor.withOpacity(0.3),
          width: item.isRead ? 1 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 20, color: iconColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: iconColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isOffer ? 'SPECIAL OFFER' : isLive ? 'LIVE CLASS' : 'ANNOUNCEMENT',
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: iconColor),
                          ),
                        ),
                        Text(
                          _formatTime(item.createdAt),
                          style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.title,
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            item.message,
            style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4),
          ),

          // Coupon Code Section if present
          if (item.couponCode != null && item.couponCode!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.confirmation_number_outlined, size: 18, color: Color(0xFFD97706)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Use Code: ${item.couponCode}',
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: Color(0xFF92400E),
                      ),
                    ),
                  ),
                  InkWell(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: item.couponCode!));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('🎉 Coupon "${item.couponCode}" copied!'),
                          backgroundColor: AppTheme.success,
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFD97706).withOpacity(0.3)),
                      ),
                      child: const Text(
                        'Copy',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Action Button
          if (isLive || isOffer) ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () {
                  if (isLive) {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const LiveClassesScreen()));
                  } else {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const CoursesScreen()));
                  }
                },
                icon: Icon(isLive ? Icons.play_arrow_rounded : Icons.explore_outlined, size: 16),
                label: Text(isLive ? 'Join Live Class' : 'View Course & Enroll'),
                style: TextButton.styleFrom(
                  foregroundColor: iconColor,
                  textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.notifications_none_rounded, size: 48, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            Text(
              'No notifications yet',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 6),
            const Text(
              'Announcements, discount coupons, and live class alerts will appear here.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }
}
