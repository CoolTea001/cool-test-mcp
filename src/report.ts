import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { exec } from "node:child_process";
import { createServer } from "node:net";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { COOLTEST_DIR } from "./store.js";

const scriptSrcPath = fileURLToPath(new URL("./report-server.mjs", import.meta.url));

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => resolve(port));
    });
  });
}

export async function startReportServer(
  suiteJsonPath: string,
  portArg?: number
): Promise<{ url: string; port: number }> {
  const projectRoot = path.dirname(path.dirname(suiteJsonPath));
  const scriptPath = path.join(projectRoot, COOLTEST_DIR, "report-server.mjs");
  await fs.mkdir(path.dirname(scriptPath), { recursive: true });
  await fs.copyFile(scriptSrcPath, scriptPath);

  const port = portArg ?? (await getFreePort());
  const url = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, [scriptPath, suiteJsonPath, String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  child.unref();

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("report server start timeout")), 5000);
    const onData = (chunk: Buffer) => {
      if (chunk.toString().includes("COOLTEST_REPORT_READY")) {
        clearTimeout(timer);
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
        resolve();
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
  });

  const openCmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${openCmd} "${url}"`, () => {});

  return { url, port };
}
