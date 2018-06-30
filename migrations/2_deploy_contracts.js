const wallets = require('../wallets.js')
const l2dex = artifacts.require("./l2dex.sol")
const token = artifacts.require("./common/TestToken.sol")

module.exports = function(deployer) {
    const oracle = wallets.userCharlie.address
    return deployer.deploy(l2dex, oracle).then(() => {
        return deployer.deploy(token, 'Test Token', 'USDT', 6)
    })
}
