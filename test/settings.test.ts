import { expect } from "chai";
import * as settings from "../src/settings";

const NETWORKS = ["flare", "costwo", "coston", "songbird", "localflare"];

describe("settings", () => {
  const lookups: [string, Record<string, string>][] = [
    ["HRP", settings.HRP],
    ["URL", settings.URL],
    ["RPC", settings.RPC],
    ["INDEXER", settings.INDEXER],
    ["EXPLORER", settings.EXPLORER],
    ["CHAIN_ID", settings.CHAIN_ID],
    ["CHAIN_NAME", settings.CHAIN_NAME],
    ["CURRENCY_SYMBOL", settings.CURRENCY_SYMBOL],
    ["CURRENCY_NAME", settings.CURRENCY_NAME],
    ["PCHAIN_STAKE_MIRROR", settings.PCHAIN_STAKE_MIRROR],
  ];

  for (const [name, lookup] of lookups) {
    it(`${name} has an entry for every network`, () => {
      for (const network of NETWORKS) {
        expect(lookup[network], `${name} missing entry for ${network}`).to.be.a("string");
      }
    });
  }

  it("CHAIN_ID values are valid hex", () => {
    for (const network of NETWORKS) {
      expect(settings.CHAIN_ID[network]).to.match(/^0x[0-9a-f]+$/);
    }
  });

  it("URL values are valid URLs for production networks", () => {
    for (const network of ["flare", "costwo", "coston", "songbird"]) {
      expect(settings.URL[network]).to.match(/^https:\/\//);
    }
  });

  it("HRP matches the network name", () => {
    for (const network of NETWORKS) {
      expect(settings.HRP[network]).to.equal(network);
    }
  });
});
