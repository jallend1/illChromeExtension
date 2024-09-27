function darkMode() {
  const html = document.querySelector("html");

  html.classList.toggle("dark-mode");

  if (html.classList.contains("dark-mode")) {
    html.setAttribute("data-bs-theme", "dark");
  } else {
    html.removeAttribute("data-bs-theme");
  }
}

darkMode();
