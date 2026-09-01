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
});
