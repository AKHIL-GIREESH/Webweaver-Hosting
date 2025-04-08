const mongoose = require("mongoose")
mongoose.pluralize(null);

const dbConnect = (url) => mongoose.connect(url)

module.exports = dbConnect