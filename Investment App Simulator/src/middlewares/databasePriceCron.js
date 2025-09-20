
const cron = require('node-cron');
const fetch = require('node-fetch');
const prisma = require('../../prisma/prismaClient');
const { processLimitOrders } = require('../models/Charts'); // adjust path
const API_KEY = '26d603eb0f773cc49609fc81898d4b9c';

const MARKET_OPEN = 9.5; // 9:30 AM ET
const MARKET_CLOSE = 16; // 4:00 PM ET

function isMarketOpen() {
    const now = new Date();
    const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = estNow.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = estNow.getHours() + estNow.getMinutes() / 60;
    return day >= 1 && day <= 5 && hour >= MARKET_OPEN && hour <= MARKET_CLOSE;
}

// Get symbols of stocks that have pending limit orders
async function getSymbolsWithPendingOrders() {
    const pendingStocks = await prisma.limitOrder.findMany({
        where: { status: 'PENDING' },
        select: { stock: { select: { symbol: true } } },
        distinct: ['stockId']
    });
    return pendingStocks.map(s => s.stock.symbol);
}

// Fetch intraday data and upsert into DB
async function updateIntradayForSymbols(symbols) {
    if (!symbols.length) return;

    // Marketstack allows up to 100 symbols per request
    const chunks = [];
    for (let i = 0; i < symbols.length; i += 100) {
        chunks.push(symbols.slice(i, i + 100));
    }

    for (const chunk of chunks) {
        const symbolsStr = chunk.join(',');
        const url = `https://api.marketstack.com/v1/intraday?access_key=${API_KEY}&symbols=${symbolsStr}&interval=15min&limit=1000&sort=ASC`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Marketstack API error: ${response.status}`);
            const data = await response.json();

            if (!data.data || data.data.length === 0) continue;

            for (const item of data.data) {
                try {
                    const stock = await prisma.stock.upsert({
                        where: { symbol: item.symbol },
                        update: {},
                        create: { symbol: item.symbol }
                    });

                    const dateObj = new Date(item.date);
                    dateObj.setMilliseconds(0);
                    dateObj.setSeconds(0);

                    await prisma.intradayPrice3.upsert({
                        where: { stockId_date: { stockId: stock.stock_id, date: dateObj } },
                        update: {
                            openPrice: item.open,
                            highPrice: item.high,
                            lowPrice: item.low,
                            closePrice: item.close,
                            volume: item.volume
                        },
                        create: {
                            stockId: stock.stock_id,
                            date: dateObj,
                            openPrice: item.open,
                            highPrice: item.high,
                            lowPrice: item.low,
                            closePrice: item.close,
                            volume: item.volume
                        }
                    });

                    // After upserting, process limit orders for this stock
                    const executedOrders = await processLimitOrders(stock.stock_id);
                    if (executedOrders.length) {
                        console.log(`Executed ${executedOrders.length} limit orders for stock ${item.symbol}`);
                    }
                } catch (err) {
                    console.error(`Failed to upsert/process for ${item.symbol} at ${item.date}:`, err);
                }
            }

            console.log(`Processed intraday prices and limit orders for ${chunk.length} stocks`);
        } catch (err) {
            console.error('Error fetching intraday data chunk:', err);
        }
    }
}

// Cron job every 30 mins
cron.schedule('*/30 * * * *', async () => {
    try {
        if (!isMarketOpen()) {
            console.log('Market closed. Skipping limit order processing.');
            return;
        }

        const symbols = await getSymbolsWithPendingOrders();
        if (!symbols.length) {
            console.log('No pending limit orders. Skipping update.');
            return;
        }

        console.log(`Updating intraday prices for ${symbols.length} stocks with pending orders...`);
        await updateIntradayForSymbols(symbols);
        console.log('Intraday update & limit order processing done.');
    } catch (err) {
        console.error('Error in scheduled limit order updater:', err);
    }
});
