const router = require("express").Router();
const { getDeploymentsByAuthor } = require("../controllers/deployments");

router.route("/:author").get(getDeploymentsByAuthor);

module.exports = router;
