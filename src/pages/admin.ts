import "../style.css";
import { loadContent, type SiteContent, type ReelItem } from "../content";
import { initSite } from "../site";

initSite("admin");

const PASS_KEY = "reelcut-admin-pass-hash";
const SETTINGS_KEY = "reelcut-admin-settings";
const TOKEN_KEY = "reelcut-admin-token";

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Settings { owner: string; repo: string; branch: string; }
function getSettings(): Settings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  return raw ? JSON.parse(raw) : { owner: "thepacheco", repo: "a_portfolio", branch: "main" };
}
function saveSettings(s: Settings) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
function getToken(): string { return localStorage.getItem(TOKEN_KEY) ?? ""; }
function saveToken(t: string) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }

async function ghRequest(method: "GET" | "PUT", path: string, body?: unknown) {
  const { owner, repo, branch } = getSettings();
  const token = getToken();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${method === "GET" ? `?ref=${branch}` : ""}`;
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
async function getFileSha(path: string): Promise<string | undefined> {
  const res = await ghRequest("GET", path);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Reading ${path} failed (${res.status})`);
  return (await res.json()).sha as string;
}
async function putFile(path: string, base64Content: string, message: string) {
  const sha = await getFileSha(path);
  const { branch } = getSettings();
  const res = await ghRequest("PUT", path, { message, content: base64Content, branch, ...(sha ? { sha } : {}) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as { message?: string });
    throw new Error(`Publishing ${path} failed (${res.status}) ${err.message ?? ""}`.trim());
  }
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function utf8ToBase64(text: string): string { return btoa(String.fromCharCode(...new TextEncoder().encode(text))); }
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled";
}

let content: SiteContent;
const pendingImage = new Map<ReelItem, File>();
const pendingVideo = new Map<ReelItem, File>();
const root = document.getElementById("admin-root")!;

