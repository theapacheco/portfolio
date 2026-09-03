import "../style.css";
import { loadContent } from "../content";
import { initSite } from "../site";

initSite("resume");

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

loadContent().then((content) => {
  /* ── Subtitle ── */
  document.getElementById("resume-subtitle")!.textContent = content.location;

  /* ── Contact bar ── */
  const contactEl = document.getElementById("resume-contact")!;
  contactEl.innerHTML = `
    <div class="resume-contact-bar">
      <a class="contact-email" href="mailto:${content.contact.email}">${content.contact.email}</a>
      ${content.contact.phone ? `<span class="slate">${esc(content.contact.phone)}</span>` : ""}
      <div class="contact-links">
        ${content.contact.links.map((l) => `<a href="${l.url}">${esc(l.label)}</a>`).join("")}
      </div>
    </div>
  `;

  /* ── Experience ── */
  const expList = document.getElementById("experience-list")!;
  const resume = content.resume;
  if (resume?.experience?.length) {
    expList.innerHTML = resume.experience
      .map(
        (job) => `
        <div class="resume-entry">
          <div class="resume-entry-header">
            <div>
              <h3 class="resume-entry-title">${esc(job.title)}</h3>
              <span class="resume-entry-company">${esc(job.company)}</span>
            </div>
            <span class="resume-entry-dates">${esc(job.dates)}</span>
          </div>
          <ul class="resume-bullets">
            ${job.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}
          </ul>
        </div>`
      )
      .join("");
  }

  /* ── Education ── */
  const eduList = document.getElementById("education-list")!;
  if (resume?.education?.length) {
    eduList.innerHTML = resume.education
      .map(
        (ed) => `
        <div class="resume-entry">
          <div class="resume-entry-header">
            <div>
              <h3 class="resume-entry-title">${esc(ed.degree)}</h3>
              <span class="resume-entry-company">${esc(ed.school)}</span>
            </div>
            <span class="resume-entry-dates">${esc(ed.year)}</span>
          </div>
          ${ed.notes ? `<p class="resume-notes">${esc(ed.notes)}</p>` : ""}
        </div>`
      )
      .join("");
  }

  /* ── Skills ── */
  document.getElementById("skills-list")!.innerHTML = content.skills
    .map((s) => `<li>${esc(s)}</li>`)
    .join("");

  /* ── Certifications ── */
  const certsEl = document.getElementById("certs-list")!;
  if (resume?.certifications?.length) {
    certsEl.innerHTML = resume.certifications.map((c) => `<li>${esc(c)}</li>`).join("");
  } else {
    document.getElementById("resume-certs")!.style.display = "none";
  }

  /* ── Credits ── */
  document.getElementById("credits-list")!.innerHTML = content.credits
    .map(
      (c) => `
      <div class="edl-row">
        <span class="tc">${esc(c.year)}</span>
        <span>
          <span class="edl-project">${esc(c.project)}</span><br />
          <span class="edl-role">${esc(c.role)}</span>
        </span>
        <span class="edl-studio">${esc(c.studio)}</span>
      </div>`
    )
    .join("");
});
