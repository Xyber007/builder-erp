const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const dbStorePath = path.join(__dirname, '../db/db_store.json');
const excelPath = path.join(__dirname, '../db/erp_data.xlsx');

let isWritingExcel = false;
let watchTimeout = null;

const excelSyncService = {
  // ==========================================
  // SYNC SYSTEM: JSON -> EXCEL
  // ==========================================
  syncJSONToExcel: () => {
    if (isWritingExcel) return;
    isWritingExcel = true;

    try {
      console.log('Syncing database state to Excel workbook...');
      if (!fs.existsSync(dbStorePath)) {
        isWritingExcel = false;
        return;
      }

      const store = JSON.parse(fs.readFileSync(dbStorePath, 'utf8'));

      // Create new workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Units
      const unitsData = store.units.map(u => ({
        'Unit ID': u.id,
        'Unit Number': u.unit_number,
        'Floor': u.floor,
        'Wing': u.wing,
        'Carpet Area (sqft)': u.carpet_area,
        'Saleable Area (sqft)': u.saleable_area,
        'Facing': u.facing,
        'Status': u.status,
        'Basic Price (INR)': u.basic_price,
        'GST (INR)': u.gst,
        'Stamp Duty (INR)': u.stamp_duty,
        'Registration Fee (INR)': u.registration_fee,
        'Final Price (INR)': u.final_sale_price
      }));
      const wsUnits = XLSX.utils.json_to_sheet(unitsData);
      XLSX.utils.book_append_sheet(wb, wsUnits, 'Units');

      // Sheet 2: Customers
      const customersData = store.customers.map(c => ({
        'Customer ID': c.id,
        'Unit ID': c.unit_id,
        'Name': c.name,
        'Mobile Number': c.mobile_number,
        'Email': c.email,
        'PAN': c.pan,
        'Aadhaar': c.aadhaar,
        'Occupation': c.occupation,
        'Booking Date': c.booking_date,
        'Agreement Date': c.agreement_date || 'Pending',
        'Registration Date': c.registration_date || 'Pending'
      }));
      const wsCustomers = XLSX.utils.json_to_sheet(customersData);
      XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');

      // Sheet 3: Payments
      const paymentsData = store.payments.map(p => ({
        'Payment ID': p.id,
        'Customer ID': p.customer_id,
        'Amount (INR)': p.amount,
        'Payment Date': p.payment_date,
        'Payment Type': p.payment_type,
        'Payment Mode': p.payment_mode,
        'Transaction ID': p.transaction_number,
        'Bank Name': p.bank_name,
        'Receipt Number': p.receipt_number,
        'Remarks': p.remarks
      }));
      const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
      XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments');

      // Sheet 4: PaymentSchedules (Milestones)
      const schedulesData = store.payment_schedules.map(s => ({
        'Schedule ID': s.id,
        'Customer ID': s.customer_id,
        'Milestone Name': s.milestone_name,
        'Due Percentage': s.due_percentage,
        'Due Amount (INR)': s.due_amount,
        'Received Amount (INR)': s.received_amount,
        'Outstanding (INR)': s.outstanding_amount,
        'Due Date': s.due_date,
        'Status': s.status
      }));
      const wsSchedules = XLSX.utils.json_to_sheet(schedulesData);
      XLSX.utils.book_append_sheet(wb, wsSchedules, 'PaymentSchedules');

      // Write to Excel
      try {
        XLSX.writeFile(wb, excelPath);
        console.log(`Excel sheet synchronized successfully at: ${excelPath}`);
      } catch (writeErr) {
        if (writeErr.code === 'EBUSY') {
          console.warn('Excel file is locked/busy. Skipping write to prevent sync deadlock.');
        } else {
          throw writeErr;
        }
      }
    } catch (err) {
      console.error('Failed to sync JSON to Excel:', err);
    } finally {
      // Release write lock after delay to let filesystem settle
      setTimeout(() => {
        isWritingExcel = false;
      }, 1000);
    }
  },

  // ==========================================
  // SYNC SYSTEM: EXCEL -> JSON
  // ==========================================
  syncExcelToJSON: () => {
    try {
      console.log('Parsing modified Excel workbook into database store...');
      if (!fs.existsSync(excelPath)) return;

      const wb = XLSX.readFile(excelPath);
      const store = JSON.parse(fs.readFileSync(dbStorePath, 'utf8'));

      // 1. Sync Units
      if (wb.SheetNames.includes('Units')) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Units']);
        rows.forEach(row => {
          const unit = store.units.find(u => u.id === row['Unit ID']);
          if (unit) {
            unit.status = row['Status'];
            unit.basic_price = Number(row['Basic Price (INR)']) || unit.basic_price;
            unit.gst = Number(row['GST (INR)']) || unit.gst;
            unit.stamp_duty = Number(row['Stamp Duty (INR)']) || unit.stamp_duty;
            unit.registration_fee = Number(row['Registration Fee (INR)']) || unit.registration_fee;
            unit.facing = row['Facing'] || unit.facing;
            // Recalculate Final Price
            unit.final_sale_price = unit.basic_price + unit.gst + unit.stamp_duty + unit.registration_fee + unit.maintenance_charges + unit.plc - unit.discount;
          }
        });
      }

      // 2. Sync Customers
      if (wb.SheetNames.includes('Customers')) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Customers']);
        rows.forEach(row => {
          const cust = store.customers.find(c => c.id === row['Customer ID']);
          if (cust) {
            cust.name = row['Name'] || cust.name;
            cust.mobile_number = String(row['Mobile Number'] || cust.mobile_number);
            cust.email = row['Email'] || cust.email;
            cust.pan = row['PAN'] || cust.pan;
            cust.aadhaar = String(row['Aadhaar'] || cust.aadhaar);
            cust.booking_date = row['Booking Date'] || cust.booking_date;
            cust.agreement_date = row['Agreement Date'] === 'Pending' ? null : row['Agreement Date'];
            cust.registration_date = row['Registration Date'] === 'Pending' ? null : row['Registration Date'];
          }
        });
      }

      // 3. Sync Payments (Import manual payment inserts)
      if (wb.SheetNames.includes('Payments')) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets['Payments']);
        rows.forEach(row => {
          const paymentExists = store.payments.some(p => p.id === row['Payment ID'] || p.receipt_number === row['Receipt Number']);
          if (!paymentExists && row['Customer ID'] && row['Amount (INR)']) {
            // Log new payment from Excel sheet!
            const newPayment = {
              id: row['Payment ID'] || `pay-id-xl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              customer_id: row['Customer ID'],
              amount: Number(row['Amount (INR)']),
              payment_date: row['Payment Date'] || new Date().toISOString().split('T')[0],
              payment_type: row['Payment Type'] || 'Other',
              payment_mode: row['Payment Mode'] || 'Cash',
              transaction_number: String(row['Transaction ID'] || 'N/A'),
              bank_name: row['Bank Name'] || 'N/A',
              receipt_number: row['Receipt Number'] || `REC-XL-${Date.now()}`,
              remarks: row['Remarks'] || 'Imported via Excel Sync',
              entered_by: 'user-id-1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              deleted_at: null
            };
            store.payments.push(newPayment);

            // Re-allocate to milestones
            let remaining = newPayment.amount;
            const schedules = store.payment_schedules.filter(s => s.customer_id === newPayment.customer_id).sort((a,b) => a.due_date.localeCompare(b.due_date));
            schedules.forEach(m => {
              const outstanding = Number(m.outstanding_amount);
              if (outstanding > 0 && remaining > 0) {
                const alloc = Math.min(outstanding, remaining);
                m.received_amount = Number(m.received_amount) + alloc;
                m.outstanding_amount = Number(m.due_amount) - m.received_amount;
                m.status = m.outstanding_amount <= 0 ? 'Completed' : m.status;
                remaining -= alloc;
              }
            });
          }
        });
      }

      // Save changes back to JSON store
      fs.writeFileSync(dbStorePath, JSON.stringify(store, null, 2), 'utf8');
      console.log('Database JSON store updated from Excel modifications.');
    } catch (err) {
      console.error('Failed to parse Excel to JSON:', err);
    }
  },

  // ==========================================
  // FILE WATCHER & DEBOUNCE SERVICE
  // ==========================================
  watchExcelFile: () => {
    // Generate initial spreadsheet if missing
    if (!fs.existsSync(excelPath)) {
      excelSyncService.syncJSONToExcel();
    }

    console.log(`Starting filesystem watch on: ${excelPath}`);
    
    fs.watch(excelPath, (eventType, filename) => {
      if (filename && eventType === 'change') {
        if (isWritingExcel) return; // ignore writes made by system

        // Debounce double write triggers from Excel saves
        clearTimeout(watchTimeout);
        watchTimeout = setTimeout(() => {
          console.log('Detected Excel file modification save...');
          excelSyncService.syncExcelToJSON();
        }, 1000);
      }
    });
  }
};

module.exports = excelSyncService;

// Run standalone verification checks
if (require.main === module) {
  if (process.argv.includes('--verify')) {
    excelSyncService.syncJSONToExcel();
    excelSyncService.syncExcelToJSON();
  }
}
