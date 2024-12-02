const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5038;

// MongoDB connection string
const CONNECTION_STRING = process.env.MONGO_URI || "your_default_mongo_uri";

// Middleware
app.use(
  cors({
    origin: ["https://sl.pinkpulsehealth.info"], // Frontend URL
    credentials: true, // Allow credentials (cookies, authorization headers)
  })
);
app.use(express.json());
app.use(morgan("combined"));
app.use(helmet()); // Add security headers

// Rate limiter middleware to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});
app.use(limiter);

// Set mongoose to use strictQuery
mongoose.set("strictQuery", true);

// MongoDB connection
mongoose
  .connect(CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connection successful"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// User Schema and Model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  whatsappNumber: { type: String, required: true },
  dob: { type: Date, required: true },
});

const User = mongoose.model("User", UserSchema);

// Middleware for JWT Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract the token from "Bearer <token>"

  if (!token) return res.status(401).send({ msg: "Access token missing or invalid" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send({ msg: "Access token missing or invalid" });
    req.user = user;
    next();
  });
};

// Sign Up Route
app.post("/signup", async (req, res) => {
  try {
    const { email, password, whatsappNumber, dob } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ msg: "Email already exists" });
    }

    // Hash the password and save the user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, whatsappNumber, dob });
    await user.save();
    res.status(201).send({ msg: "User registered successfully", user });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});

// Sign In Route
app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ msg: "User not found" });
    }

    // Check password validity
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ msg: "Invalid password" });
    }

    // Create and send a JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(200).send({ msg: "Sign In Successful", token });
  } catch (error) {
    res.status(500).send({ msg: "An error occurred", error });
  }
});

// Clinic Schema and Model
const ClinicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
});

const Clinic = mongoose.model("Clinic", ClinicSchema, "clinic");

// Route to get clinic data
app.get("/api/clinic/GetData", async (req, res) => {
  try {
    const clinics = await Clinic.find();
    console.log("Fetched clinics:", clinics); // Debug log
    res.status(200).send(clinics);
  } catch (error) {
    console.error("Error fetching clinic data:", error); // Detailed error log
    res.status(500).send({ msg: "Error fetching clinic data", error: error.message });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error stack for debugging
  res.status(500).send({ msg: "Something went wrong! Please try again later." });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
