const express = require("express")
const cors = require("cors")
const {hostt} = require("./alt") 
const reactRouter = require("./routes/reactProjectRoute")
const app = express()
require("dotenv")

app.use(cors())
app.use(express.json())
app.use("/api/v1/react/",reactRouter)

// app.get("/host", () => {
//     hostt()
//     res.status(200).json({message:"Hello"})
// })


app.listen(3001,() => console.log("Server is up and Running")) 