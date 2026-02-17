const Ads = require("../models/Ads");


// CREATE AD
const AdsCreate = async (req, res) => {
  try {
    const adData = { ...req.body };
    if (req.file) {
      adData.imageUrl = req.file.path; // Cloudinary URL
    }

    if (req.admin) {
      adData.author = req.admin._id;
    }

    const newAd = await Ads.create(adData);

    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      const redirectUrl = req.admin && req.admin.role === 'admin' ? '/admin/ads' : '/author/ads';
      return res.redirect(redirectUrl);
    }

    res.status(201).json({
      message: "Ad created successfully",
      data: newAd,
    });

  } catch (error) {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.status(500).send(error.message);
    }
    res.status(500).json({ error: error.message });
  }
};



// UPDATE AD
const AdsUpdate = async (req, res) => {
  try {
    const adData = { ...req.body };
    if (req.file) {
      adData.imageUrl = req.file.path; // Cloudinary URL
    }

    const ad = await Ads.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }

    // Ownership validation
    if (req.admin.role !== 'admin' && ad.author && ad.author.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this ad" });
    }

    const updatedAd = await Ads.findByIdAndUpdate(
      req.params.id,
      adData,
      { new: true }
    );

    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      const redirectUrl = req.admin && req.admin.role === 'admin' ? '/admin/ads' : '/author/ads';
      return res.redirect(redirectUrl);
    }

    res.status(200).json({
      message: "Ad updated successfully",
      data: updatedAd,
    });

  } catch (error) {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.status(500).send(error.message);
    }
    res.status(500).json({ error: error.message });
  }
};



// DELETE AD
const Adsdelete = async (req, res) => {
  try {
    const ad = await Ads.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }

    // Ownership validation
    if (req.admin.role !== 'admin' && ad.author && ad.author.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this ad" });
    }

    await Ads.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Ad deleted successfully",
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL PUBLIC ADS
const AllAds = async (req, res) => {
  try {
    // Return only active ads for the public frontend, sorted by priority
    const ads = await Ads.find({ status: "active" }).sort({ priority: -1, createdAt: -1 });
    res.status(200).json(ads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  AdsCreate,
  AdsUpdate,
  Adsdelete,
  AllAds
};
