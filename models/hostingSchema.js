const mongoose = require("mongoose");
mongoose.pluralize(null);
const { Schema, Types } = mongoose;

const HostingSchema = new Schema({
  title: { type: String, required: false },
  thumbnail: { type: String, required: false },
  author: { type: Types.ObjectId, ref: "User", required: false },
  ip: { type: String, required: true },
});

const Hosting = mongoose.model("Hosting", HostingSchema, "hostings");

module.exports = Hosting;
