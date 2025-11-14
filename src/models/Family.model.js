const mongoose = require("mongoose");

const childInfoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Child name is required"],
      trim: true,
    },
    roll_number: {
      type: String,
      required: [true, "Roll number is required"],
      trim: true,
    },
    class: {
      type: String,
      required: [true, "Class is required"],
      trim: true,
    },
    grade: {
      type: String,
      required: [true, "Grade is required"],
      trim: true,
    },
    id: {
      type: String,
      required: [true, "Student ID is required"],
      trim: true,
    },
  },
);

const familySchema = new mongoose.Schema(
  {
    father_fname: {
      type: String,
      trim: true,
    },
    father_lname: {
      type: String,
      trim: true,
    },
    mother_fname: {
      type: String,
      trim: true,
    },
    mother_lname: {
      type: String,
      trim: true,
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
    primary_number: {
      type: String,
      required: [true, "Primary number is required"],
      match: [/^[0-9]{10,15}$/, "Please provide a valid phone number"],
    },
    secondary_number: {
      type: String,
      match: [/^[0-9]{10,15}$/, "Please provide a valid phone number"],
    },
    child_info: {
      type: [childInfoSchema],
      required: [true, "At least one child information is required"],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "Child info array cannot be empty",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Custom validation: If father_fname exists, father_lname is required and vice versa
familySchema.pre("save", function (next) {
  // Father name validation
  if (this.father_fname && !this.father_lname) {
    return next(
      new Error("Father's last name is required when first name is provided")
    );
  }
  if (this.father_lname && !this.father_fname) {
    return next(
      new Error("Father's first name is required when last name is provided")
    );
  }

  // Mother name validation
  if (this.mother_fname && !this.mother_lname) {
    return next(
      new Error("Mother's last name is required when first name is provided")
    );
  }
  if (this.mother_lname && !this.mother_fname) {
    return next(
      new Error("Mother's first name is required when last name is provided")
    );
  }

  // At least one parent name should be provided
  if (
    !this.father_fname &&
    !this.father_lname &&
    !this.mother_fname &&
    !this.mother_lname
  ) {
    return next(
      new Error("At least one parent's name (father or mother) is required")
    );
  }

  next();
});

module.exports = mongoose.model("Family", familySchema);
