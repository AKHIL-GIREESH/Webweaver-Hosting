const router = require("express").Router()
const {hostReact} = require("../controllers/reactProject")
const {getProject,HostProject} = require("../website/hostWeb")

router.route("/:id").post(HostProject)


module.exports = router