function escapeAttr(s: string): string { return s.replace(/"/g, "&quot;"); }
function escapeHtml(s: string): string { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

function textField(label: string, path: string, value: string): string {
  return `<div class="field"><label>${label}</label><input type="text" data-path="${path}" value="${escapeAttr(value)}" /></div>`;
}
function areaField(label: string, path: string, value: string): string {
  return `<div class="field"><label>${label}</label><textarea data-path="${path}">${escapeHtml(value)}</textarea></div>`;
}

async function renderGate() {
  const hasPassword = !!localStorage.getItem(PASS_KEY);
  root.innerHTML = `
    <div class="admin-shell">
      <h1>Admin</h1>
      <p class="lede">${hasPassword ? "Enter your admin password to continue." : "Set an admin password for this browser."}</p>
      <form class="admin-gate" id="gate-form">
        <input type="password" id="gate-pass" placeholder="Password" autocomplete="current-password" required />
        ${!hasPassword ? `<input type="password" id="gate-pass-confirm" placeholder="Confirm password" required />` : ""}
        <button class="btn" type="submit">${hasPassword ? "Unlock" : "Set password"}</button>
        ${hasPassword ? `<button class="btn secondary" type="button" id="gate-reset">Forgot it — reset</button>` : ""}
      </form>
    </div>`;
  document.getElementById("gate-reset")?.addEventListener("click", () => { localStorage.removeItem(PASS_KEY); renderGate(); });
  document.getElementById("gate-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pass = (document.getElementById("gate-pass") as HTMLInputElement).value;
    if (!hasPassword) {
      const confirm = (document.getElementById("gate-pass-confirm") as HTMLInputElement).value;
      if (pass !== confirm) { alert("Passwords don't match."); return; }
      localStorage.setItem(PASS_KEY, await sha256Hex(pass));
      await bootDashboard();
      return;
    }
    if ((await sha256Hex(pass)) === localStorage.getItem(PASS_KEY)) await bootDashboard();
    else alert("Wrong password.");
  });
}

async function bootDashboard() {
  content = await loadContent();
  if (!content.projects) content.projects = { editing: [], writing: [], lighting: [], camera: [] };
  if (!content.resume) content.resume = { experience: [], education: [], certifications: [] } as any;
  renderDashboard();
}

function renderDashboard() {
  const settings = getSettings();
  const token = getToken();
  const resume = content.resume as any;

  root.innerHTML = `
    <div class="admin-shell">
      <h1>Edit site content</h1>
      <p class="lede">Changes don't go live until you click Publish.</p>

      <div class="admin-section"><h2>Profile</h2>
        ${textField("Name", "name", content.name)}
        ${textField("Role", "role", content.role)}
        ${textField("Location", "location", content.location)}
        ${areaField("Statement", "statement", content.statement)}
        ${textField("Email", "contact.email", content.contact.email)}
        ${textField("Phone", "contact.phone", content.contact.phone ?? "")}
      </div>

      <div class="admin-section"><h2>Contact Links</h2>
        <div id="links-rows"></div>
        <button type="button" class="add-row" id="add-link">+ Add link</button>
      </div>

      <div class="admin-section"><h2>Skills</h2>
        <p class="hint">One per line.</p>
        <textarea id="skills-area" style="min-height:140px;">${escapeHtml(content.skills.join("\n"))}</textarea>
      </div>

      <div class="admin-section"><h2>Projects: Editing</h2>
        <div id="editing-rows"></div>
        <button type="button" class="add-row" data-add-project="editing">+ Add</button>
      </div>
      <div class="admin-section"><h2>Projects: Writing</h2>
        <p class="hint">Writing projects can include a "Script" field — readers can view it inline on the Work page.</p>
        <div id="writing-rows"></div>
        <button type="button" class="add-row" data-add-project="writing">+ Add</button>
      </div>
      <div class="admin-section"><h2>Projects: Lighting</h2>
        <div id="lighting-rows"></div>
        <button type="button" class="add-row" data-add-project="lighting">+ Add</button>
      </div>
      <div class="admin-section"><h2>Projects: Camera</h2>
        <div id="camera-rows"></div>
        <button type="button" class="add-row" data-add-project="camera">+ Add</button>
      </div>

      <div class="admin-section"><h2>Resume: Experience</h2>
        <div id="exp-rows"></div>
        <button type="button" class="add-row" id="add-exp">+ Add job</button>
      </div>
      <div class="admin-section"><h2>Resume: Education</h2>
        <div id="edu-rows"></div>
        <button type="button" class="add-row" id="add-edu">+ Add</button>
      </div>
      <div class="admin-section"><h2>Resume: Certifications</h2>
        <p class="hint">One per line.</p>
        <textarea id="certs-area" style="min-height:100px;">${escapeHtml((resume.certifications || []).join("\n"))}</textarea>
      </div>

      <div class="admin-section"><h2>Credits (Filmography)</h2>
        <div id="credits-rows"></div>
        <button type="button" class="add-row" id="add-credit">+ Add credit</button>
      </div>

      <div class="admin-section"><h2>Publishing</h2>
        ${textField("GitHub owner", "__owner", settings.owner)}
        ${textField("Repo name", "__repo", settings.repo)}
        ${textField("Branch", "__branch", settings.branch)}
        <div class="field"><label>GitHub token</label><input type="password" id="token-input" value="${escapeAttr(token)}" placeholder="ghp_..." /></div>
      </div>

      <div class="admin-actions">
        <button class="btn" id="publish-btn">Publish to GitHub</button>
        <button class="btn secondary" id="download-btn">Download content.json</button>
        <button class="btn secondary" id="lock-btn">Lock</button>
      </div>
      <div id="admin-log"></div>
    </div>`;

  renderLinkRows();
  (["editing", "writing", "lighting", "camera"] as const).forEach(renderProjectRows);
  renderExpRows();
  renderEduRows();
  renderCreditRows();
  wireBindings();
  wireActions();
}

function renderLinkRows() {
  document.getElementById("links-rows")!.innerHTML = content.contact.links
    .map((link, i) => `
      <div class="repeat-row">
        <button type="button" class="remove-row" data-remove="links.${i}">Remove</button>
        <div class="field"><label>Label</label><input type="text" data-path="contact.links.${i}.label" value="${escapeAttr(link.label)}" /></div>
        <div class="field"><label>URL</label><input type="text" data-path="contact.links.${i}.url" value="${escapeAttr(link.url)}" /></div>
      </div>`).join("");
}

function renderProjectRows(cat: "editing"|"writing"|"lighting"|"camera") {
  const el = document.getElementById(cat + "-rows")!;
  el.innerHTML = content.projects[cat].map((item, i) => {
    const imgFile = pendingImage.get(item);
    const preview = imgFile ? URL.createObjectURL(imgFile) : item.image;
    return `
      <div class="repeat-row single-col">
        <button type="button" class="remove-row" data-remove="projects.${cat}.${i}">Remove</button>
        <img class="thumb-preview" src="${preview}" alt="" />
        ${textField("Title", `projects.${cat}.${i}.title`, item.title)}
        ${textField("Meta", `projects.${cat}.${i}.meta`, item.meta)}
        ${textField("Link", `projects.${cat}.${i}.link`, item.link ?? "")}
        ${areaField("Description", `projects.${cat}.${i}.description`, item.description ?? "")}
        ${cat === "writing" ? areaField("Script (full text)", `projects.${cat}.${i}.script`, item.script ?? "") : ""}
        <div class="field"><label>Replace still</label><input type="file" accept="image/*" data-file="projects.${cat}.${i}.image" /></div>
        <div class="field"><label>Replace clip</label><input type="file" accept="video/*" data-file="projects.${cat}.${i}.video" /></div>
      </div>`;
  }).join("");
}

function renderExpRows() {
  const resume = content.resume as any;
  const exp = resume.experience || [];
  document.getElementById("exp-rows")!.innerHTML = exp.map((job: any, i: number) => `
    <div class="repeat-row single-col">
      <button type="button" class="remove-row" data-remove="resume.experience.${i}">Remove</button>
      ${textField("Job title", `resume.experience.${i}.title`, job.title)}
      ${textField("Company", `resume.experience.${i}.company`, job.company)}
      ${textField("Dates", `resume.experience.${i}.dates`, job.dates)}
      ${areaField("Bullets (one per line)", `resume.experience.${i}.__bullets`, (job.bullets || []).join("\n"))}
    </div>`).join("");
}

function renderEduRows() {
  const resume = content.resume as any;
  const edu = resume.education || [];
  document.getElementById("edu-rows")!.innerHTML = edu.map((ed: any, i: number) => `
    <div class="repeat-row single-col">
      <button type="button" class="remove-row" data-remove="resume.education.${i}">Remove</button>
      ${textField("Degree", `resume.education.${i}.degree`, ed.degree)}
      ${textField("School", `resume.education.${i}.school`, ed.school)}
      ${textField("Year", `resume.education.${i}.year`, ed.year)}
      ${textField("Notes", `resume.education.${i}.notes`, ed.notes ?? "")}
    </div>`).join("");
}

function renderCreditRows() {
  document.getElementById("credits-rows")!.innerHTML = content.credits.map((c, i) => `
    <div class="repeat-row">
      <button type="button" class="remove-row" data-remove="credits.${i}">Remove</button>
      <div class="field"><label>Year</label><input type="text" data-path="credits.${i}.year" value="${escapeAttr(c.year)}" /></div>
      <div class="field"><label>Role</label><input type="text" data-path="credits.${i}.role" value="${escapeAttr(c.role)}" /></div>
      <div class="field"><label>Project</label><input type="text" data-path="credits.${i}.project" value="${escapeAttr(c.project)}" /></div>
      <div class="field"><label>Studio</label><input type="text" data-path="credits.${i}.studio" value="${escapeAttr(c.studio)}" /></div>
    </div>`).join("");
}

function setByPath(obj: any, path: string, value: unknown) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

function wireBindings() {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-path]").forEach((el) => {
    el.addEventListener("input", () => {
      const path = el.getAttribute("data-path")!;
      if (path.startsWith("__")) return;
      // Special: bullets stored as newline-delimited string
      if (path.endsWith(".__bullets")) {
        const realPath = path.replace(".__bullets", ".bullets");
        setByPath(content, realPath, el.value.split("\n").map(s => s.trim()).filter(Boolean));
        return;
      }
      setByPath(content, path, el.value);
    });
  });

  root.querySelectorAll<HTMLInputElement>("[data-file]").forEach((el) => {
    el.addEventListener("change", () => {
      const path = el.getAttribute("data-file")!.split(".");
      const category = path[1] as "editing"|"writing"|"lighting"|"camera";
      const idx = Number(path[2]);
      const kind = path[3];
      const item = content.projects[category][idx];
      const file = el.files?.[0];
      if (!file || !item) return;
      if (kind === "image") pendingImage.set(item, file);
      else pendingVideo.set(item, file);
      renderProjectRows(category);
      wireBindings();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const parts = btn.getAttribute("data-remove")!.split(".");
      if (parts[0] === "projects") {
        const cat = parts[1] as keyof typeof content.projects;
        content.projects[cat].splice(Number(parts[2]), 1);
        renderProjectRows(cat);
      } else if (parts[0] === "resume") {
        const sub = parts[1] as string;
        (content.resume as any)[sub].splice(Number(parts[2]), 1);
        if (sub === "experience") renderExpRows();
        else renderEduRows();
      } else if (parts[0] === "credits") {
        content.credits.splice(Number(parts[1]), 1);
        renderCreditRows();
      } else if (parts[0] === "links") {
        content.contact.links.splice(Number(parts[1]), 1);
        renderLinkRows();
      }
      wireBindings();
    });
  });
}

