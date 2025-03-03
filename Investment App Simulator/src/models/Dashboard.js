const prisma = require('./prismaClient');


// Fetch all news articles
module.exports.getAllNews = async function getAllNews() {
    return prisma.news.findMany();
}


// Update the category of a specific news item
module.exports.updateNewsCategory = async function updateNewsCategory(id, category) {
    return prisma.news.update({
        where: {news_id: parseInt(id, 10)},
        data: { category: category }
    });
};

// module.exports.updateNewsCategory = async (req, res) => {
//     const { news_id } = req.params; // Expecting from URL (e.g., /dashboard/news/1)
//     const { category } = req.body;  // Category from the request body

//     if (!news_id || !category) {
//         return res.status(400).json({ error: 'news_id and category are required.' });
//     }

//     try {
//         // Convert `news_id` to an integer if necessary (assuming Prisma expects a number).
//         const updatedNews = await prisma.news.update({
//             where: { news_id: parseInt(news_id, 10) },
//             data: { category },
//         });

//         res.status(200).json({ message: 'News category updated successfully.', news: updatedNews });
//     } catch (error) {
//         console.error('Error updating news category:', error);
//         res.status(500).json({ error: 'Failed to update news category.' });
//     }
// };


// Get the count of news articles in each category
module.exports.getCategoryCounts = async () => {
    const categories = await prisma.news.groupBy({
        by: ['category'],
        _count: {
            category: true,
        },
    });

    const categoryCounts = {};
    categories.forEach((cat) => {
        categoryCounts[cat.category] = cat._count.category;
    });
    return categoryCounts;
}