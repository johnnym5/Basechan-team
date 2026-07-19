import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where, getDoc, collectionGroup } from 'firebase/firestore';
import readline from 'readline';

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

// Config of direct matching fields across other collections
const REF_FIELDS_CONFIG = [
  { collection: 'attendance', field: 'userId' },
  { collection: 'attendance', field: 'approvedBy' },
  { collection: 'rosters', field: 'userId' },
  { collection: 'purchase_orders', field: 'createdBy' },
  { collection: 'requisitions', field: 'createdBy' },
  { collection: 'tasks', field: 'assignedTo' },
  { collection: 'tasks', field: 'createdBy' },
  { collection: 'tasks', field: 'requesterId' },
  { collection: 'announcements', field: 'authorId' },
  { collection: 'notifications', field: 'userId' },
  { collection: 'leave_requests', field: 'userId' },
  { collection: 'daily_reports', field: 'userId' },
  { collection: 'pulse_checks', field: 'userId' },
  { collection: 'activity_points', field: 'userId' }
];

async function run() {
  console.clear();
  console.log("\x1b[36m========================================================\x1b[0m");
  console.log("\x1b[36m⚡   FIREBASE AUTHENTICATION & UID SYNCHRONIZER         ⚡\x1b[0m");
  console.log("\x1b[36m========================================================\x1b[0m\n");
  console.log(`Target Project: \x1b[32mbasechan\x1b[0m\n`);

  const adminEmail = await askQuestion("Super Admin Email [jegbase@gmail.com]: ") || "jegbase@gmail.com";
  const adminPassword = await askQuestion("Enter Password: ");
  console.log();

  if (!adminPassword) {
    console.log("\x1b[31mError: Super Admin password is required to run sync.\x1b[0m");
    rl.close();
    return;
  }

  console.log("\x1b[34m[1/4] Initializing Firebase Clients...\x1b[0m");
  const mainApp = initializeApp(TARGET_FIREBASE_CONFIG, "main-sync-app");
  const mainAuth = getAuth(mainApp);
  const mainFirestore = getFirestore(mainApp);

  console.log("\x1b[34m[2/4] Authenticating Super Admin on basechan...\x1b[0m");
  let loggedInUser = null;
  try {
    const cred = await signInWithEmailAndPassword(mainAuth, adminEmail, adminPassword);
    loggedInUser = cred.user;
    console.log("\x1b[32m✔ Authenticated successfully on basechan!\x1b[0m\n");
  } catch (e) {
    // If Admin account is not in Auth, we can attempt to register it using their Firestore password
    console.log(`\x1b[33m⚠ Super Admin Auth account not found or wrong credentials. Attempting on-the-fly registration...\x1b[0m`);
    try {
      const cred = await createUserWithEmailAndPassword(mainAuth, adminEmail, adminPassword);
      loggedInUser = cred.user;
      console.log("\x1b[32m✔ Created Super Admin Auth account successfully!\x1b[0m\n");
    } catch (createErr) {
      console.log(`\x1b[31m❌ Authentication failed: ${e.message} (Creation also failed: ${createErr.message})\x1b[0m`);
      rl.close();
      return;
    }
  }

  console.log("\x1b[34m[3/4] Fetching all user profiles from Firestore...\x1b[0m");
  const usersSnap = await getDocs(collection(mainFirestore, 'users'));
  const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Found \x1b[33m${allUsers.length}\x1b[0m user documents in database.\n`);

  console.log("\x1b[36mUsers Detected:\x1b[0m");
  allUsers.forEach((u, i) => {
    console.log(`  ${i+1}. \x1b[1m${u.fullName}\x1b[0m (${u.email}) - Role: ${u.role}`);
  });
  console.log();

  const confirm = await askQuestion("Do you want to proceed with recreation of Auth accounts and updating UIDs? (y/n): ");
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log("\x1b[33mOperation cancelled by user.\x1b[0m");
    rl.close();
    return;
  }

  console.log("\x1b[34m\n[4/4] Starting Synchronization...\x1b[0m\n");

  for (let i = 0; i < allUsers.length; i++) {
    const userDoc = allUsers[i];
    const oldUid = userDoc.id;
    const { email, password, fullName } = userDoc;

    if (!email || !password) {
      console.log(`\x1b[33m[${i + 1}/${allUsers.length}] Skipping '${fullName || 'Unknown'}' - missing email or password field.\x1b[0m`);
      continue;
    }

    console.log(`\x1b[35m[${i + 1}/${allUsers.length}] Synchronizing user: '${fullName}' (${email})...\x1b[0m`);

    // We use a temporary secondary Firebase App to create/sign-in other users
    // so we don't disrupt our main logged-in Admin session
    const tempAppName = `sync-provision-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const tempApp = initializeApp(TARGET_FIREBASE_CONFIG, tempAppName);
    const tempAuth = getAuth(tempApp);

    let newUid = null;
    let authCreated = false;

    try {
      // 1. Try to create the user account
      const safePassword = password.length >= 6 ? password : password.padEnd(6, '0');
      try {
        const cred = await createUserWithEmailAndPassword(tempAuth, email, safePassword);
        newUid = cred.user.uid;
        authCreated = true;
        console.log(`   ├─ Auth created successfully.`);
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          // If already in auth, sign in as them to retrieve their existing UID
          try {
            const cred = await signInWithEmailAndPassword(tempAuth, email, safePassword);
            newUid = cred.user.uid;
            console.log(`   ├─ Auth account already exists. Retrieved matching UID.`);
          } catch (signInErr) {
            console.log(`   ├─ ❌ Existing Auth account found, but password mismatch: ${signInErr.message}`);
          }
        } else {
          console.log(`   ├─ ❌ Error creating Auth account: ${err.message}`);
        }
      }
    } finally {
      await deleteApp(tempApp);
    }

    if (!newUid) {
      console.log(`   └─ \x1b[31m❌ Could not resolve or create Auth account for ${email}. Skipping.\x1b[0m\n`);
      continue;
    }

    // 2. Check if UID already matches the current document ID
    if (newUid === oldUid) {
      console.log(`   └─ \x1b[32m✔ UID already matches Firestore document ID (${oldUid}). No updates needed.\x1b[0m\n`);
      continue;
    }

    console.log(`   ├─ UID Mismatch detected: old='${oldUid}' ➔ new='${newUid}'`);
    console.log(`   ├─ Migrating Firestore document...`);

    try {
      // Ensure we are signed back in as Admin (mainAuth shouldn't have changed, but let's make sure)
      if (mainAuth.currentUser?.email !== adminEmail) {
        await signInWithEmailAndPassword(mainAuth, adminEmail, adminPassword);
      }

      // Copy document to new ID
      const oldDocRef = doc(mainFirestore, 'users', oldUid);
      const newDocRef = doc(mainFirestore, 'users', newUid);

      const oldDocSnap = await getDoc(oldDocRef);
      if (oldDocSnap.exists()) {
        const userData = oldDocSnap.data();
        userData.id = newUid; // Ensure id matches
        await setDoc(newDocRef, userData);
        await deleteDoc(oldDocRef);
        console.log(`   ├─ Document copied to new ID and old document deleted.`);
      }

      // 3. Update all direct reference fields
      console.log(`   ├─ Updating collection references...`);
      for (const ref of REF_FIELDS_CONFIG) {
        const colRef = collection(mainFirestore, ref.collection);
        const q = query(colRef, where(ref.field, '==', oldUid));
        const snap = await getDocs(q);

        if (snap.size > 0) {
          const batch = writeBatch(mainFirestore);
          snap.docs.forEach(docSnap => {
            batch.update(doc(mainFirestore, ref.collection, docSnap.id), { [ref.field]: newUid });
          });
          await batch.commit();
          console.log(`   │  └─ Updated ${snap.size} records in '${ref.collection}' (${ref.field})`);
        }
      }

      // 4. Update Chat collection arrays and subcollections
      // A. Chat participants
      const chatsCol = collection(mainFirestore, 'chats');
      const chatsQuery = query(chatsCol, where('participants', 'array-contains', oldUid));
      const chatsSnap = await getDocs(chatsQuery);

      if (chatsSnap.size > 0) {
        const batch = writeBatch(mainFirestore);
        for (const chatDoc of chatsSnap.docs) {
          const chatData = chatDoc.data();
          const updatedParticipants = chatData.participants.map(p => p === oldUid ? newUid : p);
          
          const updates = { participants: updatedParticipants };

          // Update read receipts
          if (chatData.readReceipts && chatData.readReceipts[oldUid]) {
            updates[`readReceipts.${newUid}`] = chatData.readReceipts[oldUid];
            updates[`readReceipts.${oldUid}`] = null; // deletes the key
          }

          // Update lastMessage
          if (chatData.lastMessage && chatData.lastMessage.senderId === oldUid) {
            updates['lastMessage.senderId'] = newUid;
          }

          batch.update(doc(mainFirestore, 'chats', chatDoc.id), updates);
        }
        await batch.commit();
        console.log(`   │  └─ Updated ${chatsSnap.size} records in 'chats' participants & readReceipts.`);
      }

      // B. Chat messages subcollection
      const messagesQuery = query(collectionGroup(mainFirestore, 'messages'), where('senderId', '==', oldUid));
      const messagesSnap = await getDocs(messagesQuery);
      if (messagesSnap.size > 0) {
        const batch = writeBatch(mainFirestore);
        messagesSnap.docs.forEach(msgDoc => {
          batch.update(msgDoc.ref, { senderId: newUid });
        });
        await batch.commit();
        console.log(`   │  └─ Updated ${messagesSnap.size} records in 'messages' subcollections.`);
      }

      // 5. Update Task sharedWith arrays
      const tasksCol = collection(mainFirestore, 'tasks');
      const tasksQuery = query(tasksCol, where('sharedWith', 'array-contains', oldUid));
      const tasksSnap = await getDocs(tasksQuery);

      if (tasksSnap.size > 0) {
        const batch = writeBatch(mainFirestore);
        tasksSnap.docs.forEach(taskDoc => {
          const taskData = taskDoc.data();
          const updatedSharedWith = taskData.sharedWith.map(id => id === oldUid ? newUid : id);
          batch.update(doc(mainFirestore, 'tasks', taskDoc.id), { sharedWith: updatedSharedWith });
        });
        await batch.commit();
        console.log(`   │  └─ Updated ${tasksSnap.size} records in 'tasks' sharedWith array.`);
      }

      // 6. Update Workbook sharedWith array
      const workbooksCol = collection(mainFirestore, 'workbooks');
      const wbQuery = query(workbooksCol, where('visibleTo', 'array-contains', oldUid));
      const wbSnap = await getDocs(wbQuery);

      if (wbSnap.size > 0) {
        const batch = writeBatch(mainFirestore);
        wbSnap.docs.forEach(wbDoc => {
          const wbData = wbDoc.data();
          const updatedVisibleTo = wbData.visibleTo.map(id => id === oldUid ? newUid : id);
          const updates = { visibleTo: updatedVisibleTo };
          
          if (wbData.sharedWith && wbData.sharedWith.length > 0) {
            updates.sharedWith = wbData.sharedWith.map(share => {
              if (share.userId === oldUid) {
                return { ...share, userId: newUid };
              }
              return share;
            });
          }
          batch.update(doc(mainFirestore, 'workbooks', wbDoc.id), updates);
        });
        await batch.commit();
        console.log(`   │  └─ Updated ${wbSnap.size} records in 'workbooks' sharing configuration.`);
      }

      // 7. Update Announcements viewedBy/visibleTo arrays
      const annQuery = query(collection(mainFirestore, 'announcements'), where('visibleTo', 'array-contains', oldUid));
      const annSnap = await getDocs(annQuery);

      if (annSnap.size > 0) {
        const batch = writeBatch(mainFirestore);
        annSnap.docs.forEach(annDoc => {
          const annData = annDoc.data();
          const updatedVisibleTo = annData.visibleTo.map(id => id === oldUid ? newUid : id);
          const updates = { visibleTo: updatedVisibleTo };

          if (annData.viewedBy && annData.viewedBy.length > 0) {
            updates.viewedBy = annData.viewedBy.map(id => id === oldUid ? newUid : id);
          }

          batch.update(doc(mainFirestore, 'announcements', annDoc.id), updates);
        });
        await batch.commit();
        console.log(`   │  └─ Updated ${annSnap.size} records in 'announcements' viewing/visibility configs.`);
      }

      console.log(`   └─ \x1b[32m✔ Synchronized successfully!\x1b[0m\n`);
    } catch (dbErr) {
      console.log(`   └─ \x1b[31m❌ Database migration error: ${dbErr.message}\x1b[0m\n`);
    }
  }

  console.log("\x1b[32m========================================================\x1b[0m");
  console.log(`\x1b[32m🎉 AUTHENTICATION AND UID SYNCHRONIZATION COMPLETE!\x1b[0m`);
  console.log("\x1b[32m========================================================\x1b[0m\n");

  rl.close();
}

run().catch((err) => {
  console.error("Fatal exception during synchronization:", err);
  rl.close();
});
