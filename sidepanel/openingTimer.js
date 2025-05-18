const countdownElements = {
  countdownTimerElement: document.querySelector("#countdown"),
  countdownTextElement: document.querySelector("#countdown-text"),
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

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function updateCountdown(mainText, subText = "", isAlert = false) {
  countdownElements.countdownTimerElement.textContent = mainText;
  countdownElements.countdownTextElement.textContent = subText;
  countdownElements.countdownTimerElement.classList.toggle(
    "countdown-alert",
    isAlert
  );
}

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
    updateCountdown("All branches have opened for the day.");
    clearInterval(intervalID);
    return;
  }

  if (now >= bellevueOpeningTime) {
    const branchOpeningTime = formatTime(openingTime - now);
    updateCountdown(
      "Bellevue has opened.",
      `Other branches: ${branchOpeningTime}`,
      branchOpeningTime.startsWith("00")
    );
    return;
  }

  // No branches have opened yet
  const bellevueTimeRemaining = formatTime(bellevueOpeningTime - now);
  const systemTimeRemaining = formatTime(openingTime - now);

  if (bellevue === system) {
    updateCountdown(
      `Branches open in ${bellevueTimeRemaining}`,
      "",
      bellevueTimeRemaining.startsWith("00")
    );
  } else {
    updateCountdown(
      `Bellevue opens in ${bellevueTimeRemaining}`,
      `Other branches: ${systemTimeRemaining}`,
      bellevueTimeRemaining.startsWith("00")
    );
  }
}

const intervalID = setInterval(countdownTimer, 1000);