function wireActions() {
  document.getElementById("add-link")!.addEventListener("click", () => {
    content.contact.links.push({ label: "New link", url: "#" });
    renderLinkRows(); wireBindings();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-add-project]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-add-project") as keyof typeof content.projects;
      content.projects[cat].push({ title: "New project", meta: "Role · 2026", image: "media/stick_editing.jpg" });
      renderProjectRows(cat); wireBindings();
    });
  });
  document.getElementById("add-exp")!.addEventListener("click", () => {
    (content.resume as any).experience.push({ title: "Job Title", company: "Company", dates: "2026 – Present", bullets: ["Responsibility here"] });
    renderExpRows(); wireBindings();
  });
  document.getElementById("add-edu")!.addEventListener("click", () => {
    (content.resume as any).education.push({ degree: "Degree", school: "School", year: "2026", notes: "" });
    renderEduRows(); wireBindings();
  });
  document.getElementById("add-credit")!.addEventListener("click", () => {
    content.credits.unshift({ year: "2026", role: "Role", project: "Project", studio: "Studio" });
    renderCreditRows(); wireBindings();
  });

  const ownerEl = root.querySelector<HTMLInputElement>('[data-path="__owner"]')!;
  const repoEl = root.querySelector<HTMLInputElement>('[data-path="__repo"]')!;
  const branchEl = root.querySelector<HTMLInputElement>('[data-path="__branch"]')!;
  const tokenEl = document.getElementById("token-input") as HTMLInputElement;
  [ownerEl, repoEl, branchEl].forEach((el) =>
    el.addEventListener("input", () => saveSettings({ owner: ownerEl.value, repo: repoEl.value, branch: branchEl.value }))
  );
  tokenEl.addEventListener("input", () => saveToken(tokenEl.value));
  document.getElementById("lock-btn")!.addEventListener("click", () => renderGate());

  document.getElementById("download-btn")!.addEventListener("click", () => {
    collectTextAreas();
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "content.json"; a.click();
  });

  document.getElementById("publish-btn")!.addEventListener("click", async () => {
    const log = document.getElementById("admin-log")!;
    const line = (msg: string, cls = "") => { log.innerHTML += `<div class="${cls}">${escapeHtml(msg)}</div>`; log.scrollTop = log.scrollHeight; };
    log.innerHTML = "";
    if (!getToken()) { line("No GitHub token set.", "err"); return; }
    collectTextAreas();
    const publishBtn = document.getElementById("publish-btn") as HTMLButtonElement;
    publishBtn.disabled = true;
    try {
      const allProjects = [...content.projects.editing, ...content.projects.writing, ...content.projects.lighting, ...content.projects.camera];
      for (const item of allProjects) {
        const img = pendingImage.get(item);
        if (img) {
          const ext = img.name.split(".").pop() || "jpg";
          const path = `public/media/${slugify(item.title)}.${ext}`;
          line(`Uploading ${path} ...`);
          await putFile(path, await fileToBase64(img), `Update still for ${item.title}`);
          item.image = `media/${slugify(item.title)}.${ext}`;
          line(`  done`, "ok");
        }
        const vid = pendingVideo.get(item);
        if (vid) {
          const ext = vid.name.split(".").pop() || "mp4";
          const path = `public/media/${slugify(item.title)}.${ext}`;
          line(`Uploading ${path} ...`);
          await putFile(path, await fileToBase64(vid), `Update clip for ${item.title}`);
          item.video = `media/${slugify(item.title)}.${ext}`;
          line(`  done`, "ok");
        }
      }
      line("Updating content.json ...");
      await putFile("public/content.json", utf8ToBase64(JSON.stringify(content, null, 2)), "Update site content via admin panel");
      line("Published. GitHub Actions will rebuild and deploy.", "ok");
      pendingImage.clear(); pendingVideo.clear();
    } catch (err) {
      line(`Failed: ${(err as Error).message}`, "err");
    } finally { publishBtn.disabled = false; }
  });
}

function collectTextAreas() {
  content.skills = (document.getElementById("skills-area") as HTMLTextAreaElement).value.split("\n").map(s => s.trim()).filter(Boolean);
  (content.resume as any).certifications = (document.getElementById("certs-area") as HTMLTextAreaElement).value.split("\n").map((s: string) => s.trim()).filter(Boolean);
}

renderGate();
