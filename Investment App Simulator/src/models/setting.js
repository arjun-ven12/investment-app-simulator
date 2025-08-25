const prisma = require('./prismaClient');
const bcrypt = require('bcrypt');

//////////////////////////////////////////////////////
// CHANGE EMAIL
//////////////////////////////////////////////////////
module.exports.changeEmail = async function changeEmail(userId, newEmail, password) {
    if (!userId || !newEmail || !password) throw new Error('All fields are required');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error('Incorrect password');

    if (user.email === newEmail) throw new Error('Email is the same');

    // Check if another user has this email
    const existingEmail = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existingEmail) throw new Error('Email already in use');

    await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail },
    });

    return { message: 'Email updated successfully' };
};

//////////////////////////////////////////////////////
// CHANGE PASSWORD
//////////////////////////////////////////////////////

module.exports.changePassword = async function changePassword(userId, oldPassword, newPassword) {
    if (!userId || !oldPassword || !newPassword) throw new Error('All fields are required');

    // Password regex: 8+ chars, uppercase, lowercase, number, special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        throw new Error('Password does not meet requirements.');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Unable to update password.');

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) throw new Error('Incorrect password.');

    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) throw new Error('Old password and new password cannot be the same. ');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    return { message: 'Password updated successfully' };
};

//////////////////////////////////////////////////////
// CHANGE USERNAME
//////////////////////////////////////////////////////
module.exports.changeUsername = async function changeUsername(userId, newUsername, password) {
    if (!userId || !newUsername || !password) throw new Error('All fields are required');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error('Incorrect password');

    if (user.username === newUsername) throw new Error('Old username and new username cannot be the same');

    // Ensure username is unique
    const existingUser = await prisma.user.findUnique({ where: { username: newUsername } });
    if (existingUser) throw new Error('Username already taken');

    await prisma.user.update({
        where: { id: userId },
        data: { username: newUsername },
    });

    return { message: 'Username updated successfully' };
};

//////////////////////////////////////////////////////
// DELETE ACCOUNT
//////////////////////////////////////////////////////
module.exports.deleteAccount = async function deleteAccount(userId, password) {
    if (!userId || !password) throw new Error('All fields are required');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new Error('Incorrect password');

    await prisma.user.delete({ where: { id: userId } });

    return { message: 'Account deleted successfully' };
};
