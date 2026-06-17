import { expect } from "chai";
import { getDelegateStakeFromValidators, GetCurrentValidatorsResponseFixed } from "../src/contracts";

const targetPAddress = "P-flare1a0urfpade4npyq5qvlcsscfzsqtqhg88ka57cy";
const otherPAddress = "P-flare1fleg9y2jt05vmj96dzwd26qac65v5clhc8kwlt";

function rewardOwner(addresses: string[]) {
  return {
    locktime: "0",
    threshold: "1",
    addresses,
  };
}

function baseValidator(
  overrides: Partial<GetCurrentValidatorsResponseFixed["validators"][number]>
): GetCurrentValidatorsResponseFixed["validators"][number] {
  return {
    accruedDelegateeReward: "0",
    txID: "validator-tx",
    startTime: "1780560068",
    endTime: "1782838800",
    nodeID: "NodeID-validator",
    rewardOwner: rewardOwner([otherPAddress]),
    validationRewardOwner: rewardOwner([otherPAddress]),
    delegationRewardOwner: rewardOwner([otherPAddress]),
    delegatorCount: "0",
    delegatorWeight: "0",
    potentialReward: "0",
    delegationFee: "10.0000",
    uptime: "100.0000",
    connected: true,
    delegators: [],
    ...overrides,
  };
}

describe("contracts mirror funds", () => {
  it("uses weight from current validator and delegator responses", () => {
    const response: GetCurrentValidatorsResponseFixed = {
      validators: [
        baseValidator({
          weight: "8500000000000000",
          validationRewardOwner: rewardOwner([targetPAddress]),
          delegators: [
            {
              txID: "delegator-tx",
              startTime: "1780560068",
              endTime: "1782838800",
              weight: "350000000000000",
              nodeID: "NodeID-validator",
              rewardOwner: rewardOwner([targetPAddress]),
              potentialReward: "0",
            },
          ],
        }),
      ],
    };

    const details = getDelegateStakeFromValidators(response, targetPAddress);

    expect(details).to.have.length(2);
    expect(details[0]).to.include({
      type: "validator",
      nodeID: "NodeID-validator",
      stakeAmount: 8500000,
    });
    expect(details[1]).to.include({
      type: "delegator",
      nodeID: "NodeID-validator",
      stakeAmount: 350000,
    });
  });

  it("uses legacy stakeAmount and delegationRewardOwner fields", () => {
    const response: GetCurrentValidatorsResponseFixed = {
      validators: [
        baseValidator({
          stakeAmount: "8500000000000000",
          delegators: [
            {
              txID: "delegator-tx",
              startTime: "1780560068",
              endTime: "1782838800",
              stakeAmount: "1234000000",
              nodeID: "NodeID-validator",
              delegationRewardOwner: rewardOwner([targetPAddress]),
              potentialReward: "0",
            },
          ],
        }),
      ],
    };

    const details = getDelegateStakeFromValidators(response, targetPAddress);

    expect(details).to.have.length(1);
    expect(details[0]).to.include({
      type: "delegator",
      nodeID: "NodeID-validator",
      stakeAmount: 1.234,
    });
  });

  it("throws instead of returning NaN when a matching stake has no amount field", () => {
    const response: GetCurrentValidatorsResponseFixed = {
      validators: [
        baseValidator({
          delegators: [
            {
              txID: "delegator-tx",
              startTime: "1780560068",
              endTime: "1782838800",
              nodeID: "NodeID-validator",
              rewardOwner: rewardOwner([targetPAddress]),
              potentialReward: "0",
            },
          ],
        }),
      ],
    };

    expect(() => getDelegateStakeFromValidators(response, targetPAddress)).to.throw(
      "Current validator response is missing stakeAmount/weight"
    );
  });
});
