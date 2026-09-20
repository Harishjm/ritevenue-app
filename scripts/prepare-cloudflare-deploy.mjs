import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const allowedEnvironments = new Set(["staging", "production"]);
const environment = process.argv[2];
const checkOnly = process.argv.includes("--check");

if (!allowedEnvironments.has(environment)) {
  throw new Error("Environment must be either staging or production.");
}

const prefix = `CLOUDFLARE_${environment.toUpperCase()}`;
const d1Variable = `${prefix}_D1_DATABASE_ID`;
const r2Variable = `${prefix}_R2_BUCKET`;
const required = {
  [d1Variable]: process.env[d1Variable],
  [r2Variable]: process.env[r2Variable],
};

for (const [name, value] of Object.entries(required)) {
  if (!value || !value.trim()) throw new Error(`${name} is required.`);
}

if (!/^[0-9a-f-]{32,36}$/i.test(required[d1Variable])) {
  throw new Error(`${d1Variable} has an invalid format.`);
}
if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(required[r2Variable])) {
  throw new Error(`${r2Variable} has an invalid format.`);
}

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, "dist/server/wrangler.json");
const outputPath = path.join(
  projectRoot,
  `dist/server/wrangler.${environment}.json`,
);
await access(sourcePath);

const config = JSON.parse(await readFile(sourcePath, "utf8"));
config.name = `ritevenue-${environment}`;
config.workers_dev = true;
config.preview_urls = false;
if (environment === "production") {
  config.routes = [
    { pattern: "ritevenue.in", custom_domain: true },
    { pattern: "www.ritevenue.in", custom_domain: true },
  ];
  delete config.route;
} else {
  delete config.routes;
  delete config.route;
}
config.vars = {
  ...(config.vars ?? {}),
  RITEVENUE_MODE: "public_directory",
  RITEVENUE_DEPLOYMENT: `standalone_cloudflare_${environment}`,
};
config.d1_databases = [
  {
    binding: "DB",
    database_name: `ritevenue-${environment}`,
    database_id: required[d1Variable],
    migrations_dir: "../../drizzle",
  },
];
config.r2_buckets = [
  {
    binding: "BUCKET",
    bucket_name: required[r2Variable],
  },
];

if (checkOnly) {
  console.log(`Standalone ${environment} configuration is valid.`);
} else {
  await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log(`Prepared ${path.relative(projectRoot, outputPath)}.`);
}
