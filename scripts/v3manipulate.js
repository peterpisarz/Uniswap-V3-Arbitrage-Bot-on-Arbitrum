require("dotenv").config()

const hre = require("hardhat")
require("@uniswap/v3-periphery/artifacts/contracts/libraries/TransferHelper.sol/TransferHelper.json")

// -- IMPORT HELPER FUNCTIONS & CONFIG -- //
const { getTokenAndContract, getPairContract, calculatePrice, getV3Price } = require('../helpers/helpers')
const { provider, uFactory, uRouter, sFactory, sRouter } = require('../helpers/initialization.js')

// -- CONFIGURE VALUES HERE -- //
const V3_FACTORY_TO_USE = sFactory
const V3_ROUTER_TO_USE = sRouter

const UNLOCKED_ACCOUNT = '0xF977814e90dA44bFA03b6295A0616a897441aceC' // << ARB Arbitrum Account
const AMOUNT = '100000' // Tokens will automatically be converted to wei

// Initialize transfer helper contract
// const transferHelper = new ethers.Contract()

async function main() {
  const routerAddress = await V3_ROUTER_TO_USE.getAddress();

  // Fetch contracts
  const {
    token0Contract,
    token1Contract,
    token0: ARB_AGAINST,
    token1: ARB_FOR
  } = await getTokenAndContract(process.env.ARB_AGAINST, process.env.ARB_FOR, provider)

  const balance = await token0Contract.balanceOf(UNLOCKED_ACCOUNT)
  console.log('Balance of token0:\t', balance)
  console.log('Amount of token0:\t', hre.ethers.parseUnits(AMOUNT, 18))

  const pair = await getPairContract(V3_FACTORY_TO_USE, ARB_AGAINST.address, ARB_FOR.address, provider)
  console.log("\nPair address: ", pair.target)

  // Fetch price before we execute the swap
  const priceBefore = await getV3Price(V3_FACTORY_TO_USE, ARB_FOR.address, ARB_AGAINST.address, provider)

  await manipulatePrice([ARB_AGAINST, ARB_FOR], token0Contract)

  // Fetch price after the swap
  const priceAfter = await getV3Price(V3_FACTORY_TO_USE, ARB_FOR.address, ARB_AGAINST.address, provider)

  const data = {
    'Price Before': `1 WETH = ${Number(priceBefore)} ${ARB_AGAINST.symbol}`,
    'Price After': `1 WETH = ${Number(priceAfter)} ${ARB_AGAINST.symbol}`,
  }

  console.table(data)
}

async function manipulatePrice(_path, _token0Contract) {
  console.log(`\nBeginning Swap...\n`)

  console.log(`Input Token: ${_path[0].symbol}`)
  console.log(`Output Token: ${_path[1].symbol}\n`)

  const amount = hre.ethers.parseUnits(AMOUNT, 18)
  const path = [_path[0].address, _path[1].address]
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [UNLOCKED_ACCOUNT],
  })

  const signer = await hre.ethers.getSigner(UNLOCKED_ACCOUNT)
  console.log("Signer: ", signer.address)

  // Approve the Swap
  const approval = await _token0Contract.connect(signer).approve(V3_ROUTER_TO_USE, amount, { gasLimit: 150000 })
  await approval.wait()

  // Set Parameters for the Swap
  const params = {
    tokenIn: _path[0].address,
    tokenOut: _path[1].address,
    fee: 3000,
    recipient: signer.address,
    deadline: deadline,
    amountIn: amount,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0
  };

  // Execute the Swap
  const amountOut = await V3_ROUTER_TO_USE.connect(signer).exactInputSingle(params);
  const receipt = await amountOut.wait()

  console.log(`Swap Complete!\n`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
