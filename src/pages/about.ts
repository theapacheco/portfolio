import "../style.css";
import { loadContent } from "../content";
import { initSite } from "../site";

initSite("about");

loadContent().then((content) => {
  document.getElementById("about-statement")!.textContent = content.statement;
  document.getElementById("about-location")!.textContent = content.location;

  document.getElementById("skills-list")!.innerHTML = content.skills
    .map((s) => `<li>${s}</li>`)
    .join("");

  document.getElementById("credits-list")!.innerHTML = content.credits
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
    .join("");
});
