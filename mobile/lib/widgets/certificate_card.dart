import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/theme/app_theme.dart';
import '../models/certificate_model.dart';

class CertificateCard extends StatelessWidget {
  final CertificateModel certificate;

  const CertificateCard({super.key, required this.certificate});

  void _shareViaWhatsApp() async {
    final cleanPhone = certificate.studentPhone?.replaceAll(RegExp(r'\D'), '') ?? '';
    final targetPhone = cleanPhone.startsWith('91') ? cleanPhone : '91$cleanPhone';
    final text = Uri.encodeComponent(
      '🌟 *Official Certificate from Success Mantra*\n\n'
      'Dear ${certificate.studentName},\n'
      'Congratulations on successfully completing *${certificate.courseName}*!\n\n'
      '📜 *Verification Code:* ${certificate.verificationCode}\n'
      '🔗 *Verify Online:* ${certificate.verificationUrl}\n\n'
      'Best Wishes,\n*CA Manish Kalra\'s Commerce Academy*'
    );

    final url = targetPhone.isNotEmpty && targetPhone.length >= 10
        ? 'https://wa.me/$targetPhone?text=$text'
        : 'https://wa.me/?text=$text';

    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A), // Luxury Dark Slate / Black
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD97706), width: 2), // Gold Border
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFD97706).withOpacity(0.2),
            blurRadius: 15,
            spreadRadius: 2,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Header Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.stars, color: Color(0xFFF59E0B), size: 18),
              const SizedBox(width: 6),
              Text(
                'SUCCESS MANTRA ACADEMY',
                style: GoogleFonts.outfit(
                  color: const Color(0xFFF59E0B),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  letterSpacing: 2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Title
          Text(
            'CERTIFICATE OF COMPLETION',
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 16,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 10),

          // Subtitle
          const Text(
            'This is proudly presented to',
            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
          ),
          const SizedBox(height: 6),

          // Student Name in Cursive Style
          Text(
            certificate.studentName,
            style: GoogleFonts.playfairDisplay(
              color: const Color(0xFFFDE68A),
              fontSize: 22,
              fontWeight: FontWeight.bold,
              fontStyle: FontStyle.italic,
            ),
          ),
          const SizedBox(height: 8),

          // Course Name
          Text(
            'For successfully completing the course\n"${certificate.courseName}"',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, height: 1.4),
          ),
          const SizedBox(height: 16),

          // Verification Details & Signature
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'VERIFICATION CODE',
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      certificate.verificationCode,
                      style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text(
                      'DIRECTOR',
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      'CA Manish Kalra',
                      style: GoogleFonts.dancingScript(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Automated WhatsApp Share Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _shareViaWhatsApp,
              icon: const Icon(Icons.send_rounded, size: 16, color: Colors.white),
              label: const Text('Share on WhatsApp', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981), // Emerald WhatsApp Green
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
