import { spawnSync } from "child_process";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
// In docker-in-docker (e.g. GitLab CI), the validator containers are not
// reachable on localhost — they're on the DinD service host. Override these
// via env to point at the DinD alias (e.g. http://docker:9650).
const RPC_HOST = process.env["LOCAL_RPC_HOST"] ?? "localhost";
const RPC_URL = `http://${RPC_HOST}:9650`;
const VALIDATOR2_RPC = `http://${RPC_HOST}:5002`;
const READY_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 2_000;

function dockerCompose(args: string[]): void {
  const result = spawnSync("docker-compose", args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`docker-compose ${args.join(" ")} failed (exit ${result.status})`);
  }
}

async function rpcCall(method: string, params: unknown = {}): Promise<unknown> {
  const response = await fetch(`${RPC_URL}/ext/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) {
    throw new Error(`RPC ${method} HTTP ${response.status}`);
  }
  const json = (await response.json()) as { result?: unknown; error?: unknown };
  if (json.error) {
    throw new Error(`RPC ${method} error: ${JSON.stringify(json.error)}`);
  }
  return json.result;
}

async function isChainBootstrapped(chain: string): Promise<boolean> {
  try {
    const result = (await rpcCall("info.isBootstrapped", { chain })) as { isBootstrapped: boolean };
    return result.isBootstrapped;
  } catch {
    return false;
  }
}

async function areAllChainsReady(): Promise<boolean> {
  for (const chain of ["P", "X", "C"]) {
    if (!(await isChainBootstrapped(chain))) return false;
  }
  return true;
}

export async function startLocalNetwork(): Promise<void> {
  // Ensure clean state: remove any leftover volumes/containers from previous runs.
  // Stale UTXO/mempool state from prior runs causes transaction parsing errors.
  dockerCompose(["down", "-v"]);
  dockerCompose(["up", "-d"]);
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await areAllChainsReady()) {
      // Give validators a brief grace period after bootstrap to settle
      await new Promise((r) => setTimeout(r, 5_000));
      return;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Local network did not become ready within ${READY_TIMEOUT_MS}ms`);
}

export function stopLocalNetwork(): void {
  dockerCompose(["down", "-v"]);
}

export const LOCAL_RPC_URL = RPC_URL;
export const VALIDATOR2_RPC_URL = VALIDATOR2_RPC;

export interface NodeInfo {
  nodeID: string;
  blsPublicKey: string;
  blsProofOfPossession: string;
}

export async function getNodeInfo(rpcUrl: string): Promise<NodeInfo> {
  const response = await fetch(`${rpcUrl}/ext/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "info.getNodeID", params: {} }),
  });
  const json = (await response.json()) as {
    result: { nodeID: string; nodePOP: { publicKey: string; proofOfPossession: string } };
  };
  return {
    nodeID: json.result.nodeID,
    blsPublicKey: json.result.nodePOP.publicKey,
    blsProofOfPossession: json.result.nodePOP.proofOfPossession,
  };
}
