
/* Express Your Story — Firebase Configuration */

import { initializeApp, getApp, getApps } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaYNxk89vnvc-SHrTNfNrQ0gJCYdnrBOI",
  authDomain: "createyourownidentity-2e2a3.firebaseapp.com",
  projectId: "createyourownidentity-2e2a3",
  storageBucket: "createyourownidentity-2e2a3.firebasestorage.app",
  messagingSenderId: "316875593955",
  appId: "1:316875593955:web:529cb0fe3c45f2cca54dd6",
  measurementId: "G-LXVR8CJWRE"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
export default app;
