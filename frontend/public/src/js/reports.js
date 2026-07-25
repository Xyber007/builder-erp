// Shree ERP - Reports Hub View controller

const reportsView = {
  activeReport: 'outstanding',
  reportData: [],

  init: () => {
    // Select first tab by default
    const btns = document.querySelectorAll('.report-selector-btn');
    btns.forEach(btn => {
      btn.onclick = (e) => {
        btns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
      };
    });

    reportsView.loadReport('outstanding');
  },

  loadReport: async (type) => {
    reportsView.activeReport = type;
    const container = document.getElementById('report-display-container');
    container.innerHTML = `<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin"></i> Compiling report records...</div>`;

    let title = '';
    if (type === 'outstanding') title = 'Outstanding Balances Ledger';
    if (type === 'collections') title = 'Received Payments Log';
    if (type === 'gst') title = 'GST Payments Auditing';
    if (type === 'inventory') title = 'Unit Stock Inventory Report';

    document.getElementById('report-title-display').innerText = title;

    try {
      if (type === 'outstanding') {
        const res = await apiClient.get(`/api/reports/outstanding?project_id=${app.currentProject}`);
        reportsView.reportData = res.outstandings;
        reportsView.renderOutstandingTable(res.outstandings);
      } else if (type === 'collections') {
        const res = await apiClient.get(`/api/reports/collections?project_id=${app.currentProject}`);
        reportsView.reportData = res.collections;
        reportsView.renderCollectionsTable(res.collections);
      } else if (type === 'gst') {
        const res = await apiClient.get(`/api/reports/gst?project_id=${app.currentProject}`);
        reportsView.reportData = res.report;
        reportsView.renderGstTable(res.report);
      } else if (type === 'inventory') {
        const res = await apiClient.get(`/api/reports/inventory?project_id=${app.currentProject}`);
        reportsView.reportData = res.units;
        reportsView.renderInventoryTable(res.units);
      }
    } catch (err) {
      container.innerHTML = `<div class="text-red py-4 text-center">Failed to load report: ${err.message}</div>`;
    }
  },

  renderOutstandingTable: (data) => {
    const container = document.getElementById('report-display-container');
    
    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Mobile Number</th>
            <th>Unit Number</th>
            <th>Property Value</th>
            <th>Total Due (Stages)</th>
            <th>Total Paid</th>
            <th>Outstanding Balance</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (data.length === 0) {
      html += `<tr><td colspan="7" class="text-center">No outstanding entries.</td></tr>`;
    } else {
      data.forEach(r => {
        html += `
          <tr>
            <td><strong>${r.customer_name}</strong></td>
            <td>${r.mobile_number}</td>
            <td>Unit ${r.unit_number}</td>
            <td>₹${r.final_sale_price.toLocaleString('en-IN')}</td>
            <td>₹${r.total_due.toLocaleString('en-IN')}</td>
            <td>₹${r.total_received.toLocaleString('en-IN')}</td>
            <td><strong class="text-red">₹${r.total_outstanding.toLocaleString('en-IN')}</strong></td>
          </tr>
        `;
      });
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  renderCollectionsTable: (data) => {
    const container = document.getElementById('report-display-container');
    
    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Receipt Number</th>
            <th>Date</th>
            <th>Customer Name</th>
            <th>Unit Number</th>
            <th>Amount Collected</th>
            <th>Mode</th>
            <th>Class</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (data.length === 0) {
      html += `<tr><td colspan="7" class="text-center">No collections entries.</td></tr>`;
    } else {
      data.forEach(r => {
        html += `
          <tr>
            <td><strong class="text-green">${r.receipt_number}</strong></td>
            <td>${r.payment_date}</td>
            <td><strong>${r.customer_name}</strong></td>
            <td>Unit ${r.unit_number}</td>
            <td><strong>₹${r.amount.toLocaleString('en-IN')}</strong></td>
            <td>${r.payment_mode}</td>
            <td><span class="pill pill-blue">${r.payment_type}</span></td>
          </tr>
        `;
      });
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  renderGstTable: (data) => {
    const container = document.getElementById('report-display-container');
    
    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Unit Number</th>
            <th>GST Expected (5%)</th>
            <th>GST Paid</th>
            <th>GST Outstanding</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (data.length === 0) {
      html += `<tr><td colspan="5" class="text-center">No GST entries.</td></tr>`;
    } else {
      data.forEach(r => {
        html += `
          <tr>
            <td><strong>${r.customer_name}</strong></td>
            <td>Unit ${r.unit_number}</td>
            <td>₹${r.gst_expected.toLocaleString('en-IN')}</td>
            <td>₹${r.gst_paid.toLocaleString('en-IN')}</td>
            <td><strong class="${r.gst_outstanding > 0 ? 'text-red' : 'text-green'}">₹${r.gst_outstanding.toLocaleString('en-IN')}</strong></td>
          </tr>
        `;
      });
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  renderInventoryTable: (data) => {
    const container = document.getElementById('report-display-container');
    
    let html = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Unit Number</th>
            <th>Floor</th>
            <th>Wing</th>
            <th>Carpet Area</th>
            <th>Saleable Area</th>
            <th>Facing</th>
            <th>Property Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach(r => {
      html += `
        <tr>
          <td><strong>${r.unit_number}</strong></td>
          <td>Floor ${r.floor}</td>
          <td>Wing ${r.wing}</td>
          <td>${r.carpet_area} sq ft</td>
          <td>${r.saleable_area} sq ft</td>
          <td>${r.facing}</td>
          <td>₹${r.final_sale_price.toLocaleString('en-IN')}</td>
          <td><span class="pill pill-${unitsView.getStatusPillClass(r.status)}">${r.status}</span></td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  exportReport: () => {
    // Generate CSV data from table
    const table = document.querySelector('#report-display-container table');
    if (!table) return;

    let csvContent = '';
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
      const cols = row.querySelectorAll('th, td');
      const rowData = [];
      cols.forEach(col => {
        // Strip out commas and currency symbols to prevent CSV format breakage
        let text = col.innerText.replace(/₹/g, '').replace(/,/g, '').replace(/\n/g, ' ');
        rowData.push(`"${text}"`);
      });
      csvContent += rowData.join(',') + '\r\n';
    });

    // Create file trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `shree_erp_${reportsView.activeReport}_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
