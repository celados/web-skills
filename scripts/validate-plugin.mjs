#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const pluginRoot = resolve(process.argv[2] ?? "plugins/web-skills");

function fail(message) {
  process.stderr.write(`plugin validation failed: ${message}\n`);
  process.exit(1);
}

function requireFile(path) {
  if (!existsSync(path) || !statSync(path).isFile()) {
    fail(`missing file: ${path}`);
  }
}

function requireDir(path) {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    fail(`missing directory: ${path}`);
  }
}

function readJson(path) {
  requireFile(path);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function frontmatterName(contents) {
  const match = contents.match(/^---\n([\s\S]*?)\n---/u);
  if (!match) return null;
  const name = match[1].match(/^name:\s*([A-Za-z0-9-]+)\s*$/mu);
  return name?.[1] ?? null;
}

const pluginJsonPath = join(pluginRoot, ".codex-plugin", "plugin.json");
const plugin = readJson(pluginJsonPath);

if (plugin.name !== "web-skills") {
  fail(`expected plugin name web-skills, received ${String(plugin.name)}`);
}
if (plugin.skills !== "./skills/") {
  fail(`expected plugin skills path ./skills/, received ${String(plugin.skills)}`);
}
if (!plugin.interface?.displayName || !plugin.interface?.shortDescription) {
  fail("plugin interface displayName and shortDescription are required");
}

const skillsRoot = resolve(pluginRoot, plugin.skills);
requireDir(skillsRoot);

const skillNames = readdirSync(skillsRoot).filter((entry) => {
  const path = join(skillsRoot, entry);
  return statSync(path).isDirectory();
});

if (skillNames.length === 0) {
  fail("plugin must package at least one skill");
}

for (const skillName of skillNames) {
  const skillRoot = join(skillsRoot, skillName);
  const skillPath = join(skillRoot, "SKILL.md");
  const openaiPath = join(skillRoot, "agents", "openai.yaml");
  requireFile(skillPath);
  requireFile(openaiPath);

  const markdown = readFileSync(skillPath, "utf8");
  const declaredName = frontmatterName(markdown);
  if (declaredName !== skillName) {
    fail(`${skillPath} name must match directory ${skillName}`);
  }

  const openaiYaml = readFileSync(openaiPath, "utf8");
  if (!/allow_implicit_invocation:\s*(true|false)/u.test(openaiYaml)) {
    fail(`${openaiPath} must set policy.allow_implicit_invocation`);
  }
}

process.stdout.write(`validated plugin package at ${pluginRoot}\n`);
