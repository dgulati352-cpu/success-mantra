import 'package:flutter/foundation.dart';
import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../models/community_model.dart';
import '../models/live_class_model.dart';

class CommunityProvider with ChangeNotifier {
  List<ClassCommunityModel> _allCommunities = [];
  List<ClassCommunityModel> _myCommunities = [];
  ClassCommunityModel? _activeCommunity;
  List<CommunityPostModel> _posts = [];
  List<LiveClassModel> _classLiveClasses = [];
  List<CommunityMemberModel> _members = [];
  bool _isLoading = false;
  bool _isActionLoading = false;
  String? _errorMessage;

  List<ClassCommunityModel> get allCommunities => _allCommunities;
  List<ClassCommunityModel> get myCommunities => _myCommunities;
  ClassCommunityModel? get activeCommunity => _activeCommunity;
  List<CommunityPostModel> get posts => _posts;
  List<LiveClassModel> get classLiveClasses => _classLiveClasses;
  List<CommunityMemberModel> get members => _members;
  bool get isLoading => _isLoading;
  bool get isActionLoading => _isActionLoading;
  String? get errorMessage => _errorMessage;

  List<LiveClassModel> get liveNowClasses =>
      _classLiveClasses.where((c) => c.isLive).toList();

  List<LiveClassModel> get upcomingLiveClasses =>
      _classLiveClasses.where((c) => !c.isLive && !c.isEnded).toList();

  // Fetch all available class communities
  Future<void> fetchAllCommunities({String? preferredTargetClass}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiConstants.communities);
      _isLoading = false;

      if (res.success && res.data != null) {
        final List raw = res.data['communities'] ?? [];
        _allCommunities = raw.map((c) => ClassCommunityModel.fromJson(c)).toList();

        // Separate my communities
        _myCommunities = _allCommunities.where((c) => c.isMember).toList();

        // If no active community selected yet, choose the student's matched class or first
        if (_activeCommunity == null && _allCommunities.isNotEmpty) {
          if (preferredTargetClass != null && preferredTargetClass.isNotEmpty) {
            _activeCommunity = _allCommunities.firstWhere(
              (c) => c.targetClass.toLowerCase().contains(preferredTargetClass.toLowerCase()) ||
                     preferredTargetClass.toLowerCase().contains(c.targetClass.toLowerCase()),
              orElse: () => _myCommunities.isNotEmpty ? _myCommunities.first : _allCommunities.first,
            );
          } else {
            _activeCommunity = _myCommunities.isNotEmpty ? _myCommunities.first : _allCommunities.first;
          }

          if (_activeCommunity != null) {
            loadCommunityDetails(_activeCommunity!.id);
          }
        }
        notifyListeners();
      } else {
        _errorMessage = res.message ?? 'Failed to load communities';
        notifyListeners();
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  // Switch active community
  void selectCommunity(ClassCommunityModel comm) {
    _activeCommunity = comm;
    notifyListeners();
    loadCommunityDetails(comm.id);
  }

  // Load detailed community data: live classes, feed posts, members
  Future<void> loadCommunityDetails(String communityId) async {
    _isLoading = true;
    notifyListeners();

    try {
      // 1. Fetch community details & live classes
      final detailRes = await ApiClient.get(ApiConstants.communityDetail(communityId));
      if (detailRes.success && detailRes.data != null) {
        if (detailRes.data['community'] != null) {
          _activeCommunity = ClassCommunityModel.fromJson(detailRes.data['community']);
        }
        final List rawLive = detailRes.data['live_classes'] ?? [];
        _classLiveClasses = rawLive.map((item) => LiveClassModel.fromJson(item)).toList();
      }

      // 2. Fetch posts feed
      final postsRes = await ApiClient.get(ApiConstants.communityPosts(communityId));
      if (postsRes.success && postsRes.data != null) {
        final List rawPosts = postsRes.data['posts'] ?? [];
        _posts = rawPosts.map((p) => CommunityPostModel.fromJson(p)).toList();
      }

      // 3. Fetch members list
      final membersRes = await ApiClient.get(ApiConstants.communityMembers(communityId));
      if (membersRes.success && membersRes.data != null) {
        final List rawMembers = membersRes.data['members'] ?? [];
        _members = rawMembers.map((m) => CommunityMemberModel.fromJson(m)).toList();
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Join Community
  Future<bool> joinCommunity(String communityId) async {
    _isActionLoading = true;
    notifyListeners();

    final res = await ApiClient.post(ApiConstants.communityJoin(communityId));
    _isActionLoading = false;

    if (res.success) {
      await fetchAllCommunities();
      await loadCommunityDetails(communityId);
      return true;
    } else {
      _errorMessage = res.message ?? 'Failed to join community';
      notifyListeners();
      return false;
    }
  }

  // Leave Community
  Future<bool> leaveCommunity(String communityId) async {
    _isActionLoading = true;
    notifyListeners();

    final res = await ApiClient.post(ApiConstants.communityLeave(communityId));
    _isActionLoading = false;

    if (res.success) {
      await fetchAllCommunities();
      if (_activeCommunity?.id == communityId) {
        _activeCommunity = _allCommunities.firstWhere(
          (c) => c.id == communityId,
          orElse: () => _allCommunities.first,
        );
        await loadCommunityDetails(_activeCommunity!.id);
      }
      return true;
    } else {
      _errorMessage = res.message ?? 'Failed to leave community';
      notifyListeners();
      return false;
    }
  }

  // Post doubt / discussion / announcement
  Future<bool> createPost(
    String communityId, {
    required String content,
    String? title,
    String postType = 'doubt',
    String? liveClassId,
  }) async {
    _isActionLoading = true;
    notifyListeners();

    final res = await ApiClient.post(
      ApiConstants.communityPosts(communityId),
      body: {
        'content': content,
        'title': title,
        'post_type': postType,
        'live_class_id': liveClassId,
      },
    );
    _isActionLoading = false;

    if (res.success) {
      await loadCommunityDetails(communityId);
      return true;
    } else {
      _errorMessage = res.message ?? 'Failed to publish post';
      notifyListeners();
      return false;
    }
  }

  // Reply / comment on a post
  Future<bool> addComment(String communityId, int postId, String content) async {
    final res = await ApiClient.post(
      ApiConstants.communityComments(communityId, postId),
      body: {'content': content},
    );

    if (res.success) {
      await loadCommunityDetails(communityId);
      return true;
    } else {
      _errorMessage = res.message ?? 'Failed to post reply';
      notifyListeners();
      return false;
    }
  }
}
