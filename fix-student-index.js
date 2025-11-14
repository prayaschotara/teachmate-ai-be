const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

async function fixStudentIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, { dbName: "teachmate-ai" });
    console.log("Connected to MongoDB");

    // Get the Student collection
    const Student = mongoose.connection.collection("students");

    // Get all indexes
    const indexes = await Student.indexes();
    console.log("Current indexes:", indexes);

    // Drop the old roll_number_1 index
    try {
      await Student.dropIndex("roll_number_1");
      console.log("Dropped old roll_number_1 index");
    } catch (error) {
      console.log("Index roll_number_1 might not exist:", error.message);
    }

    // Create the new compound index
    await Student.createIndex(
      { roll_number: 1, "class.class_name": 1 },
      { unique: true }
    );
    console.log("Created new compound index on roll_number and class.class_name");

    // Verify new indexes
    const newIndexes = await Student.indexes();
    console.log("New indexes:", newIndexes);

    console.log("\nIndex fix completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing index:", error);
    process.exit(1);
  }
}

fixStudentIndex();
