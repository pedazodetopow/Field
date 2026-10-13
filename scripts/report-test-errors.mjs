import { existsSync, readFileSync, appendFileSync } from "node:fs";

// Mantener el diagnóstico accesible por la API de checks cuando la descarga
// de logs de Actions está bloqueada. Nunca cambia el resultado de las pruebas.
const path = "test-results/results.json";
if (existsSync(path)) {
  const report = JSON.parse(readFileSync(path, "utf8"));
  const escape = (text) => text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
  const errors = [];
  function visit(suites) {
    for (const suite of suites ?? []) {
      visit(suite.suites);
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          if (test.status === "expected") continue;
          for (const result of test.results ?? []) {
            for (const error of result.errors ?? []) {
              const text = `[${test.projectName}] ${spec.title}\n${error.message ?? error.stack ?? "Error sin detalle"}`;
              errors.push(text);
              console.log(`::error::${escape(text.slice(0, 6000))}`);
            }
          }
        }
      }
    }
  }
  visit(report.suites);
  if (process.env.GITHUB_STEP_SUMMARY && errors.length) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Fallos de navegador\n\n${errors.map((text) => `\`\`\`text\n${text}\n\`\`\``).join("\n\n")}\n`);
  }
}
