import {
  CHQ_VERSION,
  buildSampleChallenges,
  calculateScore,
  createDefaultChallenge,
  createQuestion,
  exportChallenge,
  isAnswerCorrect,
  normalizeChallenge,
  removeChallenge,
  resolveCreatorName,
  summarizeProgressTrend,
  summarizeSubjectProgress,
  validateChallenge,
} from "./challenge-core.js";

const STORAGE_KEY = "questra-library";
const LEGACY_STORAGE_KEY = "challengehub-library";
const PROGRESSION_KEY = "questra-progression";
const ACCOUNT_KEY = "questra-account";
const DEFAULT_TAB = "explore";
const DB_NAME = "questra-local-db";
const DB_VERSION = 1;

function createDefaultAccount() {
  return {
    id: (crypto.randomUUID ? crypto.randomUUID() : `player-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    name: "Player",
    createdAt: new Date().toISOString(),
  };
}

function createDefaultProgress() {
  return {
    xp: 0,
    level: 1,
    title: "Rookie Explorer",
    history: [],
    completedChallenges: [],
    personalBests: [],
    streak: 0,
    lastChallengeDate: null,
    subjectBreakdown: [],
    analytics: {
      completedCount: 0,
      averageAccuracy: 0,
      averageMinutes: 0,
    },
  };
}

function normalizeCategoryName(category) {
  const raw = String(category || "").trim();
  if (!raw) {
    return "General Knowledge";
  }

  const normalized = raw.toLowerCase();
  const matches = {
    "general knowledge": "General Knowledge",
    "general": "General Knowledge",
    science: "Science",
    history: "History",
    technology: "Technology",
    logic: "Logic",
    community: "Community",
    custom: "Custom",
  };

  return matches[normalized] || raw;
}

function buildCategoryIconDataUrl(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }

  const palette = {
    "General Knowledge": { bg: "#eaf4ff", glow: "#6ea8ff", accent: "#3f7ef5", dark: "#1d4f9a" },
    Science: { bg: "#edfdf8", glow: "#39c6b8", accent: "#1ab39d", dark: "#116d5c" },
    History: { bg: "#fff5ee", glow: "#f2b26f", accent: "#d8893a", dark: "#8b5623" },
    Technology: { bg: "#eef1ff", glow: "#7a86ff", accent: "#5868ef", dark: "#2d3ba5" },
    Logic: { bg: "#f3efff", glow: "#b28bff", accent: "#8d67f5", dark: "#4f3aa8" },
    Community: { bg: "#eafef4", glow: "#4ecb8d", accent: "#1fbd73", dark: "#166d48" },
    Custom: { bg: "#fff7d9", glow: "#ffd25f", accent: "#ffb61a", dark: "#8d6500" },
  };

  const selected = palette[type] || palette["General Knowledge"];
  const { bg, glow, accent, dark } = selected;

  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = bg;
  roundRect(ctx, 6, 6, 52, 52, 16);
  ctx.fill();

  ctx.shadowColor = glow;
  ctx.shadowBlur = 20;
  ctx.fillStyle = accent;
  ctx.shadowBlur = 0;

  switch (type) {
    case "Science": {
      ctx.beginPath();
      ctx.arc(32, 32, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(32, 12);
      ctx.lineTo(32, 52);
      ctx.moveTo(12, 32);
      ctx.lineTo(52, 32);
      ctx.moveTo(18, 18);
      ctx.lineTo(46, 46);
      ctx.moveTo(46, 18);
      ctx.lineTo(18, 46);
      ctx.stroke();
      break;
    }
    case "History": {
      ctx.fillStyle = accent;
      ctx.fillRect(20, 22, 24, 26);
      ctx.fillRect(16, 48, 32, 6);
      ctx.fillStyle = dark;
      ctx.fillRect(24, 16, 5, 8);
      ctx.fillRect(35, 16, 5, 8);
      ctx.fillRect(28, 11, 8, 7);
      ctx.fillRect(17, 10, 30, 6);
      break;
    }
    case "Technology": {
      ctx.fillStyle = dark;
      ctx.fillRect(18, 18, 28, 28);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(22, 22, 8, 8);
      ctx.fillRect(34, 22, 8, 8);
      ctx.fillRect(22, 34, 20, 8);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(12, 24);
      ctx.lineTo(18, 24);
      ctx.moveTo(46, 24);
      ctx.lineTo(52, 24);
      ctx.moveTo(12, 40);
      ctx.lineTo(18, 40);
      ctx.moveTo(46, 40);
      ctx.lineTo(52, 40);
      ctx.stroke();
      break;
    }
    case "Logic": {
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(18, 20);
      ctx.lineTo(32, 32);
      ctx.lineTo(46, 20);
      ctx.moveTo(18, 44);
      ctx.lineTo(32, 32);
      ctx.lineTo(46, 44);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(18, 20, 5, 0, Math.PI * 2);
      ctx.arc(46, 20, 5, 0, Math.PI * 2);
      ctx.arc(18, 44, 5, 0, Math.PI * 2);
      ctx.arc(46, 44, 5, 0, Math.PI * 2);
      ctx.arc(32, 32, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "Community": {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(22, 25, 7, 0, Math.PI * 2);
      ctx.arc(42, 25, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(15, 35, 34, 12);
      ctx.fillStyle = dark;
      ctx.fillRect(12, 42, 40, 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(18, 36, 28, 10);
      break;
    }
    case "Custom": {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(32, 13);
      ctx.lineTo(38, 27);
      ctx.lineTo(52, 27);
      ctx.lineTo(41, 37);
      ctx.lineTo(46, 51);
      ctx.lineTo(32, 42);
      ctx.lineTo(18, 51);
      ctx.lineTo(23, 37);
      ctx.lineTo(12, 27);
      ctx.lineTo(26, 27);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = dark;
      ctx.fillRect(18, 17, 28, 30);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(22, 22, 20, 6);
      ctx.fillRect(22, 32, 16, 6);
      ctx.fillRect(22, 42, 12, 6);
      break;
    }
  }

  return canvas.toDataURL("image/png");
}

function roundRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function getCategoryMeta(category) {
  const label = normalizeCategoryName(category);
  const accentMap = {
    "General Knowledge": "linear-gradient(135deg, #6aa9ff, #7ed6ff)",
    Science: "linear-gradient(135deg, #2ec4b6, #4f8ef7)",
    History: "linear-gradient(135deg, #d79b5a, #f7d8a6)",
    Technology: "linear-gradient(135deg, #5d7af9, #6ec5ff)",
    Logic: "linear-gradient(135deg, #7e6cf4, #a799ff)",
    Community: "linear-gradient(135deg, #3ecf8e, #7adcb5)",
    Custom: "linear-gradient(135deg, #ffbf38, #ff8d5a)",
  };

  return {
    label,
    accent: accentMap[label] || accentMap["General Knowledge"],
    icon: buildCategoryIconDataUrl(label),
  };
}

const state = {
  activeTab: DEFAULT_TAB,
  library: [],
  selectedCategory: "All",
  currentChallenge: createDefaultChallenge(),
  activeChallenge: null,
  playerSession: null,
  selectedChallengeId: null,
  account: createDefaultAccount(),
  progress: createDefaultProgress(),
  hasUnsavedChanges: false,
  draftBaseline: "",
  pendingNavigation: null,
};

const elements = {
  navButtons: [...document.querySelectorAll(".nav-button")],
  topNav: document.getElementById("topnav"),
  mobileNavToggle: document.getElementById("mobile-nav-toggle"),
  views: [...document.querySelectorAll(".view-panel")],
  libraryGrid: document.getElementById("library-grid"),
  categoryFilterRow: document.getElementById("category-filter-row"),
  questionList: document.getElementById("question-list"),
  challengeTitle: document.getElementById("challenge-title"),
  challengeCategory: document.getElementById("challenge-category"),
  challengeCreatedBy: document.getElementById("challenge-created-by"),
  challengeDescription: document.getElementById("challenge-description"),
  challengeInstructions: document.getElementById("challenge-instructions"),
  randomize: document.getElementById("randomize-order"),
  feedback: document.getElementById("show-feedback"),
  retry: document.getElementById("allow-retry"),
  timer: document.getElementById("timer-seconds"),
  preview: document.getElementById("challenge-preview"),
  saveChallenge: document.getElementById("save-challenge-btn"),
  exportChallenge: document.getElementById("export-challenge-btn"),
  addQuestion: document.getElementById("add-question-btn"),
  importFile: document.getElementById("import-file-input"),
  playerTitle: document.getElementById("player-title"),
  playArea: document.getElementById("play-area"),
  progressSummary: document.getElementById("progress-summary"),
  progressView: document.getElementById("progress-view"),
  progressAnalytics: document.getElementById("progress-analytics"),
  startChallenge: document.getElementById("start-challenge-btn"),
  restartChallenge: document.getElementById("restart-challenge-btn"),
  backupData: document.getElementById("backup-data-btn"),
  restoreInput: document.getElementById("restore-data-input"),
  accountNameInput: document.getElementById("account-name-input"),
  template: document.getElementById("question-editor-template"),
  scrollTopBtn: document.getElementById("scroll-top-btn"),
  unsavedModal: document.getElementById("unsaved-changes-modal"),
  unsavedModalSave: document.getElementById("unsaved-modal-save"),
  unsavedModalDiscard: document.getElementById("unsaved-modal-discard"),
  unsavedModalCancel: document.getElementById("unsaved-modal-cancel"),
};

initialize();

function initialize() {
  initTheme();
  state.account = loadAccount();
  if (elements.accountNameInput) {
    elements.accountNameInput.value = state.account.name || "Player";
  }
  state.progress = loadProgression();
  state.library = loadLibrary();
  if (!state.library.length) {
    state.library = buildSampleChallenges();
    persistLibrary();
  }

  state.currentChallenge = state.library[0] || createDefaultChallenge();
  state.draftBaseline = JSON.stringify(normalizeChallenge(state.currentChallenge));
  state.hasUnsavedChanges = false;
  syncBuilderFromChallenge();
  bindEvents();
  renderCategoryFilters();
  renderLibrary();
  renderQuestionEditors();
  renderPreview();
  renderProgressSummary();
  renderProgressView();
  renderPlayer();
  setActiveTab(DEFAULT_TAB);
  loadIndexedLibrary();
  registerOfflineSupport();
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (setActiveTab(tab)) {
        document.getElementById(`${tab}-view`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  elements.mobileNavToggle?.addEventListener("click", () => {
    const isOpen = elements.topNav?.classList.toggle("open");
    elements.mobileNavToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  });

  elements.scrollTopBtn?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const updateScrollTopButton = () => {
    const shouldShow = window.scrollY > 260;
    elements.scrollTopBtn?.classList.toggle("visible", shouldShow);
  };

  updateScrollTopButton();
  window.addEventListener("scroll", updateScrollTopButton, { passive: true });

  const themeToggle = document.getElementById("theme-toggle");
  themeToggle?.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  });

  const suggestionForm = document.getElementById("suggestion-form");
  suggestionForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = suggestionForm.elements.email.value.trim();
    const message = suggestionForm.elements.message.value.trim();

    if (!email || !message) {
      alert("Please add both your email and a suggestion.");
      return;
    }

    const subject = encodeURIComponent("Questra suggestion");
    const body = encodeURIComponent(`Email: ${email}\n\nSuggestion:\n${message}`);
    window.location.href = `mailto:fdavedamond@gmail.com?subject=${subject}&body=${body}`;
    suggestionForm.reset();
  });

  elements.challengeTitle.addEventListener("input", () => {
    state.currentChallenge.title = elements.challengeTitle.value || "Untitled Challenge";
    markBuilderDirty();
    renderPreview();
  });

  elements.challengeCategory.addEventListener("change", () => {
    state.currentChallenge.category = elements.challengeCategory.value;
    markBuilderDirty();
    renderPreview();
  });

  elements.challengeCreatedBy.addEventListener("input", () => {
    const nextName = resolveCreatorName(elements.challengeCreatedBy.value, state.account?.name || "Player");
    state.currentChallenge.createdBy = nextName;
    state.currentChallenge.creatorLocked = Boolean(elements.challengeCreatedBy.value.trim());
    markBuilderDirty();
    renderPreview();
  });

  elements.challengeDescription.addEventListener("input", () => {
    state.currentChallenge.description = elements.challengeDescription.value;
    markBuilderDirty();
    renderPreview();
  });

  elements.challengeInstructions.addEventListener("input", () => {
    state.currentChallenge.instructions = elements.challengeInstructions.value;
    markBuilderDirty();
    renderPreview();
  });

  elements.randomize.addEventListener("change", () => {
    state.currentChallenge.settings.randomizeQuestions = elements.randomize.checked;
    markBuilderDirty();
    renderPreview();
  });

  elements.feedback.addEventListener("change", () => {
    state.currentChallenge.settings.revealFeedback = elements.feedback.checked;
    markBuilderDirty();
    renderPreview();
  });

  elements.retry.addEventListener("change", () => {
    state.currentChallenge.settings.allowRetry = elements.retry.checked;
    markBuilderDirty();
    renderPreview();
  });

  elements.timer.addEventListener("input", () => {
    state.currentChallenge.settings.timerSeconds = Math.max(0, Number(elements.timer.value) || 0);
    markBuilderDirty();
    renderPreview();
  });

  elements.addQuestion.addEventListener("click", () => {
    state.currentChallenge.questions.push(createQuestion("multiple-choice"));
    markBuilderDirty();
    renderQuestionEditors();
    renderPreview();
  });

  elements.saveChallenge.addEventListener("click", () => {
    saveCurrentChallenge();
  });

  elements.unsavedModalSave?.addEventListener("click", () => {
    const didSave = saveCurrentChallenge();
    if (didSave) {
      closeUnsavedModal();
      if (state.pendingNavigation) {
        const target = state.pendingNavigation;
        state.pendingNavigation = null;
        setActiveTab(target);
      }
    }
  });

  elements.unsavedModalDiscard?.addEventListener("click", () => {
    restoreBuilderBaseline();
    closeUnsavedModal();
    if (state.pendingNavigation) {
      const target = state.pendingNavigation;
      state.pendingNavigation = null;
      setActiveTab(target);
    }
  });

  elements.unsavedModalCancel?.addEventListener("click", () => {
    closeUnsavedModal();
    state.pendingNavigation = null;
  });

  elements.exportChallenge.addEventListener("click", () => {
    const rules = validateChallenge(state.currentChallenge);
    if (!rules.valid) {
      alert(rules.errors.join("\n"));
      return;
    }

    const currentCreator = String(state.currentChallenge.createdBy || "").trim();
    const nextCreator = resolveCreatorName(currentCreator, state.account?.name || "Player");

    if (!nextCreator || !nextCreator.trim()) {
      alert("A creator name is required before exporting a challenge.");
      return;
    }

    state.currentChallenge.createdBy = nextCreator.trim();
    state.currentChallenge.creatorLocked = true;
    syncBuilderFromChallenge();

    try {
      const blob = new Blob([exportChallenge(state.currentChallenge)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slugify(state.currentChallenge.title || "challenge")}.chq`;
      anchor.click();
      URL.revokeObjectURL(url);
      eventsToast(`Exported "${state.currentChallenge.title}" by ${state.currentChallenge.createdBy}.`);
    } catch (error) {
      alert(error.message || "Export failed.");
    }
  });

  elements.importFile.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const result = validateChallenge(JSON.parse(text));
      if (!result.valid) {
        throw new Error(result.errors.join("\n"));
      }

      state.currentChallenge = result.challenge;
      state.library = [normalizeChallenge(result.challenge), ...state.library];
      persistLibrary();
      renderLibrary();
      syncBuilderFromChallenge();
      renderQuestionEditors();
      renderPreview();
      setActiveTab("builder");
      eventsToast(`Imported ${result.challenge.title}.`);
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }

    event.target.value = "";
  });

  elements.backupData?.addEventListener("click", () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      account: state.account,
      library: state.library,
      progression: state.progress,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "questra-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
    eventsToast("Backup exported locally.");
  });

  elements.restoreInput?.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (payload && Array.isArray(payload.library)) {
        state.library = payload.library.map((item) => normalizeChallenge(item));
        persistLibrary();
        renderLibrary();
      }
      if (payload && payload.progression) {
        state.progress = { ...createDefaultProgress(), ...payload.progression };
        saveProgression();
      }
      if (payload && payload.account) {
        state.account = { ...createDefaultAccount(), ...payload.account };
        saveAccount();
      }
      if (elements.accountNameInput) {
        elements.accountNameInput.value = state.account.name || "Player";
      }
      renderProgressSummary();
      eventsToast("Account and progress restored.");
    } catch (error) {
      alert(`Backup restore failed: ${error.message}`);
    }

    event.target.value = "";
  });

  elements.accountNameInput?.addEventListener("input", () => {
    state.account.name = elements.accountNameInput.value.trim() || "Player";
    saveAccount();
    renderProgressSummary();
  });

  elements.startChallenge.addEventListener("click", () => {
    if (!state.activeChallenge) {
      state.activeChallenge = state.currentChallenge;
    }
    beginChallengeSession(state.activeChallenge);
    setActiveTab("player");
  });

  elements.restartChallenge.addEventListener("click", () => {
    if (state.activeChallenge) {
      beginChallengeSession(state.activeChallenge);
    }
  });
}

