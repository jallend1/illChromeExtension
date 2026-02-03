const countdownElements = {
  countdownTimerElement: document.querySelector("#countdown"),
  countdownTextElement: document.querySelector("#countdown-text"),
  countdownContainerElement: document.querySelector("#countdown-container"),
};

const branchHours = {
  0: { system: 11, bellevue: 11 },
  1: { system: 10, bellevue: 10 },
  2: { system: 12, bellevue: 11 },
  3: { system: 12, bellevue: 11 },
  4: { system: 10, bellevue: 10 },
  5: { system: 10, bellevue: 10 },
  6: { system: 11, bellevue: 11 },
};

/**
 * Formats a duration in milliseconds to a human-readable string.
 * @param {number} ms
 * @returns {string}
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
/**
 * Updates the countdown display.
 * @param {string} mainText
 * @param {string} subText
 * @param {string} state - 'normal', 'warning', or 'alert'
 */
function updateCountdown(mainText, subText = "", state = "normal") {
  countdownElements.countdownTimerElement.textContent = mainText;
  countdownElements.countdownTextElement.textContent = subText;

  // Remove all state classes
  countdownElements.countdownContainerElement.classList.remove(
    "countdown-normal",
    "countdown-warning",
    "countdown-alert"
  );

  // Add the appropriate state class
  countdownElements.countdownContainerElement.classList.add(`countdown-${state}`);

  // Keep old alert styling on the text element for backwards compatibility
  countdownElements.countdownTimerElement.classList.toggle(
    "countdown-alert",
    state === "alert"
  );
}

/**
 * Determines the countdown state based on time remaining
 * @param {string} timeString - formatted time string (HH:MM:SS)
 * @returns {string} - 'normal', 'warning', or 'alert'
 */
function getCountdownState(timeString) {
  if (timeString.startsWith("00:")) {
    return "alert"; // Less than 1 hour
  } else if (timeString.startsWith("01:")) {
    return "warning"; // Less than 2 hours
  }
  return "normal";
}

/**
 * Main countdown timer function
 * @returns {void}
 */
function countdownTimer() {
  const now = new Date();
  const { system, bellevue } = branchHours[now.getDay()];
  const openingTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    system,
    0,
    0
  );
  const bellevueOpeningTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    bellevue,
    0,
    0
  );

  if (now >= openingTime) {
    updateCountdown("All branches have opened for the day.", "", "normal");
    clearInterval(intervalID);
    return;
  }

  if (now >= bellevueOpeningTime) {
    const branchOpeningTime = formatTime(openingTime - now);
    const state = getCountdownState(branchOpeningTime);
    updateCountdown(
      "Bellevue has opened.",
      `Other branches: ${branchOpeningTime}`,
      state
    );
    return;
  }

  // No branches have opened yet
  const bellevueTimeRemaining = formatTime(bellevueOpeningTime - now);
  const systemTimeRemaining = formatTime(openingTime - now);
  const state = getCountdownState(bellevueTimeRemaining);

  if (bellevue === system) {
    updateCountdown(
      `Branches open in ${bellevueTimeRemaining}`,
      "",
      state
    );
  } else {
    updateCountdown(
      `Bellevue opens in ${bellevueTimeRemaining}`,
      `Other branches: ${systemTimeRemaining}`,
      state
    );
  }
}

const intervalID = setInterval(countdownTimer, 1000);
