/* Public Firebase web configuration. These values identify your Firebase project;
   access is protected by Firebase Authentication and server-side authorization. */
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

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
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
