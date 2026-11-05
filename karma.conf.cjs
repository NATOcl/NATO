const fs = require("node:fs");
const path = require("node:path");

const istanbulPlugin = require("./test/istanbul-plugin.cjs");

function findBrowser() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;

  const candidates = [
    path.join(process.env.PROGRAMFILES || "", "Google/Chrome/Application/chrome.exe"),
    path.join(
      process.env["PROGRAMFILES(X86)"] || "",
      "Google/Chrome/Application/chrome.exe",
    ),
    path.join(
      process.env.LOCALAPPDATA || "",
      "Google/Chrome/Application/chrome.exe",
    ),
    path.join(
      process.env["PROGRAMFILES(X86)"] || "",
      "Microsoft/Edge/Application/msedge.exe",
    ),
    path.join(
      process.env.PROGRAMFILES || "",
      "Microsoft/Edge/Application/msedge.exe",
    ),
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

const browser = findBrowser();
if (browser) process.env.CHROME_BIN = browser;

module.exports = function configureKarma(config) {
  config.set({
    basePath: __dirname,
    frameworks: ["jasmine"],
    files: ["test/**/*.spec.js"],
    preprocessors: {
      "test/**/*.spec.js": ["esbuild"],
    },
    esbuild: {
      singleBundle: true,
      jsx: "automatic",
      target: "es2015",
      loader: {
        // karma-esbuild normaliza las entradas de prueba a .js; con este
        // loader los archivos de test pueden seguir escritos en JSX.
        ".js": "jsx",
        ".pdf": "empty",
        ".webp": "dataurl",
        ".svg": "dataurl",
        ".png": "dataurl",
        ".jpg": "dataurl",
        ".jpeg": "dataurl",
        ".gif": "dataurl",
      },
      plugins: [istanbulPlugin()],
    },
    reporters: ["progress", "coverage"],
    coverageReporter: {
      dir: path.join(__dirname, "coverage"),
      subdir: ".",
      reporters: [
        { type: "html", subdir: "html" },
        { type: "text-summary" },
        { type: "lcovonly", subdir: "." },
      ],
    },
    browsers: ["ChromeHeadlessNoSandbox"],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: "ChromeHeadless",
        flags: [
          "--no-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-extensions",
        ],
      },
    },
    singleRun: true,
    autoWatch: false,
    colors: true,
    logLevel: config.LOG_INFO,
    browserNoActivityTimeout: 60000,
    client: {
      jasmine: {
        random: false,
      },
    },
  });
};
