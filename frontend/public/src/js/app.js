// Shree ERP - Main Application SPA Router & Controller

const app = {
  activePage: 'dashboard',
  currentProject: 'project-1',

  init: () => {
    // 1. Check Authenticated State
    app.checkAuth();

    // 2. Setup Event Listeners
    app.setupListeners();

    // 3. Register Routing hash triggers
    window.addEventListener('hashchange', app.handleRouting);
    app.handleRouting();
    
    // Set date header display
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date-display').innerText = new Date().toLocaleDateString('en-US', dateOpts);
  },

  checkAuth: () => {
    let token = localStorage.getItem('token');
    let userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      // Auto-bypass login: seed Super Admin credentials
      localStorage.setItem('token', 'bypass-token-super-admin');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-id-1',
        name: 'Super Admin User',
        email: 'admin@shree.com',
        role: 'Super Admin'
      }));
      token = 'bypass-token-super-admin';
      userStr = JSON.stringify({
        id: 'user-id-1',
        name: 'Super Admin User',
        email: 'admin@shree.com',
        role: 'Super Admin'
      });
    }

    const user = JSON.parse(userStr);
    const loginContainer = document.getElementById('login-container');
    if (loginContainer) loginContainer.classList.remove('active');
    
    const appContainer = document.getElementById('app-container');
    if (appContainer) appContainer.classList.remove('hidden');
    
    document.getElementById('user-display-name').innerText = user.name;
    document.getElementById('user-display-role').innerText = user.role;
  },

  setupListeners: () => {
    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
          const res = await apiClient.post('/api/auth/login', { email, password });
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          app.checkAuth();
          window.location.hash = '#dashboard';
        } catch (err) {
          alert(err.message || 'Authentication failed. Please verify credentials.');
        }
      });
    }

    // Logout trigger
    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      app.checkAuth();
    });

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', nextTheme);
      themeToggle.innerHTML = nextTheme === 'dark' 
        ? '<i class="fa-solid fa-sun"></i> <span>Light Mode</span>'
        : '<i class="fa-solid fa-moon"></i> <span>Dark Mode</span>';
    });

    // Sidebar Collapse (Mobile Toggle)
    const sidebar = document.querySelector('.sidebar');
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      sidebar.classList.toggle('expanded');
    });

    // Global Project Change
    document.getElementById('global-project-select').addEventListener('change', (e) => {
      app.currentProject = e.target.value;
      app.handleRouting();
    });

    // Global Predictive Search Keyups
    const searchInput = document.getElementById('global-search');
    const searchResults = document.getElementById('search-results-dropdown');
    
    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length < 2) {
        searchResults.classList.add('hidden');
        return;
      }

      try {
        // Query customers list to search client side
        const custRes = await apiClient.get(`/api/customers?project_id=${app.currentProject}`);
        const filtered = custRes.customers.filter(c => 
          c.name.toLowerCase().includes(query) ||
          c.unit_number.toLowerCase().includes(query) ||
          c.mobile_number.includes(query) ||
          (c.pan && c.pan.toLowerCase().includes(query))
        );

        searchResults.innerHTML = '';
        if (filtered.length === 0) {
          searchResults.innerHTML = '<div class="search-result-item"><span class="title">No matching customers found</span></div>';
        } else {
          filtered.forEach(c => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
              <div>
                <span class="title">${c.name}</span><br>
                <span class="subtitle">Unit ${c.unit_number} (Wing ${c.wing}) | ${c.mobile_number}</span>
              </div>
              <span class="badge badge-role">${c.unit_status}</span>
            `;
            div.addEventListener('click', () => {
              searchResults.classList.add('hidden');
              searchInput.value = '';
              window.location.hash = `#customer-profile/${c.id}`;
            });
            searchResults.appendChild(div);
          });
        }
        searchResults.classList.remove('hidden');
      } catch (err) {
        console.error('Search query failed:', err);
      }
    });

    // Hide search suggestions on click away
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
      }
    });

    // Payment Form submission handler
    document.getElementById('payment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        customer_id: document.getElementById('payment-customer-select').value,
        amount: Number(document.getElementById('payment-amount').value),
        payment_date: document.getElementById('payment-date').value,
        payment_type: document.getElementById('payment-type').value,
        payment_mode: document.getElementById('payment-mode').value,
        transaction_number: document.getElementById('payment-txn-no').value,
        bank_name: document.getElementById('payment-bank').value,
        remarks: document.getElementById('payment-remarks').value
      };

      try {
        await apiClient.post('/api/payments', payload);
        app.closePaymentModal();
        alert('Payment logged successfully, ledger recalculated.');
        app.handleRouting(); // Reload current view
      } catch (err) {
        alert(err.message || 'Payment execution failed.');
      }
    });
  },

  handleRouting: () => {
    const hash = window.location.hash || '#dashboard';
    
    // De-activate current navigation links
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));

    // Split parameters for detailed views (e.g. #customer-profile/cust-id-1)
    const parts = hash.split('/');
    const mainHash = parts[0];
    const parameter = parts[1];

    // Map main hashes to sidebar active items
    const navItem = document.querySelector(`.sidebar-nav a[href="${mainHash}"]`);
    if (navItem) navItem.classList.add('active');

    // Switch panels visibility
    document.querySelectorAll('.main-content .app-page').forEach(p => p.classList.remove('active'));

    if (mainHash === '#dashboard') {
      document.getElementById('page-dashboard').classList.add('active');
      dashboardView.init();
    } else if (mainHash === '#units') {
      document.getElementById('page-units').classList.add('active');
      unitsView.init();
    } else if (mainHash === '#customers') {
      document.getElementById('page-customers').classList.add('active');
      customerView.initDirectory();
    } else if (mainHash === '#customer-profile' && parameter) {
      document.getElementById('page-customer-profile').classList.add('active');
      customerView.initProfile(parameter);
    } else if (mainHash === '#payments') {
      document.getElementById('page-payments').classList.add('active');
      paymentsView.init();
    } else if (mainHash === '#construction') {
      document.getElementById('page-construction').classList.add('active');
      constructionView.init();
    } else if (mainHash === '#reports') {
      document.getElementById('page-reports').classList.add('active');
      reportsView.init();
    } else if (mainHash === '#demands') {
      document.getElementById('page-demands').classList.add('active');
      demandsView.init();
    }
    
    // Close sidebar on mobile navigation
    document.querySelector('.sidebar').classList.remove('expanded');
  },

  switchPage: (pageName) => {
    window.location.hash = `#${pageName}`;
  },

  // Modals management
  showNewPaymentModal: async (selectedCustomerId = null) => {
    // Populate customer dropdown
    try {
      const res = await apiClient.get(`/api/customers?project_id=${app.currentProject}`);
      const select = document.getElementById('payment-customer-select');
      select.innerHTML = '<option value="">-- Choose Client --</option>';
      res.customers.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.innerText = `${c.name} (Unit ${c.unit_number})`;
        if (selectedCustomerId && c.id === selectedCustomerId) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      // Preset current date
      document.getElementById('payment-date').value = new Date().toISOString().split('T')[0];
      
      document.getElementById('payment-modal').classList.remove('hidden');
    } catch (err) {
      alert('Could not fetch customer list: ' + err.message);
    }
  },

  closePaymentModal: () => {
    document.getElementById('payment-modal').classList.add('hidden');
    document.getElementById('payment-form').reset();
  },

  showModal: (modalId) => {
    document.getElementById(modalId).classList.remove('hidden');
  },

  closeModal: (modalId) => {
    document.getElementById(modalId).classList.add('hidden');
  },

  // Open single receipt overlay
  showReceiptPreview: async (paymentId) => {
    try {
      const res = await apiClient.get(`/api/payments/${paymentId}/receipt`);
      const { payment, customer, unit } = res;
      
      const content = `
        <div class="receipt-header">
          <h2>SHREE ENTERPRISES</h2>
          <p>401, Sapphire Chambers, Baner, Pune, MH</p>
          <p>GSTIN: 27AAAFS2910M1Z3 | RERA: P52100029381</p>
          <h3 class="mt-4">RECEIPT OF PAYMENT</h3>
        </div>
        <div class="receipt-body">
          <div class="receipt-row">
            <span>Receipt No:</span>
            <strong>${payment.receipt_number}</strong>
          </div>
          <div class="receipt-row">
            <span>Date:</span>
            <strong>${payment.payment_date}</strong>
          </div>
          <div class="receipt-row">
            <span>Client Name:</span>
            <strong>${customer.name}</strong>
          </div>
          <div class="receipt-row">
            <span>Property Allocation:</span>
            <strong>Unit ${unit.unit_number} (Wing ${unit.wing}, Floor ${unit.floor})</strong>
          </div>
          <div class="receipt-row">
            <span>Payment Mode:</span>
            <strong>${payment.payment_mode} (Ref: ${payment.transaction_number})</strong>
          </div>
          <div class="receipt-row">
            <span>Bank Drawer:</span>
            <strong>${payment.bank_name}</strong>
          </div>
          <div class="receipt-row">
            <span>Payment Class:</span>
            <strong>${payment.payment_type} Milestone</strong>
          </div>
          <div class="receipt-row total">
            <span>AMOUNT RECEIVED:</span>
            <strong>₹${Number(payment.amount).toLocaleString('en-IN')}.00</strong>
          </div>
          <div class="receipt-row">
            <span>Remarks:</span>
            <strong>${payment.remarks}</strong>
          </div>
        </div>
        <div class="receipt-footer">
          <p>This is a computer generated receipt. No physical signature is required.</p>
          <p class="mt-2">Thank you for partnering with Shree Enterprises.</p>
        </div>
      `;

      document.getElementById('receipt-print-content').innerHTML = content;
      app.showModal('receipt-modal');
    } catch (err) {
      alert('Failed to retrieve receipt details: ' + err.message);
    }
  },

  downloadExcelDb: async () => {
    try {
      const token = localStorage.getItem('token');
      const targetUrl = window.location.origin.startsWith('file') || !window.location.origin.includes('5000') ? 'http://localhost:5000' : window.location.origin;
      
      const response = await fetch(`${targetUrl}/api/excel/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'erp_data.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading Excel: ' + err.message);
    }
  },

  handleExcelUpload: async (input) => {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('excel', file);

    try {
      const token = localStorage.getItem('token');
      const targetUrl = window.location.origin.startsWith('file') || !window.location.origin.includes('5000') ? 'http://localhost:5000' : window.location.origin;
      
      const response = await fetch(`${targetUrl}/api/excel/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Upload failed');
      
      alert('Cloud database synchronized successfully with Excel!');
      input.value = '';
      app.handleRouting();
    } catch (err) {
      alert('Excel Sync Error: ' + err.message);
      input.value = '';
    }
  }
};

window.onload = () => {
  app.init();
};
