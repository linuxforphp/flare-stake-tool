import { expect } from "chai";
import BN from "bn.js";
import {
  toHex,
  isHex,
  isZeroHex,
  isEqualHex,
  toBuffer,
  toCB58,
  flrToGwei,
  weiToFlr,
  gweiToFlr,
  gweiToWei,
  weiToGwei,
  weiToGweiCeil,
  adjustStartTime,
  adjustStartTimeForDefi,
  unPrefix0x,
  prefix0x,
  decimalToInteger,
  integerToDecimal,
  toBN,
  privateKeyToPublicKey,
  privateKeyToEncodedPublicKey,
  decodePublicKey,
  compressPublicKey,
  publicKeyToBech32AddressString,
  publicKeyToEthereumAddressString,
  validatePublicKey,
  recoverMessageSigner,
  recoverTransactionSigner,
  recoverPublicKey,
  initCtxJson,
  readUnsignedTxJson,
  readSignedTxJson,
  saveUnsignedTxJson,
  addFlagForSentSignedTx,
  isAlreadySentToChain,
  dateToDateTimeLocalString,
  dateToDateTimeString,
  timestamp,
  sleepms,
  waitWhile,
} from "../src/utils";
import fs from "fs";
import path from "path";
import * as ethutil from "ethereumjs-util";

