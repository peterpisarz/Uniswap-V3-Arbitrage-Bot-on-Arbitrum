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

const USDTaddress = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'

const tokenAddresses = [
  '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
  '0x912CE59144191C1204E64559FE8253a0e49E6548',
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1']

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
