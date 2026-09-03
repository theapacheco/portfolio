import "../style.css";
import { loadContent } from "../content";
import { initHeroScene, playLeaderCountdown } from "../scene";
import { initSite } from "../site";

initSite("home");

const leader = document.getElementById("leader") as HTMLElement;
const leaderCanvas = document.getElementById("leader-canvas") as HTMLCanvasElement;
playLeaderCountdown(leaderCanvas, () => {
  leader.classList.add("is-hidden");
  setTimeout(() => leader.remove(), 700);
});

const heroCanvas = document.getElementById("hero-canvas") as HTMLCanvasElement;
initHeroScene(heroCanvas);

loadContent().then((content) => {
  document.getElementById("hero-name")!.textContent = content.name;
  document.getElementById("hero-role")!.textContent = content.role;
  document.getElementById("hero-statement")!.textContent = content.statement;
  document.getElementById("hero-location")!.textContent = content.location;

  const featured = [
    ...(content.projects?.editing || []).slice(0, 1),
    ...(content.projects?.writing || []).slice(0, 1),
    ...(content.projects?.camera || []).slice(0, 1)
  ].slice(0, 3);
  const grid = document.getElementById("featured-grid")!;
  grid.innerHTML = featured
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
    .join("");
});
