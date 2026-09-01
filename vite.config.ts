import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: r("./index.html"),
        work: r("./work.html"),
        about: r("./about.html"),
        contact: r("./contact.html"),
        admin: r("./admin.html"),
      },
    },
  },
});
