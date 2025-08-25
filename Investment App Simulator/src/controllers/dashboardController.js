const dashboardModel = require('../models/Dashboard');

//////////////////////////////////////////////////////
// GET MARKET NEWS
//////////////////////////////////////////////////////
module.exports.getNews = function (req, res) {
    // Get the category from the query, default to 'general' if not provided
    const category = req.query.category || "general";
  
    dashboardModel
      .getAllNews(category)
      .then((news) => res.status(200).json(news))
      .catch((error) => {
        console.error("Error in getMarketNewsController:", error);
        return res.status(500).json({ message: "Error fetching market news", error: error.message });
      });
  };



//////////////////////////////////////////////////////
// UPDATE NEWS CATEGORY
//////////////////////////////////////////////////////
module.exports.updateNewsCategory = function (req, res) {
    const { news_id } = req.params;
    const { category } = req.body;

    // Validate inputs
    if (!news_id || !category) {
        return res.status(400).json({ error: 'news_id and category are required.' });
    }

    // Call model to update the category
    return dashboardModel
        .updateNewsCategory(parseInt(news_id), category)
        .then(function (updatedNews) {
            return res.status(200).json({
                message: 'News category updated successfully.',
                data: updatedNews,
            });
        })
        .catch(function (error) {
            console.error('Error updating news category:', error);
            return res.status(500).json({ error: 'Failed to update category.' });
        });
};