import "../style.css";
import { loadContent, type ReelItem } from "../content";
import { initSite } from "../site";

initSite("work");

function renderGrid(containerId: string, countId: string, sectionId: string, items: ReelItem[]) {
  const section = document.getElementById(sectionId);
  if (!items || items.length === 0) {
    if (section) section.style.display = "none";
    return;
  }
  
  const grid = document.getElementById(containerId)!;
  document.getElementById(countId)!.textContent = `${items.length} ITEMS`;
  grid.innerHTML = items
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
}

loadContent().then((content) => {
  renderGrid("grid-editing", "count-editing", "section-editing", content.projects?.editing || []);
  renderGrid("grid-writing", "count-writing", "section-writing", content.projects?.writing || []);
  renderGrid("grid-lighting", "count-lighting", "section-lighting", content.projects?.lighting || []);
  renderGrid("grid-camera", "count-camera", "section-camera", content.projects?.camera || []);
});
