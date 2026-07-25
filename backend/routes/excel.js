const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const excelController = require('../controllers/excelController');
const { verifyToken } = require('../middleware/auth');

const fs = require('fs');

// Multer storage setup
const tempDir = path.join(__dirname, '../db/temp/');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const upload = multer({
  dest: path.join(__dirname, '../db/temp/'),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx') {
      return cb(new Error('Only standard Excel workbooks (.xlsx) are allowed.'));
    }
    cb(null, true);
  }
});

router.get('/download', verifyToken, excelController.downloadExcel);
router.post('/upload', verifyToken, upload.single('excel'), excelController.uploadExcel);

module.exports = router;
