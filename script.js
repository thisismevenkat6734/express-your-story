/* =========================================================
   EXPRESS YOUR STORY
   File: script.js
   Compatible with index.html and style.css
   ========================================================= */

const App = (() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const state = {
    currentPage: "home",
    authMode: "login",
    selectedFeeling: "",
    selectedTemplate: "custom",
    currentConversation: null,
    notifications: [],
    posts: [],
    feelings: [],
    stories: [],
    letters: [],
    searchResults: [],
    friends: [],
    friendRequests: [],
    conversations: [],
    profile: {
      displayName: "",
      bio: "",
      visibility: "private",
      photoUrl: ""
    },
    firebaseReady: false,
    currentUser: null
  };

  const pageTitles = {
    home: "A place to be yourself.",
    auth: "Your story starts here.",
    feelings: "Make room for your feelings.",
    stories: "Little moments, lasting memories.",
    letters: "Letters from the heart.",
    messages: "A conversation with care.",
    friends: "Your people.",
    profile: "Your story, your identity.",
    notifications: "Stay in the loop.",
    terms: "Clear expectations.",
    privacy: "Your information matters."
  };

  const templateText = {
    love: "I wanted to tell you something that comes from my heart...",
    confession: "There is something I have wanted to tell you...",
    apology: "I have been thinking about what happened, and I want to say...",
    gratitude: "I want you to know how grateful I am for...",
    friendship: "Our friendship means more to me than words can explain...",
    missing: "There are moments when I wish you were here...",
    birthday: "Today is a special day because the world was given someone like you...",
    encouragement: "I want you to remember how strong and capable you are...",
    closure: "There are a few things I need to express so I can move forward...",
    unsent: "These are words I need to write, even if I never send them...",
    future: "Dear future me, I hope you remember...",
    custom: ""
  };

  const safeText = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  const initials = (name) => {
    const value = String(name || "Y").trim();
    return value ? Array.from(value)[0].toUpperCase() : "Y";
  };

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.hidden = false;

    if (state.toastTimeout) {
      clearTimeout(state.toastTimeout);
    }

    state.toastTimeout = setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function setFormMessage(id, message, type = "") {
    const element = document.getElementById(id);
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error-message", type === "error");
    element.classList.toggle("success-message", type === "success");
  }

  function requireFirebase(message) {
    showToast(
      message ||
      "Firebase is not connected yet. This action needs backend integration."
    );
  }

  // ---------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------

  function navigate(page) {
    if (!Object.prototype.hasOwnProperty.call(pageTitles, page)) {
      return;
    }

    state.currentPage = page;

    $$(".page").forEach((section) => {
      section.hidden = section.id !== page;
    });

    $$(".nav-link[data-page]").forEach((button) => {
      const active = button.dataset.page === page;
      button.classList.toggle("active", active);

      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    const heading = $("#pageHeading");
    if (heading) heading.textContent = pageTitles[page];

    document.body.classList.remove("sidebar-open");

    const menuButton = $("#menuButton");
    if (menuButton) menuButton.setAttribute("aria-expanded", "false");

    const backdrop = $("#sidebarBackdrop");
    if (backdrop) backdrop.hidden = true;

    const moreMenu = $("#moreMenu");
    if (moreMenu) moreMenu.hidden = true;

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setupNavigation() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button) return;

      event.preventDefault();
      navigate(button.dataset.page);
    });

    const menuButton = $("#menuButton");
    const backdrop = $("#sidebarBackdrop");

    function closeSidebar() {
      document.body.classList.remove("sidebar-open");
      if (menuButton) menuButton.setAttribute("aria-expanded", "false");
      if (backdrop) backdrop.hidden = true;
    }

    menuButton?.addEventListener("click", () => {
      const open = !document.body.classList.contains("sidebar-open");

      document.body.classList.toggle("sidebar-open", open);
      menuButton.setAttribute("aria-expanded", String(open));

      if (backdrop) backdrop.hidden = !open;
    });

    backdrop?.addEventListener("click", closeSidebar);

    const moreButton = $("#moreButton");
    const moreMenu = $("#moreMenu");

    moreButton?.addEventListener("click", (event) => {
      event.stopPropagation();

      if (!moreMenu) return;

      moreMenu.hidden = !moreMenu.hidden;
      moreButton.setAttribute("aria-expanded", String(!moreMenu.hidden));
    });

    document.addEventListener("click", (event) => {
      if (
        moreMenu &&
        !moreMenu.hidden &&
        !event.target.closest("#moreMenu") &&
        !event.target.closest("#moreButton")
      ) {
        moreMenu.hidden = true;
        moreButton?.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSidebar();

        if (moreMenu) moreMenu.hidden = true;
        moreButton?.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ---------------------------------------------------------
  // Authentication interface
  // ---------------------------------------------------------

  function setAuthMode(mode) {
    state.authMode = mode === "signup" ? "signup" : "login";

    const signup = state.authMode === "signup";
    const title = $("#authTitle");
    const description = $("#authDescription");
    const submit = $("#authSubmit");
    const nameInput = $("#authName");
    const nameLabel = $("#authNameLabel");
    const confirmInput = $("#authConfirmPassword");
    const confirmLabel = $("#confirmPasswordLabel");
    const forgotButton = $("#forgotPasswordButton");
    const passwordInput = $("#authPassword");

    $$(".auth-tab").forEach((tab) => {
      const active = tab.dataset.authMode === state.authMode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });

    if (title) {
      title.textContent = signup ? "Create your account" : "Welcome back";
    }

    if (description) {
      description.textContent = signup
        ? "Start expressing your story."
        : "Continue your story.";
    }

    if (submit) submit.textContent = signup ? "Create account" : "Log in";

    if (nameInput) {
      nameInput.hidden = !signup;
      nameInput.required = signup;
    }

    if (nameLabel) nameLabel.hidden = !signup;

    if (confirmInput) {
      confirmInput.hidden = !signup;
      confirmInput.required = signup;
    }

    if (confirmLabel) confirmLabel.hidden = !signup;
    if (forgotButton) forgotButton.hidden = signup;

    if (passwordInput) {
      passwordInput.autocomplete = signup
        ? "new-password"
        : "current-password";
    }

    setFormMessage("authMessage", "");
  }

  function setupAuthentication() {
    $$("[data-auth-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        setAuthMode(button.dataset.authMode);
      });
    });

    $("#authForm")?.addEventListener("submit", (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      if (!form.reportValidity()) return;

      const name = $("#authName")?.value.trim() || "";
      const email = $("#authEmail")?.value.trim() || "";
      const password = $("#authPassword")?.value || "";
      const confirmation = $("#authConfirmPassword")?.value || "";

      if (state.authMode === "signup" && !name) {
        setFormMessage("authMessage", "Please enter your name.", "error");
        return;
      }

      if (password.length < 8) {
        setFormMessage(
          "authMessage",
          "Use a password with at least 8 characters.",
          "error"
        );
        return;
      }

      if (state.authMode === "signup" && password !== confirmation) {
        setFormMessage(
          "authMessage",
          "The passwords do not match.",
          "error"
        );
        return;
      }

      if (!email) {
        setFormMessage(
          "authMessage",
          "Please enter your email address.",
          "error"
        );
        return;
      }

      requireFirebase(
        "The form is validated, but account creation and login require Firebase Authentication."
      );
    });

    $("#forgotPasswordButton")?.addEventListener("click", () => {
      const email = $("#authEmail")?.value.trim();

      if (!email) {
        setFormMessage(
          "authMessage",
          "Enter your email address first.",
          "error"
        );
        $("#authEmail")?.focus();
        return;
      }

      requireFirebase(
        "Password reset requires Firebase Authentication integration."
      );
    });

    $("#logoutButton")?.addEventListener("click", logout);
    $("#menuLogoutButton")?.addEventListener("click", logout);
  }

  function logout() {
    requireFirebase(
      "Secure logout will be enabled when Firebase Authentication is connected."
    );
  }

  // ---------------------------------------------------------
  // Profile preview
  // ---------------------------------------------------------

  function updateProfilePreview() {
    const name = $("#profileName")?.value.trim() || "Your name";
    const bio = $("#profileBio")?.value.trim() ||
      "Your story begins with you.";
    const visibility = $("#profileVisibility")?.value || "private";

    const displayName = $("#profileDisplayName");
    const bioPreview = $("#profileBioPreview");
    const visibilityPreview = $("#profileVisibilityPreview");

    if (displayName) displayName.textContent = name;
    if (bioPreview) bioPreview.textContent = bio;

    if (visibilityPreview) {
      const labels = {
        private: "Private profile",
        friends: "Friends-only profile",
        public: "Public profile"
      };

      visibilityPreview.textContent = labels[visibility] || labels.private;
    }

    const avatar = initials(name);

    ["profileAvatar", "topAvatar", "composerAvatar"].forEach((id) => {
      const element = document.getElementById(id);
      if (element && !element.querySelector("img")) {
        element.textContent = avatar;
      }
    });
  }

  function setupProfile() {
    $("#profileName")?.addEventListener("input", updateProfilePreview);
    $("#profileBio")?.addEventListener("input", updateProfilePreview);
    $("#profileVisibility")?.addEventListener("change", updateProfilePreview);

    $("#profilePhoto")?.addEventListener("change", () => {
      const input = $("#profilePhoto");
      const file = input?.files?.[0];

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showToast("Please choose an image file.");
        input.value = "";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showToast("Choose an image smaller than 5 MB.");
        input.value = "";
        return;
      }

      showToast(
        "Image selected. Secure storage upload will be enabled in the backend integration."
      );
    });

    $("#profileForm")?.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!event.currentTarget.reportValidity()) return;

      updateProfilePreview();

      requireFirebase(
        "Your profile preview is updated. Permanent profile saving requires Firestore integration."
      );
    });

    $("#deleteAccountButton")?.addEventListener("click", () => {
      const confirmed = window.confirm(
        "Account deletion is a permanent action. Continue to the deletion request?"
      );

      if (!confirmed) return;

      setFormMessage(
        "accountMessage",
        "No account has been deleted. A secure deletion workflow must be connected first.",
        "error"
      );
    });

    updateProfilePreview();
  }

  // ---------------------------------------------------------
  // Feelings
  // ---------------------------------------------------------

  function setupFeelings() {
    const choices = $$("#feelingChoices [data-feeling]");
    const hiddenInput = $("#selectedFeeling");

    choices.forEach((button) => {
      button.setAttribute("aria-pressed", "false");

      button.addEventListener("click", () => {
        state.selectedFeeling = button.dataset.feeling || "";

        if (hiddenInput) hiddenInput.value = state.selectedFeeling;

        choices.forEach((choice) => {
          const selected =
            choice.dataset.feeling === state.selectedFeeling;

          choice.classList.toggle("selected", selected);
          choice.setAttribute("aria-pressed", String(selected));
        });
      });
    });

    $("#feelingForm")?.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!state.selectedFeeling) {
        setFormMessage(
          "feelingMessage",
          "Please choose a feeling first.",
          "error"
        );
        return;
      }

      requireFirebase(
        "Your feeling is selected. Saving and audience permissions require Firestore integration."
      );
    });
  }

  // ---------------------------------------------------------
  // Stories
  // ---------------------------------------------------------

  function setupStories() {
    $("#storyForm")?.addEventListener("submit", (event) => {
      event.preventDefault();

      const form = event.currentTarget;
      if (!form.reportValidity()) return;

      const file = $("#storyMedia")?.files?.[0];

      if (file && file.size > 50 * 1024 * 1024) {
        setFormMessage(
          "storyMessage",
          "The selected file exceeds the current 50 MB interface limit.",
          "error"
        );
        return;
      }

      if (
        file &&
        !["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]
          .includes(file.type)
      ) {
        setFormMessage(
          "storyMessage",
          "Choose a supported image or video format.",
          "error"
        );
        return;
      }

      requireFirebase(
        "Publishing stories requires secure media upload, database permissions and automatic 24-hour expiration."
      );
    });
  }

  // ---------------------------------------------------------
  // Love letter templates
  // ---------------------------------------------------------

  function selectTemplate(template) {
    if (!Object.prototype.hasOwnProperty.call(templateText, template)) {
      template = "custom";
    }

    state.selectedTemplate = template;

    const select = $("#letterTemplate");
    const body = $("#letterBody");

    if (select) select.value = template;

    $$(".template-card").forEach((button) => {
      const active = button.dataset.template === template;

      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (body && templateText[template]) {
      body.value = templateText[template];
    }

    $("#letterTitle")?.focus({ preventScroll: true });
  }

  function setupLetters() {
    $$(".template-card[data-template]").forEach((button) => {
      button.addEventListener("click", () => {
        selectTemplate(button.dataset.template);
      });
    });

    $("#letterTemplate")?.addEventListener("change", (event) => {
      state.selectedTemplate = event.target.value;

      const suggested = templateText[state.selectedTemplate];

      if (suggested && $("#letterBody")?.value.trim() === "") {
        $("#letterBody").value = suggested;
      }

      $$(".template-card").forEach((button) => {
        const active =
          button.dataset.template === state.selectedTemplate;

        button.classList.toggle("selected", active);
        button.setAttribute("aria-pressed", String(active));
      });
    });

    $("#letterForm")?.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!event.currentTarget.reportValidity()) return;

      const visibility = $("#letterVisibility")?.value;

      if (visibility === "recipient" && !$("#letterRecipient")?.value.trim()) {
        setFormMessage(
          "letterMessage",
          "Enter the recipient's email or save the letter as a private draft.",
          "error"
        );
        return;
      }

      requireFirebase(
        "Saving private letters and sending collaborative letters require authenticated backend permissions."
      );
    });
  }

  // ---------------------------------------------------------
  // Posts and feed
  // ---------------------------------------------------------

  function setupPosts() {
    $("#postForm")?.addEventListener("submit", (event) => {
      event.preventDefault();

      const text = $("#postText")?.value.trim() || "";

      if (!text) {
        setFormMessage(
          "postMessage",
          "Write something before publishing.",
          "error"
        );
        return;
      }

      requireFirebase(
        "Publishing posts requires an authenticated account and Firestore security rules."
      );
    });
  }

  // ---------------------------------------------------------
  // Friends and search
  // ---------------------------------------------------------

  function setupFriends() {
    $("#userSearchForm")?.addEventListener("submit", (event) => {
      event.preventDefault();

      const query = $("#userSearch")?.value.trim() || "";

      if (!query) return;

      requireFirebase(
        "Searching profiles requires a backend query that respects each user's visibility settings."
      );
    });

    $("#searchResults")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-friend-action]");
      if (!button) return;

      const action = button.dataset.friendAction;

      if (action === "request") {
        requireFirebase("Friend requests require authenticated backend integration.");
      } else if (action === "accept") {
        requireFirebase("Accepting friend requests requires server-side authorization.");
      } else if (action === "reject") {
        requireFirebase("Rejecting friend requests requires backend integration.");
      } else if (action === "block") {
        const confirmed = window.confirm("Block this user?");

        if (confirmed) {
          requireFirebase("Blocking must be enforced by the backend.");
        }
      } else if (action === "report") {
        requireFirebase("Reporting requires a secure moderation workflow.");
      }
    });

    $("#friendRequests")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-friend-action]");
      if (!button) return;

      if (button.dataset.friendAction === "accept") {
        requireFirebase("Accepting requests requires backend authorization.");
      } else if (button.dataset.friendAction === "reject") {
        requireFirebase("Rejecting requests requires backend integration.");
      }
    });

    $("#friendsList")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-friend-action]");
      if (!button) return;

      if (button.dataset.friendAction === "message") {
        requireFirebase("Messaging is available only after an accepted connection.");
      } else if (button.dataset.friendAction === "block") {
        const confirmed = window.confirm("Block this user?");

        if (confirmed) {
          requireFirebase("Blocking must be enforced by the backend.");
        }
      } else if (button.dataset.friendAction === "report") {
        requireFirebase("Reporting requires a secure moderation workflow.");
      }
    });
  }

  // ---------------------------------------------------------
  // Messages
  // ---------------------------------------------------------

  function setupMessages() {
    $("#messageForm")?.addEventListener("submit", (event) => {
      event.preventDefault();

      const input = $("#messageText");
      const text = input?.value.trim() || "";

      if (!text) return;

      if (!state.currentConversation) {
        setFormMessage(
          "messageStatus",
          "Select an accepted conversation first.",
          "error"
        );
        return;
      }

      requireFirebase(
        "Sending messages requires an accepted connection and server-enforced conversation permissions."
      );
    });
  }

  // ---------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------

  function setupNotifications() {
    $("#markNotificationsRead")?.addEventListener("click", () => {
      requireFirebase(
        "Marking notifications as read requires the user's authenticated notification records."
      );
    });
  }

  // ---------------------------------------------------------
  // Security and accessibility
  // ---------------------------------------------------------

  function setupGlobalSafety() {
    document.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) return;

      const action = actionButton.dataset.action;

      if (action === "report") {
        requireFirebase("Reports must be submitted to the secure moderation backend.");
      } else if (action === "block") {
        const confirmed = window.confirm("Do you want to block this user?");

        if (confirmed) {
          requireFirebase("Blocking requires server-side enforcement.");
        }
      } else if (action === "delete") {
        const confirmed = window.confirm("Are you sure you want to delete this item?");

        if (confirmed) {
          requireFirebase("Deletion requires authentication and ownership checks.");
        }
      } else if (action === "message") {
        requireFirebase("Private messages require an accepted connection.");
      }
    });

    document.addEventListener("error", (event) => {
      if (event.target instanceof HTMLImageElement) {
        event.target.hidden = true;
      }
    }, true);
  }

  // ---------------------------------------------------------
  // Startup
  // ---------------------------------------------------------

  function init() {
    setupNavigation();
    setupAuthentication();
    setupProfile();
    setupFeelings();
    setupStories();
    setupLetters();
    setupPosts();
    setupFriends();
    setupMessages();
    setupNotifications();
    setupGlobalSafety();

    setAuthMode("login");
    navigate("home");

    console.info(
      "Express Your Story interface initialized. Firebase is not connected yet."
    );
  }

  return {
    init,
    navigate,
    setAuthMode,
    selectTemplate,
    updateProfilePreview,
    showToast
  };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", App.init, { once: true });
} else {
  App.init();
}
