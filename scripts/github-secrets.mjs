import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const SECRET_NAMES = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"];
const USAGE = "Usage: node scripts/github-secrets.mjs <check|sync> [repo]";

const command = process.argv[2];
const explicitRepo = process.argv[3] || process.env.GITHUB_REPOSITORY || "";

if (!["check", "sync"].includes(command)) {
  console.error(USAGE);
  process.exit(1);
}

const secrets = loadSecrets();
const missing = SECRET_NAMES.filter((name) => !secrets[name]);

if (command === "check") {
  if (missing.length > 0) {
    console.error(`Missing required secrets in local environment: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`All required secrets are present: ${SECRET_NAMES.join(", ")}`);
  process.exit(0);
}

if (missing.length > 0) {
  console.error(`Cannot sync secrets. Missing: ${missing.join(", ")}`);
  process.exit(1);
}

const repo = resolveRepo(explicitRepo);
ensureGhAuthenticated();

for (const name of SECRET_NAMES) {
  const value = secrets[name];
  const result = spawnSync("gh", ["secret", "set", name, "--repo", repo], {
    input: value,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log(`Synced ${SECRET_NAMES.length} secrets to ${repo}`);

function loadSecrets() {
  const fileSecrets = parseDotEnv();
  const mergedSecrets = {};

  for (const name of SECRET_NAMES) {
    mergedSecrets[name] = process.env[name] || fileSecrets[name] || "";
  }

  return mergedSecrets;
}

function parseDotEnv() {
  for (const fileName of [".dev.vars", ".env"]) {
    if (!existsSync(fileName)) {
      continue;
    }

    const content = readFileSync(fileName, "utf8");
    const values = {};

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      values[key] = value;
    }

    return values;
  }

  return {};
}

function resolveRepo(repo) {
  if (repo) {
    return repo;
  }

  try {
    const remoteUrl = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    const parsed = parseGitHubRepo(remoteUrl);
    if (parsed) {
      return parsed;
    }
  } catch {
    // Ignore and fail below with a better message.
  }

  console.error("GitHub repository is not set. Pass <owner/repo> or export GITHUB_REPOSITORY.");
  process.exit(1);
}

function parseGitHubRepo(remoteUrl) {
  const normalized = remoteUrl.replace(/\.git$/, "");
  let match = normalized.match(/^git@github\.com:([^/]+\/[^/]+)$/);
  if (match) {
    return match[1];
  }

  match = normalized.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)$/);
  if (match) {
    return match[1];
  }

  return "";
}

function ensureGhAuthenticated() {
  const result = spawnSync("gh", ["auth", "status"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    console.error("GitHub CLI is not authenticated. Run `gh auth login` first.");
    process.exit(result.status || 1);
  }
}

