export const CHQ_VERSION = "1.0";

function generateChallengeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `challenge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function resolveCreatorName(rawCreator, fallbackName = "") {
  const trimmedCreator = typeof rawCreator === "string" ? rawCreator.trim() : "";
  if (trimmedCreator) {
    return trimmedCreator;
  }

  const trimmedFallback = typeof fallbackName === "string" ? fallbackName.trim() : "";
  return trimmedFallback || "Player";
}

export function createDefaultChallenge() {
  return {
    id: generateChallengeId(),
    version: CHQ_VERSION,
    title: "New Challenge",
    description: "A custom challenge for your audience.",
    category: "General Knowledge",
    image: "",
    createdBy: "",
    creatorLocked: false,
    instructions: "Answer each question to the best of your ability.",
    settings: {
      randomizeQuestions: false,
      revealFeedback: true,
      allowRetry: false,
      timerSeconds: 0,
    },
    questions: [createQuestion("multiple-choice")],
  };
}

export function createQuestion(type = "multiple-choice") {
  const base = {
    id: crypto.randomUUID ? crypto.randomUUID() : `question-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    prompt: "Write your question here.",
    difficulty: "medium",
    points: 10,
    explanation: "",
    image: "",
    link: "",
    graph: null,
  };

  switch (type) {
    case "multiple-choice":
      return {
        ...base,
        choices: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 1,
      };
    case "true-false":
      return {
        ...base,
        correctAnswer: true,
      };
    case "identification":
      return {
        ...base,
        correctAnswer: "Answer",
      };
    case "matching":
      return {
        ...base,
        pairs: [
          { left: "Earth", right: "Planet" },
          { left: "Cairo", right: "City" },
        ],
      };
    case "ordering":
      return {
        ...base,
        items: ["First", "Second", "Third"],
        correctOrder: ["First", "Second", "Third"],
      };
    case "logic-puzzle":
      return {
        ...base,
        scenario: "Describe the puzzle scenario.",
        answer: "The solution is...",
      };
    default:
      return {
        ...base,
        choices: ["Option A", "Option B"],
        correctAnswer: 0,
      };
  }
}

function normalizeGraph(graphValue) {
  if (!graphValue || typeof graphValue !== "object") {
    return null;
  }

  const rawValues = Array.isArray(graphValue.values)
    ? graphValue.values
    : Array.isArray(graphValue.data)
      ? graphValue.data
      : [];

  const values = rawValues
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .slice(0, 8);

  if (!values.length) {
    return null;
  }

  return {
    title: typeof graphValue.title === "string" ? graphValue.title : "Data",
    values,
    labels: Array.isArray(graphValue.labels) ? graphValue.labels.slice(0, values.length).map(String) : [],
    selectedIndex: Number.isInteger(graphValue.selectedIndex) ? Math.max(0, Math.min(graphValue.selectedIndex, values.length - 1)) : 0,
  };
}

export function normalizeChallenge(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const creatorName = resolveCreatorName(
    typeof source.createdBy === "string" ? source.createdBy : (typeof source.creator === "string" ? source.creator : ""),
    typeof source.accountName === "string" ? source.accountName : ""
  );

  const challenge = {
    id: source.id || generateChallengeId(),
    version: source.version || CHQ_VERSION,
    title: typeof source.title === "string" && source.title.trim() ? source.title.trim() : "Untitled Challenge",
    description: typeof source.description === "string" ? source.description : "",
    category: typeof source.category === "string" ? source.category : "General Knowledge",
    image: typeof source.image === "string" ? source.image.trim() : (typeof source.coverImage === "string" ? source.coverImage.trim() : ""),
    createdBy: creatorName,
    creatorLocked: Boolean(source.creatorLocked) || Boolean(creatorName),
    instructions: typeof source.instructions === "string" ? source.instructions : "",
    settings: {
      randomizeQuestions: Boolean(source.settings?.randomizeQuestions),
      revealFeedback: source.settings?.revealFeedback !== false,
      allowRetry: Boolean(source.settings?.allowRetry),
      timerSeconds: Number(source.settings?.timerSeconds) || 0,
    },
    questions: Array.isArray(source.questions) ? source.questions.map((question) => normalizeQuestion(question)).filter(Boolean) : [],
  };

  if (!challenge.questions.length) {
    challenge.questions.push(createQuestion("multiple-choice"));
  }

  return challenge;
}

