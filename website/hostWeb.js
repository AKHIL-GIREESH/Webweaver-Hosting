const Website = require("../models/websiteSchema");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const Hosting = require("../models/hostingSchema");

function waitForSSH(instanceIp, sshKey) {
  console.log(`⏳ Waiting for SSH to become available at ${instanceIp}...`);

  let sshReady = false;
  const maxRetries = 10;
  let retries = 0;

  while (!sshReady && retries < maxRetries) {
    try {
      execSync(
        `ssh -o StrictHostKeyChecking=no -i ${sshKey} ubuntu@${instanceIp} "echo SSH Ready"`,
        { stdio: "inherit" }
      );
      sshReady = true;
    } catch (error) {
      retries++;
      console.log(
        `🔄 SSH not ready yet. Retrying (${retries}/${maxRetries})...`
      );
      execSync("sleep 15");
    }
  }

  if (!sshReady) {
    throw new Error("❌ SSH is still not available after multiple retries.");
  }

  console.log("✅ SSH is now available!");
}

const HostProject = async (req, res) => {
  try {
    const { id } = req.params;
    const sshKey = "/Users/akhilgireesh/.ssh/id_rsa";
    const terraformDir = __dirname;

    console.log(`🔍 Looking up project with ID: ${id}`);
    const website = await Website.findById(id);

    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    const { code, title, thumbnail, author } = website;

    console.log("🚀 Initializing Terraform...");
    execSync("terraform init", { cwd: terraformDir, stdio: "inherit" });

    console.log("🚀 Applying Terraform...");
    execSync("terraform apply -auto-approve", {
      cwd: terraformDir,
      stdio: "inherit",
    });

    console.log("✅ Terraform applied successfully!");

    const instanceIpPath = path.join(terraformDir, "instance_ip.txt");
    const instanceIp = fs.readFileSync(instanceIpPath, "utf8").trim();
    console.log(`📌 Instance IP: ${instanceIp}`);

    console.log("⏳ Waiting for instance to initialize SSH...");
    waitForSSH(instanceIp, sshKey);

    const localJsonPath = path.join(__dirname, "web.json");

    // 🔧 Convert Map to plain object & save as web.json
    const codeObject = Object.fromEntries(code);
    fs.writeFileSync(localJsonPath, JSON.stringify(codeObject, null, 2));
    console.log("📝 web.json created.");

    // 📦 Send web.json to EC2
    console.log("📤 Sending web.json to instance...");
    execSync(
      `scp -i ${sshKey} ${localJsonPath} ubuntu@${instanceIp}:/home/ubuntu/webweaver-website/src/web.json`,
      {
        stdio: "inherit",
      }
    );

    console.log("🚀 Starting Vite dev server in background...");
    execSync(
      `ssh -f -i ${sshKey} ubuntu@${instanceIp} 'cd /home/ubuntu/webweaver-website && npm install && nohup npm run dev -- --host 0.0.0.0 > vite.log 2>&1'`,
      { stdio: "ignore" }
    );

    console.log("✅ Vite dev server started remotely!");

    // Save hosting details to MongoDB
    const newHosting = new Hosting({
      title: title,
      thumbnail: thumbnail || "",
      author: author,
      ip: instanceIp,
    });

    try {
      const savedHosting = await newHosting.save();
      console.log("✅ New hosting entry saved to MongoDB:", savedHosting._id);
    } catch (err) {
      console.error("❌ Error saving hosting entry:", err.message);
    }

    console.log("✅ Project hosted successfully!");
    res
      .status(200)
      .json({ message: "Hosted successfully", instanceIp, website });
  } catch (err) {
    console.error("❌ Error in HostProject:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { HostProject };
