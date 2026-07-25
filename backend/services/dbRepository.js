const db = require('../config/database');
const excelSyncService = require('./excelSyncService');

// Service repository managing both PostgreSQL query execution and JSON DB file-fallback operations
const dbRepository = {
  // ==========================================
  // AUTH / USERS
  // ==========================================
  getUserByEmail: async (email) => {
    if (db.isPg) {
      const res = await db.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
      return res.rows[0];
    } else {
      const store = db.getJsonDb();
      return store.users.find(u => u.email === email && !u.deleted_at);
    }
  },

  getUserById: async (id) => {
    if (db.isPg) {
      const res = await db.query('SELECT id, name, email, role, mobile_number FROM users WHERE id = $1', [id]);
      return res.rows[0];
    } else {
      const store = db.getJsonDb();
      const user = store.users.find(u => u.id === id);
      if (user) {
        return { id: user.id, name: user.name, email: user.email, role: user.role, mobile_number: user.mobile_number };
      }
      return null;
    }
  },

  // ==========================================
  // PROJECTS
  // ==========================================
  getProjects: async () => {
    if (db.isPg) {
      const res = await db.query(`
        SELECT p.*, 
               COALESCE(COUNT(u.id), 0)::integer as total_units_count,
               COALESCE(SUM(CASE WHEN u.status = 'Available' THEN 1 ELSE 0 END), 0)::integer as available_units,
               COALESCE(SUM(CASE WHEN u.status IN ('Booked', 'Agreement Done', 'Registered', 'Possession Given') THEN 1 ELSE 0 END), 0)::integer as booked_units
        FROM projects p
        LEFT JOIN buildings b ON b.project_id = p.id AND b.deleted_at IS NULL
        LEFT JOIN units u ON u.building_id = b.id AND u.deleted_at IS NULL
        WHERE p.deleted_at IS NULL
        GROUP BY p.id
      `);
      return res.rows;
    } else {
      const store = db.getJsonDb();
      return store.projects.map(p => {
        const bIds = store.buildings.filter(b => b.project_id === p.id && !b.deleted_at).map(b => b.id);
        const pUnits = store.units.filter(u => bIds.includes(u.building_id) && !u.deleted_at);
        const available = pUnits.filter(u => u.status === 'Available').length;
        const booked = pUnits.filter(u => ['Booked', 'Agreement Done', 'Registered', 'Possession Given'].includes(u.status)).length;
        return {
          ...p,
          total_units_count: pUnits.length,
          available_units: available,
          booked_units: booked
        };
      });
    }
  },

  getProjectDashboard: async (projectId) => {
    if (db.isPg) {
      // 1. Fetch units statuses
      const unitStats = await db.query(`
        SELECT u.status, COUNT(*)::integer as count, SUM(u.final_sale_price) as val
        FROM units u
        JOIN buildings b ON u.building_id = b.id
        WHERE b.project_id = $1 AND u.deleted_at IS NULL
        GROUP BY u.status
      `, [projectId]);

      // 2. Fetch payments summary
      const paySum = await db.query(`
        SELECT COALESCE(SUM(p.amount), 0) as total_received
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        JOIN units u ON c.unit_id = u.id
        JOIN buildings b ON u.building_id = b.id
        WHERE b.project_id = $1 AND p.deleted_at IS NULL
      `, [projectId]);

      return {
        unitStats: unitStats.rows,
        totalReceived: paySum.rows[0].total_received
      };
    } else {
      const store = db.getJsonDb();
      const bIds = store.buildings.filter(b => b.project_id === projectId && !b.deleted_at).map(b => b.id);
      const pUnits = store.units.filter(u => bIds.includes(u.building_id) && !u.deleted_at);
      
      const stats = {};
      unitStatuses = ['Available', 'Booked', 'Blocked', 'Agreement Done', 'Registered', 'Possession Given', 'Cancelled'];
      unitStatuses.forEach(s => stats[s] = { count: 0, value: 0 });

      pUnits.forEach(u => {
        if (stats[u.status]) {
          stats[u.status].count++;
          stats[u.status].value += Number(u.final_sale_price);
        }
      });

      // Calculate total collected
      const cIds = store.customers.filter(c => pUnits.map(u => u.id).includes(c.unit_id) && !c.deleted_at).map(c => c.id);
      const totalCollected = store.payments
        .filter(p => cIds.includes(p.customer_id) && !p.deleted_at)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        unitStats: Object.keys(stats).map(k => ({ status: k, count: stats[k].count, val: stats[k].value })),
        totalReceived: totalCollected
      };
    }
  },

  // ==========================================
  // UNITS
  // ==========================================
  getUnits: async (projectId, wing = null, status = null) => {
    if (db.isPg) {
      let query = `
        SELECT u.*, b.name as building_name, c.name as customer_name, c.id as customer_id
        FROM units u
        JOIN buildings b ON u.building_id = b.id
        LEFT JOIN customers c ON c.unit_id = u.id AND c.deleted_at IS NULL
        WHERE b.project_id = $1 AND u.deleted_at IS NULL
      `;
      const params = [projectId];
      let pIdx = 2;
      if (wing) {
        query += ` AND u.wing = $${pIdx}`;
        params.push(wing);
        pIdx++;
      }
      if (status) {
        query += ` AND u.status = $${pIdx}`;
        params.push(status);
      }
      query += ` ORDER BY u.floor DESC, u.unit_number ASC`;
      const res = await db.query(query, params);
      return res.rows;
    } else {
      const store = db.getJsonDb();
      const bIds = store.buildings.filter(b => b.project_id === projectId && !b.deleted_at).map(b => b.id);
      let pUnits = store.units.filter(u => bIds.includes(u.building_id) && !u.deleted_at);

      if (wing) {
        pUnits = pUnits.filter(u => u.wing === wing);
      }
      if (status) {
        pUnits = pUnits.filter(u => u.status === status);
      }

      const unitsData = pUnits.map(u => {
        const building = store.buildings.find(b => b.id === u.building_id);
        const customer = store.customers.find(c => c.unit_id === u.id && !c.deleted_at);
        return {
          ...u,
          building_name: building ? building.name : 'Unknown',
          customer_name: customer ? customer.name : null,
          customer_id: customer ? customer.id : null
        };
      });

      // Sort by floor desc, unit number asc
      return unitsData.sort((a, b) => b.floor - a.floor || a.unit_number.localeCompare(b.unit_number));
    }
  },

  getUnitDetails: async (unitId) => {
    if (db.isPg) {
      const res = await db.query(`
        SELECT u.*, b.name as building_name, b.project_id, p.name as project_name
        FROM units u
        JOIN buildings b ON u.building_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `, [unitId]);
      return res.rows[0];
    } else {
      const store = db.getJsonDb();
      const u = store.units.find(unit => unit.id === unitId && !unit.deleted_at);
      if (!u) return null;
      const b = store.buildings.find(building => building.id === u.building_id);
      const p = store.projects.find(proj => proj.id === b.project_id);
      return {
        ...u,
        building_name: b ? b.name : '',
        project_id: b ? b.project_id : '',
        project_name: p ? p.name : ''
      };
    }
  },

  // ==========================================
  // CUSTOMERS
  // ==========================================
  getCustomers: async (projectId) => {
    if (db.isPg) {
      const res = await db.query(`
        SELECT c.*, u.unit_number, u.wing, u.floor, u.status as unit_status, u.final_sale_price
        FROM customers c
        JOIN units u ON c.unit_id = u.id
        JOIN buildings b ON u.building_id = b.id
        WHERE b.project_id = $1 AND c.deleted_at IS NULL
        ORDER BY c.created_at DESC
      `, [projectId]);
      return res.rows;
    } else {
      const store = db.getJsonDb();
      const bIds = store.buildings.filter(b => b.project_id === projectId && !b.deleted_at).map(b => b.id);
      const uIds = store.units.filter(u => bIds.includes(u.building_id) && !u.deleted_at).map(u => u.id);
      const pCustomers = store.customers.filter(c => uIds.includes(c.unit_id) && !c.deleted_at);

      return pCustomers.map(c => {
        const u = store.units.find(unit => unit.id === c.unit_id);
        return {
          ...c,
          unit_number: u ? u.unit_number : '',
          wing: u ? u.wing : '',
          floor: u ? u.floor : 0,
          unit_status: u ? u.status : '',
          final_sale_price: u ? u.final_sale_price : 0
        };
      });
    }
  },

  getCustomerProfile: async (customerId) => {
    if (db.isPg) {
      // 1. Fetch customer details
      const custRes = await db.query(`
        SELECT c.*, u.unit_number, u.wing, u.floor, u.final_sale_price, u.status as unit_status,
               u.basic_price, u.gst, u.stamp_duty, u.registration_fee, u.maintenance_charges, u.plc, u.discount,
               p.name as project_name, p.id as project_id
        FROM customers c
        JOIN units u ON c.unit_id = u.id
        JOIN buildings b ON u.building_id = b.id
        JOIN projects p ON b.project_id = p.id
        WHERE c.id = $1 AND c.deleted_at IS NULL
      `, [customerId]);

      const customer = custRes.rows[0];
      if (!customer) return null;

      // 2. Fetch ledger details (all payments)
      const payRes = await db.query(`
        SELECT * FROM payments WHERE customer_id = $1 AND deleted_at IS NULL ORDER BY payment_date ASC, created_at ASC
      `, [customerId]);

      // 3. Fetch payment schedule milestones
      const schedRes = await db.query(`
        SELECT * FROM payment_schedules WHERE customer_id = $1 AND deleted_at IS NULL ORDER BY due_date ASC
      `, [customerId]);

      // 4. Fetch loan details
      const loanRes = await db.query(`
        SELECT * FROM bank_loans WHERE customer_id = $1 AND deleted_at IS NULL
      `, [customerId]);

      // 5. Fetch documents list
      const docRes = await db.query(`
        SELECT * FROM documents WHERE customer_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC
      `, [customerId]);

      // 6. Fetch timeline
      const timeRes = await db.query(`
        SELECT * FROM customer_timeline WHERE customer_id = $1 ORDER BY event_date DESC, created_at DESC
      `, [customerId]);

      // 7. Fetch notes
      const notesRes = await db.query(`
        SELECT cn.*, u.name as user_name
        FROM customer_notes cn
        LEFT JOIN users u ON cn.user_id = u.id
        WHERE cn.customer_id = $1
        ORDER BY cn.created_at DESC
      `, [customerId]);

      return {
        customer,
        payments: payRes.rows,
        paymentSchedules: schedRes.rows,
        loan: loanRes.rows[0] || null,
        documents: docRes.rows,
        timeline: timeRes.rows,
        notes: notesRes.rows
      };
    } else {
      const store = db.getJsonDb();
      const c = store.customers.find(cust => cust.id === customerId && !cust.deleted_at);
      if (!c) return null;

      const u = store.units.find(unit => unit.id === c.unit_id);
      const b = u ? store.buildings.find(building => building.id === u.building_id) : null;
      const p = b ? store.projects.find(proj => proj.id === b.project_id) : null;

      const customer = {
        ...c,
        unit_number: u ? u.unit_number : '',
        wing: u ? u.wing : '',
        floor: u ? u.floor : 0,
        final_sale_price: u ? u.final_sale_price : 0,
        unit_status: u ? u.status : '',
        basic_price: u ? u.basic_price : 0,
        gst: u ? u.gst : 0,
        stamp_duty: u ? u.stamp_duty : 0,
        registration_fee: u ? u.registration_fee : 0,
        maintenance_charges: u ? u.maintenance_charges : 0,
        plc: u ? u.plc : 0,
        discount: u ? u.discount : 0,
        project_name: p ? p.name : '',
        project_id: p ? p.id : ''
      };

      const customerPayments = store.payments.filter(pay => pay.customer_id === customerId && !pay.deleted_at).sort((a, b) => a.payment_date.localeCompare(b.payment_date));
      const customerSchedules = store.payment_schedules.filter(s => s.customer_id === customerId && !s.deleted_at).sort((a, b) => a.due_date.localeCompare(b.due_date));
      const loan = store.bank_loans.find(bl => bl.customer_id === customerId && !bl.deleted_at) || null;
      const customerDocs = store.documents.filter(doc => doc.customer_id === customerId && !doc.deleted_at).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const timeline = store.customer_timeline.filter(t => t.customer_id === customerId).sort((a, b) => b.event_date.localeCompare(a.event_date) || b.created_at.localeCompare(a.created_at));
      const notes = store.customer_notes.filter(n => n.customer_id === customerId).map(n => {
        const u = store.users.find(usr => usr.id === n.user_id);
        return {
          ...n,
          user_name: u ? u.name : 'System'
        };
      }).sort((a, b) => b.created_at.localeCompare(a.created_at));

      return {
        customer,
        payments: customerPayments,
        paymentSchedules: customerSchedules,
        loan,
        documents: customerDocs,
        timeline,
        notes
      };
    }
  },

  // ==========================================
  // PAYMENT CREATION (Ledger Trigger & Auto Balances)
  // ==========================================
  createPayment: async (paymentData) => {
    const { customer_id, amount, payment_date, payment_type, payment_mode, transaction_number, bank_name, receipt_number, remarks, entered_by } = paymentData;

    if (db.isPg) {
      // Execute transactional updates in PostgreSQL
      // We will perform updates in a transaction block
      await db.query('BEGIN');
      try {
        // 1. Insert payment record
        const insertRes = await db.query(`
          INSERT INTO payments (customer_id, amount, payment_date, payment_type, payment_mode, transaction_number, bank_name, receipt_number, receipt_url, remarks, entered_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `, [customer_id, amount, payment_date, payment_type, payment_mode, transaction_number, bank_name, receipt_number, `receipts/${receipt_number}.pdf`, remarks, entered_by]);
        
        const newPayment = insertRes.rows[0];

        // 2. Distribute payment across milestones matching payment type or oldest outstanding
        let remaining = Number(amount);
        
        // Find milestones for this customer
        const milRes = await db.query(`
          SELECT * FROM payment_schedules 
          WHERE customer_id = $1 AND deleted_at IS NULL 
          ORDER BY due_date ASC
        `, [customer_id]);
        
        for (const milestone of milRes.rows) {
          const outstanding = Number(milestone.outstanding_amount);
          if (outstanding > 0 && remaining > 0) {
            const allocate = Math.min(outstanding, remaining);
            const newReceived = Number(milestone.received_amount) + allocate;
            const isCompleted = newReceived >= Number(milestone.due_amount);
            
            await db.query(`
              UPDATE payment_schedules
              SET received_amount = $1, status = $2, updated_at = NOW()
              WHERE id = $3
            `, [newReceived, isCompleted ? 'Completed' : milestone.status, milestone.id]);

            remaining -= allocate;
          }
        }

        // 3. Write into Customer Timeline
        await db.query(`
          INSERT INTO customer_timeline (customer_id, event_type, description, event_date)
          VALUES ($1, 'Payment Entered', $2, $3)
        `, [customer_id, `Payment of ₹${amount} received via ${payment_mode} (Receipt: ${receipt_number})`, payment_date]);

        // 4. Update Unit Status if Booking or Registration payment completed
        const custRes = await db.query(`SELECT unit_id FROM customers WHERE id = $1`, [customer_id]);
        const unitId = custRes.rows[0].unit_id;

        if (payment_type === 'Booking') {
          await db.query(`UPDATE units SET status = 'Booked', updated_at = NOW() WHERE id = $1 AND status = 'Available'`, [unitId]);
        } else if (payment_type === 'Registration') {
          await db.query(`UPDATE units SET status = 'Registered', updated_at = NOW() WHERE id = $1`, [unitId]);
          await db.query(`UPDATE customers SET registration_date = $1, registration_status = 'Completed', updated_at = NOW() WHERE id = $2`, [payment_date, customer_id]);
        }

        await db.query('COMMIT');
        return newPayment;
      } catch (err) {
        await db.query('ROLLBACK');
        throw err;
      }
    } else {
      const store = db.getJsonDb();
      
      const customer = store.customers.find(c => c.id === customer_id && !c.deleted_at);
      if (!customer) throw new Error('Customer not found');

      const unit = store.units.find(u => u.id === customer.unit_id);

      // Create payment row
      const newPayment = {
        id: `pay-id-${customer_id}-${Date.now()}`,
        customer_id,
        amount: Number(amount),
        payment_date,
        payment_type,
        payment_mode,
        transaction_number,
        bank_name,
        receipt_number,
        receipt_url: `receipts/${receipt_number}.pdf`,
        remarks,
        entered_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      };

      store.payments.push(newPayment);

      // Distribute payment in JSON milestones
      let remaining = Number(amount);
      const schedules = store.payment_schedules.filter(s => s.customer_id === customer_id && !s.deleted_at).sort((a, b) => a.due_date.localeCompare(b.due_date));
      
      schedules.forEach(milestone => {
        const outstanding = Number(milestone.outstanding_amount);
        if (outstanding > 0 && remaining > 0) {
          const allocate = Math.min(outstanding, remaining);
          milestone.received_amount = Number(milestone.received_amount) + allocate;
          milestone.outstanding_amount = Number(milestone.due_amount) - milestone.received_amount;
          milestone.status = milestone.outstanding_amount <= 0 ? 'Completed' : milestone.status;
          milestone.updated_at = new Date().toISOString();
          remaining -= allocate;
        }
      });

      // Timeline Log
      store.customer_timeline.push({
        id: `time-id-${customer_id}-${Date.now()}`,
        customer_id,
        event_type: 'Payment Entered',
        description: `Payment of ₹${Number(amount).toLocaleString()} received via ${payment_mode} (Receipt: ${receipt_number})`,
        event_date: payment_date,
        created_at: new Date().toISOString()
      });

      // Update Unit & Customer statuses
      if (unit) {
        if (payment_type === 'Booking' && unit.status === 'Available') {
          unit.status = 'Booked';
        } else if (payment_type === 'Registration') {
          unit.status = 'Registered';
          customer.registration_date = payment_date;
        } else if (payment_type === 'Possession') {
          unit.status = 'Possession Given';
          customer.possession_date = payment_date;
        }
        unit.updated_at = new Date().toISOString();
      }
      customer.updated_at = new Date().toISOString();

      db.saveJsonDb(store);
      try { excelSyncService.syncJSONToExcel(); } catch (e) { console.error('Excel sync error:', e); }
      return newPayment;
    }
  },

  // ==========================================
  // CRM ACTIVITY NOTES & CUSTOMER REGISTRATIONS
  // ==========================================
  addCustomerNote: async (customerId, userId, note) => {
    if (db.isPg) {
      const res = await db.query(`
        INSERT INTO customer_notes (customer_id, user_id, note)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [customerId, userId, note]);
      return res.rows[0];
    } else {
      const store = db.getJsonDb();
      const newNote = {
        id: `note-id-${customerId}-${Date.now()}`,
        customer_id: customerId,
        user_id: userId,
        note: note,
        created_at: new Date().toISOString()
      };
      store.customer_notes.push(newNote);
      db.saveJsonDb(store);
      return newNote;
    }
  },

  updateLegalStatus: async (customerId, fields) => {
    const { agreement_date, registration_date, possession_date, unit_status } = fields;
    
    if (db.isPg) {
      await db.query('BEGIN');
      try {
        const updateFields = [];
        const params = [];
        let idx = 1;

        if (agreement_date !== undefined) {
          updateFields.push(`agreement_date = $${idx}`);
          params.push(agreement_date);
          idx++;
        }
        if (registration_date !== undefined) {
          updateFields.push(`registration_date = $${idx}`);
          params.push(registration_date);
          idx++;
        }
        if (possession_date !== undefined) {
          updateFields.push(`possession_date = $${idx}`);
          params.push(possession_date);
          idx++;
        }

        if (updateFields.length > 0) {
          params.push(customerId);
          await db.query(`UPDATE customers SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, params);
        }

        if (unit_status) {
          const uRes = await db.query(`SELECT unit_id FROM customers WHERE id = $1`, [customerId]);
          const unitId = uRes.rows[0].unit_id;
          await db.query(`UPDATE units SET status = $1, updated_at = NOW() WHERE id = $2`, [unit_status, unitId]);
        }

        // Timeline Log
        await db.query(`
          INSERT INTO customer_timeline (customer_id, event_type, description, event_date)
          VALUES ($1, 'Legal Status Update', $2, NOW())
        `, [customerId, `Customer files status updated: Agreement Date: ${agreement_date || 'N/A'}, Registration Date: ${registration_date || 'N/A'}`]);

        await db.query('COMMIT');
      } catch (err) {
        await db.query('ROLLBACK');
        throw err;
      }
    } else {
      const store = db.getJsonDb();
      const customer = store.customers.find(c => c.id === customerId);
      if (!customer) throw new Error('Customer not found');

      if (agreement_date !== undefined) customer.agreement_date = agreement_date;
      if (registration_date !== undefined) customer.registration_date = registration_date;
      if (possession_date !== undefined) customer.possession_date = possession_date;
      
      const unit = store.units.find(u => u.id === customer.unit_id);
      if (unit && unit_status) {
        unit.status = unit_status;
        unit.updated_at = new Date().toISOString();
      }

      store.customer_timeline.push({
        id: `time-id-${customerId}-${Date.now()}`,
        customer_id: customerId,
        event_type: 'Legal Status Update',
        description: `Customer files status updated: Unit status is now '${unit_status}'.`,
        event_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      });

      customer.updated_at = new Date().toISOString();
      db.saveJsonDb(store);
      try { excelSyncService.syncJSONToExcel(); } catch (e) { console.error('Excel sync error:', e); }
    }
  },

  // ==========================================
  // DOCUMENTS MANAGEMENT
  // ==========================================
  addDocument: async (docData) => {
    const { customer_id, category, file_name, file_url, uploaded_by } = docData;

    if (db.isPg) {
      const res = await db.query(`
        INSERT INTO documents (customer_id, category, file_name, file_url, uploaded_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [customer_id, category, file_name, file_url, uploaded_by]);

      await db.query(`
        INSERT INTO customer_timeline (customer_id, event_type, description, event_date)
        VALUES ($1, 'Document Uploaded', $2, NOW())
      `, [customer_id, `${category} document uploaded (${file_name})`]);

      return res.rows[0];
    } else {
      const store = db.getJsonDb();
      const newDoc = {
        id: `doc-id-${Date.now()}`,
        customer_id,
        category,
        file_name,
        file_url,
        uploaded_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      };

      store.documents.push(newDoc);

      store.customer_timeline.push({
        id: `time-id-${customer_id}-${Date.now()}`,
        customer_id,
        event_type: 'Document Uploaded',
        description: `${category} document uploaded (${file_name})`,
        event_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      });

      db.saveJsonDb(store);
      return newDoc;
    }
  },

  // ==========================================
  // CONSTRUCTION PROGRESS UPDATES
  // ==========================================
  getConstructionStages: async (projectId) => {
    if (db.isPg) {
      const res = await db.query(`SELECT * FROM construction_stages WHERE project_id = $1 ORDER BY created_at ASC`, [projectId]);
      return res.rows;
    } else {
      const store = db.getJsonDb();
      return store.construction_stages.filter(cs => cs.project_id === projectId && !cs.deleted_at);
    }
  },

  updateConstructionProgress: async (stageId, progress, notes, photos) => {
    if (db.isPg) {
      await db.query(`
        UPDATE construction_stages
        SET progress_percentage = $1, engineer_notes = $2, photos = $3, updated_at = NOW()
        WHERE id = $4
      `, [progress, notes, photos, stageId]);

      // Calculate project aggregate progress
      // We take average progress of all stages for simplicity, or weighted average
      const stageRes = await db.query(`SELECT project_id FROM construction_stages WHERE id = $1`, [stageId]);
      const pId = stageRes.rows[0].project_id;
      
      const avgRes = await db.query(`SELECT AVG(progress_percentage) as avg_prog FROM construction_stages WHERE project_id = $1`, [pId]);
      const avgProg = Math.round(Number(avgRes.rows[0].avg_prog));

      await db.query(`UPDATE projects SET construction_percentage = $1, construction_status = $2, updated_at = NOW() WHERE id = $3`, [avgProg, avgProg >= 100 ? 'Completed' : 'In Progress', pId]);
    } else {
      const store = db.getJsonDb();
      const stage = store.construction_stages.find(cs => cs.id === stageId);
      if (!stage) throw new Error('Construction stage not found');

      stage.progress_percentage = Number(progress);
      stage.engineer_notes = notes;
      if (photos) stage.photos = photos;
      stage.updated_at = new Date().toISOString();

      // Recalculate Project Aggregate
      const stages = store.construction_stages.filter(cs => cs.project_id === stage.project_id);
      const totalProg = stages.reduce((sum, cs) => sum + Number(cs.progress_percentage), 0);
      const avgProg = Math.round(totalProg / stages.length);

      const project = store.projects.find(p => p.id === stage.project_id);
      if (project) {
        project.construction_percentage = avgProg;
        project.construction_status = avgProg >= 100 ? 'Completed' : 'In Progress';
        project.updated_at = new Date().toISOString();
      }

      db.saveJsonDb(store);
    }
  },

  // ==========================================
  // REPORTS GENERATORS
  // ==========================================
  getLedgerReport: async (customerId) => {
    // Generates a customer's debit / credit balance report
    const profile = await dbRepository.getCustomerProfile(customerId);
    if (!profile) return null;

    let balance = 0;
    const ledger = [];

    // Milestones act as Debits (amount to pay)
    profile.paymentSchedules.forEach(sched => {
      ledger.push({
        date: sched.due_date,
        type: 'DEBIT',
        description: `Milestone: ${sched.milestone_name} (${sched.due_percentage}%)`,
        amount: Number(sched.due_amount),
        receipt_number: '-',
        mode: '-',
        remarks: '-'
      });
    });

    // Payments act as Credits (amounts received)
    profile.payments.forEach(pay => {
      ledger.push({
        date: pay.payment_date,
        type: 'CREDIT',
        description: `Received Payment - ${pay.payment_type}`,
        amount: Number(pay.amount),
        receipt_number: pay.receipt_number,
        mode: pay.payment_mode,
        remarks: pay.remarks || 'Receipt Issued'
      });
    });

    // Sort items chronologically
    ledger.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate Running Balance
    const runningLedger = ledger.map(entry => {
      if (entry.type === 'DEBIT') {
        balance += entry.amount; // Customer owes money
      } else {
        balance -= entry.amount; // Customer pays off their debt
      }
      return {
        ...entry,
        running_balance: balance
      };
    });

    return {
      customer: profile.customer,
      ledger: runningLedger,
      current_balance: balance
    };
  },

  getCollectionsReport: async (projectId = null) => {
    // Aggregates payment statistics
    if (db.isPg) {
      let query = `
        SELECT p.payment_date, p.amount, p.payment_mode, p.receipt_number, c.name as customer_name, u.unit_number, proj.name as project_name
        FROM payments p
        JOIN customers c ON p.customer_id = c.id
        JOIN units u ON c.unit_id = u.id
        JOIN buildings b ON u.building_id = b.id
        JOIN projects proj ON b.project_id = proj.id
        WHERE p.deleted_at IS NULL
      `;
      const params = [];
      if (projectId) {
        query += ` AND proj.id = $1`;
        params.push(projectId);
      }
      query += ` ORDER BY p.payment_date DESC`;
      const res = await db.query(query, params);
      return res.rows;
    } else {
      const store = db.getJsonDb();
      let allPayments = store.payments.filter(p => !p.deleted_at);

      const formatted = allPayments.map(p => {
        const customer = store.customers.find(c => c.id === p.customer_id);
        const unit = customer ? store.units.find(u => u.id === customer.unit_id) : null;
        const b = unit ? store.buildings.find(building => building.id === unit.building_id) : null;
        const proj = b ? store.projects.find(pr => pr.id === b.project_id) : null;

        return {
          payment_date: p.payment_date,
          amount: Number(p.amount),
          payment_mode: p.payment_mode,
          receipt_number: p.receipt_number,
          customer_name: customer ? customer.name : 'Unknown',
          unit_number: unit ? unit.unit_number : '-',
          project_id: proj ? proj.id : null,
          project_name: proj ? proj.name : '-'
        };
      });

      if (projectId) {
        return formatted.filter(f => f.project_id === projectId);
      }
      return formatted.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
    }
  },

  getOutstandingReport: async (projectId = null) => {
    // Lists all customers with overdue milestones and outstanding debts
    if (db.isPg) {
      let query = `
        SELECT c.id as customer_id, c.name as customer_name, c.mobile_number, u.unit_number, u.final_sale_price,
               COALESCE(SUM(ps.due_amount), 0) as total_due,
               COALESCE(SUM(ps.received_amount), 0) as total_received,
               COALESCE(SUM(ps.outstanding_amount), 0) as total_outstanding
        FROM customers c
        JOIN units u ON c.unit_id = u.id
        JOIN buildings b ON u.building_id = b.id
        LEFT JOIN payment_schedules ps ON ps.customer_id = c.id AND ps.deleted_at IS NULL
        WHERE c.deleted_at IS NULL
      `;
      const params = [];
      if (projectId) {
        query += ` AND b.project_id = $1`;
        params.push(projectId);
      }
      query += ` GROUP BY c.id, c.name, c.mobile_number, u.unit_number, u.final_sale_price`;
      const res = await db.query(query, params);
      return res.rows;
    } else {
      const store = db.getJsonDb();
      return store.customers.filter(c => !c.deleted_at).map(c => {
        const u = store.units.find(unit => unit.id === c.unit_id);
        const b = u ? store.buildings.find(bl => bl.id === u.building_id) : null;
        
        const schedules = store.payment_schedules.filter(s => s.customer_id === c.id && !s.deleted_at);
        const totalDue = schedules.reduce((sum, s) => sum + Number(s.due_amount), 0);
        const totalReceived = schedules.reduce((sum, s) => sum + Number(s.received_amount), 0);

        return {
          customer_id: c.id,
          customer_name: c.name,
          mobile_number: c.mobile_number,
          unit_number: u ? u.unit_number : '-',
          final_sale_price: u ? Number(u.final_sale_price) : 0,
          total_due: totalDue,
          total_received: totalReceived,
          total_outstanding: totalDue - totalReceived,
          project_id: b ? b.project_id : null
        };
      }).filter(r => !projectId || r.project_id === projectId);
    }
  }
};

module.exports = dbRepository;
