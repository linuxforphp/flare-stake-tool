import * as settings from '../settings'
import * as utils from '../utils'
import { bech32 } from 'bech32'
import { ec } from 'elliptic'
import * as ethutil from 'ethereumjs-util'

const secp256k1 = new ec('secp256k1')

export function compressedPublicKey(publicKey: string): string {
  return _getKeyPair(publicKey).getPublic(true, 'hex')
}

export function uncompressedPublicKey(publicKey: string, prefix: boolean): string {
  return _getKeyPair(publicKey)
    .getPublic(false, 'hex')
    .slice(prefix ? 0 : 2)
}

export function normalizePublicKey(publicKey: string): string {
  return uncompressedPublicKey(publicKey, false)
}

export function equalPublicKey(value1: string, value2: string): boolean {
  try {
    return normalizePublicKey(value1) === normalizePublicKey(value2)
  } catch {
    return false
  }
}

export function isPublicKey(value: string): boolean {
  try {
    _getKeyPair(value)
    return true
  } catch {
    return false
  }
}

export function publicKeyToCAddress(publicKey: string) {
  let uncompressed = utils.toBuffer(uncompressedPublicKey(publicKey, false))
  return normalizeCAddress(utils.toHex(ethutil.publicToAddress(uncompressed)))
}

export function isCAddress(value: string): boolean {
  return ethutil.isValidAddress(value)
}

export function equalCAddress(value1: string, value2: string): boolean {
  return utils.isEqualHex(value1, value2) && isCAddress(value1)
}

export function normalizeCAddress(cAddress: string): string {
  return ethutil.toChecksumAddress(cAddress)
}

export function publicKeyToPAddress(network: string, publicKey: string): string {
  let compressed = utils.toBuffer(compressedPublicKey(publicKey))
  let address = ethutil.ripemd160(ethutil.sha256(compressed), false)
  let hrp = settings.HRP[network]
  return normalizePAddress(network, bech32.encode(hrp, bech32.toWords(address)))
}

export function isPAddress(network: string, value: string): boolean {
  return (value.startsWith('P-') ? value.slice(2) : value).startsWith(settings.HRP[network])
}

export function equalPAddress(network: string, value1: string, value2: string): boolean {
  let value1Hex = utils.isHex(value1) ? value1 : pAddressToHex(value1.startsWith('P-') ? value1.slice(2) : value1)
  let value2Hex = utils.isHex(value2) ? value2 : pAddressToHex(value2.startsWith('P-') ? value2.slice(2) : value2)
  return (
    utils.isEqualHex(value1Hex, value2Hex) &&
    isPAddress(network, pAddressToBech(network, value1Hex))
  )
}

export function pAddressToHex(pAddressBech: string): string {
  return utils.toHex(bech32.fromWords(bech32.decode(pAddressBech).words))
}

export function pAddressToBytes20(pAddress: string) {
  return Buffer.from(bech32.fromWords(bech32.decode(pAddress).words)).toString('hex');
}

export function pAddressToBech(network: string, pAddressHex: string): string {
  let hrp = settings.HRP[network]
  return bech32.encode(hrp, bech32.toWords(utils.toBuffer(pAddressHex)))
}

export function normalizePAddress(network: string, pAddress: string): string {
  if (pAddress.startsWith('P-') || pAddress.startsWith('C-')) {
    pAddress = pAddress.slice(2)
  }
  if (utils.isHex(pAddress)) {
    pAddress = pAddressToBech(network, pAddress)
  }
  return pAddress
}

export function recoverPublicKeyFromMsg(message: string, signature: string): string {
  let msg = utils.toBuffer(message)
  let sig = ethutil.fromRpcSig(utils.toHex(signature))
  return normalizePublicKey(utils.toHex(ethutil.ecrecover(msg, sig.v, sig.r, sig.s)))
}

export function recoverPublicKeyFromEthMsg(message: string, signature: string): string {
  let hashedMsg = getHashedEthMsg(message)
  return recoverPublicKeyFromMsg(hashedMsg, signature)
}

export function getHashedEthMsg(message: string): string {
  return utils.toHex(
    ethutil.keccakFromString(`\x19Ethereum Signed Message:\n${message.length}${message}`)
  )
}

function _getKeyPair(publicKey: string): ec.KeyPair {
  publicKey = utils.toHex(publicKey, false)
  if (publicKey.length == 128) {
    publicKey = '04' + publicKey
  }
  return secp256k1.keyFromPublic(publicKey, 'hex')
}

export function compressPublicKey(publicKey: Uint8Array): Uint8Array {
  // Check if the public key is already compressed
  if (publicKey.length === 33) {
    return publicKey
  }

  // Get the x coordinate
  const x = publicKey.slice(1, 33)

  // Get the y coordinate
  const y = publicKey.slice(33, 65)

  // Determine the parity of the y coordinate
  const prefix = y[y.length - 1] % 2 === 0 ? 0x02 : 0x03

  // Return the compressed public key
  return Buffer.concat([Buffer.from([prefix]), x])
}