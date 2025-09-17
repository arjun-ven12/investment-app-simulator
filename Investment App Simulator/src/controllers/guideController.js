const guideModel = require('../models/guide');


module.exports.getGuideByIdController = async function (req, res) {
  const { id } = req.params;

  try {
    const guide = await guideModel.getGuideById(id);
    return res.status(200).json({ success: true, guide });
  } catch (error) {
    console.error(error);
    if (error.message === 'Guide not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
