import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps every asset URL relative, so the same build works at
// https://oursharedcode.github.io/prompt-engineering-studio/, at
// https://www.oursharedcode.com/prompt-engineering-studio/, and at any other
// path the site is ever served from — no rebuild needed to move it.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
