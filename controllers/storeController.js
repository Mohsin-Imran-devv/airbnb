const Home = require("../Models/home");
const User = require("../Models/user");
const Booking = require("../Models/booking");
const axios = require("axios");
const path = require('path');
const rootDir = require("../utils/pathUtil");
exports.addIndex = async (req, res, next) => {
  try {
    const registeredHome = await Home.find();
    const Booking = require("../Models/booking");
    const allBookings = await Booking.find().select('homeId');
    const bookedHomeIds = allBookings.map(b => b.homeId.toString());
    
    res.render("store/index", {
      registeredHome: registeredHome,
      bookedHomeIds: bookedHomeIds,  // ✅ Ab globally booked homes
      pageTitle: "airbnd Home",
      pageName: "index",
      isLoggedIn: req.isLoggedIn,
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

exports.addHome = (req, res, next) => {
  Home.find().then((registeredHome) => {
    res.render("store/home-list", {
      registeredHome: registeredHome,
      pageTitle: "Homes List",
      pageName: "Home",
      isLoggedIn: req.isLoggedIn,
    });
  });
};


// ✅ SIRF YEH FUNCTION CHANGE KARO - user check add karo
exports.getFavoriteList = async (req, res, next) => {
  // Check if user exists in session
  if (!req.session || !req.session.user || !req.session.user._id) {
    return res.redirect("/login");
  }

  const userId = req.session.user._id;
  const user = await User.findById(userId).populate("favourites");
  res.render("store/favorite-list", {
    favouriteHomes: user.favourites,
    pageTitle: "My Favourites",
    pageName: "favourites",
    isLoggedIn: req.isLoggedIn,
  });
};

// ✅ AUR YEH FUNCTION CHANGE KARO - user check add karo
exports.postAddToFavorites = async (req, res, next) => {
  // Check if user exists in session
  if (!req.session || !req.session.user || !req.session.user._id) {
    return res.redirect("/login");
  }

  const homeId = req.body.id.toString();
  const userId = req.session.user._id;
  const user = await User.findById(userId);
  if (!user.favourites.includes(homeId)) {
    user.favourites.push(homeId);
    await user.save();
  }
  res.redirect("/favourites");
};

// ✅ AUR YEH FUNCTION CHANGE KARO - user check add karo
exports.postRemoveFromFavorites = async (req, res, next) => {
  // Check if user exists in session
  if (!req.session || !req.session.user || !req.session.user._id) {
    return res.redirect("/login");
  }

  const homeId = req.params.homeId;
  const userId = req.session.user._id;
  const user = await User.findById(userId);
  if (user.favourites.includes(homeId)) {
    user.favourites = user.favourites.filter((fav) => fav != homeId);
    await user.save();
  }
  res.redirect("/favourites");
};

exports.getHomeDetails = (req, res, next) => {
  const homeId = req.params.homeId;
  Home.findById(homeId).then((home) => {
    if (!home) {
      res.redirect("/");
    } else {
      res.render("store/home-detail", {
        home: home,
        pageTitle: "Home Detail",
        pageName: "Home",
        isLoggedIn: req.isLoggedIn,
      });
    }
  });
};

exports.getHouseRules = [
  (req, res, next) => {
    if (!req.session.isLoggedIn) {
      return res.redirect("/login");
    }
    next();
  },

  async (req, res, next) => {
    try {
      const homeId = req.params.homeId;
      const home = await Home.findById(homeId);
      
      if (!home || !home.pdf) {
        return res.redirect("/");
      }

      // ✅ Cloudinary PDF ko naye tab mein open karne do
      res.redirect(home.pdf);
      
    } catch (err) {
      console.log("Error:", err);
      res.redirect("/");
    }
  },
];
// GET request - Booking form show karo
exports.getConfirmBooking = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn) {
      return res.redirect("/login");
    }
    
    const homeId = req.params.homeId;
    const home = await Home.findById(homeId);
    
    if (!home) {
      return res.redirect("/");
    }
    
    res.render("store/confirm-booking", {
      home: home,
      pageTitle: "Confirm Booking",
      pageName: "Confirm Booking",
      isLoggedIn: req.isLoggedIn,
    });
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
};

// POST request - Actual booking save karo
exports.postConfirmBooking = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn) {
      return res.redirect("/login");
    }

    console.log("Request Body:", req.body);

    const homeId = req.params.homeId;
    const { checkIn, checkOut, guests } = req.body;
    
    if (!checkIn || !checkOut || !guests) {
      console.log("Missing fields:", { checkIn, checkOut, guests });
      return res.redirect(`/confirm-booking/${homeId}`);
    }

    const userId = req.session.user._id;
    const user = await User.findById(userId);
    const home = await Home.findById(homeId);

    if (!home || !user) {
      return res.redirect("/");
    }

    // Calculate total price
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    const totalPrice = home.price * nights;

    // ✅ YEH LINE HATA DO - upar already require kar liya
    // const Booking = require("../Models/booking");
    
    const userName = user.firstName || user.email || "Guest";
    const userEmail = user.email || "No email";

    const booking = new Booking({
      homeId: home._id,
      userId: user._id,
      userName: userName,
      userEmail: userEmail,
      checkIn,
      checkOut,
      guests: parseInt(guests),
      totalPrice,
    });

    await booking.save();
    console.log("Booking saved successfully!");
    
    res.redirect("/host/bookings");
  } catch (err) {
    console.log("Error confirming booking:", err);
    res.redirect("/");
  }
};

// PDF Download Proxy
exports.downloadPdf = async (req, res, next) => {
  try {
    if (!req.session.isLoggedIn) {
      return res.redirect("/login");
    }

    const homeId = req.params.homeId;
    const home = await Home.findById(homeId);

    if (!home || !home.pdf) {
      return res.redirect("/");
    }

    // PDF ko server se fetch karo
    const response = await axios({
      method: "GET",
      url: home.pdf,
      responseType: "stream",
    });

    const fileName = `${home.houseName.replace(/\s+/g, "-")}-Rules.pdf`;

    // ✅ Yeh headers browser ko force karenge PDF download karne ke liye
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    response.data.pipe(res);
  } catch (err) {
    console.log("PDF Download Error:", err);
    res.redirect("/");
  }
};