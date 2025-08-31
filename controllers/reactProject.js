const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const Hosting = require("../models/hostingSchema");

function waitForSSH(instanceIp) {
  console.log(`⏳ Waiting for SSH to become available at ${instanceIp}...`);

  let sshReady = false;
  const maxRetries = 10;
  let retries = 0;

  while (!sshReady && retries < maxRetries) {
    try {
      execSync(
        `ssh -o StrictHostKeyChecking=no -i /Users/akhilgireesh/.ssh/id_rsa ubuntu@${instanceIp} "echo SSH Ready"`,
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

// Add this function to your script
function waitForJenkins(instanceIp) {
  console.log(`⏳ Waiting for Jenkins to become available...`);

  let jenkinsReady = false;
  const maxRetries = 15;
  let retries = 0;

  while (!jenkinsReady && retries < maxRetries) {
    try {
      // Get more detailed information for debugging
      console.log(`Attempt ${retries + 1}: Checking Jenkins status...`);

      // Run a more detailed check and capture the full output
      const fullHeaders = execSync(
        `ssh -o StrictHostKeyChecking=no -i /Users/akhilgireesh/.ssh/id_rsa ubuntu@${instanceIp} "curl -s -I http://localhost:8080/"`,
        { stdio: "pipe" }
      ).toString();

      console.log("Jenkins response headers:");
      console.log(fullHeaders);

      // Check status code
      const statusCode = execSync(
        `ssh -o StrictHostKeyChecking=no -i /Users/akhilgireesh/.ssh/id_rsa ubuntu@${instanceIp} "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/"`,
        { stdio: "pipe" }
      )
        .toString()
        .trim();

      console.log(`Status code: ${statusCode}`);

      if (
        statusCode === "200" ||
        statusCode === "302" ||
        statusCode === "403"
      ) {
        // Accept 200 (OK), 302 (redirect), or 403 (forbidden) as signs that Jenkins is running
        console.log(
          "Jenkins appears to be running. Checking if CLI is accessible..."
        );

        // Try a simple Jenkins CLI command that doesn't require much permission
        try {
          execSync(
            `ssh -o StrictHostKeyChecking=no -i /Users/akhilgireesh/.ssh/id_rsa ubuntu@${instanceIp} "java -jar jenkins-cli.jar -s http://localhost:8080/ -auth webweaveradmin:password who-am-i"`,
            { stdio: "pipe" }
          );
          jenkinsReady = true;
          console.log("Jenkins CLI is accessible!");
        } catch (cliError) {
          console.log(
            "Jenkins is up but CLI may not be ready yet:",
            cliError.message
          );
          throw new Error("CLI not ready");
        }
      } else {
        throw new Error(
          `Jenkins returned unexpected status code: ${statusCode}`
        );
      }
    } catch (error) {
      retries++;
      console.log(
        `🔄 Jenkins not fully ready yet. Retrying (${retries}/${maxRetries})...`
      );
      execSync("sleep 20");
    }
  }

  if (!jenkinsReady) {
    throw new Error(
      "❌ Jenkins is still not fully available after multiple retries."
    );
  }

  console.log("✅ Jenkins and CLI are now available!");
}

const hostReact = async (req, res) => {
  try {
    const githubUrl = "https://github.com/AKHIL-GIREESH/reactTesting.git";
    const entrypoint = "/testingApp1";
    const framework = "react";

    console.log(req.body);

    let instanceIp;

    if (req.body.instanceip.length === 0) {
      const terraformDir = __dirname;

      console.log("🚀 Initializing Terraform...");
      execSync("terraform init", { cwd: terraformDir, stdio: "inherit" });

      console.log("🚀 Running Terraform...");
      execSync("terraform apply -auto-approve", {
        cwd: terraformDir,
        stdio: "inherit",
      });
      console.log("✅ Terraform applied successfully!");

      const instanceIpPath = path.join(terraformDir, "instance_ip.txt");
      instanceIp = fs.readFileSync(instanceIpPath, "utf8").trim();
    } else {
      instanceIp = req.body.instanceip;
    }

    console.log(`📌 Instance IP: ${instanceIp}`);

    console.log("⏳ Waiting for instance to initialize...");

    waitForSSH(instanceIp);
    waitForJenkins(instanceIp);

    console.log("📁 Writing GitHub URL and configurations to instance...");
    execSync(
      `ssh -o StrictHostKeyChecking=no -i /Users/akhilgireesh/.ssh/id_rsa ubuntu@${instanceIp} '
        echo "${githubUrl}" | sudo tee /var/lib/jenkins/github_url.txt > /dev/null &&
        echo "${entrypoint}" | sudo tee /var/lib/jenkins/entrypoint.txt > /dev/null &&
        echo "${framework}" | sudo tee /var/lib/jenkins/framework.txt > /dev/null &&
        # Download CLI jar if needed
        if [ ! -f jenkins-cli.jar ]; then
            curl -s http://localhost:8080/jnlpJars/jenkins-cli.jar -o jenkins-cli.jar
        fi &&
        java -jar jenkins-cli.jar -s http://localhost:8080/ -auth "webweaveradmin:password" build "testOfMyFate"
    '`,
      { stdio: "inherit" }
    );

    console.log("✅ All configurations saved successfully!");
    console.log("🚀 Jenkins build 'testOfMyFate' triggered!");

    const newHosting = new Hosting({
      title: req.body.title,
      thumbnail: req.body.thumbnail || "",
      author: req.body.author,
      ip: instanceIp,
    });

    try {
      const savedHosting = await newHosting.save();
      console.log("✅ New hosting entry saved to MongoDB:", savedHosting._id);
    } catch (err) {
      console.error("❌ Error saving hosting entry:", err.message);
    }

    console.log("🎉 Instance created & URLs stored successfully!");

    res.status(200).json({ url: instanceIp });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { hostReact };
