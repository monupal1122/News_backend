const express = require("express");
const router = express.Router();
const { restrictTo } = require("../middlewares/authMiddleware")
const { upload } = require('../config/cloudinary');
const {
  AdsCreate,
  AdsUpdate,
  Adsdelete,
  AllAds
} = require("../controllers/adscontroller");

// ONLY ADMIN 

// CREATE AD
router.post("/admin/", restrictTo('admin'), upload.single('image'), AdsCreate);


// UPDATE AD
router.put("/adsupdate/:id", restrictTo('admin'), upload.single('image'), AdsUpdate);

// DELETE AD
router.delete("/adsdelete/:id", restrictTo('admin'), Adsdelete);





// ONLY AUTHORS 

// CREATE AD
router.post("/author/", upload.single('image'), AdsCreate);


// UPDATE AD
router.put("/adsupdate/:id", upload.single('image'), AdsUpdate);

// DELETE AD
router.delete("/adsdelete/:id", Adsdelete);

// GET ALL PUBLIC ADS (FOR FRONTEND)
router.get("/", AllAds);





module.exports = router;
