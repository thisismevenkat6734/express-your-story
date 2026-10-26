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
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
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
    busy: false,
    stopPublicPosts: null,
    stopOwnPosts: null,
    publicPosts: [],
    ownPosts: []
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
    privacy: "Privacy Policy",
    auth: "Welcome"
  };

  function toast(message, type = "info") {
    const element = $("#toast");

    if (!element) {
      console.log(message);
      return;
    }

    element.textContent = message;
    element.dataset.type = type;
    element.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      element.classList.remove("show");
    }, 3500);
  }

  function setMessage(element, message, type = "error") {
    if (!element) return;

    element.textContent = message;
    element.dataset.type = type;
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
        "Use a password with at least 6 characters.",
      "auth/too-many-requests":
        "Too many attempts. Please try again later.",
      "auth/network-request-failed":
        "Network error. Check your internet connection.",
      "auth/operation-not-allowed":
        "Enable Email/Password sign-in in Firebase Authentication.",
      "auth/unauthorized-domain":
        "Add this website domain to Firebase authorized domains.",
      "permission-denied":
        "Firestore denied this action. Check your Firestore Rules."
    };

    return errors[error?.code] ||
      "Something went wrong. Please try again.";
  }

  function showPage(pageName) {
    if (!state.user && pageName !== "auth") {
      pageName = "auth";
    }

    const target = $(`#${CSS.escape(pageName)}`);

    if (!target) {
      toast("This page is not available.");
      return;
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
      heading.textContent =
        pageTitles[pageName] || "Express Your Story";
    }

    $("#sidebar")?.classList.remove("open");
    $("#sidebarBackdrop")?.classList.remove("show");

    state.currentPage = pageName;
  }

  function setAuthMode(mode) {
    state.authMode = mode === "signup" ? "signup" : "login";

    const signup = state.authMode === "signup";

    if ($("#authTitle")) {
      $("#authTitle").textContent =
        signup ? "Create your account" : "Welcome back";
    }

    if ($("#authDescription")) {
      $("#authDescription").textContent = signup
        ? "Create a safe space to express your story."
        : "Sign in to continue your story.";
    }

    if ($("#authSubmit")) {
      $("#authSubmit").textContent =
        signup ? "Create account" : "Log in";
    }

    if ($("#authName")) {
      $("#authName").hidden = !signup;
      $("#authName").required = signup;
    }

    if ($("#authNameLabel")) {
      $("#authNameLabel").hidden = !signup;
    }

    if ($("#authConfirmPassword")) {
      $("#authConfirmPassword").hidden = !signup;
      $("#authConfirmPassword").required = signup;
    }

    if ($("#confirmPasswordLabel")) {
      $("#confirmPasswordLabel").hidden = !signup;
    }

    if ($("#forgotPasswordButton")) {
      $("#forgotPasswordButton").hidden = signup;
    }

    setMessage($("#authMessage"), "");
  }

  function updateUserUI(user) {
    if ($("#sidebar")) {
      $("#sidebar").hidden = !user;
    }

    const avatar = $("#topAvatar");

    if (avatar) {
      avatar.textContent = (
        user?.displayName || user?.email || "U"
      ).trim().charAt(0).toUpperCase();
    }

    if (user && $("#profileName")) {
      $("#profileName").value = user.displayName || "";
    }

    if (user && $("#profileDisplayName")) {
      $("#profileDisplayName").textContent =
        user.displayName || "Your profile";
    }

    if ($("#authEmail")) $("#authEmail").value = "";
    if ($("#authPassword")) $("#authPassword").value = "";
    if ($("#authConfirmPassword")) {
      $("#authConfirmPassword").value = "";
    }
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
      console.error("Profile save error:", error);
      toast(
        "Account created, but profile saving failed. Check Firestore Rules.",
        "error"
      );
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (state.busy) return;

    const email = ($("#authEmail")?.value || "").trim();
    const password = $("#authPassword")?.value || "";
    const name = ($("#authName")?.value || "").trim();
    const confirm = $("#authConfirmPassword")?.value || "";

    const button = $("#authSubmit");
    const message = $("#authMessage");

    setMessage(message, "");

    if (!email || !password) {
      setMessage(message, "Enter your email and password.");
      return;
    }

    if (state.authMode === "signup") {
      if (name.length < 2 || name.length > 60) {
        setMessage(message, "Name must contain 2 to 60 characters.");
        return;
      }

      if (password.length < 6) {
        setMessage(message, "Password must contain at least 6 characters.");
        return;
      }

      if (password !== confirm) {
        setMessage(message, "Passwords do not match.");
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
        "If an account exists for this email, a reset email will be sent.",
        "success"
      );
    } catch (error) {
      setMessage($("#authMessage"), friendlyError(error));
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      toast("Logged out successfully.", "success");
    } catch (error) {
      toast(friendlyError(error), "error");
    }
  }

  function formatDate(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== "function") {
      return "Just now";
    }

    return timestamp.toDate().toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function createPostCard(post) {
    const article = document.createElement("article");
    article.className = "card post-card";

    const header = document.createElement("div");
    header.className = "post-header";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent =
      (post.authorName || "U").charAt(0).toUpperCase();

    const authorDetails = document.createElement("div");

    const author = document.createElement("strong");
    author.textContent = post.authorName || "User";

    const date = document.createElement("small");
    date.textContent = formatDate(post.createdAt);

    authorDetails.append(author, date);
    header.append(avatar, authorDetails);

    const content = document.createElement("p");
    content.className = "post-content";
    content.textContent = post.text || "";

    article.append(header, content);

    if (post.authorId === state.user?.uid) {
      const badge = document.createElement("small");
      badge.className = "post-owner-label";
      badge.textContent = "Your post";
      article.append(badge);
    }

    return article;
  }

  function renderFeed() {
    const feed = $("#feedList");
    if (!feed) return;

    feed.replaceChildren();

    const allPosts = [
      ...state.publicPosts,
      ...state.ownPosts
    ];

    const uniquePosts = [
      ...new Map(allPosts.map(post => [post.id, post])).values()
    ];

    uniquePosts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    if (uniquePosts.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent =
        "No posts yet. Share your first story with the community.";
      feed.append(empty);
      return;
    }

    uniquePosts.forEach(post => {
      feed.append(createPostCard(post));
    });
  }

  function stopPostListeners() {
    state.stopPublicPosts?.();
    state.stopOwnPosts?.();

    state.stopPublicPosts = null;
    state.stopOwnPosts = null;
    state.publicPosts = [];
    state.ownPosts = [];
  }

  function startPostListeners(user) {
    stopPostListeners();

    if (!user) {
      renderFeed();
      return;
    }

    const posts = collection(db, "posts");

    const publicQuery = query(
      posts,
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const ownQuery = query(
      posts,
      where("authorId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    state.stopPublicPosts = onSnapshot(
      publicQuery,
      snapshot => {
        state.publicPosts = snapshot.docs.map(item => ({
          id: item.id,
          ...item.data()
        }));

        renderFeed();
      },
      error => {
        console.error("Public feed error:", error);
        toast("Could not load public posts. Check Firestore Rules and indexes.", "error");
      }
    );

    state.stopOwnPosts = onSnapshot(
      ownQuery,
      snapshot => {
        state.ownPosts = snapshot.docs.map(item => ({
          id: item.id,
          ...item.data()
        }));

        renderFeed();
      },
      error => {
        console.error("Your posts error:", error);
        toast("Could not load your posts. Check Firestore Rules and indexes.", "error");
      }
    );
  }

  async function publishPost(event) {
    event.preventDefault();

    if (!state.user) {
      toast("Please log in before publishing a post.", "error");
      return;
    }

    const text = ($("#postText")?.value || "").trim();
    const message = $("#postMessage");
    const button = $("#postForm button[type='submit']");

    setMessage(message, "");

    if (!text) {
      setMessage(message, "Write something before publishing.");
      return;
    }

    if (text.length > 2000) {
      setMessage(message, "Posts cannot exceed 2000 characters.");
      return;
    }

    const authorName =
      state.user.displayName?.trim() ||
      state.user.email?.split("@")[0] ||
      "User";

    if (authorName.length < 2 || authorName.length > 60) {
      setMessage(message, "Your profile name must contain 2 to 60 characters.");
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Publishing...";
    }

    try {
      await addDoc(collection(db, "posts"), {
        authorId: state.user.uid,
        authorName,
        text,
        visibility: "public",
        createdAt: serverTimestamp()
      });

      $("#postText").value = "";
      toast("Your post has been published!", "success");
    } catch (error) {
      console.error("Publish post error:", error);
      setMessage(message, friendlyError(error));
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Publish";
      }
    }
  }

  function renderProfilePreview() {
    const user = state.user;
    if (!user) return;

    const name = $("#profileName");
    const bio = $("#profileBio");
    const shownName = name?.value?.trim() || user.displayName || "Your name";

    if ($("#profileDisplayName")) {
      $("#profileDisplayName").textContent = shownName;
    }

    if ($("#profileBioPreview")) {
      $("#profileBioPreview").textContent = bio?.value?.trim() || "";
    }

    if ($("#profileAvatar")) {
      $("#profileAvatar").textContent =
        shownName.charAt(0).toUpperCase();
    }
  }

  function setupNavigation() {
    $$("[data-page]").forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        showPage(link.dataset.page);
      });
    });

    $$("[data-auth-mode]").forEach(button => {
      button.addEventListener("click", () => {
        setAuthMode(button.dataset.authMode);
      });
    });

    $("#authForm")?.addEventListener("submit", handleAuthSubmit);
    $("#forgotPasswordButton")?.addEventListener("click", resetPassword);

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
      toast("Profile editing is not connected yet.", "error");
    });
  }

  function setupContentForms() {
    $("#postForm")?.addEventListener("submit", publishPost);

    $("#feelingForm")?.addEventListener("submit", event => {
      event.preventDefault();
      toast("Feelings saving will be added next.", "info");
    });

    $("#storyForm")?.addEventListener("submit", event => {
      event.preventDefault();
      toast("Story publishing will be added next.", "info");
    });

    $("#letterForm")?.addEventListener("submit", event => {
      event.preventDefault();
      toast("Letter saving will be added next.", "info");
    });

    $("#messageForm")?.addEventListener("submit", event => {
      event.preventDefault();
      toast("Private messaging will be added next.", "info");
    });

    $("#userSearchForm")?.addEventListener("submit", event => {
      event.preventDefault();
      toast("User search will be added next.", "info");
    });

    $("#markNotificationsRead")?.addEventListener("click", () => {
      toast("Notifications will be added next.", "info");
    });

    $("#deleteAccountButton")?.addEventListener("click", () => {
      toast("Secure account deletion is not implemented yet.", "info");
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

        if ($("#selectedFeeling")) {
          $("#selectedFeeling").value = button.dataset.feeling;
        }
      });
    });
  }

  function setupLetterTemplates() {
    const select = $("#letterTemplate");
    if (!select) return;

    const templates = {
      love: ["A message from my heart", "There is something I have wanted to tell you..."],
      confession: ["Something I want you to know", "I want to be honest about how I feel..."],
      apology: ["I'm sorry", "I have been thinking about what happened..."],
      gratitude: ["Thank you", "I want you to know how much I appreciate you..."],
      friendship: ["To a special friend", "Our friendship means a lot to me..."],
      missing: ["I miss you", "There are moments when I wish you were here..."],
      birthday: ["A birthday message", "Wishing you a day filled with happiness..."],
      encouragement: ["You can do this", "I hope you remember how strong and capable you are..."],
      closure: ["Words I need to say", "I have been reflecting on everything..."],
      unsent: ["An unsent letter", "These are words I have kept to myself..."],
      future: ["A letter to the future", "When you read this, I hope..."],
      custom: ["", ""]
    };

    select.addEventListener("change", () => {
      const template = templates[select.value];
      if (!template) return;

      if ($("#letterTitle")) $("#letterTitle").value = template[0];
      if ($("#letterBody")) $("#letterBody").value = template[1];
    });
  }

  function startAuthListener() {
    onAuthStateChanged(auth, user => {
      state.user = user;
      updateUserUI(user);

      if (user) {
        showPage("home");
        startPostListeners(user);
      } else {
        stopPostListeners();
        renderFeed();
        showPage("auth");
      }
    });
  }

  function init() {
    setupNavigation();
    setupContentForms();
    setupFeelings();
    setupLetterTemplates();

    setAuthMode("login");
    startAuthListener();

    console.info("Express Your Story initialized.");
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
