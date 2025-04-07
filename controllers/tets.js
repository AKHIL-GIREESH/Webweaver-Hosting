const path = require("path");
const fs = require("fs");
const terraformDir = __dirname;
const instanceIpPath = path.join(terraformDir, "instance_ip.txt");
const instanceIp = fs.readFileSync(instanceIpPath, "utf8").trim();

console.log(instanceIp)