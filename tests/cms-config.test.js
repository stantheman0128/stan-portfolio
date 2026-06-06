import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { loadPortfolioContent } from "../src/content-loader.js";

const rootDir = path.resolve(".");

async function loadCmsConfig() {
  return parse(await readFile(path.join(rootDir, "public", "admin", "config.yml"), "utf8"));
}

describe("Sveltia CMS configuration", () => {
  test("edits every project frontmatter field used by the site", async () => {
    const [{ projects }, config] = await Promise.all([loadPortfolioContent({ rootDir }), loadCmsConfig()]);
    const projectCollection = config.collections.find(({ name }) => name === "projects");
    const cmsFields = new Set(projectCollection.fields.map(({ name }) => name));
    const contentFields = new Set(projects.flatMap((project) => Object.keys(project)).filter((key) => key !== "slug"));

    expect(projectCollection.folder).toBe("data/projects");
    expect(projectCollection.format).toBe("yaml-frontmatter");
    expect(cmsFields).toEqual(contentFields);
  });

  test("edits every top-level site content field", async () => {
    const [{ site }, config] = await Promise.all([loadPortfolioContent({ rootDir }), loadCmsConfig()]);
    const siteSingleton = config.singletons.find(({ name }) => name === "site");

    expect(siteSingleton.file).toBe("data/site.json");
    expect(siteSingleton.format).toBe("json");
    expect(new Set(siteSingleton.fields.map(({ name }) => name))).toEqual(new Set(Object.keys(site)));
  });

  test("targets the deployed repository and OAuth Worker", async () => {
    const config = await loadCmsConfig();

    expect(config.backend).toEqual({
      name: "github",
      repo: "stantheman0128/stan-portfolio",
      branch: "main",
      base_url: "https://stan-portfolio-cms-auth.stanshih888.workers.dev"
    });
  });
});
