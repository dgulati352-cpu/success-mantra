import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/user_model.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _user;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<bool> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await ApiClient.getToken();
      if (token == null || token.isEmpty) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final res = await ApiClient.get(ApiConstants.profile);
      if (res.success && res.data != null && res.data['user'] != null) {
        _user = UserModel.fromJson(res.data['user']);
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        await ApiClient.removeToken();
        _user = null;
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (_) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final res = await ApiClient.post(
      ApiConstants.login,
      body: {'email': email.trim().toLowerCase(), 'password': password},
      requireAuth: false,
    );

    _isLoading = false;
    if (res.success && res.data != null) {
      final token = res.data['token'];
      if (token != null) {
        await ApiClient.setToken(token);
      }
      if (res.data['user'] != null) {
        _user = UserModel.fromJson(res.data['user']);
      }
      notifyListeners();
      return true;
    } else {
      _errorMessage = res.message ?? 'Invalid email or password';
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String targetClass,
    String? academicGoal,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final res = await ApiClient.post(
      ApiConstants.register,
      body: {
        'name': name.trim(),
        'email': email.trim().toLowerCase(),
        'phone': phone.trim(),
        'password': password,
        'target_class': targetClass,
        'academic_goal': academicGoal,
      },
      requireAuth: false,
    );

    _isLoading = false;
    if (res.success && res.data != null) {
      final token = res.data['token'];
      if (token != null) {
        await ApiClient.setToken(token);
      }
      if (res.data['user'] != null) {
        _user = UserModel.fromJson(res.data['user']);
      }
      notifyListeners();
      return true;
    } else {
      _errorMessage = res.message ?? 'Registration failed';
      notifyListeners();
      return false;
    }
  }

  Future<bool> forgotPassword(String email) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final res = await ApiClient.post(
      ApiConstants.forgotPassword,
      body: {'email': email.trim().toLowerCase()},
      requireAuth: false,
    );

    _isLoading = false;
    if (res.success) {
      notifyListeners();
      return true;
    } else {
      _errorMessage = res.message ?? 'Failed to send reset link';
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> updatedData) async {
    _isLoading = true;
    notifyListeners();

    final res = await ApiClient.put(ApiConstants.profile, body: updatedData);
    _isLoading = false;

    if (res.success && res.data != null && res.data['user'] != null) {
      _user = UserModel.fromJson(res.data['user']);
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<bool> deleteAccount() async {
    _isLoading = true;
    notifyListeners();

    final res = await ApiClient.delete(ApiConstants.deleteAccount);
    _isLoading = false;

    if (res.success) {
      await logout();
      return true;
    }
    return false;
  }

  Future<void> logout() async {
    await ApiClient.removeToken();
    _user = null;
    notifyListeners();
  }
}
