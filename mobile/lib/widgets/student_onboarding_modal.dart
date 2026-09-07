import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import 'custom_button.dart';
import 'custom_text_field.dart';

class StudentOnboardingModal extends StatefulWidget {
  final VoidCallback? onCompleted;

  const StudentOnboardingModal({super.key, this.onCompleted});

  static Future<void> show(BuildContext context, {VoidCallback? onCompleted}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StudentOnboardingModal(onCompleted: onCompleted),
    );
  }

  @override
  State<StudentOnboardingModal> createState() => _StudentOnboardingModalState();
}

class _StudentOnboardingModalState extends State<StudentOnboardingModal> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _schoolController;
  late TextEditingController _cityController;
  late TextEditingController _addressController;
  late TextEditingController _stateController;
  late TextEditingController _pincodeController;
  late TextEditingController _goalController;

  String _selectedClass = 'Class 12 Commerce';
  final List<String> _classList = [
    'Class 11 Commerce',
    'Class 12 Commerce',
    'CUET Commerce Domain',
    'CA Foundation',
  ];

  @override
  void initState() {
    super.initState();
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    _schoolController = TextEditingController(text: user?.school ?? '');
    _cityController = TextEditingController(text: user?.city ?? '');
    _addressController = TextEditingController(text: user?.address ?? '');
    _stateController = TextEditingController(text: user?.state ?? '');
    _pincodeController = TextEditingController(text: user?.pincode ?? '');
    _goalController = TextEditingController(text: user?.academicGoal ?? '');
    if (user?.targetClass != null && _classList.contains(user!.targetClass)) {
      _selectedClass = user.targetClass!;
    }
  }

  @override
  void dispose() {
    _schoolController.dispose();
    _cityController.dispose();
    _addressController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    _goalController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.completeOnboarding(
      school: _schoolController.text,
      city: _cityController.text,
      address: _addressController.text,
      state: _stateController.text,
      pincode: _pincodeController.text,
      targetClass: _selectedClass,
      academicGoal: _goalController.text,
    );

    if (success && mounted) {
      Navigator.pop(context);
      if (widget.onCompleted != null) widget.onCompleted!();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('🎉 Academic profile completed! Welcome to Success Mantra.'),
          backgroundColor: AppTheme.success,
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage ?? 'Failed to save profile'),
          backgroundColor: AppTheme.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryLight,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.auto_awesome, size: 14, color: AppTheme.primary),
                        SizedBox(width: 4),
                        Text(
                          'Step 1 of 1 • Profile Setup',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20, color: Colors.grey),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'Welcome, ${user?.name.split(' ').first ?? 'Student'}! 🎓',
                style: GoogleFonts.outfit(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Please share your school, target class, and residential address to customize your learning curriculum.',
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 20),

              // Academic Class Dropdown
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Academic Class *',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedClass,
                        isExpanded: true,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                        items: _classList.map((c) {
                          return DropdownMenuItem(value: c, child: Text(c));
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedClass = val);
                        },
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // School Name
              CustomTextField(
                label: 'School / College Name *',
                hint: 'e.g. DPS R.K. Puram',
                controller: _schoolController,
                prefixIcon: Icons.school_outlined,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter your school name' : null,
              ),
              const SizedBox(height: 14),

              // City & State
              Row(
                children: [
                  Expanded(
                    child: CustomTextField(
                      label: 'City *',
                      hint: 'e.g. New Delhi',
                      controller: _cityController,
                      prefixIcon: Icons.location_city_outlined,
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter city' : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CustomTextField(
                      label: 'State',
                      hint: 'e.g. Delhi',
                      controller: _stateController,
                      prefixIcon: Icons.map_outlined,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Residential Street Address
              CustomTextField(
                label: 'Residential / Delivery Address *',
                hint: 'e.g. Sector 12, R.K. Puram, House 42',
                controller: _addressController,
                prefixIcon: Icons.home_outlined,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter your street address' : null,
              ),
              const SizedBox(height: 14),

              // PIN Code
              CustomTextField(
                label: 'PIN / Postal Code',
                hint: 'e.g. 110022',
                controller: _pincodeController,
                keyboardType: TextInputType.number,
                prefixIcon: Icons.pin_drop_outlined,
              ),
              const SizedBox(height: 14),

              // Dream Academic Goal
              CustomTextField(
                label: 'Dream Academic Goal *',
                hint: 'e.g. 98%+ in Boards & SRCC CUET',
                controller: _goalController,
                prefixIcon: Icons.flag_outlined,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your target score / goal' : null,
              ),
              const SizedBox(height: 22),

              // Submit Button
              CustomButton(
                text: 'Save & Continue',
                icon: Icons.check_circle_outline,
                isLoading: authProvider.isLoading,
                onPressed: _handleSubmit,
              ),
              const SizedBox(height: 10),
              Center(
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text(
                    'Skip for now',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
