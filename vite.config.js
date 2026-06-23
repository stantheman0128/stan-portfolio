import { defineConfig } from "vite";
import { loadPortfolioContent } from "./src/content-loader.js";

const virtualId = "virtual:portfolio-content";
const resolvedVirtualId = `\0${virtualId}`;
const pathSeparator = process.platform === "win32" ? "\\" : "/";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"]
  },
  plugins: [
    {
      name: "portfolio-content",
      resolveId(id) {
        if (id === virtualId) return resolvedVirtualId;
      },
      async load(id) {
        if (id !== resolvedVirtualId) return;
        const content = await loadPortfolioContent();
        return `export default ${JSON.stringify(content)};`;
      },
      handleHotUpdate({ file, server }) {
        if (!file.includes(`${pathSeparator}data${pathSeparator}`)) return;
        const module = server.moduleGraph.getModuleById(resolvedVirtualId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
      }
    }
  ]
});
