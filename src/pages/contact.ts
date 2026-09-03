import "../style.css";
import { loadContent } from "../content";
import { initSite } from "../site";

initSite("contact");

loadContent().then((content) => {
  const emailEl = document.getElementById("contact-email") as HTMLAnchorElement;
  emailEl.href = `mailto:${content.contact.email}`;
  emailEl.textContent = content.contact.email;

  document.getElementById("contact-links")!.innerHTML = content.contact.links
    .map((l) => `<a href="${l.url}">${l.label}</a>`)
    .join(" &nbsp; ");

  const resumeList = document.getElementById("resume-list")!;
  if (content.resume && content.resume.length > 0) {
    resumeList.innerHTML = content.resume
      .map(
        (item) => `
        <div class="edl-row" style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:12px; width:100%;">
            <span class="edl-project">${item.title}</span>
            <span class="edl-studio">${item.company} &nbsp;·&nbsp; ${item.dates}</span>
          </div>
          <p style="margin:0; font-size:0.95rem; color:var(--fg-dim); max-width:64ch;">${item.description}</p>
        </div>`
      )
      .join("");
  } else {
    resumeList.innerHTML = `<p class="slate">No resume data available.</p>`;
  }
});
