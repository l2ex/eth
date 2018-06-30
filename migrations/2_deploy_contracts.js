let l2dex = artifacts.require("./l2dex.sol")

module.exports = function(deployer) {
    deployer.deploy(l2dex)
}
