/*jshint esversion: 6 */

const fs = require('fs')
const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')

const web3 = new Web3('http://localhost:7545')

const contractAbi = JSON.parse(fs.readFileSync('bin/contracts/l2dex.abi').toString())
const contractAddress = '0x0FEFB262Ac12533Baba161B52CCd3c8531f317d2'
const gas = 250000
const gasPrice = Web3.utils.toWei('10', 'gwei')

// channelOwner - address of channel owner (e.g. '0xCE77d3A246E005686628d96D378334aE144C133B')
// token - address of ERC20 token smart contract (e.g. '0x345b76a65F2F7e0989A1599bb6384b08520E515B')
// change - amount of atomic parts of a currency as string (can be negative)
//   (e.g. '1000000000000000000' means 1 ether or 1 token if 18 decimals is used for token)
// nonce - index of transaction inside channel (e.g. 3)
// v - part of signature of a channel update (1 byte number)
// r - part of signature of a channel update (32 bytes as hex string starting from '0x')
// s - part of signature of a channel update (32 bytes as hex string starting from '0x')
// senderNonce - nonce that should be used for the transaction to Ethereum
//   (should be equal to current amount of sent transaction from sender address)
// senderAddress - address of sender of a transaction
// senderPrivateKey - private key of Ethereum wallet that should be used as sender of a transaction
//   (e.g. '890f1d5a94229f7647271f10216f3e5eff8bbced61a528c1af7f3a1d4edb0607')
// returns signed transaction ready to send to Ethereum as hex string starting from '0x'
module.exports = function(channelOwner, token, change, nonce, v, r, s, senderNonce, senderAddress, senderPrivateKey) {
    const contract = new web3.eth.Contract(contractAbi, contractAddress)
    const bytecode = contract.methods.pushOffchainBalanceChange(channelOwner, token, change, nonce, v, r, s).encodeABI()
    var tx = new ethTx({
        nonce: Web3.utils.toHex(senderNonce),
        gasPrice: Web3.utils.toHex(gasPrice),
        gasLimit: Web3.utils.toHex(gas),
        to: contractAddress,
        from: senderAddress,
        data: bytecode
    })
    tx.sign(senderPrivateKey)
    const transactionSigned = tx.serialize()
    return `0x${transactionSigned.toString('hex')}`
}

/*

To request senderNonce use following: 

web3.eth.getTransactionCount(address).then(transactionCount => {
    const senderNonce = transactionCount
})

To send signed transaction to Ethereum use following:

web3.eth.sendSignedTransaction(signedTransaction).then(transactionHash => {
    console.log(`Transaction is send with hash ${transactionHash}`)
}).catch(err => {
    console.log(`Unable to send transaction: ${err}`)
})

*/