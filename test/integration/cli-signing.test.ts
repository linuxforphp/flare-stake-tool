import { expect } from "chai";
import { runCli, makeTempDir, cleanupTempDir, writeTestEnv } from "./cli-helper";
import { startLocalNetwork, stopLocalNetwork, getNodeInfo, VALIDATOR2_RPC_URL, type NodeInfo } from "./local-network";

const NETWORK = "localflare";
const EXISTING_VALIDATOR = "NodeID-7Xhw2mDxuDS44j42TCB6U5579esbSt3Lg";
// Genesis allocation 1 P-address (a known funded address that exists on the network)
const ANOTHER_P_ADDRESS = "P-localflare1g65uqn6t77p656w64023nh8nd9updzmxe63cr6";
// End times before genesis validator's endTime (~2026-06-01)
const DELEGATE_END_TIME = "1779571200"; // 2026-05-23
const STAKE_END_TIME = "1779484800"; // 2026-05-22

// Amounts are in FLR (the CLI converts to nFLR internally via getOptions)
const FEE = "1";
const EXPORT_AMOUNT = "100000";
const DELEGATE_AMOUNT = "10000"; // network minimum
const STAKE_AMOUNT = "10000"; // network minimum
const TRANSFER_AMOUNT = "1";
const SMALL_AMOUNT = "1";

describe("CLI signing commands (with network)", function () {
  this.timeout(300_000);

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

  // Tests share state intentionally: exportCP funds the P-chain that
  // subsequent tests (importCP, delegate, exportPC) operate on.

  it("exportCP: moves 100,000 FLR from C-chain to P-chain", () => {
    const result = runCli(
      [
        "transaction",
        "exportCP",
        "-a",
        EXPORT_AMOUNT,
        "-f",
        FEE,
        "--get-hacked",
        "--env-path",
        envPath,
        "--network",
        NETWORK,
      ],
      { timeoutMs: 90_000 }
    );
    expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
    expect(result.stdout.toLowerCase()).to.include("sent to the network");
  });

  it("importCP: completes the C→P import", () => {
    const result = runCli(["transaction", "importCP", "--get-hacked", "--env-path", envPath, "--network", NETWORK], {
      timeoutMs: 90_000,
    });
    expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
    expect(result.stdout.toLowerCase()).to.include("sent to the network");
  });

  it("delegate: delegates 10,000 FLR to genesis validator", () => {
    const result = runCli(
      [
        "transaction",
        "delegate",
        "-n",
        EXISTING_VALIDATOR,
        "-a",
        DELEGATE_AMOUNT,
        "-e",
        DELEGATE_END_TIME,
        "--get-hacked",
        "--env-path",
        envPath,
        "--network",
        NETWORK,
      ],
      { timeoutMs: 90_000 }
    );
    expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
    expect(result.stdout.toLowerCase()).to.include("sent to the network");
  });

  it("stake: registers validator2 as a new validator", async () => {
    const node: NodeInfo = await getNodeInfo(VALIDATOR2_RPC_URL);
    expect(node.nodeID).to.match(/^NodeID-/);
    const result = runCli(
      [
        "transaction",
        "stake",
        "-n",
        node.nodeID,
        "-a",
        STAKE_AMOUNT,
        "-e",
        STAKE_END_TIME,
        "--delegation-fee",
        "10",
        "--pop-bls-public-key",
        node.blsPublicKey,
        "--pop-bls-signature",
        node.blsProofOfPossession,
        "--get-hacked",
        "--env-path",
        envPath,
        "--network",
        NETWORK,
      ],
      { timeoutMs: 90_000 }
    );
    expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
    expect(result.stdout.toLowerCase()).to.include("sent to the network");
  });

  it("transfer: sends 1 FLR to another P-chain address", () => {
    const result = runCli(
      [
        "transaction",
        "transfer",
        "-a",
        TRANSFER_AMOUNT,
        "--transfer-address",
        ANOTHER_P_ADDRESS,
        "--get-hacked",
        "--env-path",
        envPath,
        "--network",
        NETWORK,
      ],
      { timeoutMs: 90_000 }
    );
    expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
    expect(result.stdout.toLowerCase()).to.include("sent to the network");
  });

  it("exportPC: moves 1 FLR from P-chain back to C-chain", () => {
    const result = runCli(
      ["transaction", "exportPC", "-a", SMALL_AMOUNT, "--get-hacked", "--env-path", envPath, "--network", NETWORK],
      { timeoutMs: 90_000 }
    );
    expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
    expect(result.stdout.toLowerCase()).to.include("sent to the network");
  });

  it("importPC: completes the P→C import", async () => {
    // Atomic exports from P need a moment to propagate to C-chain's atomic mempool
    await new Promise((r) => setTimeout(r, 3_000));
    const result = runCli(
      ["transaction", "importPC", "-f", FEE, "--get-hacked", "--env-path", envPath, "--network", NETWORK],
      { timeoutMs: 90_000 }
    );
    expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
    expect(result.stdout.toLowerCase()).to.include("sent to the network");
  });
});
