function darkMode() {
  const html = document.querySelector("html");

  chrome.storage.local.get("darkMode", (result) => {
    if (result.darkMode) {
      html.setAttribute("data-bs-theme", "dark");
      html.classList.add("dark-mode");
    } else {
      html.removeAttribute("data-bs-theme");
      html.classList.remove("dark-mode");
    }
  });

  // html.classList.toggle("dark-mode");

  // if (html.classList.contains("dark-mode")) {
  //   html.setAttribute("data-bs-theme", "dark");
  // } else {
  //   html.removeAttribute("data-bs-theme");
  // }
}

darkMode();
