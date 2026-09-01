/**
 * ─────────────────────────────────────────────────────────────────────────
 *  EDIT THIS FILE TO ADD YOUR OWN WORK.
 *  Everything the site displays — reel, credits, contact — is defined here.
 *  No other file needs to change for day-to-day updates.
 *  See README.md → "Adding your own work" for the full walkthrough.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface ReelItem {
  /** Short project title as it should appear on the frame. */
  title: string;
  /** One line of role/context, e.g. "Editor · Music video · 2025" */
  meta: string;
  /** Path under /public, e.g. "/media/still-01.jpg" — swap for your still. */
  image: string;
  /** Optional: path to a muted looping clip under /public, e.g. "/media/reel-loop.mp4" */
  video?: string;
  /** Optional external link to the full cut (Vimeo/YouTube/etc). */
  link?: string;
}

export interface CreditItem {
  year: string;
  role: string;
  project: string;
  studio: string;
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
    links: { label: string; url: string }[];
  };
}

export const content: SiteContent = {
  name: "Alex Rivera",
  role: "Film Editor",
  location: "Based in Atlanta, GA — available for remote & on-site work",
  statement:
    "I cut for rhythm first, story second — the two are rarely in conflict once you find the right frame to hold on. Six years across narrative shorts, music videos, and commercial work.",

  reel: [
    {
      title: "Night Drive",
      meta: "Editor · Short Film · 2025",
      image: "/media/still-01.jpg",
      video: "/media/reel-loop.mp4",
      link: "#",
    },
    {
      title: "Harvest",
      meta: "Editor, Colorist · Documentary · 2024",
      image: "/media/still-02.jpg",
      link: "#",
    },
    {
      title: "Glasshouse",
      meta: "Editor · Music Video · 2024",
      image: "/media/still-03.jpg",
      link: "#",
    },
    {
      title: "Concrete Orbit",
      meta: "Editor · Commercial · 2023",
      image: "/media/still-04.jpg",
      link: "#",
    },
    {
      title: "Salt Flats",
      meta: "Assistant Editor · Feature · 2023",
      image: "/media/still-05.jpg",
      link: "#",
    },
    {
      title: "Afterglow",
      meta: "Editor · Narrative Short · 2022",
      image: "/media/still-06.jpg",
      link: "#",
    },
  ],

  credits: [
    { year: "2025", role: "Editor", project: "Night Drive", studio: "Faultline Pictures" },
    { year: "2024", role: "Editor / Colorist", project: "Harvest", studio: "Fieldnote Docs" },
    { year: "2024", role: "Editor", project: "Glasshouse — music video", studio: "Half Light Records" },
    { year: "2023", role: "Editor", project: "Concrete Orbit — 60s spot", studio: "Northbound Studio" },
    { year: "2023", role: "Assistant Editor", project: "Salt Flats", studio: "Meridian Film Co." },
    { year: "2022", role: "Editor", project: "Afterglow", studio: "Independent" },
    { year: "2021", role: "Post-Production Coordinator", project: "In-house commercial team", studio: "Loop & Line" },
  ],

  skills: [
    "Avid Media Composer",
    "Premiere Pro",
    "DaVinci Resolve",
    "Sound design & mix prep",
    "Color grading",
    "Documentary & narrative structure",
  ],

  contact: {
    email: "hello@alexrivera.example",
    links: [
      { label: "Vimeo", url: "#" },
      { label: "IMDb", url: "#" },
      { label: "LinkedIn", url: "#" },
    ],
  },
};
