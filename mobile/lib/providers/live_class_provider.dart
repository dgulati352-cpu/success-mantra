import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/live_class_model.dart';

class LiveClassProvider with ChangeNotifier {
  List<LiveClassModel> _liveClasses = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<LiveClassModel> get liveClasses => _liveClasses;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<LiveClassModel> get activeLiveRooms =>
      _liveClasses.where((c) => c.isLive).toList();

  List<LiveClassModel> get upcomingClasses =>
      _liveClasses.where((c) => !c.isLive).toList();

  Future<void> fetchLiveClasses() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final res = await ApiClient.get(ApiConstants.liveClasses);
    _isLoading = false;

    if (res.success && res.data != null) {
      final List rawList = res.data['live_classes'] ?? res.data['data'] ?? [];
      _liveClasses = rawList.map((item) => LiveClassModel.fromJson(item)).toList();
      notifyListeners();
    } else {
      _errorMessage = res.message ?? 'Failed to load live schedule';
      notifyListeners();
    }
  }
}
