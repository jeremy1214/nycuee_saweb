import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseOrganization, visitOrganizationImages } from "../shared/organization-content";
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

function legacyOrganizationContent(): Plugin {
  return {
    name: 'legacy-organization-content',
    resolveId(id) { if (['virtual:legacy-eesa-content', 'virtual:legacy-team-content'].includes(id)) return `\0${id}`; },
    load(id) {
      if (!['\0virtual:legacy-eesa-content', '\0virtual:legacy-team-content'].includes(id)) return;
      const read = (file: string) => { const path = fileURLToPath(new URL(`./src/content/${file}`, import.meta.url)); this.addWatchFile(path); return JSON.parse(readFileSync(path, 'utf8')); };
      const parse = (kind: 'overview' | 'department' | 'team', value: unknown) => {
        const result = parseOrganization(kind, value);
        visitOrganizationImages(result, image => { if (['', '/eesa.jpg', '/intro/operations-group-photo.jpg', '/intro/publicity-group-photo.jpg', '/intro/technical-group-photo.jpg'].includes(image.src)) image.missing = true; });
        return result;
      };
      const directory = id.includes('eesa') ? 'eesa/departments' : 'teams';
      const contents = readdirSync(new URL(`./src/content/${directory}/`, import.meta.url)).filter(n => n.endsWith('.json')).sort().map(n => parse(id.includes('eesa') ? 'department' : 'team', read(`${directory}/${n}`)));
      return `export default ${JSON.stringify(id.includes('eesa') ? { overview: parse('overview', read('eesa/overview.json')), departments: contents } : { teams: contents })};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), legacyActivityContent(), legacyOrganizationContent()],
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
