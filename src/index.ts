import { appendFileSync } from "node:fs";
import { fetchContributionGrid, GitHubFetchError } from "./github/graph.js";
import { run, type OutputFormat } from "./cli.js";

/**
 * GitHub Actions passes each `with:` input as an environment variable named
 * `INPUT_<NAME>` (uppercased, spaces->underscores). This mirrors that
 * convention directly rather than pulling in `@actions/core` — one fewer
 * dependency for something this small, and it keeps the Action's actual
 * contract (env vars in, exit code + stdout out) visible rather than
 * hidden behind a wrapper library.
 */
function getInput(name: string, fallback?: string): string {
  const value = process.env[`INPUT_${name.toUpperCase()}`];
  if (value !== undefined && value !== "") return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required input: ${name}`);
}

function setFailed(message: string): void {
  console.error(`::error::${message}`);
  process.exitCode = 1;
}

function setOutput(name: string, value: string): void {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${value}\n`);
  } else {
    // Fallback for local/dev runs outside a real Actions runner.
    console.log(`output ${name}=${value}`);
  }
}

async function main(): Promise<void> {
  try {
    const animation = getInput("animation", "bomber");
    const output = getInput("output", "gif") as OutputFormat;
    const outputPath = getInput("output-path", `./output/contrib-animation.${output}`);
    const fps = Number(getInput("fps", "24"));
    const token = getInput("github-token");
    // Defaults to the repo owner (GITHUB_REPOSITORY is "owner/repo") since
    // that's almost always who the workflow is animating; explicit `login`
    // input lets someone animate a different user's public graph.
    const defaultLogin = process.env.GITHUB_REPOSITORY?.split("/")[0];
    const login = getInput("login", defaultLogin);

    if (!["gif", "webp", "mp4"].includes(output)) {
      setFailed(`Invalid "output" input: "${output}". Must be one of: gif, webp, mp4.`);
      return;
    }
    if (!Number.isFinite(fps) || fps <= 0) {
      setFailed(`Invalid "fps" input: "${fps}". Must be a positive number.`);
      return;
    }

    const grid = await fetchContributionGrid(login, token);
    await run(grid, { animation, outputPath, fps, format: output });
    setOutput("animation-path", outputPath);
  } catch (err) {
    if (err instanceof GitHubFetchError) {
      setFailed(`Failed to fetch contribution data: ${err.message}`);
    } else {
      setFailed(err instanceof Error ? err.message : String(err));
    }
  }
}

main();
