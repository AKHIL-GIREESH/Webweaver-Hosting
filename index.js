const express = require("express")
const cors = require("cors")

const app = express()
require("dotenv")

app.use(cors())
app.use(express.json())

app.get("/",(req,res) => {
    res.status(200).json({message:"Hello"})
})


app.listen(3001,() => console.log("Server is up and Running"))