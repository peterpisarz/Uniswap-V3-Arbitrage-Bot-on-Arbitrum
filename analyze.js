// -- HANDLE INITIAL SETUP -- //
require('./helpers/server')
require("dotenv").config();

const fs = require('fs');
const { createCanvas } = require('canvas')
const Chart = require('chart.js/auto')
const { Big } = require('big.js')
const ethers = require("ethers")
const config = require('./config.json')
const { getTokenAndContract, getPairContract, getReserves, calculatePrice, calculatePriceInv, entropy, simulate, simulate2, calculateInputAmount } = require('./helpers/helpers')
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
  uReserves = await getReserves(uPair)
  sReserves = await getReserves(sPair)

  inputAmount = await calculateInputAmount(Number(uReserves[1]), Number(uReserves[0]))
  console.log(`uReserves: ${uReserves}`)
  console.log(`sReserves: ${sReserves}`)
  console.log(`Ideal Input Amount: ${inputAmount}\n`)

  console.log(`qPair Address: ${await uPair.getAddress()}`)
  console.log(`sPair Address: ${await sPair.getAddress()}\n`)

  uRate = await calculatePriceInv(uPair)
  sRate = await calculatePriceInv(sPair)
  uPrice = await calculatePrice(uPair)
  sPrice = await calculatePrice(sPair)

  console.log(`QuickSwap Rate\t|\t${Number(uRate).toFixed(10)} ${token0.symbol} / 1 ${token1.symbol}`)
  console.log(`SushiSwap Rate\t|\t${Number(sRate).toFixed(10)} ${token0.symbol} / 1 ${token1.symbol}\n`)
  console.log(`QuickSwap Price\t|\t${Number(uPrice).toFixed(10)} ${token1.symbol} / 1 ${token0.symbol}`)
  console.log(`SushiSwap Price\t|\t${Number(sPrice).toFixed(10)} ${token1.symbol} / 1 ${token0.symbol}\n`)
  console.log(`QuickSwap Reserves\t|\t${uReserves} ${token1.symbol},${token0.symbol}`)
  console.log(`SushiSwap Reserves\t|\t${sReserves} ${token0.symbol},${token1.symbol}\n`)

  console.log(`[${token0.address},${token1.address}]`)

  const increment = Big('100000000000000000') // .1 WETH
  let input =       Big('100000000000000000') // .1 WETH

  const routerPath = [uRouter, sRouter]
  const dataPoints = []

  for (let i = 0; i < 10; i++) {

    // uniswap trade
    console.log(i+1)
    let sim = await simulate(input.toString(), routerPath, token0, token1)
    let sim2 = await simulate2(input.toString(), uPair, sPair, 3n)

    // exact conversion
    let exact = input.times(uPrice)
    let result = await routerPath[0].getAmountsIn(input.toString(), [token0.address, token1.address])
    let exact2 = exact.div(sPrice)
    console.log(sim)
    console.log(`simulate exact 1: ${input},${exact.toFixed(0)}`)
    console.log(`simulate exact 2: ${exact.toFixed(0)},${exact2.toFixed(0)}`)
    console.log(`{ amountIn: ${ethers.formatUnits(input.toString(), 'ether')}, amountOut: ${ethers.formatUnits(exact2.toFixed(0), 'ether')} }`)
    console.log(`${sim2 > exact2 ? 'Profit is ' + (sim2 - BigInt(exact2.toFixed(0))) : 'False'}\n`)

    dataPoints.push({input: ethers.formatUnits(input.toString(), 'ether'), 
      exact2: ethers.formatUnits(exact2.toFixed(0), 'ether'), 
      sim: sim.amountOut.toString(),
      sim2: ethers.formatUnits(sim2, 'ether')})

    input = input.plus(increment)
  }
  // Extract input and diff values into separate arrays
  const inputValues = dataPoints.map(point => point.input);
  const exactValues = dataPoints.map(point => point.exact2);
  const simValues = dataPoints.map(point => point.sim)
  const sim2Values= dataPoints.map(point => point.sim2)

  console.log(`inputValues: ${inputValues}\n`)
  console.log(`simValues: ${simValues}\n`)
  console.log(`sim2Values: ${sim2Values}\n`)
  console.log('Visualize Data on:')
  console.log("http://localhost:5001/chart")

  // Start the Express server and pass the data to it
  require('./helpers/server')(inputValues, exactValues, simValues, sim2Values);

}

main()