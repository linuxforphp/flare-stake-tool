import { expect } from "chai";
import * as network from "../src/constants/network";

const configs: [string, network.NetworkConfig][] = [
  ["flare", network.flare],
  ["costwo", network.costwo],
  ["coston", network.coston],
  ["songbird", network.songbird],
  ["localflare", network.localflare],
  ["local", network.local],
];

describe("constants/network", () => {
  for (const [name, config] of configs) {
    describe(name, () => {
      it("has required fields", () => {
        expect(config.protocol).to.be.a("string");
        expect(config.ip).to.be.a("string");
        expect(config.networkID).to.be.a("number");
        expect(config.hrp).to.be.a("string");
        expect(config.chainID).to.be.a("number");
        expect(config.DurangoTime).to.be.instanceOf(Date);
      });

      it("has valid protocol", () => {
        expect(["http", "https"]).to.include(config.protocol);
      });

      it("has hrp matching the config name", () => {
        expect(config.hrp).to.equal(name);
      });

      it("has positive networkID", () => {
        expect(config.networkID).to.be.greaterThan(0);
      });

      it("has positive chainID", () => {
        expect(config.chainID).to.be.greaterThan(0);
      });

      it("DurangoTime is a valid date", () => {
        expect(config.DurangoTime.getTime()).to.not.be.NaN;
      });
    });
  }

  it("production networks use https", () => {
    expect(network.flare.protocol).to.equal("https");
    expect(network.costwo.protocol).to.equal("https");
    expect(network.coston.protocol).to.equal("https");
    expect(network.songbird.protocol).to.equal("https");
  });

  it("local networks use http", () => {
    expect(network.localflare.protocol).to.equal("http");
    expect(network.local.protocol).to.equal("http");
  });

  it("local networks have port defined", () => {
    expect(network.localflare.port).to.equal(9650);
    expect(network.local.port).to.equal(9650);
  });

  it("all configs have unique networkIDs", () => {
    const ids = configs.map(([, c]) => c.networkID);
    expect(new Set(ids).size).to.equal(ids.length);
  });
});
