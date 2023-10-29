// -- HANDLE INITIAL SETUP -- //
require('./helpers/server')
require("dotenv").config();

const { Big } = require('big.js')
const ethers = require("ethers")
const config = require('./config.json')
const { getTokenAndContract, getPairContract, getReserves, calculatePrice, calculatePriceInv, entropy, simulate } = require('./helpers/helpers')
const { provider, uFactory, uRouter, sFactory, sRouter, arbitrage } = require('./helpers/initialization')

// -- .ENV VALUES HERE -- //
const arbFor = process.env.ARB_FOR // This is the address of token we are attempting to arbitrage (WETH)
const arbAgainst = process.env.ARB_AGAINST // token1 address
const units = process.env.UNITS // Used for price display/reporting
const difference = process.env.PRICE_DIFFERENCE
const gasLimit = process.env.GAS_LIMIT
const gasPrice = process.env.GAS_PRICE // Estimated Gas: 0.008453220000006144 ETH + ~10%

let uPair, sPair, amount, uRate, sRate
let isExecuting = false

const main = async () => {
  const { token0Contract, token1Contract, token0, token1 } = await getTokenAndContract(arbFor, arbAgainst, provider)
  uPair = await getPairContract(uFactory, token0.address, token1.address, provider)
  sPair = await getPairContract(sFactory, token0.address, token1.address, provider)

  console.log(`qPair Address: ${await uPair.getAddress()}`)
  console.log(`sPair Address: ${await sPair.getAddress()}\n`)

  uRate = await calculatePriceInv(uPair)
  sRate = await calculatePriceInv(sPair)

  console.log(`QuickSwap Rate\t|\t${Number(uRate).toFixed(10)} ${token0.symbol} / 1 ${token1.symbol}`)
  console.log(`SushiSwap Rate\t|\t${Number(sRate).toFixed(10)} ${token0.symbol} / 1 ${token1.symbol}\n`)

  console.log(`[${token0.address},${token1.address}]`)

  const increment = Big('500000000000000000')

  const routerPath = [uRouter, sRouter]

  for (let i = 0; i < 10; i++) {
    let input = '1000000000000000000'

    let result = await routerPath[0].getAmountsIn(input, [token0.address, token1.address])
    let exact = Big(input).times(uRate)
    let diff = exact.minus(result[0])
    let diffpercentage = (exact.minus(result[0])).div(result[0]).times(100).toFixed(2)

    console.log(`input:\t${input} ${token1.symbol}`)
    console.log(`result:\t${result[0]} ${token0.symbol}`)
    console.log(`exact:\t${Number(exact).toFixed(0)} ${typeof exact}`)
    console.log(`diff:\t${diff}`)
    console.log(`diff%:\t${diffpercentage}%`)

    // input = Big(input).plus(increment)
  }
}

main()