# FAMILYOS — COMMERCIAL RELEASE & GOOGLE PLAY CHECKLIST
**Version**: 1.0.0 (Stage 0 Baseline)  
**Target Marketplace**: Google Play Store (Production Distribution)  

---

## 1. Google Play Developer Policy Compliance

- [ ] **Target API Level**: Compiled and targeted against API 35 (Android 15) per latest Play Console enforcement.
- [ ] **Families Policy Compliance**:
  - [ ] App designed for family use with appropriate neutral age screen or guardian gate.
  - [ ] Zero behavioral advertising SDKs or third-party ad networks bundled.
  - [ ] Child profiles strictly restricted from public sharing or non-guardian access.
- [ ] **Google Play Data Safety Disclosures**:
  - [ ] Data collection explicitly categorized: Financial info (user-provided, encrypted in transit and at rest, not shared with third parties).
  - [ ] Personal info (Names, email, profile photos) declared as necessary for app functionality.
  - [ ] Account deletion URL and in-app automated self-service deletion option fully functional.
- [ ] **Financial & Commercial Billing Policy**:
  - [ ] Google Play Billing Library (v7.0+) integrated for all digital subscription tiers (Individual & Family).
  - [ ] Transparent pricing disclosures: Free tier vs Premium capabilities clearly enumerated.
  - [ ] Functional "Restore Purchases" button on subscription screen.
  - [ ] Core safety, emergency contacts, and local data export never locked behind paywalls.

---

## 2. Security, Cryptography & Anti-Abuse Verification

- [ ] **No Hardcoded Credentials**: Source repository audited for zero embedded API keys, Google Cloud secrets, or keystores.
- [ ] **R8 Code Shrinking & Obfuscation**: ProGuard rules verified; reflection models preserved via `@Keep` or Kotlinx Serialization.
- [ ] **Play Integrity API Integration**: Server backend validates device licensing and hardware attestation verdicts.
- [ ] **Firebase Security Rules Audited**: Unit-tested in Firestore Emulator; zero open read/write access.
- [ ] **Android Keystore Hardware Validation**: MasterKey verified using hardware-backed StrongBox where supported.

---

## 3. Engineering Quality Gates

- [ ] **Zero Floating-Point Financials**: Codebase grep audit confirms `Double`/`Float` absent from financial entities and arithmetic.
- [ ] **17 Mission-Critical Test Scenarios**: 100% automated test suite passing in CI pipeline.
- [ ] **Room Database Migration Integrity**: All incremental migration scripts validated using `MigrationTestHelper`.
- [ ] **Accessibility AA Compliance**: Touch targets >= 48dp, minimum contrast ratio >= 4.5:1, screen reader labels on all interactive icons.
- [ ] **Offline Flight Mode Stress Test**: Complete creation of meals, chores, tasks, and expense records with network physically disconnected, followed by seamless background queue sync upon reconnect.
- [ ] **Clean Production Artifact**: No debug logs (`Log.d`), mock authentication routines, or demo databases present in release build.
