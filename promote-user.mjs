import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, query, where, updateDoc } from 'firebase/firestore';

const TARGET_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD7reBa6N1ObYdqqeyqqIiYXU4emfsPRjs",
  authDomain: "basechan-90fb9.firebaseapp.com",
  projectId: "basechan",
  storageBucket: "basechan.firebasestorage.app",
  messagingSenderId: "400303522581",
  appId: "1:400303522581:web:2b082f65e0b8c325535f1c"
};

async function run() {
  const email = process.argv[2] || 'jegbase@gmail.com';
  const role = process.argv[3] || 'SUPERADMIN';
  const password = process.argv[4];

  console.log("========================================================");
  console.log(`⚡   PROMOTING USER '${email}' TO ROLE '${role}'...`);
  console.log("========================================================\n");

  const app = initializeApp(TARGET_FIREBASE_CONFIG, "promote-app");
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (password) {
    console.log(`Authenticating as ${email}...`);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✔ Authenticated successfully!");
    } catch (e) {
      console.warn("Authentication warning:", e.message);
    }
  }

  console.log(`Searching for user ${email} in Firestore...`);
  const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
  const snap = await getDocs(q);

  if (!snap.empty) {
    for (const userDoc of snap.docs) {
      const userRef = doc(db, 'users', userDoc.id);

      console.log(`Found existing user with ID: ${userDoc.id}`);
      console.log(`Promoting to ${role}...`);

      await updateDoc(userRef, {
        role: role,
        position: role === 'SUPERADMIN' ? 'Super Administrator' : 'Organization Administrator',
        departmentName: 'Executive Oversight'
      });

      console.log(`✔ Successfully updated user document ${userDoc.id} to ${role}!\n`);
    }
  } else {
    console.log(`❌ User document not found for ${email}.`);
  }

  console.log("Done!\n");
  process.exit(0);
}

run().catch(err => {
  console.error("Error running promote-user script:", err);
  process.exit(1);
});