export function normalizeQuestion(question) {
  if (!question || typeof question !== "object") {
    return null;
  }

  const baseQuestion = {
    id: question.id || (crypto.randomUUID ? crypto.randomUUID() : `question-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    type: question.type || "multiple-choice",
    prompt: typeof question.prompt === "string" && question.prompt.trim() ? question.prompt.trim() : "Question prompt",
    difficulty: ["easy", "medium", "hard"].includes(question.difficulty) ? question.difficulty : "medium",
    points: Number(question.points) > 0 ? Number(question.points) : 10,
    explanation: typeof question.explanation === "string" ? question.explanation : "",
    image: typeof question.image === "string" ? question.image.trim() : "",
    link: typeof question.link === "string" ? question.link.trim() : "",
    graph: normalizeGraph(question.graph),
  };

  switch (baseQuestion.type) {
    case "multiple-choice": {
      const choices = Array.isArray(question.choices) && question.choices.length ? question.choices.map(String) : ["Option A", "Option B"];
      return {
        ...baseQuestion,
        choices,
        correctAnswer: Number.isInteger(question.correctAnswer) ? question.correctAnswer : 0,
      };
    }
    case "true-false":
      return {
        ...baseQuestion,
        correctAnswer: question.correctAnswer === true || question.correctAnswer === false ? question.correctAnswer : true,
      };
    case "identification":
      return {
        ...baseQuestion,
        correctAnswer: String(question.correctAnswer || "Answer"),
      };
    case "matching": {
      const pairs = Array.isArray(question.pairs) && question.pairs.length ? question.pairs.map((pair) => ({
        left: String(pair?.left ?? ""),
        right: String(pair?.right ?? ""),
      })) : [{ left: "A", right: "B" }];
      return {
        ...baseQuestion,
        pairs,
      };
    }
    case "ordering": {
      const items = Array.isArray(question.items) && question.items.length ? question.items.map(String) : ["One", "Two", "Three"];
      const correctOrder = Array.isArray(question.correctOrder) && question.correctOrder.length ? question.correctOrder.map(String) : items.slice();
      return {
        ...baseQuestion,
        items,
        correctOrder,
      };
    }
    case "logic-puzzle":
      return {
        ...baseQuestion,
        scenario: typeof question.scenario === "string" && question.scenario.trim() ? question.scenario.trim() : "Describe the puzzle scenario.",
        answer: typeof question.answer === "string" && question.answer.trim() ? question.answer.trim() : "Answer",
      };
    default:
      return {
        ...baseQuestion,
        choices: ["Option A", "Option B"],
        correctAnswer: 0,
      };
  }
}

export function validateChallenge(candidate) {
  const errors = [];

  if (!candidate || typeof candidate !== "object") {
    return { valid: false, errors: ["Challenge file is not a valid object."], challenge: createDefaultChallenge() };
  }

  if (candidate.version && candidate.version !== CHQ_VERSION) {
    errors.push(`Challenge version ${candidate.version} is not compatible with version ${CHQ_VERSION}.`);
  }

  if (typeof candidate.title !== "string" || !candidate.title.trim()) {
    errors.push("Challenge title is required.");
  }

  if (!Array.isArray(candidate.questions) || candidate.questions.length === 0) {
    errors.push("At least one question is required.");
  }

  const normalized = normalizeChallenge(candidate);

  if (normalized.questions.some((question) => !question || !question.prompt)) {
    errors.push("Each question must have a prompt.");
  }

  return {
    valid: errors.length === 0,
    errors,
    challenge: normalized,
  };
}

export function exportChallenge(challenge) {
  const normalized = normalizeChallenge(challenge);
  const creatorName = String(normalized.createdBy || "").trim();

  if (!creatorName) {
    throw new Error("A creator name is required before exporting a Questra challenge.");
  }

  const payload = {
    ...normalized,
    createdBy: creatorName,
    creatorLocked: true,
  };

  return JSON.stringify(payload, null, 2);
}

export function summarizeProgressTrend(history = []) {
  const entries = Array.isArray(history) ? history.filter((entry) => entry && typeof entry === "object") : [];
  const recent = entries
    .slice(0, 8)
    .map((entry) => ({
      category: typeof entry.category === "string" && entry.category.trim() ? entry.category.trim() : "General Knowledge",
      value: Math.max(0, Math.min(100, Number(entry.percentage) || 0)),
      completedAt: entry.completedAt || null,
    }));

  if (!recent.length) {
    return { points: [], averageAccuracy: 0, latest: 0 };
  }

  const averageAccuracy = Math.round(recent.reduce((sum, entry) => sum + entry.value, 0) / recent.length);

  return {
    points: recent,
    averageAccuracy,
    latest: recent[recent.length - 1].value,
  };
}

export function summarizeSubjectProgress(history = []) {
  const buckets = new Map();

  for (const entry of Array.isArray(history) ? history : []) {
    const category = typeof entry?.category === "string" && entry.category.trim() ? entry.category.trim() : "General Knowledge";
    const percentage = Number(entry?.percentage) || 0;
    const score = Number(entry?.score) || 0;
    const total = Number(entry?.total) || 0;

    if (!buckets.has(category)) {
      buckets.set(category, {
        category,
        attempts: 0,
        totalScore: 0,
        totalPossible: 0,
        averageAccuracy: 0,
        bestAccuracy: 0,
        lastPlayed: null,
      });
    }

    const subject = buckets.get(category);
    subject.attempts += 1;
    subject.totalScore += score;
    subject.totalPossible += total || 0;
    subject.bestAccuracy = Math.max(subject.bestAccuracy, percentage);
    subject.averageAccuracy = (subject.averageAccuracy * (subject.attempts - 1) + percentage) / subject.attempts;
    if (entry?.completedAt) {
      const timestamp = new Date(entry.completedAt).getTime();
      if (!subject.lastPlayed || timestamp > new Date(subject.lastPlayed).getTime()) {
        subject.lastPlayed = entry.completedAt;
      }
    }
  }

  return Array.from(buckets.values())
    .map((subject) => ({
      ...subject,
      averageAccuracy: Math.round(subject.averageAccuracy),
      bestAccuracy: Math.round(subject.bestAccuracy),
      recentScore: subject.totalPossible ? Math.round((subject.totalScore / subject.totalPossible) * 100) : 0,
    }))
    .sort((a, b) => b.averageAccuracy - a.averageAccuracy || b.attempts - a.attempts);
}

export function removeChallenge(library, index) {
  if (!Array.isArray(library)) {
    return [];
  }

  const safeIndex = Number(index);
  if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= library.length) {
    return library.slice();
  }

  return library.filter((_, itemIndex) => itemIndex !== safeIndex);
}

export function calculateScore(challenge, responses = []) {
  const normalized = normalizeChallenge(challenge);
  let totalPoints = 0;
  let score = 0;

  normalized.questions.forEach((question, index) => {
    const response = responses[index];
    const isCorrect = isAnswerCorrect(question, response);
    totalPoints += Number(question.points) || 0;
    if (isCorrect) {
      score += Number(question.points) || 0;
    }
  });

  return {
    totalPoints,
    score,
    percentage: totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0,
    correctCount: normalized.questions.filter((question, index) => isAnswerCorrect(question, responses[index])).length,
  };
}

export function isAnswerCorrect(question, response) {
  if (!question) {
    return false;
  }

  switch (question.type) {
    case "multiple-choice": {
      const answer = Number(response);
      return answer === Number(question.correctAnswer);
    }
    case "true-false": {
      return response === Boolean(question.correctAnswer);
    }
    case "identification": {
      return normalizeText(response) === normalizeText(question.correctAnswer);
    }
    case "matching": {
      const expected = (question.pairs || []).reduce((acc, pair) => {
        acc[String(pair.left)] = String(pair.right);
        return acc;
      }, {});
      const incoming = response && typeof response === "object" ? response : {};
      return Object.entries(expected).every(([left, right]) => normalizeText(incoming[left]) === normalizeText(right));
    }
    case "ordering": {
      const expected = Array.isArray(question.correctOrder) ? question.correctOrder.map(String) : [];
      const incoming = Array.isArray(response) ? response.map(String) : [];
      return JSON.stringify(incoming) === JSON.stringify(expected);
    }
    case "logic-puzzle": {
      return normalizeText(response) === normalizeText(question.answer);
    }
    default:
      return false;
  }
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildSampleChallenges() {
  return [
    {
      version: CHQ_VERSION,
      title: "Planet Pulse",
      description: "A quick-fire science challenge about Earth and the solar system.",
      category: "Science",
      instructions: "Choose the best answer or identify each correct term.",
      settings: { randomizeQuestions: true, revealFeedback: true, allowRetry: true, timerSeconds: 45 },
      questions: [
        {
          id: "science-1",
          type: "multiple-choice",
          prompt: "Which planet is known as the Red Planet?",
          difficulty: "easy",
          points: 10,
          explanation: "Mars is often called the Red Planet because of iron oxide on its surface.",
          choices: ["Venus", "Mars", "Jupiter", "Mercury"],
          correctAnswer: 1,
        },
        {
          id: "science-2",
          type: "true-false",
          prompt: "The Earth orbits the Sun once every 365 days.",
          difficulty: "easy",
          points: 10,
          explanation: "This is approximately the length of one Earth year.",
          correctAnswer: true,
        },
      ],
    },
    {
      version: CHQ_VERSION,
      title: "History Match Up",
      description: "Match famous events to the correct period in history.",
      category: "History",
      instructions: "Align each event with the closest historical era.",
      settings: { randomizeQuestions: false, revealFeedback: true, allowRetry: false, timerSeconds: 60 },
      questions: [
        {
          id: "history-1",
          type: "matching",
          prompt: "Match each item correctly.",
          difficulty: "medium",
          points: 15,
          explanation: "These are classic historical milestones in the timeline of civilization.",
          pairs: [
            { left: "Roman Empire", right: "Ancient" },
            { left: "Renaissance", right: "Early Modern" },
            { left: "Industrial Revolution", right: "Modern" },
          ],
        },
      ],
    },
    {
      version: CHQ_VERSION,
      title: "Byte Busters",
      description: "A quick tech challenge for curious minds.",
      category: "Technology",
      instructions: "Select the correct technology term and sequence the basic steps.",
      settings: { randomizeQuestions: true, revealFeedback: true, allowRetry: false, timerSeconds: 90 },
      questions: [
        {
          id: "tech-1",
          type: "ordering",
          prompt: "Put these steps in the right order for booting a computer.",
          difficulty: "medium",
          points: 20,
          explanation: "A computer normally powers up, loads firmware, then starts the operating system.",
          items: ["Load operating system", "Power on", "Run startup checks"],
          correctOrder: ["Power on", "Run startup checks", "Load operating system"],
        },
      ],
    },
  ];
}
