const fs = require('fs')
const Web3 = require('web3')

const config = require('../config.js')

const web3 = new Web3(config.network.url)

const contractAbi = JSON.parse(fs.readFileSync('bin/contracts/l2dex.abi').toString())
const contractAddress = config.contract.address
const contract = new web3.eth.Contract(contractAbi, contractAddress)

const handler = {

    // channelOwner - address of channel owner starting from '0x'
    // amount - amount of deposited ether in weis as string
    // tx - hash of transaction in Ethereum during which event is happened
    onDepositEther: function(channelOwner, amount, tx) {
        const a = Web3.utils.fromWei(amount, 'ether')
        console.log(`Received deposit ${a} ETH from ${channelOwner} with transaction ${tx}`)
    },

    // channelOwner - address of channel owner starting from '0x'
    // token - address of ERC20 token contract that was deposited
    // amount - amount of deposited tokens in the most lower pierces as string
    //   (e.g. if some USDT has 6 decimals instead of 18 like ether '1000000' means 1 USDT)
    // tx - hash of transaction in Ethereum during which event is happened
    onDepositToken: function(channelOwner, token, amount, tx) {
        // WE ASSUME THAT ONLY TOKEN SUPPORTED NOW IS USDT SO ASSUME IT ALWAYS HAS 6 DECIMALS
        // CHECK TOKEN ADDRESS IN REAL IMPLEMENTATION AND CONVERT AMOUNT CORRECTLY
        const a = Web3.utils.fromWei(amount, 'mwei')
        console.log(`Received deposit ${a} USDT from ${channelOwner} with transaction ${tx}`)
    },

    // channelOwner - address of channel owner starting from '0x'
    // amount - amount of withdrawn ether in weis as string
    // tx - hash of transaction in Ethereum during which event is happened
    onWithdrawEther: function(channelOwner, amount, tx) {
        const a = Web3.utils.fromWei(amount, 'ether')
        console.log(`Withdrawn ${a} ETH to ${channelOwner} with transaction ${tx}`)
    },

    // channelOwner - address of channel owner starting from '0x'
    // token - address of ERC20 token contract that was withdrawn
    // amount - amount of withdrawn tokens in the most lower pierces as string
    //   (e.g. if some USDT has 6 decimals instead of 18 like ether '1000000' means 1 USDT)
    // tx - hash of transaction in Ethereum during which event is happened
    onDepositToken: function(channelOwner, token, amount, tx) {
        // WE ASSUME THAT ONLY TOKEN SUPPORTED NOW IS USDT SO ASSUME IT ALWAYS HAS 6 DECIMALS
        // CHECK TOKEN ADDRESS IN REAL IMPLEMENTATION AND CONVERT AMOUNT CORRECTLY
        const a = Web3.utils.fromWei(amount, 'mwei')
        console.log(`Withdrawn ${a} USDT to ${channelOwner} with transaction ${tx}`)
    },

    // channelOwner - address of channel owner starting from '0x'
    // expiration - timestamp representing date after that channel is 'dead' so can be withdrawn by owner
    // nonce - counter of significant transactions related to the channel
    // token - address of ERC20 token which used in the channel (0 if channel operates ether)
    // amount - current amount of currency in the channel
    // tx - hash of transaction in Ethereum during which event is happened
    onChannelUpdate: function(channelOwner, expiration, nonce, token, amount, tx) {
        const ether = !token || token.length < 4;
        const a = Web3.utils.fromWei(amount, ether ? 'ether' : 'mwei')
        console.log(`Channel ${channelOwner} is updated and expires since ${expiration}. It's balance ${a} ${ether ? 'ETH' : 'USDT'} and it's nonce ${nonce}. Transaction ${tx}`)
    },

    // channelOwner - address of channel owner starting from '0x'
    // expiration - timestamp representing date after that channel is 'dead' so can be withdrawn by owner
    // tx - hash of transaction in Ethereum during which event is happened
    onChannelExtend: function(channelOwner, expiration, tx) {
        console.log(`Channel ${channelOwner} is extended and expires since ${expiration}. Transaction ${tx}`)
    }
}

const MAX_BLOCKS_TO_SCAN = 1
const WAITING_NEW_BLOCK_MS = 1000

var lastScannerBlock = 0

function scanEventsRecursive(fromBlock, handler) {
    return web3.eth.getBlockNumber().then(currentBlock => {
        if (currentBlock > lastScannerBlock) {
            const toBlock = Math.min(fromBlock + MAX_BLOCKS_TO_SCAN, currentBlock)
            //console.log(`Scanning blocks from ${fromBlock} to ${toBlock}...`)
            return contract.getPastEvents('allEvents', { fromBlock: fromBlock, toBlock: toBlock }).then(events => {
                lastScannerBlock = toBlock // TODO ?
                events.forEach(e => {
                    if (e.event === 'Deposit') {
                        if (Web3.utils.toBN(e.returnValues.token) == 0) {
                            handler.onDepositEther(
                                e.returnValues.channelOwner,
                                e.returnValues.amount,
                                e.transactionHash
                            )
                        } else {
                            handler.onDepositToken(
                                e.returnValues.channelOwner,
                                e.returnValues.token,
                                e.returnValues.amount,
                                e.transactionHash
                            )
                        }
                    } else if (e.event === 'Withdraw') {
                        if (Web3.utils.toBN(e.returnValues.token) == 0) {
                            handler.onWithdrawEther(
                                e.returnValues.channelOwner,
                                e.returnValues.amount,
                                e.transactionHash
                            )
                        } else {
                            handler.onWithdrawToken(
                                e.returnValues.channelOwner,
                                e.returnValues.token,
                                e.returnValues.amount,
                                e.transactionHash
                            )
                        }
                    } else if (e.event === 'ChannelUpdate') {
                        const token = Web3.utils.toBN(e.returnValues.token) == 0 ? e.returnValues.token : null
                        handler.onChannelUpdate(
                            e.returnValues.channelOwner,
                            e.returnValues.expiration,
                            e.returnValues.nonce,
                            token,
                            e.returnValues.amount,
                            e.transactionHash
                        )
                    } else if (e.event === 'ChannelExtend') {
                        handler.onChannelExtend(
                            e.returnValues.channelOwner,
                            e.returnValues.expiration,
                            e.transactionHash
                        )
                    }
                })
                return scanEventsRecursive(lastScannerBlock, handler)
            })
        } else {
            //console.log(`Waiting for new blocks...`)
            return setTimeout(() => {
                return scanEventsRecursive(lastScannerBlock, handler)
            }, WAITING_NEW_BLOCK_MS)
        }
    })
}

async function start() {
    await scanEventsRecursive(lastScannerBlock, handler)
}

start()