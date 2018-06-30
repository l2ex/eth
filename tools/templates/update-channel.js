const fs = require('fs')
const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')

const config = require('../config.js')

const web3 = new Web3(config.network.url)

const contractAbi = JSON.parse(fs.readFileSync('bin/contracts/l2dex.abi').toString())
const tokenAbi = JSON.parse(fs.readFileSync('bin/contracts/common/TestToken.abi').toString())
const gas = 250000
const gasPrice = Web3.utils.toWei('10', 'gwei')

// contractAddress - address of contract which contains and manages channels
// tokenAddress - address of token contract
// address - address of deposit sender
// privateKey - private key of `address`
// channelOwner - address of channel owner
// channelNonce - nonce inside the channel (should be +1 against current)
// amount - updated amount of currency in weis (as string)
// v, r, s - parts of prepared signature
module.exports = function(contractAddress, tokenAddress, address, privateKey, channelOwner, channelNonce, amount, v, r, s) {
    const contract = web3.eth.Contract(contractAbi, contractAddress)
    const bytecode = contract.methods.updateChannel(channelOwner, channelNonce, tokenAddress, amount, v, r, s).encodeABI()
    web3.eth.getTransactionCount(address).then(nonce => {
        var tx = new ethTx({
            nonce: Web3.utils.toHex(nonce),
            gasPrice: Web3.utils.toHex(gasPrice),
            gasLimit: Web3.utils.toHex(gas),
            to: contractAddress,
            from: address,
            data: bytecode
        })
        tx.sign(privateKey)
        var txSerialized = tx.serialize()
        web3.eth.sendSignedTransaction('0x' + txSerialized.toString('hex')).then(txHash => {
            console.log(`Channel is updated by ${address} with transaction ${txHash}`)
        }).catch(err => {
            console.log(`Unable to update channel by ${address}: ${err}`)
        })
    })
}
