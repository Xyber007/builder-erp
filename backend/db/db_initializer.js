// Database Initializer to generate db_store.json with realistic seed data
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbStorePath = path.join(__dirname, 'db_store.json');

function run() {
  console.log('Generating seed database store...');

  // 1. Users & Roles (password: password123)
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);
  
  const roles = [
    { name: 'Super Admin', email: 'admin@shree.com' },
    { name: 'Director', email: 'director@shree.com' },
    { name: 'Accounts', email: 'accounts@shree.com' },
    { name: 'Sales', email: 'sales@shree.com' },
    { name: 'CRM', email: 'crm@shree.com' },
    { name: 'Legal', email: 'legal@shree.com' },
    { name: 'Construction', email: 'construction@shree.com' },
    { name: 'Reception', email: 'reception@shree.com' },
    { name: 'Viewer', email: 'viewer@shree.com' }
  ];

  const users = roles.map((role, idx) => ({
    id: `user-id-${idx + 1}`,
    name: `${role.name} User`,
    email: role.email,
    password_hash: passwordHash,
    role: role.name,
    mobile_number: `987654321${idx}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null
  }));

  // 2. Company
  const companies = [
    {
      id: 'company-1',
      name: 'Shree Enterprises',
      address: '401, Sapphire Chambers, Baner Road, Pune, Maharashtra 411045',
      tax_id: 'GSTIN27AAAFS2910M1Z3',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    }
  ];

  // 3. Projects
  const projects = [
    {
      id: 'project-1',
      company_id: 'company-1',
      name: 'Meraki Studio Baner',
      building_name: 'Wing A',
      address: 'Sr. No. 45, Veerbhadra Nagar, Baner, Pune, MH - 411045',
      rera_number: 'P52100029381',
      start_date: '2025-01-10',
      completion_date: '2027-12-31',
      total_floors: 9,
      total_units: 45,
      construction_status: 'In Progress',
      construction_percentage: 45.00,
      notes: 'Premium residential 2BHK and 3BHK studio apartments. High appreciation zone near IT corridor.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    }
  ];

  // 4. Buildings
  const buildings = [
    {
      id: 'building-1',
      project_id: 'project-1',
      name: 'Wing A',
      total_floors: 9,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    }
  ];

  // 5. Units (Generate 45 units: 9 floors, 5 units per floor: e.g. 101 to 905)
  const units = [];
  const unitStatuses = [
    'Available', 'Booked', 'Blocked', 'Agreement Done', 'Registered', 'Possession Given'
  ];

  const facings = ['East', 'West', 'North-East', 'Garden Facing', 'Main Road Facing'];

  let unitCounter = 0;
  for (let floor = 1; floor <= 9; floor++) {
    for (let u = 1; u <= 5; u++) {
      unitCounter++;
      const unitNumber = `${floor}0${u}`;
      
      // Determine status distribution:
      // Floor 1-4: registered or possession given (completed stages)
      // Floor 5-7: booked or agreement done (mid stage)
      // Floor 8-9: available or blocked
      let status = 'Available';
      if (floor <= 2) {
        status = u % 2 === 0 ? 'Possession Given' : 'Registered';
      } else if (floor <= 4) {
        status = u % 2 === 0 ? 'Registered' : 'Agreement Done';
      } else if (floor <= 6) {
        status = u % 2 === 0 ? 'Agreement Done' : 'Booked';
      } else if (floor <= 8) {
        status = u === 3 ? 'Blocked' : 'Available';
      } else {
        status = 'Available';
      }

      // Carpet and Areas
      const isLargeUnit = u % 2 === 0;
      const carpet_area = isLargeUnit ? 950.00 : 750.00;
      const balcony_area = isLargeUnit ? 95.00 : 75.00;
      const built_up_area = isLargeUnit ? 1120.00 : 880.00;
      const saleable_area = isLargeUnit ? 1350.00 : 1050.00;
      
      // Prices (e.g. basic price 6000 INR per sq ft saleable area)
      const basic_price = Math.round(saleable_area * 6000);
      const gst = Math.round(basic_price * 0.05); // 5% GST
      const stamp_duty = Math.round(basic_price * 0.06); // 6% Stamp Duty
      const registration_fee = 30000;
      const maintenance_charges = 120000;
      const plc = (u === 4 || u === 5) ? 150000 : 0; // Garden/Road facing charges
      const discount = floor > 7 ? 50000 : 0; // Discount on top floors to close inventory

      const final_sale_price = basic_price + gst + stamp_duty + registration_fee + maintenance_charges + plc - discount;

      units.push({
        id: `unit-id-${unitCounter}`,
        building_id: 'building-1',
        unit_number: unitNumber,
        floor: floor,
        wing: 'A',
        carpet_area: carpet_area,
        balcony_area: balcony_area,
        built_up_area: built_up_area,
        saleable_area: saleable_area,
        parking: u % 2 === 0 ? '1 Covered' : '1 Open',
        facing: facings[u - 1],
        status: status,
        basic_price: basic_price,
        gst: gst,
        stamp_duty: stamp_duty,
        registration_fee: registration_fee,
        maintenance_charges: maintenance_charges,
        plc: plc,
        discount: discount,
        final_sale_price: final_sale_price,
        current_construction_stage: 'Brick Work',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // 6. Customers, Payments, Schedules, and Bank Loans
  const customers = [];
  const paymentSchedules = [];
  const payments = [];
  const bankLoans = [];
  const documents = [];
  const customerNotes = [];
  const customerTimeline = [];

  const customerNames = [
    'Aditya Sharma', 'Priya Patel', 'Rajesh Iyer', 'Sneha Kulkarni', 'Vikram Malhotra',
    'Anjali Desai', 'Siddharth Joshi', 'Meera Nair', 'Rohan Mehta', 'Neha Gupta',
    'Alok Verma', 'Divya Rao', 'Karan Johar', 'Shweta Singh', 'Amit Trivedi',
    'Rahul Dravid', 'Preeti Zinta', 'Sachin Tendulkar', 'Deepika Padukone', 'Ranbir Kapoor'
  ];

  const occupations = ['Software Engineer', 'Doctor', 'Business Owner', 'Chartered Accountant', 'Professor', 'Architect'];

  const milestonesTemplate = [
    { name: 'Booking', pct: 10, offsetDays: 0 },
    { name: 'Agreement', pct: 10, offsetDays: 30 },
    { name: 'Excavation Completed', pct: 15, offsetDays: 90 },
    { name: 'Plinth Slab Laid', pct: 15, offsetDays: 150 },
    { name: '4th Floor Slab', pct: 15, offsetDays: 240 },
    { name: 'Brick Work Done', pct: 15, offsetDays: 320 },
    { name: 'Plaster Completed', pct: 10, offsetDays: 400 },
    { name: 'Possession & Keys', pct: 10, offsetDays: 500 }
  ];

  let customerCounter = 0;
  // Let's create customer profiles for booked, agreement, registered, and possession units
  units.forEach((unit) => {
    if (unit.status !== 'Available' && unit.status !== 'Blocked') {
      customerCounter++;
      const name = customerNames[customerCounter - 1] || `Customer ${customerCounter}`;
      const customerId = `cust-id-${customerCounter}`;
      
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() - (365 - customerCounter * 15)); // staggered bookings in the past year
      const bookingDateStr = bookingDate.toISOString().split('T')[0];

      let agreementDateStr = null;
      let registrationDateStr = null;
      let possessionDateStr = null;

      if (['Agreement Done', 'Registered', 'Possession Given'].includes(unit.status)) {
        const agDate = new Date(bookingDate);
        agDate.setDate(agDate.getDate() + 30);
        agreementDateStr = agDate.toISOString().split('T')[0];
      }

      if (['Registered', 'Possession Given'].includes(unit.status)) {
        const regDate = new Date(bookingDate);
        regDate.setDate(regDate.getDate() + 60);
        registrationDateStr = regDate.toISOString().split('T')[0];
      }

      if (unit.status === 'Possession Given') {
        const posDate = new Date(bookingDate);
        posDate.setDate(posDate.getDate() + 300);
        posDateStr = posDate.toISOString().split('T')[0];
      }

      // Create Customer
      const customer = {
        id: customerId,
        unit_id: unit.id,
        name: name,
        photo_url: null, // Placeholder or default
        mobile_number: `91234567${customerCounter.toString().padStart(2, '0')}`,
        alternate_number: `98765432${customerCounter.toString().padStart(2, '0')}`,
        email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
        address: `${100 + customerCounter}, Park Avenue Road, Pune, Maharashtra`,
        pan: `ABCDE${customerCounter.toString().padStart(4, '0')}F`,
        aadhaar: `1234567890${customerCounter.toString().padStart(2, '0')}`,
        occupation: occupations[customerCounter % occupations.length],
        company_name: 'TechSolutions Pvt Ltd',
        nominee_name: `${name.split(' ')[0]}'s Spouse`,
        sales_executive_id: 'user-id-4', // Sales User
        booking_date: bookingDateStr,
        agreement_date: agreementDateStr,
        registration_date: registrationDateStr,
        possession_date: possessionDateStr,
        notes: `Customer is interested in timely completion. Prefers communication via WhatsApp.`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      };
      customers.push(customer);

      // Create Payment Schedule (Milestones) based on unit cost
      let accumReceived = 0;
      const customerMilestones = milestonesTemplate.map((m, mIdx) => {
        const due_amount = Math.round((unit.final_sale_price * m.pct) / 100);
        const schedId = `sched-id-${customerId}-${mIdx + 1}`;
        
        const dueDate = new Date(bookingDate);
        dueDate.setDate(dueDate.getDate() + m.offsetDays);
        const dueDateStr = dueDate.toISOString().split('T')[0];

        // Determine if this milestone is received/paid based on status:
        // 'Possession Given' -> all paid
        // 'Registered' -> paid up to 5th milestone (Brick work)
        // 'Agreement Done' -> paid up to 3rd milestone (Excavation)
        // 'Booked' -> paid only booking milestone (1st)
        let recAmount = 0;
        const currentDate = new Date();
        const milestoneDueDate = new Date(dueDateStr);

        let milestonePaid = false;
        if (unit.status === 'Possession Given') {
          milestonePaid = true;
        } else if (unit.status === 'Registered') {
          milestonePaid = mIdx <= 5; // Booking, Agreement, Excavation, Plinth, 4th Floor, Brick Work
        } else if (unit.status === 'Agreement Done') {
          milestonePaid = mIdx <= 2; // Booking, Agreement, Excavation
        } else if (unit.status === 'Booked') {
          milestonePaid = mIdx === 0; // Booking only
        }

        if (milestonePaid) {
          recAmount = due_amount;
          accumReceived += due_amount;
        }

        let mStatus = 'Pending';
        if (recAmount === due_amount) {
          mStatus = 'Completed';
        } else if (currentDate > milestoneDueDate) {
          mStatus = 'Overdue';
        }

        return {
          id: schedId,
          customer_id: customerId,
          milestone_name: m.name,
          due_percentage: m.pct,
          due_amount: due_amount,
          received_amount: recAmount,
          outstanding_amount: due_amount - recAmount,
          due_date: dueDateStr,
          status: mStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        };
      });

      paymentSchedules.push(...customerMilestones);

      // Create Payment Ledger Records
      let receiptIdx = 0;
      customerMilestones.forEach((m) => {
        if (m.received_amount > 0) {
          receiptIdx++;
          const receiptNo = `REC-${bookingDate.getFullYear()}-${customerCounter.toString().padStart(3, '0')}-${receiptIdx}`;
          
          const payDate = new Date(m.due_date);
          // Slightly offset payment date to look natural
          payDate.setDate(payDate.getDate() - Math.floor(Math.random() * 5));
          const payDateStr = payDate.toISOString().split('T')[0];

          payments.push({
            id: `pay-id-${customerId}-${receiptIdx}`,
            customer_id: customerId,
            amount: m.received_amount,
            payment_date: payDateStr,
            payment_type: mIdxToPaymentType(m.milestone_name),
            payment_mode: customerCounter % 3 === 0 ? 'NEFT' : (customerCounter % 3 === 1 ? 'Cheque' : 'Bank Loan'),
            transaction_number: `TXN${Math.floor(Math.random() * 90000000 + 10000000)}`,
            bank_name: 'HDFC Bank',
            receipt_number: receiptNo,
            receipt_url: `receipts/${receiptNo}.pdf`,
            remarks: `${m.milestone_name} payment received. Auto-cleared.`,
            entered_by: 'user-id-3', // Accounts user
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null
          });
        }
      });

      // Create Bank Loan (for odd numbered customers using bank loans)
      if (customerCounter % 2 !== 0 && ['Registered', 'Possession Given'].includes(unit.status)) {
        const loanAmount = Math.round(unit.final_sale_price * 0.70); // 70% bank loan
        const disbursed = unit.status === 'Possession Given' ? loanAmount : Math.round(loanAmount * 0.80);
        
        bankLoans.push({
          id: `loan-id-${customerId}`,
          customer_id: customerId,
          bank_name: customerCounter % 3 === 0 ? 'State Bank of India' : 'ICICI Bank',
          executive_name: 'Mr. Anil Kumar',
          loan_amount: loanAmount,
          sanction_amount: loanAmount,
          disbursed_amount: disbursed,
          pending_amount: loanAmount - disbursed,
          login_date: bookingDateStr,
          sanction_date: agreementDateStr,
          disbursement_date: registrationDateStr,
          status: unit.status === 'Possession Given' ? 'Disbursed' : 'Sanctioned',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        });

        // Add loan document
        documents.push({
          id: `doc-id-loan-${customerId}`,
          customer_id: customerId,
          category: 'Loan Document',
          file_name: `loan_sanction_letter_${customerId}.pdf`,
          file_url: `/uploads/documents/loan_sanction_letter_${customerId}.pdf`,
          uploaded_by: 'user-id-5', // CRM User
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        });
      }

      // Populate Documents
      documents.push(
        {
          id: `doc-id-pan-${customerId}`,
          customer_id: customerId,
          category: 'PAN',
          file_name: `pan_card_${customerId}.pdf`,
          file_url: `/uploads/documents/pan_card_${customerId}.pdf`,
          uploaded_by: 'user-id-4', // Sales User
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        },
        {
          id: `doc-id-aadhaar-${customerId}`,
          customer_id: customerId,
          category: 'Aadhaar',
          file_name: `aadhaar_card_${customerId}.pdf`,
          file_url: `/uploads/documents/aadhaar_card_${customerId}.pdf`,
          uploaded_by: 'user-id-4', // Sales User
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        }
      );

      if (agreementDateStr) {
        documents.push({
          id: `doc-id-agreement-${customerId}`,
          customer_id: customerId,
          category: 'Agreement',
          file_name: `agreement_to_sale_${customerId}.pdf`,
          file_url: `/uploads/documents/agreement_to_sale_${customerId}.pdf`,
          uploaded_by: 'user-id-6', // Legal User
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        });
      }

      if (registrationDateStr) {
        documents.push({
          id: `doc-id-index-${customerId}`,
          customer_id: customerId,
          category: 'Index II',
          file_name: `index_ii_${customerId}.pdf`,
          file_url: `/uploads/documents/index_ii_${customerId}.pdf`,
          uploaded_by: 'user-id-6', // Legal User
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        });
      }

      // Add Notes & Timelines
      customerNotes.push({
        id: `note-id-${customerId}-1`,
        customer_id: customerId,
        user_id: 'user-id-4',
        note: `Initial meeting completed. Customer selected unit ${unit.unit_number} and completed booking payment.`,
        created_at: bookingDate.toISOString()
      });

      customerTimeline.push(
        {
          id: `time-id-${customerId}-1`,
          customer_id: customerId,
          event_type: 'Booking Completed',
          description: `Unit ${unit.unit_number} booked by ${name}. Initial booking payment made.`,
          event_date: bookingDateStr,
          created_at: bookingDate.toISOString()
        }
      );

      if (agreementDateStr) {
        customerTimeline.push({
          id: `time-id-${customerId}-2`,
          customer_id: customerId,
          event_type: 'Agreement Registered',
          description: `Registered Agreement to Sale copy uploaded and verified.`,
          event_date: agreementDateStr,
          created_at: new Date(agreementDateStr).toISOString()
        });
      }
    }
  });

  // Helper mapping milestone to Payment Type
  function mIdxToPaymentType(milestoneName) {
    if (milestoneName === 'Booking') return 'Booking';
    if (milestoneName === 'Agreement') return 'Agreement';
    if (milestoneName.includes('Slab') || milestoneName.includes('Plinth')) return 'Slab';
    if (milestoneName.includes('Brick')) return 'Brick Work';
    if (milestoneName.includes('Plaster')) return 'Plaster';
    if (milestoneName.includes('Flooring')) return 'Flooring';
    if (milestoneName.includes('Possession')) return 'Possession';
    return 'Other';
  }

  // 7. Construction Stages
  const constructionStagesTemplate = [
    { stage: 'Excavation', pct: 100, start: '2025-01-15', end: '2025-02-15', notes: 'Excavation completed on time. Earth work finished.' },
    { stage: 'Foundation', pct: 100, start: '2025-02-16', end: '2025-03-31', notes: 'Raft foundation complete, steel binder audit approved.' },
    { stage: 'Basement', pct: 100, start: '2025-04-01', end: '2025-05-15', notes: 'Retaining walls and basement columns reinforced.' },
    { stage: 'Ground Slab', pct: 100, start: '2025-05-16', end: '2025-06-15', notes: 'Ground level parking concrete pouring done.' },
    { stage: 'First Slab', pct: 100, start: '2025-06-16', end: '2025-07-20', notes: 'First slab poured, curing completed.' },
    { stage: 'Second Slab', pct: 100, start: '2025-07-21', end: '2025-08-30', notes: 'Second slab structural casting completed.' },
    { stage: 'Third Slab', pct: 100, start: '2025-09-01', end: '2025-10-15', notes: 'Third slab casted successfully.' },
    { stage: 'Brick Work', pct: 85, start: '2025-10-16', end: '2026-03-31', notes: 'Internal partition brick walls up to 6th floor completed.' },
    { stage: 'Plaster', pct: 50, start: '2026-04-01', end: '2026-09-30', notes: 'Gypsum plastering on lower floors initiated.' },
    { stage: 'Electrical', pct: 25, start: '2026-10-01', end: '2027-02-28', notes: 'Wiring conduit pipes running in Wing A.' },
    { stage: 'Flooring', pct: 0, start: null, end: null, notes: 'Awaiting plastering completion.' },
    { stage: 'Painting', pct: 0, start: null, end: null, notes: 'Not started.' },
    { stage: 'Finishing', pct: 0, start: null, end: null, notes: 'Not started.' },
    { stage: 'Possession', pct: 0, start: null, end: null, notes: 'Not started.' }
  ];

  const construction_stages = constructionStagesTemplate.map((stage, idx) => ({
    id: `stage-id-${idx + 1}`,
    project_id: 'project-1',
    stage_name: stage.stage,
    start_date: stage.start,
    completion_date: stage.end,
    progress_percentage: stage.pct,
    engineer_notes: stage.notes,
    photos: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null
  }));

  // Compile full store
  const store = {
    users,
    companies,
    projects,
    buildings,
    units,
    customers,
    payment_schedules: paymentSchedules,
    payments,
    bank_loans: bankLoans,
    documents,
    construction_stages,
    customer_notes: customerNotes,
    customer_timeline: customerTimeline,
    audit_logs: []
  };

  fs.writeFileSync(dbStorePath, JSON.stringify(store, null, 2), 'utf8');
  console.log(`Seed database successfully written to ${dbStorePath}`);
  console.log(`Total generated records:
    Users: ${users.length}
    Companies: ${companies.length}
    Projects: ${projects.length}
    Buildings: ${buildings.length}
    Units: ${units.length}
    Customers: ${customers.length}
    Payment Schedules (Milestones): ${paymentSchedules.length}
    Payments: ${payments.length}
    Bank Loans: ${bankLoans.length}
    Documents: ${documents.length}
    Construction Stages: ${construction_stages.length}`);
}

module.exports = { run };

// Run if called directly
if (require.main === module) {
  run();
}
