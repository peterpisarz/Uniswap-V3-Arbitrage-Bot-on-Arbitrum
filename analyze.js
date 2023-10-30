// -- HANDLE INITIAL SETUP -- //
require('./helpers/server')
require("dotenv").config();

const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const Chart = require('chart.js/auto');
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

  const increment = Big('1000000000000000000')
  let input =       Big('1000000000000000000')

  const routerPath = [uRouter, sRouter]
  const dataPoints = []

  for (let i = 0; i < 100; i++) {

    let result = await routerPath[0].getAmountsIn(input.toString(), [token0.address, token1.address])
    let exact = input.times(uRate)
    let diff = exact.minus(result[0])
    let diffpercentage = (exact.minus(result[0])).div(result[0]).times(100).toFixed(2)

    dataPoints.push({input: input.toString(), diff: diff.toString()})

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
  console.log(`dataPoints: ${dataPoints}`)
  console.log(`inputValues: ${inputValues}`)
  console.log(`diffValues: ${diffValues}`)

  const csv = dataPoints.map(point => [point.input, point.diff])
  fs.writeFileSync('data.csv', 'input,diff\n' + csv.map(row => row.join(',')).join('\n'));

  // Create a new canvas
  // const canvas = createCanvas(800, 400);
  // const ctx = canvas.getContext('2d');

  // ctx.fillStyle = 'white';
  // ctx.fillRect(0, 0, canvas.width, canvas.height);

  // // Create a Chart.js chart
  // const chart = new Chart(ctx, {
  //   type: 'line',
  //   data: {
  //     labels: inputValues,  // Use inputValues as X-axis labels
  //     datasets: [
  //       {
  //         label: 'Difference',
  //         data: diffValues,  // Use diffValues as Y-axis data
  //         borderColor: 'rgba(75, 192, 192, 1)',
  //         fill: false,
  //       },
  //     ],
  //   },
  //   options: {
  //     scales: {
  //       x: {
  //         type: 'category',
  //         position: 'bottom',
  //       },
  //       y: {
  //         beginAtZero: true,
  //       },
  //     },
  //   },
  // });

  // // Create an image file
  // const buffer = canvas.toBuffer('image/png');
  // fs.writeFileSync('chart.png', buffer);

}

main()