const Hosting = require("../models/hostingSchema");

const getDeploymentsByAuthor = async (req, res) => {
  try {
    const { author } = req.params;
    const deployments = await Hosting.find({ author: author });
    res.status(200).json(deployments);
  } catch (err) {
    console.error("Error fetching deployments by author:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getDeploymentsByAuthor };
