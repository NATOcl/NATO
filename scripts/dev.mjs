import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";
const children = [];

function start(label, command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: isWindows,
  });

  child.on("exit", (code, signal) => {
    if (code !== 0 && signal !== "SIGTERM" && signal !== "SIGINT") {
      console.error(`[${label}] terminó con código ${code}`);
    }
  });

  children.push(child);
  return child;
}

start("api", "node", ["server.js"]);
start("albumvault", npm, [
  "--prefix",
  "AlbumVault",
  "run",
  "dev",
  "--",
  "--port",
  "5174",
  "--base=/albumvault/",
]);
start("cv", npm, ["run", "dev:cv"]);

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.pid) continue;

    if (isWindows) {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