function markBuilderDirty() {
  state.hasUnsavedChanges = JSON.stringify(normalizeChallenge(state.currentChallenge)) !== state.draftBaseline;
}

function saveCurrentChallenge() {
  const rules = validateChallenge(state.currentChallenge);
  if (!rules.valid) {
    alert(rules.errors.join("\n"));
    return false;
  }

  const challenge = normalizeChallenge(state.currentChallenge);
  challenge.createdBy = resolveCreatorName(challenge.createdBy, state.account?.name || "Player");
  challenge.creatorLocked = Boolean(challenge.creatorLocked) || Boolean(challenge.createdBy);
  const existingIndex = state.library.findIndex((item) => item.id && item.id === challenge.id);
  const fallbackIndex = existingIndex === -1
    ? state.library.findIndex((item) => item.title === challenge.title && item.category === challenge.category)
    : -1;

  if (existingIndex >= 0) {
    state.library[existingIndex] = challenge;
  } else if (fallbackIndex >= 0) {
    state.library[fallbackIndex] = challenge;
  } else {
    state.library.unshift(challenge);
  }

  persistLibrary();
  state.currentChallenge = challenge;
  state.draftBaseline = JSON.stringify(challenge);
  state.hasUnsavedChanges = false;
  renderLibrary();
  renderPreview();
  setActiveTab("explore");
  alert("Challenge saved to your library.");
  return true;
}

