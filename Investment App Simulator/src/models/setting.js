const prisma = require("../../prisma/prismaClient");
const bcrypt = require("bcrypt");

function getAuthType(user) {
    if (user.googleId) return "google";     // Google always wins
    if (user.microsoftId) return "microsoft";
    return "local";
}
//////////////////////////////////////////////////////
// CHANGE EMAIL — LOCAL ONLY
//////////////////////////////////////////////////////
module.exports.changeEmail = async function changeEmail(userId, newEmail, password) {
    if (!userId || !newEmail) throw new Error("Missing fields");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const authType = getAuthType(user);
    if (authType !== "local") {
        throw new Error("Only email/password accounts can change email.");
    }

    if (!password) throw new Error("Password required");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Incorrect password");

    if (newEmail === user.email) throw new Error("Email is unchanged");

    const exists = await prisma.user.findUnique({ where: { email: newEmail } });
    if (exists) throw new Error("Email already in use");

    await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail }
    });

    return { message: "Email updated successfully" };
};

//////////////////////////////////////////////////////
// CHANGE PASSWORD — LOCAL ONLY
//////////////////////////////////////////////////////
module.exports.changePassword = async function changePassword(userId, oldPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const authType = getAuthType(user);
    if (authType !== "local") {
        throw new Error("Only email/password accounts can change password.");
    }

    if (!oldPassword || !newPassword) throw new Error("Missing fields");

    const oldValid = await bcrypt.compare(oldPassword, user.password);
    if (!oldValid) throw new Error("Incorrect password");

    const newValid = await bcrypt.compare(newPassword, user.password);
    if (newValid) throw new Error("New password cannot be same as old");

    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!regex.test(newPassword)) throw new Error("Password does not meet requirements");

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashed }
    });

    return { message: "Password updated successfully" };
};

//////////////////////////////////////////////////////
// CHANGE USERNAME — LOCAL → REQUIRE PASSWORD
//                  SSO → NO PASSWORD
//////////////////////////////////////////////////////
module.exports.changeUsername = async function changeUsername(userId, newUsername, password) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const authType = getAuthType(user);

    if (authType === "local") {
        if (!password) throw new Error("Password required");
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new Error("Incorrect password");
    }

    if (newUsername === user.username)
        throw new Error("New username is the same as old");

    const exists = await prisma.user.findUnique({ where: { username: newUsername } });
    if (exists) throw new Error("Username already taken");

    await prisma.user.update({
        where: { id: userId },
        data: { username: newUsername }
    });

    return { message: "Username updated successfully" };
};

//////////////////////////////////////////////////////
// DELETE ACCOUNT — LOCAL → REQUIRE PASSWORD
//                GOOGLE/MICROSOFT → NO PASSWORD
//////////////////////////////////////////////////////
module.exports.deleteAccount = async function deleteAccount(userId, password) {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) throw new Error("User not found");

    const authType = getAuthType(user);

    if (authType === "local") {
        if (!password) throw new Error("Password required");
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new Error("Incorrect password");
    }

    // ============================
    // 1. DELETE NON-CASCADE TABLES FIRST
    // ============================

    await prisma.loginActivity.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.chatMessage.deleteMany({ where: { userId } });
    await prisma.chatSession.deleteMany({ where: { userId } });
    await prisma.blogComment.deleteMany({ where: { user_id: userId } });
    await prisma.blogPost.deleteMany({ where: { user_id: userId } });
    await prisma.comment.deleteMany({ where: { userId } });
    await prisma.favoriteApi.deleteMany({ where: { userId } });
    await prisma.redeemBy.deleteMany({ where: { userId } });
    await prisma.newsLike.deleteMany({ where: { userId } });
    await prisma.newsComment.deleteMany({ where: { userId } });
    await prisma.optionTrade.deleteMany({ where: { userId } });
    await prisma.blockchainTransaction.deleteMany({ where: { userId } });
    await prisma.optionBlockchainTransaction.deleteMany({ where: { userId } });

    // Scenario-related
    await prisma.scenarioAttemptAnalytics.deleteMany({ where: { userId } });
    await prisma.scenarioPersonalBest.deleteMany({ where: { userId } });
    await prisma.scenarioAttempt.deleteMany({ where: { userId } });
    await prisma.scenarioParticipant.deleteMany({ where: { userId } });

    // ============================
    // 2. Prisma will cascade the rest (favoriteStocks, limitOrders, referrals, etc.)
    // ============================

    await prisma.user.delete({
        where: { id: userId }
    });

    return { message: "Account deleted successfully" };
};

////////////////////////////////////////////////////////////////////////////////
//////// SETTINGS - WALLET RESET
////////////////////////////////////////////////////////////////////////////////




exports.resetUserPortfolio = async function resetUserPortfolio(userId, startingBalance) {
  if (!userId || isNaN(userId)) {
    throw new Error("Invalid user ID");
  }

  return prisma.$transaction(async (tx) => {
    // 1️⃣ Reset user's wallet
    const updatedUser = await tx.user.update({
      where: { id: Number(userId) },
      data: { wallet: startingBalance },
    });

    // 2️⃣ Delete all stock trades
    await tx.trade.deleteMany({ where: { userId: Number(userId) } });

    // 3️⃣ Delete all limit orders
    await tx.limitOrder.deleteMany({ where: { userId: Number(userId) } });

    // 4️⃣ Delete all stop market orders
    await tx.stopMarketOrder.deleteMany({ where: { userId: Number(userId) } });

    // 5️⃣ Delete all stop limit orders
    await tx.stopLimitOrder.deleteMany({ where: { userId: Number(userId) } });

    // 6️⃣ Delete all option trades
    await tx.optionTrade.deleteMany({ where: { userId: Number(userId) } });

    // 7️⃣ Delete all option blockchain transactions
    await tx.optionBlockchainTransaction.deleteMany({ where: { userId: Number(userId) } });

    // 8️⃣ Optional: reset scenario cash balances (if you want)
    await tx.scenarioParticipant.updateMany({
      where: { userId: Number(userId) },
      data: { cashBalance: 0, ended: false }, // reset cash and mark as not ended
    });

    return updatedUser;
  });
};