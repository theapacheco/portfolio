import "../style.css";
import { loadContent, type SiteContent, type ReelItem } from "../content";
import { initSite } from "../site";

initSite("admin");

/* ── tiny local "auth" — see README → Admin panel for what this is and isn't ── */
const PASS_KEY = "reelcut-admin-pass-hash";
const SETTINGS_KEY = "reelcut-admin-settings"; // { owner, repo, branch } — token stored separately
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

/* ── GitHub Contents API — runs from this browser, straight to api.github.com ── */
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
            : "No admin password is set on this browser yet. Choose one now — it only needs to keep casual visitors out on a shared computer; it isn't real security (see below)."
        }
      </p>
      <form class="admin-gate" id="gate-form">
        <input type="password" id="gate-pass" placeholder="Password" autocomplete="current-password" required />
        ${!hasPassword ? `<input type="password" id="gate-pass-confirm" placeholder="Confirm password" required />` : ""}
        <button class="btn" type="submit">${hasPassword ? "Unlock" : "Set password"}</button>
        ${hasPassword ? `<button class="btn secondary" type="button" id="gate-reset">Forgot it — reset</button>` : ""}
      </form>
      <p class="hint" style="max-width:52ch;margin-top:20px;color:var(--fg-dim);font-size:0.85rem;">
        Honest note: this password only lives in this browser's local storage and is checked
        by this page's own JavaScript — it keeps the panel tidy on a shared machine, but
        anyone who opens developer tools could bypass it. The thing that actually protects
        your site is your GitHub token below, which you enter once, it stays only in this
        browser, and it's the only way any change actually reaches GitHub.
      </p>
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
        <p class="hint">Shown on the Contact page (Vimeo, IMDb, LinkedIn, etc).</p>
        <div id="links-rows"></div>
        <button type="button" class="add-row" id="add-link">+ Add link</button>
      </div>

      <div class="admin-section">
        <h2>Skills</h2>
        <p class="hint">One per line.</p>
        <textarea id="skills-area" style="min-height:120px;">${escapeHtml(content.skills.join("\n"))}</textarea>
      </div>

      <div class="admin-section">
        <h2>Reel</h2>
        <p class="hint">Drag in a new still or clip to replace one — it uploads when you Publish.</p>
        <div id="reel-rows"></div>
        <button type="button" class="add-row" id="add-reel">+ Add reel item</button>
      </div>

      <div class="admin-section">
        <h2>Credits</h2>
        <div id="credits-rows"></div>
        <button type="button" class="add-row" id="add-credit">+ Add credit</button>
      </div>

      <div class="admin-section">
        <h2>Publishing</h2>
        <p class="hint">
          Your token is stored only in this browser's local storage and is sent only to
          api.github.com when you click Publish — never anywhere else.
          Use a
          <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener">fine-grained token</a>
          scoped to just this one repo, with Contents: Read and write.
        </p>
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
        <button class="btn secondary" id="download-btn">Download content.json instead</button>
        <button class="btn secondary" id="lock-btn">Lock</button>
      </div>

      <div id="admin-log"></div>
    </div>
  `;

  renderLinkRows();
  renderReelRows();
  renderCreditRows();
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

function renderReelRows() {
  const el = document.getElementById("reel-rows")!;
  el.innerHTML = content.reel
    .map((item, i) => {
      const imgFile = pendingImage.get(item);
      const preview = imgFile ? URL.createObjectURL(imgFile) : item.image;
      return `
      <div class="repeat-row single-col">
        <button type="button" class="remove-row" data-remove="reel.${i}">Remove</button>
        <img class="thumb-preview" src="${preview}" alt="" />
        <div class="field"><label>Title</label><input type="text" data-path="reel.${i}.title" value="${escapeAttr(item.title)}" /></div>
        <div class="field"><label>Meta line</label><input type="text" data-path="reel.${i}.meta" value="${escapeAttr(item.meta)}" /></div>
        <div class="field"><label>Link (full cut)</label><input type="text" data-path="reel.${i}.link" value="${escapeAttr(item.link ?? "")}" /></div>
        <div class="field"><label>Replace still</label><input type="file" accept="image/*" data-file="reel.${i}.image" /></div>
        <div class="field"><label>Replace clip (optional, muted loop)</label><input type="file" accept="video/*" data-file="reel.${i}.video" /></div>
      </div>`;
    })
    .join("");
}

function renderCreditRows() {
  const el = document.getElementById("credits-rows")!;
  el.innerHTML = content.credits
    .map(
      (c, i) => `
      <div class="repeat-row">
        <button type="button" class="remove-row" data-remove="credits.${i}">Remove</button>
        <div class="field"><label>Year</label><input type="text" data-path="credits.${i}.year" value="${escapeAttr(c.year)}" /></div>
        <div class="field"><label>Role</label><input type="text" data-path="credits.${i}.role" value="${escapeAttr(c.role)}" /></div>
        <div class="field"><label>Project</label><input type="text" data-path="credits.${i}.project" value="${escapeAttr(c.project)}" /></div>
        <div class="field"><label>Studio</label><input type="text" data-path="credits.${i}.studio" value="${escapeAttr(c.studio)}" /></div>
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
      if (path.startsWith("__")) return; // settings fields, handled separately
      setByPath(content, path, el.value);
    });
  });

  root.querySelectorAll<HTMLInputElement>("[data-file]").forEach((el) => {
    el.addEventListener("change", () => {
      const [, idxStr, kind] = el.getAttribute("data-file")!.split(".");
      const item = content.reel[Number(idxStr)];
      const file = el.files?.[0];
      if (!file || !item) return;
      if (kind === "image") pendingImage.set(item, file);
      else pendingVideo.set(item, file);
      renderReelRows();
      wireBindings();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [group, idxStr] = btn.getAttribute("data-remove")!.split(".");
      const idx = Number(idxStr);
      if (group === "reel") content.reel.splice(idx, 1);
      if (group === "credits") content.credits.splice(idx, 1);
      if (group === "links") content.contact.links.splice(idx, 1);
      renderLinkRows();
      renderReelRows();
      renderCreditRows();
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
  document.getElementById("add-reel")!.addEventListener("click", () => {
    content.reel.push({ title: "New project", meta: "Editor · 2026", image: "media/still-01.jpg" });
    renderReelRows();
    wireBindings();
  });
  document.getElementById("add-credit")!.addEventListener("click", () => {
    content.credits.unshift({ year: "2026", role: "Editor", project: "New project", studio: "Studio" });
    renderCreditRows();
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
      line("No GitHub token set — add one under Publishing, or use Download instead.", "err");
      return;
    }

    content.skills = (document.getElementById("skills-area") as HTMLTextAreaElement).value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const publishBtn = document.getElementById("publish-btn") as HTMLButtonElement;
    publishBtn.disabled = true;

    try {
      for (const item of content.reel) {
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
      line("Published. GitHub Actions will rebuild and deploy — usually live within a minute.", "ok");
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
