import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps every asset URL relative, so the same build works at
// https://oursharedcode.github.io/promengi-simple/ and behind the
// https://www.oursharedcode.com/prompt-engineering-studio proxy path.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
