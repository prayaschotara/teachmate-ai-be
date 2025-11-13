const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const errorHandler = require("./src/middlewares/errorHandler");
dotenv.config();

//Import all API routes
const testRouter = require("./src/routes/test.router");

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
const port = 3000;

app.use("/api", testRouter);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.json({ msg: "Hello World!" });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
