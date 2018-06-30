const HDWalletProvider = require('truffle-hdwallet-provider')
const wallets = require('./wallets.js')

module.exports = {
    networks: {
        ganache: {
            provider: new HDWalletProvider(wallets.mnemonic, 'http://127.0.0.1:7545', wallets.migrationMaster.index),
            network_id: '*'
        }
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
}
