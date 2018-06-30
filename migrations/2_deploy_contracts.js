const wallets = require('../wallets.js')
const l2dex = artifacts.require("./l2dex.sol")

module.exports = function(deployer) {
    const oracle = wallets.userCharlie.address
    deployer.deploy(l2dex, oracle)
}
