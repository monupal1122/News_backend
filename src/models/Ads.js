// models/Ad.js
const mongoose = require("mongoose");

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  imageUrl: {
    type: String,
    required: true,
  },

  redirectUrl: {
    type: String,
    required: true,
  },

  width: {
    type: Number,
  },

  height: {
    type: Number,
  },

  placement: {
    type: String,
    enum: [
      "hero",
      "header",
      "sidebar",
      "inline",
      "footer",
      "popup"
    ],
    required: true,
  },

  status: {
    type: String,
    enum: ["active", "paused"],
    default: "active",
  },

  startDate: Date,
  endDate: Date,

  impressions: {
    type: Number,
    default: 0,
  },

  clicks: {
    type: Number,
    default: 0,
  },

  priority: {
    type: Number,
    default: 1,
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },

}, { timestamps: true });

module.exports = mongoose.model("Ad", adSchema);
