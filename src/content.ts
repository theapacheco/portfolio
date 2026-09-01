/**
 * ─────────────────────────────────────────────────────────────────────────
 *  Content now lives in /public/content.json, not in this file.
 *  Edit it by hand, or through /admin (see README -> "Admin panel").
 *  This file only defines the shape of that data and fetches it at runtime.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface ReelItem {
  title: string;
  meta: string;
  image: string;
  video?: string;
  link?: string;
}

export interface CreditItem {
  year: string;
  role: string;
  project: string;
  studio: string;
}

export interface ContactLink {
  label: string;
  url: string;
}

export interface SiteContent {
  name: string;
  role: string;
  location: string;
  statement: string;
  reel: ReelItem[];
  credits: CreditItem[];
  skills: string[];
  contact: {
    email: string;
    links: ContactLink[];
  };
}

const FALLBACK: SiteContent = {
  name: "Your Name",
  role: "Film Editor",
  location: "",
  statement: "",
  reel: [],
  credits: [],
  skills: [],
  contact: { email: "", links: [] },
};

/**
 * Fetches the live content.json (cache-busted so edits show up immediately).
 * Uses a relative path deliberately — every page in this project sits at the
 * same directory depth, so this resolves correctly whether the site is
 * served from a domain root or a GitHub Pages subpath like /portfolio/.
 */
export async function loadContent(): Promise<SiteContent> {
  try {
    const res = await fetch(`content.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`content.json ${res.status}`);
    return (await res.json()) as SiteContent;
  } catch (err) {
    console.error("Could not load content.json - showing placeholder content.", err);
    return FALLBACK;
  }
}
