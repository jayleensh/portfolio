console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/" // Local server
    : "/portfolio/"; // GitHub Pages repo name

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "cv/", title: "CV" },
  { url: "https://github.com/jayleensh", title: "GitHub" },
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith("http") ? BASE_PATH + url : url;

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;
  nav.append(a);

  // Highlight the current page
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add("current");
  }

  // Open external links in a new tab
  if (a.host !== location.host) {
    a.target = "_blank";
  }
}

// dark mode switch
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`,
);

let select = document.querySelector(".color-scheme select");

// save and apply preference
if ("colorScheme" in localStorage) {
  let saved = localStorage.colorScheme;
  document.documentElement.style.setProperty("color-scheme", saved);
  select.value = saved;
}

select.addEventListener("input", function (event) {
  document.documentElement.style.setProperty("color-scheme", event.target.value);
  localStorage.colorScheme = event.target.value;
});

// contact form redo
let form = document.querySelector("form");

form?.addEventListener("submit", function (event) {
  event.preventDefault();

  let data = new FormData(form);
  let params = [];

  for (let [name, value] of data) {
    params.push(name + "=" + encodeURIComponent(value));
  }

  let url = form.action + "?" + params.join("&");
  location.href = url;
});

// asynchronous JSON fetch function
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    console.log(response);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
  }
}

// render projects function
export function renderProjects(projects, containerElement, headingLevel = "h2") {
  // Check that we got a real element to draw into
  if (!(containerElement instanceof Element)) {
    console.error("renderProjects: containerElement is not a valid element");
    return;
  }

  const validHeadings = ["h1", "h2", "h3", "h4", "h5", "h6"];
  if (!validHeadings.includes(headingLevel)) {
    console.warn(`renderProjects: "${headingLevel}" is not a heading, using h2`);
    headingLevel = "h2";
  }

  containerElement.innerHTML = "";

  if (!Array.isArray(projects) || projects.length === 0) {
    containerElement.innerHTML = "<p>No projects to show yet. Check back soon!</p>";
    return;
  }

  for (let project of projects) {
    const article = document.createElement("article");

    article.innerHTML = `
      <${headingLevel}>${project.title ?? "Untitled project"}</${headingLevel}>
      <img src="${project.image ?? ""}" alt="${project.title ?? ""}">
      <p>${project.description ?? ""}</p>
    `;

    containerElement.appendChild(article);
  }
}