const hre = require("hardhat")
require("dotenv").config()

const config = require('../config.json')
const IUniswapV3Router02 = require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json')
const IUniswapV3Factory = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json")

let provider

if (config.PROJECT_SETTINGS.isLocal) {
  provider = new hre.ethers.WebSocketProvider(`ws://127.0.0.1:8545/`)
} else {
  provider = new hre.ethers.WebSocketProvider(`wss://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_ARBITRUM}`)
}

// -- SETUP UNISWAP/SUSHISWAP CONTRACTS -- //
const uFactory = new hre.ethers.Contract(config.UNISWAPV3.FACTORY_ADDRESS, IUniswapV3Factory.abi, provider)
const uRouter = new hre.ethers.Contract(config.UNISWAPV3.V3_ROUTER_02_ADDRESS, IUniswapV3Router02.abi, provider)
const sFactory = new hre.ethers.Contract(config.SUSHISWAPV3.FACTORY_ADDRESS, IUniswapV3Factory.abi, provider)
const sRouter = new hre.ethers.Contract(config.SUSHISWAPV3.V3_ROUTER_02_ADDRESS, IUniswapV3Router02.abi, provider)

const IArbitrage = require('../artifacts/contracts/Arbitrage.sol/Arbitrage.json')
const arbitrage = new hre.ethers.Contract(config.PROJECT_SETTINGS.ARBITRAGE_ADDRESS, IArbitrage.abi, provider)

const IArbitrageV3 = require('../artifacts/contracts/ArbitrageV3.sol/ArbitrageV3.json')
const arbitrageV3 = new hre.ethers.Contract(config.PROJECT_SETTINGS.ARBITRAGE_ADDRESS, IArbitrageV3.abi, provider)

module.exports = {
  provider,
  uFactory,
  uRouter,
  sFactory,
  sRouter,
  arbitrage,
  arbitrageV3
}