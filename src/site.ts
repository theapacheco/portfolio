/**
 * Shared across every page: top nav (with mobile hamburger), theme toggle,
 * and timecode clock. Each page calls initSite() once.
 */

export type PageId = "home" | "work" | "about" | "resume" | "admin";

const NAV_ITEMS: { id: PageId; label: string; href: string }[] = [
  { id: "home", label: "Home", href: "index.html" },
  { id: "work", label: "Work", href: "work.html" },
  { id: "about", label: "About", href: "about.html" },
  { id: "resume", label: "Résumé", href: "resume.html" },
];

const THEME_KEY = "reelcut-theme";

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const preferred = window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
  const theme = stored ?? preferred;
  document.documentElement.setAttribute("data-theme", theme);

  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  const label = () =>
    document.documentElement.getAttribute("data-theme") === "light"
      ? "DARK"
      : "LIGHT";
  btn.textContent = label();

  btn.addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "dark"
        : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    btn.textContent = label();
  });
}

function initClock() {
  const el = document.getElementById("clock-tc");
  if (!el) return;
  const FPS = 24;
  function tick() {
    const now = new Date();
    const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
    const ff = Math.floor((now.getMilliseconds() / 1000) * FPS);
    el!.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
      now.getSeconds()
    )}:${pad(ff)}`;
    requestAnimationFrame(tick);
  }
  tick();
}

export function renderNav(current: PageId) {
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  nav.innerHTML = `
    <a class="brand" href="index.html">REEL CUT</a>
    <button type="button" class="nav-burger" id="nav-burger" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
    <div class="nav-links" id="nav-links">
      ${NAV_ITEMS.map(
        (item) => `
        <a href="${item.href}" class="${item.id === current ? "is-active" : ""}">${item.label}</a>`
      ).join("")}
    </div>
    <div class="nav-right">
      <span class="slate" id="clock-tc">00:00:00:00</span>
      <button type="button" id="theme-toggle" aria-label="Toggle light and dark mode"></button>
    </div>
  `;

  const burger = document.getElementById("nav-burger")!;
  const links = document.getElementById("nav-links")!;
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  // Close menu on link click (mobile)
  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => nav.classList.remove("is-open"))
  );
}

export function renderFooter() {
  const footer = document.getElementById("site-footer");
  if (!footer) return;
  footer.innerHTML = `<span class="slate">© ${new Date().getFullYear()} Austin Pacheco — BUILT WITH TYPESCRIPT &amp; THREE.JS</span>`;
}

export function initSite(current: PageId) {
  renderNav(current);
  renderFooter();
  initTheme();
  initClock();
}
