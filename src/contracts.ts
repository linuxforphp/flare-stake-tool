import { Context } from "./interfaces";
import { pvm } from "@flarenetwork/flarejs";
import * as settings from "./settings";

type DelegationInfo = {
  type: "validator" | "delegator";
  nodeID: string;
  stakeAmount: number;
  startTime: Date;
  endTime: Date;
};

type StakeOwner = {
  locktime: string;
  threshold: string;
  addresses: string[];
};

type StakeAmountFields = {
  stakeAmount?: string;
  weight?: string;
};

type ValidatorData = GetCurrentValidatorsResponseFixed["validators"][number];
type DelegatorData = NonNullable<ValidatorData["delegators"]>[number];

function stakeAmountInFLR(stake: StakeAmountFields): number {
  const amountInNFlr = stake.stakeAmount ?? stake.weight;
  if (amountInNFlr === undefined || amountInNFlr === "") {
    throw new Error("Current validator response is missing stakeAmount/weight");
  }
  if (!/^\d+$/.test(amountInNFlr)) {
    throw new Error(`Current validator response has invalid stake amount: ${amountInNFlr}`);
  }

  const amountInFLR = Number(amountInNFlr) / 1e9;
  if (!Number.isFinite(amountInFLR)) {
    throw new Error(`Current validator response has invalid stake amount: ${amountInNFlr}`);
  }
  return amountInFLR;
}

function getDelegatorRewardOwner(delegator: DelegatorData): StakeOwner | undefined {
  return delegator.rewardOwner ?? delegator.delegationRewardOwner;
}

////////// MIRROR FUND /////////
// fetches current validator info
const fetchValidatorInfo = async (ctx: Context) => {
  const pvmapi = new pvm.PVMApi(settings.URL[ctx.config.hrp]);
  const validator = await pvmapi.getCurrentValidators();
  return validator;
};

// fetches the delegation stake (from both current validator) for the current user
const fetchDelegateStake = async (ctx: Context, validatorFunction: (ctx: Context) => Promise<unknown>) => {
  const validatorsInfo = (await validatorFunction(ctx)) as GetCurrentValidatorsResponseFixed;
  if (!ctx.pAddressBech32) {
    throw new Error("pAddressBech32 is not set in the context");
  }
  return getDelegateStakeFromValidators(validatorsInfo, ctx.pAddressBech32);
};

export function getDelegateStakeFromValidators(
  validatorsInfo: GetCurrentValidatorsResponseFixed,
  pAddressBech32: string
): DelegationInfo[] {
  const userStake: DelegationInfo[] = [];
  for (const validatorData of validatorsInfo.validators) {
    // get validators
    if (validatorData.validationRewardOwner && validatorData.validationRewardOwner.addresses.includes(pAddressBech32)) {
      const startDate = new Date(parseInt(validatorData.startTime, 10) * 1000);
      const endDate = new Date(parseInt(validatorData.endTime, 10) * 1000);
      userStake.push({
        type: "validator",
        nodeID: validatorData.nodeID,
        stakeAmount: stakeAmountInFLR(validatorData),
        startTime: startDate,
        endTime: endDate,
      });
    }

    // get delegators
    for (const delegator of validatorData.delegators ?? []) {
      const rewardOwner = getDelegatorRewardOwner(delegator);
      if (rewardOwner && rewardOwner.addresses.includes(pAddressBech32)) {
        const startDate = new Date(parseInt(delegator.startTime, 10) * 1000);
        const endDate = new Date(parseInt(delegator.endTime, 10) * 1000);
        userStake.push({
          type: "delegator",
          nodeID: validatorData.nodeID,
          stakeAmount: stakeAmountInFLR(delegator),
          startTime: startDate,
          endTime: endDate,
        });
      }
    }
  }
  return userStake;
}

// calculates the total amount of delegation
const getTotalFromDelegation = (data: DelegationInfo[]) => {
  let total = 0;
  for (let i = 0; i < data.length; i++) {
    total += data[i]!.stakeAmount;
  }
  return total;
};

/**
 * @description returns the mirror fund details
 * @param ctx - context
 * @returns - total mirror funds and funds with start and end time
 */
export async function fetchMirrorFunds(ctx: Context) {
  // TODO: split mirrored contract funds from direct P-chain stake.
  const delegationToCurrentValidator = await fetchDelegateStake(ctx, fetchValidatorInfo);
  const totalDelegatedAmount = getTotalFromDelegation(delegationToCurrentValidator);

  const totalInFLR = parseFloat(totalDelegatedAmount.toString());
  return {
    "Total Mirrored Amount": `${totalInFLR} FLR`,
    "Mirror Funds Details": delegationToCurrentValidator,
  };
}

export type GetCurrentValidatorsResponseFixed = {
  validators: {
    accruedDelegateeReward: string;
    txID: string;
    startTime: string;
    endTime: string;
    stakeAmount?: string;
    weight?: string;
    nodeID: string;
    rewardOwner?: StakeOwner;
    validationRewardOwner?: StakeOwner;
    delegationRewardOwner?: StakeOwner;
    delegatorCount: string;
    delegatorWeight: string;
    potentialReward: string;
    delegationFee: string;
    uptime: string;
    connected: boolean;
    delegators: {
      txID: string;
      startTime: string;
      endTime: string;
      stakeAmount?: string;
      weight?: string;
      nodeID: string;
      delegationRewardOwner?: StakeOwner;
      rewardOwner?: StakeOwner;
      potentialReward: string;
    }[];
  }[];
};
