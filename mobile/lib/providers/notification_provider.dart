import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/notification_model.dart';

class NotificationProvider with ChangeNotifier {
  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  String? _errorMessage;
  Timer? _pollTimer;
  String? _lastKnownNotificationId;
  NotificationModel? _incomingAlert;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get unreadCount => _notifications.where((n) => !n.isRead).length;
  NotificationModel? get incomingAlert => _incomingAlert;

  void startPolling() {
    _pollTimer?.cancel();
    fetchNotifications();
    // Poll every 25 seconds for new broadcast notifications / offers / classes
    _pollTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      fetchNotifications(isBackgroundPoll: true);
    });
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  void clearIncomingAlert() {
    _incomingAlert = null;
    notifyListeners();
  }

  Future<void> fetchNotifications({bool isBackgroundPoll = false}) async {
    if (!isBackgroundPoll) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final res = await ApiClient.get(ApiConstants.notifications);

      if (res.success && res.data != null && res.data['notifications'] != null) {
        final rawList = res.data['notifications'] as List;
        final newItems = rawList.map((e) => NotificationModel.fromJson(e)).toList();

        // Check if there is a brand-new notification for real-time in-app alert
        if (_lastKnownNotificationId != null && newItems.isNotEmpty) {
          final topItem = newItems.first;
          if (topItem.id != _lastKnownNotificationId && !topItem.isRead) {
            _incomingAlert = topItem;
          }
        }

        if (newItems.isNotEmpty) {
          _lastKnownNotificationId = newItems.first.id;
        }

        _notifications = newItems;
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      if (!isBackgroundPoll) {
        _isLoading = false;
      }
      notifyListeners();
    }
  }

  Future<void> markAllAsRead() async {
    try {
      _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
      notifyListeners();

      await ApiClient.put(ApiConstants.markNotificationsRead, body: {});
    } catch (_) {}
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }
}