function closeUnsavedModal() {
  elements.unsavedModal?.classList.remove("open");
}

function openUnsavedModal(targetTab) {
  state.pendingNavigation = targetTab;
  elements.unsavedModal?.classList.add("open");
}

function restoreBuilderBaseline() {
  const savedChallenge = state.library.find((challenge) => challenge.id === state.currentChallenge.id)
    || state.library.find((challenge) => challenge.title === state.currentChallenge.title && challenge.category === state.currentChallenge.category)
    || normalizeChallenge(state.currentChallenge);

  state.currentChallenge = normalizeChallenge(savedChallenge || createDefaultChallenge());
  state.draftBaseline = JSON.stringify(state.currentChallenge);
  state.hasUnsavedChanges = false;
  syncBuilderFromChallenge();
  renderQuestionEditors();
  renderPreview();
}

function closeMobileNav() {
  if (!elements.topNav || !elements.mobileNavToggle) {
    return;
  }

  elements.topNav.classList.remove("open");
  elements.mobileNavToggle.setAttribute("aria-expanded", "false");
}

function setActiveTab(tabName) {
  if (state.hasUnsavedChanges && tabName !== state.activeTab && elements.unsavedModal) {
    openUnsavedModal(tabName);
    return false;
  }

  state.activeTab = tabName;
  elements.navButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabName));
  elements.views.forEach((view) => view.classList.toggle("active", view.id === `${tabName}-view`));
  if (window.innerWidth <= 720) {
    closeMobileNav();
  }
  return true;
}

function getChallengeAccent(challenge) {
  return getCategoryMeta(challenge.category).accent;
}

function upsertCurrentChallengeInLibrary() {
  if (!state.currentChallenge) {
    return;
  }

  const challenge = normalizeChallenge(state.currentChallenge);
  state.currentChallenge = challenge;

  const existingIndex = state.library.findIndex((item) => item.id && item.id === challenge.id);
  const fallbackIndex = existingIndex === -1
    ? state.library.findIndex((item) => item.title === challenge.title && item.category === challenge.category)
    : -1;

  const targetIndex = existingIndex >= 0 ? existingIndex : fallbackIndex;

  if (targetIndex >= 0) {
    state.library[targetIndex] = challenge;
  } else {
    state.library.unshift(challenge);
  }

  persistLibrary();
}

function renderCategoryFilters() {
  const categories = ["All", "General Knowledge", "Science", "History", "Technology", "Logic", "Community", "Custom"];

  elements.categoryFilterRow.innerHTML = categories
    .map((category) => {
      const meta = getCategoryMeta(category === "All" ? "General Knowledge" : category);
      const isActive = state.selectedCategory === category;
      return `
        <button
          type="button"
          class="category-filter-pill ${isActive ? "active" : ""}"
          data-category="${escapeAttribute(category)}"
          aria-pressed="${isActive}"
          style="--category-accent: ${meta.accent};"
        >
          <img class="challenge-category-logo challenge-category-pill-logo" src="${meta.icon}" alt="${escapeAttribute(meta.label)} icon" />
          <span>${escapeHtml(category)}</span>
        </button>
      `;
    })
    .join("");

  elements.categoryFilterRow.querySelectorAll(".category-filter-pill").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCategory = button.dataset.category || "All";
      renderCategoryFilters();
      renderLibrary();
    });
  });
}

function renderLibrary() {
  const filtered = state.selectedCategory === "All"
    ? state.library
    : state.library.filter((challenge) => normalizeCategoryName(challenge.category) === normalizeCategoryName(state.selectedCategory));

  if (!filtered.length) {
    elements.libraryGrid.innerHTML = '<div class="empty-state">No challenges in this category yet. Try another filter or create a new challenge.</div>';
    return;
  }

  elements.libraryGrid.innerHTML = filtered
    .map((challenge, index) => {
      const details = getCategoryMeta(challenge.category);
      const initials = escapeHtml((challenge.title || "Challenge").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || (details.label || "C").slice(0, 2).toUpperCase());
      return `
        <article class="challenge-card card">
          <div class="challenge-card-top">
            <div class="challenge-icon" style="background: ${details.accent};">
              <img class="challenge-category-logo" src="${details.icon}" alt="${escapeAttribute(details.label)} category icon" />
            </div>
            <span class="challenge-pill">
              <img class="challenge-category-logo challenge-category-pill-logo" src="${details.icon}" alt="${escapeAttribute(details.label)} icon" />
              ${escapeHtml(details.label)}
            </span>
          </div>
          <div class="challenge-card-body">
            <h3>${escapeHtml(challenge.title)}</h3>
            <p>${escapeHtml(challenge.description || "A fun challenge waiting to be played.")}</p>
            <div class="challenge-creator">By ${escapeHtml(challenge.createdBy || "Unknown creator")}</div>
          </div>
          <div class="challenge-meta">
            <span>${challenge.questions.length} questions</span>
            <span>${challenge.settings.timerSeconds || 0}s timer</span>
          </div>
          <div class="challenge-card-actions">
            <button class="primary-button" data-action="play" data-index="${index}">Play</button>
            <button class="secondary-button" data-action="edit" data-index="${index}">Edit</button>
            <button class="secondary-button" data-action="export" data-index="${index}">Export</button>
            <button class="secondary-button danger-button" data-action="delete" data-index="${index}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");

  elements.libraryGrid.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const challenge = state.library[index];
      if (!challenge) {
        return;
      }

      const action = button.dataset.action;
      if (action === "play") {
        state.activeChallenge = normalizeChallenge(challenge);
        beginChallengeSession(state.activeChallenge);
        setActiveTab("player");
      }

      if (action === "edit") {
        if (state.hasUnsavedChanges) {
          openUnsavedModal("builder");
          return;
        }

        state.currentChallenge = normalizeChallenge(challenge);
        state.draftBaseline = JSON.stringify(state.currentChallenge);
        state.hasUnsavedChanges = false;
        syncBuilderFromChallenge();
        renderQuestionEditors();
        renderPreview();
        setActiveTab("builder");
      }

      if (action === "export") {
        const blob = new Blob([exportChallenge(challenge)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${slugify(challenge.title || "challenge")}.chq`;
        anchor.click();
        URL.revokeObjectURL(url);
      }

      if (action === "delete") {
        const confirmed = window.confirm(`Delete "${challenge.title}" from your library?`);
        if (!confirmed) {
          return;
        }

        const deletedChallenge = state.library[index];
        const deletedIndex = index;
        state.library = removeChallenge(state.library, index);
        persistLibrary();

        if (state.activeChallenge && state.activeChallenge.title === challenge.title) {
          state.activeChallenge = null;
        }

        renderLibrary();
        renderPlayer();

        showUndoToast(`Deleted "${challenge.title}".`, () => {
          state.library.splice(deletedIndex, 0, deletedChallenge);
          persistLibrary();
          renderLibrary();
          renderPlayer();
        });
      }
    });
  });
}

