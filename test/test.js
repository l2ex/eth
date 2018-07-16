const Web3 = require('web3')

const tokens = require('../tokens.js')
const wallets = require('../wallets.js')
const deployedAddresses = require('../deployed-addresses.js')

const approve = require('../utils/token/approve.js')
const balanceOf = require('../utils/token/balance-of.js')
const mint = require('../utils/token/mint.js')

contract('Token', (accounts) => {

    it('should mint 100 EOS tokens to Alice', () => {
        const oneToken = Web3.utils.toBN('1'.padEnd(tokens.EOS.decimals + 1, '0'))
        const amount = 100 * oneToken
        return mint(deployedAddresses.tokens.EOS, wallets.userAlice.address, amount.toString()).then(() => {
            return balanceOf(deployedAddresses.tokens.EOS, wallets.userAlice.address).then(balance => {
                assert.equal(balance, amount)
            })
        }).catch(() => {
            assert.fail('cannot mint tokens')
        })
    })
    
})