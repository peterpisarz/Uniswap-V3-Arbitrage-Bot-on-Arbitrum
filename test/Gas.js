const { ethers } = require("hardhat");
const config = require("../config.json")
require("dotenv").config();

const arbFor = process.env.ARB_FOR // This is the address of token we are attempting to arbitrage (WETH)
const arbAgainst = process.env.ARB_AGAINST // token1 address

describe("Arbitrage Contract", function () {
  it("Should estimate gas for executeTrade", async function () {
    arbitrage = await hre.ethers.deployContract(
      "Arbitrage",
      [
        config.SUSHISWAP.V2_ROUTER_02_ADDRESS,
        config.QUICKSWAP.V2_ROUTER_02_ADDRESS
      ]
    )

    await arbitrage.waitForDeployment()

    // Replace with actual parameters
    const params = {
      startOnUniswap: true,
      token0: arbFor,
      token1: arbAgainst,
      flashAmount: ethers.formatUnits("1", 18),
    };

    const estimatedGas = await arbitrage.estimateGas.executeTrade(
      params.startOnUniswap,
      params.token0,
      params.token1,
      params.flashAmount
    );

    console.log(`Estimated Gas: ${estimatedGas.toString()}`);
  });
});
