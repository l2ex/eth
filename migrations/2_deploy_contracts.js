const fs = require('fs')
const tokens = require('../tokens.js')
const wallets = require('../wallets.js')
const l2exchange = artifacts.require("./l2exchange.sol")
const token = artifacts.require("./common/TestToken.sol")

var addressL2exchange = null
var addressTokenEOS = null
var addressTokenBNB = null
var addressTokenZIL = null
var addressTokenAION = null
var addressTokenTRX = null

function saveDeployedAddresses() {
    const fileContent = `module.exports = {
    l2exchange: '${addressL2exchange}',
    tokens: {
        EOS: '${addressTokenEOS}',
        BNB: '${addressTokenBNB}',
        ZIL: '${addressTokenZIL}',
        AION: '${addressTokenAION}',
        TRX: '${addressTokenTRX}'
    }
}`
    fs.writeFileSync('deployed-addresses.js', fileContent)
}

module.exports = function(deployer) {
    const oracle = wallets.userCharlie.address
    return deployer.deploy(l2exchange, oracle).then(() => {
        addressL2exchange = l2exchange.address
        return deployer.deploy(token, tokens.EOS.name, tokens.EOS.symbol, tokens.EOS.decimals)
    }).then(() => {
        addressTokenEOS = token.address
        return deployer.deploy(token, tokens.BNB.name, tokens.BNB.symbol, tokens.BNB.decimals)
    }).then(() => {
        addressTokenBNB = token.address
        return deployer.deploy(token, tokens.ZIL.name, tokens.ZIL.symbol, tokens.ZIL.decimals)
    }).then(() => {
        addressTokenZIL = token.address
        return deployer.deploy(token, tokens.AION.name, tokens.AION.symbol, tokens.AION.decimals)
    }).then(() => {
        addressTokenAION = token.address
        return deployer.deploy(token, tokens.TRX.name, tokens.TRX.symbol, tokens.TRX.decimals)
    }).then(() => {
        addressTokenTRX = token.address
        saveDeployedAddresses()
    })
}
