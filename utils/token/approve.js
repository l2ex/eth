const fs = require('fs')
const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')

const config = require('../config.js')

const web3 = new Web3(config.network.url)

const tokenAbi = JSON.parse(fs.readFileSync('build/contracts/TestToken.json').toString()).abi

const gas = 250000
const gasPrice = Web3.utils.toWei('10', 'gwei')


// tokenAddress - address of ERC20 token contract
// spenderAddress - address of account who receives ability to spend tokens
// amount - amount of tokens to approve to spend (as string)
// senderAddress - address of account who holds tokens that should be approved to spend
// senderPrivateKey - private key of `senderAddress`
module.exports = function(tokenAddress, spenderAddress, amount, senderAddress, senderPrivateKey) {
    const token = new web3.eth.Contract(tokenAbi, tokenAddress)
    const bytecode = token.methods.approve(spenderAddress, amount).encodeABI()
    return web3.eth.getTransactionCount(senderAddress).then(nonce => {
        const tx = new ethTx({
            nonce: Web3.utils.toHex(nonce),
            gasPrice: Web3.utils.toHex(gasPrice),
            gasLimit: Web3.utils.toHex(gas),
            to: tokenAddress,
            from: senderAddress,
            data: bytecode
        })
        tx.sign(senderPrivateKey)
        const txSerialized = tx.serialize()
        return web3.eth.sendSignedTransaction(`0x${txSerialized.toString('hex')}`)
    })
}
