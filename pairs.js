// -- HANDLE INITIAL SETUP -- //
require('./helpers/serverbot.js')
require("dotenv").config();

const IERC20 = require('@openzeppelin/contracts/build/contracts/ERC20.json')

const Big = require('big.js')
const ethers = require("ethers")
const config = require('./config.json')
const { getTokenAndContract, getPairContract, getReserves, calculatePrice, calculatePriceInv, entropy, simulate } = require('./helpers/helpers')
const { provider, uFactory, uRouter, sFactory, sRouter, arbitrage } = require('./helpers/initialization')

let uPair, sPair, amount, uRate, sRate
let isExecuting = false

const USDTaddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'

const tokenAddresses = [
  '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  '0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3',
  '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
  '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6']

const pairs = []

const main = async () => {
  if (config.PROJECT_SETTINGS.isLocal) {
    console.log("Running on Localhost")
  } else {
    console.log("Running on Live Net")
  }

  for (let i = 0; i < tokenAddresses.length; i++) {
    for (let j = i + 1; j < tokenAddresses.length; j++) {

      let address1 = tokenAddresses[i]
      let address1Contract = new ethers.Contract(address1, IERC20.abi, provider)
      let symbol1 = await address1Contract.symbol()
      let address2 = tokenAddresses[j]
      let address2Contract = new ethers.Contract(address2, IERC20.abi, provider)
      let symbol2 = await address2Contract.symbol()
      let uResult = await getPairContract(uFactory, address1, address2, provider)
      let uAddress = await uResult.getAddress()
      if (uAddress !== '0x0000000000000000000000000000000000000000') { uReserves = await getReserves(uResult) } else { uReserves = 0 }
      let sResult = await getPairContract(sFactory, address1, address2, provider)
      let sAddress = await sResult.getAddress()
      if (sAddress !== '0x0000000000000000000000000000000000000000') { sReserves = await getReserves(sResult) } else { sReserves = 0 }

      // let uResultUSDT = await getPairContract(uFactory, address1, USDTaddress, provider)
      // console.log(await uResultUSDT.getAddress())
      // let uPrice = await calculatePrice(uResultUSDT)
      // console.log(`uPrice: ${uPrice}`)
      // let sResultUSDT = await getPairContract(sFactory, address1, USDTaddress, provider)
      // let sPrice = await calculatePrice(sResultUSDT)
      // console.log(`sPrice: ${sPrice}`)

      let pair_data = {
        uAddress,
        sAddress,
        symbol1,
        symbol2,
        uReserves,
        sReserves
      }
      if (uAddress !== '0x0000000000000000000000000000000000000000') {
        pairs.push(pair_data)
      }
    }
  }

  // Console log the pairs
  pairs.forEach(pair => {
    console.log(pair);
  })
}

main();
