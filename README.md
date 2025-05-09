# Hemi Chain Transaction Indexer

A simple utility for indexing and filtering transactions on the Hemi network.

## Features

- Scan specified block ranges for transactions to target contract
- Filter transactions by method signature
- Only include successful transactions (status = 1)
- Export results to JSON file for further analysis

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/IrishLatte19/hemi-trace-indexer.git
   cd hemi-trace-indexer
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

### Configuring the Indexer

Edit the configuration section in `find_user_verify.js`:

```javascript
// Configuration
const rpcUrl = "https://rpc.hemi.network/rpc";
const targetContract = "0x70468f06cf32b776130e2da4c0d7dd08983282ec";
const startBlock = 1743600; // Change these values as needed
const endBlock = 1744310;   // Change these values as needed
const batchSize = 100;      // Number of blocks to process in a batch
```

### Running the Indexer

```
node find_user_verify.js
```

The script will:
1. Find all successful transactions to the target contract with method signature "0xa4760a9e" (userVerify)
2. Process blocks in batches to avoid timeouts
3. Save results to `successful-userverify-transactions.json`

## Output Format

The output JSON file contains:
- Target contract address
- Block range scanned
- Total number of successful transactions
- Transaction details organized by block
- Detailed information for each transaction

## License

MIT 