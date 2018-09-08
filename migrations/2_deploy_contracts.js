const fs = require('fs')

const l2dex = artifacts.require('./L2dex.sol')
const token = artifacts.require('./common/TestToken.sol')

const tokens = require('../tokens.js')
const wallets = require('../wallets.js')

var addressL2exchange = null
var addressTokenEOS = null
var addressTokenBNB = null
var addressTokenZIL = null
var addressTokenAION = null
var addressTokenTRX = null
var addressTokenUSDT = null

function saveDeployedAddresses() {
    const fileContent = `module.exports = {
    l2dex: '${addressL2exchange}',
    tokens: {
        EOS: '${addressTokenEOS}',
        BNB: '${addressTokenBNB}',
        ZIL: '${addressTokenZIL}',
        AION: '${addressTokenAION}',
        TRX: '${addressTokenTRX}',
        USDN: '${addressTokenUSDT}'
    }
}`
    fs.writeFileSync('deployed-addresses.js', fileContent)
}

module.exports = function(deployer) {
    const oracle = wallets.userCharlie.address
    return deployer.deploy(l2dex, oracle).then(() => {
        addressL2exchange = l2dex.address
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
        return deployer.deploy(token, tokens.USDT.name, tokens.USDT.symbol, tokens.USDT.decimals)
    }).then(() => {
        addressTokenUSDT = token.address
        saveDeployedAddresses()
    })
}
