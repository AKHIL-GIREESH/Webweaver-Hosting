const mongoose = require('mongoose');
mongoose.pluralize(null);
const { Schema, Types } = mongoose;

const WebsiteSchema = new Schema({
  title: { type: String, required: false },
  thumbnail: { type: String, required: false },
  author: { type: Types.ObjectId, ref: 'test1', required: false }, // Assuming 'author' refers to a 'User' model
  like: { type: Number, required: false },
  tags: { type: [String], required: false },
  code: { type: Map, of: Schema.Types.Mixed, required: false }, // Equivalent to `map[string]interface{}` in Go
  kind: { type: String, required: false }
});

const Website = mongoose.model('project', WebsiteSchema,'project');

module.exports = Website;
