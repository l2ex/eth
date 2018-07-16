const fs = require('fs')
const Web3 = require('web3')

const config = require('../config.js')

const web3 = new Web3(config.network.url)

const tokenAbi = JSON.parse(fs.readFileSync('build/contracts/TestToken.json').toString()).abi


// tokenAddress - address of ERC20 token contract
// accountAddress - address of account who holds tokens
module.exports = function(tokenAddress, accountAddress) {
    const token = new web3.eth.Contract(tokenAbi, tokenAddress)
    return token.methods.balanceOf(accountAddress).call()
}
