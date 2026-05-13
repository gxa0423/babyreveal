(function () {
  "use strict";

  const defaults = {
    coupleNames: "Our little family",
    babyNickname: "Baby",
    photoCaption: "A peek at our tiny one",
    enablePasscode: true,
    passcodeHash: "",
    passcodeHint: "",
    revealSex: "XY",
    babyPhotoSrc: "assets/baby-photo.jpg",
    fallbackPhotoSrc: "assets/baby-placeholder.svg",
    chromosomeImages: {
      XX: "assets/chromosomes-xx.png",
      XY: "assets/chromosomes-xy.png"
    },
    useSupabase: true,
    supabaseUrl: "https://yampemvfnnxiboashlnc.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbXBlbXZmbm54aWJvYXNobG5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjM3MDgsImV4cCI6MjA5NDE5OTcwOH0.9KyHQxPNq_yAi8sqwSWJU3twYxqi3VrWymHPpKUoRHc",
    decorHearts: [],
    voteLabels: {
      XX: "Girl",
      XY: "Boy"
    },
    revealText: {
      XX: { headline: "It's a girl!", message: "Thanks for guessing with us." },
      XY: { headline: "It's a boy!", message: "Thanks for guessing with us." }
    }
  };

  const config = Object.assign({}, defaults, window.BABY_REVEAL_CONFIG || {});
  config.voteLabels = Object.assign({}, defaults.voteLabels, config.voteLabels || {});
  config.revealText = Object.assign({}, defaults.revealText, config.revealText || {});
  config.chromosomeImages = Object.assign({}, defaults.chromosomeImages, config.chromosomeImages || {});

  const STORAGE_KEY = "babyRevealVotes:v2";
  const ACCESS_KEY = "babyRevealAccessHash:v1";
  const GUEST_KEY = "babyRevealGuestId:v2";

  const state = {
    selectedGuess: "",
    votes: [],
    supabase: null,
    refreshTimer: null,
    guestId: "",
    hasRevealed: false,
    lastRevealSex: ""
  };

  const $ = function (selector) {
    return document.querySelector(selector);
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    renderHeartDecor();
    applyConfigCopy();
    setupPhoto();
    setupGuessButtons();
    setupVoteForm();
    setupResetButton();
    setupSupabase();
    setupPasscodeGate();
  }

  function cacheElements() {
    els.gate = $("#passcodeGate");
    els.app = $("#app");
    els.passcodeForm = $("#passcodeForm");
    els.passcodeInput = $("#passcodeInput");
    els.passcodeError = $("#passcodeError");
    els.passcodeHint = $("#passcodeHint");
    els.babyNickname = $("#babyNickname");
    els.photoCaption = $("#photoCaption");
    els.babyPhoto = $("#babyPhoto");
    els.coupleNames = $("#coupleNames");
    els.voterForm = $("#voterForm");
    els.voterName = $("#voterName");
    els.voterNote = $("#voterNote");
    els.submitVote = $("#submitVote");
    els.voteStatus = $("#voteStatus");
    els.guessButtons = Array.from(document.querySelectorAll(".guess-button"));
    els.statsCard = $("#statsCard");
    els.statsTitle = $("#statsTitle");
    els.statsIntro = $("#statsIntro");
    els.votesLocked = $("#votesLocked");
    els.voteResults = $("#voteResults");
    els.xxCount = $("#xxCount");
    els.xyCount = $("#xyCount");
    els.xxBar = $("#xxBar");
    els.xyBar = $("#xyBar");
    els.voteList = $("#voteList");
    els.votesEmpty = $("#votesEmpty");
    els.revealPanel = $("#revealPanel");
    els.revealHeadline = $("#revealHeadline");
    els.revealCopy = $("#revealCopy");
    els.revealChromosome = $("#revealChromosome");
    els.revealBadge = $("#revealBadge");
    els.resetGuess = $("#resetGuess");
    els.canvas = $("#confettiCanvas");
    els.heartDecor = $("#heartDecor");
  }

  function renderHeartDecor() {
    if (!els.heartDecor) return;
    const hearts = Array.isArray(config.decorHearts) ? config.decorHearts : [];
    els.heartDecor.textContent = "";

    hearts.forEach(function (heart) {
      const span = document.createElement("span");
      span.className = "heart";
      span.textContent = heart.symbol || "♥";

      ["top", "right", "bottom", "left"].forEach(function (side) {
        if (heart[side] !== undefined && heart[side] !== null && heart[side] !== "") {
          span.style[side] = String(heart[side]);
        }
      });

      if (heart.size !== undefined) {
        span.style.setProperty("--heart-size", typeof heart.size === "number" ? heart.size + "px" : String(heart.size));
      }
      if (heart.rotate !== undefined) {
        span.style.setProperty("--heart-rotate", typeof heart.rotate === "number" ? heart.rotate + "deg" : String(heart.rotate));
      }
      if (heart.opacity !== undefined) {
        span.style.setProperty("--heart-opacity", String(heart.opacity));
      }
      if (heart.scale !== undefined) {
        span.style.setProperty("--heart-scale", String(heart.scale));
      }

      els.heartDecor.appendChild(span);
    });
  }

  function applyConfigCopy() {
    els.babyNickname.textContent = config.babyNickname || defaults.babyNickname;
    els.photoCaption.textContent = config.photoCaption || defaults.photoCaption;
    els.coupleNames.textContent = config.coupleNames || defaults.coupleNames;
    els.passcodeHint.textContent = config.passcodeHint || "";
    applyChromosomeImages();
  }

  function applyChromosomeImages() {
    document.querySelectorAll("[data-chromosome-img]").forEach(function (img) {
      const sex = normalizeSex(img.dataset.chromosomeImg);
      if (sex && config.chromosomeImages[sex]) {
        img.src = config.chromosomeImages[sex];
      }
    });
  }

  function setupPhoto() {
    els.babyPhoto.onerror = function () {
      if (els.babyPhoto.src.indexOf(config.fallbackPhotoSrc) === -1) {
        els.babyPhoto.src = config.fallbackPhotoSrc;
      }
    };
    if (config.babyPhotoSrc) {
      els.babyPhoto.src = config.babyPhotoSrc;
    }
  }

  function setupPasscodeGate() {
    const hasPasscode = Boolean(config.enablePasscode && config.passcodeHash);
    const storedHash = sessionStorage.getItem(ACCESS_KEY);

    if (!hasPasscode || storedHash === config.passcodeHash) {
      unlockApp(false);
      return;
    }

    els.gate.classList.remove("hidden");
    els.app.classList.add("hidden");
    window.setTimeout(function () {
      els.passcodeInput.focus();
    }, 100);

    els.passcodeForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      els.passcodeError.textContent = "";
      const typed = (els.passcodeInput.value || "").trim();

      try {
        const typedHash = await sha256(typed);
        if (typedHash === config.passcodeHash) {
          sessionStorage.setItem(ACCESS_KEY, typedHash);
          unlockApp(true);
        } else {
          els.passcodeError.textContent = "That passcode did not work. Try the magic word we shared.";
          els.passcodeInput.select();
        }
      } catch (error) {
        els.passcodeError.textContent = "This browser could not verify the passcode. Open the secure GitHub Pages HTTPS link and try again.";
      }
    });
  }

  function unlockApp(focusName) {
    els.gate.classList.add("hidden");
    els.app.classList.remove("hidden");
    state.guestId = getGuestId(false);
    renderVotes(state.votes);

    if (focusName) {
      window.setTimeout(function () {
        els.voterName.focus();
      }, 150);
    }
  }

  function setupSupabase() {
    if (!config.useSupabase) return;
    if (!config.supabaseUrl || !config.supabaseAnonKey) return;
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      setStatus("Shared voting is configured, but the Supabase script did not load. Votes will only save on this device.", true);
      return;
    }

    state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  function setupGuessButtons() {
    els.guessButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        state.selectedGuess = normalizeSex(button.dataset.guess);
        els.guessButtons.forEach(function (other) {
          const selected = other === button;
          other.classList.toggle("selected", selected);
          other.setAttribute("aria-pressed", selected ? "true" : "false");
        });
        updateSubmitState();
      });
    });
  }

  function setupVoteForm() {
    els.voterName.addEventListener("input", updateSubmitState);

    els.voterForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      const name = cleanName(els.voterName.value);
      const note = cleanNote(els.voterNote.value);
      const guess = state.selectedGuess;

      if (!name || !guess) {
        setStatus("Add your name and choose girl or boy first.", true);
        return;
      }

      els.submitVote.disabled = true;
      setStatus("Saving your guess...", false);

      try {
        const result = await saveVoteAndGetReveal(name, guess, note);
        state.hasRevealed = true;
        state.lastRevealSex = result.actualSex || normalizeSex(config.revealSex);
        state.votes = normalizeVotes(result.votes || state.votes);
        showReveal(state.lastRevealSex, guess);
        renderVotes(state.votes);
        startVoteRefresh();
        setStatus("Your guess is in.", false);
      } catch (error) {
        console.error(error);
        setStatus("I could not save that vote yet. Check the database settings or try again.", true);
        updateSubmitState();
      }
    });
  }

  function setupResetButton() {
    els.resetGuess.addEventListener("click", function () {
      els.revealPanel.classList.add("hidden");
      els.voterForm.reset();
      state.selectedGuess = "";
      state.hasRevealed = false;
      state.lastRevealSex = "";
      stopVoteRefresh();
      els.guessButtons.forEach(function (button) {
        button.classList.remove("selected");
        button.setAttribute("aria-pressed", "false");
      });
      state.guestId = getGuestId(true);
      setStatus("", false);
      renderVotes(state.votes);
      updateSubmitState();
      els.voterName.focus();
    });
  }

  function updateSubmitState() {
    const ready = Boolean(cleanName(els.voterName.value) && state.selectedGuess);
    els.submitVote.disabled = !ready;
  }

  async function saveVoteAndGetReveal(name, guess, note) {
    if (state.supabase) {
      const payload = {
        voter_name: name,
        voter_guess: guess,
        voter_note: note,
        guest_uid: state.guestId
      };

      const result = await state.supabase.rpc("submit_reveal_vote", payload);
      if (result.error) throw result.error;
      return normalizePayload(result.data);
    }

    const localVote = {
      name: name,
      guess: guess,
      note: note,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const localVotes = readLocalVotes();
    localVotes.unshift(localVote);
    const savedVotes = localVotes.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedVotes));

    return {
      actualSex: normalizeSex(config.revealSex),
      votes: savedVotes
    };
  }

  async function loadVotes() {
    if (!state.hasRevealed) {
      renderVotes(state.votes);
      return;
    }

    if (state.supabase) {
      const result = await state.supabase.rpc("get_reveal_votes_after_vote", {
        guest_uid: state.guestId
      });

      if (result.error) {
        console.warn(result.error);
        renderVotes(state.votes);
        return;
      }

      const payload = normalizePayload(result.data);
      state.votes = normalizeVotes(payload.votes || state.votes);
      if (payload.actualSex) state.lastRevealSex = payload.actualSex;
      renderVotes(state.votes);
      return;
    }

    state.votes = readLocalVotes();
    renderVotes(state.votes);
  }

  function renderVotes(votes) {
    const safeVotes = normalizeVotes(votes);

    if (!state.hasRevealed) {
      els.statsCard.classList.add("locked");
      els.statsTitle.textContent = "Votes unlock after you guess";
      els.statsIntro.textContent = "We will keep everyone else's guesses tucked away so your vote stays yours.";
      els.votesLocked.classList.remove("hidden");
      els.voteResults.classList.add("hidden");
      els.voteList.textContent = "";
      return;
    }

    els.statsCard.classList.remove("locked");
    els.statsTitle.textContent = "Here's how everyone voted";
    els.statsIntro.textContent = "";
    els.votesLocked.classList.add("hidden");
    els.voteResults.classList.remove("hidden");

    const xx = safeVotes.filter(function (vote) { return normalizeSex(vote.guess) === "XX"; }).length;
    const xy = safeVotes.filter(function (vote) { return normalizeSex(vote.guess) === "XY"; }).length;
    const total = xx + xy;
    const xxWidth = total ? Math.round((xx / total) * 100) : 0;
    const xyWidth = total ? Math.round((xy / total) * 100) : 0;

    els.xxCount.textContent = String(xx);
    els.xyCount.textContent = String(xy);
    els.xxBar.style.width = xxWidth + "%";
    els.xyBar.style.width = xyWidth + "%";

    els.voteList.textContent = "";
    els.votesEmpty.classList.toggle("hidden", safeVotes.length > 0);

    safeVotes.slice(0, 40).forEach(function (vote) {
      const guess = normalizeSex(vote.guess) || "?";
      const li = document.createElement("li");
      const main = document.createElement("div");
      const name = document.createElement("strong");
      const chip = document.createElement("span");

      main.className = "vote-main";
      name.textContent = vote.name || "Someone sweet";
      chip.className = "vote-chip " + (guess === "XX" ? "coral" : "sage");
      chip.textContent = (config.voteLabels[guess] || guess) + " · " + guess;

      main.appendChild(name);
      if (vote.note) {
        const note = document.createElement("p");
        note.className = "vote-note";
        note.textContent = vote.note;
        main.appendChild(note);
      }

      li.append(main, chip);
      els.voteList.appendChild(li);
    });
  }

  function showReveal(actualSex, guess) {
    const sex = normalizeSex(actualSex) || normalizeSex(config.revealSex);
    const copy = config.revealText[sex] || defaults.revealText[sex] || defaults.revealText.XY;
    const wasRight = guess === sex;

    els.revealHeadline.textContent = copy.headline;
    els.revealCopy.textContent = (wasRight ? "You called it!! " : "Plot twist!! ") + copy.message;
    els.revealChromosome.src = config.chromosomeImages[sex] || (sex === "XX" ? "assets/chromosomes-xx.png" : "assets/chromosomes-xy.png");
    els.revealChromosome.alt = sex + " chromosome illustration";
    if (els.revealBadge) {
      els.revealBadge.classList.toggle("coral", sex === "XX");
      els.revealBadge.classList.toggle("sage", sex === "XY");
    }
    els.revealPanel.classList.remove("reveal-xx", "reveal-xy");
    els.revealPanel.classList.add(sex === "XX" ? "reveal-xx" : "reveal-xy");
    els.revealPanel.classList.remove("hidden");
    els.revealPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    launchConfetti();
  }

  function startVoteRefresh() {
    if (!state.supabase || state.refreshTimer) return;
    state.refreshTimer = window.setInterval(loadVotes, 15000);
  }

  function stopVoteRefresh() {
    if (!state.refreshTimer) return;
    window.clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }

  function normalizePayload(data) {
    let payload = data;

    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (error) {
        return {
          actualSex: normalizeSex(payload) || normalizeSex(config.revealSex),
          votes: []
        };
      }
    }

    if (!payload || typeof payload !== "object") {
      return {
        actualSex: normalizeSex(config.revealSex),
        votes: []
      };
    }

    return {
      actualSex: normalizeSex(payload.actual_sex || payload.actualSex || payload.sex) || normalizeSex(config.revealSex),
      votes: normalizeVotes(payload.votes || [])
    };
  }

  function normalizeVotes(votes) {
    if (!Array.isArray(votes)) return [];

    return votes.map(function (vote) {
      return {
        name: cleanName(vote.name || vote.voter_name || "Someone sweet"),
        guess: normalizeSex(vote.guess || vote.voter_guess),
        note: cleanNote(vote.note || vote.comment || ""),
        created_at: vote.created_at || "",
        updated_at: vote.updated_at || vote.created_at || ""
      };
    }).filter(function (vote) {
      return Boolean(vote.guess);
    });
  }

  function cleanName(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);
  }

  function cleanNote(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 500);
  }

  function normalizeSex(value) {
    const normalized = String(value || "").trim().toUpperCase();
    return normalized === "XX" || normalized === "XY" ? normalized : "";
  }

  function readLocalVotes() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return normalizeVotes(stored);
    } catch (error) {
      return [];
    }
  }

  function getGuestId(forceNew) {
    if (!forceNew) {
      const existing = localStorage.getItem(GUEST_KEY);
      if (existing) return existing;
    }

    const id = makeId();
    localStorage.setItem(GUEST_KEY, id);
    return id;
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "guest-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }

  function setStatus(message, isError) {
    els.voteStatus.textContent = message || "";
    els.voteStatus.classList.toggle("error", Boolean(isError));
  }

  async function sha256(message) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("This browser cannot verify the passcode here. Use the GitHub Pages HTTPS URL.");
    }

    const bytes = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function launchConfetti() {
    const canvas = els.canvas;
    const ctx = canvas.getContext("2d");
    const width = canvas.width = window.innerWidth * window.devicePixelRatio;
    const height = canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const colors = ["#cfa29d", "#c7d1b9", "#f3df9f", "#eadcc5", "#765238"];
    const pieces = Array.from({ length: 150 }, function () {
      return {
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * window.innerHeight * 0.35,
        size: 6 + Math.random() * 8,
        speed: 2 + Math.random() * 4,
        drift: -1.8 + Math.random() * 3.6,
        rotation: Math.random() * Math.PI,
        spin: -0.15 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });

    let frame = 0;
    const maxFrames = 170;

    function draw() {
      frame += 1;
      ctx.clearRect(0, 0, width, height);

      pieces.forEach(function (piece) {
        piece.y += piece.speed;
        piece.x += piece.drift;
        piece.rotation += piece.spin;

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = piece.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
        ctx.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * 0.66);
        ctx.restore();
      });

      if (frame < maxFrames) {
        window.requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    }

    draw();
  }
})();
 