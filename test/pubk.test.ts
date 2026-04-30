import { expect } from "chai";
import {
  compressedPublicKey,
  uncompressedPublicKey,
  normalizePublicKey,
  equalPublicKey,
  isPublicKey,
  publicKeyToCAddress,
  isCAddress,
  equalCAddress,
  normalizeCAddress,
  publicKeyToPAddress,
  isPAddress,
  pAddressToHex,
  pAddressToBech,
  pAddressToBytes20,
  normalizePAddress,
  equalPAddress,
  getHashedEthMsg,
  recoverPublicKeyFromMsg,
  recoverPublicKeyFromEthMsg,
  compressPublicKey,
} from "../src/flare/pubk";

import * as ethutil from "ethereumjs-util";
import { toHex } from "../src/utils";

// Sample compressed public key (from prompts.ts example)
const COMPRESSED_KEY = "02efe41c5d213089cb7a9e808505e9084bb9eb2bf3aa8050ea92a5ae9e20e5a692";
const COMPRESSED_KEY_0X = "0x" + COMPRESSED_KEY;
// Matching private key for signature tests
const TEST_PRIVKEY = "d49743deccbccc5dc7baa8e69e5be03298da8688a15dd202e20f15d5e0e9a9fb";

describe("flare/pubk", () => {
  // Derive the uncompressed key once for reuse
  let uncompressedKey: string;
  let uncompressedKeyWithPrefix: string;

  before(() => {
    uncompressedKeyWithPrefix = uncompressedPublicKey(COMPRESSED_KEY, true);
    uncompressedKey = uncompressedPublicKey(COMPRESSED_KEY, false);
  });

  describe("compressedPublicKey", () => {
    it("returns compressed form of a compressed key", () => {
      expect(compressedPublicKey(COMPRESSED_KEY)).to.equal(COMPRESSED_KEY);
    });

    it("compresses an uncompressed key", () => {
      expect(compressedPublicKey(uncompressedKeyWithPrefix)).to.equal(COMPRESSED_KEY);
    });

    it("compresses an uncompressed key without 04 prefix", () => {
      expect(compressedPublicKey(uncompressedKey)).to.equal(COMPRESSED_KEY);
    });
  });

  describe("uncompressedPublicKey", () => {
    it("returns 130-char key with 04 prefix when prefix=true", () => {
      expect(uncompressedKeyWithPrefix).to.have.length(130);
      expect(uncompressedKeyWithPrefix).to.match(/^04[a-f0-9]{128}$/);
    });

    it("returns 128-char key without prefix when prefix=false", () => {
      expect(uncompressedKey).to.have.length(128);
      expect(uncompressedKey).to.match(/^[a-f0-9]{128}$/);
    });

    it("is idempotent with prefix", () => {
      expect(uncompressedPublicKey(uncompressedKeyWithPrefix, true)).to.equal(uncompressedKeyWithPrefix);
    });
  });

  describe("normalizePublicKey", () => {
    it("returns 128-char uncompressed key without prefix", () => {
      const normalized = normalizePublicKey(COMPRESSED_KEY);
      expect(normalized).to.have.length(128);
      expect(normalized).to.equal(uncompressedKey);
    });
  });

  describe("isPublicKey", () => {
    it("returns true for valid compressed key", () => {
      expect(isPublicKey(COMPRESSED_KEY)).to.be.true;
    });

    it("returns true for valid compressed key with 0x prefix", () => {
      expect(isPublicKey(COMPRESSED_KEY_0X)).to.be.true;
    });

    it("returns true for valid uncompressed key", () => {
      expect(isPublicKey(uncompressedKeyWithPrefix)).to.be.true;
    });

    it("returns false for invalid key", () => {
      expect(isPublicKey("not-a-key")).to.be.false;
    });

    it("returns false for empty string", () => {
      expect(isPublicKey("")).to.be.false;
    });

    it("returns false for wrong length hex", () => {
      expect(isPublicKey("02abcd")).to.be.false;
    });
  });

  describe("equalPublicKey", () => {
    it("returns true for same key in different formats", () => {
      expect(equalPublicKey(COMPRESSED_KEY, uncompressedKeyWithPrefix)).to.be.true;
    });

    it("returns true for same compressed key", () => {
      expect(equalPublicKey(COMPRESSED_KEY, COMPRESSED_KEY)).to.be.true;
    });

    it("returns false for different keys", () => {
      // Flip the prefix byte (02 -> 03) to get a different point
      const differentKey = "03" + COMPRESSED_KEY.slice(2);
      expect(equalPublicKey(COMPRESSED_KEY, differentKey)).to.be.false;
    });

    it("returns false for invalid input", () => {
      expect(equalPublicKey("invalid", COMPRESSED_KEY)).to.be.false;
    });
  });

  describe("C-chain address functions", () => {
    let cAddress: string;

    before(() => {
      cAddress = publicKeyToCAddress(COMPRESSED_KEY);
    });

    it("publicKeyToCAddress returns valid checksummed address", () => {
      expect(cAddress).to.match(/^0x[0-9a-fA-F]{40}$/);
      expect(isCAddress(cAddress)).to.be.true;
    });

    it("isCAddress returns true for valid address", () => {
      expect(isCAddress("0xEAD9c93b79Ae7C1591b1FB5323BD777E86e150d4")).to.be.true;
    });

    it("isCAddress returns false for invalid address", () => {
      expect(isCAddress("not-an-address")).to.be.false;
    });

    it("equalCAddress matches same address in different cases", () => {
      expect(equalCAddress(cAddress, cAddress.toLowerCase())).to.be.true;
    });

    it("normalizeCAddress adds checksum", () => {
      const lower = cAddress.toLowerCase();
      const normalized = normalizeCAddress(lower);
      expect(normalized).to.match(/^0x[0-9a-fA-F]{40}$/);
      expect(normalized).to.not.equal(lower); // checksum adds mixed case
    });
  });

  describe("P-chain address functions", () => {
    let pAddress: string;
    const network = "flare";

    before(() => {
      pAddress = publicKeyToPAddress(network, COMPRESSED_KEY);
    });

    it("publicKeyToPAddress returns bech32 address", () => {
      expect(pAddress).to.match(/^flare1[a-z0-9]+$/);
    });

    it("isPAddress returns true for valid address", () => {
      expect(isPAddress(network, pAddress)).to.be.true;
    });

    it("isPAddress returns true with P- prefix", () => {
      expect(isPAddress(network, "P-" + pAddress)).to.be.true;
    });

    it("isPAddress returns false for wrong network", () => {
      expect(isPAddress("costwo", pAddress)).to.be.false;
    });

    it("pAddressToHex and pAddressToBech are inverse operations", () => {
      const hex = pAddressToHex(pAddress);
      const backToBech = pAddressToBech(network, hex);
      expect(backToBech).to.equal(pAddress);
    });

    it("normalizePAddress strips P- prefix", () => {
      expect(normalizePAddress(network, "P-" + pAddress)).to.equal(pAddress);
    });

    it("normalizePAddress converts hex to bech32", () => {
      const hex = pAddressToHex(pAddress);
      expect(normalizePAddress(network, hex)).to.equal(pAddress);
    });
  });

  describe("equalPAddress", () => {
    let pAddress: string;
    let pAddressHex: string;
    const network = "flare";

    before(() => {
      pAddress = publicKeyToPAddress(network, COMPRESSED_KEY);
      pAddressHex = pAddressToHex(pAddress);
    });

    it("returns true for same bech32 address", () => {
      expect(equalPAddress(network, pAddress, pAddress)).to.be.true;
    });

    it("returns true for bech32 vs hex of same address", () => {
      expect(equalPAddress(network, pAddress, pAddressHex)).to.be.true;
    });

    it("returns true with P- prefix", () => {
      expect(equalPAddress(network, "P-" + pAddress, pAddress)).to.be.true;
    });

    it("returns false for different addresses", () => {
      // Use a different key to get a different address
      const differentKey = "03" + COMPRESSED_KEY.slice(2);
      const differentAddr = publicKeyToPAddress(network, differentKey);
      expect(equalPAddress(network, pAddress, differentAddr)).to.be.false;
    });
  });

  describe("pAddressToBytes20", () => {
    it("returns 40-char hex string (20 bytes)", () => {
      const pAddress = publicKeyToPAddress("flare", COMPRESSED_KEY);
      const bytes20 = pAddressToBytes20(pAddress);
      expect(bytes20).to.match(/^[a-f0-9]{40}$/);
    });

    it("is consistent with pAddressToHex", () => {
      const pAddress = publicKeyToPAddress("flare", COMPRESSED_KEY);
      const bytes20 = pAddressToBytes20(pAddress);
      const hex = pAddressToHex(pAddress);
      // pAddressToHex returns with 0x prefix, bytes20 does not
      expect(hex).to.equal("0x" + bytes20);
    });
  });

  describe("getHashedEthMsg", () => {
    it("returns a 66-char hex string (32 bytes + 0x)", () => {
      const hash = getHashedEthMsg("hello");
      expect(hash).to.match(/^0x[a-f0-9]{64}$/);
    });

    it("returns different hashes for different messages", () => {
      expect(getHashedEthMsg("hello")).to.not.equal(getHashedEthMsg("world"));
    });

    it("is deterministic", () => {
      expect(getHashedEthMsg("test")).to.equal(getHashedEthMsg("test"));
    });
  });

  describe("recoverPublicKeyFromMsg", () => {
    // Sign a raw message hash with the known private key
    const SIGN_PRIVKEY = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const SIGN_COMPRESSED_KEY = "02bb50e2d89a4ed70663d080659fe0ad4b9bc3e06c17a227433966cb59ceee020d";

    it("recovers the correct public key from a signed message hash", () => {
      const messageHash = ethutil.keccak256(Buffer.from("test message"));
      const sig = ethutil.ecsign(messageHash, Buffer.from(SIGN_PRIVKEY, "hex"));
      const signature = toHex(Buffer.concat([sig.r, sig.s, Buffer.from([sig.v])]), false);

      const recovered = recoverPublicKeyFromMsg(toHex(messageHash), signature);
      const expected = normalizePublicKey(SIGN_COMPRESSED_KEY);
      expect(recovered).to.equal(expected);
    });
  });

  describe("recoverPublicKeyFromEthMsg", () => {
    const SIGN_PRIVKEY = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const SIGN_COMPRESSED_KEY = "02bb50e2d89a4ed70663d080659fe0ad4b9bc3e06c17a227433966cb59ceee020d";

    it("recovers the correct public key from an eth-signed message", () => {
      const message = "hello flare";
      // Hash with eth prefix then sign
      const hashedMsg = ethutil.keccakFromString(`\x19Ethereum Signed Message:\n${message.length}${message}`);
      const sig = ethutil.ecsign(hashedMsg, Buffer.from(SIGN_PRIVKEY, "hex"));
      const signature = toHex(Buffer.concat([sig.r, sig.s, Buffer.from([sig.v])]), false);

      const recovered = recoverPublicKeyFromEthMsg(message, signature);
      const expected = normalizePublicKey(SIGN_COMPRESSED_KEY);
      expect(recovered).to.equal(expected);
    });
  });

  describe("cross-network address derivation", () => {
    const networks = ["flare", "costwo", "coston", "songbird"];

    it("derives unique P-chain addresses per network from same key", () => {
      const addresses = networks.map((n) => publicKeyToPAddress(n, COMPRESSED_KEY));
      const unique = new Set(addresses);
      expect(unique.size).to.equal(networks.length);
    });

    it("C-chain address is the same regardless of network", () => {
      const cAddr = publicKeyToCAddress(COMPRESSED_KEY);
      // C-chain address is derived from public key alone, not network
      expect(cAddr).to.match(/^0x[0-9a-fA-F]{40}$/);
    });
  });

  describe("compressPublicKey (Uint8Array)", () => {
    it("returns same buffer for already compressed key (33 bytes)", () => {
      const compressed = Buffer.from(COMPRESSED_KEY, "hex");
      expect(compressPublicKey(compressed)).to.deep.equal(compressed);
    });

    it("compresses a 65-byte uncompressed key", () => {
      const uncompressed = Buffer.from(uncompressedPublicKey(COMPRESSED_KEY, true), "hex");
      const result = compressPublicKey(uncompressed);
      expect(result).to.have.length(33);
      expect(Buffer.from(result).toString("hex")).to.equal(COMPRESSED_KEY);
    });
  });
});
