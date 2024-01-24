const ethers = require("ethers")
const Big = require('big.js')

const IUniswapV2Pair = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json")
const IERC20 = require('@openzeppelin/contracts/build/contracts/ERC20.json')

async function getTokenAndContract(_token0Address, _token1Address, _provider) {
    const token0Contract = new ethers.Contract(_token0Address, IERC20.abi, _provider)
    const token1Contract = new ethers.Contract(_token1Address, IERC20.abi, _provider)

    const token0 = {
        address: _token0Address,
        decimals: 18,
        symbol: await token0Contract.symbol(),
        name: await token0Contract.name()
    }

    const token1 = {
        address: _token1Address,
        decimals: 18,
        symbol: await token1Contract.symbol(),
        name: await token1Contract.name()
    }

    return { token0Contract, token1Contract, token0, token1 }
}

// v2 getPair >>> v3 getPool adding fee
async function getPairAddress(_V2Factory, _token0, _token1) {
    const pairAddress = await _V2Factory.getPool(_token0, _token1, 3000)
    return pairAddress
}

async function getPairContract(_V2Factory, _token0, _token1, _provider) {
    const pairAddress = await getPairAddress(_V2Factory, _token0, _token1)
    const pairContract = new ethers.Contract(pairAddress, IUniswapV2Pair.abi, _provider)
    return pairContract
}

// New for V3
async function getV3Price(_V2Factory, _token0, _token1, _provider) {
    const poolContract = await getPairContract(_V2Factory, _token0, _token1, _provider)
    const slot0 = await poolContract.slot0()
    const sqrtPriceX96= slot0.sqrtPriceX96
    const price = new Big(sqrtPriceX96.toString()).pow(2).div(new Big(2).pow(192));
    return price
}

// Commented out for V3
// async function calculatePrice(_pairContract) {
//     const [x, y] = await getReserves(_pairContract)
//     return Big(x).div(Big(y))
// }

// async function calculatePriceInv(_pairContract) {
//     const [x, y] = await getReserves(_pairContract)
//     return Big(y).div(Big(x)) // FOR WBTC * 10000000000n conversion i.e. +10 decimals
// }

async function entropy(_reserveIn, _rate, _token0In) {
    const result = new Big(_reserveIn).times(_rate)
    const losses = ethers.formatUnits(result.minus(_token0In).toFixed(0), 'ether')
    return losses
}

async function calculateDifference(_uPrice, _sPrice) {
    return (((_uPrice - _sPrice) / _sPrice) * 100).toFixed(2)
}

// Commented out for V3
// async function simulate(amount, _routerPath, _token0, _token1) {
//     const trade1 = await _routerPath[0].getAmountsOut(amount, [_token0.address, _token1.address])
//     console.log(`simulate trade 1: ${trade1}`)
//     const trade2 = await _routerPath[1].getAmountsOut(trade1[1], [_token1.address, _token0.address])
//     console.log(`simulate trade 2: ${trade2}`)

//     const amountIn = Number(ethers.formatUnits(trade1[0], 'ether'))
//     const amountOut = Number(ethers.formatUnits(trade2[1], 'ether'))

//     return { amountIn, amountOut }
// }

// Commented out for V3
// async function simulate2(input, _pairContractA, _pairContractB, percentDiff) {
//     const reservesA = await getReserves(_pairContractA)
//     const reservesB = await getReserves(_pairContractB)
//     console.log(reservesA)
//     console.log(reservesB)
//     reservesA[1] = reservesA[1] * (100n - percentDiff) / 100n
//     console.log(reservesA)
//     console.log(reservesB)

//     const trade1 = ((BigInt(input) * 997n) * reservesA[0]) / (reservesA[1] * 1000n + (BigInt(input) * 997n))
//     const trade2 = ((trade1 * 997n) * reservesB[1]) / (reservesB[0] * 1000n + (trade1 * 997n))    
//     console.log(trade1)
//     console.log(trade2)

//     return trade2

// }

async function getQuote(_quoterContract, _tokenIn, _tokenOut, _amountIn, _fee) {
    const params = {
        tokenIn: _tokenIn,
        tokenOut: _tokenOut,
        fee: _fee,
        amountIn: _amountIn,
        sqrtPriceLimitX96: 0
    }

    try {
        const result = await _quoterContract.quoteExactInputSingle.staticCall(params);
        // console.log(result)
        // console.log(`Amount Out: \t${ethers.formatEther(result.amountOut)}`)
        // console.log(`Price After: \t${result.sqrtPriceX96After}`)
        // console.log(`Tick After: \t${result.tickAfter}`)
        // console.log(`Gas Estimate: \t${result.gasEstimate}`)
        
        // Destructure the returned values
        const [amountOut, sqrtPriceX96After, tickAfter, gasEstimate] = result;
        return {amountOut, sqrtPriceX96After, tickAfter, gasEstimate}
    } catch (error) {
        console.error('Error getting quote:', error);
        throw error
    }
}

module.exports = {
    getTokenAndContract,
    getPairAddress,
    getPairContract,
    // calculatePrice,
    // calculatePriceInv,
    entropy,
    calculateDifference,
    // simulate,
    // simulate2,
    getV3Price,
    getQuote
}