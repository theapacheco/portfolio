import "../style.css";
import { loadContent, type SiteContent, type ReelItem } from "../content";
import { initSite } from "../site";

initSite("admin");

/* ── tiny local "auth" — see README → Admin panel for what this is and isn't ── */
const PASS_KEY = "reelcut-admin-pass-hash";
const SETTINGS_KEY = "reelcut-admin-settings";
const TOKEN_KEY = "reelcut-admin-token";

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Settings {
  owner: string;
  repo: string;
  branch: string;
}
function getSettings(): Settings {
  const raw = localStorage.getItem(SETTINGS_KEY);
  return raw ? JSON.parse(raw) : { owner: "thepacheco", repo: "a_portfolio", branch: "main" };
}
function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}
function saveToken(t: string) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

/* ── GitHub Contents API ── */
async function ghRequest(method: "GET" | "PUT", path: string, body?: unknown) {
  const { owner, repo, branch } = getSettings();
  const token = getToken();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${
    method === "GET" ? `?ref=${branch}` : ""
  }`;
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
  const res = await ghRequest("PUT", path, {
    message,
    content: base64Content,
    branch,
    ...(sha ? { sha } : {}),
  });
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

function utf8ToBase64(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "untitled"
  );
}

/* ── State ──────────────────────────────────────────────────────────── */
let content: SiteContent;
const pendingImage = new Map<ReelItem, File>();
const pendingVideo = new Map<ReelItem, File>();

/* ── Gate ───────────────────────────────────────────────────────────── */
const root = document.getElementById("admin-root")!;

async function renderGate() {
  const hasPassword = !!localStorage.getItem(PASS_KEY);
  root.innerHTML = `
    <div class="admin-shell">
      <h1>Admin</h1>
      <p class="lede">
        ${
          hasPassword
            ? "Enter your admin password to continue."
            : "No admin password is set on this browser yet. Choose one now."
        }
      </p>
      <form class="admin-gate" id="gate-form">
        <input type="password" id="gate-pass" placeholder="Password" autocomplete="current-password" required />
        ${!hasPassword ? `<input type="password" id="gate-pass-confirm" placeholder="Confirm password" required />` : ""}
        <button class="btn" type="submit">${hasPassword ? "Unlock" : "Set password"}</button>
        ${hasPassword ? `<button class="btn secondary" type="button" id="gate-reset">Forgot it — reset</button>` : ""}
      </form>
    </div>
  `;

  document.getElementById("gate-reset")?.addEventListener("click", () => {
    localStorage.removeItem(PASS_KEY);
    renderGate();
  });

  document.getElementById("gate-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pass = (document.getElementById("gate-pass") as HTMLInputElement).value;
    if (!hasPassword) {
      const confirm = (document.getElementById("gate-pass-confirm") as HTMLInputElement).value;
      if (pass !== confirm) {
        alert("Passwords don't match.");
        return;
      }
      localStorage.setItem(PASS_KEY, await sha256Hex(pass));
      await bootDashboard();
      return;
    }
    const stored = localStorage.getItem(PASS_KEY);
    if ((await sha256Hex(pass)) === stored) {
      await bootDashboard();
    } else {
      alert("Wrong password.");
    }
  });
}

/* ── Dashboard ──────────────────────────────────────────────────────── */
async function bootDashboard() {
  content = await loadContent();
  if (!content.projects) {
    content.projects = { editing: [], writing: [], lighting: [], camera: [] };
  }
  if (!content.resume) content.resume = [];
  renderDashboard();
}

function textField(labelText: string, path: string, value: string): string {
  return `
    <div class="field">
      <label>${labelText}</label>
      <input type="text" data-path="${path}" value="${escapeAttr(value)}" />
    </div>`;
}
function areaField(labelText: string, path: string, value: string): string {
  return `
    <div class="field">
      <label>${labelText}</label>
      <textarea data-path="${path}">${escapeHtml(value)}</textarea>
    </div>`;
}
function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}
function escapeHtml(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function renderDashboard() {
  const settings = getSettings();
  const token = getToken();

  root.innerHTML = `
    <div class="admin-shell">
      <h1>Edit site content</h1>
      <p class="lede">Changes here don't touch anything until you click Publish.</p>

      <div class="admin-section">
        <h2>Profile</h2>
        ${textField("Name", "name", content.name)}
        ${textField("Role", "role", content.role)}
        ${textField("Location line", "location", content.location)}
        ${areaField("Statement", "statement", content.statement)}
        ${textField("Contact email", "contact.email", content.contact.email)}
      </div>

      <div class="admin-section">
        <h2>Contact links</h2>
        <div id="links-rows"></div>
        <button type="button" class="add-row" id="add-link">+ Add link</button>
      </div>

      <div class="admin-section">
        <h2>Skills</h2>
        <textarea id="skills-area" style="min-height:120px;">${escapeHtml(content.skills.join("\n"))}</textarea>
      </div>

      <div class="admin-section">
        <h2>Projects: Editing</h2>
        <div id="editing-rows"></div>
        <button type="button" class="add-row" data-add-project="editing">+ Add editing item</button>
      </div>
      
      <div class="admin-section">
        <h2>Projects: Writing</h2>
        <div id="writing-rows"></div>
        <button type="button" class="add-row" data-add-project="writing">+ Add writing item</button>
      </div>
      
      <div class="admin-section">
        <h2>Projects: Lighting</h2>
        <div id="lighting-rows"></div>
        <button type="button" class="add-row" data-add-project="lighting">+ Add lighting item</button>
      </div>
      
      <div class="admin-section">
        <h2>Projects: Camera</h2>
        <div id="camera-rows"></div>
        <button type="button" class="add-row" data-add-project="camera">+ Add camera item</button>
      </div>

      <div class="admin-section">
        <h2>Resume / Experience</h2>
        <div id="resume-rows"></div>
        <button type="button" class="add-row" id="add-resume">+ Add resume entry</button>
      </div>

      <div class="admin-section">
        <h2>Publishing</h2>
        ${textField("GitHub owner", "__owner", settings.owner)}
        ${textField("Repo name", "__repo", settings.repo)}
        ${textField("Branch", "__branch", settings.branch)}
        <div class="field">
          <label>GitHub token</label>
          <input type="password" id="token-input" value="${escapeAttr(token)}" placeholder="ghp_... or github_pat_..." />
        </div>
      </div>

      <div class="admin-actions">
        <button class="btn" id="publish-btn">Publish to GitHub</button>
        <button class="btn secondary" id="download-btn">Download content.json</button>
        <button class="btn secondary" id="lock-btn">Lock</button>
      </div>

      <div id="admin-log"></div>
    </div>
  `;

  renderLinkRows();
  renderProjectRows("editing");
  renderProjectRows("writing");
  renderProjectRows("lighting");
  renderProjectRows("camera");
  renderResumeRows();
  wireBindings();
  wireActions();
}

function renderLinkRows() {
  const el = document.getElementById("links-rows")!;
  el.innerHTML = content.contact.links
    .map(
      (link, i) => `
      <div class="repeat-row">
        <button type="button" class="remove-row" data-remove="links.${i}">Remove</button>
        <div class="field"><label>Label</label><input type="text" data-path="contact.links.${i}.label" value="${escapeAttr(link.label)}" /></div>
        <div class="field"><label>URL</label><input type="text" data-path="contact.links.${i}.url" value="${escapeAttr(link.url)}" /></div>
      </div>`
    )
    .join("");
}

function renderProjectRows(category: "editing" | "writing" | "lighting" | "camera") {
  const el = document.getElementById(category + "-rows")!;
  el.innerHTML = content.projects[category]
    .map((item, i) => {
      const imgFile = pendingImage.get(item);
      const preview = imgFile ? URL.createObjectURL(imgFile) : item.image;
      return `
      <div class="repeat-row single-col">
        <button type="button" class="remove-row" data-remove="projects.${category}.${i}">Remove</button>
        <img class="thumb-preview" src="${preview}" alt="" />
        <div class="field"><label>Title</label><input type="text" data-path="projects.${category}.${i}.title" value="${escapeAttr(item.title)}" /></div>
        <div class="field"><label>Meta line</label><input type="text" data-path="projects.${category}.${i}.meta" value="${escapeAttr(item.meta)}" /></div>
        <div class="field"><label>Link (full cut)</label><input type="text" data-path="projects.${category}.${i}.link" value="${escapeAttr(item.link ?? "")}" /></div>
        <div class="field"><label>Replace still</label><input type="file" accept="image/*" data-file="projects.${category}.${i}.image" /></div>
        <div class="field"><label>Replace clip (optional)</label><input type="file" accept="video/*" data-file="projects.${category}.${i}.video" /></div>
      </div>`;
    })
    .join("");
}

function renderResumeRows() {
  const el = document.getElementById("resume-rows")!;
  el.innerHTML = content.resume
    .map(
      (r, i) => `
      <div class="repeat-row">
        <button type="button" class="remove-row" data-remove="resume.${i}">Remove</button>
        <div class="field"><label>Title</label><input type="text" data-path="resume.${i}.title" value="${escapeAttr(r.title)}" /></div>
        <div class="field"><label>Company</label><input type="text" data-path="resume.${i}.company" value="${escapeAttr(r.company)}" /></div>
        <div class="field"><label>Dates</label><input type="text" data-path="resume.${i}.dates" value="${escapeAttr(r.dates)}" /></div>
        <div class="field" style="grid-column: span 2;"><label>Description</label><textarea data-path="resume.${i}.description">${escapeHtml(r.description)}</textarea></div>
      </div>`
    )
    .join("");
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
        const idx = Number(parts[2]);
        content.projects[cat].splice(idx, 1);
        renderProjectRows(cat);
      } else if (parts[0] === "resume") {
        content.resume.splice(Number(parts[1]), 1);
        renderResumeRows();
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
    renderLinkRows();
    wireBindings();
  });
  
  root.querySelectorAll<HTMLButtonElement>("[data-add-project]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-add-project") as keyof typeof content.projects;
      content.projects[cat].push({ title: "New project", meta: "Role · 2026", image: "media/stick_editing.jpg" });
      renderProjectRows(cat);
      wireBindings();
    });
  });

  document.getElementById("add-resume")!.addEventListener("click", () => {
    content.resume.unshift({ title: "New Role", company: "Company", dates: "2026 - Present", description: "Description here" });
    renderResumeRows();
    wireBindings();
  });

  const ownerEl = root.querySelector<HTMLInputElement>('[data-path="__owner"]')!;
  const repoEl = root.querySelector<HTMLInputElement>('[data-path="__repo"]')!;
  const branchEl = root.querySelector<HTMLInputElement>('[data-path="__branch"]')!;
  const tokenEl = document.getElementById("token-input") as HTMLInputElement;
  [ownerEl, repoEl, branchEl].forEach((el) =>
    el.addEventListener("input", () =>
      saveSettings({ owner: ownerEl.value, repo: repoEl.value, branch: branchEl.value })
    )
  );
  tokenEl.addEventListener("input", () => saveToken(tokenEl.value));

  document.getElementById("lock-btn")!.addEventListener("click", () => renderGate());

  document.getElementById("download-btn")!.addEventListener("click", () => {
    content.skills = (document.getElementById("skills-area") as HTMLTextAreaElement).value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "content.json";
    a.click();
  });

  document.getElementById("publish-btn")!.addEventListener("click", async () => {
    const log = document.getElementById("admin-log")!;
    const line = (msg: string, cls = "") => {
      log.innerHTML += `<div class="${cls}">${escapeHtml(msg)}</div>`;
      log.scrollTop = log.scrollHeight;
    };
    log.innerHTML = "";

    if (!getToken()) {
      line("No GitHub token set.", "err");
      return;
    }

    content.skills = (document.getElementById("skills-area") as HTMLTextAreaElement).value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const publishBtn = document.getElementById("publish-btn") as HTMLButtonElement;
    publishBtn.disabled = true;

    try {
      const allProjects = [
        ...content.projects.editing,
        ...content.projects.writing,
        ...content.projects.lighting,
        ...content.projects.camera
      ];
      
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
      await putFile(
        "public/content.json",
        utf8ToBase64(JSON.stringify(content, null, 2)),
        "Update site content via admin panel"
      );
      line("Published. GitHub Actions will rebuild and deploy.", "ok");
      pendingImage.clear();
      pendingVideo.clear();
    } catch (err) {
      line(`Failed: ${(err as Error).message}`, "err");
    } finally {
      publishBtn.disabled = false;
    }
  });
}

renderGate();
