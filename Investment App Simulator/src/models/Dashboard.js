const prisma = require('./prismaClient');

const fetch = require("node-fetch");
const FINNHUB_API_KEY = "cua8sqhr01qkpes4fvrgcua8sqhr01qkpes4fvs0"; 

//////////////////////////////////////////////////////
// GET MARKET NEWS
//////////////////////////////////////////////////////
exports.getAllNews = function getAllNews(category = "general") {
    if (!category) {
      throw new Error("Category parameter is required");
    }
  
    const url = `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`;
  
    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Finnhub API error: ${response.statusText}`);
        }
        return response.json();
      })
      .then((newsData) => {
        return newsData.map((news) => ({
          news_id: news.id, // Finnhub news ID
          title: news.headline,
          caption: news.summary.substring(0, 255), // Limit to 255 characters
          content: news.summary, // Assuming full content isn't available
          category: news.category || category, // Use API category or fallback to requested
          tags: news.related ? news.related.split(",") : [] // Convert related to an array
        }));
      })
      .catch((error) => {
        console.error("Error fetching market news:", error);
        throw error;
      });
  };


//////////////////////////////////////////////////////
// UPDATE NEWS CATEGORY
//////////////////////////////////////////////////////
module.exports.updateNewsCategory = async function updateNewsCategory(id, category) {
    return prisma.news.update({
        where: {news_id: parseInt(id, 10)},
        data: { category: category }
    });
};



//////////////////////////////////////////////////////
// GET CATEGORY COUNTS
//////////////////////////////////////////////////////
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
