import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const allowedEnvironments = new Set(["staging"]);
const environment = process.argv[2];
const checkOnly = process.argv.includes("--check");

if (!allowedEnvironments.has(environment)) {
  throw new Error(
    "Only the staging environment is enabled. Production remains intentionally locked.",
  );
}

const required = {
  CLOUDFLARE_STAGING_D1_DATABASE_ID:
    process.env.CLOUDFLARE_STAGING_D1_DATABASE_ID,
  CLOUDFLARE_STAGING_R2_BUCKET:
    process.env.CLOUDFLARE_STAGING_R2_BUCKET,
};

for (const [name, value] of Object.entries(required)) {
  if (!value || !value.trim()) throw new Error(`${name} is required.`);
}

if (!/^[0-9a-f-]{32,36}$/i.test(required.CLOUDFLARE_STAGING_D1_DATABASE_ID)) {
  throw new Error("CLOUDFLARE_STAGING_D1_DATABASE_ID has an invalid format.");
}
if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(required.CLOUDFLARE_STAGING_R2_BUCKET)) {
  throw new Error("CLOUDFLARE_STAGING_R2_BUCKET has an invalid format.");
}

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, "dist/server/wrangler.json");
const outputPath = path.join(
  projectRoot,
  `dist/server/wrangler.${environment}.json`,
);
await access(sourcePath);

const config = JSON.parse(await readFile(sourcePath, "utf8"));
config.name = "ritevenue-staging";
config.vars = {
  ...(config.vars ?? {}),
  RITEVENUE_MODE: "public_directory",
  RITEVENUE_DEPLOYMENT: "standalone_cloudflare_staging",
};
config.d1_databases = [
  {
    binding: "DB",
    database_name: "ritevenue-staging",
    database_id: required.CLOUDFLARE_STAGING_D1_DATABASE_ID,
    migrations_dir: "../../drizzle",
  },
];
config.r2_buckets = [
  {
    binding: "BUCKET",
    bucket_name: required.CLOUDFLARE_STAGING_R2_BUCKET,
  },
];

if (checkOnly) {
  console.log("Standalone staging configuration is valid.");
} else {
  await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log(`Prepared ${path.relative(projectRoot, outputPath)}.`);
}