function renderQuestionEditors() {
  elements.questionList.innerHTML = "";
  const template = document.getElementById("question-editor-template");

  state.currentChallenge.questions.forEach((question, index) => {
    const fragment = template.content.cloneNode(true);
    const questionCard = fragment.querySelector(".question-editor");
    const questionNumber = fragment.querySelector(".question-number");
    const promptField = fragment.querySelector(".question-prompt");
    const typeField = fragment.querySelector(".question-type");
    const difficultyField = fragment.querySelector(".question-difficulty");
    const pointsField = fragment.querySelector(".question-points");
    const explanationField = fragment.querySelector(".question-explanation");
    const dynamicEditor = fragment.querySelector(".dynamic-editor");
    const removeBtn = fragment.querySelector(".remove-question-btn");

    questionNumber.textContent = String(index + 1);
    promptField.value = question.prompt || "";
    typeField.value = question.type;
    difficultyField.value = question.difficulty || "medium";
    pointsField.value = String(question.points || 10);
    explanationField.value = question.explanation || "";

    dynamicEditor.innerHTML = renderDynamicQuestionFields(question);

    const questionImageInput = dynamicEditor.querySelector(".question-image-url");
    const questionUploadInput = dynamicEditor.querySelector(".question-image-upload");
    const questionLinkInput = dynamicEditor.querySelector(".question-link");
    const questionGraphInput = dynamicEditor.querySelector(".question-graph");
    const questionGraphPreview = dynamicEditor.querySelector(".mini-graph-preview");

    questionImageInput?.addEventListener("input", () => {
      state.currentChallenge.questions[index].image = questionImageInput.value.trim();
      markBuilderDirty();
      renderPreview();
    });

    questionUploadInput?.addEventListener("change", async (event) => {
      const [file] = event.target.files;
      if (!file) {
        return;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        state.currentChallenge.questions[index].image = dataUrl;
        questionImageInput.value = dataUrl;
        markBuilderDirty();
        renderPreview();
      } catch (error) {
        alert(`Question image import failed: ${error.message}`);
      }

      event.target.value = "";
    });

    questionLinkInput?.addEventListener("input", () => {
      state.currentChallenge.questions[index].link = questionLinkInput.value.trim();
      markBuilderDirty();
      renderPreview();
    });

    questionGraphInput?.addEventListener("input", () => {
      const rawValues = questionGraphInput.value.split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value));
      state.currentChallenge.questions[index].graph = rawValues.length ? { title: "Quiz data", values: rawValues.slice(0, 8), selectedIndex: 0 } : null;
      markBuilderDirty();
      if (questionGraphPreview) {
        questionGraphPreview.innerHTML = renderQuestionGraphPreview(state.currentChallenge.questions[index]);
        bindMiniGraphBars(questionGraphPreview, index);
      }
      renderPreview();
    });

    bindMiniGraphBars(questionGraphPreview, index);

    promptField.addEventListener("input", () => {
      state.currentChallenge.questions[index].prompt = promptField.value;
      markBuilderDirty();
      renderPreview();
    });

    typeField.addEventListener("change", () => {
      state.currentChallenge.questions[index] = createQuestion(typeField.value);
      state.currentChallenge.questions[index].prompt = question.prompt || "";
      markBuilderDirty();
      renderQuestionEditors();
      renderPreview();
    });

    difficultyField.addEventListener("change", () => {
      state.currentChallenge.questions[index].difficulty = difficultyField.value;
      markBuilderDirty();
      renderPreview();
    });

    pointsField.addEventListener("input", () => {
      state.currentChallenge.questions[index].points = Math.max(1, Number(pointsField.value) || 1);
      markBuilderDirty();
      renderPreview();
    });

    explanationField.addEventListener("input", () => {
      state.currentChallenge.questions[index].explanation = explanationField.value;
      markBuilderDirty();
      renderPreview();
    });

    bindDynamicQuestionEditors(dynamicEditor, index);

    removeBtn.addEventListener("click", () => {
      if (state.currentChallenge.questions.length > 1) {
        state.currentChallenge.questions.splice(index, 1);
        renderQuestionEditors();
        renderPreview();
      }
    });

    elements.questionList.appendChild(fragment);
  });
}

function bindDynamicQuestionEditors(container, questionIndex) {
  const question = state.currentChallenge.questions[questionIndex];
  if (!question) {
    return;
  }

  if (question.type === "multiple-choice") {
    const choiceRows = [...container.querySelectorAll(".choice-row")];
    choiceRows.forEach((row, choiceIndex) => {
      const input = row.querySelector("input.choice-value");
      const correctToggle = row.querySelector("input.choice-correct");
      input.value = question.choices[choiceIndex] || "";
      correctToggle.checked = Number(question.correctAnswer) === choiceIndex;
      input.addEventListener("input", () => {
        state.currentChallenge.questions[questionIndex].choices[choiceIndex] = input.value || `Option ${choiceIndex + 1}`;
        markBuilderDirty();
        renderPreview();
      });
      correctToggle.addEventListener("change", () => {
        if (correctToggle.checked) {
          state.currentChallenge.questions[questionIndex].correctAnswer = choiceIndex;
          markBuilderDirty();
          renderDynamicQuestionFields(question);
          renderQuestionEditors();
        }
      });
    });

    const addChoiceBtn = container.querySelector(".add-choice-btn");
    addChoiceBtn?.addEventListener("click", () => {
      state.currentChallenge.questions[questionIndex].choices.push(`Option ${state.currentChallenge.questions[questionIndex].choices.length + 1}`);
      markBuilderDirty();
      renderQuestionEditors();
      renderPreview();
    });
  }

  if (question.type === "true-false") {
    const answer = container.querySelector("select.answer-select");
    answer.value = String(question.correctAnswer);
    answer.addEventListener("change", () => {
      state.currentChallenge.questions[questionIndex].correctAnswer = answer.value === "true";
      markBuilderDirty();
      renderPreview();
    });
  }

  if (question.type === "identification") {
    const input = container.querySelector("input.answer-input");
    input.value = question.correctAnswer || "";
    input.addEventListener("input", () => {
      state.currentChallenge.questions[questionIndex].correctAnswer = input.value;
      markBuilderDirty();
      renderPreview();
    });
  }

  if (question.type === "matching") {
    const matchRows = [...container.querySelectorAll(".matching-row")];
    matchRows.forEach((row, pairIndex) => {
      const leftInput = row.querySelector("input.match-left");
      const rightInput = row.querySelector("input.match-right");
      const pair = question.pairs[pairIndex] || { left: "", right: "" };
      leftInput.value = pair.left || "";
      rightInput.value = pair.right || "";
      leftInput.addEventListener("input", () => {
        state.currentChallenge.questions[questionIndex].pairs[pairIndex].left = leftInput.value;
        markBuilderDirty();
        renderPreview();
      });
      rightInput.addEventListener("input", () => {
        state.currentChallenge.questions[questionIndex].pairs[pairIndex].right = rightInput.value;
        markBuilderDirty();
        renderPreview();
      });
    });

    const addPairBtn = container.querySelector(".add-pair-btn");
    addPairBtn?.addEventListener("click", () => {
      state.currentChallenge.questions[questionIndex].pairs.push({ left: "", right: "" });
      markBuilderDirty();
      renderQuestionEditors();
      renderPreview();
    });
  }

  if (question.type === "ordering") {
    const orderingRows = [...container.querySelectorAll(".ordering-row")];
    orderingRows.forEach((row, itemIndex) => {
      const input = row.querySelector("input.order-item");
      input.value = question.items[itemIndex] || "";
      input.addEventListener("input", () => {
        state.currentChallenge.questions[questionIndex].items[itemIndex] = input.value;
        markBuilderDirty();
        renderPreview();
      });
    });

    const addItemBtn = container.querySelector(".add-order-btn");
    addItemBtn?.addEventListener("click", () => {
      state.currentChallenge.questions[questionIndex].items.push(`Item ${state.currentChallenge.questions[questionIndex].items.length + 1}`);
      state.currentChallenge.questions[questionIndex].correctOrder = [...state.currentChallenge.questions[questionIndex].items];
      markBuilderDirty();
      renderQuestionEditors();
      renderPreview();
    });
  }

  if (question.type === "logic-puzzle") {
    const scenarioInput = container.querySelector("textarea.logic-scenario");
    const answerInput = container.querySelector("input.logic-answer");
    scenarioInput.value = question.scenario || "";
    answerInput.value = question.answer || "";
    scenarioInput.addEventListener("input", () => {
      state.currentChallenge.questions[questionIndex].scenario = scenarioInput.value;
      markBuilderDirty();
      renderPreview();
    });
    answerInput.addEventListener("input", () => {
      state.currentChallenge.questions[questionIndex].answer = answerInput.value;
      markBuilderDirty();
      renderPreview();
    });
  }
}

