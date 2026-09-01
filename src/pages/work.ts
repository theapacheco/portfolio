import "../style.css";
import { loadContent } from "../content";
import { initSite } from "../site";

initSite("work");

loadContent().then((content) => {
  const grid = document.getElementById("work-grid")!;
  document.getElementById("work-count")!.textContent = `${content.reel.length} CUTS`;
  grid.innerHTML = content.reel
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
