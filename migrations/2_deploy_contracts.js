const wallets = require('../wallets.js')
const l2exchange = artifacts.require("./l2exchange.sol")
const token = artifacts.require("./common/TestToken.sol")

module.exports = function(deployer) {
    const oracle = wallets.userCharlie.address
    return deployer.deploy(l2exchange, oracle).then(() => {
        return deployer.deploy(token, 'Test Token', 'USDT', 6)
    })
}
