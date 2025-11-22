import multer from "multer";

// تخزين مؤقت في الذاكرة بدل الملفات على السيرفر
const storage = multer.memoryStorage();

// فلترة الصور فقط
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

export const upload = multer({ storage, fileFilter });
