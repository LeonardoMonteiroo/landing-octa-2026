// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://leonardomonteiroo.github.io",
  base: "/landing-octa-2026",
  vite: {
    plugins: [tailwindcss()],
  },
});
