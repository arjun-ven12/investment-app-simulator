const prisma = require("../src/models/prismaClient");
const path = require("path");
const fs = require("fs");

const statuses = [
  { text: "Pending" },
  { text: "In Progress" },
  { text: "Completed" },
  { text: "On Hold" },
];

const newsCategories = [
  { name: "general" },
  { name: "forex" },
  { name: "crypto" },
  { name: "merger" },
];


// Seed Persons
const persons = [
  { email: "alice@example.com", name: "Alice" }, // Task 1
  { email: "bob@example.com", name: "Bob" }, // Task 1
  { email: "carol@example.com", name: "Carol" }, // Task 2
  { email: "dave@example.com", name: "Dave" }, // Task 2
  { email: "eve@example.com", name: "Eve" },
  { email: "frank@example.com", name: "Frank" },
  { email: "grace@example.com", name: "Grace" },
  { email: "heidi@example.com", name: "Heidi" },
  { email: "ivan@example.com", name: "Ivan" },
  { email: "judy@example.com", name: "Judy" },
  { email: "mallory@example.com", name: "Mallory" },
  { email: "oscar@example.com", name: "Oscar" },
  { email: "peggy@example.com", name: "Peggy" },
  { email: "trent@example.com", name: "Trent" },
  { email: "victor@example.com", name: "Victor" },
  { email: "walter@example.com", name: "Walter" },
  { email: "xavier@example.com", name: "Xavier" },
  { email: "yvonne@example.com", name: "Yvonne" },
  { email: "zara@example.com", name: "Zara" },
  { email: "leo@example.com", name: "Leo" },
];

// Seed Companies
const companies = [
  {
    symbol: "AAPL",
    name: "Apple",
    founded: 1976,
    employees: 164000,
    address: "One Apple Park Way",
    city: "Cupertino",
    country: "USA",
    zipCode: "95014",
    phone: "408-996-1010",
    website: "apple.com",
    description: "Apple is a technological and manufacturing company.",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    founded: 1975,
    employees: 220000,
    address: "1 Microsoft Way",
    city: "Redmond",
    country: "USA",
    zipCode: "98052",
    phone: "425-882-8080",
    website: "microsoft.com",
    description: "Microsoft is a technological and manufacturing company.",
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    founded: 2003,
    employees: 127000,
    address: "1 Tesla Road",
    city: "Austin",
    country: "USA",
    zipCode: "78725",
    phone: "512-516-8177",
    website: "tesla.com",
    description: "Tesla is a car and tech manufacturer.",
  },
];

// Seed Stocks
const stocks = [
  { stock_id: 1, symbol: "AAPL", company_id: 1 },
  { stock_id: 2, symbol: "MSFT", company_id: 2 },
  { stock_id: 3, symbol: "TSLA", company_id: 3 },
];

const histPrices = [
  { stock_id: 1, date: "2024-06-02T00:00:00.000Z", close_price: 390 },
  { stock_id: 1, date: "2024-05-26T00:00:00.000Z", close_price: 432 },
  { stock_id: 1, date: "2024-07-29T00:00:00.000Z", close_price: 328 },
  { stock_id: 1, date: "2024-11-16T00:00:00.000Z", close_price: 353 },
  { stock_id: 1, date: "2024-05-07T00:00:00.000Z", close_price: 338 },
  { stock_id: 1, date: "2024-03-23T00:00:00.000Z", close_price: 308 },
  { stock_id: 1, date: "2024-02-18T00:00:00.000Z", close_price: 288 },
  { stock_id: 1, date: "2024-10-06T00:00:00.000Z", close_price: 273 },
  { stock_id: 1, date: "2024-12-18T00:00:00.000Z", close_price: 366 },
  { stock_id: 1, date: "2024-09-30T00:00:00.000Z", close_price: 365 },
  { stock_id: 1, date: "2024-11-29T00:00:00.000Z", close_price: 465 },
  { stock_id: 1, date: "2024-12-24T00:00:00.000Z", close_price: 400 },
  { stock_id: 1, date: "2024-08-05T00:00:00.000Z", close_price: 336 },
  { stock_id: 1, date: "2024-01-31T00:00:00.000Z", close_price: 326 },
  { stock_id: 1, date: "2024-08-07T00:00:00.000Z", close_price: 374 },
  { stock_id: 1, date: "2024-12-13T00:00:00.000Z", close_price: 319 },
  { stock_id: 1, date: "2024-10-07T00:00:00.000Z", close_price: 267 },
  { stock_id: 1, date: "2024-02-09T00:00:00.000Z", close_price: 281 },
  { stock_id: 1, date: "2024-09-12T00:00:00.000Z", close_price: 463 },
  { stock_id: 1, date: "2024-06-07T00:00:00.000Z", close_price: 289 },
];

