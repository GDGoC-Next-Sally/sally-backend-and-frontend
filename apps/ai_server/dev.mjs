#!/usr/bin/env node
/**
 * Cross-platform dev server launcher for ai_server (Windows & macOS/Linux)
 * - .venv 없으면 자동 생성 + pip install
 * - uvicorn을 PYTHONPATH=apps 로 실행
 */
import { execSync, spawn } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const isWindows = process.platform === "win32";
const __dirname = dirname(fileURLToPath(import.meta.url));

// 경로 설정
const venvDir = resolve(__dirname, ".venv");
const pythonBin = isWindows
  ? resolve(venvDir, "Scripts", "python.exe")
  : resolve(venvDir, "bin", "python3");
const uvicornBin = isWindows
  ? resolve(venvDir, "Scripts", "uvicorn.exe")
  : resolve(venvDir, "bin", "uvicorn");
const requirementsTxt = resolve(__dirname, "requirements.txt");
const rootDir = resolve(__dirname, "..", "..");

// 1. venv 생성 및 의존성 설치 (최초 1회)
if (!existsSync(venvDir)) {
  console.log(">>> .venv not found. Creating virtual environment...");
  execSync(`python3 -m venv "${venvDir}"`, { stdio: "inherit" });
  console.log(">>> Installing Python dependencies...");
  execSync(`"${pythonBin}" -m pip install -r "${requirementsTxt}"`, {
    stdio: "inherit",
  });
}

// 2. uvicorn 실행
console.log(">>> Starting AI Server on http://localhost:8000 ...");
const env = {
  ...process.env,
  PYTHONPATH: resolve(rootDir, "apps"),
  PYTHONIOENCODING: "utf-8",
  PYTHONUNBUFFERED: "1", // 로그를 버퍼링 없이 즉시 출력하도록 설정
};

const proc = spawn(
  uvicornBin,
  ["ai_server.main:app", "--reload", "--port", "8000"],
  {
    cwd: rootDir,
    env,
    stdio: "inherit",
    shell: false,
  }
);

proc.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => proc.kill("SIGINT"));
process.on("SIGTERM", () => proc.kill("SIGTERM"));
