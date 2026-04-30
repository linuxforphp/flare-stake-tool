import { expect } from "chai";
import { startLocalNetwork, stopLocalNetwork, LOCAL_RPC_URL } from "./local-network";

async function rpc(endpoint: string, method: string, params: unknown = {}): Promise<unknown> {
  const response = await fetch(`${LOCAL_RPC_URL}${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await response.json()) as { result?: unknown; error?: unknown };
  if (json.error) {
    throw new Error(`RPC ${method} error: ${JSON.stringify(json.error)}`);
  }
  return json.result;
}

describe("local network integration", function () {
  this.timeout(180_000);

  before(async () => {
    await startLocalNetwork();
  });

  after(() => {
    stopLocalNetwork();
  });

  it("reports network ID 162 (localflare)", async () => {
    const result = (await rpc("/ext/info", "info.getNetworkID")) as { networkID: string };
    expect(result.networkID).to.equal("162");
  });

  it("P-chain has expected initial validator", async () => {
    const result = (await rpc("/ext/bc/P", "platform.getCurrentValidators")) as {
      validators: { nodeID: string; rewardOwner: { addresses: string[] } }[];
    };
    expect(result.validators).to.be.an("array").with.length.greaterThan(0);
    const nodeIds = result.validators.map((v) => v.nodeID);
    expect(nodeIds).to.include("NodeID-7Xhw2mDxuDS44j42TCB6U5579esbSt3Lg");
  });

  it("genesis allocation is funded on P-chain", async () => {
    const validator = (
      (await rpc("/ext/bc/P", "platform.getCurrentValidators")) as {
        validators: { nodeID: string; rewardOwner: { addresses: string[] } }[];
      }
    ).validators.find((v) => v.nodeID === "NodeID-7Xhw2mDxuDS44j42TCB6U5579esbSt3Lg");
    expect(validator).to.not.be.undefined;
    expect(validator!.rewardOwner.addresses).to.include("P-localflare1g65uqn6t77p656w64023nh8nd9updzmxe63cr6");
  });
});
