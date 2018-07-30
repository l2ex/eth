const fs = require('fs')
const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')

const web3 = new Web3('http://52.15.129.165:12933')

const l2dexAbi = JSON.parse(fs.readFileSync('build/contracts/l2dex.json').toString()).abi

function test() {
    const l2dex = new web3.eth.Contract(l2dexAbi, '')
    const bytecode = l2dex.methods.applyBalanceChange('0x1B7E768325d828bEa37f62fb8b85a2E3369c2606', '0x1B7E768325d828bEa37f62fb8b85a2E3369c2606', '-100', 0, 0, '0x', '0x').encodeABI()
    console.log(bytecode)
}

test()
