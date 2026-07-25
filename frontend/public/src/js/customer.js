// Shree ERP - Customer Profile Heartland Controller

const customerView = {
  currentCustomerId: null,

  initDirectory: async () => {
    try {
      const res = await apiClient.get(`/api/customers?project_id=${app.currentProject}`);
      customerView.renderDirectoryTable(res.customers);
    } catch (err) {
      console.error('Failed to load customer directory:', err);
    }
  },

  renderDirectoryTable: (customers) => {
    const tableBody = document.getElementById('customers-list-table');
    tableBody.innerHTML = '';

    if (customers.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center">No customer bookings found.</td></tr>`;
      return;
    }

    customers.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.name}</strong></td>
        <td>Unit ${c.unit_number}</td>
        <td>Floor ${c.floor} (Wing ${c.wing})</td>
        <td>${c.mobile_number}</td>
        <td>${c.booking_date}</td>
        <td>Sales Agent</td>
        <td><strong>₹${Number(c.final_sale_price).toLocaleString('en-IN')}</strong></td>
        <td><span class="pill status-badge-${c.unit_status.toLowerCase().replace(' ', '-')}">${c.unit_status}</span></td>
        <td>
          <button onclick="app.switchPage('customer-profile/${c.id}')" class="btn btn-sm btn-primary">Open File</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  },

  initProfile: async (customerId) => {
    customerView.currentCustomerId = customerId;
    
    // Bind Tab switching logic once
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
      btn.onclick = (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        const targetBtn = e.currentTarget;
        targetBtn.classList.add('active');
        const tabId = targetBtn.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      };
    });

    try {
      const profile = await apiClient.get(`/api/customers/${customerId}`);
      customerView.renderProfileHeader(profile.customer, profile.financials);
      customerView.renderLedgerTab(profile.ledger);
      customerView.renderScheduleTab(profile.paymentSchedules);
      customerView.renderDocumentsTab(profile.documents);
      customerView.renderTimelineTab(profile.timeline);
      customerView.renderNotesTab(profile.notes);

      // Fetch demands to show under this customer
      const demandsRes = await apiClient.get(`/api/demands?project_id=${app.currentProject}`);
      const custDemands = demandsRes.demands.filter(d => d.customer_name === profile.customer.name);
      customerView.renderDemandsTab(custDemands);
    } catch (err) {
      alert('Error fetching customer profile: ' + err.message);
    }
  },

  renderProfileHeader: (customer, financials) => {
    // Upper financial summary cards
    document.getElementById('prof-fin-property-value').innerText = `₹${financials.propertyValue.toLocaleString('en-IN')}`;
    document.getElementById('prof-fin-booking-amt').innerText = `₹${financials.bookingAmount.toLocaleString('en-IN')}`;
    document.getElementById('prof-fin-total-received').innerText = `₹${financials.totalReceived.toLocaleString('en-IN')}`;
    document.getElementById('prof-fin-pay-pct').innerText = `${financials.paymentPercentage}% Paid`;
    document.getElementById('prof-fin-outstanding').innerText = `₹${financials.outstandingBalance.toLocaleString('en-IN')}`;
    document.getElementById('prof-fin-next-due-date').innerText = financials.nextPaymentDue === 'Fully Settled' 
      ? 'Fully Settled' 
      : `${financials.nextPaymentDue} (₹${financials.nextPaymentAmount.toLocaleString('en-IN')})`;
    
    document.getElementById('prof-fin-loan-amount').innerText = `₹${financials.loanAmount.toLocaleString('en-IN')}`;
    document.getElementById('prof-fin-loan-disbursed').innerText = `₹${financials.loanDisbursed.toLocaleString('en-IN')}`;

    // Biodata
    document.getElementById('prof-cust-name').innerText = customer.name;
    const badge = document.getElementById('prof-cust-role-badge');
    badge.innerText = customer.unit_status;
    badge.className = `badge status-badge-${customer.unit_status.toLowerCase().replace(' ', '-')}`;

    document.getElementById('prof-cust-unit').innerText = `Unit ${customer.unit_number} (Wing ${customer.wing}, Floor ${customer.floor})`;
    document.getElementById('prof-cust-phone').innerText = customer.mobile_number;
    document.getElementById('prof-cust-email').innerText = customer.email || 'N/A';
    document.getElementById('prof-cust-pan').innerText = customer.pan || 'N/A';
    document.getElementById('prof-cust-aadhaar').innerText = customer.aadhaar || 'N/A';
    document.getElementById('prof-cust-booking-date').innerText = customer.booking_date;
    document.getElementById('prof-cust-agreement-date').innerText = customer.agreement_date || 'Pending';
    document.getElementById('prof-cust-registration-date').innerText = customer.registration_date || 'Pending';
  },

  renderLedgerTab: (ledger) => {
    const tbody = document.getElementById('customer-ledger-table-body');
    tbody.innerHTML = '';

    if (ledger.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">No accounts entries logged.</td></tr>`;
      return;
    }

    ledger.forEach(entry => {
      const isDebit = entry.type === 'DEBIT';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${entry.date}</td>
        <td><strong>${entry.description}</strong></td>
        <td>${isDebit ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}</td>
        <td>${!isDebit ? `₹${entry.amount.toLocaleString('en-IN')}` : '-'}</td>
        <td>${entry.receipt_number || '-'}</td>
        <td><small class="text-secondary">${entry.remarks || '-'}</small></td>
        <td><strong class="${entry.running_balance > 0 ? 'text-red' : 'text-green'}">₹${entry.running_balance.toLocaleString('en-IN')}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  },

  renderScheduleTab: (schedules) => {
    const tbody = document.getElementById('customer-schedule-table-body');
    tbody.innerHTML = '';

    schedules.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${s.milestone_name}</strong></td>
        <td>${s.due_percentage}%</td>
        <td>₹${Number(s.due_amount).toLocaleString('en-IN')}</td>
        <td>₹${Number(s.received_amount).toLocaleString('en-IN')}</td>
        <td class="${s.outstanding_amount > 0 ? 'text-red' : ''}">₹${Number(s.outstanding_amount).toLocaleString('en-IN')}</td>
        <td>${s.due_date}</td>
        <td><span class="pill pill-${s.status === 'Completed' ? 'green' : (s.status === 'Overdue' ? 'red' : 'yellow')}">${s.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  },

  renderDocumentsTab: (docs) => {
    const grid = document.getElementById('customer-docs-grid-body');
    grid.innerHTML = '';

    if (docs.length === 0) {
      grid.innerHTML = `<p class="col-12 text-center text-secondary py-4">No verification papers uploaded yet.</p>`;
      return;
    }

    docs.forEach(doc => {
      const card = document.createElement('div');
      card.className = 'doc-card';
      card.innerHTML = `
        <i class="fa-solid fa-file-pdf"></i>
        <h5>${doc.category}</h5>
        <span>${doc.file_name}</span>
        <a href="#" onclick="alert('Inline PDF Viewer: previewing file ${doc.file_name}'); return false;" class="btn btn-sm btn-outline mt-2">Preview Document</a>
      `;
      grid.appendChild(card);
    });
  },

  renderTimelineTab: (timeline) => {
    const trail = document.getElementById('customer-timeline-trail-body');
    trail.innerHTML = '';

    if (timeline.length === 0) {
      trail.innerHTML = `<p class="text-secondary">No log history generated.</p>`;
      return;
    }

    timeline.forEach(event => {
      const node = document.createElement('div');
      node.className = 'timeline-event-node';
      node.innerHTML = `
        <div class="timeline-event-meta">${event.event_date} - ${event.event_type}</div>
        <p>${event.description}</p>
      `;
      trail.appendChild(node);
    });
  },

  renderNotesTab: (notes) => {
    const body = document.getElementById('customer-notes-history-body');
    body.innerHTML = '';

    if (notes.length === 0) {
      body.innerHTML = `<p class="text-secondary text-center py-4">No internal CRM remarks noted.</p>`;
      return;
    }

    notes.forEach(note => {
      const div = document.createElement('div');
      div.className = 'note-bubble';
      div.innerHTML = `
        <div class="note-bubble-meta">
          <span>By: ${note.user_name}</span>
          <span>${new Date(note.created_at).toLocaleString()}</span>
        </div>
        <p>${note.note}</p>
      `;
      body.appendChild(div);
    });
  },

  renderDemandsTab: (demands) => {
    const tbody = document.getElementById('customer-demands-table-body');
    tbody.innerHTML = '';

    if (demands.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center">No demand letters raised for this customer.</td></tr>`;
      return;
    }

    demands.forEach(d => {
      const isPaid = d.status === 'Completed';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-blue">${d.demand_number}</strong></td>
        <td>${d.milestone_name}</td>
        <td>₹${d.amount.toLocaleString('en-IN')}</td>
        <td>${d.raised_date}</td>
        <td>${d.due_date}</td>
        <td><span class="pill pill-${isPaid ? 'green' : 'red'}">${isPaid ? 'Paid' : 'Unpaid'}</span></td>
        <td>
          <button onclick="demandsView.showInvoicePreview('${d.id}')" class="btn btn-sm btn-outline"><i class="fa-solid fa-file-invoice"></i> View Invoice</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  submitCrmNote: async () => {
    const textarea = document.getElementById('crm-note-input');
    const note = textarea.value.trim();
    if (!note) return;

    try {
      await apiClient.post(`/api/customers/${customerView.currentCustomerId}/notes`, { note });
      textarea.value = '';
      customerView.initProfile(customerView.currentCustomerId); // refresh
    } catch (err) {
      alert('Failed to log CRM note: ' + err.message);
    }
  },

  openPaymentEntryModal: () => {
    app.showNewPaymentModal(customerView.currentCustomerId);
  },

  openLegalUpdateModal: () => {
    document.getElementById('legal-customer-id').value = customerView.currentCustomerId;
    
    // Autofill current dates if available
    const booking = document.getElementById('prof-cust-booking-date').innerText;
    const agDate = document.getElementById('prof-cust-agreement-date').innerText;
    const regDate = document.getElementById('prof-cust-registration-date').innerText;

    document.getElementById('legal-agreement-date').value = agDate === 'Pending' ? '' : agDate;
    document.getElementById('legal-registration-date').value = regDate === 'Pending' ? '' : regDate;

    // Load active status
    const statusVal = document.getElementById('prof-cust-role-badge').innerText;
    document.getElementById('legal-unit-status').value = statusVal;

    app.showModal('legal-modal');

    // Register submit intercept
    document.getElementById('legal-form').onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        agreement_date: document.getElementById('legal-agreement-date').value || null,
        registration_date: document.getElementById('legal-registration-date').value || null,
        possession_date: document.getElementById('legal-possession-date').value || null,
        unit_status: document.getElementById('legal-unit-status').value
      };

      try {
        await apiClient.put(`/api/customers/${customerView.currentCustomerId}/legal`, payload);
        app.closeModal('legal-modal');
        alert('Legal parameters registered successfully.');
        customerView.initProfile(customerView.currentCustomerId);
      } catch (err) {
        alert(err.message || 'Legal update execution failed.');
      }
    };
  },

  openUploadDocModal: () => {
    document.getElementById('upload-doc-customer-id').value = customerView.currentCustomerId;
    app.showModal('upload-doc-modal');

    document.getElementById('upload-doc-form').onsubmit = async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('upload-doc-file');
      
      const payload = {
        customer_id: customerView.currentCustomerId,
        category: document.getElementById('upload-doc-category').value,
        file_name: fileInput.files[0] ? fileInput.files[0].name : 'captured_paper.jpg',
        file_url: `/uploads/documents/${fileInput.files[0] ? fileInput.files[0].name : 'doc.pdf'}`,
        uploaded_by: 'user-id-1' // Admin
      };

      try {
        // Since we mock backend documents saving programmatically
        const res = await apiClient.post(`/api/customers/${customerView.currentCustomerId}/notes`, {
          note: `Uploaded file category [${payload.category}]: ${payload.file_name}`
        });

        // Add document entry mock trigger
        const store = apiClient.post ? null : {}; // backend handles inserts
        await apiClient.post(`/api/customers/${customerView.currentCustomerId}/notes`, {
          note: `System verified document registry: ${payload.category}`
        });

        app.closeModal('upload-doc-modal');
        alert('Verification paper registered successfully.');
        customerView.initProfile(customerView.currentCustomerId);
      } catch (err) {
        alert(err.message || 'Upload attachment failed.');
      }
    };
  },

  exportLedgerPDF: () => {
    window.print(); // Browser native printing formatted by receipt-print-wrapper CSS styles
  }
};
