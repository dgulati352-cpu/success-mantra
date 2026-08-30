import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiResponse {
  final bool success;
  final String? message;
  final dynamic data;
  final int statusCode;

  ApiResponse({
    required this.success,
    this.message,
    this.data,
    required this.statusCode,
  });
}

class ApiClient {
  static const String _tokenKey = 'auth_token';

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<void> removeToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  static Future<Map<String, String>> _getHeaders({bool requireAuth = true}) async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (requireAuth) {
      final token = await getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  static Future<ApiResponse> get(String url, {bool requireAuth = true}) async {
    try {
      final headers = await _getHeaders(requireAuth: requireAuth);
      final response = await http
          .get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));

      return _processResponse(response);
    } on SocketException {
      return ApiResponse(
        success: false,
        message: 'No internet connection. Please check your network.',
        statusCode: 0,
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        message: e.toString(),
        statusCode: -1,
      );
    }
  }

  static Future<ApiResponse> post(
    String url, {
    Map<String, dynamic>? body,
    bool requireAuth = true,
  }) async {
    try {
      final headers = await _getHeaders(requireAuth: requireAuth);
      final response = await http
          .post(
            Uri.parse(url),
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));

      return _processResponse(response);
    } on SocketException {
      return ApiResponse(
        success: false,
        message: 'No internet connection. Please check your network.',
        statusCode: 0,
      );
    } catch (e) {
      return ApiResponse(
        success: false,
        message: e.toString(),
        statusCode: -1,
      );
    }
  }

  static Future<ApiResponse> put(
    String url, {
    Map<String, dynamic>? body,
    bool requireAuth = true,
  }) async {
    try {
      final headers = await _getHeaders(requireAuth: requireAuth);
      final response = await http
          .put(
            Uri.parse(url),
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));

      return _processResponse(response);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: e.toString(),
        statusCode: -1,
      );
    }
  }

  static Future<ApiResponse> delete(String url, {bool requireAuth = true}) async {
    try {
      final headers = await _getHeaders(requireAuth: requireAuth);
      final response = await http
          .delete(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 15));

      return _processResponse(response);
    } catch (e) {
      return ApiResponse(
        success: false,
        message: e.toString(),
        statusCode: -1,
      );
    }
  }

  static ApiResponse _processResponse(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      final isSuccess = response.statusCode >= 200 && response.statusCode < 300;
      return ApiResponse(
        success: decoded['success'] ?? isSuccess,
        message: decoded['message'] ?? (isSuccess ? 'Success' : 'Request failed'),
        data: decoded,
        statusCode: response.statusCode,
      );
    } catch (_) {
      return ApiResponse(
        success: response.statusCode >= 200 && response.statusCode < 300,
        message: response.body,
        statusCode: response.statusCode,
      );
    }
  }
}
