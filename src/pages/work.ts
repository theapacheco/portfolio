import "../style.css";
import { loadContent, type ReelItem } from "../content";
import { initSite } from "../site";

initSite("work");

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/** Open a full-screen detail view for a project */
function openDetail(item: ReelItem) {
  // Remove any existing modal
  document.getElementById("work-detail")?.remove();

  const hasScript = !!item.script;

  const modal = document.createElement("div");
  modal.id = "work-detail";
  modal.className = "work-detail-overlay";
  modal.innerHTML = `
    <div class="work-detail-panel">
      <button class="work-detail-close" id="detail-close" aria-label="Close">&times;</button>
      <div class="work-detail-hero">
        <img src="${item.image}" alt="${esc(item.title)}" />
        ${item.video ? `<video src="${item.video}" muted loop playsinline autoplay></video>` : ""}
      </div>
      <div class="work-detail-body">
        <h2>${esc(item.title)}</h2>
        <p class="slate work-detail-meta">${esc(item.meta)}</p>
        ${item.description ? `<p class="work-detail-desc">${esc(item.description)}</p>` : ""}
        ${item.link && item.link !== "#" ? `<a class="btn work-detail-link" href="${item.link}" target="_blank" rel="noopener">View Full Project ↗</a>` : ""}
        ${hasScript ? `
          <div class="work-detail-script-section">
            <h3>Read the Script</h3>
            <pre class="work-detail-script">${esc(item.script!)}</pre>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  // Force reflow then animate in
  requestAnimationFrame(() => modal.classList.add("is-visible"));

  const close = () => {
    modal.classList.remove("is-visible");
    document.body.style.overflow = "";
    setTimeout(() => modal.remove(), 300);
  };
  document.getElementById("detail-close")!.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", function handler(e) {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", handler);
    }
  });
}

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
      (_, i) => `
      <button class="reel-card" data-cat-idx="${i}" type="button" aria-label="View details">
        <img src="${items[i].image}" alt="${esc(items[i].title)} still" loading="lazy" />
        ${items[i].video ? `<video src="${items[i].video}" muted loop playsinline preload="none"></video>` : ""}
        <div class="reel-card-info">
          <p class="reel-card-title">${esc(items[i].title)}</p>
          <p class="reel-card-meta">${esc(items[i].meta)}</p>
        </div>
      </button>`
    )
    .join("");

  // Wire click handlers
  grid.querySelectorAll<HTMLButtonElement>("[data-cat-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-cat-idx"));
      openDetail(items[idx]);
    });
    // Play video on hover
    btn.addEventListener("mouseenter", () => {
      const vid = btn.querySelector("video");
      vid?.play().catch(() => {});
    });
    btn.addEventListener("mouseleave", () => {
      const vid = btn.querySelector("video");
      if (vid) { vid.pause(); vid.currentTime = 0; }
    });
  });
}

loadContent().then((content) => {
  renderGrid("grid-editing", "count-editing", "section-editing", content.projects?.editing || []);
  renderGrid("grid-writing", "count-writing", "section-writing", content.projects?.writing || []);
  renderGrid("grid-lighting", "count-lighting", "section-lighting", content.projects?.lighting || []);
  renderGrid("grid-camera", "count-camera", "section-camera", content.projects?.camera || []);
});
