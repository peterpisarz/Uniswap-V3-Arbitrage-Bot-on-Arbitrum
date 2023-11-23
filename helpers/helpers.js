const ethers = require("ethers")
const Big = require('big.js')

const IUniswapV2Pair = require("@uniswap/v2-core/build/IUniswapV2Pair.json")
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

async function getPairAddress(_V2Factory, _token0, _token1) {
    const pairAddress = await _V2Factory.getPair(_token0, _token1)
    return pairAddress
}

async function getPairContract(_V2Factory, _token0, _token1, _provider) {
    const pairAddress = await getPairAddress(_V2Factory, _token0, _token1)
    const pairContract = new ethers.Contract(pairAddress, IUniswapV2Pair.abi, _provider)
    return pairContract
}

async function getReserves(_pairContract) {
    const reserves = await _pairContract.getReserves()
    return [reserves.reserve0, reserves.reserve1]
}

async function calculatePrice(_pairContract) {
    const [x, y] = await getReserves(_pairContract)
    return Big(x).div(Big(y))
}

async function calculatePriceInv(_pairContract) {
    const [x, y] = await getReserves(_pairContract)
    return Big(y).div(Big(x))
}

async function entropy(_reserveIn, _rate, _token0In) {
    const result = new Big(_reserveIn).times(_rate)
    const losses = ethers.formatUnits(result.minus(_token0In).toFixed(0), 'ether')
    return losses
}

async function calculateDifference(_uPrice, _sPrice) {
    return (((_uPrice - _sPrice) / _sPrice) * 100).toFixed(2)
}

async function simulate(amount, _routerPath, _token0, _token1) {
    const trade1 = await _routerPath[0].getAmountsOut(amount, [_token0.address, _token1.address])
    console.log(`simulate trade 1: ${trade1}`)
    const trade2 = await _routerPath[1].getAmountsOut(trade1[1], [_token1.address, _token0.address])
    console.log(`simulate trade 2: ${trade2}`)

    const amountIn = Number(ethers.formatUnits(trade1[0], 'ether'))
    const amountOut = Number(ethers.formatUnits(trade2[1], 'ether'))

    return { amountIn, amountOut }
}

async function simulate2(input, _pairContractA, _pairContractB, percentDiff) {
    const reservesA = await getReserves(_pairContractA)
    const reservesB = await getReserves(_pairContractB)
    console.log(reservesA)
    console.log(reservesB)
    reservesA[1] = reservesA[1] * (100n - percentDiff) / 100n
    console.log(reservesA)
    console.log(reservesB)

    const trade1 = ((BigInt(input) * 997n) * reservesA[0]) / (reservesA[1] * 1000n + (BigInt(input) * 997n))
    const trade2 = ((trade1 * 997n) * reservesB[1]) / (reservesB[0] * 1000n + (trade1 * 997n))    
    console.log(trade1)
    console.log(trade2)

    return trade2

}

async function calculateInputAmount(X_Uniswap, Y_Uniswap) {
    // Using the quadratic formula to solve for A
    X_Uniswap = X_Uniswap * 997
    Y_Uniswap = Y_Uniswap * 1000

    const a = 1.05 * Y_Uniswap;
    const b = -(X_Uniswap + 1.05 * X_Uniswap);
    const c = 0;

    // Calculate the discriminant
    const discriminant = Math.pow(b, 2) - 4 * a * c;

    if (discriminant < 0) {
        // No real roots, meaning no solution in this case
        return "No real solution";
    } else {
        // Calculate the roots
        const root1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        const root2 = (-b - Math.sqrt(discriminant)) / (2 * a);

        // Return the positive root (input amount can't be negative)
        return Math.max(root1, root2);
    }
}

module.exports = {
    getTokenAndContract,
    getPairAddress,
    getPairContract,
    getReserves,
    calculatePrice,
    calculatePriceInv,
    entropy,
    calculateDifference,
    simulate,
    calculateInputAmount,
    simulate2
}