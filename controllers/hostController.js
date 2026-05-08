const Home = require("../Models/home");
const cloudinary = require("cloudinary").v2;
const axios = require("axios");
const FormData = require("form-data");

exports.getAddHome = (req, res, next) => {
  res.render("host/edit-home", {
    pageTitle: "Add Home to airbnd",
    pageName: "AddHome",
    editing: false,
    isLoggedIn: req.isLoggedIn,
  });
};

exports.addHostHome = (req, res, next) => {
  Home.find()
    .then((registeredHome) => {
      // 🔍 DEBUG
      console.log("=== DEBUG INFO ===");
      console.log("Number of homes:", registeredHome.length);
      console.log("Type of first home price:", typeof registeredHome[0]?.price);
      console.log(
        "First home data:",
        JSON.stringify(registeredHome[0], null, 2),
      );
      console.log("==================");

      const homes = registeredHome.map((home) => {
        const obj = home.toObject();
        console.log("Price value:", obj.price, "Type:", typeof obj.price);
        return obj;
      });

      res.render("host/host-home-list", {
        registeredHome: homes,
        pageTitle: "Host Homes List",
        pageName: "Host Home",
        isLoggedIn: req.isLoggedIn,
      });
    })
    .catch((err) => {
      console.log("ERROR in addHostHome:", err);
      res.render("host/host-home-list", {
        registeredHome: [],
        pageTitle: "Host Homes List",
        pageName: "Host Home",
        isLoggedIn: req.isLoggedIn,
      });
    });
};

exports.postAddHome = async (req, res, next) => {
  try {
    console.log("🔥 POST ADD HOME CALLED");

    const { houseName, price, location, rating, description } = req.body;

    let photo = "";
    let pdf = "";

    // ✅ IMAGE → CLOUDINARY
    if (req.files?.photo) {
      const imageFile = req.files.photo[0];

      const base64Image =
        `data:${imageFile.mimetype};base64,` +
        imageFile.buffer.toString("base64");

      const cloudinaryResult = await cloudinary.uploader.upload(base64Image, {
        folder: "airbnd_homes",
      });

      photo = cloudinaryResult.secure_url;

      console.log("✅ IMAGE UPLOADED:", photo);
    }

    // ✅ PDF → UPLOAD.IO
    if (req.files?.pdf) {
  const pdfFile = req.files.pdf[0];

  console.log("📄 PDF FOUND:", pdfFile.originalname);

  const formData = new FormData();

  formData.append("file", pdfFile.buffer, {
    filename: pdfFile.originalname,
    contentType: "application/pdf",
  });

  const response = await axios.post(
    "https://api.bytescale.com/v2/accounts/W142bQ7/uploads/binary",
    formData,
    {
      headers: {
        Authorization: `Bearer ${process.env.UPLOAD_IO_API_KEY}`,
        ...formData.getHeaders(),
      },
    }
  );

  pdf = response.data.fileUrl;

  console.log("✅ PDF UPLOADED:", pdf);
}

    const home = new Home({
      houseName,
      price,
      location,
      rating,
      photo,
      pdf,
      description,
      userId: req.session.user._id,
    });

    await home.save();

    console.log("✅ HOME SAVED");

    res.redirect("/host/host-home-list");
  } catch (error) {
    console.log("❌ ERROR:", error);

    res.redirect("/host/host-home-list");
  }
};
exports.getEditHome = (req, res, next) => {
  const homeId = req.params.homeId;
  const editing = req.query.editing === "true";
  Home.findById(homeId).then((home) => {
    if (!home) {
      return res.redirect("/host/host-home-list");
    }
    res.render("host/edit-home", {
      home: home,
      pageTitle: "Edit Your Home",
      pageName: "Host Home",
      editing: editing,
      isLoggedIn: req.isLoggedIn,
    });
  });
};

exports.postEditHome = async (req, res, next) => {
  try {
    const { _id, houseName, price, location, rating, description } = req.body;

    const home = await Home.findById(_id);

    if (!home) {
      return res.redirect("/host/host-home-list");
    }

    home.houseName = houseName;
    home.price = price;
    home.location = location;
    home.rating = rating;
    home.description = description;

    // ✅ IMAGE → CLOUDINARY
    if (req.files?.photo) {
      const imageFile = req.files.photo[0];

      const base64Image =
        `data:${imageFile.mimetype};base64,` +
        imageFile.buffer.toString("base64");

      const cloudinaryResult = await cloudinary.uploader.upload(base64Image, {
        folder: "airbnd_homes",
      });

      home.photo = cloudinaryResult.secure_url;
    }

    // ✅ PDF → UPLOAD.IO
    if (req.files?.pdf) {
      const pdfFile = req.files.pdf[0];

      const formData = new FormData();

      formData.append("file", pdfFile.buffer, {
  filename: pdfFile.originalname,
  contentType: "application/pdf",
});

      const response = await axios.post(
  "https://api.bytescale.com/v2/accounts/W142bQ7/uploads/binary",
  formData,
  {
    headers: {
      Authorization: `Bearer ${process.env.UPLOAD_IO_API_KEY}`,
      ...formData.getHeaders(),
    },
  }
);

// 🔥 FORCE CLEAN FILE NAME
const cleanName = pdfFile.originalname.replace(/\s/g, "-");

pdf = response.data.fileUrl + `?download=${cleanName}.pdf`;

console.log("✅ PDF UPLOADED:", pdf);

      home.pdf = response.data.fileUrl;
    }

    await home.save();

    console.log("✅ HOME UPDATED");

    res.redirect("/host/host-home-list");
  } catch (err) {
    console.log("❌ Error updating home:", err);

    res.redirect("/host/host-home-list");
  }
};

exports.postDeleteHome = (req, res, next) => {
  const homeId = req.params.homeId;
  Home.findByIdAndDelete(homeId)
    .then(() => {
      res.redirect("/host/host-home-list");
    })
    .catch((error) => {
      console.log("Error deleting home:", error);
    });
};

// hostController.js mein ye function add karo
// hostController.js mein getHostBookings function update karo

// hostController.js mein getHostBookings function update karo

exports.getHostBookings = async (req, res, next) => {
  try {
    // Sirf host ko dikhao
    if (!req.session.isLoggedIn || req.session.user.userType !== "host") {
      return res.redirect("/");
    }

    const Booking = require("../Models/booking");
    const Home = require("../Models/home");

    console.log("Host ID:", req.session.user._id); // Debug

    // Host ke saare homes find karo
    const hostHomes = await Home.find({ userId: req.session.user._id });
    console.log("Host Homes found:", hostHomes.length); // Debug

    const homeIds = hostHomes.map((home) => home._id);
    console.log("Home IDs:", homeIds); // Debug

    // In homes ki saari bookings find karo
    const bookings = await Booking.find({
      homeId: { $in: homeIds },
    })
      .populate("homeId")
      .sort({ bookingDate: -1 });

    console.log("Bookings found:", bookings.length); // Debug

    res.render("host/bookings", {
      bookings: bookings,
      pageTitle: "My Homes Bookings",
      pageName: "Host Bookings",
      isLoggedIn: req.isLoggedIn,
    });
  } catch (err) {
    console.log("Error fetching host bookings:", err);
    res.redirect("/host/host-home-list");
  }
};
