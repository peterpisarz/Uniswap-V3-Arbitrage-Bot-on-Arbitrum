// -- HANDLE INITIAL SETUP -- //
require('./helpers/serverbot.js')
require("dotenv").config();

const IERC20 = require('@openzeppelin/contracts/build/contracts/ERC20.json')
const QuoterV2 = require("@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json")
const uQuoteAddress = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
const sQuoteAddress = '0x0524E833cCD057e4d7A296e3aaAb9f7675964Ce1'

const Big = require('big.js')
const ethers = require("ethers")
const config = require('./config.json')
const { getTokenAndContract, getPairContract, getV3Price, getQuote } = require('./helpers/helpers')
const { provider, uFactory, uRouter, sFactory, sRouter, arbitrage, arbitrageV3 } = require('./helpers/initialization')

let uPair, sPair, amount, uRate, sRate, price, uPrice, sPrice, attempts=0, success=0
let isExecuting = false

// -- .ENV VALUES HERE -- //
const arbFor = process.env.ARB_FOR // This is the address of token we are attempting to arbitrage (WETH)
const arbAgainst = process.env.ARB_AGAINST // token1 address
const units = process.env.UNITS // Used for price display/reporting
const difference = process.env.PRICE_DIFFERENCE
const gasLimit = 1600000 // process.env.GAS_LIMIT
const gasPrice = process.env.GAS_PRICE // Estimated Gas: 0.008453220000006144 ETH + ~10%

