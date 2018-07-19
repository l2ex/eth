const fs = require('fs')
const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')

const config = require('../config.js')

const web3 = new Web3(config.network.url)

const contractAbi = JSON.parse(fs.readFileSync('bin/contracts/l2dex.abi').toString())
const contractAddress = config.contract.address
const gas = 250000
const gasPrice = Web3.utils.toWei('10', 'gwei')

// tokenAddress - address of deposited ERC20 token contract
// amount - amount of ether to deposit in weis (as string)
// address - address of deposit sender
// privateKey - private key of `address`
module.exports = function(tokenAddress, amount, address, privateKey) {
    const contract = new web3.eth.Contract(contractAbi, contractAddress)
    const bytecode = contract.methods.deposit(tokenAddress, amount).encodeABI()
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
            console.log(`Deposit ERC20 token is done from ${address} with transaction ${txHash}`)
        }).catch(err => {
            console.log(`Unable to deposit ERC20 token from ${address}: ${err}`)
        })
    })
}
