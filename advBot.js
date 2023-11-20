// -- HANDLE INITIAL SETUP -- //
require('./helpers/serverbot.js')
require("dotenv").config();

const Big = require('big.js')
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
  if (config.PROJECT_SETTINGS.isLocal) {
    console.log("Running on Localhost")
  } else {
    console.log("Running on Live Net")
  }
  const { token0Contract, token1Contract, token0, token1 } = await getTokenAndContract(arbFor, arbAgainst, provider)
  uPair = await getPairContract(uFactory, token0.address, token1.address, provider)
  sPair = await getPairContract(sFactory, token0.address, token1.address, provider)

  console.log(`qPair Address: ${await uPair.getAddress()}`)
  console.log(`sPair Address: ${await sPair.getAddress()}\n`)

  console.log(`QuickSwap Rate\t|\t${Number(uRate).toFixed(3)} ${token0.symbol} / 1 ${token1.symbol}`)
  console.log(`SushiSwap Rate\t|\t${Number(sRate).toFixed(3)} ${token0.symbol} / 1 ${token1.symbol}\n`)

  const routerPath = [uRouter, sRouter]

  const isProfitable = await determineProfitability(routerPath, token0Contract, token0, token1)

}

const checkPrice = async (_exchange, _token0, _token1) => {
  isExecuting = true

  console.log(`Swap Initiated on ${_exchange}, Checking Price...\n`)

  const currentBlock = await provider.getBlockNumber()

  const uPrice = await calculatePrice(uPair)
  const sPrice = await calculatePrice(sPair)

  const uFPrice = Number(uPrice).toFixed(units)
  const sFPrice = Number(sPrice).toFixed(units)
  const priceDifference = (((uFPrice - sFPrice) / sFPrice) * 100).toFixed(2)

  console.log(`Current Block: ${currentBlock}`)
  console.log(`-----------------------------------------`)
  console.log(`QUICKSWAP   | ${_token1.symbol}/${_token0.symbol}\t | ${uFPrice}`)
  console.log(`SUSHISWAP | ${_token1.symbol}/${_token0.symbol}\t | ${sFPrice}\n`)
  console.log(`Percentage Difference: ${priceDifference}%\n`)

  return priceDifference
}

const determineDirection = async (_priceDifference) => {
  console.log(`Determining Direction...\n`)

  if (_priceDifference >= difference) {

    console.log(`Potential Arbitrage Direction:\n`)
    console.log(`Buy\t -->\t Uniswap`)
    console.log(`Sell\t -->\t Sushiswap\n`)
    return [uRouter, sRouter]

  } else if (_priceDifference <= -(difference)) {

    console.log(`Potential Arbitrage Direction:\n`)
    console.log(`Buy\t -->\t Sushiswap`)
    console.log(`Sell\t -->\t Uniswap\n`)
    return [sRouter, uRouter]

  } else {
    return null
  }
}

const determineProfitability = async (_routerPath, _token0Contract, _token0, _token1) => {
  console.log(`Determining Profitability...\n\n`)

  // This is where you can customize your conditions on whether a profitable trade is possible...

  let reserves, exchangeToBuy, exchangeToSell
  let sReserves, uReserves

  if (await _routerPath[0].getAddress() == await uRouter.getAddress()) {
    reserves = await getReserves(sPair)
    exchangeToBuy = 'Quickswap'
    exchangeToSell = 'Sushiswap'
  } else {
    reserves = await getReserves(uPair)
    exchangeToBuy = 'Sushiswap'
    exchangeToSell = 'Quickswap'
  }

  sReserves = await getReserves(sPair)
  uReserves = await getReserves(uPair)

  console.log(`${await uPair.getAddress()} ${uReserves}`) // [LINK, WETH]
  console.log(`${await sPair.getAddress()} ${sReserves}`) // [LINK, WETH]

  let b, c, exact, profitable
  let priceDiff = 100n
  const a = 1000000000000000000n
  const gas = 20000000000000000n

  for (let i = 0; i < 10; i++) {

    exact = a * uReserves[0]/uReserves[1]
    b = a * 997n * uReserves[0]/((uReserves[1]*1000n) + (a * 997n))

    exact2 = exact * sReserves[1]/sReserves[0]
    c = b * 997n * sReserves[1]/((sReserves[0]*1000n) + (b * 997n)) * priceDiff/100n

    console.log(`Price Difference ${(priceDiff-100n)}%`)
    console.log(`B: \t\t${ethers.formatUnits(b, 'ether')}`)
    console.log(`Exact: \t\t${ethers.formatUnits(exact, 'ether')}`)
    console.log(`C: \t\t${ethers.formatUnits(c, 'ether')}`)
    console.log(`Exact2: \t${ethers.formatUnits(exact2, 'ether')}`)

    profitable = c-a-gas

    if (profitable > 0){
      console.log(`Profitable: \t${ethers.formatUnits(profitable)}\n`)
    } else {
      console.log(`Not Profitable: \t${ethers.formatUnits(profitable)}\n`)
    }

    priceDiff +=1n
  }

  console.log(`Reserves on ${exchangeToSell} ${exchangeToSell === 'Quickswap' ? await uPair.getAddress() : await sPair.getAddress()}`)
  console.log(`${_token1.symbol}: ${Number(ethers.formatUnits(reserves[0].toString(), 'ether')).toFixed(4)}`)
  console.log(`${_token0.symbol}: ${ethers.formatUnits(reserves[1].toString(), 'ether')}\n`)

}

const executeTrade = async (_routerPath, _token0Contract, _token1Contract) => {
  console.log(`Attempting Arbitrage...\n`)

  let startOnUniswap

  if (await _routerPath[0].getAddress() == await uRouter.getAddress()) {
    startOnUniswap = true
  } else {
    startOnUniswap = false
  }

  // Create Signer
  const account = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

  // Fetch token balances before
  const tokenBalanceBefore = await _token0Contract.balanceOf(account.address)
  const ethBalanceBefore = await provider.getBalance(account.address)

  if (config.PROJECT_SETTINGS.isDeployed) {
    const transaction = await arbitrage.connect(account).executeTrade(
      startOnUniswap,
      await _token0Contract.getAddress(),
      await _token1Contract.getAddress(),
      amount,
      { gasLimit: process.env.GAS_LIMIT }
    )

    const receipt = await transaction.wait()
  }

  console.log(`Trade Complete:\n`)

  // Fetch token balances after
  const tokenBalanceAfter = await _token0Contract.balanceOf(account.address)
  const ethBalanceAfter = await provider.getBalance(account.address)

  const tokenBalanceDifference = tokenBalanceAfter - tokenBalanceBefore
  const ethBalanceDifference = ethBalanceBefore - ethBalanceAfter

  const data = {
    'MATIC Balance Before': ethers.formatUnits(ethBalanceBefore, 'ether'), // should be 0
    'MATIC Balance After': ethers.formatUnits(ethBalanceAfter, 'ether'),
    'MATIC Spent (gas)': ethers.formatUnits(ethBalanceDifference.toString(), 'ether'),
    '-': {},
    'WETH Balance BEFORE': ethers.formatUnits(tokenBalanceBefore, 'ether'),
    'WETH Balance AFTER': ethers.formatUnits(tokenBalanceAfter, 'ether'),
    'WETH Gained/Lost': ethers.formatUnits(tokenBalanceDifference.toString(), 'ether'),
    '-': {},
    'Total Gained/Lost': `${ethers.formatUnits((tokenBalanceDifference - ethBalanceDifference).toString(), 'ether')} ETH`
  }

  console.table(data)
}

main()