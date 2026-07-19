import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, query, where, updateDoc } from 'firebase/firestore';

// -------------------------------------------------------------
// 📋 TARGET FIREBASE PROJECT CONFIGURATION
// -------------------------------------------------------------
const TARGET_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD7reBa6N1ObYdqqeyqqIiYXU4emfsPRjs",
  authDomain: "basechan-90fb9.firebaseapp.com",
  projectId: "basechan",
  storageBucket: "basechan.firebasestorage.app",
  messagingSenderId: "400303522581",
  appId: "1:400303522581:web:2b082f65e0b8c325535f1c"
};

const ORG_ID = 'basechan-international';

async function run() {
  console.log("\x1b[36m========================================================\x1b[0m");
  console.log("\x1b[36m⚡   PROMOTING SYSTEM ADMIN TO ORG_ADMIN...             ⚡\x1b[0m");
  console.log("\x1b[36m========================================================\x1b[0m\n");

  const app = initializeApp(TARGET_FIREBASE_CONFIG, "promote-app");
  const db = getFirestore(app);

  const email = 'ithub@basechaninternational.com';

  console.log(`Searching for user \x1b[33m${email}\x1b[0m in Firestore...`);
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const userDoc = snap.docs[0];
    const userRef = doc(db, 'users', userDoc.id);
    
    console.log(`Found existing user with ID: \x1b[32m${userDoc.id}\x1b[0m`);
    console.log(`Promoting to Organization Administrator (ORG_ADMIN)...`);
    
    await updateDoc(userRef, {
      role: 'ORG_ADMIN',
      position: 'Organization Administrator',
      departmentName: 'Information Technology (IT)'
    });
    
    console.log(`\x1b[32m✔ Successfully updated user roles to Admin!\x1b[0m\n`);
  } else {
    console.log(`User document not found. Creating a new Administrator document for \x1b[33m${email}\x1b[0m...`);
    
    const newDocId = 'ithub';
    const newDocRef = doc(db, 'users', newDocId);
    
    const newProfile = {
      orgId: ORG_ID,
      email: email,
      username: 'ithub',
      password: '00000000', // Safe default, will be synchronized on login or sync-auth
      fullName: 'IT Hub Admin',
      role: 'ORG_ADMIN',
      position: 'Organization Administrator',
      departmentName: 'Information Technology (IT)',
      joinedDate: new Date().toISOString(),
      status: 'OFFLINE'
    };
    
    await setDoc(newDocRef, newProfile);
    console.log(`\x1b[32m✔ Created new ORG_ADMIN user document in database with ID: '${newDocId}'!\x1b[0m\n`);
  }

  console.log("\x1b[36mDone! Next time you run 'node sync-auth.mjs', it will register this user in Auth as an administrator.\x1b[0m\n");
}

run().catch(err => {
  console.error("Error running promote-user script:", err);
});
