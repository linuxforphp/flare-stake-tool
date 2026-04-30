import { expect } from "chai";
import path from "path";
import fs from "fs";
import { ec as EC } from "elliptic";
import { runCli, makeTempDir, cleanupTempDir, EWOQ_PRIVATE_KEY_HEX, EWOQ_PUBLIC_KEY_COMPRESSED } from "./cli-helper";
import { startLocalNetwork, stopLocalNetwork } from "./local-network";

const NETWORK = "localflare";
const TX_ID = "send-test-tx";
const secp256k1 = new EC("secp256k1");

function signMessageHash(messageHashHex: string, privKeyHex: string): string {
  const keyPair = secp256k1.keyFromPrivate(privKeyHex, "hex");
  const sig = keyPair.sign(messageHashHex, { canonical: true });
  const r = sig.r.toString("hex").padStart(64, "0");
  const s = sig.s.toString("hex").padStart(64, "0");
  const v = (sig.recoveryParam ?? 0).toString(16).padStart(2, "0");
  return r + s + v;
}

describe("CLI send (signed transaction flow)", function () {
  this.timeout(180_000);

  let tempDir: string;
  let unsignedDir: string;
  let signedDir: string;

  before(async () => {
    await startLocalNetwork();
    tempDir = makeTempDir();
    unsignedDir = path.join(tempDir, "ForDefiTxnFiles", "UnsignedTxns");
    signedDir = path.join(tempDir, "ForDefiTxnFiles", "SignedTxns");
    fs.mkdirSync(unsignedDir, { recursive: true });
    fs.mkdirSync(signedDir, { recursive: true });
  });

  after(() => {
    stopLocalNetwork();
    cleanupTempDir(tempDir);
  });

  it("init-ctx with public key creates ctx.json", () => {
    const result = runCli(["init-ctx", "-p", EWOQ_PUBLIC_KEY_COMPRESSED, "--network", NETWORK], { cwd: tempDir });
    expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
    expect(fs.existsSync(path.join(tempDir, "ctx.json"))).to.be.true;
  });

  it("transaction exportCP without signing produces an unsigned tx file", () => {
    const result = runCli(["transaction", "exportCP", "-a", "1", "-f", "1", "-i", TX_ID, "--network", NETWORK], {
      cwd: tempDir,
    });
    expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
    const unsignedPath = path.join(unsignedDir, `${TX_ID}.unsignedTx.json`);
    expect(fs.existsSync(unsignedPath), `expected ${unsignedPath} to exist`).to.be.true;
  });

  it("send: signs the unsigned tx and submits it to the network", () => {
    const unsignedPath = path.join(unsignedDir, `${TX_ID}.unsignedTx.json`);
    const unsigned = JSON.parse(fs.readFileSync(unsignedPath, "utf-8"));

    // Sign the message hash with ewoq's private key
    const message = unsigned.signatureRequests[0].message;
    const signature = signMessageHash(message, EWOQ_PRIVATE_KEY_HEX);

    // Write signed tx to the SignedTxns directory
    const signedTx = { ...unsigned, signature };
    const signedPath = path.join(signedDir, `${TX_ID}.signedTx.json`);
    fs.writeFileSync(signedPath, JSON.stringify(signedTx, null, 2));

    const result = runCli(["send", "-i", TX_ID, "--network", NETWORK], { cwd: tempDir });
    expect(result.exitCode, `stderr: ${result.stderr}`).to.equal(0);
    expect(result.stdout.toLowerCase()).to.include("sent to the node");
  });
});
