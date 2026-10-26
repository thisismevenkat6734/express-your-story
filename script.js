/* =========================================================
   EXPRESS YOUR STORY
   Every Feeling Deserves a Voice.
   File: script.js

   Frontend interactions and form validation.
   Firebase, Firestore and Cloudinary publishing must be
   connected and security-tested before production use.
   ========================================================= */

"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

const state = {
  authMode: "login",
  selectedTemplate: "Romantic Love",
  currentFeeling: "",
  selectedPostFile: null,
  selectedAudioFile: null,
  selectedStoryFile: null,
  selectedProfileFile: null,
  letterPreviewDialog: null
};

const FEELINGS = [
  "Happy",
  "Sad",
  "Angry",
  "Confused",
  "Frustrated",
  "Lonely",
  "In Love",
  "Peaceful",
  "Motivated",
  "Hopeful",
  "Anxious",
  "Grateful"
];

const LETTER_TEMPLATES = {
  "Romantic Love": {
    title: "A Little Piece of My Heart",
    greeting: "Dear you,",
    body:
      "There is something beautiful about the way you make ordinary moments feel special.\n\n" +
      "Sometimes words are not enough to explain what someone means to us. " +
      "Still, I want to try, because some feelings deserve to be expressed.\n\n" +
      "You have become a beautiful thought in my day, a reason to smile, " +
      "and a reminder that little moments can mean so much.\n\n" +
      "With all my sincerity,\nSomeone who cares"
  },

  "Deep Feelings": {
    title: "What My Heart Has Been Holding",
    greeting: "Dear you,",
    body:
      "There are feelings I have carried quietly for a long time.\n\n" +
      "They are not always easy to explain, but they are real. " +
      "Some people leave a mark on our hearts simply by being themselves.\n\n" +
      "I wanted to give these thoughts a place to exist, without pretending " +
      "that every feeling can be explained perfectly.\n\n" +
      "Written honestly,\nFrom the heart"
  },

  "First Love": {
    title: "The Beginning of Something Beautiful",
    greeting: "Dear you,",
    body:
      "I do not know exactly when it began.\n\n" +
      "Maybe it was a smile, a conversation, or one ordinary moment " +
      "that stayed in my thoughts longer than I expected.\n\n" +
      "Whatever the reason, this feeling has become something special to me. " +
      "I wanted to write it down, even if I am still learning how to express it.\n\n" +
      "With a little courage,\nFrom me"
  },

  "Love Confession": {
    title: "Something I Have Wanted to Say",
    greeting: "Dear you,",
    body:
      "I have been wanting to tell you something honestly.\n\n" +
      "I have started to feel something special for you. I do not expect " +
      "you to feel the same, and I respect whatever your answer may be.\n\n" +
      "I simply wanted you to know how I feel, instead of keeping these " +
      "words inside forever.\n\n" +
      "Thank you for listening,\nFrom my heart"
  },

  "Missing You": {
    title: "You Cross My Mind",
    greeting: "Dear you,",
    body:
      "Some days, a familiar thought brings you back into my mind.\n\n" +
      "It might be a song, a place, or a small memory that suddenly " +
      "feels important again.\n\n" +
      "Distance and time can change our days, but meaningful memories " +
      "often remain close to us.\n\n" +
      "Thinking of you,\nFrom me"
  },

  "Anniversary": {
    title: "Another Chapter of Us",
    greeting: "My dear,",
    body:
      "Today gives me another reason to appreciate the moments we have shared.\n\n" +
      "Every conversation, every lesson, and every memory has helped shape " +
      "our story in its own way.\n\n" +
      "May we continue to treat each other with kindness, patience, " +
      "honesty, and care.\n\n" +
      "With love and appreciation,\nAlways"
  },

  "Long Distance": {
    title: "A Heart Beyond the Miles",
    greeting: "Dear you,",
    body:
      "The miles between places can feel large, especially when someone " +
      "matters to you.\n\n" +
      "Even so, a thoughtful message or a familiar memory can make a distant " +
      "day feel a little closer.\n\n" +
      "I hope we continue to find ways to communicate honestly and appreciate " +
      "the moments we get to share.\n\n" +
      "Until we meet again,\nWith care"
  },

  "Apology Letter": {
    title: "I Want to Make Things Right",
    greeting: "Dear you,",
    body:
      "I have been thinking about what happened and how my words or actions " +
      "may have affected you.\n\n" +
      "I am sorry for the hurt I caused. I do not want to dismiss your feelings " +
      "or make excuses for my mistakes.\n\n" +
      "I understand that rebuilding trust takes time, and I will respect " +
      "the space you need.\n\n" +
      "Sincerely,\nFrom me"
  },

  "Poetic Love": {
    title: "A Thought Written in Starlight",
    greeting: "Dear you,",
    body:
      "Some feelings arrive like the first light of morning,\n" +
      "Quietly changing the colour of an ordinary day.\n\n" +
      "Some memories become little stars,\n" +
      "Still shining when the evening turns grey.\n\n" +
      "And some people remind us,\n" +
      "That even simple moments can hold extraordinary meaning.\n\n" +
      "With gentle thoughts,\nFrom my heart"
  },

  "Vintage Love": {
    title: "A Letter Worth Keeping",
    greeting: "My dear,",
    body:
      "If these words were written on an old sheet of paper, " +
      "I would hope you could feel the care behind every line.\n\n" +
      "Some things are worth slowing down for: an honest conversation, " +
      "a thoughtful gesture, and a memory that grows more meaningful with time.\n\n" +
      "May this little letter remind you that sincerity never goes out of style.\n\n" +
      "Yours with affection,\nFrom me"
  },

  "Cute Love": {
    title: "A Tiny Letter With Big Feelings",
    greeting: "Hey you,",
    body:
      "Just a small reminder that someone is thinking of you today.\n\n" +
      "You have a way of making little things feel brighter, and that " +
      "deserves to be appreciated.\n\n" +
      "So here is a tiny letter carrying a very simple message: " +
      "you matter, and I hope today gives you a reason to smile.\n\n" +
      "Sending a little happiness,\nFrom me"
  },

  "Forever Love": {
    title: "A Promise to Keep Choosing Kindness",
    greeting: "My dear,",
    body:
      "Love is not only about beautiful words or unforgettable moments.\n\n" +
      "It is also about honesty, respect, patience, and showing up " +
      "for each other through ordinary days.\n\n" +
      "Whatever the future brings, I hope we always remember that " +
      "a meaningful bond deserves care from both hearts.\n\n" +
      "With sincere affection,\nAlways"
  }
};

