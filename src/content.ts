/**
 * Content lives in /public/content.json. Edit it by hand or through /admin.
 * This file defines the shape of that data and fetches it at runtime.
 */

export interface ReelItem {
  title: string;
  meta: string;
  image: string;
  video?: string;
  link?: string;
  description?: string;
  script?: string;
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

export interface ExperienceItem {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface EducationItem {
  degree: string;
  school: string;
  year: string;
  notes?: string;
}

export interface Resume {
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: string[];
}

export interface SiteContent {
  name: string;
  role: string;
  location: string;
  statement: string;
  projects: {
    editing: ReelItem[];
    writing: ReelItem[];
    lighting: ReelItem[];
    camera: ReelItem[];
  };
  resume: Resume;
  credits: CreditItem[];
  skills: string[];
  contact: {
    email: string;
    phone?: string;
    links: ContactLink[];
  };
}

const FALLBACK: SiteContent = {
  name: "Your Name",
  role: "Film Editor",
  location: "",
  statement: "",
  projects: { editing: [], writing: [], lighting: [], camera: [] },
  resume: { experience: [], education: [], certifications: [] },
  credits: [],
  skills: [],
  contact: { email: "", links: [] },
};

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
