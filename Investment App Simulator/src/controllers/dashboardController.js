const dashboardModel = require('../models/Dashboard');

module.exports.getNews = async function (req, res) {
    return dashboardModel
        .getAllNews()
        .then(function (news) {
            return res.status(200).json(news);
        })
        .catch(function (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        });
}

// module.exports.updateNewsCategory = function (req, res) {
//     const { id } = req.params;
//     const { category } = req.body;

//     if (!category) {
//         return res.status(400).json({ error: 'Category is required' });
//     }

//     return dashboardModel
//         .updateNewsCategory(id, category)
//         .then(function (news) {
//             return res.status(200).json({ message: 'News category updated successfully' });
//         })
//         .catch(function (error) {
//             console.error(error);
//             return res.status(500).json({ error: error.message });
//         });
// }

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