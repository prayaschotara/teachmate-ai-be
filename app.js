const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const errorHandler = require("./src/middlewares/errorHandler");
dotenv.config();

//Import all API routes
const testRouter = require("./src/routes/test.router");
const teacherRouter = require("./src/routes/teacher.router");
const gradeRouter = require("./src/routes/grade.router");
const classRouter = require("./src/routes/class.router");
const subjectRouter = require("./src/routes/subject.router");
const chapterRouter = require("./src/routes/chapter.router");

const app = express();
mongoose
  .connect(process.env.MONGO_URI, { dbName: "teachmate-ai" })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err)
    process.exit(0)
  });
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
const port = process.env.PORT || 3000;

app.use("/api/teacher", teacherRouter);
app.use("/api/grade", gradeRouter);
app.use("/api/class", classRouter);
app.use("/api/subject", subjectRouter);
app.use("/api/chapter", chapterRouter);
app.use("/api/test", testRouter);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.json({ msg: "Hello World!" });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
