const Web3 = require('web3')
const secp256k1 = require('secp256k1')
const ethUtil = require('ethereumjs-util')

const Type = {
    MARKET: 0,
    LIMIT: 1
}

const Side = {
    BUY: 0,
    SELL: 1
}

// Returns order as string message in hex format starting from 0x
function packOrder(type, side, price, quantity) {
    
    const typeHex = Web3.utils.toHex(type).substr(2).padStart(2, '0')
    //console.log(`Type: 0x${typeHex}`)

    const sideHex = Web3.utils.toHex(side).substr(2).padStart(2, '0')
    //console.log(`Side: 0x${sideHex}`)

    price = typeof(price) === 'string' ? price : price.toString()
    const priceBN = Web3.utils.toWei(price, 'ether')
    const priceHex = Web3.utils.toHex(priceBN).substr(2).padStart(64, '0')
    //console.log(`Price: 0x${priceHex}`)

    quantity = typeof(quantity) === 'string' ? quantity : quantity.toString()
    const quantityBN = Web3.utils.toWei(quantity, 'ether')
    const quantityHex = Web3.utils.toHex(quantityBN).substr(2).padStart(64, '0')
    //console.log(`Quantity: 0x${quantityHex}`)

    const messageHex = '0x' + typeHex + sideHex + priceHex + quantityHex
    //console.log(`Message: ${messageHex}`)

    return messageHex
}

// Assuming messageHex starts from '0x'
function unpackOrder(messageHex) {

    const typeHex = messageHex.slice(2, 4)
    const sideHex = messageHex.slice(4, 6)
    const priceHex = messageHex.slice(6, 70)
    const quantityHex = messageHex.slice(70, 134)

    return {
        type: parseInt(`0x${typeHex}`, 16),
        side: parseInt(`0x${sideHex}`, 16),
        price: Web3.utils.fromWei(Web3.utils.toBN(`0x${priceHex}`), 'ether'),
        quantity: Web3.utils.fromWei(Web3.utils.toBN(`0x${quantityHex}`), 'ether')
    }
}

function signOrder(type, side, price, quantity, privateKey) {

    const messageHex = packOrder(type, side, price, quantity)

    const messageHashHex = Web3.utils.sha3(messageHex).substr(2)
    const messageHash = Buffer.from(messageHashHex, 'hex')
    //console.log(`Message hash: 0x${messageHashHex.toString('hex')}`)

    if (typeof(privateKey) === 'string') {
        privateKey = Buffer.from(privateKey, 'hex')
    }

    const signature = secp256k1.sign(messageHash, privateKey)
    
    return {
        messageHex: messageHex,
        messageHash: messageHash,
        signature: signature.signature,
        recovery: signature.recovery
    }
}

function verifyOrder(messageHex, messageHash, signature, recovery, address) {

    const order = unpackOrder(messageHex)
    console.log(order)

    const messageHashHexRecovered = Web3.utils.sha3(messageHex).substr(2)
    if (messageHash.toString('hex') != messageHashHexRecovered) {
        return false
    }

    const publicKeyRecovered = secp256k1.recover(messageHash, signature, recovery, false)
    const addressRecovered = `0x${ethUtil.sha3(publicKeyRecovered.slice(1)).slice(-20).toString('hex')}`
    //console.log(`src: ${address}`)
    //console.log(`dst: ${addressRecovered}`)

    return address.toLocaleLowerCase() == addressRecovered.toLocaleLowerCase()
}


const address = '0xCE77d3A246E005686628d96D378334aE144C133B'.toLocaleLowerCase()
const privateKey = '890f1d5a94229f7647271f10216f3e5eff8bbced61a528c1af7f3a1d4edb0607'.toLocaleLowerCase()

const type = Type.MARKET
const side = Side.SELL
const price = 422.16
const quantity = 9.8

const signedOrder = signOrder(Type.MARKET, Side.SELL, 422.16, 9.8, privateKey)
console.log(signedOrder)

const orderVerified = verifyOrder(signedOrder.messageHex, signedOrder.messageHash, signedOrder.signature, signedOrder.recovery, address)
console.log(`Order verified: ${orderVerified}`)
