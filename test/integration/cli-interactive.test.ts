import { expect } from "chai";
import path from "path";
import fs from "fs";
import { runCli, makeTempDir, cleanupTempDir, EWOQ_PRIVATE_KEY_HEX, EWOQ_ETH_ADDRESS } from "./cli-helper";
import { startLocalNetwork, stopLocalNetwork, getNodeInfo, VALIDATOR2_RPC_URL, type NodeInfo } from "./local-network";
import { spawnInteractive, KEYS } from "./interactive-helper";

const STAKE_END_TIME = "1779484800"; // 2026-05-22 — before genesis validator end

describe("CLI interactive mode (with network)", function () {
  this.timeout(300_000);

  let tempDir: string;
  let envPath: string;
  let nodeInfo: NodeInfo;

  before(async () => {
    await startLocalNetwork();
    tempDir = makeTempDir();
    // Interactive prompts the user for a private-key file path; we use "pktest"
    // so this matches the env path the test sends as input below.
    envPath = path.join(tempDir, "pktest");
    fs.writeFileSync(envPath, `PRIVATE_KEY_HEX="${EWOQ_PRIVATE_KEY_HEX}"\n`);
    // Stake test needs P-chain funds; seed via direct CLI so the interactive
    // test can focus on the menu flow.
    runCli(
      [
        "transaction",
        "exportCP",
        "-a",
        "50000",
        "-f",
        "1",
        "--get-hacked",
        "--env-path",
        envPath,
        "--network",
        "localflare",
      ],
      { timeoutMs: 60_000 }
    );
    runCli(["transaction", "importCP", "--get-hacked", "--env-path", envPath, "--network", "localflare"], {
      timeoutMs: 60_000,
    });
    nodeInfo = await getNodeInfo(VALIDATOR2_RPC_URL);
  });

  after(() => {
    stopLocalNetwork();
    cleanupTempDir(tempDir);
  });

  it("connects with private key, picks localflare, checks balance, and exits", async () => {
    const session = spawnInteractive(["interactive"], tempDir);

    // Menu 1: wallet type. Options are [Ledger, Private Key]. Select Private Key.
    await session.waitFor("How do you want to connect your wallet?");
    session.send(KEYS.DOWN); // Ledger -> Private Key
    session.send(KEYS.ENTER);

    // Prompt 2: path to private key file
    await session.waitFor("Enter Path to Private Key file");
    session.send("pktest");
    session.send(KEYS.ENTER);

    // Menu 3: network. Options are [Flare, Songbird, Coston2, Coston, LocalHost].
    // Select LocalHost (last item, 4 down arrows from default).
    await session.waitFor("Which network do you want to connect to?");
    for (let i = 0; i < 4; i++) session.send(KEYS.DOWN);
    session.send(KEYS.ENTER);

    // Menu 4: action. Default is "View chain addresses"; "Check on-chain balance" is next.
    await session.waitFor("What do you want to do?");
    session.send(KEYS.DOWN);
    session.send(KEYS.ENTER);

    // Verify the balance output mentions the C-chain ewoq address
    await session.waitFor(EWOQ_ETH_ADDRESS, 60_000);
    expect(session.output.toLowerCase()).to.include("c-chain");
    expect(session.output.toLowerCase()).to.include("p-chain");

    // Exit cleanly. From the action menu, "Exit" is the last option;
    // here we just send Ctrl-C since we've already verified what we wanted.
    session.send(KEYS.CTRL_C);
    await session.wait(10_000).catch(() => {
      session.kill();
    });
  });

  it("stakes a new validator via the menu flow", async () => {
    const session = spawnInteractive(["interactive"], tempDir);

    // Same connect sequence: Private Key, "pktest", LocalHost.
    await session.waitFor("How do you want to connect your wallet?");
    session.send(KEYS.DOWN);
    session.send(KEYS.ENTER);
    await session.waitFor("Enter Path to Private Key file");
    session.send("pktest");
    session.send(KEYS.ENTER);
    await session.waitFor("Which network do you want to connect to?");
    for (let i = 0; i < 4; i++) session.send(KEYS.DOWN);
    session.send(KEYS.ENTER);

    // Action menu: "Add a validator node" is the 7th option (index 6).
    await session.waitFor("What do you want to do?");
    for (let i = 0; i < 6; i++) session.send(KEYS.DOWN);
    session.send(KEYS.ENTER);

    // Stake prompts (post-Durango: no startTime prompt).
    await session.waitFor("Enter amount");
    session.send("10000"); // FLR — network minimum
    session.send(KEYS.ENTER);

    await session.waitFor("Enter NodeId");
    session.send(nodeInfo.nodeID);
    session.send(KEYS.ENTER);

    await session.waitFor("Enter end time");
    session.send(STAKE_END_TIME);
    session.send(KEYS.ENTER);

    await session.waitFor("Enter delegation fee");
    session.send("10");
    session.send(KEYS.ENTER);

    await session.waitFor("Please enter the popBLSPublicKey");
    session.send(nodeInfo.blsPublicKey);
    session.send(KEYS.ENTER);

    await session.waitFor("Please enter the popBLSSignature");
    session.send(nodeInfo.blsProofOfPossession);
    session.send(KEYS.ENTER);

    // Verify the stake tx was built and submitted.
    await session.waitFor("sent to the network", 60_000);
    expect(session.output.toLowerCase()).to.include("transaction with hash");

    session.send(KEYS.CTRL_C);
    await session.wait(10_000).catch(() => {
      session.kill();
    });
  });
});
