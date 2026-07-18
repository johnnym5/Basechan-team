import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import readline from 'readline';

// -------------------------------------------------------------
// 📋 FIREBASE PROJECTS CONFIGURATION
// -------------------------------------------------------------
const OLD_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCn0pLLYEpAHR6ehj6zWxVnoEzQgLCFVCs",
  authDomain: "basechanteam.firebaseapp.com",
  projectId: "basechanteam",
  storageBucket: "basechanteam.firebasestorage.app",
  messagingSenderId: "261796318440",
  appId: "1:261796318440:web:e62d9bda06dac94b264d5d"
};

const NEW_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD7reBa6N1ObYdqqeyqqIiYXU4emfsPRjs",
  authDomain: "basechan-90fb9.firebaseapp.com",
  projectId: "basechan",
  storageBucket: "basechan.firebasestorage.app",
  messagingSenderId: "400303522581",
  appId: "1:400303522581:web:2b082f65e0b8c325535f1c"
};

const MIGRATION_COLLECTIONS = [
  'organizations',
  'users',
  'departments',
  'vendors',
  'purchase_orders',
  'requisitions',
  'tasks',
  'attendance',
  'rosters',
  'announcements',
  'workbooks',
  'leave_requests',
  'daily_reports',
  'chats',
  'journal_entries',
  'pulse_checks',
  'activity_points',
  'kudos',
  'system_configs',
  'feedback'
];

// -------------------------------------------------------------
// 🛠️ HELPER FUNCTIONS
// -------------------------------------------------------------
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
};

// -------------------------------------------------------------
// 🚀 RUN MIGRATION
// -------------------------------------------------------------
async function run() {
  console.clear();
  console.log("\x1b[36m========================================================\x1b[0m");
  console.log("\x1b[36m⚡   CROSS-PROJECT FIREBASE TERMINAL MIGRATOR          ⚡\x1b[0m");
  console.log("\x1b[36m========================================================\x1b[0m\n");
  console.log(`Source Project: \x1b[33mbasechanteam\x1b[0m`);
  console.log(`Target Project: \x1b[32mbasechan\x1b[0m\n`);
  console.log("\x1b[90mThis script runs directly in Node.js, making it 100% immune\x1b[0m");
  console.log("\x1b[90mto browser WebChannel socket limits and 'ca9' errors.\x1b[0m\n");

  const email = await askQuestion("Super Admin Email [jegbase@gmail.com]: ") || "jegbase@gmail.com";
  const password = await askQuestion("Enter Password: ");
  console.log();

  if (!password) {
    console.log("\x1b[31mError: Password is required to authenticate database connection.\x1b[0m");
    rl.close();
    return;
  }

  console.log("\x1b[34m[1/3] Initializing Firebase Clients...\x1b[0m");
  const oldApp = initializeApp(OLD_FIREBASE_CONFIG, "old-project");
  const newApp = initializeApp(NEW_FIREBASE_CONFIG, "new-project");

  console.log("\x1b[34m[2/3] Authenticating on source project (basechanteam)...\x1b[0m");
  try {
    const oldAuth = getAuth(oldApp);
    await signInWithEmailAndPassword(oldAuth, email, password);
    console.log("\x1b[32m✔ Authenticated successfully on basechanteam!\x1b[0m\n");
  } catch (e) {
    console.log(`\x1b[31m❌ Authentication failed: ${e.message}\x1b[0m`);
    rl.close();
    return;
  }

  console.log("\x1b[34m[3/3] Commencing Live Firestore Copy...\x1b[0m\n");
  const oldFirestore = getFirestore(oldApp);
  const newFirestore = getFirestore(newApp);

  let totalCopiedCount = 0;

  for (let i = 0; i < MIGRATION_COLLECTIONS.length; i++) {
    const collId = MIGRATION_COLLECTIONS[i];
    console.log(`\x1b[35m[${i + 1}/${MIGRATION_COLLECTIONS.length}] Collection: '${collId}'\x1b[0m`);
    console.log(`   └─ Reading docs from old project...`);

    try {
      const snap = await getDocs(collection(oldFirestore, collId));
      console.log(`   └─ Found \x1b[33m${snap.size}\x1b[0m documents.`);

      if (snap.size > 0) {
        let batch = writeBatch(newFirestore);
        let count = 0;
        let batchCount = 0;

        for (const docSnap of snap.docs) {
          const docRef = doc(newFirestore, collId, docSnap.id);
          batch.set(docRef, docSnap.data(), { merge: true });
          count++;

          if (count === 500) {
            await batch.commit();
            batchCount++;
            console.log(`   └─ Committed Batch #${batchCount} (500 records).`);
            batch = writeBatch(newFirestore);
            count = 0;
          }
        }

        if (count > 0) {
          await batch.commit();
          batchCount++;
          console.log(`   └─ Committed final Batch #${batchCount} (${count} records).`);
        }

        totalCopiedCount += snap.size;
        console.log(`   └─ \x1b[32m✔ Successfully copied all ${snap.size} documents!\x1b[0m\n`);
      } else {
        console.log(`   └─ \x1b[37mNo documents found. Skipping.\x1b[0m\n`);
      }
    } catch (err) {
      console.log(`   └─ \x1b[31m❌ Error copying collection: ${err.message}\x1b[0m\n`);
    }
  }

  console.log("\x1b[32m========================================================\x1b[0m");
  console.log(`\x1b[32m🎉 MIGRATION COMPLETE! Total Copied: ${totalCopiedCount} docs.\x1b[0m`);
  console.log("\x1b[32m========================================================\x1b[0m\n");

  rl.close();
}

run().catch((err) => {
  console.error("Fatal exception during script execution:", err);
  rl.close();
});
