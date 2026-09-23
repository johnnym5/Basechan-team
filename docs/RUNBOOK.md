# UT BASECHAN ENTERPRISE PLATFORM — OPERATIONAL RUNBOOK

**Target Environment:** Firebase / Next.js / Cloud Functions (Node.js 20)  
**Governing Standards:** AI_ENGINEERING_META_ORCHESTRATOR.md, Doc A, Doc B  
**Document Version:** 1.0 (Post-Remediation)  

---

## 1. LOCAL DEVELOPMENT & EMULATOR SETUP

### Prerequisites
- Node.js >= 20.x
- Java Runtime Environment (JRE) >= 11 (required for Firebase Emulators)
- Firebase CLI (`npm install -g firebase-tools`)

### Initializing Environment
```bash
# 1. Clone repository and install dependencies
npm install
npm --prefix functions install

# 2. Copy environment variable template
cp .env.example .env.local

# 3. Build Cloud Functions
npm --prefix functions run build

# 4. Start Firebase Emulators (Auth, Firestore, Functions)
firebase emulators:start --only auth,firestore,functions
```

---

## 2. ENVIRONMENT VARIABLE MATRIX (`.env.example`)

Ensure all required keys are set in `.env.local` prior to launching the Next.js development server:

```env
# FIREBASE CLIENT CONFIGURATION
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="1:your-app-id"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX"

# SERVER & AI INTEGRATION (GENKIT)
GEMINI_API_KEY="your-gemini-api-key"
```

---

## 3. DEPLOYMENT SEQUENCES

### Pre-Deployment Verification Checklist
Run automated build and type checks before executing any deployment command:

```bash
# 1. Next.js App Type Check
npx tsc --noEmit

# 2. Cloud Functions Type Check & Build
npm --prefix functions run build

# 3. Verify Next.js Build Output
npm run build
```

### Production Deployment Sequence
Execute deployments in dependency order (Backend Security Rules & Cloud Functions first, followed by Web Client):

```bash
# Step 1: Deploy Firestore Security Rules & Indexes
firebase deploy --only firestore:rules,firestore:indexes

# Step 2: Deploy Cloud Functions
firebase deploy --only functions

# Step 3: Deploy Hosting / Web Client
firebase deploy --only hosting
```

---

## 4. ZERO-DOWNTIME ROLLBACK STRATEGIES

### Cloud Functions Rollback
If a Cloud Function release introduces regressions:
1. Revert `functions/src/` to the last known good commit tag.
2. Recompile functions: `npm --prefix functions run build`.
3. Redeploy functions immediately: `firebase deploy --only functions`.

### Security Rules Rollback
If rule changes block authorized traffic:
1. Revert `firestore.rules` to previous ruleset version.
2. Redeploy rules immediately: `firebase deploy --only firestore:rules`.

---

## 5. MONITORING & AUDIT LOG ACCESS

- Immutable audit logs are written to the `audit_logs` collection by Cloud Functions.
- View system logs via Firebase Console -> Cloud Functions -> Logs or GCP Cloud Logging:
  ```bash
  gcloud logging read "resource.type=cloud_function" --limit 50 --format json
  ```
