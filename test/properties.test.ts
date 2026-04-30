import { expect } from "chai";
import * as fc from "fast-check";
import {
  toHex,
  isHex,
  prefix0x,
  unPrefix0x,
  decimalToInteger,
  integerToDecimal,
  privateKeyToEncodedPublicKey,
  decodePublicKey,
  compressPublicKey,
} from "../src/utils";
import {
  compressedPublicKey,
  uncompressedPublicKey,
  pAddressToHex,
  pAddressToBech,
  publicKeyToPAddress,
  isPAddress,
  normalizePublicKey,
} from "../src/flare/pubk";

const NETWORKS = ["flare", "costwo", "coston", "songbird", "localflare"];

// Generators

const HEX_CHAR = fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f");
const hexString = (minLength: number, maxLength: number) => fc.string({ unit: HEX_CHAR, minLength, maxLength });
const hex32 = hexString(64, 64);
const validPrivKey = hex32.filter((s) => {
  // secp256k1 valid scalar: 1 <= k < n. Reject 0 and the trivially-out-of-range case.
  if (/^0+$/.test(s)) return false;
  // Curve order N starts with 0xfffffffffffffffffffffffffffffffe...
  // Most random hex32s are well below N, but reject any starting with 'f'*16 to be safe
  return !/^f{16}/i.test(s);
});

const positiveInt = fc.bigInt({ min: 1n, max: 10n ** 18n });
const decimalString = fc
  .tuple(fc.integer({ min: 0, max: 1_000_000_000 }), fc.integer({ min: 0, max: 999_999_999 }))
  .map(([whole, frac]) => `${whole}.${String(frac).padStart(9, "0")}`);

describe("property-based tests", () => {
  describe("hex prefix invariants", () => {
    it("unPrefix0x ∘ prefix0x is idempotent on non-empty hex", () => {
      fc.assert(
        fc.property(hexString(1, 64), (h) => {
          expect(unPrefix0x(prefix0x(h))).to.equal(h);
        })
      );
    });

    it("prefix0x ∘ unPrefix0x preserves prefixed form", () => {
      fc.assert(
        fc.property(hexString(1, 64), (h) => {
          const prefixed = "0x" + h;
          expect(prefix0x(unPrefix0x(prefixed))).to.equal(prefixed);
        })
      );
    });

    it("isHex accepts everything toHex outputs", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (n) => {
          expect(isHex(toHex(n))).to.be.true;
        })
      );
    });
  });

  describe("decimal/integer round-trip", () => {
    it("integerToDecimal ∘ decimalToInteger is the identity (for representable values)", () => {
      fc.assert(
        fc.property(decimalString, (d) => {
          // Strip trailing zeros from the decimal portion to get the canonical form
          const [whole, frac = ""] = d.split(".");
          const trimmedFrac = frac.replace(/0+$/, "");
          const canonical = trimmedFrac ? `${whole}.${trimmedFrac}` : whole;
          // Edge case: decimalToInteger of "0" → "0...0"; integerToDecimal of "0" → "0"
          if (canonical === "0") return;
          expect(integerToDecimal(decimalToInteger(d, 9), 9)).to.equal(canonical);
        })
      );
    });
  });

  describe("public key compression round-trip", () => {
    it("uncompressedPublicKey ∘ compressedPublicKey preserves the key", () => {
      fc.assert(
        fc.property(validPrivKey, (priv) => {
          const compressed = privateKeyToEncodedPublicKey(priv);
          const uncompressed = uncompressedPublicKey(compressed, true);
          const recompressed = compressedPublicKey(uncompressed);
          expect(recompressed).to.equal(compressed);
        }),
        { numRuns: 50 }
      );
    });

    it("decode then re-encode preserves the public key", () => {
      fc.assert(
        fc.property(validPrivKey, (priv) => {
          const compressed = privateKeyToEncodedPublicKey(priv);
          const [x, y] = decodePublicKey(compressed);
          const reCompressed = compressPublicKey(x, y).toString("hex");
          expect(reCompressed).to.equal(compressed);
        }),
        { numRuns: 50 }
      );
    });

    it("normalizePublicKey is idempotent", () => {
      fc.assert(
        fc.property(validPrivKey, (priv) => {
          const compressed = privateKeyToEncodedPublicKey(priv);
          const once = normalizePublicKey(compressed);
          const twice = normalizePublicKey(once);
          expect(once).to.equal(twice);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("P-chain address round-trip", () => {
    it("pAddressToBech ∘ pAddressToHex preserves the bech32 form", () => {
      fc.assert(
        fc.property(validPrivKey, fc.constantFrom(...NETWORKS), (priv, network) => {
          const compressed = privateKeyToEncodedPublicKey(priv);
          const pAddress = publicKeyToPAddress(network, compressed);
          const hex = pAddressToHex(pAddress);
          const back = pAddressToBech(network, hex);
          expect(back).to.equal(pAddress);
        }),
        { numRuns: 50 }
      );
    });

    it("derived P-addresses are valid for their network", () => {
      fc.assert(
        fc.property(validPrivKey, fc.constantFrom(...NETWORKS), (priv, network) => {
          const compressed = privateKeyToEncodedPublicKey(priv);
          const pAddress = publicKeyToPAddress(network, compressed);
          expect(isPAddress(network, pAddress)).to.be.true;
        }),
        { numRuns: 50 }
      );
    });

    it("derived P-addresses are not valid for any other network", () => {
      fc.assert(
        fc.property(validPrivKey, fc.constantFrom(...NETWORKS), (priv, network) => {
          const compressed = privateKeyToEncodedPublicKey(priv);
          const pAddress = publicKeyToPAddress(network, compressed);
          for (const other of NETWORKS) {
            if (other === network) continue;
            expect(isPAddress(other, pAddress), `${pAddress} should not be valid on ${other}`).to.be.false;
          }
        }),
        { numRuns: 30 }
      );
    });
  });
});

// suppress unused warning for positiveInt if not referenced
void positiveInt;
