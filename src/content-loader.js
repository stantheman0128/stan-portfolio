import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

const REQUIRED_PROJECT_FIELDS = [
  "title",
  "status",
  "path",
  "description",
  "tags",
  "alt",
  "links",
  "hero",
  "order"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert(match, `${filePath} must begin with YAML frontmatter`);

  const value = parse(match[1]);
  assert(value && typeof value === "object" && !Array.isArray(value), `${filePath} frontmatter must be an object`);
  return value;
}

function validateProject(project, filePath) {
  for (const field of REQUIRED_PROJECT_FIELDS) {
    assert(project[field] !== undefined && project[field] !== null, `${filePath} is missing required field "${field}"`);
  }

  assert(Array.isArray(project.tags), `${filePath} field "tags" must be an array`);
  assert(Array.isArray(project.links), `${filePath} field "links" must be an array`);
  assert(typeof project.hero === "boolean", `${filePath} field "hero" must be a boolean`);
  assert(Number.isFinite(project.order), `${filePath} field "order" must be a number`);
  assert(
    project.links.every((link) => link && typeof link.label === "string" && typeof link.href === "string"),
    `${filePath} links must contain label and href strings`
  );
}

function validateSite(site, slugs) {
  assert(site && typeof site === "object" && !Array.isArray(site), "data/site.json must contain an object");
  assert(typeof site.colonistProject === "string", "site.colonistProject must be a project slug");
  assert(Array.isArray(site.colonistRelated), "site.colonistRelated must be an array of project slugs");
  assert(slugs.has(site.colonistProject), `site.colonistProject references unknown project slug "${site.colonistProject}"`);

  for (const slug of site.colonistRelated) {
    assert(slugs.has(slug), `site.colonistRelated references unknown project slug "${slug}"`);
  }
}

export async function loadPortfolioContent({ rootDir = process.cwd() } = {}) {
  const projectsDir = path.join(rootDir, "data", "projects");
  const filenames = (await readdir(projectsDir)).filter((filename) => filename.endsWith(".md"));
  assert(filenames.length > 0, "data/projects must contain at least one Markdown project");

  const projects = await Promise.all(
    filenames.map(async (filename) => {
      const filePath = path.join(projectsDir, filename);
      const project = parseFrontmatter(await readFile(filePath, "utf8"), filePath);
      validateProject(project, filePath);
      return { ...project, slug: path.basename(filename, ".md") };
    })
  );
  projects.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

  const site = JSON.parse(await readFile(path.join(rootDir, "data", "site.json"), "utf8"));
  validateSite(site, new Set(projects.map(({ slug }) => slug)));

  return { site, projects };
}
