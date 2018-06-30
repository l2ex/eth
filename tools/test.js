const path = require('path')
const fs = require('fs')

const config = require('./config.js')
const wallets = require('../wallets.js')
const compileContract = require('./templates/common/compile-contract.js')
const signChannelUpdate = require('./templates/common/sign-channel-update.js')

const depositEther = require('./templates/deposit-ether.js')
const update

function testSignChannelUpdate() {
    const channelOwner = wallets.userAlice.address
    const nonce = 3
    const amount = '1000000000000000000'
    const privateKey = wallets.userAlice.key
    const signature = signChannelUpdate(channelOwner, nonce, amount, privateKey)
    console.log(signature)
}

function testCompileContract() {
    const sourcePath = path.resolve(__dirname, '..', 'contracts', 'l2dex.sol')
    const source = fs.readFileSync(sourcePath, 'utf8')
    const result = compileContract(source)
    console.log(result)
}

function testDepositEther() {
    const contractAddress = config.contract.address
    const address = wallets.userAlice.address
    const privateKey = wallets.userAlice.key
    const amount = Web3.utils.toWei('0.1', 'ether').toString()
    depositEther(contractAddress, address, privateKey, amount)
}

//testCompileContract()
//testSignChannelUpdate()

testDepositEther()