/* ---------------------------------------------------------
   SAFE UI HELPERS
--------------------------------------------------------- */

function setMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.classList.remove("error", "success");

  if (type === "error" || type === "success") {
    element.classList.add(type);
  }
}

function showGlobalMessage(message, type = "") {
  const box = $("#globalMessage");
  if (!box) return;

  box.textContent = message;
  box.classList.remove("error", "success");

  if (type) box.classList.add(type);

  box.hidden = false;
}

function clearMessage(element) {
  if (!element) return;
  element.textContent = "";
  element.classList.remove("error", "success");
}

function showPage(pageName) {
  const target = document.getElementById(pageName);

  if (!target || !target.classList.contains("page")) {
    return false;
  }

  $$(".page").forEach(page => {
    const active = page === target;
    page.classList.toggle("active", active);
    page.setAttribute("aria-hidden", String(!active));
  });

  $$("[data-page]").forEach(link => {
    const active = link.dataset.page === pageName;

    if (link.classList.contains("nav-link")) {
      if (active) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }

      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  });

  closeMobileMenu();

  if (window.location.hash !== "#" + pageName) {
    history.replaceState(null, "", "#" + pageName);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  return true;
}

function navigateFromHash() {
  const pageName = decodeURIComponent(
    window.location.hash.replace(/^#/, "")
  );

  if (!pageName) {
    showPage("home");
    return;
  }

  if (!showPage(pageName)) {
    showPage("home");
  }
}

/* ---------------------------------------------------------
   NAVIGATION AND MOBILE MENU
--------------------------------------------------------- */

function closeMobileMenu() {
  const sidebar = $("#sidebar");
  const toggle = $("#menuToggle");

  if (sidebar) sidebar.classList.remove("open");

  if (toggle) {
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
  }
}

function toggleMobileMenu() {
  const sidebar = $("#sidebar");
  const toggle = $("#menuToggle");

  if (!sidebar || !toggle) return;

  const opened = sidebar.classList.toggle("open");

  toggle.setAttribute("aria-expanded", String(opened));
  toggle.setAttribute(
    "aria-label",
    opened ? "Close navigation" : "Open navigation"
  );
}

function initNavigation() {
  const toggle = $("#menuToggle");

  if (toggle) {
    toggle.addEventListener("click", toggleMobileMenu);
  }

  $$("[data-page]").forEach(link => {
    link.addEventListener("click", event => {
      const pageName = link.dataset.page;

      if (!pageName) return;

      event.preventDefault();
      showPage(pageName);
    });
  });

  window.addEventListener("hashchange", navigateFromHash);

  document.addEventListener("click", event => {
    const sidebar = $("#sidebar");
    const menuButton = $("#menuToggle");

    if (!sidebar || !menuButton) return;
    if (!sidebar.classList.contains("open")) return;

    if (
      !sidebar.contains(event.target) &&
      !menuButton.contains(event.target)
    ) {
      closeMobileMenu();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMobileMenu();
  });

  navigateFromHash();
}

/* ---------------------------------------------------------
   BACKEND STATUS

   Never claim a user is logged in or that content is saved
   until Firebase Authentication and Firestore are connected.
--------------------------------------------------------- */

function initBackendStatus() {
  const accountStatus = $("#accountStatus");
  const feed = $("#feedList");

  if (accountStatus) {
    accountStatus.textContent =
      "Authentication is not connected yet. Sign-in is unavailable until Firebase is configured.";
  }

  if (feed) {
    const message = document.createElement("p");
    message.className = "muted-text";
    message.textContent =
      "The feed is waiting for the authenticated Firestore integration.";
    feed.appendChild(message);
  }

  const authMessage = $("#authMessage");

  if (authMessage) {
    setMessage(
      authMessage,
      "Firebase Authentication has not been connected yet."
    );
  }
}

/* ---------------------------------------------------------
   AUTHENTICATION FORM UI

   This validates inputs but does not simulate successful
   login, signup, password reset or email verification.
--------------------------------------------------------- */

function setAuthMode(mode) {
  if (mode !== "login" && mode !== "signup") return;

  state.authMode = mode;

  const signup = mode === "signup";
  const nameField = $("#displayNameField");
  const termsField = $("#termsAcceptance");
  const nameInput = $("#displayName");
  const termsInput = $("#acceptTerms");
  const passwordInput = $("#authPassword");
  const heading = $("#authHeading");
  const submit = $("#authSubmitButton");
  const reset = $("#resetPasswordButton");

  if (nameField) nameField.hidden = !signup;
  if (termsField) termsField.hidden = !signup;
  if (nameInput) nameInput.required = signup;
  if (termsInput) termsInput.required = signup;

  if (passwordInput) {
    passwordInput.autocomplete = signup
      ? "new-password"
      : "current-password";
  }

  if (heading) {
    heading.textContent = signup
      ? "Create your own space."
      : "Come as you are.";
  }

  if (submit) {
    submit.textContent = signup ? "Create account" : "Log in";
  }

  if (reset) reset.hidden = signup;

  $$("[data-auth-mode]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.authMode === mode
    );
  });

  clearMessage($("#authMessage"));
}

function initAuthenticationUI() {
  $$("[data-auth-mode]").forEach(button => {
    button.addEventListener("click", () => {
      setAuthMode(button.dataset.authMode);
    });
  });

  const authForm = $("#authForm");

  if (authForm) {
    authForm.addEventListener("submit", event => {
      event.preventDefault();

      if (!authForm.reportValidity()) return;

      if (
        state.authMode === "signup" &&
        !$("#acceptTerms")?.checked
      ) {
        setMessage(
          $("#authMessage"),
          "Please accept the Terms and Privacy Policy.",
          "error"
        );
        return;
      }

      setMessage(
        $("#authMessage"),
        "Firebase Authentication is not connected. No account was created or login attempted.",
        "error"
      );
    });
  }

  const resetButton = $("#resetPasswordButton");

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      const email = $("#authEmail")?.value.trim();

      if (!email) {
        setMessage(
          $("#authMessage"),
          "Enter your email address first. Password reset is not connected yet.",
          "error"
        );
        $("#authEmail")?.focus();
        return;
      }

      if (!$("#authEmail")?.checkValidity()) {
        setMessage(
          $("#authMessage"),
          "Please enter a valid email address.",
          "error"
        );
        return;
      }

      setMessage(
        $("#authMessage"),
        "Password reset is not connected yet. No reset email was sent.",
        "error"
      );
    });
  }

  setAuthMode("login");
}

