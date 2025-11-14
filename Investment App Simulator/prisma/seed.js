
const prisma = require("../src/models/prismaClient");
const fs = require("fs");
const path = require("path");

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

const persons = [
  { email: "alice@example.com", name: "Alice" },
  { email: "bob@example.com", name: "Bob" },
  { email: "carol@example.com", name: "Carol" },
  { email: "dave@example.com", name: "Dave" },
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

async function main() {
  // Seed news categories
  for (const category of newsCategories) {
    await prisma.newsCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
  console.log("News categories seeded (duplicates skipped)");

  // Seed investment guides
  const guideFolder = path.join(__dirname, "how-tos");
  const files = fs.readdirSync(guideFolder);

  for (const fileName of files) {
    const filePath = path.join(guideFolder, fileName);
    const guideData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (!guideData.content) {
      console.warn(`Skipping ${fileName} because content is missing`);
      continue;
    }

    await prisma.investmentGuide.upsert({
      where: { title: guideData.title },
      update: {},
      create: {
        title: guideData.title,
        content: guideData.content,
      },
    });
  }

  // Seed statuses
  const insertedStatuses = [];
  for (const status of statuses) {
    const inserted = await prisma.status.upsert({
      where: { text: status.text },
      update: {},
      create: status,
    });
    insertedStatuses.push(inserted);
  }

  // Seed persons
// Seed persons (duplicate-safe)
const insertedPersons = [];
for (const person of persons) {
  const inserted = await prisma.person.upsert({
    where: { email: person.email },
    update: {},           // Don't update anything
    create: person        // Create only if not found
  });
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

  // ✅ Skip company, stock, and histPrice seeding completely

  // Seed users
  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });

  // Seed rewards
  await prisma.reward.createMany({
    data: reward,
    skipDuplicates: true,
  });

  // Seed referrals
  await prisma.referral.createMany({
    data: referral,
    skipDuplicates: true,
  });

  console.log("Seed data inserted successfully (companies/stocks skipped)");
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
