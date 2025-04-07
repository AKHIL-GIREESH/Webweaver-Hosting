const router = require("express").Router()
const {hostReact} = require("../controllers/reactProject")

router.route("/").post(hostReact)

module.exports = router