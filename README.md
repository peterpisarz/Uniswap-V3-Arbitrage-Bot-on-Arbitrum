# Uniswap V3 Arbitrage Trading Bot

This trading bot will compare prices between Uniswap V3 and a forked exchange (In this case Sushiswap V3). If it identifies a price discrepancy, it will proceed by buying on one exchange (the lesser price) and selling on the second exchange (the greater price) in order to generate a net gain. Doing this programmatically takes advantage of the arbitrage opportunity which would be difficult if not impossible to achieve by manually swapping tokens on the UX.

I created this bot as an upgrade to a tutorial project which utilized Uniswap V2 and its forked exchanges. V2 is not deployed on layer 2 chains and hence the gas cost made most trades unprofitable. V2 also utilizes constant product formula which results in a diminishing return effect when trying to do large trades using the flashloan.

## Technology Stack & Tools

- Solidity (Writing Smart Contract)
- Javascript (React & Testing)
- [Hardhat](https://hardhat.org/) (Development Framework)
- [Ethers.js](https://docs.ethers.io/v5/) (Blockchain Interaction)
- [Alchemy](https://www.alchemy.com/) (Blockchain Connection)
- [Balancer](https://balancer.fi/) (Flash Loan Provider)

## Requirements For Initial Setup
- Install [NodeJS](https://nodejs.org/en/). Use the latest LTS (Long-Term-Support) version, and preferably installing NodeJS via [NVM](https://github.com/nvm-sh/nvm#intro).
- Create an [Alchemy](https://www.alchemy.com/) account, you'll need to create an app for the Ethereum chain, on the mainnet network

## Setting Up
### 1. Clone/Download the Repository

### 2. Install Dependencies:
`npm install`

### 3. Create and Setup .env
Before running any scripts, you'll want to create a .env file with the following values (see .env.example):

- **ALCHEMY_API_KEY=""**
- **ARB_FOR="0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"** Using WETH on Arbitrum L2
- **ARB_AGAINST="0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE"** Using LINK on Arbitrum L2
- **PRIVATE_KEY=""** (Private key of the account to recieve profit/execute arbitrage contract)
- **PRICE_DIFFERENCE=0.50** (Difference in price between Uniswap & Sushiswap, default is 0.50%)
- **UNITS=0** (Only used for price reporting)
- **GAS_LIMIT=400000** (Currently a hardcoded value, may need to adjust during testing)
- **GAS_PRICE=0.00000006** (60 Gwei, Currently a hardcoded value, may need to adjust during testing)

### 4. Start Hardhat Node:
In your terminal run:
`npx hardhat node`

Once you've started the hardhat node, copy the private key of the first account as you'll need to paste it in your .env file in the next step.

*As a reminder, do **NOT** use or fund the accounts/keys provided by the hardhat node in a real production setting, they are to be only used in your local testing!*

### 5. Add Private Key to .env
Copy the private key of the first account provided from the hardhat node, and paste in the value for the **PRIVATE_KEY** variable in your .env file. If you're running on the mainnet use a Private Key from your preferred wallet, like MetaMask

### 6. Deploy Smart Contract
In a separate terminal run:
`npx hardhat run scripts/deploy.js --network localhost`

Sometimes the deployed address may be different when testing, and therefore you'll need to update the **ARBITRAGE_ADDRESS** inside of the *config.json* 

### 7. Start the Bot
`node v3bot.js`

### 8. Manipulate Price
In another terminal run:
`npx hardhat run scripts/manipulate.js --network localhost`

## About config.json
Inside the *config.json* file, under the PROJECT_SETTINGS object, there are 2 keys that hold a boolean value:
- isLocal
- isDeployed

Both options depend on how you wish to test the bot. If you set isLocal to false, and then run the bot this 
will allow the bot to monitor swap events on the actual mainnet, instead of locally. 

isDeployed's value can be set on whether you wish for the abritrage contract to be called if a potential trade is found. By default isDeployed is
set to true for local testing. Ideally this is helpful if you want to monitor swaps on mainnet and you don't have a contract deployed. 
This will allow you to still experiment with finding potential abitrage opportunites. 

## Testing Bot on Mainnet
For monitoring prices and detecting potential arbitrage opportunities, you do not need to deploy the contract. 

### 1. Edit config.json
Inside the *config.json* file, set **isDeployed** to **false** and **isLocal** to **false**.

### 2. Create and Setup .env
See step #4 in **Setting Up**

### 3. Run the bot
`node bot.js`

Keep in mind you'll need to wait for an actual swap event to be triggered before it checks the price.

## Anatomy of v3bot.js
The bot is essentially composed of 2 functions.
- *main()*
- *quoteSwap()*

The *main()* function monitors swap events from both Uniswap & Sushiswap. 

When a swap event occurs, it calls *quoteSwap()*, this function will get the prices on both exchanges, determine which is higher (to start on) and then determine an amountIn.

Determining an ideal amountIn is crucical to success. If your amountIn is too low, you will not cover the gas cost. If the amountIn is too high, you will run into the diminishing return affect and your trade will not be profitable. Furthermore within this range there is an ideal input which will create the optimal profit. The for loop in the bot drives this process. you can adjust the initial amountIn, increments and number of loop iterations (i) to dial this in properly.

### Modifying & Testing the Scripts
Both the *v3manipulate.js* and *v3bot.js* has been setup to easily make some modifications. Before the main() function in *manipulate.js*, there will be a comment: **// -- CONFIGURE VALUES HERE -- //**. Below that will be some constants you'll be able to modify such as the unlocked account, and the amount of tokens you'll want that account to spent in order to manipulate price (You'll need to adjust this if you are looking to test different pairs).

Without this testing scheme, you would have to wait for an actual swap event to occur on chain. This can be time consuming as swaps can be infrequent and slows testing.

Keep in mind, after running the scripts, specifically *manipulate.js*, you may need to restart your hardhat node, and re-deploy contracts to properly retest. This is because once the blockchain is forked on hardhat node you can easily drain the account you are impersonating. Check the Arb Against value of the unlocked account using arbiscan.io

### Additional Information
The *v3bot.js* script uses helper functions for fetching token pair addresses, calculating price of assets, and calculating estimated returns. These functions can be found in the *helper.js* file inside of the helper folder. Some of these are unused in the v3bot since they only apply to the original bot interacting with Uniswap V2.

The helper folder also has *serverbot.js* which is responsible for spinning up a local server, and *initialization.js* which is responsible for setting up our blockchain connection, configuring Uniswap/Sushiswap contracts, etc. 

There are still a few relics in the code which are leftover from the V2 version. disregard these for the time being and focus on what is required for V3.

### Strategy Overview and Potential Errors
The current strategy implemented is only shown as an example alongside with the *manipulate.js* script. Essentially, after we manipulate price on Uniswap, we look at the reserves on Sushiswap and determine how much of the Arb Against token we need to buy on Uniswap to 'clear' out reserves on Sushiswap. Therefore the arbitrage direction is Uniswap -> Sushiswap. You can swap this by changing 
V3_FACTORY_TO_USE >>> sFactory
V3_ROUTER_TO_USE >>> sRouter
This is important to check the logic on both exchanges.

## Using other EVM chains
If you are looking to test on an EVM compatible chain, you can follow these steps:

### 1. Update .env

- **ARB_FOR=""** 
- **ARB_AGAINST=""**

Token addresses will be different on different chains, you'll want to reference blockchain explorers such as [Polyscan](https://polygonscan.com/) for Polygon for token addresses you want to test.

### 2. Update config.json

- **V2_ROUTER_02_ADDRESS=""** 
- **FACTORY_ADDRESS=""**

You'll want to update the router and factory addresses inside of the *config.json* file with the exchanges you want to use. Based on the exchange you want to use, refer to the documentation for it's address.

### 3. Change RPC URL

Inside of *initialization.js*, you'll want to update the websocket RPC URL. Example of Polygon:
```
provider = new hre.ethers.providers.WebSocketProvider(`wss://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_POLY}`)
```

Inside of *hardhat.config.js*, you'll want to update the forking URL. Example of Polygon:
```
url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_POLY}`,
```

### 4. Changing Arbitrage.sol
You may also need to change the flashloan provider used in the contract to one that is available on your chain of choice. Currently Balancer seems to support the following chains:
- Ethereum Mainnet
- Arbitrum
- Optimism
- Polygon
- Gnosis
- Avalanche
- Goerli (Testnet)
- Sepolia (Testnet)

Be sure to check their documentation for latest updates regarding their contracts and deployment addresses:
- [Balancer Documentation](https://docs.balancer.fi/)
- [Balancer Flash Loans](https://docs.balancer.fi/guides/arbitrageurs/flash-loans.html) 

### Additional Notes

- If testing out the *v3manipulate.js* script, you'll also want to update the **UNLOCKED_ACCOUNT** variable and adjust **AMOUNT** as needed.