function bindMiniGraphBars(container, questionIndex) {
  if (!container) {
    return;
  }

  const bars = container.querySelectorAll(".mini-graph-bar");
  bars.forEach((bar) => {
    bar.addEventListener("click", () => {
      const index = Number(bar.dataset.graphIndex);
      if (!Number.isInteger(index)) {
        return;
      }

      if (!state.currentChallenge.questions[questionIndex]?.graph) {
        return;
      }

      state.currentChallenge.questions[questionIndex].graph.selectedIndex = index;
      markBuilderDirty();
      renderPreview();
      const refreshed = renderQuestionGraphPreview(state.currentChallenge.questions[questionIndex]);
      container.innerHTML = refreshed;
      bindMiniGraphBars(container, questionIndex);
    });
  });
}

function renderQuestionGraphPreview(question) {
  const values = Array.isArray(question.graph?.values) ? question.graph.values.filter((value) => Number.isFinite(Number(value))).slice(0, 8) : [];
  if (!values.length) {
    return '<div class="mini-graph-preview empty">No graph data yet.</div>';
  }

  const maxValue = Math.max(...values, 1);
  return `
    <div class="mini-graph-preview" aria-label="Graph preview">
      <div class="mini-graph-bars">
        ${values.map((value, index) => `
          <button
            type="button"
            class="mini-graph-bar ${question.graph?.selectedIndex === index ? 'is-selected' : ''}"
            style="height: ${Math.max(18, (Number(value) / maxValue) * 100)}%;"
            title="${escapeHtml(String(value))}"
            data-graph-index="${index}"
          ></button>
        `).join("")}
      </div>
      <span class="mini-graph-label">${escapeHtml(question.graph?.title || "Data")}</span>
    </div>
  `;
}

function renderDynamicQuestionFields(question) {
  const visualSection = `
    <div class="question-visual-card">
      <div class="question-visual-row">
        <label class="visual-field">
          <span>Image URL</span>
          <input class="question-image-url" type="url" value="${escapeAttribute(question.image || "")}" placeholder="https://example.com/image.jpg" />
        </label>
        <label class="visual-field">
          <span>Reference link</span>
          <input class="question-link" type="url" value="${escapeAttribute(question.link || "")}" placeholder="https://example.com" />
        </label>
      </div>
      <div class="question-visual-row image-row">
        <label class="visual-upload">
          <input class="question-image-upload" type="file" accept="image/*" />
          <span>Upload image</span>
        </label>
        <label class="visual-field graph-field">
          <span>Graph values</span>
          <input class="question-graph" type="text" value="${escapeAttribute(Array.isArray(question.graph?.values) ? question.graph.values.join(", ") : "")}" placeholder="4, 6, 8" />
        </label>
      </div>
      ${renderQuestionGraphPreview(question)}
    </div>
  `;

  switch (question.type) {
    case "multiple-choice":
      return `
        ${visualSection}
        <div class="choice-list">
          ${(question.choices || []).map((choice, index) => `
            <div class="choice-row">
              <input class="choice-value choice-value-input" type="text" value="${escapeAttribute(choice)}" />
              <label class="choice-correct-wrap">
                <span>Correct</span>
                <input class="choice-correct" type="radio" name="correct-${question.id}" ${Number(question.correctAnswer) === index ? "checked" : ""} />
              </label>
            </div>
          `).join("")}
          <button class="inline-button add-choice-btn" type="button">Add choice</button>
        </div>
      `;
    case "true-false":
      return `
        ${visualSection}
        <label>
          <span>Correct answer</span>
          <select class="answer-select">
            <option value="true" ${question.correctAnswer === true ? "selected" : ""}>True</option>
            <option value="false" ${question.correctAnswer === false ? "selected" : ""}>False</option>
          </select>
        </label>
      `;
    case "identification":
      return `
        ${visualSection}
        <label>
          <span>Expected answer</span>
          <input class="answer-input" type="text" value="${escapeAttribute(question.correctAnswer || "")}" />
        </label>
      `;
    case "matching":
      return `
        ${visualSection}
        <div class="matching-list">
          ${(question.pairs || []).map((pair, index) => `
            <div class="matching-row">
              <input class="match-left" type="text" value="${escapeAttribute(pair.left || "")}" placeholder="Left item" />
              <input class="match-right" type="text" value="${escapeAttribute(pair.right || "")}" placeholder="Right item" />
              <button class="inline-button" type="button">Pair ${index + 1}</button>
            </div>
          `).join("")}
          <button class="inline-button add-pair-btn" type="button">Add pair</button>
        </div>
      `;
    case "ordering":
      return `
        ${visualSection}
        <div class="ordering-list">
          ${(question.items || []).map((item, index) => `
            <div class="ordering-row">
              <input class="order-item" type="text" value="${escapeAttribute(item)}" placeholder="Item ${index + 1}" />
              <span>#${index + 1}</span>
            </div>
          `).join("")}
          <button class="inline-button add-order-btn" type="button">Add item</button>
        </div>
      `;
    case "logic-puzzle":
      return `
        ${visualSection}
        <label class="full-width">
          <span>Scenario</span>
          <textarea class="logic-scenario" rows="3">${escapeHtml(question.scenario || "")}</textarea>
        </label>
        <label>
          <span>Answer</span>
          <input class="logic-answer" type="text" value="${escapeAttribute(question.answer || "")}" />
        </label>
      `;
    default:
      return "";
  }
}

function renderQuestionVisualMarkup(question) {
  if (!question) {
    return "";
  }

  const media = [];
  if (question.image) {
    media.push(`<img class="question-visual-image" src="${escapeAttribute(question.image)}" alt="${escapeHtml(question.prompt || "Question visual")}" />`);
  }
  if (question.graph?.values?.length) {
    media.push(renderQuestionGraphPreview(question));
  }
  if (question.link) {
    media.push(`<a class="preview-link question-reference-link" href="${escapeAttribute(question.link)}" target="_blank" rel="noreferrer">Open reference</a>`);
  }

  return media.length ? `<div class="question-visual-stack">${media.join("")}</div>` : "";
}

function renderPreview() {
  const challenge = normalizeChallenge(state.currentChallenge);
  elements.challengeTitle.value = challenge.title;
  elements.challengeCategory.value = challenge.category;
  elements.challengeDescription.value = challenge.description;
  elements.challengeInstructions.value = challenge.instructions;
  elements.randomize.checked = challenge.settings.randomizeQuestions;
  elements.feedback.checked = challenge.settings.revealFeedback;
  elements.retry.checked = challenge.settings.allowRetry;
  elements.timer.value = challenge.settings.timerSeconds || 0;

  const questionSummary = challenge.questions
    .map((question, index) => {
      const visualMarkup = renderQuestionVisualMarkup(question).replace('question-visual-stack', 'question-visual-stack preview-visual-stack');
      return `
        <div class="preview-item">
          <strong>${index + 1}.</strong> ${escapeHtml(question.prompt)}
          ${visualMarkup || ""}
        </div>
      `;
    })
    .join("");

  const categoryMeta = getCategoryMeta(challenge.category);

  elements.preview.innerHTML = `
    <div class="preview-header">
      <div>
        <h3>${escapeHtml(challenge.title)}</h3>
        <small class="preview-category-meta">
          <img class="challenge-category-logo preview-category-logo" src="${categoryMeta.icon}" alt="${escapeAttribute(categoryMeta.label)} icon" />
          ${escapeHtml(categoryMeta.label)}
        </small>
      </div>
      <span class="challenge-pill">
        <img class="challenge-category-logo challenge-category-pill-logo" src="${categoryMeta.icon}" alt="${escapeAttribute(categoryMeta.label)} icon" />
        ${challenge.questions.length} questions
      </span>
    </div>
    <p>${escapeHtml(challenge.description || "A challenge ready to share.")}</p>
    <div class="preview-list">${questionSummary || "<div class='preview-item'>No questions yet.</div>"}</div>
  `;
}

