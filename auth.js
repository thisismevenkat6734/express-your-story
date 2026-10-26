import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $ = (selector) => document.querySelector(selector);

let busy = false;

function showMessage(selector, message, type = "error") {
  const element = $(selector);
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
}

function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "ఈ Email‌తో ఇప్పటికే ఖాతా ఉంది. Login చేయి.",
    "auth/invalid-email": "సరైన Email address ఇవ్వు.",
    "auth/invalid-credential": "Email లేదా Password సరిగ్గా లేదు.",
    "auth/user-not-found": "ఈ Email‌తో ఖాతా కనబడలేదు.",
    "auth/wrong-password": "Password సరిగ్గా లేదు.",
    "auth/weak-password": "కనీసం 8 అక్షరాల బలమైన Password ఇవ్వు.",
    "auth/too-many-requests": "చాలా ప్రయత్నాలు జరిగాయి. కొంతసేపటి తర్వాత ప్రయత్నించు.",
    "auth/network-request-failed": "Internet connection‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించు.",
    "auth/operation-not-allowed": "Firebase Console‌లో Email/Password Authentication‌ను తనిఖీ చేయి.",
    "permission-denied": "Firestore అనుమతి నిరాకరించింది. Security Rules‌ను తనిఖీ చేయాలి."
  };

  return messages[error?.code] ||
    "ప్రస్తుతం ఈ పని పూర్తికాలేదు. మళ్లీ ప్రయత్నించు.";
}

function setBusy(form, value) {
  if (!form) return;

  form.querySelectorAll('button[type="submit"]').forEach((button) => {
    button.disabled = value;
  });
}

function setAuthMode(mode) {
  const loginForm = $("#login-form");
  const signupForm = $("#signup-form");
  const loginTab = $("#login-tab");
  const signupTab = $("#signup-tab");
  const heading = $("#auth-heading");
  const subheading = $("#auth-subheading");

  const signup = mode === "signup";

  if (loginForm) loginForm.hidden = signup;
  if (signupForm) signupForm.hidden = !signup;

  if (loginTab) {
    loginTab.classList.toggle("active", !signup);
    loginTab.setAttribute("aria-selected", String(!signup));
  }

  if (signupTab) {
    signupTab.classList.toggle("active", signup);
    signupTab.setAttribute("aria-selected", String(signup));
  }

  if (heading) heading.textContent = signup ? "Create your space" : "Welcome back";

  if (subheading) {
    subheading.textContent = signup
      ? "Create an account to express yourself."
      : "Pick up where you left off.";
  }

  showMessage("#login-error", "");
  showMessage("#signup-error", "");
}

async function createProfile(user, displayName) {
  const profileRef = doc(db, "profiles", user.uid);
  const existingProfile = await getDoc(profileRef);

  if (!existingProfile.exists()) {
    await setDoc(profileRef, {
      uid: user.uid,
      displayName: displayName,
      email: user.email || "",
      photoURL: user.photoURL || "",
      bio: "",
      visibility: "public",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

async function handleSignup(event) {
  event.preventDefault();

  if (busy) return;

  const form = event.currentTarget;
  const displayName = $("#signup-name")?.value.trim() || "";
  const email = $("#signup-email")?.value.trim() || "";
  const password = $("#signup-password")?.value || "";
  const confirmPassword = $("#signup-confirm")?.value || "";
  const termsAccepted = $("#accept-terms")?.checked === true;

  showMessage("#signup-error", "");

  if (displayName.length < 2 || displayName.length > 50) {
    showMessage("#signup-error", "నీ పేరు 2 నుంచి 50 అక్షరాల మధ్య ఉండాలి.");
    return;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage("#signup-error", "సరైన Email address ఇవ్వు.");
    return;
  }

  if (password.length < 8 || password.length > 128) {
    showMessage("#signup-error", "Password 8 నుంచి 128 అక్షరాల మధ్య ఉండాలి.");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("#signup-error", "రెండు Password‌లు ఒకేలా లేవు.");
    return;
  }

  if (!termsAccepted) {
    showMessage("#signup-error", "Terms మరియు Privacy Policy‌ను అంగీకరించాలి.");
    return;
  }

  busy = true;
  setBusy(form, true);

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(credential.user, {
      displayName
    });

    await createProfile(credential.user, displayName);

    showMessage(
      "#signup-error",
      "ఖాతా సృష్టించబడింది. ఇప్పుడు నీ ఖాతాలోకి ప్రవేశించవచ్చు.",
      "success"
    );

    form.reset();

    document.dispatchEvent(
      new CustomEvent("expressyourstory:auth-success", {
        detail: { user: credential.user, mode: "signup" }
      })
    );
  } catch (error) {
    showMessage("#signup-error", friendlyError(error));
  } finally {
    busy = false;
    setBusy(form, false);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  if (busy) return;

  const form = event.currentTarget;
  const email = $("#login-email")?.value.trim() || "";
  const password = $("#login-password")?.value || "";

  showMessage("#login-error", "");

  if (!email || !password) {
    showMessage("#login-error", "Email మరియు Password ఇవ్వు.");
    return;
  }

  busy = true;
  setBusy(form, true);

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    showMessage("#login-error", "Login విజయవంతమైంది.", "success");

    form.reset();

    document.dispatchEvent(
      new CustomEvent("expressyourstory:auth-success", {
        detail: { user: credential.user, mode: "login" }
      })
    );
  } catch (error) {
    showMessage("#login-error", friendlyError(error));
  } finally {
    busy = false;
    setBusy(form, false);
  }
}

async function handlePasswordReset() {
  const email = $("#login-email")?.value.trim() || "";

  showMessage("#login-error", "");

  if (!email) {
    showMessage("#login-error", "ముందుగా Login Email ఇవ్వు.");
    $("#login-email")?.focus();
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);

    showMessage(
      "#login-error",
      "Password reset సూచనలను Email‌కు పంపించాం.",
      "success"
    );
  } catch (error) {
    showMessage("#login-error", friendlyError(error));
  }
}

$("#signup-form")?.addEventListener("submit", handleSignup);
$("#login-form")?.addEventListener("submit", handleLogin);
$("#login-tab")?.addEventListener("click", () => setAuthMode("login"));
$("#signup-tab")?.addEventListener("click", () => setAuthMode("signup"));
$("#forgot-password")?.addEventListener("click", handlePasswordReset);

onAuthStateChanged(auth, (user) => {
  document.dispatchEvent(
    new CustomEvent("expressyourstory:auth-state", {
      detail: { user }
    })
  );
});

document.addEventListener("expressyourstory:sign-out", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign out failed:", error);
  }
});
