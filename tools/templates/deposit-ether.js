const fs = require('fs')
const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')

const config = require('../config.js')

const web3 = new Web3(config.network.url)

const contractAbi = JSON.parse(fs.readFileSync('bin/contracts/l2dex.abi').toString())
const gas = 250000
const gasPrice = Web3.utils.toWei('10', 'gwei')

// contractAddress - address of contract which receives deposit
// address - address of deposit sender
// privateKey - private key of `address`
// amount - amount of ether to deposit in weis (as string)
module.exports = function(contractAddress, address, privateKey, amount) {
    const contract = web3.eth.Contract(contractAbi, contractAddress)
    const bytecode = contract.methods.deposit().encodeABI()
    web3.eth.getTransactionCount(address).then(nonce => {
        var tx = new ethTx({
            nonce: Web3.utils.toHex(nonce),
            gasPrice: Web3.utils.toHex(gasPrice),
            gasLimit: Web3.utils.toHex(gas),
            to: contractAddress,
            from: address,
            value: Web3.utils.fromWei(amount, 'ether'),
            data: bytecode
        })
        tx.sign(privateKey)
        var txSerialized = tx.serialize()
        web3.eth.sendSignedTransaction('0x' + txSerialized.toString('hex')).then(txHash => {
            console.log(`Deposit is done from ${address} with transaction ${txHash}`)
        }).catch(err => {
            console.log(`Unable to deposit from ${address}: ${err}`)
        })
    })
}
