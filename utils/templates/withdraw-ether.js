const fs = require('fs')
const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')

const config = require('../config.js')

const web3 = new Web3(config.network.url)

const contractAbi = JSON.parse(fs.readFileSync('bin/contracts/l2exchange.abi').toString())
const contractAddress = config.contract.address
const gas = 250000
const gasPrice = Web3.utils.toWei('10', 'gwei')

// address - address of withdraw requester
// privateKey - private key of `address`
module.exports = function(address, privateKey) {
    const contract = new web3.eth.Contract(contractAbi, contractAddress)
    const bytecode = contract.methods.withdraw().encodeABI()
    return web3.eth.getTransactionCount(address).then(nonce => {
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
        return web3.eth.sendSignedTransaction('0x' + txSerialized.toString('hex')).then(txHash => {
            console.log(`Withdraw ether is done from ${address} with transaction ${txHash}`)
        }).catch(err => {
            console.log(`Unable to withdraw ether from ${address}: ${err}`)
        })
    })
}
