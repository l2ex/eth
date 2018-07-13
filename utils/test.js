const path = require('path')
const fs = require('fs')
const Web3 = require('web3')

const config = require('./config.js')
const wallets = require('../wallets.js')

const tokenMint = require('./templates/token/mint.js')
const tokenApprove = require('./templates/token/approve.js')

const signChannelUpdate = require('./templates/common/sign-channel-update.js')

const depositEther = require('./templates/deposit-ether.js')
const depositToken = require('./templates/deposit-erc20.js')
const withdrawEther = require('./templates/withdraw-ether.js')
const withdrawToken = require('./templates/withdraw-erc20.js')
const updateChannel = require('./templates/update-channel.js')
const updateExtend = require('./templates/extend-channel.js')


function ethers(amount) {
    return Web3.utils.toWei(amount.toString(), 'ether')
}

function tokens(amount) {
    return Web3.utils.toWei(amount.toString(), 'mwei')
}

async function test() {
    //await depositEther(ethers(0.05), wallets.userAlice.address, wallets.userAlice.key)
    //await depositEther(ethers(0.02), wallets.userAlice.address, wallets.userAlice.key)
    await withdrawEther(wallets.userAlice.address, wallets.userAlice.key)
    /*await withdrawEther(wallets.userBob.address, wallets.userBob.key)
    const signature1 = signChannelUpdate(wallets.userAlice.address, 1, ethers(0.055), wallets.userAlice.key)

    // Wrong
    await updateChannel(0, wallets.userAlice.address, 1, ethers(0.056),
        signature1.v, signature1.r, signature1.s,
        wallets.migrationMaster.address, wallets.migrationMaster.key)

    // Wrong
    await updateChannel(0, wallets.userAlice.address, 2, ethers(0.055),
        signature1.v, signature1.r, signature1.s,
        wallets.migrationMaster.address, wallets.migrationMaster.key)

    // Correct
    await updateChannel(0, wallets.userAlice.address, 1, ethers(0.055),
        signature1.v, signature1.r, signature1.s,
        wallets.migrationMaster.address, wallets.migrationMaster.key)*/
}

test()