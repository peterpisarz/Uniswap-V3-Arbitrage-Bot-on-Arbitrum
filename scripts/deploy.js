// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat")

const config = require("../config.json")

async function main() {
  const arbitrage = await hre.ethers.deployContract(
    "ArbitrageV3",
    [
      config.SUSHISWAPV3.V3_ROUTER_02_ADDRESS,
      config.UNISWAPV3.V3_ROUTER_02_ADDRESS
    ]
  )

  const tx = await arbitrage.waitForDeployment()

  console.log(`Arbitrage V3 contract deployed to ${await arbitrage.getAddress()} on ${hre.network.name}`)

  console.log(`\nTransaction Receipt:`)
  console.log(tx)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
