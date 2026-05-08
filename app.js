require("dotenv").config();
const express = require("express");
const path = require("path");
const storeRouter = require("./routes/storeRouter");
const hostRouter = require("./routes/hostRouter");
const authRouter = require("./routes/authRouter");
const rootDir = require("./utils/pathUtil");
const errorsController = require("./controllers/errors");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // ✅ Vercel ke liye absolute path

const MONGO_URL = process.env.MONGO_URL;

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer
const storage = multer.memoryStorage();
const multerOptions = { storage };

// MongoDB connect (async, serverless safe)
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  await mongoose.connect(MONGO_URL, {
    tls: true,
    tlsAllowInvalidCertificates: true,
  });
  isConnected = true;
  console.log("✅ MongoDB Connected");
};

// Store
const store = new MongoDBStore({
  uri: MONGO_URL,
  collection: "sessions",
});

// Middlewares
app.use(express.static(path.join(__dirname, "public"))); // ✅ Absolute path
app.use(express.urlencoded({ extended: true }));
app.use(
  multer(multerOptions).fields([
    { name: "photo", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ])
);

app.use(
  session({
    secret: "Knowledge Gate AI",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // ✅ Vercel pe true hoga
      sameSite: "none", // ✅ Vercel ke liye none chahiye
    },
  })
);

// DB connect middleware (har request pe)
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.get("/health", (req, res) => res.status(200).send("OK"));

app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn;
  res.locals.userType = req.session.user ? req.session.user.userType : null;
  next();
});

app.use((req, res, next) => {
  req.isLoggedIn = req.session.isLoggedIn;
  next();
});

// Routes
app.use(storeRouter);
app.use(authRouter);
app.use("/host", hostRouter);
app.use(errorsController.pageNotFound);

// ✅ Local development ke liye listen, Vercel ke liye export
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
  });
}

module.exports = app; // ✅ Vercel ke liye zaroori