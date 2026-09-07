class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String type; // 'offer' | 'live_class' | 'announcement' | 'general'
  final String? link;
  final String? couponCode;
  final String? discountText;
  final String? validTill;
  final bool isRead;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    this.link,
    this.couponCode,
    this.discountText,
    this.validTill,
    this.isRead = false,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    DateTime parsedDate;
    try {
      final raw = json['created_at'] ?? json['createdAt'];
      parsedDate = raw != null ? DateTime.parse(raw.toString()) : DateTime.now();
    } catch (_) {
      parsedDate = DateTime.now();
    }

    return NotificationModel(
      id: json['id']?.toString() ?? 'notif_${DateTime.now().millisecondsSinceEpoch}',
      title: json['title'] ?? 'Notification from Success Mantra',
      message: json['message'] ?? '',
      type: json['type'] ?? 'general',
      link: json['link'],
      couponCode: json['coupon_code'] ?? json['couponCode'],
      discountText: json['discount_text'] ?? json['discountText'],
      validTill: json['valid_till'] ?? json['validTill'],
      isRead: json['is_read'] == 1 || json['is_read'] == true,
      createdAt: parsedDate,
    );
  }

  NotificationModel copyWith({bool? isRead}) {
    return NotificationModel(
      id: id,
      title: title,
      message: message,
      type: type,
      link: link,
      couponCode: couponCode,
      discountText: discountText,
      validTill: validTill,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
    );
  }
}
