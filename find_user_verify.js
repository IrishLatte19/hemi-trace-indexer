const ethers = require('ethers');
const fs = require('fs');
const https = require('https');
// const fetch = require('node-fetch'); // You may need to install this: npm install node-fetch
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Configuration
const rpcUrl = "https://rpc.hemi.network/rpc";
const targetContract = "0x70468f06cf32b776130e2da4c0d7dd08983282ec";
const targetMethodSignature = "0xa4760a9e"; // userVerify method
const explorerApiUrl = "https://explorer.hemi.xyz/api/v2/addresses";

// Initialize provider
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Function to fetch transactions from the Hemi Explorer API
async function fetchTransactionsFromExplorer(address, nextPageParams = null) {
    try {
        // Form the API URL
        let url = `${explorerApiUrl}/${address}/transactions?filter=to`;
        
        // Add pagination parameters if provided
        if (nextPageParams) {
            const params = new URLSearchParams({
                block_number: nextPageParams.block_number,
                index: nextPageParams.index
            });
            url += `&${params.toString()}`;
        }
        
        console.log(`Fetching transactions from ${url}`);
        
        // Make the API request
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error fetching from Explorer API: ${error.message}`);
        throw error;
    }
}

// Function to fetch all pages of transactions
async function fetchAllTransactions(address) {
    let allTransactions = [];
    let nextPageParams = null;
    let pageCount = 0;
    
    try {
        do {
            // Fetch the current page of transactions
            const result = await fetchTransactionsFromExplorer(address, nextPageParams);
            pageCount++;
            
            console.log(`Fetched page ${pageCount} with ${result.items.length} transactions`);
            
            // Add transactions to our collection
            allTransactions = allTransactions.concat(result.items);
            
            // Get next page parameters
            nextPageParams = result.next_page_params;
            
            // Slight delay to avoid rate limiting
            if (nextPageParams) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } while (nextPageParams);
        
        console.log(`Completed fetching all transactions. Total: ${allTransactions.length}`);
        return allTransactions;
        
    } catch (error) {
        console.error(`Error fetching all transactions: ${error.message}`);
        throw error;
    }
}

// Main function to find userVerify transactions
async function findUserVerifyTransactions() {
    try {
        console.log(`Finding all successful userVerify transactions to contract ${targetContract}`);
        console.log(`Using the Hemi Explorer API to get all transactions to the contract`);
        
        // Fetch all transactions from the Explorer API
        const allTransactions = await fetchAllTransactions(targetContract);
        console.log(`Total transactions found to contract: ${allTransactions.length}`);
        
        // Filter for userVerify transactions
        const userVerifyTransactions = allTransactions.filter(tx => {
            // Check method ID
            const isUserVerify = tx.decoded_input && 
                                tx.decoded_input.method_id === targetMethodSignature.slice(2); // Remove the "0x" prefix
            
            // Check transaction success
            const isSuccessful = tx.status === "ok" && tx.result === "success";
            
            return isUserVerify && isSuccessful;
        });
        
        console.log(`Found ${userVerifyTransactions.length} successful userVerify transactions`);
        
        // Process the transactions
        const transactionDetails = userVerifyTransactions.map(tx => {
            return {
                hash: tx.hash,
                blockNumber: tx.block_number,
                from: tx.from.hash,
                to: tx.to.hash,
                timestamp: tx.timestamp,
                date: tx.timestamp,
                methodSignature: "0x" + tx.decoded_input.method_id,
                methodName: 'userVerify',
                status: "success",
                signatureTimestamp: tx.decoded_input.parameters[0].value,
                verifyProof: tx.decoded_input.parameters[1].value
            };
        });
        
        // Group transactions by block
        const transactionsByBlock = {};
        transactionDetails.forEach(tx => {
            if (!transactionsByBlock[tx.blockNumber]) {
                transactionsByBlock[tx.blockNumber] = [];
            }
            transactionsByBlock[tx.blockNumber].push(tx.hash);
        });
        
        // Save to file
        const outputData = {
            targetContract,
            totalSuccessfulTransactions: transactionDetails.length,
            transactionsByBlock,
            transactions: transactionDetails,
            earliestBlock: transactionDetails.length > 0 ? 
                Math.min(...transactionDetails.map(tx => tx.blockNumber)) : null,
            latestBlock: transactionDetails.length > 0 ? 
                Math.max(...transactionDetails.map(tx => tx.blockNumber)) : null,
            completedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(
            "successful-userverify-transactions.json", 
            JSON.stringify(outputData, null, 2)
        );
        
        console.log(`\nAnalysis complete!`);
        console.log(`Total successful userVerify transactions to ${targetContract}: ${transactionDetails.length}`);
        
        if (transactionDetails.length > 0) {
            console.log(`Transactions span from block ${outputData.earliestBlock} to ${outputData.latestBlock}`);
            console.log(`Date range: ${transactionDetails[0].date} to ${transactionDetails[transactionDetails.length-1].date}`);
        }
        
        console.log(`Results saved to successful-userverify-transactions.json`);
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        console.error(error.stack);
    }
}

// Run the function
findUserVerifyTransactions().catch(console.error); 