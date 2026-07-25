// Shree ERP - Billing Demands View controller

const demandsView = {
  demands: [],

  init: async () => {
    try {
      // 1. Fetch raised demands list
      const res = await apiClient.get(`/api/demands?project_id=${app.currentProject}`);
      demandsView.demands = res.demands;
      demandsView.renderSummary(res.summary);
      demandsView.renderRaisedTable(res.demands);

      // 2. Fetch all customers schedules to compile the billing queue
      const custRes = await apiClient.get(`/api/customers?project_id=${app.currentProject}`);
      const billingQueue = [];

      for (const customer of custRes.customers) {
        // Fetch detailed profile for milestones list
        const profile = await apiClient.get(`/api/customers/${customer.id}`);
        
        profile.paymentSchedules.forEach(sched => {
          // A milestone is due for a demand letter if:
          // - It is outstanding (not fully paid).
          // - No demand letter has been raised yet (i.e. schedule_id is not in raised demands).
          const demandAlreadyRaised = demandsView.demands.some(d => d.id === sched.id || d.outstanding === sched.outstanding_amount && d.customer_name === customer.name && d.milestone_name === sched.milestone_name);
          
          // Let's check matching by schedule_id. In JSON fallback we map d.schedule_id to sched.id.
          const matchRaised = demandsView.demands.some(d => {
            // Find if there is a raised demand that matches this customer and milestone name
            return d.customer_name === customer.name && d.milestone_name === sched.milestone_name;
          });

          if (!matchRaised && sched.status !== 'Completed') {
            // Add to queue
            billingQueue.push({
              customer_id: customer.id,
              customer_name: customer.name,
              unit_number: customer.unit_number,
              schedule_id: sched.id,
              milestone_name: sched.milestone_name,
              due_amount: Number(sched.due_amount),
              due_date: sched.due_date
            });
          }
        });
      }

      demandsView.renderBillingQueue(billingQueue);
    } catch (err) {
      console.error('Failed to load demands hub:', err);
    }
  },

  renderSummary: (summary) => {
    document.getElementById('demand-stat-raised').innerText = `₹${summary.totalRaised.toLocaleString('en-IN')}`;
    document.getElementById('demand-stat-collected').innerText = `₹${summary.totalCollected.toLocaleString('en-IN')}`;
    document.getElementById('demand-stat-outstanding').innerText = `₹${summary.totalOutstanding.toLocaleString('en-IN')}`;
    document.getElementById('demand-stat-pct').innerText = `${summary.collectedPercentage}% Collected`;
  },

  renderRaisedTable: (demands) => {
    const tbody = document.getElementById('demands-raised-table-body');
    tbody.innerHTML = '';

    if (demands.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center">No demand letter invoices raised yet.</td></tr>`;
      return;
    }

    demands.forEach(d => {
      const isPaid = d.status === 'Completed';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-blue">${d.demand_number}</strong></td>
        <td>${d.customer_name}</td>
        <td>Unit ${d.unit_number}</td>
        <td>${d.milestone_name}</td>
        <td><strong>₹${d.amount.toLocaleString('en-IN')}</strong></td>
        <td>${d.due_date}</td>
        <td><span class="pill pill-${isPaid ? 'green' : 'red'}">${isPaid ? 'Paid' : 'Unpaid'}</span></td>
        <td>
          <button onclick="demandsView.showInvoicePreview('${d.id}')" class="btn btn-sm btn-outline"><i class="fa-solid fa-file-invoice"></i> View Invoice</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  renderBillingQueue: (queue) => {
    const container = document.getElementById('demands-queue-list');
    container.innerHTML = '';

    // Check user permissions
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const canRaise = user && ['Super Admin', 'Director', 'Accounts', 'CRM'].includes(user.role);

    if (queue.length === 0) {
      container.innerHTML = `<p class="text-secondary text-center py-4">Billing queue is empty. All milestones invoiced.</p>`;
      return;
    }

    // Slice to first 8 items for page neatness
    queue.slice(0, 8).forEach(item => {
      const card = document.createElement('div');
      card.className = 'note-bubble';
      card.style.display = 'flex';
      card.style.justify = 'space-between';
      card.style.alignItems = 'center';

      card.innerHTML = `
        <div>
          <h4 style="font-size:0.95rem; font-weight:600;">${item.customer_name} (Unit ${item.unit_number})</h4>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">
            Milestone: <strong>${item.milestone_name}</strong> | Due: ₹${item.due_amount.toLocaleString('en-IN')}
          </p>
        </div>
        ${canRaise 
          ? `<button onclick="demandsView.raiseDemandInvoice('${item.customer_id}', '${item.schedule_id}', '${item.due_date}')" class="btn btn-sm btn-primary"><i class="fa-solid fa-file-circle-plus"></i> Raise Invoice</button>`
          : ''
        }
      `;
      container.appendChild(card);
    });
  },

  raiseDemandInvoice: async (customerId, scheduleId, dueDate) => {
    const inputDate = prompt('Set payment due date for demand letter (YYYY-MM-DD):', dueDate);
    if (!inputDate) return;

    try {
      await apiClient.post('/api/demands/raise', {
        customer_id: customerId,
        schedule_id: scheduleId,
        due_date: inputDate
      });
      alert('Demand Letter raised successfully. Excel database synced.');
      demandsView.init(); // Refresh
    } catch (err) {
      alert('Failed to raise demand: ' + err.message);
    }
  },

  showInvoicePreview: async (demandId) => {
    try {
      const res = await apiClient.get(`/api/demands/${demandId}/invoice`);
      const { demand, customer, unit, schedule } = res;

      const content = `
        <div class="receipt-header">
          <h2>SHREE ENTERPRISES</h2>
          <p>401, Sapphire Chambers, Baner, Pune, MH</p>
          <p>GSTIN: 27AAAFS2910M1Z3 | RERA: P52100029381</p>
          <h3 class="mt-4">DEMAND LETTER & INVOICE</h3>
        </div>
        <div class="receipt-body">
          <div class="receipt-row">
            <span>Invoice Number:</span>
            <strong>${demand.demand_number}</strong>
          </div>
          <div class="receipt-row">
            <span>Invoice Date:</span>
            <strong>${demand.raised_date}</strong>
          </div>
          <div class="receipt-row">
            <span>Payment Due Date:</span>
            <strong class="text-red">${demand.due_date}</strong>
          </div>
          <div class="receipt-row">
            <span>Client Name:</span>
            <strong>${customer.name}</strong>
          </div>
          <div class="receipt-row">
            <span>Client Contact:</span>
            <strong>${customer.mobile_number} | ${customer.email || 'N/A'}</strong>
          </div>
          <div class="receipt-row">
            <span>Property Allocation:</span>
            <strong>Unit ${unit.unit_number} (Wing ${unit.wing}, Floor ${unit.floor})</strong>
          </div>
          <div class="receipt-row">
            <span>Billing Stage:</span>
            <strong>${schedule.milestone_name} (${schedule.due_percentage}%)</strong>
          </div>
          <div class="receipt-row total">
            <span>BILLING AMOUNT DUE:</span>
            <strong>₹${Number(demand.amount).toLocaleString('en-IN')}.00</strong>
          </div>
          <div class="receipt-row">
            <span>Bank Details:</span>
            <strong>ICICI Bank | Shree Ent | A/C 90812349122 | IFSC ICIC0000101</strong>
          </div>
        </div>
        <div class="receipt-footer">
          <p>Please settle the billing amount before the due date to avoid interest surcharges.</p>
          <p class="mt-2">Thank you for partnering with Shree Enterprises.</p>
        </div>
      `;

      document.getElementById('demand-letter-print-content').innerHTML = content;
      app.showModal('demand-letter-modal');
    } catch (err) {
      alert('Failed to retrieve demand letter invoice: ' + err.message);
    }
  }
};