const users = [
  {
    email: "123ava@gmail.com",
    password: "$2b$10$FILzFtD.nQJSJx4hx5UHTe/Q/FLOzMKF6SZ21686T3Lglo1btw6Be",
    username: "123ava",
  },
  {
    email: "hiarjun@gmail.com",
    password: "$2b$10$FILzFtD.nQJSJx4hx5UHTe/Q/FLOzMKF6SZ21686T3Lglo1btw6Be",
    username: "hiarjun",
  },
  {
    email: "ws@gmail.com",
    password: "$2b$10$FILzFtD.nQJSJx4hx5UHTe/Q/FLOzMKF6SZ21686T3Lglo1btw6Be",
    username: "ws",
  },
  {
    email: "rewardtest@gmail.com",
    password: "$2b$10$49h00dK0vTwdBwJ4i7T8quf6VcDvX6ymwg42jYyVf0.P653LiE0HW",
    username: "rewardtest",
    wallet: 10000000,
  },
  {
    email: "nomoneytest@gmail.com",
    password: "$2b$10$49h00dK0vTwdBwJ4i7T8quf6VcDvX6ymwg42jYyVf0.P653LiE0HW",
    username: "nomoneytest",
    wallet: 0,
  },
];

const reward = [
  {
    id: 1,
    rewardName: "Amazon",
    rewardDescription: "$50 Giftcard",
    cost: 50000,
    probability: 3.47,
  },
  {
    id: 2,
    rewardName: "Starbucks",
    rewardDescription: "$25 Giftcard",
    cost: 25000,
    probability: 6.94,
  },
  {
    id: 3,
    rewardName: "Apple",
    rewardDescription: "$10 Giftcard",
    cost: 10000,
    probability: 17.34,
  },
  {
    id: 4,
    rewardName: "Target",
    rewardDescription: "$20 Giftcard",
    cost: 20000,
    probability: 8.67,
  },
  {
    id: 5,
    rewardName: "Best Buy",
    rewardDescription: "$15 Giftcard",
    cost: 15000,
    probability: 11.56,
  },
  {
    id: 6,
    rewardName: "Netflix",
    rewardDescription: "$30 Giftcard",
    cost: 30000,
    probability: 5.78,
  },
  {
    id: 7,
    rewardName: "Walmart",
    rewardDescription: "$20 Giftcard",
    cost: 20000,
    probability: 8.67,
  },
  {
    id: 8,
    rewardName: "Playstation",
    rewardDescription: "$10 Giftcard",
    cost: 10000,
    probability: 17.34,
  },
  {
    id: 9,
    rewardName: "Xbox",
    rewardDescription: "$15 Giftcard",
    cost: 15000,
    probability: 11.56,
  },
  {
    id: 10,
    rewardName: "Nike",
    rewardDescription: "$20 Giftcard",
    cost: 20000,
    probability: 8.669,
  },
  {
    id: 11,
    rewardName: "Win Or Lose",
    rewardDescription: "Take a chance at this!",
    cost: 700000000,
    probability: 0.001,
  },
];

