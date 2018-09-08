const HDWalletProvider = require('truffle-hdwallet-provider')
const wallets = require('./wallets.js')

const ganacheProvider = new HDWalletProvider(wallets.mnemonic, 'http://127.0.0.1:7545', wallets.migrationMaster.index)

module.exports = {
    networks: {
        ganache: {
            provider: ganacheProvider,
            network_id: '*'
        },
        local: {
            host: 'localhost',
            port: 8545,
            network_id: '*',
            from: '0x1b7e768325d828bea37f62fb8b85a2e3369c2606',
            gas: 2500000,
            gasPrice: 1000000000
        }
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
}
