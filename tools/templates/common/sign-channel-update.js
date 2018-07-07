/*jshint esversion: 6 */

const Web3 = require('web3')
const secp256k1 = require('secp256k1')
const ethUtil = require('ethereumjs-util')

// channelOwner - address of channel owner (e.g. '0xCE77d3A246E005686628d96D378334aE144C133B')
// token - address of ERC20 token smart contract (e.g. '0x345b76a65F2F7e0989A1599bb6384b08520E515B')
// change - amount of atomic parts of a currency as string (can be negative)
//   (e.g. '1000000000000000000' means 1 ether or 1 token if 18 decimals is used for token)
// nonce - index of transaction inside channel (e.g. 3)
// privateKey - private key of Ethereum wallet that should be used as 'author' of signature
//   (e.g. '890f1d5a94229f7647271f10216f3e5eff8bbced61a528c1af7f3a1d4edb0607')
// returns object that contains parts of resulting signature which contains: r, s, v
module.exports = function(channelOwner, token, change, nonce, privateKey) {

    channelOwner = channelOwner.toLocaleLowerCase() // looks like unnecessary but just in case
    token = token.toLocaleLowerCase() // looks like unnecessary but just in case
    const changeHex = Web3.utils.toHex(change).substr(2).padStart(64, '0')
    const nonceHex = Web3.utils.toHex(nonce).substr(2).padStart(8, '0')
    //console.log(`Channel owner: ${channelOwner}`)
    //console.log(`Token address: ${token}`)
    //console.log(`Change: ${change} (0x${changeHex})`)
    //console.log(`Nonce: ${nonce} (0x${nonceHex})`)

    // Prepare message by simple concationation arguments as hex strings withous '0x'
    const message = channelOwner.substr(2) + token.substr(2) + changeHex + nonceHex
    //console.log(`Message: 0x${message}`)

    // Calculate SHA3 hash of the message
    // Note that there are several SHA3 algorithms so proper one should be used
    const messageHash = ethUtil.sha3(Buffer.from(message, 'hex'))
    //console.log(`Message hash: 0x${messageHash.toString('hex')}`)

    // Make sure private key is Buffer object (not a string)
    if (typeof(privateKey) === 'string') {
        privateKey = Buffer.from(privateKey, 'hex')
    }

    // Sign SHA3 message hash using private key
    const sigObject = secp256k1.sign(messageHash, privateKey)

    // Return signature as three values: r, s, v
    // These values are enough to 'recover' public key for checking signer address
    return {
        r: '0x' + sigObject.signature.slice(0, 32).toString('hex'),
        s: '0x' + sigObject.signature.slice(32, 64).toString('hex'),
        v: sigObject.recovery + 27
    }
}