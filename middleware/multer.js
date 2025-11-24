import multer from "multer";
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {

  if (file.fieldname === "image" && file.mimetype.startsWith("image/")) {
    cb(null, true);
  }
  
  else if (
    file.fieldname === "medicalFile" &&
    (file.mimetype === "application/pdf" ||
     file.mimetype === "application/msword" ||
     file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

export const upload = multer({ storage, fileFilter });
