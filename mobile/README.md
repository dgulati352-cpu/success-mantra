# Success Mantra Flutter Mobile Application 📱

Official cross-platform mobile application for **Success Mantra (CA Manish Kalra's Commerce Academy)** built with Flutter.

---

## 🏗️ Architecture & Features

- **Authentication Flow**:
  - Secure JWT authentication with auto-refresh and token persistence via `SharedPreferences`.
  - Registration with locked target academic class selection (`Class 11`, `Class 12`, `CUET`, `CA Foundation`).
  - Self-service single-use Password Reset.
- **Video Learning Vault**:
  - DRM security watermark dynamically displaying student's phone number/email over video frames.
  - Variable speed controls (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).
  - Progress autosave and mark completed syncing.
- **Live Classroom Batches**:
  - Real-time scheduled and active live batch monitoring.
  - One-click join to teacher broadcasting rooms.
- **Interactive Mock Test Engine**:
  - Timed examination engine with question palette navigation.
  - Instant score calculation, accuracy percentage, and answer key explanations.
- **Tamper-Proof Certificates**:
  - High-resolution luxury black-and-gold certificate renderer.
  - Automated 1-click WhatsApp delivery targeting student's registered login phone number.
- **Profile & DPDP Compliance**:
  - Target academic goal tracking and self-service account deletion under the Digital Personal Data Protection (DPDP) Act, 2023.

---

## 🚀 How to Run Locally

### 1. Prerequisites
- Install Flutter SDK (>= 3.0.0): [flutter.dev/docs/get-started/install](https://flutter.dev/docs/get-started/install)
- Android Studio / VS Code with Flutter extensions.

### 2. Install Dependencies
```bash
cd mobile
flutter pub get
```

### 3. Run on Device or Emulator
```bash
# Debug run on connected Android/iOS device
flutter run

# Build Android Release APK
flutter build apk --release
```

### 4. API Configuration
The app defaults to the live production server at:
```dart
// lib/core/constants/api_constants.dart
static const String baseUrl = 'https://www.camanishkalra.com/api';
```
For local Android emulator debugging, switch to:
```dart
static const String baseUrl = 'http://10.0.2.2:5000/api';
```
