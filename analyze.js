// -- HANDLE INITIAL SETUP -- //
require('./helpers/server')
require("dotenv").config();

const fs = require('fs');
const { createCanvas } = require('canvas')
const Chart = require('chart.js/auto')
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

  const increment = Big('10000000000000000000') // 10 WETH
  let input =       Big('1000000000000000000') // 1 WETH

  const routerPath = [uRouter, sRouter]
  const dataPoints = []
  const dataPointsOut = []

  for (let i = 0; i < 100; i++) {

    let result = await routerPath[0].getAmountsIn(input.toString(), [token0.address, token1.address])
    let exact = input.times(uRate)
    let diff = exact.minus(result[0])
    let diffpercentage = (exact.minus(result[0])).div(result[0]).times(100).toFixed(2)
    dataPoints.push({input: input.toString(), diff: diff.toString()})

    let output = await routerPath[1].getAmountsOut(result[1], [token1.address, token0.address])
    let exact2 = Big(result[1]).times(sRate)
    let diff2 = Big(output[1]).minus(exact2)
    let diffpercentage2 = diff2.div(output[1]).times(100).toFixed(2)
    dataPointsOut.push({output: output[1].toString(), diff2: diff2.toString(), exact: exact.toString()})

    // console.log(`input:\t${input} ${token1.symbol}`)
    // console.log(`result:\t${result[0]} ${token0.symbol}`)
    // console.log(`exact:\t${Number(exact).toFixed(0)} ${typeof exact}`)
    // console.log(`diff:\t${diff}`)
    // console.log(`diff%:\t${diffpercentage}%`)

    input = input.plus(increment)
  }
  // Extract input and diff values into separate arrays
  const inputValues = dataPoints.map(point => point.input);
  const diffValues = dataPoints.map(point => point.diff);
  const exactValues = dataPoints.map(point => point.exact);

  const outputValues = dataPointsOut.map(point => point.output)
  const diff2Values = dataPointsOut.map(point => point.diff2)
  console.log(`dataPoints: ${dataPoints}\n`)
  console.log(`inputValues: ${inputValues}\n`)
  console.log(`diffValues: ${diffValues}\n`)
  console.log(`dataPointsOut: ${dataPointsOut}\n`)
  console.log(`outputValues: ${outputValues}\n`)
  console.log(`diff2Values: ${diff2Values}\n`)
  console.log('Visualize Data on:')
  console.log("http://localhost:5001/chart")

  // Start the Express server and pass the data to it
  require('./helpers/server')(inputValues, diffValues, outputValues, diff2Values, exactValues);

}

main()