import { expect } from "chai";
import path from "path";
import fs from "fs";
import {
  runCli,
  makeTempDir,
  cleanupTempDir,
  writeTestEnv,
  EWOQ_PUBLIC_KEY_COMPRESSED,
  EWOQ_ETH_ADDRESS,
} from "./cli-helper";
import { startLocalNetwork, stopLocalNetwork } from "./local-network";

describe("CLI read-only commands (with network)", function () {
  this.timeout(180_000);

  let tempDir: string;
  let envPath: string;

  before(async () => {
    await startLocalNetwork();
    tempDir = makeTempDir();
    envPath = writeTestEnv(tempDir);
  });

  after(() => {
    stopLocalNetwork();
    cleanupTempDir(tempDir);
  });

  describe("init-ctx", () => {
    it("creates ctx.json with public key", () => {
      const subdir = path.join(tempDir, "init-ctx-1");
      fs.mkdirSync(subdir, { recursive: true });
      const result = runCli(["init-ctx", "-p", EWOQ_PUBLIC_KEY_COMPRESSED, "--network", "localflare"], {
        cwd: subdir,
      });
      expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
      const ctxPath = path.join(subdir, "ctx.json");
      expect(fs.existsSync(ctxPath)).to.be.true;
      const ctx = JSON.parse(fs.readFileSync(ctxPath, "utf-8"));
      expect(ctx.publicKey).to.equal(EWOQ_PUBLIC_KEY_COMPRESSED);
      expect(ctx.network).to.equal("localflare");
    });
  });

  describe("info addresses", () => {
    it("derives addresses from a private key", () => {
      const result = runCli(["info", "addresses", "--get-hacked", "--env-path", envPath, "--network", "localflare"]);
      expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
      expect(result.stdout.toLowerCase()).to.include(EWOQ_ETH_ADDRESS.toLowerCase());
      expect(result.stdout).to.match(/P-localflare1[a-z0-9]+/);
    });
  });

  describe("info network", () => {
    it("shows network details", () => {
      const result = runCli(["info", "network", "--get-hacked", "--env-path", envPath, "--network", "localflare"]);
      expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
      expect(result.stdout).to.include("localflare");
    });
  });

  describe("info balance", () => {
    it("shows non-zero balance for funded ewoq account", () => {
      const result = runCli(["info", "balance", "--get-hacked", "--env-path", envPath, "--network", "localflare"]);
      expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
      // Balance output should include the C-chain address and a non-zero number
      expect(result.stdout.toLowerCase()).to.include("c-chain");
    });
  });

  describe("info validators", () => {
    it("lists the genesis validator", () => {
      const result = runCli(["info", "validators", "--get-hacked", "--env-path", envPath, "--network", "localflare"]);
      expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
      expect(result.stdout).to.include("NodeID-7Xhw2mDxuDS44j42TCB6U5579esbSt3Lg");
    });
  });
});
