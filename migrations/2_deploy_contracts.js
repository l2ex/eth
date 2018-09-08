const fs = require('fs')

const L2dex = artifacts.require('./L2dex.sol')
const Token = artifacts.require('./common/Token.sol')

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
    return deployer.deploy(L2dex, oracle).then(() => {
        addressL2exchange = L2dex.address
        return deployer.deploy(Token, tokens.EOS.name, tokens.EOS.symbol, tokens.EOS.decimals)
    }).then(() => {
        addressTokenEOS = Token.address
        return deployer.deploy(Token, tokens.BNB.name, tokens.BNB.symbol, tokens.BNB.decimals)
    }).then(() => {
        addressTokenBNB = Token.address
        return deployer.deploy(Token, tokens.ZIL.name, tokens.ZIL.symbol, tokens.ZIL.decimals)
    }).then(() => {
        addressTokenZIL = Token.address
        return deployer.deploy(Token, tokens.AION.name, tokens.AION.symbol, tokens.AION.decimals)
    }).then(() => {
        addressTokenAION = Token.address
        return deployer.deploy(Token, tokens.TRX.name, tokens.TRX.symbol, tokens.TRX.decimals)
    }).then(() => {
        addressTokenTRX = Token.address
        return deployer.deploy(Token, tokens.USDT.name, tokens.USDT.symbol, tokens.USDT.decimals)
    }).then(() => {
        addressTokenUSDT = Token.address
        saveDeployedAddresses()
    })
}
