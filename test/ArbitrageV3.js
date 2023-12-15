const { expect } = require("chai")

const config = require("../config.json")

describe("ArbitrageV3", () => {
  let owner, arbitrage, signer
  const arbFor = process.env.ARB_FOR // This is the address of token we are attempting to arbitrage (WETH)
  const arbAgainst = process.env.ARB_AGAINST // token1 address

  beforeEach(async () => {
    [owner, signer] = await ethers.getSigners()

    arbitrage = await hre.ethers.deployContract(
      "ArbitrageV3",
      [
        config.SUSHISWAPV3.V3_ROUTER_02_ADDRESS,
        config.UNISWAPV3.V3_ROUTER_02_ADDRESS
      ]
    )

    await arbitrage.waitForDeployment()
  })

  describe("Deployment", () => {
    it("Sets the sRouter", async () => {
      expect(await arbitrage.sRouter()).to.equal(config.SUSHISWAPV3.V3_ROUTER_02_ADDRESS)
    })

    it("Sets the uRouter", async () => {
      expect(await arbitrage.uRouter()).to.equal(config.UNISWAPV3.V3_ROUTER_02_ADDRESS)
    })

    it("Sets the owner", async () => {
      expect(await arbitrage.owner()).to.equal(await owner.getAddress())
    })
  })

  describe("Estimate Gas", async () => {
    const params = {
      startOnUniswap: true,
      token0: arbFor,
      token1: arbAgainst,
      flashAmount: ethers.formatUnits("1", 18),
    };

    const estimatedGas = await arbitrage.connect(signer).estimateGas.executeTrade(
      params.startOnUniswap,
      params.token0,
      params.token1,
      params.flashAmount
    );

    console.log(`Estimated Gas: ${estimatedGas.toString()}`);
  })

  describe("Trading", () => {

    /**
     * Feel Free to customize and add in your own unit testing here.
     */

  })

})
