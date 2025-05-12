const ethers = require('ethers');
const fs = require('fs');

// Configuration
const rpcUrl = "https://rpc.hemi.network/rpc";
const targetContract = "0x70468f06cf32b776130e2da4c0d7dd08983282ec";
const startBlock = 1272611; // Change these values as needed
const endBlock = 1765629;   // Change these values as needed
const batchSize = 100;      // Number of blocks to process in a batch

// Initialize provider
const provider = new ethers.JsonRpcProvider(rpcUrl);

async function getDetailedTransactions() {
    try {
        console.log(`Finding successful transactions with methodSignature "0xa4760a9e" to contract ${targetContract}`);
        console.log(`Block range: ${startBlock} to ${endBlock}`);

        let totalTransactions = 0;
        let results = {};
        let txDetails = [];

        // Process in batches to avoid timeout
        for (let currentBlock = startBlock; currentBlock <= endBlock; currentBlock += batchSize) {
            const batchEnd = Math.min(currentBlock + batchSize - 1, endBlock);
            console.log(`Processing blocks ${currentBlock} to ${batchEnd}...`);

            // Process each block in the batch
            for (let blockNum = currentBlock; blockNum <= batchEnd; blockNum++) {
                try {
                    const block = await provider.getBlock(blockNum, true);
                    
                    if (!block) {
                        console.log(`Block ${blockNum} not found`);
                        continue;
                    }

                    // Check each transaction in the block
                    let blockTxCount = 0;
                    let blockTxHashes = [];
                    
                    for (const txHash of block.transactions) {
                        const tx = await provider.getTransaction(txHash);
                        
                        // Check if transaction is to our target contract
                        if (tx && tx.to && tx.to.toLowerCase() === targetContract.toLowerCase()) {
                            // Extract method signature from input data
                            const methodSignature = tx.data.slice(0, 10);
                            
                            // Skip if not the target method signature
                            if (methodSignature !== '0xa4760a9e') {
                                continue;
                            }
                            
                            // Get transaction receipt to check status
                            const receipt = await provider.getTransactionReceipt(tx.hash);
                            
                            // Only process successful transactions (status = 1)
                            if (receipt && receipt.status === 1) {
                                blockTxCount++;
                                totalTransactions++;
                                
                                // Store transaction details
                                const txDetail = {
                                    blockNumber: blockNum,
                                    hash: tx.hash,
                                    from: tx.from,
                                    to: tx.to,
                                    timestamp: block.timestamp,
                                    methodSignature: methodSignature,
                                    methodName: 'userVerify',
                                    status: "success",
                                    // Format timestamp as readable date
                                    date: new Date(block.timestamp * 1000).toISOString()
                                };
                                
                                blockTxHashes.push(tx.hash);
                                txDetails.push(txDetail);
                                
                                console.log(`Found successful userVerify transaction ${tx.hash} in block ${blockNum}`);
                            } else {
                                console.log(`Skipping failed userVerify transaction ${tx.hash} in block ${blockNum}`);
                            }
                        }
                    }

                    if (blockTxCount > 0) {
                        results[blockNum] = blockTxHashes;
                        console.log(`Block ${blockNum}: ${blockTxCount} successful userVerify transactions`);
                    }
                } catch (blockError) {
                    console.error(`Error processing block ${blockNum}: ${blockError.message}`);
                }
            }

            console.log(`Completed batch. Current total: ${totalTransactions} successful userVerify transactions found`);
        }

        // Save results to file
        const outputData = {
            targetContract,
            startBlock,
            endBlock,
            totalSuccessfulTransactions: totalTransactions,
            transactionsByBlock: results,
            transactions: txDetails
        };

        fs.writeFileSync(
            "successful-userverify-transactions.json", 
            JSON.stringify(outputData, null, 2)
        );
        
        console.log(`\nAnalysis complete!`);
        console.log(`Total successful userVerify transactions to ${targetContract}: ${totalTransactions}`);
        console.log(`Results saved to successful-userverify-transactions.json`);

    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

// Run the function
getDetailedTransactions().catch(console.error); 