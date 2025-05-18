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

const updateCountdownElement = (element, text, isAlert = false) => {
  element.textContent = text;
  if (isAlert) {
    element.classList.add("countdown-alert");
  } else {
    element.classList.remove("countdown-alert");
  }
};

const getFormattedTimeDifference = (openingTime, currentTime) => {
  const timeDifference = openingTime - currentTime;
  return calculateTime(timeDifference);
};

const countdownTimer = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const { system, bellevue } = branchHours[dayOfWeek];

  const openingTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    system,
    0,
    0
  );
  const bellevueOpeningTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    bellevue,
    0,
    0
  );

  if (today >= openingTime) {
    // All branches have opened
    updateCountdownElement(
      countdownElements.countdownTimerElement,
      "All branches have opened for the day."
    );
    updateCountdownElement(countdownElements.countdownTextElement, "", false);
    clearInterval(intervalID);
    return;
  }

  if (today >= bellevueOpeningTime) {
    // Bellevue has opened, others not yet
    const branchOpeningTime = getFormattedTimeDifference(openingTime, today);
    updateCountdownElement(
      countdownElements.countdownTimerElement,
      "Bellevue has opened.",
      false
    );
    updateCountdownElement(
      countdownElements.countdownTextElement,
      `Other branches: ${branchOpeningTime}`,
      branchOpeningTime.startsWith("00")
    );
    return;
  }

  // No branches have opened yet
  const bellevueTimeRemaining = getFormattedTimeDifference(
    bellevueOpeningTime,
    today
  );
  const systemTimeRemaining = getFormattedTimeDifference(openingTime, today);
  if (bellevue === system) {
    // Everybody opens at the same time
    updateCountdownElement(
      countdownElements.countdownTimerElement,
      `Branches open in ${bellevueTimeRemaining}`,
      bellevueTimeRemaining.startsWith("00")
    );
  } else {
    // Bellevue and branches open at different times
    updateCountdownElement(
      countdownElements.countdownTimerElement,
      `Bellevue opens in ${bellevueTimeRemaining}`,
      bellevueTimeRemaining.startsWith("00")
    );
    updateCountdownElement(
      countdownElements.countdownTextElement,
      `Other branches: ${systemTimeRemaining}`,
      systemTimeRemaining.startsWith("00")
    );
  }
};

const intervalID = setInterval(countdownTimer, 1000);

const calculateTime = (timeDifference) => {
  const totalSeconds = Math.floor(timeDifference / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatTime = (timeStr) => String(timeStr).padStart(2, "0");
  return `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(seconds)}`;
};
