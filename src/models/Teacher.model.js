const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      match: [
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#\-])/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^[0-9]{10,15}$/, "Please provide a valid phone number"],
    },
    classes: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        class_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Class",
          required: true,
        },
      },
    ],
    grades: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        grade_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Grade",
          required: true,
        },
      },
    ],
    subjects: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        grade_ids: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Grade",
          },
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Teacher", teacherSchema);
