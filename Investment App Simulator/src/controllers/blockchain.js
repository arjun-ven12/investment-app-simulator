const prisma = require("../../prisma/prismaClient");
module.exports.getUnifiedTrades = async (req, res) => {
    try {
        // === Fetch stock trades ===
        const stockTx = await prisma.blockchainTransaction.findMany({
            include: {
                user: true
            }
        });

        // === Fetch option trades ===
        const optionTx = await prisma.optionBlockchainTransaction.findMany({
            include: {
                user: true
            }
        });

        // === Normalize stock trades ===
        const formattedStocks = stockTx.map(tx => ({
            user: tx.user?.username || tx.user?.name || `User ${tx.userId}`,
            txHash: tx.transactionHash,
            timestamp: tx.createdAt.toISOString(),
            gasUsed: Number(tx.gasUsed),
            blockNumber: tx.blockNumber,
            contractId: null,          // means "Stock" in frontend
        }));

        // === Normalize option trades ===
        const formattedOptions = optionTx.map(tx => ({
            user: tx.user?.username || tx.user?.name || `User ${tx.userId}`,
            txHash: tx.transactionHash,
            timestamp: tx.createdAt.toISOString(),
            gasUsed: Number(tx.gasUsed),
            blockNumber: tx.blockNumber,
            contractId: tx.id,         // means "Option" in frontend
        }));

        // === Combine ===
        const unified = [...formattedStocks, ...formattedOptions];

        return res.json(unified);

    } catch (err) {
        console.error("❌ Error fetching unified blockchain data:", err);
        return res.status(500).json({ error: "Failed to load blockchain transactions." });
    }
};
