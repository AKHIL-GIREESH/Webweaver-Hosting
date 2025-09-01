const express = require("express");
const cors = require("cors");
//const {hostt} = require("./alt")
const reactRouter = require("./routes/reactProjectRoute");
const webRouter = require("./routes/websiteProjectRouter");
const deploymentRouter = require("./routes/deployments");
const dbConnect = require("./database/dbConnect");
const app = express();
require("dotenv").config();

app.use(cors());
app.use(express.json());
app.use("/api/v1/react/", reactRouter);
app.use("/api/v1/website/", webRouter);
app.use("/api/v1/deployments/", deploymentRouter);

// app.get("/host", () => {
//     hostt()
//     res.status(200).json({message:"Hello"})
// })

app.listen(process.env.PORT, () => {
  console.log(process.env.PORT);
  dbConnect(process.env.MONGODB_URI)
    .then(() => console.log("Server is running"))
    .catch((e) => console.log(e));
});
