const fs = require('fs')
const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')

const web3 = new Web3('http://localhost:8545')

const tokenAbi = JSON.parse(fs.readFileSync('build/contracts/TestToken.json').toString()).abi   

const senderAddress = '0x1B7E768325d828bEa37f62fb8b85a2E3369c2606'
const senderPrivateKey = Buffer.from('2b5687078a8ff254b3a8150a732086b8702a125d6591e56fdb6f9fb6e9ad345d', 'hex')

const gas = 250000
const gasPrice = Web3.utils.toWei('1', 'gwei')

const tokenInfos = [
    { address: '0x8b2a7160bf12560f4e2f059fb40a7351ab5142a4', decimals: 18, symbol: 'EOS' },
    { address: '0xe91ccb7a544c0a7f5fbf5773a9fabdb7dc929e8a', decimals: 18, symbol: 'BNB' },
    { address: '0x6d09959dee8e068dc8bba0906f5c73cf98121849', decimals: 12, symbol: 'ZIL' },
    { address: '0xb2058e1c2a74a405013611176bc046da1702bf92', decimals: 8, symbol: 'AION' },
    { address: '0xebe77c22feee26ce7b4a973cbcb6fbb9257d9f48', decimals: 6, symbol: 'TRX' },
    { address: '0x83364e8745fcb6ff9bd7c866ae56a517a2159930', decimals: 6, symbol: 'USDT' }
]

const receiverAddresses = [
    '0x3e390eB4dbD2788C5e94C75C27D6d8158E325D72',
    '0x327EeF240F01eA25cD339B6937cEDabE6C217e83',
    '0x23E7055Ee3e9D993130FF74F7C6Ec16acc92E5a4',
    '0x119A40BCc0437A44eD39918897570C7E517d1c44',
    '0x005F615A2EA5fe4F50864f12eb16B3Be3d19627d'
]

var lastNonce = 0

function mint(tokenInfo, receiverAddress, amount) {
    const oneToken = Web3.utils.toBN('1'.padEnd(tokenInfo.decimals + 1, '0'))
    const value = amount * oneToken
    const token = new web3.eth.Contract(tokenAbi, tokenInfo.address)
    const bytecode = token.methods.mint(receiverAddress, value.toString()).encodeABI()
    return web3.eth.getTransactionCount(senderAddress).then(nonce => {
        if (nonce > lastNonce) {
            lastNonce = nonce
            const tx = new ethTx({
                nonce: Web3.utils.toHex(nonce),
                gasPrice: Web3.utils.toHex(gasPrice),
                gasLimit: Web3.utils.toHex(gas),
                to: tokenInfo.address,
                from: senderAddress,
                data: bytecode
            })
            tx.sign(senderPrivateKey)
            const txSerialized = tx.serialize()
            console.log(`Minting ${amount} ${tokenInfo.symbol} (${tokenInfo.address}) to account ${receiverAddress}...`)
            return web3.eth.sendSignedTransaction(`0x${txSerialized.toString('hex')}`).then(transactionHash => {
                console.log(`Minted ${amount} ${tokenInfo.symbol} (${tokenInfo.address}) to account ${receiverAddress} with transaction ${transactionHash}`)
            })
        }
    })
}

function mintRandom() {
    const tokenInfo = tokenInfos[Math.round(Math.random() * (tokenInfos.length - 1))]
    const receiverAddress = receiverAddresses[Math.round(Math.random() * (receiverAddresses.length - 1))]
    const amount = 10 + (Math.round(Math.random() * 100000) / 1000)
    return mint(tokenInfo, receiverAddress, amount)
}

function mintRandomRecursive() {
    const delay = Math.round(Math.random() * 30000)
    const promise = mintRandom()
    if (promise) {
        return promise.then(() => {
            return setTimeout(() => {
                return mintRandomRecursive()
            }, delay)
        }).catch(() => {
            return setTimeout(() => {
                return mintRandomRecursive()
            }, delay)
        })
    } else {
        return setTimeout(() => {
            return mintRandomRecursive()
        }, delay)
    }
}

mintRandomRecursive()
