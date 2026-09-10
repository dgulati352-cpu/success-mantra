import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../models/community_model.dart';
import '../../models/live_class_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/community_provider.dart';
import 'live_classes_screen.dart';

class ClassCommunityScreen extends StatefulWidget {
  final String? initialCommunityId;
  const ClassCommunityScreen({super.key, this.initialCommunityId});

  @override
  State<ClassCommunityScreen> createState() => _ClassCommunityScreenState();
}

class _ClassCommunityScreenState extends State<ClassCommunityScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      final commProvider = Provider.of<CommunityProvider>(context, listen: false);

      commProvider.fetchAllCommunities(
        preferredTargetClass: user?.targetClass,
      ).then((_) {
        if (widget.initialCommunityId != null) {
          final matched = commProvider.allCommunities.firstWhere(
            (c) => c.id == widget.initialCommunityId,
            orElse: () => commProvider.allCommunities.first,
          );
          commProvider.selectCommunity(matched);
        }
      });
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _openCreatePostDialog(BuildContext context, ClassCommunityModel community) {
    final titleCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final isTeacherOrAdmin = authProvider.user?.role == 'admin' || authProvider.user?.role == 'faculty';
    String postType = isTeacherOrAdmin ? 'announcement' : 'doubt';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          padding: EdgeInsets.only(
            top: 24,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isTeacherOrAdmin ? 'Post Class Announcement' : 'Ask Doubt to Class & Mentor',
                    style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (isTeacherOrAdmin) ...[
                Row(
                  children: [
                    ChoiceChip(
                      label: const Text('Announcement'),
                      selected: postType == 'announcement',
                      onSelected: (val) => setModalState(() => postType = 'announcement'),
                      selectedColor: AppTheme.primaryLight,
                      labelStyle: TextStyle(
                        color: postType == 'announcement' ? AppTheme.primary : AppTheme.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: const Text('Live Class Alert'),
                      selected: postType == 'live_class_update',
                      onSelected: (val) => setModalState(() => postType = 'live_class_update'),
                      selectedColor: const Color(0xFFFEE2E2),
                      labelStyle: TextStyle(
                        color: postType == 'live_class_update' ? Colors.red : AppTheme.textPrimary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: titleCtrl,
                decoration: InputDecoration(
                  labelText: isTeacherOrAdmin ? 'Update Title (optional)' : 'Doubt Topic / Question Title',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  prefixIcon: const Icon(Icons.title_rounded, size: 20),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: contentCtrl,
                maxLines: 4,
                decoration: InputDecoration(
                  labelText: isTeacherOrAdmin
                      ? 'Write announcement or live class update details...'
                      : 'Describe your query or concept doubt in detail...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    final text = contentCtrl.text.trim();
                    if (text.isEmpty) return;
                    Navigator.pop(ctx);

                    final success = await Provider.of<CommunityProvider>(context, listen: false).createPost(
                      community.id,
                      content: text,
                      title: titleCtrl.text.trim().isNotEmpty ? titleCtrl.text.trim() : null,
                      postType: postType,
                    );

                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(success ? 'Post published to class group!' : 'Failed to publish post'),
                          backgroundColor: success ? const Color(0xFF10B981) : Colors.red,
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('Publish to Class Community', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openAddCommentDialog(BuildContext context, ClassCommunityModel community, CommunityPostModel post) {
    final replyCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          top: 20,
          left: 20,
          right: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Reply to ${post.authorName}',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Text(
                post.content,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: replyCtrl,
              maxLines: 3,
              autofocus: true,
              decoration: InputDecoration(
                hintText: 'Write your helpful answer or discussion point...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final text = replyCtrl.text.trim();
                  if (text.isEmpty) return;
                  Navigator.pop(ctx);

                  await Provider.of<CommunityProvider>(context, listen: false).addComment(
                    community.id,
                    post.id,
                    text,
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Post Reply', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final commProvider = Provider.of<CommunityProvider>(context);
    final community = commProvider.activeCommunity;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: DropdownButtonHideUnderline(
          child: DropdownButton<ClassCommunityModel>(
            value: community,
            isDense: true,
            icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.textPrimary),
            selectedItemBuilder: (BuildContext context) {
              return commProvider.allCommunities.map<Widget>((ClassCommunityModel item) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      item.name,
                      style: GoogleFonts.outfit(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                );
              }).toList();
            },
            items: commProvider.allCommunities.map((c) {
              return DropdownMenuItem<ClassCommunityModel>(
                value: c,
                child: Row(
                  children: [
                    Text(c.icon, style: const TextStyle(fontSize: 18)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(c.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          Text('${c.targetClass} • ${c.memberCount} students',
                              style: const TextStyle(fontSize: 10, color: Colors.grey)),
                        ],
                      ),
                    ),
                    if (c.isMember)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text('Joined', style: TextStyle(color: Color(0xFF166534), fontSize: 9, fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
              );
            }).toList(),
            onChanged: (val) {
              if (val != null) {
                commProvider.selectCommunity(val);
              }
            },
          ),
        ),
        actions: [
          if (community != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: TextButton.icon(
                onPressed: () {
                  if (community.isMember) {
                    commProvider.leaveCommunity(community.id);
                  } else {
                    commProvider.joinCommunity(community.id);
                  }
                },
                icon: Icon(
                  community.isMember ? Icons.check_circle_rounded : Icons.group_add_rounded,
                  size: 16,
                  color: community.isMember ? const Color(0xFF10B981) : AppTheme.primary,
                ),
                label: Text(
                  community.isMember ? 'Member' : 'Join Group',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: community.isMember ? const Color(0xFF10B981) : AppTheme.primary,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: commProvider.isLoading && community == null
          ? const Center(child: CircularProgressIndicator())
          : community == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.groups_rounded, size: 64, color: AppTheme.textSecondary),
                      const SizedBox(height: 12),
                      Text('No Class Communities Found', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => commProvider.loadCommunityDetails(community.id),
                  child: NestedScrollView(
                    headerSliverBuilder: (context, innerBoxIsScrolled) => [
                      SliverToBoxAdapter(
                        child: _buildCommunityHeader(context, community, commProvider),
                      ),
                      SliverPersistentHeader(
                        pinned: true,
                        delegate: _SliverAppBarDelegate(
                          TabBar(
                            controller: _tabController,
                            indicatorColor: AppTheme.primary,
                            indicatorWeight: 3,
                            labelColor: AppTheme.primary,
                            unselectedLabelColor: AppTheme.textSecondary,
                            labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
                            tabs: [
                              Tab(
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.video_camera_front_rounded, size: 16),
                                    const SizedBox(width: 6),
                                    const Text('Live Classes'),
                                    if (commProvider.liveNowClasses.isNotEmpty) ...[
                                      const SizedBox(width: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: Colors.red,
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: const Text('LIVE', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold)),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              Tab(
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.campaign_rounded, size: 16),
                                    const SizedBox(width: 6),
                                    const Text('Updates & Feed'),
                                  ],
                                ),
                              ),
                              Tab(
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.people_alt_rounded, size: 16),
                                    const SizedBox(width: 6),
                                    Text('Classmates (${community.memberCount})'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    body: TabBarView(
                      controller: _tabController,
                      children: [
                        _buildLiveClassesTab(context, community, commProvider),
                        _buildUpdatesFeedTab(context, community, commProvider),
                        _buildClassmatesTab(context, community, commProvider),
                      ],
                    ),
                  ),
                ),
      floatingActionButton: community != null && community.isMember
          ? FloatingActionButton.extended(
              onPressed: () => _openCreatePostDialog(context, community),
              backgroundColor: AppTheme.primary,
              icon: const Icon(Icons.add_comment_rounded, color: Colors.white),
              label: const Text('Post / Ask Doubt', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }

  Widget _buildCommunityHeader(BuildContext context, ClassCommunityModel community, CommunityProvider provider) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E1B4B), Color(0xFF312E81), Color(0xFF4338CA)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF312E81).withOpacity(0.35),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(community.icon, style: const TextStyle(fontSize: 12)),
                    const SizedBox(width: 4),
                    Text(
                      community.targetClass,
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.withOpacity(0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.verified_rounded, size: 12, color: Colors.amber),
                    const SizedBox(width: 4),
                    Text(
                      community.badge,
                      style: const TextStyle(color: Colors.amber, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            community.name,
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            community.description,
            style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              const CircleAvatar(
                radius: 12,
                backgroundImage: NetworkImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Mentor: ${community.facultyMentor}',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
              Text(
                '${community.memberCount} Students Enrolled',
                style: const TextStyle(color: Colors.white60, fontSize: 11),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // TAB 1: Live Classes for this class
  Widget _buildLiveClassesTab(BuildContext context, ClassCommunityModel community, CommunityProvider provider) {
    if (provider.classLiveClasses.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.live_tv_rounded, size: 56, color: Colors.grey.shade400),
              const SizedBox(height: 14),
              Text(
                'No Live Batches Scheduled for ${community.targetClass}',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const Text(
                'Upcoming live classroom sessions for this class will appear here with live join buttons.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: provider.classLiveClasses.length,
      itemBuilder: (ctx, index) {
        final lc = provider.classLiveClasses[index];
        final isLive = lc.isLive;

        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(16),
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
                      borderRadius: BorderRadius.circular(16),
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
                          isLive ? 'CLASS IS LIVE NOW' : 'SCHEDULED BATCH',
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
                    DateFormat('MMM dd, hh:mm a').format(lc.scheduledAt),
                    style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                lc.title,
                style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'Faculty: ${lc.facultyName} • Target: ${lc.targetClass}',
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LiveClassesScreen()),
                    );
                  },
                  icon: Icon(isLive ? Icons.sensors_rounded : Icons.access_time_rounded, size: 16),
                  label: Text(isLive ? 'Join Live Class Room' : 'View Batch Details'),
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
    );
  }

  // TAB 2: Updates & Doubt Discussions Feed
  Widget _buildUpdatesFeedTab(BuildContext context, ClassCommunityModel community, CommunityProvider provider) {
    if (provider.posts.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.forum_outlined, size: 56, color: Colors.grey.shade400),
              const SizedBox(height: 14),
              Text('No Updates Yet', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text(
                'Be the first to post a study doubt or discussion topic in this class group.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.only(top: 14, left: 16, right: 16, bottom: 80),
      itemCount: provider.posts.length,
      itemBuilder: (ctx, index) {
        final post = provider.posts[index];

        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: post.isPinned
                  ? Colors.amber.withOpacity(0.6)
                  : post.isLiveUpdate
                      ? Colors.red.withOpacity(0.4)
                      : AppTheme.border,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: post.authorRole == 'faculty' || post.authorRole == 'admin'
                        ? const Color(0xFFEEF2FF)
                        : const Color(0xFFF1F5F9),
                    backgroundImage: post.authorAvatar != null ? NetworkImage(post.authorAvatar!) : null,
                    child: post.authorAvatar == null
                        ? Text(
                            post.authorName.isNotEmpty ? post.authorName[0].toUpperCase() : 'M',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: post.authorRole == 'faculty' ? AppTheme.primary : Colors.slate.shade700,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              post.authorName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            if (post.authorRole == 'faculty' || post.authorRole == 'admin') ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryLight,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  post.authorRole == 'faculty' ? 'Teacher' : 'Admin',
                                  style: const TextStyle(color: AppTheme.primary, fontSize: 9, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ],
                        ),
                        Text(
                          DateFormat('MMM dd, hh:mm a').format(post.createdAt),
                          style: const TextStyle(fontSize: 10, color: AppTheme.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  if (post.isPinned)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.push_pin_rounded, size: 10, color: Color(0xFFD97706)),
                          SizedBox(width: 2),
                          Text('Pinned', style: TextStyle(color: Color(0xFFD97706), fontSize: 9, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),

              // Title if present
              if (post.title != null && post.title!.isNotEmpty) ...[
                Text(
                  post.title!,
                  style: GoogleFonts.outfit(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: post.isLiveUpdate ? Colors.red.shade900 : AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
              ],

              // Content
              Text(
                post.content,
                style: const TextStyle(fontSize: 13, height: 1.45, color: Color(0xFF334155)),
              ),
              const SizedBox(height: 12),

              // Attachment if present (Cloudflare R2)
              if (post.hasAttachment) ...[
                if (post.attachmentType == 'pdf')
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.picture_as_pdf_rounded, color: Colors.red, size: 20),
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Attached Document (Cloudflare R2)',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                              ),
                              Text(
                                'Tap to download or preview',
                                style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.download_rounded, size: 18, color: AppTheme.primary),
                      ],
                    ),
                  )
                else
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Stack(
                      children: [
                        Image.network(
                          post.attachmentUrl!,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          height: 200,
                          errorBuilder: (_, __, ___) => const SizedBox(),
                        ),
                        Positioned(
                          bottom: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.65),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Cloudflare R2 Media',
                              style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 12),
              ],

              // Live Class Action Banner inside post
              if (post.liveClassId != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.sensors_rounded, color: Colors.red, size: 20),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text(
                          'Live Classroom Session Attached',
                          style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const LiveClassesScreen()),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Enter Live', style: TextStyle(fontSize: 11)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Comments & Action Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: () => _openAddCommentDialog(context, community, post),
                    icon: const Icon(Icons.mode_comment_outlined, size: 14, color: AppTheme.primary),
                    label: Text(
                      '${post.commentsCount} ${post.commentsCount == 1 ? 'Reply' : 'Replies'}',
                      style: const TextStyle(fontSize: 12, color: AppTheme.primary, fontWeight: FontWeight.bold),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _openAddCommentDialog(context, community, post),
                    child: const Text('Add Answer / Reply', style: TextStyle(fontSize: 11, color: AppTheme.textSecondary)),
                  ),
                ],
              ),

              // Comments preview
              if (post.comments.isNotEmpty) ...[
                const Divider(height: 14),
                ...post.comments.take(2).map((c) => Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('• ', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
                      Expanded(
                        child: RichText(
                          text: TextSpan(
                            style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary),
                            children: [
                              TextSpan(
                                text: '${c.authorName}: ',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              TextSpan(text: c.content),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
              ],
            ],
          ),
        );
      },
    );
  }

  // TAB 3: Classmates List
  Widget _buildClassmatesTab(BuildContext context, ClassCommunityModel community, CommunityProvider provider) {
    if (provider.members.isEmpty) {
      return Center(
        child: Text('No students joined yet.', style: GoogleFonts.outfit(color: AppTheme.textSecondary)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: provider.members.length,
      itemBuilder: (ctx, index) {
        final member = provider.members[index];
        final isFaculty = member.role == 'faculty' || member.role == 'admin';

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppTheme.border),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: isFaculty ? AppTheme.primaryLight : const Color(0xFFF1F5F9),
                backgroundImage: member.avatarUrl != null ? NetworkImage(member.avatarUrl!) : null,
                child: member.avatarUrl == null
                    ? Text(
                        member.name.isNotEmpty ? member.name[0].toUpperCase() : 'S',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: isFaculty ? AppTheme.primary : AppTheme.textPrimary,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(member.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        if (isFaculty) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryLight,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text('Faculty', style: TextStyle(color: AppTheme.primary, fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ],
                    ),
                    Text(
                      member.school ?? member.city ?? 'Success Mantra Scholar',
                      style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;
  _SliverAppBarDelegate(this._tabBar);

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Colors.white,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}
