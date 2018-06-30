const fs = require('fs')
const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')

const config = require('../../config.js')
const wallets = require('../../../wallets.js')

const web3 = new Web3(config.network.url)

const tokenAbi = JSON.parse(fs.readFileSync('bin/contracts/common/TestToken.abi').toString())
const tokenAddress = config.token.address

const address = wallets.migrationMaster.address
const privateKey = wallets.migrationMaster.key

const gas = 250000
const gasPrice = Web3.utils.toWei('10', 'gwei')


// receiver - address of receiver minted tokens
// amount - amount of tokens to mint (as string)
module.exports = function(receiver, amount) {
    const token = new web3.eth.Contract(tokenAbi, tokenAddress)
    const bytecode = token.methods.mint(receiver, amount).encodeABI()
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
            console.log(`Tokens minting is done to ${receiver} with transaction ${txHash}`)
        }).catch(err => {
            console.log(`Unable to mint tokens to ${receiver}: ${err}`)
        })
    })
}
