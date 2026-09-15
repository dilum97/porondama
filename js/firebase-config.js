/**
 * firebase-config.js
 * ------------------------------------------------------------------
 * Fill this in with your own Firebase project's config
 * (Firebase Console → Project settings → General → Your apps → SDK
 * setup and configuration). Safe to be public/committed — these
 * values are not secret, access control happens via Firestore
 * Security Rules (see README.md).
 * ------------------------------------------------------------------
 */
const firebaseConfig = {
  apiKey: "AIzaSyBPhs2NaQP8FJRa5sVDSkfVTEPn9L7GXZA",
  authDomain: "porondam-a7ce7.firebaseapp.com",
  projectId: "porondam-a7ce7",
  storageBucket: "porondam-a7ce7.firebasestorage.app",
  messagingSenderId: "927977498734",
  appId: "1:927977498734:web:9c156dcb005b66480f9e7f"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Cache Firestore reads/writes on-device (IndexedDB) so data already
// seen once (profile, matches, chat history) is still visible with no
// connection, and queued writes sync automatically once back online.
db.enablePersistence().catch(err => {
  if (err.code === "failed-precondition") {
    // Multiple tabs open — persistence only works in one at a time.
    console.warn("Firestore persistence disabled: another tab has it open.");
  } else if (err.code === "unimplemented") {
    console.warn("Firestore persistence not supported in this browser.");
  }
});

// Fixed pseudo-domain used to turn a username into a Firebase Auth
// email, so users can log in with just a username like the existing
// login.html expects. Not a real mailbox — Firebase never sends
// email here.
const USERNAME_EMAIL_DOMAIN = "kendramatch.local";
function usernameToEmail(username) {
  return username.trim().toLowerCase() + "@" + USERNAME_EMAIL_DOMAIN;
}

// Cloudinary unsigned upload settings — create an "unsigned" upload
// preset in Cloudinary console (Settings → Upload → Upload presets)
// so the browser can upload directly without exposing your API secret.
const CLOUDINARY_CLOUD_NAME = "dnvx958gz";
const CLOUDINARY_UPLOAD_PRESET = "porondam";

// Your own Firebase Auth UID — the only account that can see/use
// admin.html (manage users, disable/delete profiles). Find it in
// Firebase Console -> Authentication -> Users -> "User UID" column
// for your own account, then paste it here. This same UID string
// must ALSO be pasted into the ADMIN_UID checks inside
// firestore.rules (the "users" match block) — the JS check below
// only hides the admin.html UI; the Firestore rule is what actually
// enforces it server-side.
const ADMIN_UID = "jCq33c0h8qW2ngGPQsqOlQBHIHt2";
