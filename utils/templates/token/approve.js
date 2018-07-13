const fs = require('fs')
const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')

const config = require('../../config.js')
const wallets = require('../../../wallets.js')

const web3 = new Web3(config.network.url)

const tokenAbi = JSON.parse(fs.readFileSync('bin/contracts/common/TestToken.abi').toString())
const tokenAddress = config.token.address

const spender = config.contract.address

const gas = 250000
const gasPrice = Web3.utils.toWei('10', 'gwei')


// amount - amount of tokens to approve to spend (as string)
// address - address of approve sender
// privateKey - private key of `address`
module.exports = function(amount, address, privateKey) {
    const token = new web3.eth.Contract(tokenAbi, tokenAddress)
    const bytecode = token.methods.approve(spender, amount).encodeABI()
    return web3.eth.getTransactionCount(address).then(nonce => {
        var tx = new ethTx({
            nonce: Web3.utils.toHex(nonce),
            gasPrice: Web3.utils.toHex(gasPrice),
            gasLimit: Web3.utils.toHex(gas),
            to: tokenAddress,
            from: address,
            data: bytecode
        })
        tx.sign(privateKey)
        var txSerialized = tx.serialize()
        return web3.eth.sendSignedTransaction('0x' + txSerialized.toString('hex')).then(txHash => {
            console.log(`Tokens approving to spend is done by ${address} with transaction ${txHash}`)
        }).catch(err => {
            console.log(`Unable to approve to spend tokens by ${address}: ${err}`)
        })
    })
}