const main = async () => {
  if (config.PROJECT_SETTINGS.isLocal) {
    console.log("Running on Localhost")
  } else {
    console.log("Running on Live Net")
  }

  const { token0Contract, token1Contract, token0, token1 } = await getTokenAndContract(arbFor, arbAgainst, provider)
  uPair = await getPairContract(uFactory, token0.address, token1.address, provider)
  sPair = await getPairContract(sFactory, token0.address, token1.address, provider)

  console.log(`Uniswap Address: \t${await uPair.getAddress()}`)
  console.log(`Sushiswap Address: \t${await sPair.getAddress()}\n`)

  // Get the Price on Uniswap
  uPrice = await getV3Price(uFactory, arbFor, arbAgainst, provider)
  console.log(`This is the price on Uniswap: \t${uPrice} ${token1.symbol}/${token0.symbol}`)
  // Get the Price on Sushiswap
  sPrice = await getV3Price(sFactory, arbAgainst, arbFor, provider)
  console.log(`This is the price on Sushiswap: ${sPrice} ${token1.symbol}/${token0.symbol}`)

  // Initial Price difference
  const priceDifference = (uPrice / sPrice * 100) - 100
  console.log(`This is the Price Difference: \t${priceDifference.toFixed(4)}%\n`)

  // Get the Quoter Contract on Sushiswap
  const sQuoter = new ethers.Contract(sQuoteAddress, QuoterV2.abi, provider);
  // Get the Quoter Contract on Uniswap
  const uQuoter = new ethers.Contract(uQuoteAddress, QuoterV2.abi, provider);

  uPair.on('Swap', async () => {
    if (!isExecuting) {
      isExecuting = true
      attempts+=1
      console.log("A Swap Event has occurred on Uniswap. Getting quote...")
      let result = await quoteSwap()
      if (result.profitable) {
        console.log(`Profitable: \t${result.profitable}`)
        console.log(`Ideal Amount In: \t${result.bestAmount}`)
        console.log(`Start on Uni: \t${result.startOnUni}`)
        console.log("Proceeding...")

        // Make signer from Private Key account
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

        // Fetch token balances before
        const tokenBalanceBefore = await token0Contract.balanceOf(signer.address)
        const ethBalanceBefore = await provider.getBalance(signer.address)
        console.log(ethers.formatEther(ethBalanceBefore))

        if (config.PROJECT_SETTINGS.isDeployed) {
          const tx = await arbitrageV3.connect(signer).executeTrade(
            result.startOnUni,
            token0.address,
            token1.address,
            result.bestAmount,
            { gasLimit: gasLimit }
          )

          const receipt = await tx.wait()
          success+=1
          console.log(`type: ${receipt.type} ${(receipt.type == 2) ? console.log("Execute Trade Success") : console.log("Execute trade Failed")}`)
        }
        const tokenBalanceAfter = await token0Contract.balanceOf(signer.address)
        const ethBalanceAfter = await provider.getBalance(signer.address)

        const tokenBalanceDifference = tokenBalanceAfter - tokenBalanceBefore
        const ethBalanceDifference = ethBalanceBefore - ethBalanceAfter

        const data = {
          'ETH Balance Before': ethers.formatUnits(ethBalanceBefore, 'ether'), // should be 0
          'ETH Balance After': ethers.formatUnits(ethBalanceAfter, 'ether'),
          'ETH Spent (gas)': ethers.formatUnits(ethBalanceDifference.toString(), 'ether'),
          '-': {},
          'WETH Balance BEFORE': ethers.formatUnits(tokenBalanceBefore, 'ether'),
          'WETH Balance AFTER': ethers.formatUnits(tokenBalanceAfter, 'ether'),
          'WETH Gained/Lost': ethers.formatUnits(tokenBalanceDifference.toString(), 'ether'),
          '-': {},
          'Total Gained/Lost': `${ethers.formatUnits((tokenBalanceDifference - ethBalanceDifference).toString(), 'ether')} ETH`
        }

        console.table(data)
      }
      isExecuting = false
      console.log(`Is Executing: ${isExecuting} \nAttempts: ${success}/${attempts}\nWaiting for next Swap Event...\n`)
    }
  })

  sPair.on('Swap', async () => {
    if (!isExecuting) {
      isExecuting = true
      attempts+=1
      console.log("A Swap Event has occurred on Uniswap. Getting quote...")
      let result = await quoteSwap()
      if (result.profitable) {
        console.log(`Profitable: \t${result.profitable}`)
        console.log(`Ideal Amount In: \t${result.bestAmount}`)
        console.log(`Start on Uni: \t${result.startOnUni}`)
        console.log("Proceeding...")

        // Make signer from Private Key account
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

        // Fetch token balances before
        const tokenBalanceBefore = await token0Contract.balanceOf(signer.address)
        const ethBalanceBefore = await provider.getBalance(signer.address)

        if (config.PROJECT_SETTINGS.isDeployed) {
          const tx = await arbitrageV3.connect(signer).executeTrade(
            result.startOnUni,
            token0.address,
            token1.address,
            result.bestAmount,
            { gasLimit: gasLimit }
          )

          const receipt = await tx.wait()
          success+=1
          console.log(`type: ${receipt.type} ${(receipt.type == 2) ? console.log("Execute Trade Success") : console.log("Execute trade Failed")}`)
        }
        const tokenBalanceAfter = await token0Contract.balanceOf(signer.address)
        const ethBalanceAfter = await provider.getBalance(signer.address)

        const tokenBalanceDifference = tokenBalanceAfter - tokenBalanceBefore
        const ethBalanceDifference = ethBalanceBefore - ethBalanceAfter

        const data = {
          'ETH Balance Before': ethers.formatUnits(ethBalanceBefore, 'ether'), // should be 0
          'ETH Balance After': ethers.formatUnits(ethBalanceAfter, 'ether'),
          'ETH Spent (gas)': ethers.formatUnits(ethBalanceDifference.toString(), 'ether'),
          '-': {},
          'WETH Balance BEFORE': ethers.formatUnits(tokenBalanceBefore, 'ether'),
          'WETH Balance AFTER': ethers.formatUnits(tokenBalanceAfter, 'ether'),
          'WETH Gained/Lost': ethers.formatUnits(tokenBalanceDifference.toString(), 'ether'),
          '-': {},
          'Total Gained/Lost': `${ethers.formatUnits((tokenBalanceDifference - ethBalanceDifference).toString(), 'ether')} ETH`
        }

        console.table(data)
      }
      isExecuting = false
      console.log(`Is Executing: ${isExecuting} \nAttempts: ${success}/${attempts}\nWaiting for next Swap Event...\n`)
    }
  })

  const quoteSwap = async () => {
    let profit, profitable, amountOut, best = 0, exchangeA, exchangeB, bestAmount = 0

    // Get the Price on Uniswap
    uPrice = await getV3Price(uFactory, arbFor, arbAgainst, provider)
    console.log(`This is the price on Uniswap: \t${uPrice} ${token1.symbol}/${token0.symbol}`)
    // Get the Price on Sushiswap
    sPrice = await getV3Price(sFactory, arbFor, arbAgainst, provider)
    console.log(`This is the price on Sushiswap: ${sPrice} ${token1.symbol}/${token0.symbol}`)
    // Determine the Price difference
    const priceDifference = (uPrice / sPrice * 100) - 100
    console.log(`This is the Price Difference: \t${priceDifference.toFixed(4)}%\n`)

    // Determine which exchange to start on
    if (uPrice >= sPrice) {
      console.log('Buy on Uniswap, Sell on Sushiswap')
      exchangeA = uQuoter
      exchangeB = sQuoter
      startOnUni = true
    } else {
      console.log('Buy on Sushiswap, Sell on Uniswap')
      exchangeA = sQuoter
      exchangeB = uQuoter
      startOnUni = false
    }

    const fee = 3000
    let amountIn = 100000000000000000n

    // Loop through a series of amountIns to find the most profitable
    for (let i=0; i<20; i++) {
      console.log(`----------------------------i=${i} -------- amountIn=${amountIn} (${ethers.formatEther(amountIn)})----------------------------`)
      let quote1 = await getQuote(exchangeA, arbFor, arbAgainst, amountIn, fee)
      let quote2 = await getQuote(exchangeB, arbAgainst, arbFor, quote1.amountOut, fee)
      profit = quote2.amountOut - amountIn
      console.log(`Profit: ${ethers.formatEther(profit)}`)
      if (profit > best) {
        best = profit
        bestAmount = amountIn
        console.log(`New Profit: ${profit} <<<<<<<<<<<<<<<<<<<<<<<<<<<`)
      }
      amountIn+=100000000000000000n
    }
    console.log(`\nBest: ${best}\n`)

    // 
    if (best>0) {
      console.log(`Potential arbitrage profit of ${ethers.formatEther(best)}` +
                  ` available using ${ethers.formatEther(bestAmount)}${token0.symbol}` +
                  ` for a ${priceDifference.toFixed(4)}% price difference. \nProceeding with swap!\n`)
      profitable = true
      return { profitable, bestAmount, startOnUni }
    } else {
      console.log(`Arbitrage quote is not in profit. Cancelling attempt.\n`)
      profitable = false
      return { profitable, bestAmount, startOnUni }
    }
  }
}

main();
