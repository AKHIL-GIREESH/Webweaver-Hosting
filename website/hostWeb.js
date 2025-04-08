const Website = require('../models/websiteSchema'); 

function waitForSSH(instanceIp) {
    console.log(`⏳ Waiting for SSH to become available at ${instanceIp}...`);

    let sshReady = false;
    const maxRetries = 10;
    let retries = 0;

    while (!sshReady && retries < maxRetries) {
        try {
            execSync(`ssh -o StrictHostKeyChecking=no -i /Users/akhilgireesh/.ssh/id_rsa ubuntu@${instanceIp} "echo SSH Ready"`, { stdio: "inherit" });
            sshReady = true;
        } catch (error) {
            retries++;
            console.log(`🔄 SSH not ready yet. Retrying (${retries}/${maxRetries})...`);
            execSync("sleep 15");
        }
    }

    if (!sshReady) {
        throw new Error("❌ SSH is still not available after multiple retries.");
    }

    console.log("✅ SSH is now available!");
}

const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id)

    const website = await Website.findOne({_id:id})

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    res.status(200).json(website);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const HostProject = async (req,res) => {
    try {
        const { id } = req.params;
        console.log(id)
    
        const website = await Website.findOne({_id:id})
    
        if (!website) {
          return res.status(404).json({ error: 'Website not found' });
        }

        const {code} = website
    
        // res.status(200).json(website);

        const terraformDir = __dirname

        console.log("🚀 Initializing Terraform...");
        execSync("terraform init", { cwd: terraformDir, stdio: "inherit" });
    
        console.log("🚀 Running Terraform...");
        execSync("terraform apply -auto-approve", { cwd: terraformDir, stdio: "inherit" });
    
        console.log("✅ Terraform applied successfully!");
    
        const instanceIpPath = path.join(terraformDir, "instance_ip.txt");
        const instanceIp = fs.readFileSync(instanceIpPath, "utf8").trim();

        console.log(`📌 Instance IP: ${instanceIp}`);
    
        console.log("⏳ Waiting for instance to initialize...");
        
        waitForSSH(instanceIp);

        const localJsonPath = path.join(__dirname, 'web.json');

        // 1. Convert `Map` to plain object and write to web.json
        const codeObject = Object.fromEntries(code);
        fs.writeFileSync(localJsonPath, JSON.stringify(codeObject, null, 2));

        // 2. Send `web.json` to instance
        // execSync(`scp -i ${sshKey} ${localJsonPath} ubuntu@${instanceIp}:/home/ubuntu//web.json`, {
        // stdio: 'inherit',
        // });
        res.status(200).json(website);
        
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
}



module.exports = { getProject,HostProject };
