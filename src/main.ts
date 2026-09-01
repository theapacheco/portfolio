import "./style.css";
import { content } from "./content";
import { initHeroScene, playLeaderCountdown } from "./scene";

/* ── Timecode helpers ───────────────────────────────────────────────── */
const FPS = 24;
const RUNTIME_SECONDS = 240; // the "length" of the page as a fictional reel

function toTimecode(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ff = Math.floor((s - Math.floor(s)) * FPS);
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

/* ── Build sections from content.ts ────────────────────────────────── */
const app = document.getElementById("app")!;

const heroSection = document.createElement("section");
heroSection.id = "hero";
heroSection.style.border = "none";
heroSection.innerHTML = `
  <canvas id="hero-canvas"></canvas>
  <div class="hero-body">
    <h1>${content.name}</h1>
    <p class="hero-role">${content.role}</p>
    <p class="hero-statement">${content.statement}</p>
  </div>
  <div class="hero-bottom">
    <span class="slate">${content.location}</span>
    <span class="slate">SCROLL TO PLAY ↓</span>
  </div>
`;
app.appendChild(heroSection);

const workSection = document.createElement("section");
workSection.id = "work";
workSection.innerHTML = `
  <div class="section-head">
    <h2>Selected Work</h2>
    <span class="slate">${content.reel.length} CUTS</span>
  </div>
  <div class="reel-grid">
    ${content.reel
      .map(
        (item) => `
      <a class="reel-card" href="${item.link ?? "#"}" aria-label="${item.title} — ${item.meta}">
        <img src="${item.image}" alt="${item.title} still" loading="lazy" />
        ${item.video ? `<video src="${item.video}" muted loop playsinline preload="none"></video>` : ""}
        <div class="reel-card-info">
          <p class="reel-card-title">${item.title}</p>
          <p class="reel-card-meta">${item.meta}</p>
        </div>
      </a>`
      )
      .join("")}
  </div>
`;
app.appendChild(workSection);

const creditsSection = document.createElement("section");
creditsSection.id = "credits";
creditsSection.innerHTML = `
  <div class="section-head">
    <h2>Credits</h2>
    <span class="slate">EDL — CHRONOLOGICAL</span>
  </div>
  <div class="edl">
    ${content.credits
      .map(
        (c) => `
      <div class="edl-row">
        <span class="tc">${c.year}</span>
        <span>
          <span class="edl-project">${c.project}</span><br />
          <span class="edl-role">${c.role}</span>
        </span>
        <span class="edl-studio">${c.studio}</span>
      </div>`
      )
      .join("")}
  </div>
`;
app.appendChild(creditsSection);

const skillsSection = document.createElement("section");
skillsSection.id = "skills";
skillsSection.innerHTML = `
  <div class="section-head">
    <h2>Tools &amp; Focus</h2>
  </div>
  <ul class="skills-list">
    ${content.skills.map((s) => `<li>${s}</li>`).join("")}
  </ul>
`;
app.appendChild(skillsSection);

const contactSection = document.createElement("section");
contactSection.id = "contact";
contactSection.innerHTML = `
  <div class="section-head" style="margin-bottom:0;">
    <h2>Get in Touch</h2>
  </div>
  <a class="contact-email" href="mailto:${content.contact.email}">${content.contact.email}</a>
  <div class="contact-links">
    ${content.contact.links.map((l) => `<a href="${l.url}">${l.label}</a>`).join(" &nbsp; ")}
  </div>
`;
app.appendChild(contactSection);

const footer = document.createElement("footer");
footer.innerHTML = `<span class="slate">END OF REEL — BUILT WITH TYPESCRIPT &amp; THREE.JS</span>`;
app.appendChild(footer);

/* ── Leader intro ───────────────────────────────────────────────────── */
const leader = document.getElementById("leader")!;
const leaderCanvas = document.getElementById(
  "leader-canvas"
) as HTMLCanvasElement;

playLeaderCountdown(leaderCanvas, () => {
  leader.classList.add("is-hidden");
  setTimeout(() => leader.remove(), 700);
});

/* ── Hero scene ─────────────────────────────────────────────────────── */
const heroCanvas = document.getElementById(
  "hero-canvas"
) as HTMLCanvasElement;
initHeroScene(heroCanvas);

/* ── Timeline scrubber: nav + live timecode readout ────────────────── */
const sections = [heroSection, workSection, creditsSection, skillsSection, contactSection];
const labels = ["OPEN", "WORK", "CREDITS", "TOOLS", "CONTACT"];

const marksEl = document.getElementById("scrubber-marks")!;
const progressEl = document.getElementById("scrubber-progress")!;
const scrubTcEl = document.getElementById("scrub-tc")!;
const clockTcEl = document.getElementById("clock-tc")!;

function docProgress(): number {
  const scrollTop = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(Math.max(scrollTop / max, 0), 1) : 0;
}

function layoutMarks() {
  marksEl.innerHTML = "";
  const total = document.documentElement.scrollHeight - window.innerHeight;
  sections.forEach((sec, i) => {
    const pct = total > 0 ? (sec.offsetTop / total) * 100 : 0;
    const btn = document.createElement("button");
    btn.className = "scrub-mark";
    btn.style.left = `${Math.min(pct, 100)}%`;
    btn.innerHTML = `<span>${labels[i]}</span>`;
    btn.addEventListener("click", () => {
      sec.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    marksEl.appendChild(btn);
  });
}

function updateScrubber() {
  const p = docProgress();
  progressEl.style.width = `${p * 100}%`;
  const tc = toTimecode(p * RUNTIME_SECONDS);
  scrubTcEl.textContent = tc;
  clockTcEl.textContent = tc;

  const marks = Array.from(marksEl.children) as HTMLElement[];
  let activeIdx = 0;
  const scrollTop = window.scrollY + window.innerHeight * 0.35;
  sections.forEach((sec, i) => {
    if (sec.offsetTop <= scrollTop) activeIdx = i;
  });
  marks.forEach((m, i) => m.classList.toggle("is-active", i === activeIdx));
}

window.addEventListener("load", () => {
  layoutMarks();
  updateScrubber();
});
window.addEventListener("resize", layoutMarks);
window.addEventListener("scroll", updateScrubber, { passive: true });