describe("utils", () => {
  describe("toHex", () => {
    it("converts number to hex with 0x prefix", () => {
      expect(toHex(255)).to.equal("0xff");
    });

    it("converts number to hex without prefix", () => {
      expect(toHex(255, false)).to.equal("ff");
    });

    it("passes through hex string with prefix", () => {
      expect(toHex("0xabcd")).to.equal("0xabcd");
    });

    it("adds prefix to bare hex string", () => {
      expect(toHex("abcd")).to.equal("0xabcd");
    });

    it("strips prefix when requested", () => {
      expect(toHex("0xabcd", false)).to.equal("abcd");
    });

    it("converts Buffer to hex", () => {
      expect(toHex(Buffer.from([0xde, 0xad]))).to.equal("0xdead");
    });

    it("converts Uint8Array to hex", () => {
      expect(toHex(new Uint8Array([0xbe, 0xef]))).to.equal("0xbeef");
    });

    it("converts falsy value to 0x0", () => {
      expect(toHex(0)).to.equal("0x0");
    });
  });

  describe("isHex", () => {
    it("returns true for valid hex with prefix", () => {
      expect(isHex("0xabcdef")).to.be.true;
    });

    it("returns true for valid hex without prefix", () => {
      expect(isHex("ABCDEF")).to.be.true;
    });

    it("returns false for non-hex characters", () => {
      expect(isHex("xyz")).to.be.false;
    });

    it("returns false for empty string", () => {
      expect(isHex("")).to.be.false;
    });
  });

  describe("isZeroHex", () => {
    it("returns true for 0x0", () => {
      expect(isZeroHex("0x0")).to.be.true;
    });

    it("returns true for 0x0000", () => {
      expect(isZeroHex("0x0000")).to.be.true;
    });

    it("returns false for non-zero", () => {
      expect(isZeroHex("0x1")).to.be.false;
    });

    it("returns false without prefix", () => {
      expect(isZeroHex("00")).to.be.false;
    });
  });

  describe("isEqualHex", () => {
    it("returns true for same hex different case", () => {
      expect(isEqualHex("0xABCD", "0xabcd")).to.be.true;
    });

    it("returns true for same hex with/without prefix", () => {
      expect(isEqualHex("0xab", "ab")).to.be.true;
    });

    it("returns false for different values", () => {
      expect(isEqualHex("0xab", "0xcd")).to.be.false;
    });

    it("returns false for non-hex input", () => {
      expect(isEqualHex("xyz", "xyz")).to.be.false;
    });
  });

  describe("toBuffer", () => {
    it("returns same buffer if already buffer", () => {
      const buf = Buffer.from([1, 2, 3]);
      expect(toBuffer(buf)).to.equal(buf);
    });

    it("converts hex string to buffer", () => {
      const buf = toBuffer("0xdead");
      expect(buf.toString("hex")).to.equal("dead");
    });

    it("converts number to buffer", () => {
      const buf = toBuffer(255);
      expect(buf.toString("hex")).to.equal("ff");
    });
  });

  describe("toCB58", () => {
    it("encodes buffer to base58", () => {
      const buf = Buffer.from("hello");
      const encoded = toCB58(buf);
      expect(typeof encoded).to.equal("string");
      expect(encoded.length).to.be.greaterThan(0);
    });
  });

  describe("unit conversions", () => {
    it("flrToGwei converts 1 FLR to 1e9 gwei", () => {
      expect(flrToGwei(1).toString()).to.equal("1000000000");
    });

    it("weiToFlr converts 1e18 wei to 1 FLR", () => {
      expect(weiToFlr("1000000000000000000")).to.equal("1");
    });

    it("gweiToFlr converts 1e9 gwei to 1 FLR", () => {
      expect(gweiToFlr("1000000000")).to.equal("1");
    });

    it("gweiToWei converts 1 gwei to 1e9 wei", () => {
      expect(gweiToWei(1).toString()).to.equal("1000000000");
    });

    it("weiToGwei converts 1e9 wei to 1 gwei", () => {
      expect(weiToGwei(1000000000).toString()).to.equal("1");
    });

    it("weiToGweiCeil rounds up", () => {
      expect(weiToGweiCeil(1000000001).toString()).to.equal("2");
    });

    it("weiToGweiCeil exact value stays same", () => {
      expect(weiToGweiCeil(2000000000).toString()).to.equal("2");
    });
  });

  describe("adjustStartTime", () => {
    it("returns provided number", () => {
      expect(adjustStartTime(12345)).to.equal(12345);
    });

    it("returns parsed string number", () => {
      expect(adjustStartTime("67890")).to.equal(67890);
    });

    it("returns current unix time for undefined", () => {
      const now = Math.round(Date.now() / 1000);
      const result = adjustStartTime(undefined);
      expect(result).to.be.closeTo(now, 2);
    });
  });

  describe("adjustStartTimeForDefi", () => {
    it("returns provided number", () => {
      expect(adjustStartTimeForDefi(12345)).to.equal(12345);
    });

    it("returns 1 for undefined", () => {
      expect(adjustStartTimeForDefi(undefined)).to.equal(1);
    });
  });

  describe("unPrefix0x", () => {
    it("removes 0x prefix", () => {
      expect(unPrefix0x("0xabcd")).to.equal("abcd");
    });

    it("returns as-is without prefix", () => {
      expect(unPrefix0x("abcd")).to.equal("abcd");
    });

    it("returns 0x0 for empty string", () => {
      expect(unPrefix0x("")).to.equal("0x0");
    });
  });

  describe("prefix0x", () => {
    it("adds 0x prefix", () => {
      expect(prefix0x("abcd")).to.equal("0xabcd");
    });

    it("keeps existing prefix", () => {
      expect(prefix0x("0xabcd")).to.equal("0xabcd");
    });

    it("returns 0x0 for empty string", () => {
      expect(prefix0x("")).to.equal("0x0");
    });
  });

  describe("decimalToInteger", () => {
    it("converts decimal with point", () => {
      expect(decimalToInteger("1.5", 9)).to.equal("1500000000");
    });

    it("converts integer without point", () => {
      expect(decimalToInteger("10", 9)).to.equal("10000000000");
    });

    it("truncates extra decimal places", () => {
      expect(decimalToInteger("1.123456789012", 9)).to.equal("1123456789");
    });

    it("pads short decimal places", () => {
      expect(decimalToInteger("1.1", 9)).to.equal("1100000000");
    });
  });

  describe("integerToDecimal", () => {
    it("converts integer to decimal", () => {
      expect(integerToDecimal("1500000000", 9)).to.equal("1.5");
    });

    it("returns 0 for zero", () => {
      expect(integerToDecimal("0", 9)).to.equal("0");
    });

    it("handles value shorter than offset", () => {
      expect(integerToDecimal("5", 9)).to.equal("0.000000005");
    });

    it("strips trailing zeros in decimal part", () => {
      expect(integerToDecimal("1000000000", 9)).to.equal("1");
    });
  });

  describe("toBN", () => {
    it("converts number to BN", () => {
      const result = toBN(42);
      expect(result).to.be.instanceOf(BN);
      expect(result!.toNumber()).to.equal(42);
    });

    it("converts string to BN", () => {
      const result = toBN("100");
      expect(result!.toNumber()).to.equal(100);
    });

    it("returns undefined for undefined", () => {
      expect(toBN(undefined)).to.be.undefined;
    });
  });

  // Known test keypair (deterministic from a fixed private key)
  const TEST_PRIVKEY = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const TEST_PRIVKEY_BUF = Buffer.from(TEST_PRIVKEY, "hex");

  describe("privateKeyToPublicKey", () => {
    it("returns two 32-byte buffers [x, y]", () => {
      const [x, y] = privateKeyToPublicKey(TEST_PRIVKEY_BUF);
      expect(x).to.have.length(32);
      expect(y).to.have.length(32);
    });

    it("produces consistent output", () => {
      const [x1, y1] = privateKeyToPublicKey(TEST_PRIVKEY_BUF);
      const [x2, y2] = privateKeyToPublicKey(TEST_PRIVKEY_BUF);
      expect(x1.toString("hex")).to.equal(x2.toString("hex"));
      expect(y1.toString("hex")).to.equal(y2.toString("hex"));
    });
  });

  describe("privateKeyToEncodedPublicKey", () => {
    it("returns compressed key (66 chars) by default", () => {
      const key = privateKeyToEncodedPublicKey(TEST_PRIVKEY);
      expect(key).to.have.length(66);
      expect(key).to.match(/^0[23]/);
    });

    it("returns uncompressed key (130 chars) when compress=false", () => {
      const key = privateKeyToEncodedPublicKey(TEST_PRIVKEY, false);
      expect(key).to.have.length(130);
      expect(key).to.match(/^04/);
    });
  });

  describe("decodePublicKey", () => {
    it("decodes compressed key to [x, y] pair", () => {
      const compressed = privateKeyToEncodedPublicKey(TEST_PRIVKEY);
      const [x, y] = decodePublicKey(compressed);
      expect(x).to.have.length(32);
      expect(y).to.have.length(32);
    });

    it("decodes uncompressed key without 04 prefix (128 chars)", () => {
      const uncompressed = privateKeyToEncodedPublicKey(TEST_PRIVKEY, false).slice(2);
      const [x, y] = decodePublicKey(uncompressed);
      expect(x).to.have.length(32);
      expect(y).to.have.length(32);
    });

    it("roundtrips with privateKeyToPublicKey", () => {
      const [origX, origY] = privateKeyToPublicKey(TEST_PRIVKEY_BUF);
      const compressed = privateKeyToEncodedPublicKey(TEST_PRIVKEY);
      const [decodedX, decodedY] = decodePublicKey(compressed);
      expect(decodedX.toString("hex")).to.equal(origX.toString("hex"));
      expect(decodedY.toString("hex")).to.equal(origY.toString("hex"));
    });
  });

  describe("compressPublicKey (x, y)", () => {
    it("returns a 33-byte buffer", () => {
      const [x, y] = privateKeyToPublicKey(TEST_PRIVKEY_BUF);
      const compressed = compressPublicKey(x, y);
      expect(compressed).to.have.length(33);
    });

    it("matches the encoded compressed key", () => {
      const [x, y] = privateKeyToPublicKey(TEST_PRIVKEY_BUF);
      const compressed = compressPublicKey(x, y);
      const encoded = privateKeyToEncodedPublicKey(TEST_PRIVKEY);
      expect(compressed.toString("hex")).to.equal(encoded);
    });
  });

  describe("publicKeyToBech32AddressString", () => {
    it("returns a bech32 address for flare network", () => {
      const compressed = privateKeyToEncodedPublicKey(TEST_PRIVKEY);
      const address = publicKeyToBech32AddressString(compressed, "flare");
      expect(address).to.match(/^flare1[a-z0-9]+$/);
    });

    it("returns different addresses for different networks", () => {
      const compressed = privateKeyToEncodedPublicKey(TEST_PRIVKEY);
      const flareAddr = publicKeyToBech32AddressString(compressed, "flare");
      const costwoAddr = publicKeyToBech32AddressString(compressed, "costwo");
      expect(flareAddr).to.not.equal(costwoAddr);
      expect(flareAddr).to.match(/^flare1/);
      expect(costwoAddr).to.match(/^costwo1/);
    });
  });

  describe("publicKeyToEthereumAddressString", () => {
    it("returns a valid 0x-prefixed 42-char hex address", () => {
      const compressed = privateKeyToEncodedPublicKey(TEST_PRIVKEY);
      const address = publicKeyToEthereumAddressString(compressed);
      expect(address).to.match(/^0x[0-9a-f]{40}$/);
    });

    it("is deterministic", () => {
      const compressed = privateKeyToEncodedPublicKey(TEST_PRIVKEY);
      const addr1 = publicKeyToEthereumAddressString(compressed);
      const addr2 = publicKeyToEthereumAddressString(compressed);
      expect(addr1).to.equal(addr2);
    });
  });

  describe("validatePublicKey", () => {
    it("returns true for valid compressed key", () => {
      const key = privateKeyToEncodedPublicKey(TEST_PRIVKEY);
      expect(validatePublicKey(key)).to.be.true;
    });

    it("returns true for valid uncompressed key", () => {
      const key = privateKeyToEncodedPublicKey(TEST_PRIVKEY, false);
      expect(validatePublicKey(key)).to.be.true;
    });

    it("returns false for invalid key", () => {
      expect(validatePublicKey("deadbeef")).to.be.false;
    });

    it("returns false for empty string", () => {
      expect(validatePublicKey("")).to.be.false;
    });
  });

  describe("signature recovery", () => {
    // Sign a message with the test private key for recovery tests
    const message = Buffer.from("hello world");
    const messageHash = ethutil.hashPersonalMessage(message);
    let signature: string;

    before(() => {
      const sig = ethutil.ecsign(messageHash, Buffer.from(TEST_PRIVKEY, "hex"));
      signature = toHex(Buffer.concat([sig.r, sig.s, Buffer.from([sig.v])]), false);
    });

    it("recoverMessageSigner returns correct signer address", () => {
      const ethAddress = publicKeyToEthereumAddressString(privateKeyToEncodedPublicKey(TEST_PRIVKEY));
      const signer = recoverMessageSigner(message, "0x" + signature);
      expect("0x" + signer).to.equal(ethAddress.toLowerCase());
    });

    it("recoverTransactionSigner returns correct signer address", () => {
      const ethAddress = publicKeyToEthereumAddressString(privateKeyToEncodedPublicKey(TEST_PRIVKEY));
      const signer = recoverTransactionSigner(messageHash, "0x" + signature);
      expect("0x" + signer).to.equal(ethAddress.toLowerCase());
    });

    it("recoverPublicKey returns a valid public key buffer", () => {
      const pubkey = recoverPublicKey(messageHash, "0x" + signature);
      expect(pubkey).to.have.length(64);
    });
  });

  describe("file I/O functions", () => {
    const tmpDir = path.join(__dirname, ".tmp-test");

    beforeEach(() => {
      fs.mkdirSync(tmpDir, { recursive: true });
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("initCtxJson creates ctx.json", () => {
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        initCtxJson({
          wallet: "test",
          publicKey: "02abc",
          network: "flare",
        });
        expect(fs.existsSync(path.join(tmpDir, "ctx.json"))).to.be.true;
        const content = JSON.parse(fs.readFileSync(path.join(tmpDir, "ctx.json"), "utf-8"));
        expect(content.wallet).to.equal("test");
        expect(content.network).to.equal("flare");
      } finally {
        process.chdir(origCwd);
      }
    });

    it("initCtxJson throws if ctx.json already exists", () => {
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        fs.writeFileSync(path.join(tmpDir, "ctx.json"), "{}");
        expect(() =>
          initCtxJson({
            wallet: "test",
            publicKey: "02abc",
            network: "flare",
          })
        ).to.throw("ctx.json already exists");
      } finally {
        process.chdir(origCwd);
      }
    });

    it("saveUnsignedTxJson and readUnsignedTxJson roundtrip", () => {
      const tx = {
        transactionType: "export",
        serialization: "hex",
        signatureRequests: [{ message: "deadbeef", signer: "0x123" }],
        unsignedTransactionBuffer: "aabb",
      };
      saveUnsignedTxJson(tx, "test-tx", tmpDir);
      const fname = path.join(tmpDir, "test-tx.unsignedTx.json");
      expect(fs.existsSync(fname)).to.be.true;
      const loaded = JSON.parse(fs.readFileSync(fname, "utf-8"));
      expect(loaded.transactionType).to.equal("export");
      expect(loaded.forDefiHash).to.be.a("string");
    });

    it("saveUnsignedTxJson throws if file already exists", () => {
      const tx = {
        transactionType: "export",
        serialization: "hex",
        signatureRequests: [{ message: "deadbeef", signer: "0x123" }],
        unsignedTransactionBuffer: "aabb",
      };
      saveUnsignedTxJson(tx, "dup-tx", tmpDir);
      expect(() => saveUnsignedTxJson(tx, "dup-tx", tmpDir)).to.throw("already exists");
    });

    it("readSignedTxJson reads a valid signed tx", () => {
      const signedDir = path.join(tmpDir, "ForDefiTxnFiles", "SignedTxns");
      fs.mkdirSync(signedDir, { recursive: true });
      const signedTx = {
        transactionType: "export",
        serialization: "hex",
        signatureRequests: [{ message: "aabb", signer: "0x1" }],
        unsignedTransactionBuffer: "ccdd",
        signature: "aabbccdd",
      };
      fs.writeFileSync(path.join(signedDir, "read-test.signedTx.json"), JSON.stringify(signedTx));
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        const loaded = readSignedTxJson("read-test");
        expect(loaded.signature).to.equal("aabbccdd");
        expect(loaded.transactionType).to.equal("export");
      } finally {
        process.chdir(origCwd);
      }
    });

    it("readSignedTxJson throws if file missing", () => {
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        expect(() => readSignedTxJson("nonexistent")).to.throw("does not exist");
      } finally {
        process.chdir(origCwd);
      }
    });

    it("readSignedTxJson throws if signature missing", () => {
      const signedDir = path.join(tmpDir, "ForDefiTxnFiles", "SignedTxns");
      fs.mkdirSync(signedDir, { recursive: true });
      const noSig = {
        transactionType: "export",
        serialization: "hex",
        signatureRequests: [{ message: "aabb", signer: "0x1" }],
        unsignedTransactionBuffer: "ccdd",
      };
      fs.writeFileSync(path.join(signedDir, "nosig.signedTx.json"), JSON.stringify(noSig));
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        expect(() => readSignedTxJson("nosig")).to.throw("does not contain signature");
      } finally {
        process.chdir(origCwd);
      }
    });

    it("addFlagForSentSignedTx sets isSentToChain flag", () => {
      const signedDir = path.join(tmpDir, "ForDefiTxnFiles", "SignedTxns");
      fs.mkdirSync(signedDir, { recursive: true });
      const signedTx = {
        transactionType: "export",
        serialization: "hex",
        signatureRequests: [{ message: "aabb", signer: "0x1" }],
        unsignedTransactionBuffer: "ccdd",
        signature: "1122",
      };
      fs.writeFileSync(path.join(signedDir, "flag-test.signedTx.json"), JSON.stringify(signedTx));
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        addFlagForSentSignedTx("flag-test");
        const loaded = JSON.parse(fs.readFileSync(path.join(signedDir, "flag-test.signedTx.json"), "utf-8"));
        expect(loaded.isSentToChain).to.be.true;
      } finally {
        process.chdir(origCwd);
      }
    });

    it("addFlagForSentSignedTx throws if file missing", () => {
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        expect(() => addFlagForSentSignedTx("nonexistent")).to.throw("does not exist");
      } finally {
        process.chdir(origCwd);
      }
    });

    it("isAlreadySentToChain returns false for missing file", () => {
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        expect(isAlreadySentToChain("nonexistent")).to.be.false;
      } finally {
        process.chdir(origCwd);
      }
    });

    it("isAlreadySentToChain returns false when flag not set", () => {
      const signedDir = path.join(tmpDir, "ForDefiTxnFiles", "SignedTxns");
      fs.mkdirSync(signedDir, { recursive: true });
      fs.writeFileSync(path.join(signedDir, "unflagged.signedTx.json"), JSON.stringify({ signature: "aa" }));
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        expect(isAlreadySentToChain("unflagged")).to.be.false;
      } finally {
        process.chdir(origCwd);
      }
    });

    it("isAlreadySentToChain returns true when flag set", () => {
      const signedDir = path.join(tmpDir, "ForDefiTxnFiles", "SignedTxns");
      fs.mkdirSync(signedDir, { recursive: true });
      fs.writeFileSync(
        path.join(signedDir, "flagged.signedTx.json"),
        JSON.stringify({ signature: "aa", isSentToChain: true })
      );
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        expect(isAlreadySentToChain("flagged")).to.be.true;
      } finally {
        process.chdir(origCwd);
      }
    });

    it("readUnsignedTxJson throws if file missing", () => {
      const origCwd = process.cwd();
      process.chdir(tmpDir);
      try {
        expect(() => readUnsignedTxJson("nonexistent")).to.throw("does not exist");
      } finally {
        process.chdir(origCwd);
      }
    });
  });

  describe("dateToDateTimeLocalString", () => {
    it("returns ISO-like string without trailing Z", () => {
      const date = new Date("2025-06-15T12:30:00Z");
      const result = dateToDateTimeLocalString(date);
      expect(result.endsWith("Z")).to.be.false;
      expect(result).to.include("T");
      expect(result).to.include(":");
    });

    it("contains date and time parts", () => {
      const date = new Date("2025-01-01T00:00:00Z");
      const result = dateToDateTimeLocalString(date);
      expect(result).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("dateToDateTimeString", () => {
    it("returns a non-empty locale string", () => {
      const result = dateToDateTimeString(new Date());
      expect(result).to.be.a("string");
      expect(result.length).to.be.greaterThan(0);
    });
  });

  describe("timestamp", () => {
    it("returns a string with no dashes, colons, or dots", () => {
      const result = timestamp();
      expect(result).to.not.include("-");
      expect(result).to.not.include(":");
      expect(result).to.not.include(".");
    });

    it("contains underscores as separators", () => {
      const result = timestamp();
      expect(result).to.include("_");
    });
  });

  describe("sleepms", () => {
    it("resolves after the specified delay", async () => {
      const start = Date.now();
      await sleepms(50);
      const elapsed = Date.now() - start;
      expect(elapsed).to.be.greaterThanOrEqual(40);
    });
  });

  describe("waitWhile", () => {
    it("resolves immediately when condition is true", async () => {
      const start = Date.now();
      await waitWhile(async () => true, 1000, 10);
      expect(Date.now() - start).to.be.lessThan(100);
    });

    it("times out when condition never becomes true", async () => {
      const start = Date.now();
      await waitWhile(async () => false, 100, 10);
      const elapsed = Date.now() - start;
      expect(elapsed).to.be.greaterThanOrEqual(90);
    });

    it("stops when condition becomes true", async () => {
      let calls = 0;
      await waitWhile(
        async () => {
          calls++;
          return calls >= 3;
        },
        1000,
        10
      );
      expect(calls).to.equal(3);
    });
  });

  describe("edge cases", () => {
    it("toHex handles number array", () => {
      expect(toHex([0xca, 0xfe])).to.equal("0xcafe");
    });

    it("toBuffer handles number array", () => {
      const buf = toBuffer([0xde, 0xad]);
      expect(buf.toString("hex")).to.equal("dead");
    });

    it("flrToGwei handles string input", () => {
      expect(flrToGwei("2.5").toString()).to.equal("2500000000");
    });

    it("gweiToFlr with thousands separator returns formatted string", () => {
      const result = gweiToFlr("1000000000000", true);
      // toLocaleString formatting varies by locale, just verify it returns a non-empty string
      expect(result).to.be.a("string");
      expect(parseFloat(result.replace(/,/g, ""))).to.equal(1000);
    });

    it("gweiToWei handles BN input", () => {
      const result = gweiToWei(new BN(5));
      expect(result.toString()).to.equal("5000000000");
    });

    it("weiToGwei handles BN input", () => {
      const result = weiToGwei(new BN("2000000000"));
      expect(result.toString()).to.equal("2");
    });

    it("weiToGweiCeil handles BN input", () => {
      const result = weiToGweiCeil(new BN("2000000001"));
      expect(result.toString()).to.equal("3");
    });

    it("decimalToInteger with zero offset", () => {
      expect(decimalToInteger("123", 0)).to.equal("123");
    });

    it("integerToDecimal large number", () => {
      expect(integerToDecimal("123456789012345678", 18)).to.equal("0.123456789012345678");
    });

    it("toBN handles BN input", () => {
      const bn = new BN(99);
      expect(toBN(bn)!.toNumber()).to.equal(99);
    });
  });
});