const referral = [
  {
    id: 1,
    referralLink: "https://www.fintech.com/referral/a23kbcak1",
    referralSignups: 0,
    successfulReferrals: 0,
    rewardsExchanged: 0,
    creditsEarned: 0,
    userId: 1,
  },
  {
    id: 2,
    referralLink: "https://www.fintech.com/referral/t1a19kg8b",
    referralSignups: 0,
    successfulReferrals: 0,
    rewardsExchanged: 0,
    creditsEarned: 0,
    userId: 2,
  },
  {
    id: 3,
    referralLink: "https://www.fintech.com/referral/okm123k1m",
    referralSignups: 0,
    successfulReferrals: 0,
    rewardsExchanged: 0,
    creditsEarned: 0,
    userId: 3,
  },
  {
    id: 4,
    referralLink: "https://www.fintech.com/referral/kvo1028m3",
    referralSignups: 0,
    successfulReferrals: 0,
    rewardsExchanged: 0,
    creditsEarned: 0,
    userId: 4,
  },
  {
    id: 5,
    referralLink: "https://www.fintech.com/referral/1lmfl1j24",
    referralSignups: 0,
    successfulReferrals: 0,
    rewardsExchanged: 0,
    creditsEarned: 0,
    userId: 5,
  },
];

// const news = [
//   {
//     news_id: 1,
//     image_url: "http://dummyimage.com/170x100.png/dddddd/000000",
//     title: "at feugiat non",
//     caption: "eu est congue elementum",
//     content:
//       "curae duis faucibus accumsan odio curabitur convallis duis consequat dui nec",
//     category: "hotAndTrending",
//     tags: ["Breaking", "Crypto"],
//   },
//   {
//     news_id: 2,
//     image_url: "http://dummyimage.com/223x100.png/ff4444/ffffff",
//     title: "nam tristique tortor eu",
//     caption:
//       "phasellus news_id sapien in sapien iaculis congue vivamus metus arcu",
//     content:
//       "integer non velit donec diam neque vestibulum eget vulputate ut ultrices vel augue vestibulum ante",
//     category: "bookmarks",
//     tags: ["Advice", "Biography"],
//   },
//   {
//     news_id: 3,
//     image_url: "http://dummyimage.com/217x100.png/5fa2dd/ffffff",
//     title: "ut erat curabitur gravnews_ida nisi",
//     caption: "facilisi cras non velit nec nisi vulputate nonummy",
//     content:
//       "morbi odio odio elementum eu interdum eu tincnews_idunt in leo maecenas",
//     category: "bookmarks",
//     tags: ["Local", "Advice"],
//   },
//   {
//     news_id: 4,
//     image_url: "http://dummyimage.com/241x100.png/dddddd/000000",
//     title: "eros vestibulum ac est lacinia",
//     caption: "ultrices posuere",
//     content:
//       "ut ultrices vel augue vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae donec pharetra magna",
//     category: "mostViewed",
//     tags: ["Biography", "Crypto"],
//   },
//   {
//     news_id: 5,
//     image_url: "http://dummyimage.com/131x100.png/cc0000/ffffff",
//     title: "justo lacinia eget",
//     caption: "sapien varius ut",
//     content: "pede malesuada in",
//     category: "featured",
//     tags: ["Breaking", "Local"],
//   },
//   {
//     news_id: 6,
//     image_url: "http://dummyimage.com/122x100.png/5fa2dd/ffffff",
//     title: "vivamus metus",
//     caption: "sapien placerat ante nulla justo aliquam quis turpis",
//     content:
//       "lacus morbi sem mauris laoreet ut rhoncus aliquet pulvinar sed nisl nunc rhoncus dui vel sem",
//     category: "bookmarks",
//     tags: ["Biography", "Crypto"],
//   },
//   {
//     news_id: 7,
//     image_url: "http://dummyimage.com/239x100.png/cc0000/ffffff",
//     title: "dapibus augue vel accumsan",
//     caption:
//       "condimentum curabitur in libero ut massa volutpat convallis morbi odio",
//     content: "luctus et ultrices posuere cubilia",
//     category: "important",
//     tags: ["Advice", "Breaking"],
//   },
//   {
//     news_id: 8,
//     image_url: "http://dummyimage.com/220x100.png/dddddd/000000",
//     title: "curabitur convallis duis consequat",
//     caption: "consectetuer",
//     content: "eu sapien cursus vestibulum proin eu",
//     category: "featured",
//     tags: ["Local", "Advice"],
//   },
//   {
//     news_id: 9,
//     image_url: "http://dummyimage.com/150x100.png/ff4444/ffffff",
//     title: "augue quam",
//     caption: "mi pede malesuada",
//     content: "iaculis congue",
//     category: "important",
//     tags: ["Crypto", "Breaking"],
//   },
//   {
//     news_id: 10,
//     image_url: "http://dummyimage.com/202x100.png/ff4444/ffffff",
//     title: "donec ut dolor morbi vel",
//     caption: "adipiscing lorem vitae mattis nibh ligula nec sem duis",
//     content: "leo odio condimentum id luctus nec molestie sed justo",
//     category: "featured",
//     tags: ["Biography", "Local"],
//   },
//   {
//     news_id: 11,
//     image_url: "http://dummyimage.com/203x100.png/ff4444/ffffff",
//     title: "vel est donec",
//     caption: "vestibulum proin eu mi nulla ac enim",
//     content: "libero",
//     category: "important",
//     tags: ["Breaking", "Biography"],
//   },
//   {
//     news_id: 12,
//     image_url: "http://dummyimage.com/241x100.png/cc0000/ffffff",
//     title: "id lobortis convallis tortor risus",
//     caption: "pellentesque at nulla suspendisse potenti cras in",
//     content: "nec nisi vulputate nonummy maecenas tincidunt lacus",
//     category: "mostViewed",
//     tags: ["Local", "Crypto"],
//   },
//   {
//     news_id: 13,
//     image_url: "http://dummyimage.com/136x100.png/5fa2dd/ffffff",
//     title: "tellus semper interdum",
//     caption: "turpis adipiscing lorem vitae mattis nibh ligula",
//     content: "nisi eu orci mauris",
//     category: "bookmarks",
//     tags: ["Advice", "Breaking"],
//   },
//   {
//     news_id: 14,
//     image_url: "http://dummyimage.com/242x100.png/dddddd/000000",
//     title: "etiam justo",
//     caption: "ante ipsum primis in faucibus orci",
//     content:
//       "orci nullam molestie nibh in lectus pellentesque at nulla suspendisse potenti cras in purus eu magna vulputate luctus cum sociis",
//     category: "hotAndTrending",
//     tags: ["Breaking", "Local"],
//   },
//   {
//     news_id: 15,
//     image_url: "http://dummyimage.com/203x100.png/cc0000/ffffff",
//     title: "consequat nulla nisl nunc",
//     caption: "vel augue vestibulum ante ipsum",
//     content: "libero nam dui",
//     category: "hotAndTrending",
//     tags: ["Crypto", "Biography"],
//   },
//   {
//     news_id: 16,
//     image_url: "http://dummyimage.com/202x100.png/5fa2dd/ffffff",
//     title: "mattis",
//     caption: "vestibulum proin eu mi nulla ac enim in tempor turpis",
//     content: "tincidunt lacus at velit",
//     category: "mostViewed",
//     tags: ["Advice", "Breaking"],
//   },
//   {
//     news_id: 17,
//     image_url: "http://dummyimage.com/167x100.png/ff4444/ffffff",
//     title: "sollicitudin",
//     caption: "purus eu magna vulputate luctus",
//     content:
//       "tincidunt nulla mollis molestie lorem quisque ut erat curabitur gravida nisi at nibh in hac habitasse platea dictumst",
//     category: "bookmarks",
//     tags: ["Crypto", "Local"],
//   },
//   {
//     news_id: 18,
//     image_url: "http://dummyimage.com/110x100.png/ff4444/ffffff",
//     title: "quam",
//     caption: "sapien arcu sed augue aliquam erat volutpat in",
//     content: "rutrum nulla tellus in sagittis",
//     category: "important",
//     tags: ["Biography", "Advice"],
//   },
//   {
//     news_id: 19,
//     image_url: "http://dummyimage.com/173x100.png/cc0000/ffffff",
//     title: "vel nulla eget",
//     caption: "porta volutpat quam pede lobortis",
//     content:
//       "orci luctus et ultrices posuere cubilia curae duis faucibus accumsan odio curabitur convallis duis consequat dui nec nisi",
//     category: "hotAndTrending",
//     tags: ["Breaking", "Crypto"],
//   },
//   {
//     news_id: 20,
//     image_url: "http://dummyimage.com/217x100.png/ff4444/ffffff",
//     title: "feugiat et eros",
//     caption: "curabitur in libero",
//     content:
//       "turpis integer aliquet massa id lobortis convallis tortor risus dapibus augue vel accumsan tellus nisi",
//     category: "mostViewed",
//     tags: ["Local", "Breaking"],
//   },
// ];

