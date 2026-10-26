/* Express Your Story — Main Application
   File: script.js
*/

import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const App = (() => {
  "use strict";

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const state = {
    user: null,
    authMode: "login",
    currentPage: "home",
    busy: false
  };

  const pageTitles = {
    home: "Your Feed",
    feelings: "Express Your Feelings",
    stories: "Stories",
    letters: "Love Letters",
    messages: "Messages",
    friends: "Friends",
    notifications: "Notifications",
    profile: "My Profile",
    terms: "Terms & Conditions",
    privacy: "Privacy Policy"
  };

  function toast(message, type = "info") {
    const element = $("#toast");

    if (element) {
      element.textContent = message;
      element.dataset.type = type;
      element.classList.add("show");

      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => {
        element.classList.remove("show");
      }, 3500);
    } else {
      alert(message);
    }
  }

  function setMessage(element, message, type = "error") {
    if (!element) return;

    element.textContent = message;
    element.dataset.type = type;
    element.hidden = !message;
  }

  function friendlyError(error) {
    const errors = {
      "auth/email-already-in-use":
        "This email is already registered. Please log in.",
      "auth/invalid-email":
        "Please enter a valid email address.",
      "auth/invalid-credential":
        "Email or password is incorrect.",
      "auth/user-not-found":
        "No account was found with this email.",
      "auth/wrong-password":
        "Email or password is incorrect.",
      "auth/weak-password":
        "Choose a stronger password with at least 6 characters.",
      "auth/too-many-requests":
        "Too many attempts. Please wait and try again.",
      "auth/network-request-failed":
        "Network error. Check your internet connection.",
      "auth/operation-not-allowed":
        "Email/password login is not enabled in Firebase.",
      "auth/unauthorized-domain":
        "This website domain is not authorized in Firebase.",
      "permission-denied":
        "Firestore permission denied. Check your Security Rules."
    };

    return errors[error?.code] ||
      "Something went wrong. Please try again.";
  }

  function showPage(pageName) {
    const target = $(`#${CSS.escape(pageName)}`);

    if (!target) {
      toast("This page is not available yet.");
      return;
    }

    if (!state.user && pageName !== "auth") {
      pageName = "auth";
    }

    $$(".page").forEach(page => {
      page.hidden = page.id !== pageName;
      page.classList.toggle("active", page.id === pageName);
    });

    $$("[data-page]").forEach(link => {
      link.classList.toggle(
        "active",
        link.dataset.page === pageName
      );
    });

    const heading = $("#pageHeading");

    if (heading) {
      heading.textContent = pageTitles[pageName] || "Express Your Story";
    }

    state.currentPage = pageName;

    $("#sidebar")?.classList.remove("open");
    $("#sidebarBackdrop")?.classList.remove("show");

    if (pageName === "profile" && state.user) {
      renderProfilePreview();
    }
  }

  function showAuthenticatedUI(user) {
    const sidebar = $("#sidebar");
    const topAvatar = $("#topAvatar");

    if (sidebar) sidebar.hidden = !user;

    if (topAvatar) {
      topAvatar.textContent =
        (user?.displayName || user?.email || "U")
          .trim()
          .charAt(0)
          .toUpperCase();
    }

    const nameField = $("#profileName");
    if (nameField && user) {
      nameField.value = user.displayName || "";
    }

    const emailField = $("#authEmail");
    if (emailField) emailField.value = "";

    const passwordField = $("#authPassword");
    if (passwordField) passwordField.value = "";

    const confirmField = $("#authConfirmPassword");
    if (confirmField) confirmField.value = "";

    renderProfilePreview();
  }

  function setAuthMode(mode) {
    state.authMode = mode;

    const isSignup = mode === "signup";

    const title = $("#authTitle");
    const description = $("#authDescription");
    const submit = $("#authSubmit");
    const name = $("#authName");
    const nameLabel = $("#authNameLabel");
    const confirm = $("#authConfirmPassword");
    const confirmLabel = $("#confirmPasswordLabel");
    const forgot = $("#forgotPasswordButton");

    if (title) {
      title.textContent = isSignup ? "Create your account" : "Welcome back";
    }

    if (description) {
      description.textContent = isSignup
        ? "Create a safe space to express your story."
        : "Sign in to continue your story.";
    }

    if (submit) {
      submit.textContent = isSignup ? "Create account" : "Log in";
    }

    if (name) name.hidden = !isSignup;
    if (nameLabel) nameLabel.hidden = !isSignup;
    if (confirm) confirm.hidden = !isSignup;
    if (confirmLabel) confirmLabel.hidden = !isSignup;
    if (forgot) forgot.hidden = isSignup;

    if (name) name.required = isSignup;
    if (confirm) confirm.required = isSignup;

    setMessage($("#authMessage"), "");
  }

  async function createAccount(name, email, password) {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(credential.user, {
      displayName: name
    });

    try {
      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        displayName: name,
        email: credential.user.email,
        bio: "",
        photoURL: "",
        visibility: "private",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Profile document creation failed:", error);
      toast(
        "Your account was created, but the profile could not be saved. Check Firestore Security Rules.",
        "error"
      );
    }

    return credential.user;
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (state.busy) return;

    const email = ($("#authEmail")?.value || "").trim();
    const password = $("#authPassword")?.value || "";
    const name = ($("#authName")?.value || "").trim();
    const confirm = $("#authConfirmPassword")?.value || "";
    const message = $("#authMessage");
    const button = $("#authSubmit");

    setMessage(message, "");

    if (!email || !password) {
      setMessage(message, "Enter your email and password.");
      return;
    }

    if (state.authMode === "signup") {
      if (name.length < 2) {
        setMessage(message, "Your name must contain at least 2 characters.");
        return;
      }

      if (password.length < 6) {
        setMessage(message, "Your password must contain at least 6 characters.");
        return;
      }

      if (password !== confirm) {
        setMessage(message, "The passwords do not match.");
        return;
      }
    }

    state.busy = true;

    if (button) {
      button.disabled = true;
      button.textContent = "Please wait...";
    }

    try {
      if (state.authMode === "signup") {
        await createAccount(name, email, password);
        toast("Account created successfully!", "success");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast("Welcome back!", "success");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setMessage(message, friendlyError(error));
    } finally {
      state.busy = false;

      if (button) {
        button.disabled = false;
        button.textContent =
          state.authMode === "signup" ? "Create account" : "Log in";
      }
    }
  }

  async function resetPassword() {
    const email = ($("#authEmail")?.value || "").trim();

    if (!email) {
      setMessage($("#authMessage"), "Enter your email address first.");
      $("#authEmail")?.focus();
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        $("#authMessage"),
        "If an account exists for this address, a password reset email will be sent.",
        "success"
      );
    } catch (error) {
      console.error("Password reset error:", error);
      setMessage($("#authMessage"), friendlyError(error));
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      toast("You have logged out.", "success");
    } catch (error) {
      console.error("Logout error:", error);
      toast(friendlyError(error), "error");
    }
  }

  function renderProfilePreview() {
    const user = state.user;
    if (!user) return;

    const name = $("#profileName");
    const displayName = $("#profileDisplayName");
    const avatar = $("#profileAvatar");
    const bio = $("#profileBio");
    const bioPreview = $("#profileBioPreview");

    const shownName = name?.value?.trim() || user.displayName || "Your name";

    if (displayName) displayName.textContent = shownName;
    if (bioPreview) bioPreview.textContent = bio?.value?.trim() || "";

    if (avatar) {
      avatar.textContent = shownName.charAt(0).toUpperCase();
    }
  }

  function setupNavigation() {
    $$("[data-page]").forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        showPage(link.dataset.page);
      });
    });

    $("#authForm")?.addEventListener("submit", handleAuthSubmit);

    $("#forgotPasswordButton")?.addEventListener(
      "click",
      resetPassword
    );

    $("#logoutButton")?.addEventListener("click", logout);
    $("#menuLogoutButton")?.addEventListener("click", logout);

    $("#moreButton")?.addEventListener("click", () => {
      const menu = $("#moreMenu");
      if (menu) menu.hidden = !menu.hidden;
    });

    $("#menuButton")?.addEventListener("click", () => {
      $("#sidebar")?.classList.toggle("open");
      $("#sidebarBackdrop")?.classList.toggle("show");
    });

    $("#sidebarBackdrop")?.addEventListener("click", () => {
      $("#sidebar")?.classList.remove("open");
      $("#sidebarBackdrop")?.classList.remove("show");
    });

    $("#profileName")?.addEventListener("input", renderProfilePreview);
    $("#profileBio")?.addEventListener("input", renderProfilePreview);

    $("#profileForm")?.addEventListener("submit", event => {
      event.preventDefault();
      toast(
        "Profile editing is not connected to Firestore yet.",
        "error"
      );
    });
  }

  function setupFeelings() {
    $$("#feelingChoices [data-feeling]").forEach(button => {
      button.addEventListener("click", () => {
        $$("#feelingChoices [data-feeling]").forEach(item => {
          item.classList.remove("selected");
          item.setAttribute("aria-pressed", "false");
        });

        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");

        const selected = $("#selectedFeeling");
        if (selected) selected.value = button.dataset.feeling;
      });
    });

    $("#feelingForm")?.addEventListener("submit", event => {
      event.preventDefault();

      toast(
        "Feeling selected. Saving feelings to Firestore will be enabled in the next integration step.",
        "error"
      );
    });
  }

  function setupContentForms() {
    $("#postForm")?.addEventListener("submit", event => {
      event.preventDefault();
      toast("Feed publishing is not connected yet.", "error");
    });

    $("#storyForm")?.addEventListener("submit", event => {
      event.preventDefault();

      const file = $("#storyMedia")?.files?.[0];

      if (file && file.size > 10 * 1024 * 1024) {
        setMessage($("#storyMessage"), "Choose a file smaller than 10 MB.");
        return;
      }

      toast("Story publishing and media uploads are not connected yet.", "error");
    });

    $("#letterForm")?.addEventListener("submit", event => {
      event.preventDefault();
      toast("Letter saving and recipient approval are not connected yet.", "error");
    });

    $("#messageForm")?.addEventListener("submit", event => {
      event.preventDefault();
      toast("Private messaging is not connected yet.", "error");
    });

    $("#userSearchForm")?.addEventListener("submit", event => {
      event.preventDefault();
      toast("User search and friend requests are not connected yet.", "error");
    });

    $("#markNotificationsRead")?.addEventListener("click", () => {
      toast("Notifications are not connected to Firestore yet.", "error");
    });

    $("#deleteAccountButton")?.addEventListener("click", () => {
      toast(
        "Account deletion needs a secure deletion workflow before it can be enabled.",
        "error"
      );
    });
  }

  function setupLetterTemplates() {
    const templateSelect = $("#letterTemplate");
    const titleField = $("#letterTitle");
    const bodyField = $("#letterBody");

    if (!templateSelect) return;

    const templates = {
      love: {
        title: "A message from my heart",
        body: "There is something I have wanted to tell you..."
      },
      confession: {
        title: "Something I want you to know",
        body: "I want to be honest about how I feel..."
      },
      apology: {
        title: "I'm sorry",
        body: "I have been thinking about what happened..."
      },
      gratitude: {
        title: "Thank you",
        body: "I want you to know how much I appreciate you..."
      },
      friendship: {
        title: "To a special friend",
        body: "Our friendship means a lot to me..."
      },
      missing: {
        title: "I miss you",
        body: "There are moments when I wish you were here..."
      },
      birthday: {
        title: "A birthday message",
        body: "Wishing you a day filled with happiness..."
      },
      encouragement: {
        title: "You can do this",
        body: "I hope you remember how strong and capable you are..."
      },
      closure: {
        title: "Words I need to say",
        body: "I have been reflecting on everything..."
      },
      unsent: {
        title: "An unsent letter",
        body: "These are words I have kept to myself..."
      },
      future: {
        title: "A letter to the future",
        body: "When you read this, I hope..."
      },
      custom: {
        title: "",
        body: ""
      }
    };

    templateSelect.addEventListener("change", () => {
      const template = templates[templateSelect.value];
      if (!template) return;

      if (titleField) titleField.value = template.title;
      if (bodyField) bodyField.value = template.body;
    });
  }

  function setupVisibilityMenu() {
    $("#profileVisibility")?.addEventListener("change", () => {
      const preview = $("#profileVisibilityPreview");
      if (preview) {
        const value = $("#profileVisibility").value;
        preview.textContent =
          value.charAt(0).toUpperCase() + value.slice(1);
      }
    });
  }

  function startAuthListener() {
    onAuthStateChanged(auth, user => {
      state.user = user;
      showAuthenticatedUI(user);

      if (user) {
        showPage("home");
      } else {
        showPage("auth");
      }
    });
  }

  function init() {
    setupNavigation();
    setupFeelings();
    setupContentForms();
    setupLetterTemplates();
    setupVisibilityMenu();
    setAuthMode("login");
    startAuthListener();

    console.info("Express Your Story initialized.");
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
