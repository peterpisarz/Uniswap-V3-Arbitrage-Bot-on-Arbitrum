require("dotenv").config()

const hre = require("hardhat")

// -- IMPORT HELPER FUNCTIONS & CONFIG -- //
const { getTokenAndContract, getPairContract, calculatePrice } = require('../helpers/helpers')
const { provider, uFactory, uRouter, sFactory, sRouter } = require('../helpers/initialization.js')

// -- CONFIGURE VALUES HERE -- //
const V2_FACTORY_TO_USE = uFactory
const V2_ROUTER_TO_USE = uRouter

const UNLOCKED_ACCOUNT = '0x06959153B974D0D5fDfd87D561db6d8d4FA0bb0B' // Account to impersonate
const AMOUNT = '100' // Tokens will automatically be converted to wei

async function main() {
  const routerAddress = await V2_ROUTER_TO_USE.getAddress();
  console.log("V2 Router Address:", routerAddress);
  // Fetch contracts
  const {
    token0Contract,
    token1Contract,
    token0: ARB_AGAINST,
    token1: ARB_FOR
  } = await getTokenAndContract(process.env.ARB_AGAINST, process.env.ARB_FOR, provider)

  const balance = await token0Contract.balanceOf(UNLOCKED_ACCOUNT)
  console.log('Balance of token0: ', balance)
  console.log('Amount  of token0: ', hre.ethers.parseUnits(AMOUNT, 'ether'))

  const pair = await getPairContract(V2_FACTORY_TO_USE, ARB_AGAINST.address, ARB_FOR.address, provider)
  console.log("Pair address: ", pair.target)

  // Fetch price of AAVE/WETH before we execute the swap
  const priceBefore = await calculatePrice(pair)
  console.log("Price before: ", Number(priceBefore))

  await manipulatePrice([ARB_AGAINST, ARB_FOR], token0Contract)

  // Fetch price of SHIB/WETH after the swap
  const priceAfter = await calculatePrice(pair)

  const data = {
    'Price Before': `1 WETH = ${Number(priceBefore)} AAVE`,
    'Price After': `1 WETH = ${Number(priceAfter)} AAVE`,
  }

  console.table(data)
}

async function manipulatePrice(_path, _token0Contract) {
  console.log(`\nBeginning Swap...\n`)

  console.log("token0 Contract: ", await _token0Contract.getAddress())

  console.log(`Input Token: ${_path[0].symbol}`)
  console.log(`Output Token: ${_path[1].symbol}\n`)

  const amount = hre.ethers.parseUnits(AMOUNT, 'ether')
  console.log("Amount: ", amount)
  const path = [_path[0].address, _path[1].address]
  console.log("Path: ", path)
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20 // 20 minutes

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [UNLOCKED_ACCOUNT],
  })

  const signer = await hre.ethers.getSigner(UNLOCKED_ACCOUNT)
  console.log("Signer: ", signer.address)

  const approval = await _token0Contract.connect(signer).approve(await V2_ROUTER_TO_USE.getAddress(), amount, { gasLimit: 100000 })
  await approval.wait()

  const swap = await V2_ROUTER_TO_USE.connect(signer).swapExactTokensForTokens(amount, 0, path, signer.address, deadline, { gasLimit: 125000 })
  await swap.wait()

  console.log(`Swap Complete!\n`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
