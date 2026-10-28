import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseActivityDataset } from "../shared/activity-content";

// JSON deployments bundle only the validated public snapshot, never raw draft JSON.
function legacyActivityContent(): Plugin {
  const id = 'virtual:legacy-activity-content';
  return {
    name: 'legacy-activity-content',
    resolveId(source) { if (source === id) return `\0${id}`; },
    load(source) {
      if (source !== `\0${id}`) return;
      const directory = new URL('./src/content/activities/', import.meta.url);
      const read = (name: string) => {
        const path = fileURLToPath(new URL(name, directory));
        this.addWatchFile(path);
        return JSON.parse(readFileSync(path, 'utf8'));
      };
      const modules = Object.fromEntries(readdirSync(new URL('events/', directory)).filter(name => name.endsWith('.json')).sort()
        .map(name => [name, read(`events/${name}`)]));
      const { activities, activityCategories } = parseActivityDataset(read('categories.json'), modules);
      return `export default ${JSON.stringify({ activities, categories: activityCategories.map((category, order) => ({ ...category, order })) })};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), legacyActivityContent()],
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: false },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    globals: true,
  },
});
