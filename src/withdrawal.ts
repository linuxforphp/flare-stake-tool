import { contextFile } from './constants'
import { Transaction } from "ethers";
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { prefix0x, readSignedWithdrawalTx, readUnsignedWithdrawalTx, sleepms, unPrefix0x, waitFinalize3Factory } from "../src/utils"
import { saveUnsignedWithdrawalTx } from './utils'
import { UnsignedWithdrawalTxJson } from './interfaces';
import { Context } from 'vm';

export async function createWithdrawalTransaction(ctx: Context, toAddress: string, amount: number, id: string, nonce: number): Promise<string> {

    const txNonce = (nonce === undefined) ? await ctx.web3.eth.getTransactionCount(ctx.cAddressHex) : nonce;

    let amountWei = BigInt(amount) * BigInt(10 ** 9) // amount has already 9 zeros

    var rawTx = {
        nonce: txNonce,
        gasPrice: 500000000000,
        gasLimit: 8000000,
        to: toAddress,
        value: amountWei.toString(),
        chainId: ctx.config.networkID
    }

    // serialized unsigned transaction
    const ethersTx = Transaction.from(rawTx)
    let hash = unPrefix0x(ethersTx.unsignedHash);

    const unsignedTx = <UnsignedWithdrawalTxJson> {
        rawTx: rawTx,
        message: hash,
        forDefiHash: Buffer.from(hash, 'hex').toString('base64')
    }

    // save tx data
    saveUnsignedWithdrawalTx(unsignedTx, id);

    return id;
}

export async function sendSignedWithdrawalTransaction(ctx: Context, id: string): Promise<string> {

    const waitFinalize3 = waitFinalize3Factory(ctx.web3);

    // read unsigned tx data
    const unsignedTxJson = readUnsignedWithdrawalTx(id);

    // read signed tx data
    const signedTxJson = readSignedWithdrawalTx(id);

    // read signature
    const signature = signedTxJson.signature;

    // create raw signed tx
    const ethersTx = Transaction.from(unsignedTxJson.rawTx);
    ethersTx.signature = prefix0x(signature);
    const serializedSigned = ethersTx.serialized;

    // send signed tx to the network
    let receipt = await waitFinalize3(ctx.cAddressHex, () => ctx.web3.eth.sendSignedTransaction(serializedSigned));
    return receipt.transactionHash;
}