/* ---------------------------------------------------------
   FEELINGS
--------------------------------------------------------- */

function updateSelectedFeeling(feeling) {
  if (!FEELINGS.includes(feeling)) return;

  state.currentFeeling = feeling;

  $$(".feeling-chip").forEach(button => {
    const selected = button.dataset.feeling === feeling;

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const currentFeeling = $("#currentFeeling");
  const label = $("#currentFeelingLabel");

  if (currentFeeling) currentFeeling.value = feeling;

  if (label) {
    label.textContent =
      "Selected feeling: " + feeling +
      ". Save it from My Feelings when the backend is connected.";
  }
}

function initFeelings() {
  $$(".feeling-chip").forEach(button => {
    button.addEventListener("click", () => {
      const feeling = button.dataset.feeling;

      if (!FEELINGS.includes(feeling)) return;

      updateSelectedFeeling(feeling);
      showPage("feelings");
    });
  });

  const feelingForm = $("#feelingForm");

  if (feelingForm) {
    feelingForm.addEventListener("submit", event => {
      event.preventDefault();

      const feeling = $("#currentFeeling")?.value;
      const visibility = $("#feelingVisibility")?.value;

      if (!FEELINGS.includes(feeling)) {
        setMessage(
          $("#feelingMessage"),
          "Please choose a valid feeling.",
          "error"
        );
        return;
      }

      if (!["everyone", "friends", "private"].includes(visibility)) {
        setMessage(
          $("#feelingMessage"),
          "Please choose a valid privacy setting.",
          "error"
        );
        return;
      }

      updateSelectedFeeling(feeling);

      setMessage(
        $("#feelingMessage"),
        "Your selection is ready, but it has not been saved. Connect Firebase and implement the Firestore privacy rules before saving feelings.",
        "error"
      );
    });
  }
}

/* ---------------------------------------------------------
   LETTER TEMPLATES AND PREVIEW
--------------------------------------------------------- */

function applyLetterTemplate(templateName) {
  const template = LETTER_TEMPLATES[templateName];

  if (!template) return;

  state.selectedTemplate = templateName;

  const selector = $("#letterTemplate");
  const title = $("#letterTitle");
  const body = $("#letterBody");
  const heading = $("#letterEditorHeading");

  if (selector) selector.value = templateName;

  if (title && !title.value.trim()) {
    title.value = template.title;
  }

  if (body && !body.value.trim()) {
    body.value = template.greeting + "\n\n" + template.body;
  }

  if (heading) heading.textContent = templateName;

  $$("[data-template]").forEach(button => {
    const selected = button.dataset.template === templateName;

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function initLetterTemplates() {
  $$("[data-template]").forEach(button => {
    button.addEventListener("click", () => {
      const templateName = button.dataset.template;

      if (!LETTER_TEMPLATES[templateName]) return;

      state.selectedTemplate = templateName;

      const selector = $("#letterTemplate");
      const title = $("#letterTitle");
      const body = $("#letterBody");

      if (selector) selector.value = templateName;

      const template = LETTER_TEMPLATES[templateName];

      if (title) title.value = template.title;

      if (body) {
        body.value = template.greeting + "\n\n" + template.body;
      }

      const heading = $("#letterEditorHeading");

      if (heading) heading.textContent = templateName;

      $$("[data-template]").forEach(card => {
        const selected = card.dataset.template === templateName;

        card.classList.toggle("selected", selected);
        card.setAttribute("aria-pressed", String(selected));
      });

      $("#letterForm")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });

  const selector = $("#letterTemplate");

  if (selector) {
    selector.addEventListener("change", () => {
      const templateName = selector.value;

      if (!LETTER_TEMPLATES[templateName]) return;

      state.selectedTemplate = templateName;

      $$("[data-template]").forEach(button => {
        const selected = button.dataset.template === templateName;

        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    });
  }

  const previewButton = $("#previewLetterButton");
  const dialog = $("#letterPreviewDialog");

  state.letterPreviewDialog = dialog || null;

  if (previewButton) {
    previewButton.addEventListener("click", () => {
      const title = $("#letterTitle")?.value.trim();
      const body = $("#letterBody")?.value.trim();
      const template = $("#letterTemplate")?.value;

      if (!body) {
        setMessage(
          $("#letterMessage"),
          "Write your letter before previewing it.",
          "error"
        );
        $("#letterBody")?.focus();
        return;
      }

      $("#previewLetterTitle").textContent =
        title || "A letter just for you";

      $("#previewLetterBody").textContent = body;

      $("#previewTemplateName").textContent =
        template || "A LETTER FROM THE HEART";

      if (dialog && typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        showGlobalMessage(
          "Your browser does not support the letter preview dialog."
        );
      }
    });
  }

  const closePreview = $("#closeLetterPreview");

  if (closePreview) {
    closePreview.addEventListener("click", () => {
      if (dialog?.open) dialog.close();
    });
  }

  if (dialog) {
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
  }

  const letterForm = $("#letterForm");

  if (letterForm) {
    letterForm.addEventListener("submit", event => {
      event.preventDefault();

      if (!letterForm.reportValidity()) return;

      const body = $("#letterBody")?.value.trim();
      const visibility = $("#letterVisibility")?.value;

      if (!body) {
        setMessage(
          $("#letterMessage"),
          "Please write your letter.",
          "error"
        );
        return;
      }

      if (!["everyone", "friends", "private"].includes(visibility)) {
        setMessage(
          $("#letterMessage"),
          "Please select a valid visibility setting.",
          "error"
        );
        return;
      }

      setMessage(
        $("#letterMessage"),
        "Your letter is still on this page. It has not been saved or published. Connect Firebase and implement authorization before storing letters.",
        "error"
      );
    });
  }

  applyLetterTemplate("Romantic Love");
}

/* ---------------------------------------------------------
   FILE SELECTION AND BASIC CLIENT-SIDE VALIDATION
--------------------------------------------------------- */

function validateSelectedFile(file, allowedKinds, maxBytes) {
  if (!file) {
    return { valid: true, message: "" };
  }

  if (file.size <= 0) {
    return { valid: false, message: "The selected file is empty." };
  }

  if (file.size > maxBytes) {
    return {
      valid: false,
      message: "This file is too large. Choose a smaller file."
    };
  }

  const allowed = allowedKinds.some(kind => {
    if (kind.endsWith("/*")) {
      return file.type.startsWith(kind.slice(0, -1));
    }

    return file.type === kind;
  });

  if (!allowed) {
    return {
      valid: false,
      message: "This file type is not supported."
    };
  }

  return { valid: true, message: "" };
}

function initMediaInputs() {
  const mediaButton = $("#attachMediaButton");
  const audioButton = $("#attachAudioButton");
  const postMedia = $("#postMedia");
  const postAudio = $("#postAudio");

  if (mediaButton && postMedia) {
    mediaButton.addEventListener("click", () => postMedia.click());
  }

  if (audioButton && postAudio) {
    audioButton.addEventListener("click", () => postAudio.click());
  }

  if (postMedia) {
    postMedia.addEventListener("change", () => {
      const file = postMedia.files?.[0] || null;

      const result = validateSelectedFile(
        file,
        ["image/*", "video/*"],
        25 * 1024 * 1024
      );

      if (!result.valid) {
        postMedia.value = "";
        state.selectedPostFile = null;

        setMessage($("#postFormMessage"), result.message, "error");
        return;
      }

      state.selectedPostFile = file;

      setMessage(
        $("#postFormMessage"),
        file ? "Selected: " + file.name + ". It has not been uploaded." : ""
      );
    });
  }

  if (postAudio) {
    postAudio.addEventListener("change", () => {
      const file = postAudio.files?.[0] || null;

      const result = validateSelectedFile(
        file,
        ["audio/*"],
        10 * 1024 * 1024
      );

      if (!result.valid) {
        postAudio.value = "";
        state.selectedAudioFile = null;

        setMessage($("#postFormMessage"), result.message, "error");
        return;
      }

      state.selectedAudioFile = file;

      setMessage(
        $("#postFormMessage"),
        file ? "Selected: " + file.name + ". Audio duration and upload permissions must be checked before publishing." : ""
      );
    });
  }

  const storyMedia = $("#storyMedia");

  if (storyMedia) {
    storyMedia.addEventListener("change", () => {
      const file = storyMedia.files?.[0] || null;

      const result = validateSelectedFile(
        file,
        ["image/*", "video/*"],
        25 * 1024 * 1024
      );

      if (!result.valid) {
        storyMedia.value = "";
        state.selectedStoryFile = null;

        setMessage($("#storyMessage"), result.message, "error");
        return;
      }

      state.selectedStoryFile = file;

      setMessage(
        $("#storyMessage"),
        file ? "Selected: " + file.name + ". The story has not been uploaded." : ""
      );
    });
  }

  const storyAudio = $("#storyAudio");

  if (storyAudio) {
    storyAudio.addEventListener("change", () => {
      const file = storyAudio.files?.[0] || null;

      const result = validateSelectedFile(
        file,
        ["audio/*"],
        10 * 1024 * 1024
      );

      if (!result.valid) {
        storyAudio.value = "";

        setMessage($("#storyMessage"), result.message, "error");
        return;
      }

      setMessage(
        $("#storyMessage"),
        file ? "Audio selected. The 30-second limit must also be enforced during upload." : ""
      );
    });
  }

  const profilePhoto = $("#profilePhoto");

  if (profilePhoto) {
    profilePhoto.addEventListener("change", () => {
      const file = profilePhoto.files?.[0] || null;

      const result = validateSelectedFile(
        file,
        ["image/*"],
        5 * 1024 * 1024
      );

      if (!result.valid) {
        profilePhoto.value = "";
        state.selectedProfileFile = null;

        setMessage($("#profileMessage"), result.message, "error");
        return;
      }

      state.selectedProfileFile = file;

      setMessage(
        $("#profileMessage"),
        file ? "Selected: " + file.name + ". The image has not been uploaded." : ""
      );
    });
  }
}

/* ---------------------------------------------------------
   POST FORM
--------------------------------------------------------- */

function initPostForm() {
  const form = $("#postForm");

  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const text = $("#postText")?.value.trim() || "";
    const visibility = $("#postVisibility")?.value;
    const feeling = $("#postFeeling")?.value || "";

    if (!text && !state.selectedPostFile && !state.selectedAudioFile) {
      setMessage(
        $("#postFormMessage"),
        "Write something or select media before continuing.",
        "error"
      );
      return;
    }

    if (!["everyone", "friends", "private"].includes(visibility)) {
      setMessage(
        $("#postFormMessage"),
        "Please choose a valid audience.",
        "error"
      );
      return;
    }

    if (feeling && !FEELINGS.includes(feeling)) {
      setMessage(
        $("#postFormMessage"),
        "Please choose a valid feeling.",
        "error"
      );
      return;
    }

    setMessage(
      $("#postFormMessage"),
      "Your post has not been published. Firebase, Firestore permissions and Cloudinary uploads must be connected first.",
      "error"
    );
  });

  const refreshButton = $("#refreshFeedButton");

  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      showGlobalMessage(
        "The feed cannot refresh until the Firestore integration is connected."
      );
    });
  }
}

/* ---------------------------------------------------------
   STORY FORM
--------------------------------------------------------- */

function initStoryForm() {
  const form = $("#storyForm");

  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();

    const text = $("#storyText")?.value.trim() || "";
    const visibility = $("#storyVisibility")?.value;
    const audioFile = $("#storyAudio")?.files?.[0] || null;

    if (
      !text &&
      !state.selectedStoryFile &&
      !audioFile
    ) {
      setMessage(
        $("#storyMessage"),
        "Add story text, a photo, a video or audio before continuing.",
        "error"
      );
      return;
    }

    if (!["everyone", "friends"].includes(visibility)) {
      setMessage(
        $("#storyMessage"),
        "Please choose a valid story audience.",
        "error"
      );
      return;
    }

    setMessage(
      $("#storyMessage"),
      "Your story has not been published. Server-side 24-hour expiry, audience authorization and media upload must be implemented first.",
      "error"
    );
  });

  const createStoryButton = $("#createStoryButton");

  if (createStoryButton) {
    createStoryButton.addEventListener("click", () => {
      showPage("stories");

      $("#storyForm")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      $("#storyText")?.focus({ preventScroll: true });
    });
  }
}

/* ---------------------------------------------------------
   FRIEND REQUESTS AND MESSAGE REQUESTS
--------------------------------------------------------- */

function initRequests() {
  const friendForm = $("#friendRequestForm");

  if (friendForm) {
    friendForm.addEventListener("submit", event => {
      event.preventDefault();

      if (!friendForm.reportValidity()) return;

      const username = $("#friendUsername")?.value.trim() || "";

      if (!/^[A-Za-z0-9_]{2,30}$/.test(username.replace(/^@/, ""))) {
        setMessage(
          $("#friendRequestStatus"),
          "Enter a valid username containing 2–30 letters, numbers or underscores.",
          "error"
        );
        return;
      }

      setMessage(
        $("#friendRequestStatus"),
        "No friend request was sent. Authentication and Firestore authorization are not connected.",
        "error"
      );
    });
  }

  const messageForm = $("#messageRequestForm");

  if (messageForm) {
    messageForm.addEventListener("submit", event => {
      event.preventDefault();

      if (!messageForm.reportValidity()) return;

      const username = $("#messageRecipient")?.value.trim() || "";
      const message = $("#messageRequestText")?.value.trim() || "";

      if (!/^[A-Za-z0-9_]{2,30}$/.test(username.replace(/^@/, ""))) {
        setMessage(
          $("#messageRequestStatus"),
          "Enter a valid recipient username.",
          "error"
        );
        return;
      }

      if (!message || message.length > 500) {
        setMessage(
          $("#messageRequestStatus"),
          "Your request must contain 1–500 characters.",
          "error"
        );
        return;
      }

      setMessage(
        $("#messageRequestStatus"),
        "No message request was sent. The authenticated backend and recipient permissions are not connected.",
        "error"
      );
    });
  }
}

/* ---------------------------------------------------------
   PROFILE
--------------------------------------------------------- */

function initProfile() {
  const form = $("#profileForm");

  if (form) {
    form.addEventListener("submit", event => {
      event.preventDefault();

      if (!form.reportValidity()) return;

      const username = $("#profileUsername")?.value.trim() || "";
      const visibility = $("#profileVisibility")?.value;

      if (username && !/^[A-Za-z0-9_]{3,30}$/.test(username)) {
        setMessage(
          $("#profileMessage"),
          "Username must contain 3–30 letters, numbers or underscores.",
          "error"
        );
        return;
      }

      if (!["public", "friends", "private"].includes(visibility)) {
        setMessage(
          $("#profileMessage"),
          "Please choose a valid profile visibility.",
          "error"
        );
        return;
      }

      setMessage(
        $("#profileMessage"),
        "Your profile has not been saved. Firebase Authentication and Firestore profile permissions must be connected.",
        "error"
      );
    });
  }

  const profileButton = $("#profileButton");

  if (profileButton) {
    profileButton.addEventListener("click", () => {
      showPage("profile");
    });
  }

  const logoutButton = $("#logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      showGlobalMessage(
        "No account is connected, so there is nothing to log out from."
      );
    });
  }

  const deleteButton = $("#deleteAccountButton");

  if (deleteButton) {
    deleteButton.addEventListener("click", () => {
      showGlobalMessage(
        "Account deletion is not connected. No account or data was deleted."
      );
    });
  }
}

/* ---------------------------------------------------------
   NOTIFICATIONS
--------------------------------------------------------- */

function initNotifications() {
  const button = $("#notificationsButton");

  if (button) {
    button.addEventListener("click", () => {
      showPage("notifications");
    });
  }
}

/* ---------------------------------------------------------
   DOCUMENT INITIALIZATION
--------------------------------------------------------- */

function init() {
  const year = $("#currentYear");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  initNavigation();
  initBackendStatus();
  initAuthenticationUI();
  initFeelings();
  initLetterTemplates();
  initMediaInputs();
  initPostForm();
  initStoryForm();
  initRequests();
  initProfile();
  initNotifications();

  console.info(
    "Express Your Story frontend initialized. Backend operations are not connected."
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
