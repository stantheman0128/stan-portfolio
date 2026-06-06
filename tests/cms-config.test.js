import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { loadPortfolioContent } from "../src/content-loader.js";

const rootDir = path.resolve(".");

async function loadCmsConfig() {
  return parse(await readFile(path.join(rootDir, "public", "admin", "config.yml"), "utf8"));
}

function expectFieldsToMatchValue(fields, value, context) {
  expect(new Set(fields.map(({ name }) => name)), `${context} field names`).toEqual(new Set(Object.keys(value)));

  for (const field of fields) {
    const child = value[field.name];
    if (Array.isArray(child)) {
      expect(field.widget, `${context}.${field.name} widget`).toBe("list");
      if (child.length && typeof child[0] === "object") {
        expect(field.fields, `${context}.${field.name} nested fields`).toBeDefined();
        child.forEach((item, index) => expectFieldsToMatchValue(field.fields, item, `${context}.${field.name}[${index}]`));
      } else {
        expect(field.field, `${context}.${field.name} item field`).toBeDefined();
      }
    } else if (child && typeof child === "object") {
      expect(field.fields, `${context}.${field.name} nested fields`).toBeDefined();
      expectFieldsToMatchValue(field.fields, child, `${context}.${field.name}`);
    }
  }
}

describe("Sveltia CMS configuration", () => {
  test("edits every project frontmatter field used by the site", async () => {
    const [{ projects }, config] = await Promise.all([loadPortfolioContent({ rootDir }), loadCmsConfig()]);
    const projectCollection = config.collections.find(({ name }) => name === "projects");
    const projectWithoutSlug = Object.fromEntries(Object.entries(projects[0]).filter(([key]) => key !== "slug"));

    expect(projectCollection.folder).toBe("data/projects");
    expect(projectCollection.format).toBe("yaml-frontmatter");
    expectFieldsToMatchValue(projectCollection.fields, projectWithoutSlug, "project");
  });

  test("edits every top-level site content field", async () => {
    const [{ site }, config] = await Promise.all([loadPortfolioContent({ rootDir }), loadCmsConfig()]);
    const siteSingleton = config.singletons.find(({ name }) => name === "site");

    expect(siteSingleton.file).toBe("data/site.json");
    expect(siteSingleton.format).toBe("json");
    expectFieldsToMatchValue(siteSingleton.fields, site, "site");
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
