const path = require('path');
const fs = require('fs');
const excelSyncService = require('../services/excelSyncService');

const excelPath = path.join(__dirname, '../db/erp_data.xlsx');

// 1. Download active Excel workbook from cloud
exports.downloadExcel = async (req, res, next) => {
  try {
    // Regenerate workbook to make sure it's up to date
    excelSyncService.syncJSONToExcel();

    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({ error: 'Excel database workbook not found' });
    }

    res.download(excelPath, 'erp_data.xlsx', (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (err) {
    next(err);
  }
};

// 2. Upload and sync modified Excel sheet back to cloud
exports.uploadExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file (.xlsx) was uploaded.' });
    }

    // Save uploaded file to erp_data.xlsx
    const tempPath = req.file.path;
    
    // Copy file to excelPath and delete temp
    fs.copyFileSync(tempPath, excelPath);
    fs.unlinkSync(tempPath);

    // Sync Excel contents into DB store
    excelSyncService.syncExcelToJSON();

    // Regenerate to keep indices aligned
    excelSyncService.syncJSONToExcel();

    res.json({
      success: true,
      message: 'Cloud database synchronized with Excel upload successfully.'
    });
  } catch (err) {
    next(err);
  }
};
