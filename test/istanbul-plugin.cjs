const fs = require("node:fs");
const path = require("node:path");

const esbuild = require("esbuild");
const { createInstrumenter } = require("istanbul-lib-instrument");

/**
 * Instrumenta los archivos de src/ antes de que esbuild los empaquete.
 * Así Karma puede generar el informe de cobertura con karma-coverage.
 */
module.exports = function istanbulPlugin() {
  return {
    name: "istanbul",
    setup(build) {
      build.onLoad({ filter: /[\\/]src[\\/].*\.(js|jsx)$/ }, async (args) => {
        const source = await fs.promises.readFile(args.path, "utf8");
        const loader = args.path.endsWith(".jsx") ? "jsx" : "js";
        const transformed = await esbuild.transform(source, {
          loader,
          jsx: "automatic",
          sourcefile: args.path,
          sourcemap: "inline",
          target: "es2015",
        });

        const inputSourceMap = transformed.map
          ? JSON.parse(transformed.map)
          : undefined;

        const instrumenter = createInstrumenter({
          coverageVariable: "__coverage__",
          esModules: true,
          produceSourceMap: true,
        });

        const instrumented = instrumenter.instrumentSync(
          transformed.code,
          args.path,
          inputSourceMap,
        );

        return {
          contents: instrumented,
          loader: "js",
          resolveDir: path.dirname(args.path),
        };
      });
    },
  };
};
