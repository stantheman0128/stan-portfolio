import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { loadPortfolioContent } from "../src/content-loader.js";

const tempRoots = [];

async function createFixture({ related = ["course-checker"] } = {}) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "stan-portfolio-content-"));
  tempRoots.push(rootDir);
  await mkdir(path.join(rootDir, "data", "projects"), { recursive: true });
  await writeFile(
    path.join(rootDir, "data", "site.json"),
    JSON.stringify({
      colonistProject: "colonist-stats-tracker",
      colonistRelated: related
    })
  );
  await writeFile(
    path.join(rootDir, "data", "projects", "course-checker.md"),
    `---
title: Course Checker
status: Live
path: course
description: Checks graduation credits.
tags: [PWA]
image: /assets/course.png
imageMode: contain
alt: Course Checker screenshot
links:
  - label: Live
    href: https://course.example.com
hero: false
order: 2
---
`
  );
  await writeFile(
    path.join(rootDir, "data", "projects", "colonist-stats-tracker.md"),
    `---
title: Colonist Stats Tracker
status: Local tool
path: extensions/colonist
description: Tracks game state locally.
tags: [JavaScript]
image: /assets/colonist.png
imageMode: icon
alt: Colonist tracker icon
links:
  - label: GitHub
    href: https://github.com/example/repo
hero: true
order: 1
---
`
  );
  return rootDir;
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("loadPortfolioContent", () => {
  test("sorts projects by order and derives stable slugs from filenames", async () => {
    const content = await loadPortfolioContent({ rootDir: await createFixture() });

    expect(content.projects.map(({ slug }) => slug)).toEqual([
      "colonist-stats-tracker",
      "course-checker"
    ]);
    expect(content.projects[0].hero).toBe(true);
  });

  test("rejects unknown Colonist project references", async () => {
    const rootDir = await createFixture({ related: ["missing-project"] });

    await expect(loadPortfolioContent({ rootDir })).rejects.toThrow(
      'site.colonistRelated references unknown project slug "missing-project"'
    );
  });

  test("loads the checked-in portfolio content with a stable Colonist project", async () => {
    const content = await loadPortfolioContent({ rootDir: path.resolve(".") });

    expect(content.projects).toHaveLength(8);
    expect(content.projects[0].slug).toBe("colonist-stats-tracker");
    expect(content.site.colonistProject).toBe("colonist-stats-tracker");
    expect(content.site.colonistRelated).toHaveLength(4);
  });
});