function beginChallengeSession(challenge) {
  const normalized = normalizeChallenge(challenge);
  state.activeChallenge = normalized;
  state.playerSession = {
    challenge: normalized,
    responses: Array(normalized.questions.length).fill(undefined),
    currentIndex: 0,
    completed: false,
    score: 0,
    total: 0,
    finishedAt: null,
  };
  renderPlayer();
}

function renderPlayer() {
  const challenge = state.playerSession?.challenge || state.activeChallenge || state.currentChallenge;
  if (!challenge) {
    elements.playerTitle.textContent = "Ready to play";
    elements.playArea.innerHTML = '<div class="empty-state">Select a challenge from the library or create one in the builder.</div>';
    return;
  }

  elements.playerTitle.textContent = challenge.title;

  if (!state.playerSession || state.playerSession.completed) {
    const scoreBox = state.playerSession && state.playerSession.completed
      ? `<div class="summary-panel">
          <div>Final score</div>
          <div class="summary-score">${state.playerSession.score} / ${state.playerSession.total}</div>
          <div>${state.playerSession.correctCount} correct answers</div>
          <div class="primary-button" role="button" onclick="window.location.hash = '#player';">Play again</div>
        </div>`
      : "";

    elements.playArea.innerHTML = `
      <div class="quiz-shell">
        <div class="quiz-header">
          <div>
            <h2>${escapeHtml(challenge.title)}</h2>
            <p>${escapeHtml(challenge.description || challenge.instructions)}</p>
          </div>
          <span class="challenge-pill">${challenge.questions.length} questions</span>
        </div>
        <div class="quiz-card">
          <div class="question-text">${escapeHtml(challenge.instructions || "Answer each question carefully.")}</div>
          ${scoreBox || '<button class="primary-button" id="start-session-button">Start challenge</button>'}
        </div>
      </div>
    `;

    const startButton = document.getElementById("start-session-button");
    startButton?.addEventListener("click", () => beginChallengeSession(challenge));
    return;
  }

  const question = challenge.questions[state.playerSession.currentIndex];
  if (!question) {
    finishChallengeSession();
    return;
  }

  const progressLabel = `Question ${state.playerSession.currentIndex + 1} of ${challenge.questions.length}`;
  elements.playArea.innerHTML = `
    <div class="quiz-shell">
      <div class="quiz-header">
        <div class="quiz-progress">${progressLabel}</div>
        <div class="challenge-pill">${question.difficulty}</div>
      </div>
      <div class="quiz-card">
        <div class="question-text">${escapeHtml(question.prompt)}</div>
        ${renderQuestionVisualMarkup(question)}
        ${renderQuestionResponseComponent(question, state.playerSession.responses[state.playerSession.currentIndex])}
        <div class="player-actions" style="margin-top: 16px;">
          <button class="primary-button" id="submit-answer-btn">Submit answer</button>
          <button class="secondary-button" id="skip-btn">Skip</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("submit-answer-btn").addEventListener("click", () => handleAnswerSubmission());
  document.getElementById("skip-btn").addEventListener("click", () => {
    state.playerSession.responses[state.playerSession.currentIndex] = undefined;
    advancePlayer();
  });
}

function formatChoiceMarkup(choice) {
  const text = String(choice ?? "");
  const codeLike = /(\b(const|let|var|return|function|if|else|console|=>|\{\}|\[\]|;|\(|\)|\{|\})|\n)/.test(text)
    || (text.length > 12 && /[=<>()[\]{};:+-]/.test(text));

  if (!codeLike) {
    return `<span class="choice-text">${escapeHtml(text)}</span>`;
  }

  return `<code class="choice-code">${escapeHtml(text).replace(/\n/g, "<br>")}</code>`;
}

function renderQuestionResponseComponent(question, currentValue) {
  const base = {
    "multiple-choice": `
      <div class="answer-stack">
        ${(question.choices || []).map((choice, index) => `
          <label class="answer-option">
            <input type="radio" name="question-${question.id}" value="${index}" ${Number(currentValue) === index ? "checked" : ""} />
            <span class="answer-option-body">${formatChoiceMarkup(choice)}</span>
          </label>
        `).join("")}
      </div>
    `,
    "true-false": `
      <div class="answer-stack">
        <label class="answer-option">
          <input type="radio" name="question-${question.id}" value="true" ${currentValue === true ? "checked" : ""} />
          <span>True</span>
        </label>
        <label class="answer-option">
          <input type="radio" name="question-${question.id}" value="false" ${currentValue === false ? "checked" : ""} />
          <span>False</span>
        </label>
      </div>
    `,
    identification: `
      <div class="answer-blank">
        <input type="text" value="${escapeAttribute(currentValue ?? "")}" data-typed-answer="true" placeholder="Type your answer" />
      </div>
    `,
    matching: `
      <div class="answer-stack">
        ${(question.pairs || []).map((pair, index) => `
          <div class="answer-match">
            <span>${escapeHtml(pair.left)}</span>
            <input type="text" data-match-index="${index}" value="${escapeAttribute((currentValue && currentValue[index]) || "")}" placeholder="Match" />
          </div>
        `).join("")}
      </div>
    `,
    ordering: `
      <div class="answer-stack">
        ${(question.items || []).map((item, index) => `
          <div class="answer-match">
            <span>${escapeHtml(item)}</span>
            <input type="text" data-order-index="${index}" value="${escapeAttribute((currentValue && currentValue[index]) || "")}" placeholder="Order ${index + 1}" />
          </div>
        `).join("")}
      </div>
    `,
    "logic-puzzle": `
      <div class="answer-blank">
        <input type="text" value="${escapeAttribute(currentValue ?? "")}" data-typed-answer="true" placeholder="Provide your conclusion" />
      </div>
    `,
  };

  return base[question.type] || "";
}

function handleAnswerSubmission() {
  const question = state.playerSession.challenge.questions[state.playerSession.currentIndex];
  const response = readQuestionResponse(question);
  state.playerSession.responses[state.playerSession.currentIndex] = response;

  if (state.playerSession.challenge.settings.revealFeedback) {
    const score = question.points || 0;
    const currentCorrect = isAnswerCorrect(question, response);
    const message = currentCorrect ? `Correct! +${score} points` : `Not quite. ${question.explanation || "Review the prompt and try again."}`;
    elements.playArea.innerHTML = `
      <div class="quiz-shell">
        <div class="feedback-banner ${currentCorrect ? "feedback-correct" : "feedback-incorrect"}">${message}</div>
        <div class="quiz-card">
          <div class="question-text">${escapeHtml(question.prompt)}</div>
          ${renderQuestionVisualMarkup(question)}
          <p><strong>Answer:</strong> ${escapeHtml(explainAnswer(question))}</p>
          <button class="primary-button" id="next-question-btn">${state.playerSession.currentIndex === state.playerSession.challenge.questions.length - 1 ? "Finish challenge" : "Next question"}</button>
        </div>
      </div>
    `;
    document.getElementById("next-question-btn").addEventListener("click", advancePlayer);
    return;
  }

  advancePlayer();
}

function advancePlayer() {
  if (state.playerSession.currentIndex >= state.playerSession.challenge.questions.length - 1) {
    finishChallengeSession();
    return;
  }

  state.playerSession.currentIndex += 1;
  renderPlayer();
}

function renderProgressSummary() {
  const progress = state.progress || createDefaultProgress();
  const bestScore = progress.personalBests.length
    ? Math.max(...progress.personalBests.map((entry) => Number(entry.score) || 0))
    : 0;

  if (!elements.progressSummary) {
    return;
  }

  const accountName = state.account?.name || "Player";
  const accountId = state.account?.id || "n/a";

  elements.progressSummary.innerHTML = `
    <div class="progress-header">
      <div>
        <p class="eyebrow">Local progression</p>
        <h2>${escapeHtml(progress.title || "Rookie Explorer")}</h2>
      </div>
      <div class="profile-pill-stack">
        <span class="challenge-pill">${progress.xp} XP</span>
        <span class="account-pill">${escapeHtml(accountName)} · ${escapeHtml(accountId.slice(0, 8))}</span>
      </div>
    </div>
    <div class="progress-grid">
      <div><strong>Level ${progress.level}</strong><small>Progress tier</small></div>
      <div><strong>${progress.completedChallenges.length}</strong><small>Completed</small></div>
      <div><strong>${bestScore}</strong><small>Best score</small></div>
    </div>
  `;

  renderProgressView();
}

function createProgressGraphMarkup(trendPoints = []) {
  const width = 540;
  const height = 190;
  const padding = { top: 18, right: 18, bottom: 28, left: 18 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const values = trendPoints.map((point) => Number(point.value) || 0);
  const maxValue = Math.max(100, ...values, 0);

  const points = trendPoints.map((point, index) => {
    const x = padding.left + (innerWidth / Math.max(1, trendPoints.length - 1)) * index;
    const y = padding.top + innerHeight - ((Number(point.value) || 0) / maxValue) * innerHeight;
    return { ...point, x, y };
  });

  const linePath = points.length
    ? points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
    : "";
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : "";
  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const y = padding.top + (innerHeight / 3) * index;
    return `<line class="graph-grid-line" x1="${padding.left}" x2="${width - padding.right}" y1="${y}" y2="${y}" />`;
  }).join("");
  const axisLabels = points.length ? points.map((point, index) => `<span class="graph-axis-label">${index + 1}</span>`).join("") : '<span class="graph-axis-label">Start</span>';
  const averageLabel = values.length ? `${Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)}% avg` : "No data";

  return `
    <div class="progress-graph-card">
      <div class="progress-graph-header">
        <div>
          <p class="eyebrow">Performance trend</p>
          <h3>Learning graph</h3>
        </div>
        <span class="progress-graph-badge">${averageLabel}</span>
      </div>
      <svg class="progress-graph-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Subject progression graph">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#6aa9ff" />
            <stop offset="100%" stop-color="#77d8ff" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(106, 169, 255, 0.35)" />
            <stop offset="100%" stop-color="rgba(106, 169, 255, 0.03)" />
          </linearGradient>
          <filter id="graphGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="rgba(87, 129, 255, 0.28)" />
          </filter>
        </defs>
        <g>
          ${gridLines}
          <line x1="${padding.left}" x2="${width - padding.right}" y1="${height - padding.bottom}" y2="${height - padding.bottom}" class="graph-base-line" />
          <line x1="${padding.left}" x2="${padding.left}" y1="${padding.top}" y2="${height - padding.bottom}" class="graph-base-line" />
        </g>
        ${points.length ? `
          <path d="${areaPath}" fill="url(#areaGradient)" />
          <path d="${linePath}" fill="none" stroke="url(#lineGradient)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#graphGlow)" />
          ${points.map((point) => `
            <circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#ffffff" stroke="#5d7af9" stroke-width="3" />
          `).join("")}
        ` : `
          <text x="50%" y="52%" text-anchor="middle" fill="rgba(118, 130, 164, 0.9)" font-size="14" font-family="Arial, sans-serif">No challenge history yet</text>
        `}
      </svg>
      <div class="graph-axis-labels">${axisLabels}</div>
    </div>
  `;
}

function renderProgressView() {
  const progress = state.progress || createDefaultProgress();
  const subjectBreakdown = summarizeSubjectProgress(progress.history || []);
  const trend = summarizeProgressTrend(progress.history || []);
  const graphPoints = [...(trend.points || [])].reverse();
  const averageAccuracy = progress.history.length
    ? Math.round(progress.history.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0) / progress.history.length)
    : 0;

  if (!elements.progressView || !elements.progressAnalytics) {
    return;
  }

  const breakdownMarkup = subjectBreakdown.length
    ? subjectBreakdown.slice(0, 5).map((subject) => `
        <div class="subject-metric">
          <div class="subject-metric-topline">
            <span>${escapeHtml(subject.category)}</span>
            <strong>${subject.averageAccuracy}%</strong>
          </div>
          <div class="subject-metric-bar"><span style="width: ${Math.max(10, subject.averageAccuracy)}%; background: ${getCategoryMeta(subject.category).accent};"></span></div>
        </div>
      `).join("")
    : '<div class="empty-state">No subject history yet. Finish some challenges to see trends.</div>';

  elements.progressAnalytics.innerHTML = `
    <div class="progress-insights-grid">
      <div class="mini-feature-card">
        <strong>${progress.history.length}</strong>
        <span>Sessions</span>
      </div>
      <div class="mini-feature-card">
        <strong>${averageAccuracy}%</strong>
        <span>Average accuracy</span>
      </div>
      <div class="mini-feature-card">
        <strong>${state.progress.completedChallenges?.length || 0}</strong>
        <span>Completed</span>
      </div>
      <div class="mini-feature-card">
        <strong>${Math.max(1, progress.level)}</strong>
        <span>Level</span>
      </div>
    </div>
    ${createProgressGraphMarkup(graphPoints)}
    <div class="subject-progress-card">
      <div class="progress-section-header">
        <h3>Top subjects</h3>
        <span>${graphPoints[graphPoints.length - 1]?.value || trend.latest || 0}% latest</span>
      </div>
      ${breakdownMarkup}
    </div>
  `;
}

function updateProgressAfterChallenge(challenge, result) {
  const progress = state.progress || createDefaultProgress();
  const xpGain = Math.max(25, Math.round((result.percentage / 100) * 60 + result.correctCount * 12));
  const challengeKey = `${challenge.title}::${challenge.category}`;
  const historyEntry = {
    challenge: challenge.title,
    category: challenge.category,
    score: result.score,
    total: result.totalPoints,
    percentage: result.percentage,
    completedAt: new Date().toISOString(),
  };

  progress.history = [historyEntry, ...progress.history].slice(0, 24);
  progress.completedChallenges = progress.completedChallenges.includes(challengeKey)
    ? progress.completedChallenges
    : [challengeKey, ...progress.completedChallenges].slice(0, 48);
  progress.personalBests = [...(progress.personalBests || []), { ...historyEntry, challengeKey }]
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
    .slice(0, 6);

  progress.xp += xpGain;
  progress.level = Math.max(1, 1 + Math.floor(progress.xp / 100));
  progress.title = [
    "Rookie Explorer",
    "Curious Scout",
    "Challenge Builder",
    "Talent Tracker",
    "Quest Master",
    "Legendary Strategist",
  ][Math.min(5, Math.floor(progress.level / 2))];

  progress.analytics = {
    completedCount: progress.history.length,
    averageAccuracy: progress.history.length ? Math.round(progress.history.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0) / progress.history.length) : 0,
    averageMinutes: progress.history.length ? Math.round(progress.history.length * 2.5) : 0,
  };
  progress.subjectBreakdown = summarizeSubjectProgress(progress.history || []);

  state.progress = progress;
  saveProgression();
  renderProgressSummary();
}

function finishChallengeSession() {
  const challenge = state.playerSession.challenge;
  const result = calculateScore(challenge, state.playerSession.responses);
  state.playerSession.completed = true;
  state.playerSession.score = result.score;
  state.playerSession.total = result.totalPoints;
  state.playerSession.correctCount = result.correctCount;
  updateProgressAfterChallenge(challenge, result);
  elements.playerTitle.textContent = `${challenge.title} complete`;
  elements.playArea.innerHTML = `
    <div class="summary-panel">
      <div class="eyebrow">Challenge summary</div>
      <h2>${escapeHtml(challenge.title)}</h2>
      <div class="summary-score">${result.score} / ${result.totalPoints}</div>
      <div>You got ${result.correctCount} out of ${challenge.questions.length} right.</div>
      <div>${result.percentage}% accuracy</div>
      <div class="player-actions">
        <button class="primary-button" id="play-again-btn">Play again</button>
        <button class="secondary-button" id="builder-return-btn">Back to builder</button>
      </div>
    </div>
  `;

  document.getElementById("play-again-btn").addEventListener("click", () => beginChallengeSession(challenge));
  document.getElementById("builder-return-btn").addEventListener("click", () => setActiveTab("builder"));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("The selected image could not be read."));
    };
    reader.onerror = () => reject(new Error("The selected image could not be processed."));
    reader.readAsDataURL(file);
  });
}

function readQuestionResponse(question) {
  const inputNodes = [...document.querySelectorAll("[name='question-" + question.id + "']")];
  if (question.type === "multiple-choice") {
    const selected = inputNodes.find((input) => input.checked);
    return selected ? Number(selected.value) : undefined;
  }
  if (question.type === "true-false") {
    const selected = inputNodes.find((input) => input.checked);
    return selected ? selected.value === "true" : undefined;
  }
  if (question.type === "identification" || question.type === "logic-puzzle") {
    const input = document.querySelector("[data-typed-answer]");
    return input ? input.value : undefined;
  }
  if (question.type === "matching") {
    return Array.from(document.querySelectorAll("[data-match-index]"), (input) => input.value);
  }
  if (question.type === "ordering") {
    return Array.from(document.querySelectorAll("[data-order-index]"), (input) => input.value);
  }

  return undefined;
}

function explainAnswer(question) {
  switch (question.type) {
    case "multiple-choice":
      return question.choices[Number(question.correctAnswer)] || "N/A";
    case "true-false":
      return question.correctAnswer ? "True" : "False";
    case "identification":
      return question.correctAnswer;
    case "matching":
      return (question.pairs || []).map((pair) => `${pair.left} → ${pair.right}`).join(", ");
    case "ordering":
      return (question.correctOrder || question.items || []).join(" → ");
    case "logic-puzzle":
      return question.answer;
    default:
      return "The answer is provided in the challenge explanation.";
  }
}

function syncBuilderFromChallenge() {
  const challenge = normalizeChallenge(state.currentChallenge);
  state.currentChallenge = challenge;
  elements.challengeTitle.value = challenge.title || "";
  elements.challengeCategory.value = challenge.category || "General Knowledge";
  elements.challengeCreatedBy.value = resolveCreatorName(challenge.createdBy, state.account?.name || "Player");
  elements.challengeDescription.value = challenge.description || "";
  elements.challengeInstructions.value = challenge.instructions || "";
  elements.randomize.checked = Boolean(challenge.settings.randomizeQuestions);
  elements.feedback.checked = challenge.settings.revealFeedback !== false;
  elements.retry.checked = Boolean(challenge.settings.allowRetry);
  elements.timer.value = challenge.settings.timerSeconds || 0;
}

function initTheme() {
  const storedTheme = localStorage.getItem("questra-theme") || localStorage.getItem("challengehub-theme");
  const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const activeTheme = storedTheme || (preferredDark ? "dark" : "light");
  setTheme(activeTheme, false);
}

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.textContent = theme === "dark" ? "☀️" : "🌙";
    toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  if (persist) {
    localStorage.setItem("questra-theme", theme);
    localStorage.setItem("challengehub-theme", theme);
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("library")) {
        db.createObjectStore("library", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open IndexedDB."));
  });
}

function saveAccount() {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(state.account));
  if (elements.accountNameInput) {
    elements.accountNameInput.value = state.account.name || "Player";
  }
}

function loadAccount() {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) {
      const created = createDefaultAccount();
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(created));
      return created;
    }
    return { ...createDefaultAccount(), ...JSON.parse(raw) };
  } catch (error) {
    console.warn("Unable to load account.", error);
    return createDefaultAccount();
  }
}

function saveProgression() {
  const payload = { id: "profile", ...state.progress };
  localStorage.setItem(PROGRESSION_KEY, JSON.stringify(state.progress));

  openDatabase().then((db) => {
    if (!db) {
      return;
    }
    const tx = db.transaction("progress", "readwrite");
    tx.objectStore("progress").put(payload);
  }).catch(() => {});
}

function loadProgression() {
  try {
    const raw = localStorage.getItem(PROGRESSION_KEY);
    if (raw) {
      const loaded = { ...createDefaultProgress(), ...JSON.parse(raw) };
      loaded.subjectBreakdown = summarizeSubjectProgress(loaded.history || []);
      return loaded;
    }
  } catch (error) {
    console.warn("Unable to read progression from localStorage.", error);
  }

  return createDefaultProgress();
}

function getStorageSafeLibrary(items) {
  function stripEmbeddedImages(value) {
    if (Array.isArray(value)) {
      return value.map(stripEmbeddedImages);
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => {
      if (key === "image" && typeof entryValue === "string" && entryValue.startsWith("data:image/")) {
        return [key, ""];
      }

      return [key, stripEmbeddedImages(entryValue)];
    }));
  }

  return (Array.isArray(items) ? items : []).map((challenge) => stripEmbeddedImages(challenge));
}

function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items.map((item) => normalizeChallenge(item)) : [];
  } catch (error) {
    console.warn("Unable to load saved challenges", error);
    return [];
  }
}

function writeCompactLibrarySnapshot(library) {
  const safeLibrary = getStorageSafeLibrary(Array.isArray(library) ? library : []);

  try {
    const serialized = JSON.stringify(safeLibrary);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.warn("LocalStorage quota exceeded; storing challenge library without embedded image data.", error);
    const fallbackLibrary = safeLibrary.map((challenge) => ({ ...challenge, image: "" }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackLibrary));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(fallbackLibrary));
      return true;
    } catch (innerError) {
      console.warn("Unable to persist challenge library to localStorage.", innerError);
      return false;
    }
  }
}

function loadIndexedLibrary() {
  openDatabase().then((db) => {
    if (!db) {
      return;
    }

    const tx = db.transaction("library", "readonly");
    const request = tx.objectStore("library").get("main");
    request.onsuccess = () => {
      const preservedLibrary = Array.isArray(request.result?.value) ? request.result.value : [];
      const localLibrary = loadLibrary();
      const preferredLibrary = preservedLibrary.length ? preservedLibrary : localLibrary;

      if (!preferredLibrary.length) {
        return;
      }

      state.library = preferredLibrary.map((item) => normalizeChallenge(item));
      writeCompactLibrarySnapshot(state.library);

      if (state.currentChallenge && !state.currentChallenge.title) {
        state.currentChallenge = state.library[0] || createDefaultChallenge();
        syncBuilderFromChallenge();
      }

      renderLibrary();
      renderPreview();
      renderPlayer();
    };
  }).catch(() => {});
}

function persistLibrary() {
  writeCompactLibrarySnapshot(state.library);

  openDatabase().then((db) => {
    if (!db) {
      return;
    }
    const tx = db.transaction("library", "readwrite");
    tx.objectStore("library").put({ id: "main", value: state.library });
  }).catch(() => {});
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "challenge";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function eventsToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.right = "18px";
  toast.style.bottom = "18px";
  toast.style.background = "#1f2a44";
  toast.style.color = "white";
  toast.style.padding = "10px 14px";
  toast.style.borderRadius = "12px";
  toast.style.boxShadow = "0 12px 24px rgba(20, 24, 35, 0.2)";
  toast.style.zIndex = "999";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

function showUndoToast(message, undoAction) {
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.right = "18px";
  toast.style.bottom = "18px";
  toast.style.zIndex = "999";
  toast.style.background = "#13233d";
  toast.style.color = "#edf5ff";
  toast.style.border = "1px solid rgba(125, 179, 255, 0.24)";
  toast.style.borderRadius = "12px";
  toast.style.boxShadow = "0 18px 30px rgba(16, 25, 42, 0.22)";
  toast.style.padding = "10px 12px";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "12px";
  toast.style.maxWidth = "330px";

  const label = document.createElement("span");
  label.textContent = message;
  label.style.fontSize = "0.9rem";
  label.style.lineHeight = "1.4";

  const undoButton = document.createElement("button");
  undoButton.textContent = "Undo";
  undoButton.type = "button";
  undoButton.style.background = "#7db3ff";
  undoButton.style.color = "#10213f";
  undoButton.style.border = "none";
  undoButton.style.borderRadius = "999px";
  undoButton.style.padding = "7px 12px";
  undoButton.style.fontWeight = "700";
  undoButton.style.cursor = "pointer";

  undoButton.addEventListener("click", () => {
    undoAction();
    toast.remove();
  });

  toast.appendChild(label);
  toast.appendChild(undoButton);
  document.body.appendChild(toast);

  const timeoutId = setTimeout(() => toast.remove(), 3600);
  toast.addEventListener("mouseenter", () => clearTimeout(timeoutId));
  toast.addEventListener("mouseleave", () => {
    if (document.body.contains(toast)) {
      setTimeout(() => toast.remove(), 200);
    }
  });
}

function registerOfflineSupport() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined)
      .finally(() => {
        navigator.serviceWorker.register("./service-worker.js?v=7").catch(() => {
          console.warn("Service worker registration skipped.");
        });
      });
  });
}

window.state = state;
window.CHQ_VERSION = CHQ_VERSION;
