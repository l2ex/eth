const fs = require('fs')

const L2DexEthereum = artifacts.require('./L2DexEthereum.sol')
const L2DexEthereum = artifacts.require('./L2DexQtum.sol')
const ERC20Token = artifacts.require('./common/ERC20Token.sol')

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
    return deployer.deploy(L2DexEthereum, oracle).then(() => {
        addressL2exchange = L2DexEthereum.address
        return deployer.deploy(ERC20Token, tokens.EOS.name, tokens.EOS.symbol, tokens.EOS.decimals)
    }).then(() => {
        addressTokenEOS = ERC20Token.address
        return deployer.deploy(ERC20Token, tokens.BNB.name, tokens.BNB.symbol, tokens.BNB.decimals)
    }).then(() => {
        addressTokenBNB = ERC20Token.address
        return deployer.deploy(ERC20Token, tokens.ZIL.name, tokens.ZIL.symbol, tokens.ZIL.decimals)
    }).then(() => {
        addressTokenZIL = ERC20Token.address
        return deployer.deploy(ERC20Token, tokens.AION.name, tokens.AION.symbol, tokens.AION.decimals)
    }).then(() => {
        addressTokenAION = ERC20Token.address
        return deployer.deploy(ERC20Token, tokens.TRX.name, tokens.TRX.symbol, tokens.TRX.decimals)
    }).then(() => {
        addressTokenTRX = ERC20Token.address
        return deployer.deploy(ERC20Token, tokens.USDT.name, tokens.USDT.symbol, tokens.USDT.decimals)
    }).then(() => {
        addressTokenUSDT = ERC20Token.address
        saveDeployedAddresses()
    })
}
