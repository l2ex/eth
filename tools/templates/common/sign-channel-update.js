const Web3 = require('web3')
const secp256k1 = require('secp256k1')
const ethUtil = require('ethereumjs-util')

// channelOwner - address of channel owner (e.g. '0xCE77d3A246E005686628d96D378334aE144C133B')
// nonce - index of transaction inside channel (e.g. 3)
// amount - amount of atomic parts of a currency as string
//   (e.g. '1000000000000000000' means 1 ether or 1 token if 18 decimals is used for token)
// privateKey - private key of Ethereum wallet that should be used as 'author' of signature
//   (e.g. '890f1d5a94229f7647271f10216f3e5eff8bbced61a528c1af7f3a1d4edb0607')
// returns object that contains parts of resulting signature which contains: r, s, v
module.exports = function(channelOwner, nonce, amount, privateKey) {

    channelOwner = channelOwner.toLocaleLowerCase()

    const nonceHex = Web3.utils.toHex(nonce).substr(2).padStart(8, '0')
    const amountHex = Web3.utils.toHex(amount).substr(2).padStart(64, '0')
    //console.log(`Channel owner: ${channelOwner}`)
    //console.log(`Nonce: ${nonce} (0x${nonceHex})`)
    //console.log(`Amount: ${amount} (0x${amountHex})`)

    const message = channelOwner.substr(2) + nonceHex + amountHex
    //console.log(`Message: 0x${message}`)

    const messageHash = ethUtil.sha3(Buffer.from(message, 'hex'))
    //console.log(`Message hash: 0x${messageHash.toString('hex')}`)

    if (typeof(privateKey) === 'string') {
        privateKey = Buffer.from(privateKey, 'hex')
    }

    const signature = secp256k1.sign(messageHash, privateKey)

    return {
        r: '0x' + signature.signature.slice(0, 32).toString('hex'),
        s: '0x' + signature.signature.slice(32, 64).toString('hex'),
        v: signature.recovery + 27
    }
}