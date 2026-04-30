import { spawnSync, type SpawnSyncReturns } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CLI = path.join(REPO_ROOT, "bin", "flare-stake-tool");

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function runCli(args: string[], options: { cwd?: string; timeoutMs?: number } = {}): CliResult {
  const result: SpawnSyncReturns<string> = spawnSync(CLI, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: "utf-8",
    timeout: options.timeoutMs ?? 60_000,
  });
  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "flare-stake-tool-test-"));
}

export function cleanupTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Publicly known Avalanche test private key ("ewoq").
// Funded in v1.13's built-in localflare genesis (allocation 2).
// SAFE FOR LOCAL TEST NETWORKS ONLY.
export const EWOQ_PRIVATE_KEY_HEX = "56289e99c94b6912bfc12adc093c9b51124f0dc54ac7a766b2bc5ccf558d8027";
export const EWOQ_PRIVATE_KEY_CB58 = "PrivateKey-ewoqjP7PxY4yr3iLTpLisriqt94hdyDFNgchSxGGztUrTXtNN";
export const EWOQ_ETH_ADDRESS = "0x8db97C7cEcE249c2b98bDC0226Cc4C2A57BF52FC";
export const EWOQ_PUBLIC_KEY_COMPRESSED = "0327448e78ffa8cdb24cf19be0204ad954b1bdb4db8c51183534c1eecf2ebd094e";

export function writeTestEnv(dir: string): string {
  const envPath = path.join(dir, "test.env");
  fs.writeFileSync(envPath, `PRIVATE_KEY_HEX="${EWOQ_PRIVATE_KEY_HEX}"\nPRIVATE_KEY_CB58="${EWOQ_PRIVATE_KEY_CB58}"\n`);
  return envPath;
}