async function main() {
  const insertedCategories = [];
  for (const category of newsCategories) {
    const inserted = await prisma.newsCategory.create({
      data: category,
    });
    insertedCategories.push(inserted);
  }
  console.log("News categories inserted:", insertedCategories);


  // If etf-guide.json is in project_root/how-tos/etf-guide.json
  const guidePath = path.join(__dirname, "how-tos", "etf-guide.json");

  const etfGuide = JSON.parse(fs.readFileSync(guidePath, "utf-8"));
  console.log("ETF Guide loaded:", etfGuide.title);

  await prisma.investmentGuide.create({
    data: {
      title: etfGuide.title,
      content: etfGuide.sections,
    },
  });

  console.log("ETF Investment guide inserted successfully");

  // Seed statuses
  const insertedStatuses = [];
  for (const status of statuses) {
    const inserted = await prisma.status.create({ data: status });
    insertedStatuses.push(inserted);
  }

  // Seed persons
  const insertedPersons = [];
  for (const person of persons) {
    const inserted = await prisma.person.create({ data: person });
    insertedPersons.push(inserted);
  }

  // Seed tasks
  const insertedTasks = [];
  insertedTasks.push(
    await prisma.task.create({
      data: { name: "Seed 1", statusId: insertedStatuses[0].id },
    })
  );
  insertedTasks.push(
    await prisma.task.create({
      data: { name: "Seed 2", statusId: insertedStatuses[1].id },
    })
  );

  // Task assignments
  await prisma.taskAssignment.createMany({
    data: [
      { personId: insertedPersons[0].id, taskId: insertedTasks[0].id },
      { personId: insertedPersons[1].id, taskId: insertedTasks[0].id },
      { personId: insertedPersons[2].id, taskId: insertedTasks[1].id },
      { personId: insertedPersons[3].id, taskId: insertedTasks[1].id },
    ],
  });

  // Seed Companies
  const insertedCompanies = [];
  for (const company of companies) {
    const inserted = await prisma.company.create({
      data: company,
    });
    insertedCompanies.push(inserted);
  }

  // Seed stocks; assuming the companies array order corresponds to company_id values
  const insertedStocks = [];
  for (const stock of stocks) {
    // Map the company_id in the stock object to the corresponding inserted company.
    const company = insertedCompanies[stock.company_id - 1];
    const inserted = await prisma.stock.create({
      data: {
        symbol: stock.symbol,
        company: {
          connect: { id: company.id },
        },
      },
    });
    insertedStocks.push(inserted);
  }

  // Seed histPrices; assume stock_id in histPrices corresponds to the insertedStocks order
  for (const price of histPrices) {
    const stock = insertedStocks[price.stock_id - 1];
    await prisma.histPrice.create({
      data: {
        stock: {
          connect: { stock_id: stock.stock_id },
        },
        date: new Date(price.date),
        close_price: price.close_price,
      },
    });
  }

  const insertedusers = await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });

  const insertedrewards = await prisma.reward.createMany({
    data: reward,
    skipDuplicates: true,
  });

  // const insertednews = await prisma.news.createMany({
  //   data: news,
  //   skipDuplicates: true,
  // });

  console.log("Seed data inserted successfully");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
