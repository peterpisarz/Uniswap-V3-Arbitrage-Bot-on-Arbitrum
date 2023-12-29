// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.18;

import "@balancer-labs/v2-interfaces/contracts/vault/IVault.sol";
import "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";
// import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
// Add new v3 SwapRouter and Transfer Helper
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol'; // modified IERC20 import as IERC20Uniswap

// Change contract name from Arbitrage to ArbitrageV3
contract ArbitrageV3 is IFlashLoanRecipient {
    IVault private constant vault =
        IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);

    // Adding ISwapRouter for V3 initialization
    // IUniswapV2Router02 public immutable sRouter;
    // IUniswapV2Router02 public immutable uRouter;
    ISwapRouter public immutable sRouter;
    ISwapRouter public immutable uRouter;
    address public owner;
    // Add fee tier
    uint24 public constant feeTier = 3000;

    constructor(address _sRouter, address _uRouter) {
        //Initializing V3 ISwap Router in the constructor
        // sRouter = IUniswapV2Router02(_sRouter); // Sushiswap
        // uRouter = IUniswapV2Router02(_uRouter); // Uniswap
        sRouter = ISwapRouter(_sRouter); // Sushiswap
        uRouter = ISwapRouter(_uRouter); // Uniswap
        owner = msg.sender;
    }

    function executeTrade(
        bool _startOnUniswap,
        address _token0,
        address _token1,
        uint256 _flashAmount
    ) external {
        bytes memory data = abi.encode(_startOnUniswap, _token0, _token1);

        // Token to flash loan, by default we are flash loaning 1 token.
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = IERC20(_token0);

        // Flash loan amount.
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = _flashAmount;

        vault.flashLoan(this, tokens, amounts, data);
    }

    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        require(msg.sender == address(vault));

        uint256 flashAmount = amounts[0];

        (bool startOnUniswap, address token0, address token1) = abi.decode(
            userData,
            (bool, address, address)
        );

        // Use the money here!
        address[] memory path = new address[](2);

        path[0] = token0;
        path[1] = token1;

        if (startOnUniswap) {
            _swapOnUniswap(path, flashAmount, 0);

            path[0] = token1;
            path[1] = token0;

            _swapOnSushiswap(
                path,
                IERC20(token1).balanceOf(address(this)),
                flashAmount
            );
        } else {
            _swapOnSushiswap(path, flashAmount, 0);

            path[0] = token1;
            path[1] = token0;

            _swapOnUniswap(
                path,
                IERC20(token1).balanceOf(address(this)),
                flashAmount
            );
        }

        IERC20(token0).transfer(address(vault), flashAmount);

        IERC20(token0).transfer(owner, IERC20(token0).balanceOf(address(this)));
    }

    // -- INTERNAL FUNCTIONS -- //

    function _swapOnUniswap(
        address[] memory _path,
        uint256 _amountIn,
        uint256 _amountOut
    ) internal {
        TransferHelper.safeApprove(_path[0], address(uRouter), _amountIn);

        uint160 priceLimit = 0;

        ISwapRouter.ExactInputSingleParams memory params =
         ISwapRouter.ExactInputSingleParams({
            tokenIn: _path[0],
            tokenOut: _path[1],
            fee: feeTier,
            recipient: address(this),
            deadline: (block.timestamp + 1200),
            amountIn: _amountIn,
            amountOutMinimum: _amountOut,
            sqrtPriceLimitX96: priceLimit
        });
        uRouter.exactInputSingle(params);
    }

    function _swapOnSushiswap(
        address[] memory _path,
        uint256 _amountIn,
        uint256 _amountOut
    ) internal {
        TransferHelper.safeApprove(_path[0], address(sRouter), _amountIn);

        uint160 priceLimit = 0;

        ISwapRouter.ExactInputSingleParams memory params =
         ISwapRouter.ExactInputSingleParams({
            tokenIn: _path[0],
            tokenOut: _path[1],
            fee: feeTier,
            recipient: address(this),
            deadline: (block.timestamp + 1200),
            amountIn: _amountIn,
            amountOutMinimum: _amountOut,
            sqrtPriceLimitX96: priceLimit
        });
        sRouter.exactInputSingle(params);
    }
}