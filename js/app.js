
/* ════════════════════════════════════════
   LOGIN FLOW
════════════════════════════════════════ */
function showStep(id) {
  ['s-login','s-forgot','s-sent','s-otp'].forEach(function(s) {
    var el = document.getElementById(s);
    if (el) el.style.display = 'none';
  });
  var t = document.getElementById(id);
  if (t) { t.style.display = ''; t.style.animation = 'fadeUp .25s ease'; }
}

function togglePw() {
  var p = document.getElementById('l-pass');
  var e = document.getElementById('pw-eye');
  if (!p || !e) return;
  if (p.type === 'password') { p.type = 'text'; e.className = 'ti ti-eye-off'; }
  else { p.type = 'password'; e.className = 'ti ti-eye'; }
}

function doLogin() {
  var btn = document.getElementById('l-btn');
  var eb  = document.getElementById('err-banner');
  // Clear previous errors
  if (eb) eb.classList.remove('show');
  var eEmail = document.getElementById('e-email');
  var ePass  = document.getElementById('e-pass');
  var lEmail = document.getElementById('l-email');
  var lPass  = document.getElementById('l-pass');
  if (eEmail) eEmail.classList.remove('show');
  if (ePass)  ePass.classList.remove('show');
  if (lEmail) lEmail.classList.remove('err');
  if (lPass)  lPass.classList.remove('err');

  var email = lEmail ? lEmail.value : '';
  var pass  = lPass  ? lPass.value  : '';
  var ok = true;

  if (!email || !email.includes('@')) {
    if (eEmail) eEmail.classList.add('show');
    if (lEmail) lEmail.classList.add('err');
    ok = false;
  }
  if (!pass || pass.length < 6) {
    if (ePass) ePass.classList.add('show');
    if (lPass) lPass.classList.add('err');
    ok = false;
  }
  if (!ok) return;

  if (btn) { btn.classList.add('loading'); btn.disabled = true; }
  setTimeout(function() {
    if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    if (pass !== 'password123') {
      if (eb) eb.classList.add('show');
      return;
    }
    launchApp();
  }, 1400);
}

function launchApp() {
  var ls  = document.getElementById('ls');
  var app = document.getElementById('app');
  if (ls)  ls.classList.add('out');
  setTimeout(function() {
    if (ls)  ls.style.display  = 'none';
    if (app) app.classList.add('in');
    // Trigger initial page load after app is visible
    var activeNav = document.querySelector('.nav-item.active');
    navigate('dashboard', activeNav);
  }, 400);
}

function doLogout() {
  var ls  = document.getElementById('ls');
  var app = document.getElementById('app');
  if (app) app.classList.remove('in');
  if (ls)  { ls.style.display = 'flex'; }
  setTimeout(function() { if (ls) ls.classList.remove('out'); }, 20);
  showStep('s-login');
  // Clear main content
  var mc = document.getElementById('mc');
  if (mc) mc.innerHTML = '';
}

function toggleSidebar() {
  var app = document.getElementById('app');
  var btn = document.getElementById('sb-toggle-btn');
  if (!app || !btn) return;
  var collapsed = app.classList.toggle('collapsed');
  btn.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  btn.firstElementChild.className = collapsed ? 'ti ti-chevron-right' : 'ti ti-chevron-left';
}

function initSidebarTooltips() {
  document.querySelectorAll('.nav-item[data-page]').forEach(function(item) {
    var page = item.dataset.page;
    var label = PAGE_TITLES[page] || item.textContent.trim();
    if (label) {
      item.setAttribute('data-tooltip', label);
      item.setAttribute('title', label);
    }
  });
}

document.addEventListener('DOMContentLoaded', initSidebarTooltips);

/* ════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════ */
var PAGE_TITLES = {
  dashboard:    'Operations Dashboard',
  analytics:    'Analytics & Insights',
  sailors:      'Sailors Management',
  orders:       'Orders Management',
  intents:      'Intent Requests',
  products:     'Products & Catalog',
  express:      'Express Items',
  inventory:    'Inventory Dashboard',
  rewards:      'Rewards & Coupons',
  partners:     'Delivery Partners',
  assignments:  'Order Assignments',
  verification: 'Product Verifications',
  notifications:'Notifications',
  chat:         'Chat Monitor',
  support:      'Support & Activity',
  sellers:      'Seller Applications',
  settings:     'Settings'
};

function navigate(page, el) {
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(function(n) {
    n.classList.remove('active');
  });
  if (el) el.classList.add('active');

  // Update topbar title
  var titleEl = document.getElementById('tb-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

  // Render page
  var mc = document.getElementById('mc');
  if (!mc) return;
  mc.innerHTML = '';
  var wrapper = document.createElement('div');
  wrapper.className = 'page-enter';
  mc.appendChild(wrapper);
  if (PAGES[page]) {
    PAGES[page](wrapper);
  } else {
    wrapper.innerHTML = '<div class="es"><div class="es-icon" style="background:var(--surface-alt);color:var(--t4)"><i class="ti ti-file-off"></i></div><h3>Page not found</h3><p>The page "' + page + '" has not been implemented yet.</p></div>';
  }

  // Close any open drawers or menus when navigating
  closeMenu();
}


/* ── goTo: simple page navigation from onclick (no querySelector needed) ── */
function goTo(page) {
  var navItem = document.querySelector('.nav-item[data-page="' + page + '"]');
  navigate(page, navItem);
}

/* ════════════════════════════════════════
   SEGMENT / TAB / PILL CLICK HELPER
   (used by segClick() called from HTML)
════════════════════════════════════════ */
function segClick(el) {
  var siblings = el.parentElement.querySelectorAll('.seg-btn, .tab-item, .pill-btn');
  siblings.forEach(function(s) { s.classList.remove('active'); });
  el.classList.add('active');
}

/* ════════════════════════════════════════
   SORT / FILTER / EXPORT / REFRESH
════════════════════════════════════════ */
function sortTable(col)   { toast('Sorted by ' + col, '', 'arrows-sort'); }
function filterTable(val) { if (val) toast('Filter: ' + val, '', 'filter'); }
function exportData(type) { toast('Exporting ' + (type||'CSV') + '…', '', 'download'); }
function refreshPage() {
  var mc = document.getElementById('mc');
  if (!mc) return;
  mc.style.opacity = '.5';
  mc.style.transition = 'opacity .2s';
  setTimeout(function() {
    mc.style.opacity = '1';
    toast('Data refreshed', 'success', 'refresh');
  }, 600);
}

/* ════════════════════════════════════════
   SETTINGS SAVE WITH LOADING STATE
════════════════════════════════════════ */
function saveSettings() {
  var btn = event ? event.currentTarget : null;
  if (!btn) { toast('Settings saved', 'success', 'check'); return; }
  var orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader" style="animation:lspin .7s linear infinite"></i> Saving…';
  setTimeout(function() {
    btn.disabled = false;
    btn.innerHTML = orig;
    toast('Settings saved successfully', 'success', 'check');
  }, 900);
}

/* ════════════════════════════════════════
   CHAT SEND
════════════════════════════════════════ */
function sendChatMsg() {
  var inp  = document.getElementById('chat-input');
  var msgs = document.getElementById('chat-messages');
  if (!inp || !msgs || !inp.value.trim()) return;
  var bubble = document.createElement('div');
  bubble.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end';
  bubble.innerHTML = '<div class="chat-bubble sent">' + inp.value + '</div>';
  msgs.appendChild(bubble);
  msgs.scrollTop = msgs.scrollHeight;
  inp.value = '';
  setTimeout(function() { toast('Message delivered', 'success', 'check'); }, 300);
}

/* ════════════════════════════════════════
   GLOBAL EVENT SETUP  (runs on load)
════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {

  /* OTP auto-advance */
  var otps = document.querySelectorAll('.otp-input');
  otps.forEach(function(inp, i) {
    inp.addEventListener('input', function() {
      if (inp.value.length === 1) {
        inp.classList.add('filled');
        if (i < otps.length - 1) otps[i + 1].focus();
      }
    });
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !inp.value && i > 0) {
        otps[i - 1].focus();
        otps[i - 1].classList.remove('filled');
      }
    });
  });

  /* Enter key on password field → login */
  var passField = document.getElementById('l-pass');
  if (passField) {
    passField.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });
  }

  /* Filter chip / tab / pill delegation */
  document.addEventListener('click', function(e) {
    var t = e.target;
    if (t.classList.contains('fchip')) {
      var siblings = t.parentElement.querySelectorAll('.fchip');
      siblings.forEach(function(s) { s.classList.remove('active'); });
      t.classList.add('active');
    }
    if (t.classList.contains('tab-item')) {
      var siblings = t.parentElement.querySelectorAll('.tab-item');
      siblings.forEach(function(s) { s.classList.remove('active'); });
      t.classList.add('active');
    }
    if (t.classList.contains('pill-btn')) {
      var siblings = t.parentElement.querySelectorAll('.pill-btn');
      siblings.forEach(function(s) { s.classList.remove('active'); });
      t.classList.add('active');
    }
  });

  /* Close modals/menus on overlay click or Escape */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeModal(); closeDrawer(); closeMenu(); }
  });

  var modalOverlay = document.getElementById('modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) closeModal();
    });
  }

  var drawerOverlay = document.getElementById('drawer-overlay');
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', function() { closeDrawer(); });
  }

  /* Close action menus on outside click */
  document.addEventListener('click', function(e) {
    if (_openMenu && !_openMenu.contains(e.target)) closeMenu();
  });

});

/* ════════════════════════════════════════════════════════
   ANCHORMART INTERACTION SYSTEM
   Modal · Drawer · Toast · Confirm · ActionMenu · Forms
════════════════════════════════════════════════════════ */

/* ── TOAST ── */
function toast(msg, type, icon) {
  var tc = document.getElementById('toast-container');
  var t = document.createElement('div');
  t.className = 'toast ' + (type||'');
  t.innerHTML = '<i class="ti ti-' + (icon||{success:'check-circle',danger:'alert-circle',warning:'alert-triangle'}[type]||'info-circle') + '"></i><span>' + msg + '</span>';
  tc.appendChild(t);
  t.onclick = function(){ t.style.animation = 'toastOut .2s ease forwards'; setTimeout(function(){ t.remove(); }, 220); };
  setTimeout(function(){ t.style.animation = 'toastOut .2s ease forwards'; setTimeout(function(){ t.remove(); }, 220); }, 3500);
}

/* ── MODAL ── */
var _modalStack = [];
function showModal(opts) {
  var overlay = document.getElementById('modal-overlay');
  var inner = overlay.querySelector('.modal-inner');
  var sizeClass = opts.size ? ' ' + opts.size : '';
  var iconHtml = opts.icon ? '<div class="modal-icon" style="background:' + (opts.iconBg||'var(--navy-50)') + ';color:' + (opts.iconColor||'var(--navy-600)') + '"><i class="ti ti-' + opts.icon + '"></i></div>' : '';
  inner.innerHTML = '<div class="modal' + sizeClass + '">' +
    '<div class="modal-hd">' + iconHtml +
    '<div class="f1"><div class="modal-title">' + opts.title + '</div>' +
    (opts.sub ? '<div class="modal-sub">' + opts.sub + '</div>' : '') + '</div>' +
    '<div class="modal-close" onclick="closeModal()"><i class="ti ti-x"></i></div></div>' +
    '<div class="modal-body">' + (opts.body||'') + '</div>' +
    (opts.footer !== false ? '<div class="modal-foot">' +
      (opts.cancelText !== false ? '<button class="btn btn-ghost btn-cancel" onclick="closeModal()">' + (opts.cancelText||'Cancel') + '</button>' : '') +
      (opts.footer||'') + '</div>' : '') + '</div>';
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  _modalStack.push(true);
}
function closeModal() {
  var overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
  _modalStack.pop();
}

/* ── CONFIRM ── */
function showConfirm(opts, onConfirm) {
  var overlay = document.getElementById('modal-overlay');
  var inner = overlay.querySelector('.modal-inner');
  var iconColor = opts.danger ? 'var(--danger-icon)' : (opts.iconColor||'var(--amber-500)');
  var iconBg = opts.danger ? 'var(--danger-bg)' : (opts.iconBg||'var(--amber-50)');
  inner.innerHTML = '<div class="confirm-box">' +
    '<div class="confirm-icon" style="background:' + iconBg + ';color:' + iconColor + '"><i class="ti ti-' + (opts.icon||'alert-triangle') + '"></i></div>' +
    '<div class="confirm-title">' + opts.title + '</div>' +
    '<div class="confirm-msg">' + (opts.msg||'') + '</div>' +
    '<div class="confirm-btns">' +
    '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' +
    '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" id="confirm-ok">' + (opts.confirmText||'Confirm') + '</button>' +
    '</div></div>';
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  document.getElementById('confirm-ok').onclick = function() { closeModal(); if (onConfirm) onConfirm(); };
}

/* ── DRAWER ── */
function showDrawer(opts) {
  var dOverlay = document.getElementById('drawer-overlay');
  var drawer = document.getElementById('drawer');
  var sizeClass = opts.size ? ' ' + opts.size : '';
  drawer.className = 'drawer' + sizeClass + ' open';
  drawer.innerHTML = '<div class="drawer-hd">' +
    '<div class="drawer-title">' + opts.title + '</div>' +
    '<div class="modal-close" onclick="closeDrawer()"><i class="ti ti-x"></i></div></div>' +
    '<div class="drawer-body">' + (opts.body||'') + '</div>' +
    (opts.footer ? '<div class="drawer-foot">' + opts.footer + '</div>' : '');
  dOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('show');
  document.body.style.overflow = '';
}

/* ── ACTION MENU ── */
var _openMenu = null;
function showMenu(triggerEl, items) {
  if (_openMenu) { _openMenu.remove(); _openMenu = null; }
  var menu = document.createElement('div');
  menu.className = 'action-menu open';
  menu.innerHTML = items.map(function(it) {
    if (it === 'sep') return '<div class="action-menu-sep"></div>';
    return '<div class="action-menu-item ' + (it.danger?'danger':'') + '" onclick="('+it.action+')(this);closeMenu()"><i class="ti ti-' + it.icon + '"></i>' + it.label + '</div>';
  }).join('');
  var rect = triggerEl.getBoundingClientRect();
  menu.style.cssText = 'position:fixed;top:' + (rect.bottom+4) + 'px;right:' + (window.innerWidth-rect.right) + 'px';
  document.body.appendChild(menu);
  _openMenu = menu;
}
function closeMenu() { if (_openMenu) { _openMenu.remove(); _openMenu = null; } }
document.addEventListener('click', function(e) {
  if (_openMenu && !_openMenu.contains(e.target)) closeMenu();
});

/* ── CLOSE ON OVERLAY CLICK ── */

/* ════════════════════════════════════════════
   SHARED MODAL BODIES
════════════════════════════════════════════ */

/* ── ADD / EDIT SAILOR ── */
function modalAddSailor(data) {
  data = data || {};
  showModal({
    title: data.name ? 'Edit Sailor' : 'Add New Sailor',
    sub: data.name ? 'Update sailor account details' : 'Register a new sailor to the platform',
    icon: 'users', iconBg: 'var(--navy-50)', iconColor: 'var(--navy-600)',
    size: 'md',
    body: `
      <div class="form-row">
        <div class="fg"><label class="fg-label">Full Name</label><input class="form-input" placeholder="e.g. Lois Becket" value="${data.name||''}"></div>
        <div class="fg"><label class="fg-label">Email Address</label><input class="form-input" type="email" placeholder="sailor@email.com" value="${data.email||''}"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label class="fg-label">WhatsApp Number</label><input class="form-input" placeholder="+44 7700 900000" value="${data.wa||''}"></div>
        <div class="fg"><label class="fg-label">Comm. Preference</label><select class="form-select"><option>WhatsApp</option><option>Email</option></select></div>
      </div>
      <div class="form-row">
        <div class="fg"><label class="fg-label">Ship Name / IMO</label><input class="form-input" placeholder="e.g. MSC Marvela / 0123456" value="${data.ship||''}"></div>
        <div class="fg"><label class="fg-label">Port of Call</label><input class="form-input" placeholder="e.g. Port of Singapore" value="${data.port||''}"></div>
      </div>
      <div class="fg"><label class="fg-label">Login Method</label><select class="form-select"><option>Email + Password</option><option>WhatsApp OTP</option><option>Email OTP</option></select></div>
      <div class="fg"><label class="fg-label">Account Status</label>
        <div class="seg" style="margin-top:4px">
          <div class="seg-btn active" onclick="segClick(this)">Active</div>
          <div class="seg-btn" onclick="segClick(this)">Inactive</div>
          <div class="seg-btn" onclick="segClick(this)">Blocked</div>
        </div>
      </div>
    `,
    footer: '<button class="btn btn-primary" onclick="closeModal();toast(\'' + (data.name?'Sailor updated':'Sailor added') + ' successfully\',\'success\')"><i class="ti ti-check"></i>' + (data.name?'Save Changes':'Add Sailor') + '</button>'
  });
}

/* ── ORDER DETAIL DRAWER ── */
function drawerOrderDetail(order) {
  order = order || {id:'#AM2458',sailor:'Lois Becket',ship:'IMO 0123456',terminal:'Anchorage 2',items:[{name:'Titan Watch',qty:1,price:'$75.00'},{name:'Card Holder',qty:1,price:'$12.00'}],total:'$84.00',status:'In Progress',partner:'Rahul Singh',payment:'Card · Paid',coupon:'SHIP10'};
  showDrawer({
    title: 'Order ' + order.id,
    size: 'lg',
    body: `
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <span class="badge badge-warning" style="font-size:13px;padding:5px 12px">${order.status}</span>
        <span class="badge badge-teal" style="font-size:13px;padding:5px 12px"><i class="ti ti-clock"></i>In Progress</span>
      </div>
      <div class="tl-compact mb20">
        ${[
          {s:'done',icon:'ti-file-invoice',t:'Intent submitted',d:'22 Apr · #INT20260422-0047'},
          {s:'done',icon:'ti-checks',t:'Intent confirmed by admin',d:'22 Apr · 14:58'},
          {s:'done',icon:'ti-credit-card',t:'Payment confirmed — $84.00',d:'22 Apr · 15:24'},
          {s:'done',icon:'ti-user-check',t:'Assigned to Rahul Singh',d:'22 Apr · 15:30'},
          {s:'active',icon:'ti-motorbike',t:'Out for delivery',d:'En route to Berth 7'},
          {s:'pend',icon:'ti-package-check',t:'Delivery confirmed',d:'Awaiting'},
        ].map(function(tl){ return '<div class="tl-c-item"><div class="tl-c-dot '+tl.s+'"><i class="ti '+tl.icon+'"></i></div><div class="tl-c-body"><div class="tl-c-title">'+tl.t+'</div><div class="tl-c-sub">'+tl.d+'</div></div></div>'; }).join('')}
      </div>
      <div class="sec-label">Order Information</div>
      <div class="detail-kv"><div class="detail-k">Sailor</div><div class="detail-v">${order.sailor}</div></div>
      <div class="detail-kv"><div class="detail-k">Ship / IMO</div><div class="detail-v mono cteal">${order.ship}</div></div>
      <div class="detail-kv"><div class="detail-k">Terminal</div><div class="detail-v">${order.terminal}</div></div>
      <div class="detail-kv"><div class="detail-k">Delivery Partner</div><div class="detail-v">${order.partner}</div></div>
      <div class="detail-kv"><div class="detail-k">Payment</div><div class="detail-v csuccess">${order.payment}</div></div>
      <div class="detail-kv"><div class="detail-k">Coupon</div><div class="detail-v">${order.coupon||'None'}</div></div>
      <div class="sec-label mt16">Items</div>
      ${(order.items||[]).map(function(item){ return '<div class="detail-kv"><div class="detail-k w5 c4">'+item.name+' ×'+item.qty+'</div><div class="detail-v">'+item.price+'</div></div>'; }).join('')}
      <div style="background:var(--navy-25);border-radius:var(--radius-md);padding:14px 16px;margin-top:14px">
        <div class="flex jb" style="margin-bottom:6px"><span class="sm c3 w6">Order Total</span><span class="w8" style="font-size:16px">${order.total}</span></div>
      </div>
      <div class="flex g8 mt20">
        <button class="btn btn-secondary" onclick="toast('Partner reassigned','success','transfer')"><i class="ti ti-transfer"></i>Reassign Partner</button>
        <button class="btn btn-accent" onclick="toast('Notification sent to sailor','success','bell')"><i class="ti ti-bell"></i>Notify Sailor</button>
        <button class="btn btn-danger mla" onclick="closeDrawer();showConfirm({title:'Cancel Order',msg:'This will cancel order ${order.id} and trigger refund processing. This cannot be undone.',icon:'x-circle',danger:true,confirmText:'Cancel Order'},function(){toast('Order cancelled','danger','x')})"><i class="ti ti-x"></i>Cancel</button>
      </div>
    `
  });
}

/* ── ADD PRODUCT MODAL ── */
function modalAddProduct(data) {
  data = data || {};
  showModal({
    title: data.name ? 'Edit Product' : 'Add New Product',
    icon: 'box-seam', iconBg:'var(--teal-50)', iconColor:'var(--teal-600)',
    size: 'lg',
    body: `
      <div class="form-row single">
        <div class="fg"><label class="fg-label">Product Title</label><input id="pe-title" class="form-input" placeholder="e.g. Titan Quartz Analog Watch" value="${data.name||''}"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label class="fg-label">Short Description</label><input id="pe-short" class="form-input" placeholder="Short summary for listings" value="${data.short||''}"></div>
        <div class="fg"><label class="fg-label">Category</label><div style="display:flex;gap:8px"><input id="pe-category" class="form-input" placeholder="Select category" value="${data.category||''}"><button class="btn btn-ghost btn-sm" onclick="openCategoryPicker()">New</button></div></div>
        <div class="fg"><label class="fg-label">Product Type</label>
          <div class="pill-toggle" id="pe-type">
            <div class="pill-btn ${data.type==='physical' || !data.type ? 'active' : ''}" data-type="physical" onclick="selectProductType(this)">Physical</div>
            <div class="pill-btn ${data.type==='digital' ? 'active' : ''}" data-type="digital" onclick="selectProductType(this)">Digital</div>
            <div class="pill-btn ${data.type==='service' ? 'active' : ''}" data-type="service" onclick="selectProductType(this)">Service</div>
            <div class="pill-btn ${data.type==='subscription' ? 'active' : ''}" data-type="subscription" onclick="selectProductType(this)">Subscription</div>
            <div class="pill-btn ${data.type==='bundle' ? 'active' : ''}" data-type="bundle" onclick="selectProductType(this)">Bundle</div>
          </div>
        </div>
      </div>
      <div class="fg"><label class="fg-label">Product Description</label><div id="pe-desc" contenteditable="true" class="form-input" style="min-height:140px">${data.desc||''}</div></div>
      <div class="pe-section" style="padding:16px 18px;margin:16px 0;border:1px solid var(--border-sm);border-radius:16px;background:var(--surface-alt)">
        <h3 style="margin:0 0 10px">Pricing</h3>
        <div class="form-row triple">
          <div class="fg"><label class="fg-label">Base Price</label><input id="pe-price" class="form-input" type="number" step="0.01" placeholder="0.00" value="${data.price||''}"></div>
          <div class="fg"><label class="fg-label">Compare-at Price</label><input id="pe-compare" class="form-input" type="number" step="0.01" placeholder="0.00" value="${data.compare||''}"></div>
          <div class="fg"><label class="fg-label">Cost Price</label><input id="pe-cost" class="form-input" type="number" step="0.01" placeholder="0.00" value="${data.cost||''}"></div>
        </div>
      </div>
      <div class="pe-section" style="padding:16px 18px;margin:16px 0;border:1px solid var(--border-sm);border-radius:16px;background:var(--surface-alt)">
        <h3 style="margin:0 0 10px">Inventory</h3>
        <div class="form-row">
          <div class="fg"><label class="fg-label">SKU</label><input id="pe-sku" class="form-input" placeholder="Auto-generated or custom" value="${data.sku||''}"><div class="fg-hint">Auto SKU: <span id="pe-sku-sample" class="mono">AM-0001</span> <button class="btn btn-ghost btn-sm" onclick="generateSKU()">Regenerate</button></div></div>
          <div class="fg"><label class="fg-label">Stock Quantity</label><input id="pe-stock" class="form-input" type="number" placeholder="0" value="${data.stock||''}"></div>
        </div>
        <div class="form-row" style="align-items:flex-end; gap:10px; margin-top:10px;">
          <div class="fg" style="flex:1"><label class="fg-label">Location</label><input id="pe-location-name" class="form-input" placeholder="Warehouse name"></div>
          <div class="fg" style="flex:1"><label class="fg-label">Stock</label><input id="pe-location-stock" class="form-input" type="number" placeholder="0"></div>
          <div class="fg" style="flex:0"><button class="btn btn-secondary btn-sm" style="height:40px; margin-top:24px;" onclick="addInventoryLocation()">Add</button></div>
        </div>
        <div id="pe-location-list" style="display:grid;gap:10px;margin-top:12px"></div>
      </div>
      <div class="pe-section" style="padding:16px 18px;margin:16px 0;border:1px solid var(--border-sm);border-radius:16px;background:var(--surface-alt)">
        <div class="variant-hdr"><h3 style="margin:0">Variants</h3><div><button class="btn btn-secondary btn-sm" onclick="openVariantModal()"><i class="ti ti-list-check"></i> Manage Variants</button></div></div>
        <div class="sec-sub" style="margin-top:8px">Add options like size or color, then generate variant combinations.</div>
        <div class="variant-search" style="margin-top:12px"><input id="pe-variant-search" class="form-input" placeholder="Search variants or add option" onfocus="this.parentElement.classList.add('focus')" onblur="this.parentElement.classList.remove('focus')"></div>
        <div class="variant-suggestions" id="pe-variant-suggestions" style="margin-top:12px">
          <span class="tag tag-outline" onclick="setVariantSuggestion('Color')">Color</span>
          <span class="tag tag-outline" onclick="setVariantSuggestion('Size')">Size</span>
          <span class="tag tag-outline" onclick="setVariantSuggestion('Material')">Material</span>
          <span class="tag tag-outline" onclick="setVariantSuggestion('Ring size')">Ring size</span>
        </div>
        <div class="variant-card-list" id="pe-variant-card-list"></div>
        <div class="variant-options" id="pe-variant-options" style="margin-top:12px">
          <div class="variant-option-row">
            <input id="pe-variant-option-name" class="form-input" placeholder="Option name (e.g. Color)">
            <input id="pe-variant-option-values" class="form-input" placeholder="Values, comma separated (e.g. Red,Blue)">
          </div>
          <div class="variant-option-actions">
            <button class="btn btn-secondary btn-sm" onclick="addVariantOption()"><i class="ti ti-plus"></i> Add option</button>
            <div class="variant-suggestions"><span class="tag tag-outline" onclick="setVariantSuggestion('Color')">Color</span><span class="tag tag-outline" onclick="setVariantSuggestion('Size')">Size</span><span class="tag tag-outline" onclick="setVariantSuggestion('Material')">Material</span><span class="tag tag-outline" onclick="setVariantSuggestion('Ring size')">Ring size</span></div>
          </div>
        </div>
      </div>
      <div class="pe-section" style="padding:16px 18px;margin:16px 0;border:1px solid var(--border-sm);border-radius:16px;background:var(--surface-alt)">
        <h3 style="margin:0 0 10px">Shipping & Delivery</h3>
        <div class="form-row triple">
          <div class="fg"><label class="fg-label">Weight (kg)</label><input id="pe-weight" class="form-input" type="number" step="0.01" placeholder="0" value="${data.weight||''}"></div>
          <div class="fg"><label class="fg-label">Dimensions (L×W×H cm)</label><input id="pe-dims" class="form-input" placeholder="e.g. 30×20×12" value="${data.dims||''}"></div>
          <div class="fg"><label class="fg-label">Shipping Class</label><select id="pe-shipping" class="form-select"><option ${data.shipping==='Standard'?'selected':''}>Standard</option><option ${data.shipping==='Express'?'selected':''}>Express</option><option ${data.shipping==='Freight'?'selected':''}>Freight</option><option ${data.shipping==='Local pickup'?'selected':''}>Local pickup</option></select></div>
        </div>
      </div>
      <div class="pe-section" style="padding:16px 18px;margin:16px 0;border:1px solid var(--border-sm);border-radius:16px;background:var(--surface-alt)">
        <h3 style="margin:0 0 10px">SEO</h3>
        <div class="form-row">
          <div class="fg"><label class="fg-label">Meta Title</label><input id="pe-meta-title" class="form-input" placeholder="Optional SEO title" value="${data.metaTitle||''}"></div>
          <div class="fg"><label class="fg-label">Meta Description</label><input id="pe-meta-desc" class="form-input" placeholder="Optional meta description" value="${data.metaDesc||''}"></div>
        </div>
        <div class="seo-snippet" style="margin-top:12px">
          <div class="seo-title" id="seo-preview-title">Meta title preview</div>
          <div class="seo-url">anchormart.io/products/sea-smart-speaker</div>
          <div class="seo-desc" id="seo-preview-desc">Meta description preview. Keep it concise and keyword rich for search results.</div>
        </div>
      </div>
      <div class="pe-section" style="padding:16px 18px;margin:16px 0;border:1px solid var(--border-sm);border-radius:16px;background:var(--surface-alt)">
        <h3 style="margin:0 0 10px">Metadata & Custom Attributes</h3>
        <div class="form-row">
          <div class="fg"><label class="fg-label">Attribute name</label><input id="pe-attr-key" class="form-input" placeholder="e.g. Color" value="${data.attrKey||''}"></div>
          <div class="fg"><label class="fg-label">Attribute value</label><input id="pe-attr-value" class="form-input" placeholder="e.g. Ocean Blue" value="${data.attrValue||''}"></div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="addProductAttribute()"><i class="ti ti-plus"></i> Add attribute</button>
        <div id="pe-attributes-list" class="mt12"></div>
      </div>
      <div class="form-row" style="margin-bottom:0;gap:10px;align-items:flex-end">
        <div class="fg"><label class="fg-label">Status</label><select id="pe-status" class="form-select"><option value="draft" ${data.status==='draft'?'selected':''}>Draft</option><option value="active" ${data.status==='active'?'selected':''}>Active</option><option value="scheduled" ${data.status==='scheduled'?'selected':''}>Scheduled</option><option value="archived" ${data.status==='archived'?'selected':''}>Archived</option></select></div>
        <div class="fg"><label class="fg-label">Visibility</label><select id="pe-visibility" class="form-select"><option ${data.visibility==='Public'?'selected':''}>Public</option><option ${data.visibility==='Private'?'selected':''}>Private</option><option ${data.visibility==='Hidden'?'selected':''}>Hidden</option></select></div>
        <div class="fg"><label class="fg-label">Vendor</label><input id="pe-vendor" class="form-input" placeholder="Vendor / Brand" value="${data.vendor||''}"></div>
      </div>
      <div class="form-row" style="margin-top:14px;gap:10px;align-items:flex-end">
        <div class="fg" style="flex:1"><label class="fg-label">Collections</label><input id="pe-collections" class="form-input" placeholder="Add to collections" value="${data.collections||''}"></div>
      </div>
    `,
    footer: '<button class="btn btn-primary" onclick="closeModal();toast(\'' + (data.name?'Product updated':'Product added') + '\',\'success\')"><i class="ti ti-check"></i>' + (data.name?'Save Changes':'Add Product') + '</button>'
  });
}

function previewProductImages(input) {
  var container = document.getElementById('product-images-preview');
  if (!container) return;
  var files = input.files ? Array.from(input.files) : [];
  container.innerHTML = '';
  if (!files.length) {
    container.innerHTML = '<div class="empty-state" style="padding:14px 0"><i class="ti ti-image"></i><div class="sm c4">No images selected yet</div></div>';
    return;
  }
  files.slice(0,8).forEach(function(file) {
    if (!file.type.startsWith('image/')) return;
    var item = document.createElement('div');
    item.className = 'image-preview-item';
    item.innerHTML = '<div class="preview-spinner">Loading…</div>';
    container.appendChild(item);
    var reader = new FileReader();
    reader.onload = function(e) {
      item.style.backgroundImage = 'url(' + e.target.result + ')';
      item.innerHTML = '';
    };
    reader.readAsDataURL(file);
  });
}

/* ── ASSIGN PARTNER MODAL ── */
function modalAssignPartner(orderId) {
  showModal({
    title: 'Assign Delivery Partner',
    sub: 'Order ' + (orderId||'#AM2467'),
    icon: 'motorbike', iconBg:'var(--teal-50)', iconColor:'var(--teal-600)',
    body: `
      <div class="fg"><label class="fg-label">Select Partner</label>
        ${[
          {n:'Aisha Karimi',id:'DP-00056',p:'Singapore',s:'Free',sc:'success'},
          {n:'David Lim',id:'DP-00033',p:'Jurong',s:'Free',sc:'success'},
          {n:'Pita Havili',id:'DP-00087',p:'Singapore',s:'2 active',sc:'warning'},
        ].map(function(p){ return '<div class="ecard mb10" style="cursor:pointer" onclick="this.style.background=\'var(--navy-25)\';this.style.borderColor=\'var(--navy-300)\'"><div class="flex aic g12"><div class="av av-teal">'+p.n[0]+'</div><div class="f1"><div class="sm w7 c1">'+p.n+'</div><div class="xs c4">'+p.id+' · '+p.p+'</div></div><span class="badge badge-'+p.sc+'">'+p.s+'</span></div></div>'; }).join('')}
      </div>
      <div class="fg"><label class="fg-label">Special Instructions</label><textarea class="form-input" placeholder="Instructions for the delivery partner…" style="height:70px"></textarea></div>
      <div class="fg"><label class="fg-label">Target ETA</label><input class="form-input" type="time" value="12:30"></div>
    `,
    footer: '<button class="btn btn-primary" onclick="closeModal();toast(\'Partner assigned successfully\',\'success\',\'check\')"><i class="ti ti-check"></i>Assign Partner</button>'
  });
}

/* ── ADD PARTNER MODAL ── */
function modalAddPartner(data) {
  data = data || {};
  showModal({
    title: data.name ? 'Edit Partner' : 'Onboard Delivery Partner',
    icon: 'motorbike', iconBg:'var(--teal-50)', iconColor:'var(--teal-600)',
    size: 'md',
    body: `
      <div class="form-row">
        <div class="fg"><label class="fg-label">Full Name</label><input class="form-input" placeholder="Partner name" value="${data.name||''}"></div>
        <div class="fg"><label class="fg-label">Email</label><input class="form-input" type="email" placeholder="partner@email.com" value="${data.email||''}"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label class="fg-label">Phone Number</label><input class="form-input" placeholder="+65 9000 0000" value="${data.phone||''}"></div>
        <div class="fg"><label class="fg-label">Port Zone</label><select class="form-select"><option>Port of Singapore</option><option>Keppel Terminal</option><option>Brani Terminal</option><option>Jurong Port</option><option>PSA Pasir Panjang</option></select></div>
      </div>
      <div class="fg"><label class="fg-label">Partner ID</label><input class="form-input" placeholder="DP-00XXX" value="${data.id||''}"><div class="fg-hint">Leave blank to auto-generate</div></div>
      <div class="fg"><label class="fg-label">Vehicle Type</label><select class="form-select"><option>Motorcycle</option><option>Bicycle</option><option>Car / Van</option><option>On foot</option></select></div>
    `,
    footer: '<button class="btn btn-primary" onclick="closeModal();toast(\'' + (data.name?'Partner updated':'Partner onboarded') + '\',\'success\')"><i class="ti ti-check"></i>' + (data.name?'Save Changes':'Onboard Partner') + '</button>'
  });
}

/* ── COUPON MODAL ── */
function modalAddCoupon(data) {
  data = data || {};
  showModal({
    title: data.code ? 'Edit Coupon' : 'Create Coupon',
    icon: 'ticket', iconBg:'var(--amber-50)', iconColor:'var(--amber-600)',
    body: `
      <div class="form-row">
        <div class="fg"><label class="fg-label">Coupon Code</label><input class="form-input" placeholder="e.g. SHIP10" style="font-family:var(--font-mono);font-weight:700;font-size:15px" value="${data.code||''}"></div>
        <div class="fg"><label class="fg-label">Discount Type</label><select class="form-select"><option>Percentage (%)</option><option>Fixed Amount ($)</option><option>Free Shipping</option></select></div>
      </div>
      <div class="form-row">
        <div class="fg"><label class="fg-label">Discount Value</label><input class="form-input" type="number" placeholder="10" value="${data.value||''}"></div>
        <div class="fg"><label class="fg-label">Min. Order Value ($)</label><input class="form-input" type="number" placeholder="50"></div>
      </div>
      <div class="form-row">
        <div class="fg"><label class="fg-label">Expiry Date</label><input class="form-input" type="date" value="2026-10-31"></div>
        <div class="fg"><label class="fg-label">Max Uses</label><input class="form-input" type="number" placeholder="Unlimited"></div>
      </div>
      <div class="fg"><label class="fg-label">Applicable To</label><select class="form-select"><option>All Sailors</option><option>New Sailors Only</option><option>Referrals Only</option><option>Specific Users</option></select></div>
    `,
    footer: '<button class="btn btn-primary" onclick="closeModal();toast(\'' + (data.code?'Coupon updated':'Coupon created') + '\',\'success\')"><i class="ti ti-check"></i>' + (data.code?'Save Changes':'Create Coupon') + '</button>'
  });
}

/* ── SEND NOTIFICATION MODAL ── */
function modalSendNotif(prefill) {
  prefill = prefill || {};
  showModal({
    title: 'Send Notification',
    icon: 'bell', iconBg:'var(--info-bg)', iconColor:'var(--info-icon)',
    size: 'md',
    body: `
      <div class="fg"><label class="fg-label">Target Audience</label>
        <select class="form-select" id="notif-audience">
          <option ${prefill.audience==='All Sailors'?'selected':''}>All Sailors</option>
          <option>All Delivery Partners</option>
          <option>Specific Sailor</option>
          <option>Specific Partner</option>
          <option>Port-specific Sailors</option>
          <option>Sailors with Pending Payment</option>
        </select>
      </div>
      <div class="fg"><label class="fg-label">Notification Type</label>
        <select class="form-select">
          <option>🔔 Payment Required</option><option>📦 Order Confirmed</option>
          <option>🚗 Out for Delivery</option><option>🎁 Gift / Reward Unlocked</option>
          <option>⚠️ Product Unavailable</option><option>📢 General Announcement</option>
          <option>📋 Assignment (Partner)</option><option>💰 Payment Received (Partner)</option>
        </select>
      </div>
      <div class="fg"><label class="fg-label">Message</label>
        <textarea class="form-input" style="height:90px" placeholder="Notification message…">${prefill.msg||''}</textarea>
        <div class="fg-hint">Max 280 characters. Personalisation: {name}, {order_id}</div>
      </div>
      <div class="form-row">
        <div class="fg"><label class="fg-label">Send Time</label>
          <select class="form-select"><option>Send Immediately</option><option>Schedule</option></select>
        </div>
        <div class="fg"><label class="fg-label">Channel</label>
          <select class="form-select"><option>Push + WhatsApp</option><option>Push Only</option><option>Email Only</option></select>
        </div>
      </div>
    `,
    footer: '<button class="btn btn-primary" onclick="closeModal();toast(\'Notification sent successfully\',\'success\',\'send\')"><i class="ti ti-send"></i>Send Notification</button>'
  });
}

/* ── INTENT REVIEW MODAL ── */
function modalReviewIntent(ref) {
  showModal({
    title: 'Review Intent Request',
    sub: ref || '#INT20260422-0047',
    icon: 'file-invoice', iconBg:'var(--navy-50)', iconColor:'var(--navy-600)',
    size: 'lg',
    body: `
      <div style="background:var(--navy-25);border-radius:var(--radius-md);padding:16px;margin-bottom:20px">
        <div class="form-row" style="margin-bottom:0">
          <div class="mini-stat"><div class="mini-stat-val">Lois Becket</div><div class="mini-stat-lbl">Sailor</div></div>
          <div class="mini-stat"><div class="mini-stat-val mono cteal">0123456</div><div class="mini-stat-lbl">IMO Number</div></div>
          <div class="mini-stat"><div class="mini-stat-val">Anch. 2</div><div class="mini-stat-lbl">Terminal</div></div>
          <div class="mini-stat"><div class="mini-stat-val">24 Apr</div><div class="mini-stat-lbl">Arrival Date</div></div>
        </div>
      </div>
      <div class="sec-label">Requested Items</div>
      ${[
        {n:'Titan Quartz Analog Watch',q:1,a:true},{n:'Brown Leather Card Holder',q:1,a:true},{n:'Bombay Shaving Kit',q:1,a:null},
      ].map(function(item){ return '<div class="flex aic g12 mb10 ecard"><div class="f1"><div class="sm w7 c1">'+item.n+'</div><div class="xs c4">Qty: '+item.q+'</div></div>'+(item.a===true?'<span class="badge badge-success">Available</span>':item.a===false?'<span class="badge badge-danger">Unavailable</span>':'<span class="badge badge-neutral">Checking…</span>')+'</div>'; }).join('')}
      <div class="sec-label mt16">Admin Response</div>
      <div class="form-row">
        <div class="fg"><label class="fg-label">Estimated Price ($)</label><input class="form-input" placeholder="0.00"></div>
        <div class="fg"><label class="fg-label">Payment Link Expiry</label><select class="form-select"><option>48 hours</option><option>24 hours</option><option>72 hours</option></select></div>
      </div>
      <div class="fg"><label class="fg-label">Notes to Sailor</label><textarea class="form-input" placeholder="Optional notes for the sailor…" style="height:70px"></textarea></div>
    `,
    footer: `
      <button class="btn btn-danger" onclick="closeModal();toast('Intent rejected and sailor notified','danger','x')"><i class="ti ti-x"></i>Reject</button>
      <button class="btn btn-primary" onclick="closeModal();toast('Intent confirmed & payment link sent','success','send')"><i class="ti ti-send"></i>Confirm & Send Payment Link</button>
    `
  });
}

/* ── VERIFICATION SUBSTITUTE MODAL ── */
function modalSubstitute(item) {
  showModal({
    title: 'Suggest Substitute',
    sub: 'Item: ' + (item||'Bombay Shaving Kit'),
    icon: 'refresh', iconBg:'var(--warning-bg)', iconColor:'var(--warning-icon)',
    body: `
      <div class="infobox mb16">
        <div class="xs c4 w7 mb4">UNAVAILABLE ITEM</div>
        <div class="sm w7 c1">${item||'Bombay Shaving Company 5 Piece Kit'}</div>
        <div class="xs c4 mt4">Partner confirmed out of stock at Wegmans PSA</div>
      </div>
      <div class="fg"><label class="fg-label">Substitute Product</label><input class="form-input" placeholder="Search substitute product…"></div>
      <div class="fg"><label class="fg-label">Price Difference</label>
        <div class="seg"><div class="seg-btn active" onclick="segClick(this)">Same Price</div><div class="seg-btn" onclick="segClick(this)">Price Increase</div><div class="seg-btn" onclick="segClick(this)">Price Decrease</div></div>
      </div>
      <div class="fg" id="price-diff-field" style="display:none"><label class="fg-label">Amount ($)</label><input class="form-input" type="number" placeholder="0.00"></div>
      <div class="fg"><label class="fg-label">Message to Sailor</label><textarea class="form-input" style="height:80px" placeholder="Explain the substitution…">The requested item was out of stock. We found a similar alternative at the same price point.</textarea></div>
    `,
    footer: '<button class="btn btn-primary" onclick="closeModal();toast(\'Substitute sent to sailor for approval\',\'success\',\'send\')"><i class="ti ti-send"></i>Send to Sailor for Approval</button>'
  });
}

/* ── SELLER REVIEW MODAL ── */
function modalSellerReview(seller, approve) {
  seller = seller || {n:'James Wren',b:'Marine Supplies Co.',p:'Marine equipment, safety gear'};
  if (approve) {
    showConfirm({
      title: 'Approve Seller Application',
      msg: 'Approve ' + seller.n + ' (' + seller.b + ') as a seller on the platform? They will receive an onboarding email.',
      icon: 'building-store', iconBg:'var(--success-bg)', iconColor:'var(--success-icon)',
      confirmText: 'Approve Seller'
    }, function(){ toast('Seller approved — onboarding email sent', 'success'); });
  } else {
    showModal({
      title: 'Reject Seller Application',
      icon: 'x-circle', iconBg:'var(--danger-bg)', iconColor:'var(--danger-icon)',
      body: `
        <div class="infobox mb16">
          <div class="xs c4 w7 mb4">APPLICATION</div>
          <div class="sm w7 c1">${seller.n} — ${seller.b}</div>
          <div class="xs c4 mt4">${seller.p}</div>
        </div>
        <div class="fg"><label class="fg-label">Rejection Reason</label>
          <select class="form-select"><option>Incomplete documentation</option><option>Products not eligible</option><option>Duplicate account</option><option>Policy violation</option><option>Other</option></select>
        </div>
        <div class="fg"><label class="fg-label">Message to Applicant</label><textarea class="form-input" style="height:80px" placeholder="Reason for rejection…"></textarea></div>
      `,
      footer: '<button class="btn btn-danger" onclick="closeModal();toast(\'Application rejected\',\'danger\',\'x\')"><i class="ti ti-x"></i>Reject & Notify</button>'
    });
  }
}

/* ── SUPPORT TICKET MODAL ── */
function modalTicket(ticket) {
  ticket = ticket || {id:'#SUP-084',from:'Lois Becket',type:'Sailor',issue:'Missing item in delivered order',priority:'Urgent'};
  showDrawer({
    title: 'Support Ticket ' + ticket.id,
    size: 'lg',
    body: `
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <span class="badge badge-${ticket.priority==='Urgent'?'danger':ticket.priority==='High'?'warning':'info'}">${ticket.priority} Priority</span>
        <span class="badge badge-neutral">Open</span>
        <span class="badge badge-blue">${ticket.type} Issue</span>
      </div>
      <div class="sec-label">Ticket Details</div>
      <div class="detail-kv"><div class="detail-k">Ticket ID</div><div class="detail-v mono cteal">${ticket.id}</div></div>
      <div class="detail-kv"><div class="detail-k">Submitted by</div><div class="detail-v">${ticket.from}</div></div>
      <div class="detail-kv"><div class="detail-k">Issue</div><div class="detail-v">${ticket.issue}</div></div>
      <div class="detail-kv"><div class="detail-k">Submitted</div><div class="detail-v">29 May 2026 · 09:14 AM</div></div>
      <div class="detail-kv"><div class="detail-k">Assigned To</div><div class="detail-v">Support Agent</div></div>
      <div class="sec-label mt16">Conversation</div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
        <div class="chat-bubble recv" style="max-width:100%"><strong>${ticket.from}:</strong> ${ticket.issue}. Please help me resolve this ASAP.</div>
        <div class="chat-bubble sent" style="max-width:100%">Hi, we've received your report and are investigating. We'll update you within 2 hours.</div>
      </div>
      <div class="fg"><label class="fg-label">Reply</label><textarea class="form-input" style="height:80px" placeholder="Type your response…"></textarea></div>
      <div class="fg"><label class="fg-label">Status</label>
        <select class="form-select"><option>Open</option><option>In Progress</option><option>Awaiting User</option><option>Resolved</option><option>Closed</option></select>
      </div>
      <div class="fg"><label class="fg-label">Priority</label>
        <div class="seg"><div class="seg-btn ${ticket.priority==='Low'?'active':''}" onclick="segClick(this)">Low</div><div class="seg-btn ${ticket.priority==='High'?'active':''}" onclick="segClick(this)">High</div><div class="seg-btn ${ticket.priority==='Urgent'?'active':''}" onclick="segClick(this)">Urgent</div></div>
      </div>
    `,
    footer: '<button class="btn btn-secondary" onclick="closeDrawer()">Cancel</button><button class="btn btn-success" onclick="closeDrawer();toast(\'Ticket marked resolved\',\'success\',\'check\')"><i class="ti ti-check"></i>Mark Resolved</button><button class="btn btn-primary" onclick="toast(\'Reply sent\',\'success\',\'send\')"><i class="ti ti-send"></i>Send Reply</button>'
  });
}

/* ── PROFILE DRAWER ── */
function drawerProfile(name, role) {
  showDrawer({
    title: name + ' — Profile',
    body: `
      <div style="text-align:center;padding-bottom:20px;border-bottom:1px solid var(--border-sm);margin-bottom:20px">
        <div class="av av-xl av-${role==='partner'?'teal':'navy'}" style="margin:0 auto 12px;font-size:22px">${name[0]}</div>
        <div style="font-size:17px;font-weight:800;color:var(--t1)">${name}</div>
        <div style="font-size:13px;font-weight:600;color:var(--t4);margin-top:4px">${role==='partner'?'Delivery Partner':'Sailor'}</div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
          <span class="badge badge-success">Active</span>
          ${role==='partner'?'<span class="badge badge-teal">On Duty</span>':''}
        </div>
      </div>
      <div class="sec-label">Contact</div>
      <div class="detail-kv"><div class="detail-k">Email</div><div class="detail-v">${name.split(' ')[0].toLowerCase()}@anchormart.io</div></div>
      <div class="detail-kv"><div class="detail-k">WhatsApp</div><div class="detail-v">+65 9123 4567</div></div>
      <div class="detail-kv"><div class="detail-k">Joined</div><div class="detail-v">March 2023</div></div>
      <div class="sec-label mt16">Statistics</div>
      <div class="form-row" style="margin-bottom:0">
        <div class="mini-stat"><div class="mini-stat-val">${role==='partner'?'124':'18'}</div><div class="mini-stat-lbl">${role==='partner'?'Deliveries':'Orders'}</div></div>
        <div class="mini-stat"><div class="mini-stat-val">${role==='partner'?'4.9':'$84'}</div><div class="mini-stat-lbl">${role==='partner'?'Rating':'Avg Order'}</div></div>
        <div class="mini-stat"><div class="mini-stat-val">${role==='partner'?'$842':'2,450'}</div><div class="mini-stat-lbl">${role==='partner'?'Earned':'Loyalty Pts'}</div></div>
      </div>
    `,
    footer: '<button class="btn btn-ghost" onclick="closeDrawer()">Close</button><button class="btn btn-secondary" onclick="toast(\'Message sent\',\'success\',\'message\')"><i class="ti ti-message"></i>Send Message</button><button class="btn btn-primary" onclick="closeDrawer();' + (role==='partner'?'modalAddPartner({name:\''+name+'\'}':'modalAddSailor({name:\''+name+'\'}') + ')"><i class="ti ti-edit"></i>Edit Profile</button>'
  });
}

/* ── SETTINGS SAVE ── */


/* ════════════════════════════════════════════
   INTERACTIVE PAGE RENDERERS
════════════════════════════════════════════ */


const PAGES = {};

/* ─── DASHBOARD ─── */
PAGES.dashboard = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l">
      <h1 class="pg-title">Operations Dashboard</h1>
      <p class="pg-sub"><span class="sdot on">Live monitoring</span><span class="sep">·</span><span>Friday, 29 May 2026</span></p>
    </div>
    <div class="pg-actions">
      <div class="pill-toggle">
        <div class="pill-btn active" onclick="segClick(this)">Today</div>
        <div class="pill-btn" onclick="segClick(this)">Week</div>
        <div class="pill-btn" onclick="segClick(this)">Month</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="refreshPage()"><i class="ti ti-refresh"></i>Refresh</button>
      <button class="btn btn-primary btn-sm" onclick="exportData('PDF')"><i class="ti ti-download"></i>Export</button>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-card sc-navy" onclick="goTo('sailors')" style="cursor:pointer">
      <div class="stat-stripe"></div>
      <div class="stat-top"><div class="stat-lbl">Total Sailors</div><div class="stat-icon"><i class="ti ti-users"></i></div></div>
      <div class="stat-val">2,847</div>
      <div class="stat-foot"><span class="stat-delta up"><i class="ti ti-trending-up"></i>14.2%</span><span>vs last month</span></div>
    </div>
    <div class="stat-card sc-teal" onclick="goTo('partners')" style="cursor:pointer">
      <div class="stat-stripe"></div>
      <div class="stat-top"><div class="stat-lbl">Active Partners</div><div class="stat-icon"><i class="ti ti-motorbike"></i></div></div>
      <div class="stat-val">38</div>
      <div class="stat-foot"><span class="sdot on xs w6 csuccess">28 on duty now</span></div>
    </div>
    <div class="stat-card sc-blue" onclick="goTo('orders')" style="cursor:pointer">
      <div class="stat-stripe"></div>
      <div class="stat-top"><div class="stat-lbl">Orders Today</div><div class="stat-icon"><i class="ti ti-package"></i></div></div>
      <div class="stat-val">184</div>
      <div class="stat-foot"><span class="stat-delta up"><i class="ti ti-trending-up"></i>8.1%</span><span>vs yesterday</span></div>
    </div>
    <div class="stat-card sc-green" onclick="goTo('analytics')" style="cursor:pointer">
      <div class="stat-stripe"></div>
      <div class="stat-top"><div class="stat-lbl">Revenue Today</div><div class="stat-icon"><i class="ti ti-currency-dollar"></i></div></div>
      <div class="stat-val">$12.4k</div>
      <div class="stat-foot"><span class="stat-delta up"><i class="ti ti-trending-up"></i>6.2%</span><span>vs yesterday</span></div>
    </div>
    <div class="stat-card sc-amber" onclick="goTo('orders')" style="cursor:pointer">
      <div class="stat-stripe"></div>
      <div class="stat-top"><div class="stat-lbl">In Progress</div><div class="stat-icon"><i class="ti ti-loader-2"></i></div></div>
      <div class="stat-val">47</div>
      <div class="stat-foot"><span>12 awaiting payment</span></div>
    </div>
    <div class="stat-card sc-red" onclick="goTo('orders')" style="cursor:pointer">
      <div class="stat-stripe"></div>
      <div class="stat-top"><div class="stat-lbl">Cancelled</div><div class="stat-icon"><i class="ti ti-circle-x"></i></div></div>
      <div class="stat-val">6</div>
      <div class="stat-foot"><span>3 pending refund</span></div>
    </div>
  </div>

  <div class="grid-2 mb20" style="grid-template-columns:2fr 1fr">
    <div class="card">
      <div class="card-hd">
        <div class="card-ttl"><i class="ti ti-package"></i>Live Orders</div>
        <div class="card-acts">
          <span class="sdot on sm w6 csuccess">Real-time</span>
          <button class="btn btn-ghost btn-sm" onclick="goTo('orders')">View all <i class="ti ti-arrow-right"></i></button>
        </div>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Order ID</th><th>Sailor</th><th>Ship / Port</th><th>Partner</th><th>Status</th><th>Total</th><th></th></tr></thead>
          <tbody id="live-orders-body"></tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="card-hd">
        <div class="card-ttl"><i class="ti ti-activity"></i>Activity Feed</div>
        <span class="sdot on sm w6 csuccess">Live</span>
      </div>
      <div class="card-body-sm live-feed-wrap" id="activity-feed"></div>
    </div>
  </div>

  <div class="grid-3 mb20">
    <div class="card" style="grid-column:span 2">
      <div class="card-hd">
        <div class="card-ttl"><i class="ti ti-chart-bar"></i>Revenue — Last 14 Days</div>
        <div class="card-acts">
          <div class="pill-toggle">
            <div class="pill-btn active" onclick="segClick(this)">Daily</div>
            <div class="pill-btn" onclick="segClick(this)">Weekly</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="exportData('CSV')"><i class="ti ti-download"></i></button>
        </div>
      </div>
      <div class="metric-row">
        <div class="metric-item"><div class="metric-lbl">Total</div><div class="metric-val" style="color:var(--teal-700)">$168.2k</div></div>
        <div class="metric-sep"></div>
        <div class="metric-item"><div class="metric-lbl">Avg / Day</div><div class="metric-val">$12.0k</div></div>
        <div class="metric-sep"></div>
        <div class="metric-item"><div class="metric-lbl">Peak Day</div><div class="metric-val">$18.4k</div></div>
        <div class="metric-sep"></div>
        <div class="metric-item"><div class="metric-lbl">Growth</div><div class="metric-val" style="color:var(--green-text)">+18.3%</div></div>
      </div>
      <div class="card-body" id="revenue-chart"></div>
    </div>
    <div class="card">
      <div class="card-hd"><div class="card-ttl"><i class="ti ti-chart-donut-2"></i>Order Status</div></div>
      <div class="card-body" id="order-status-chart"></div>
    </div>
  </div>

  <div class="grid-3">
    <div class="card">
      <div class="card-hd">
        <div class="card-ttl"><i class="ti ti-award"></i>Top Products</div>
        <button class="btn btn-ghost btn-sm" onclick="goTo('products')">View all <i class="ti ti-arrow-right"></i></button>
      </div>
      <div class="card-body-sm" id="top-products"></div>
    </div>
    <div class="card">
      <div class="card-hd">
        <div class="card-ttl"><i class="ti ti-motorbike"></i>Active Partners</div>
        <button class="btn btn-ghost btn-sm" onclick="goTo('partners')">View all <i class="ti ti-arrow-right"></i></button>
      </div>
      <div class="card-body-sm" id="active-partners"></div>
    </div>
    <div class="card">
      <div class="card-hd">
        <div class="card-ttl"><i class="ti ti-alert-circle"></i>Action Required</div>
        <span class="badge badge-danger">7 open</span>
      </div>
      <div class="card-body-sm" id="action-required"></div>
    </div>
  </div>`;

  /* ── Populate dynamic sections (no onclick string escaping) ── */
  var liveOrders = [
    {id:'#AM2458',s:'Lois Becket',p:'Anchorage 2 · PSA',pt:'Rahul Singh',st:'In Progress',sc:'warning',t:'$84.00'},
    {id:'#AM2461',s:'Ali Mahmoud',p:'MSC Marvela · B7',pt:'Rahul Singh',st:'Verifying',sc:'info',t:'$70.45'},
    {id:'#AM2463',s:'James Wren',p:'Evergreen · Brani',pt:'Pita Havili',st:'Delivering',sc:'teal',t:'$48.00'},
    {id:'#AM2465',s:'Sara Chen',p:'APL Vanda · PSA',pt:'Marco Reyes',st:'Delivered',sc:'success',t:'$94.99'},
    {id:'#AM2467',s:'Ravi Patel',p:'IMO 0123456 · PSA',pt:'Unassigned',st:'New',sc:'neutral',t:'$32.00'},
  ];
  var tbody = document.getElementById('live-orders-body');
  liveOrders.forEach(function(o) {
    var tr = document.createElement('tr');
    tr.className = 'tr-click';
    var ptColor = o.pt === 'Unassigned' ? 'var(--danger-text)' : 'var(--t3)';
    tr.innerHTML =
      '<td class="td-id">' + o.id + '</td>' +
      '<td><div class="flex aic g8"><div class="av av-sm av-navy">' + o.s[0] + '</div><span class="td-p">' + o.s + '</span></div></td>' +
      '<td class="td-m">' + o.p + '</td>' +
      '<td style="color:' + ptColor + ';font-size:12.5px;font-weight:600">' + o.pt + '</td>' +
      '<td><span class="badge badge-' + o.sc + '">' + o.st + '</span></td>' +
      '<td class="td-p w7">' + o.t + '</td>' +
      '<td><button class="btn btn-ghost btn-sm btn-icon" title="View detail"><i class="ti ti-eye"></i></button></td>';
    tr.querySelector('.tr-click, tr') && (tr.onclick = function() {
      drawerOrderDetail({id:o.id,sailor:o.s,ship:'0123456',terminal:'Anchorage 2',partner:o.pt,payment:'Card · Paid',coupon:'SHIP10',total:o.t,status:o.st,items:[{name:'Titan Watch',qty:1,price:'$75.00'},{name:'Card Holder',qty:1,price:'$12.00'}]});
    });
    tr.querySelector('button') && tr.querySelector('button').addEventListener('click', function(e) {
      e.stopPropagation();
      drawerOrderDetail({id:o.id,sailor:o.s,ship:'0123456',terminal:'Anchorage 2',partner:o.pt,payment:'Card · Paid',coupon:'SHIP10',total:o.t,status:o.st,items:[{name:'Titan Watch',qty:1,price:'$75.00'}]});
    });
    tbody.appendChild(tr);
  });

  /* Activity feed */
  var feedData = [
    {t:'Order #AM2468 placed — 3 items',s:'Maria Santos · MSC Marvela',tm:'1m',bg:'var(--teal-500)',pg:'orders'},
    {t:'Payment confirmed $70.45 · ENQ-0042',s:'Sailor: Ali Mahmoud',tm:'4m',bg:'var(--green-icon)',pg:'orders'},
    {t:'ENQ-0042 delivered successfully',s:'Rahul Singh · Berth 7',tm:'8m',bg:'var(--green-icon)',pg:'assignments'},
    {t:'Substitute approved — Gillette Fusion',s:'Ali Mahmoud approved',tm:'14m',bg:'var(--amber-400)',pg:'verification'},
    {t:'Order #AM2451 cancelled by sailor',s:'Reason: Ordered by mistake',tm:'21m',bg:'var(--danger-icon)',pg:'orders'},
    {t:'New sailor registered',s:'Vikram Singh · Singapore',tm:'28m',bg:'var(--info-icon)',pg:'sailors'},
    {t:'Seller application received',s:'Blue Ocean Supplies Co.',tm:'46m',bg:'var(--purple-icon)',pg:'sellers'},
    {t:'DP-00124 started ENQ-0047 delivery',s:'Rahul Singh · 5 items',tm:'52m',bg:'var(--teal-500)',pg:'assignments'},
    {t:'Shaving Kit flagged out of stock',s:'System · Partner report',tm:'1h',bg:'var(--danger-icon)',pg:'products'},
    {t:'Coupon SHIP10 redeemed',s:'Lois Becket · Order #AM2458',tm:'1h',bg:'var(--amber-400)',pg:'rewards'},
  ];
  var feedEl = document.getElementById('activity-feed');
  feedData.forEach(function(f) {
    var row = document.createElement('div');
    row.className = 'feed-row';
    row.style.cursor = 'pointer';
    row.innerHTML = '<div class="feed-dot" style="background:' + f.bg + '"></div><div class="f1"><div class="feed-txt">' + f.t + '</div><div class="feed-sub">' + f.s + '</div></div><div class="feed-time">' + f.tm + '</div>';
    row.onclick = function() { goTo(f.pg); };
    feedEl.appendChild(row);
  });

  /* Revenue chart */
  var chartVals = [48,62,55,80,70,95,84,110,88,102,114,98,128,112];
  var chartDays = [16,17,18,19,20,21,22,23,24,25,26,27,28,29];
  var chartHtml = '<div class="bar-chart" style="height:120px">';
  chartVals.forEach(function(h, i) {
    var cls = i >= 7 ? 'hi' : 'amber';
    chartHtml += '<div class="chart-bar ' + cls + '" style="height:' + (h/1.3).toFixed(1) + '%" title="May ' + chartDays[i] + ': $' + (h*145).toLocaleString() + '" onclick="toast(\'May ' + chartDays[i] + ': $' + (h*145).toLocaleString() + '\',\'\',\'chart-bar\')"></div>';
  });
  chartHtml += '</div><div class="chart-labels">';
  chartDays.forEach(function(d) { chartHtml += '<div class="chart-label">May ' + d + '</div>'; });
  chartHtml += '</div>';
  document.getElementById('revenue-chart').innerHTML = chartHtml;

  /* Order status */
  var statusData = [
    {l:'Delivered',v:129,p:70,c:'var(--teal-500)',pg:'orders'},
    {l:'In Transit',v:38,p:21,c:'var(--amber-400)',pg:'assignments'},
    {l:'Verifying',v:11,p:6,c:'var(--info-icon)',pg:'verification'},
    {l:'Cancelled',v:6,p:3,c:'var(--danger-icon)',pg:'orders'},
  ];
  var statusHtml = '';
  statusData.forEach(function(s) {
    statusHtml += '<div class="mb16" style="cursor:pointer" onclick="goTo(\'' + s.pg + '\')">' +
      '<div class="flex aic mb8"><span class="sm c3 w6 f1">' + s.l + '</span>' +
      '<span class="w7 sm" style="color:' + s.c + '">' + s.v + '</span>' +
      '<span class="xs c4 w6" style="width:34px;text-align:right">' + s.p + '%</span></div>' +
      '<div class="progress"><div class="progress-fill" style="width:' + s.p + '%;background:' + s.c + '"></div></div></div>';
  });
  statusHtml += '<div class="divider"></div><div class="flex aic jb"><span class="xs c4 w6">Delivery success rate</span><span class="w8" style="font-size:17px;color:var(--teal-700)">96.8%</span></div>';
  document.getElementById('order-status-chart').innerHTML = statusHtml;

  /* Top products */
  var products = [
    {n:'Echo Dot 5th Gen',c:'Electronics',o:34,ic:'ti-device-speaker'},
    {n:'Lavazza Coffee',c:'Beverages',o:28,ic:'ti-cup'},
    {n:'Cureskin Tablets',c:'Beauty',o:22,ic:'ti-pill'},
    {n:'Bisleri Water 1L',c:'Express',o:19,ic:'ti-droplet'},
    {n:'Titan Quartz Watch',c:'Accessories',o:16,ic:'ti-watch'},
    {n:'Bombay Shaving Kit',c:'Beauty',o:14,ic:'ti-tool'},
  ];
  var prodHtml = '';
  products.forEach(function(p, i) {
    prodHtml += '<div class="flex aic g10 mb12" style="cursor:pointer" onclick="goTo(\'products\')">' +
      '<span class="xs c4 w7" style="width:16px">' + (i+1) + '</span>' +
      '<div class="prod-thumb" style="width:32px;height:32px;font-size:14px"><i class="ti ' + p.ic + '"></i></div>' +
      '<div class="f1 mw0"><div class="sm w7 c1 trunc">' + p.n + '</div><div class="xs c4">' + p.c + '</div></div>' +
      '<span class="badge badge-teal">' + p.o + '</span></div>';
  });
  document.getElementById('top-products').innerHTML = prodHtml;

  /* Active partners */
  var partners = [
    {n:'Rahul Singh',id:'DP-00124',d:3,st:'Delivering',sc:'teal'},
    {n:'Pita Havili',id:'DP-00087',d:2,st:'Verifying',sc:'warning'},
    {n:'Marco Reyes',id:'DP-00201',d:1,st:'Delivering',sc:'teal'},
    {n:'Aisha Karimi',id:'DP-00056',d:0,st:'Available',sc:'success'},
  ];
  var partHtml = '';
  partners.forEach(function(d) {
    partHtml += '<div class="flex aic g10 mb14" style="cursor:pointer" onclick="drawerProfile(\'' + d.n + '\',\'partner\')">' +
      '<div class="av av-teal">' + d.n[0] + '</div>' +
      '<div class="f1 mw0"><div class="sm w7 c1">' + d.n + '</div>' +
      '<div class="xs c4">' + d.id + (d.d > 0 ? ' · ' + d.d + ' active' : ' · free') + '</div></div>' +
      '<span class="badge badge-' + d.sc + '" style="font-size:10.5px">' + d.st + '</span></div>';
  });
  partHtml += '<div class="divider mb12"></div><div class="flex aic jb xs"><span class="c4 w6">Weekly partner earnings</span><span class="w8 camber">$3,400</span></div>';
  document.getElementById('active-partners').innerHTML = partHtml;

  /* Action required */
  var actions = [
    {icon:'ti-clock',bg:'var(--warning-bg)',c:'var(--warning-icon)',t:'12 orders awaiting payment',s:'48hr window expiring soon',pg:'orders',bl:'Review'},
    {icon:'ti-package-off',bg:'var(--danger-bg)',c:'var(--danger-icon)',t:'3 items out of stock',s:'Admin substitution needed',pg:'products',bl:'Fix'},
    {icon:'ti-map-pin',bg:'var(--info-bg)',c:'var(--info-icon)',t:'2 location changes post-payment',s:'Additional charges required',pg:'orders',bl:'Review'},
    {icon:'ti-building-store',bg:'var(--purple-bg)',c:'var(--purple-icon)',t:'4 seller applications pending',s:'Review required',pg:'sellers',bl:'Open'},
    {icon:'ti-file-invoice',bg:'var(--success-bg)',c:'var(--success-icon)',t:'8 new intent requests',s:'Awaiting availability check',pg:'intents',bl:'Review'},
  ];
  var actEl = document.getElementById('action-required');
  actions.forEach(function(a) {
    var row = document.createElement('div');
    row.className = 'flex ais g10 mb12';
    row.innerHTML =
      '<div style="width:32px;height:32px;background:' + a.bg + ';color:' + a.c + ';border-radius:var(--radius-sm);font-size:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center"><i class="ti ' + a.icon + '"></i></div>' +
      '<div class="f1 mw0"><div class="sm w7 c1">' + a.t + '</div><div class="xs c4">' + a.s + '</div></div>';
    var btn = document.createElement('button');
    btn.className = 'btn btn-ghost btn-xs';
    btn.textContent = a.bl;
    btn.onclick = function() { goTo(a.pg); };
    row.appendChild(btn);
    actEl.appendChild(row);
  });
};

/* ─── ANALYTICS ─── */
PAGES.analytics = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Analytics & Insights</h1><p class="pg-sub"><span>Sales · Delivery · Users · Products · Ports</span></p></div>
    <div class="pg-actions">
      <div class="pill-toggle"><div class="pill-btn active" onclick="segClick(this)">7 Days</div><div class="pill-btn" onclick="segClick(this)">30 Days</div><div class="pill-btn" onclick="segClick(this)">Quarter</div><div class="pill-btn" onclick="segClick(this)">Year</div></div>
      <button class="btn btn-secondary btn-sm"><i class="ti ti-calendar"></i>Date Range</button>
      <button class="btn btn-primary btn-sm" onclick="exportData('CSV')"><i class="ti ti-download"></i>Export CSV</button>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-card sc-teal"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Monthly Revenue</div><div class="stat-icon"><i class="ti ti-currency-dollar"></i></div></div><div class="stat-val">$284k</div><div class="stat-foot"><span class="stat-delta up"><i class="ti ti-trending-up"></i>18.3%</span><span>vs last month</span></div></div>
    <div class="stat-card sc-navy"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Total Orders</div><div class="stat-icon"><i class="ti ti-package"></i></div></div><div class="stat-val">3,421</div><div class="stat-foot"><span class="stat-delta up"><i class="ti ti-trending-up"></i>12.1%</span></div></div>
    <div class="stat-card sc-green"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Delivery Success</div><div class="stat-icon"><i class="ti ti-circle-check"></i></div></div><div class="stat-val">96.8%</div><div class="stat-foot"><span>124 failed this month</span></div></div>
    <div class="stat-card sc-amber"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Active Sailors</div><div class="stat-icon"><i class="ti ti-users"></i></div></div><div class="stat-val">1,204</div><div class="stat-foot"><span class="stat-delta up"><i class="ti ti-trending-up"></i>220 new</span></div></div>
    <div class="stat-card sc-purple"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Avg Order Value</div><div class="stat-icon"><i class="ti ti-receipt"></i></div></div><div class="stat-val">$83.05</div><div class="stat-foot"><span class="stat-delta up"><i class="ti ti-trending-up"></i>4.2%</span></div></div>
    <div class="stat-card sc-red"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Cancellation Rate</div><div class="stat-icon"><i class="ti ti-circle-x"></i></div></div><div class="stat-val">3.3%</div><div class="stat-foot"><span class="stat-delta dn"><i class="ti ti-trending-down"></i>0.8% improved</span></div></div>
  </div>
  <div class="grid-2 mb20" id="analytics-charts"></div>
  <div class="grid-3 mb20" id="analytics-detail"></div>
  <div class="card" id="analytics-table"></div>`;

  /* Charts */
  var sales = [55,42,70,88,60,95,78,90,65,88,95,72,100,84];
  var cats  = [{n:'Fashion',v:85},{n:'Beauty',v:70},{n:'Fitness',v:60},{n:'Elec.',v:95},{n:'Marine',v:50},{n:'Living',v:75},{n:'Games',v:40},{n:'Express',v:88},{n:'Special',v:65}];

  var salesBars = sales.map(function(h,i){ return '<div class="chart-bar hi" style="height:'+h+'%" title="May '+(16+i)+': $'+(h*3200).toLocaleString()+'"></div>'; }).join('');
  var catBars   = cats.map(function(b){ return '<div class="chart-bar teal" style="height:'+b.v+'%" title="'+b.n+': '+b.v+' orders"></div>'; }).join('');
  var salesLabels = [16,17,18,19,20,21,22,23,24,25,26,27,28,29].map(function(d){ return '<div class="chart-label">May '+d+'</div>'; }).join('');
  var catLabels   = cats.map(function(b){ return '<div class="chart-label">'+b.n+'</div>'; }).join('');

  document.getElementById('analytics-charts').innerHTML =
    '<div class="card"><div class="card-hd"><div class="card-ttl"><i class="ti ti-chart-bar"></i>Sales Trend (Daily)</div></div><div class="card-body"><div class="bar-chart" style="height:130px">'+salesBars+'</div><div class="chart-labels">'+salesLabels+'</div></div></div>' +
    '<div class="card"><div class="card-hd"><div class="card-ttl"><i class="ti ti-chart-bar"></i>Orders by Category</div></div><div class="card-body"><div class="bar-chart" style="height:130px">'+catBars+'</div><div class="chart-labels">'+catLabels+'</div></div></div>';

  var ports = [{p:'PSA Pasir Panjang',o:842,pc:30,c:'var(--teal-500)'},{p:'Keppel Terminal',o:621,pc:22,c:'var(--navy-400)'},{p:'Brani Terminal',o:518,pc:18,c:'var(--amber-400)'},{p:'Jurong Port',o:392,pc:14,c:'var(--purple-icon)'},{p:'Port of Charleston',o:280,pc:10,c:'var(--green-icon)'},{p:'Others',o:168,pc:6,c:'var(--t4)'}];
  var cancel = [{r:'Ordered by mistake',n:42,p:34},{r:'Found better price',n:33,p:27},{r:'Delivery too long',n:26,p:21},{r:'Changed my mind',n:15,p:12},{r:'Other',n:8,p:6}];
  var leaders= [{n:'Rahul Singh',d:124,r:'4.9',e:'$842',rk:1},{n:'Pita Havili',d:98,r:'4.7',e:'$661',rk:2},{n:'Marco Reyes',d:87,r:'4.8',e:'$589',rk:3},{n:'Aisha Karimi',d:76,r:'4.6',e:'$514',rk:4},{n:'David Lim',d:52,r:'4.4',e:'$351',rk:5}];

  var portHtml = ports.map(function(p){ return '<div class="mb14"><div class="flex aic mb6"><span class="sm c3 w6 f1">'+p.p+'</span><span class="w7 sm c1">'+p.o+'</span><span class="xs c4 w6" style="width:32px;text-align:right">'+p.pc+'%</span></div><div class="progress"><div class="progress-fill" style="width:'+(p.pc*3)+'%;background:'+p.c+'"></div></div></div>'; }).join('');
  var cancelHtml = cancel.map(function(r){ return '<div class="mb12"><div class="flex aic mb5"><span class="sm c3 w6 f1">'+r.r+'</span><span class="w7 sm c1">'+r.n+'</span></div><div class="progress"><div class="progress-fill" style="width:'+(r.p*2.5)+'%;background:var(--danger-icon);opacity:0.7"></div></div></div>'; }).join('');
  var leadHtml  = leaders.map(function(d){ return '<div class="flex aic g10 mb12" style="cursor:pointer" onclick="drawerProfile(\''+d.n+'\',\'partner\')"><span class="xs c4 w8" style="width:16px">'+d.rk+'</span><div class="av av-sm av-teal">'+d.n[0]+'</div><div class="f1 mw0"><div class="sm w7 c1">'+d.n+'</div><div class="xs c4">'+d.d+' deliveries · <span class="camber">★ '+d.r+'</span></div></div><span class="sm w8 cteal">'+d.e+'</span></div>'; }).join('');

  document.getElementById('analytics-detail').innerHTML =
    '<div class="card"><div class="card-hd"><div class="card-ttl"><i class="ti ti-map-pin"></i>Port Analytics</div></div><div class="card-body-sm">'+portHtml+'</div></div>' +
    '<div class="card"><div class="card-hd"><div class="card-ttl"><i class="ti ti-circle-x"></i>Cancellation Reasons</div></div><div class="card-body-sm">'+cancelHtml+'</div></div>' +
    '<div class="card"><div class="card-hd"><div class="card-ttl"><i class="ti ti-trophy"></i>Partner Leaderboard</div></div><div class="card-body-sm">'+leadHtml+'</div></div>';

  var perfRows = [
    ['Bisleri Water 1L','Beverages','1,284','$2,568','↑ 22%',[3,5,4,8,7,9,8]],
    ["Lay's Classic","Snacks",'986','$2,958','↑ 17%',[5,4,6,7,6,8,9]],
    ['Tetley Green Tea','Beverages','742','$2,226','↑ 31%',[2,4,5,6,8,9,10]],
    ['Dettol Antiseptic','Personal Care','621','$3,726','↑ 14%',[6,7,6,8,7,9,8]],
    ['Amul Taaza Milk','Beverages','584','$2,920','↑ 8%',[7,8,7,8,8,9,8]],
  ];
  var tableRows = perfRows.map(function(row,i){
    var spark = row[6].map(function(v){ return '<div class="spark-bar" style="height:'+(v*2.5)+'px;background:var(--teal-400);opacity:0.7"></div>'; }).join('');
    return '<tr class="tr-click" onclick="goTo(\'express\')"><td class="td-m">'+(i+1)+'</td><td class="td-p">'+row[0]+'</td><td><span class="badge badge-navy">'+row[1]+'</span></td><td class="td-p">'+row[2]+'</td><td class="td-p w7">'+row[3]+'</td><td class="w7 csuccess">'+row[4]+'</td><td><div class="sparkline">'+spark+'</div></td></tr>';
  }).join('');

  document.getElementById('analytics-table').innerHTML =
    '<div class="card-hd"><div class="card-ttl"><i class="ti ti-bolt"></i>Express Item Performance</div><button class="btn btn-ghost btn-sm" onclick="exportData()"><i class="ti ti-download"></i>Export</button></div>' +
    '<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Product</th><th>Category</th><th>Units Sold</th><th>Revenue</th><th>Growth</th><th>Trend</th></tr></thead><tbody>'+tableRows+'</tbody></table></div>';
};

/* ─── SAILORS ─── */
PAGES.sailors = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Sailors Management</h1><p class="pg-sub"><span>2,847 registered</span><span class="sep">·</span><span>1,204 active this month</span></p></div>
    <div class="pg-actions">
      <div class="input-wrap"><i class="ti ti-search pre"></i><input type="text" class="form-input has-icon" placeholder="Search sailors…" style="width:220px"></div>
      <select class="form-select"><option>All Status</option><option>Active</option><option>Inactive</option><option>New</option><option>Blocked</option></select>
      <button class="btn btn-primary" onclick="modalAddSailor()"><i class="ti ti-user-plus"></i>Add Sailor</button>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-card sc-navy"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Total Sailors</div><div class="stat-icon"><i class="ti ti-users"></i></div></div><div class="stat-val">2,847</div><div class="stat-foot"><span class="stat-delta up"><i class="ti ti-trending-up"></i>220</span><span>this month</span></div></div>
    <div class="stat-card sc-green"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Active This Month</div><div class="stat-icon"><i class="ti ti-user-check"></i></div></div><div class="stat-val">1,204</div><div class="stat-foot"><span>42.3% engagement</span></div></div>
    <div class="stat-card sc-amber"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Loyalty Pts Issued</div><div class="stat-icon"><i class="ti ti-gift"></i></div></div><div class="stat-val">4.82M</div><div class="stat-foot"><span>≈ $48,200 value</span></div></div>
    <div class="stat-card sc-teal"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Referrals (Month)</div><div class="stat-icon"><i class="ti ti-share"></i></div></div><div class="stat-val">148</div><div class="stat-foot"><span>+500 pts each</span></div></div>
  </div>
  <div class="tab-row"><div class="tab-item active" onclick="segClick(this)">All</div><div class="tab-item" onclick="segClick(this)">Active</div><div class="tab-item" onclick="segClick(this)">Inactive</div><div class="tab-item" onclick="segClick(this)">New Signups</div><div class="tab-item" onclick="segClick(this)">Blocked</div></div>
  <div class="card" id="sailors-table"></div>`;

  var sailors = [
    {n:'Lois Becket',e:'loisbecket@gmail.com',w:'+44 7700 900124',j:'Mar 12, 2026',sh:'IMO 0123456',o:18,p:2450,ca:1,wi:3,st:'Active',sc:'success'},
    {n:'Ali Mahmoud',e:'ali.m@vessel.com',w:'+971 50 444 1234',j:'Jan 8, 2026',sh:'MSC Marvela',o:12,p:1820,ca:2,wi:5,st:'Active',sc:'success'},
    {n:'Sara Chen',e:'sara.c@marine.io',w:'+65 9123 4567',j:'Feb 22, 2026',sh:'APL Vanda',o:7,p:920,ca:0,wi:2,st:'Active',sc:'success'},
    {n:'James Wren',e:'jwren@shipco.net',w:'+44 7900 112233',j:'Dec 3, 2025',sh:'Evergreen Faith',o:31,p:5100,ca:0,wi:8,st:'Active',sc:'success'},
    {n:'Ravi Patel',e:'ravi.p@anchormail.com',w:'+91 98765 43210',j:'Apr 1, 2026',sh:'IMO 0123456',o:2,p:200,ca:6,wi:1,st:'New',sc:'info'},
    {n:'Maria Santos',e:'msantos@seafarer.ph',w:'+63 912 345 6789',j:'Nov 14, 2025',sh:'MSC Marvela',o:0,p:0,ca:0,wi:0,st:'Inactive',sc:'neutral'},
  ];

  var tableHtml = '<div class="tbl-wrap"><table><thead><tr><th>Sailor</th><th>Contact</th><th>Joined</th><th>Ship</th><th>Orders</th><th>Loyalty Pts</th><th>Cart/Wish</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  sailors.forEach(function(s) {
    tableHtml += '<tr class="tr-click">' +
      '<td><div class="flex aic g10"><div class="av av-navy">'+s.n[0]+'</div><div><div class="td-p">'+s.n+'</div><div class="td-m">'+s.e+'</div></div></div></td>' +
      '<td class="td-m">'+s.w+'</td><td class="td-m">'+s.j+'</td><td class="td-m">'+s.sh+'</td>' +
      '<td class="td-p w7">'+s.o+'</td>' +
      '<td><span class="camber w7">'+s.p.toLocaleString()+'</span><span class="td-m"> pts</span></td>' +
      '<td class="td-m">'+s.ca+' · '+s.wi+'</td>' +
      '<td><span class="badge badge-'+s.sc+'">'+s.st+'</span></td>' +
      '<td><div class="td-acts">' +
        '<button class="btn btn-ghost btn-sm btn-icon" title="View"><i class="ti ti-eye"></i></button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" title="Edit"><i class="ti ti-edit"></i></button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" title="Message"><i class="ti ti-message"></i></button>' +
        '<button class="btn btn-danger btn-sm btn-icon" title="Block"><i class="ti ti-ban"></i></button>' +
      '</div></td></tr>';
  });
  tableHtml += '</tbody></table></div><div class="pagination"><span class="sm c4 w6" style="margin-right:auto">Showing 6 of 2,847</span><div class="pg-btn"><i class="ti ti-chevron-left" style="font-size:14px"></i></div><div class="pg-btn active">1</div><div class="pg-btn">2</div><div class="pg-btn">3</div><div class="pg-btn"><i class="ti ti-chevron-right" style="font-size:14px"></i></div></div>';

  document.getElementById('sailors-table').innerHTML = tableHtml;

  /* Wire row events using JS (no inline onclick strings) */
  var rows = document.getElementById('sailors-table').querySelectorAll('tbody tr');
  rows.forEach(function(tr, i) {
    var s = sailors[i];
    tr.onclick = function() { drawerProfile(s.n, 'sailor'); };
    var btns = tr.querySelectorAll('button');
    btns[0].onclick = function(e) { e.stopPropagation(); drawerProfile(s.n, 'sailor'); };
    btns[1].onclick = function(e) { e.stopPropagation(); modalAddSailor({name:s.n, email:s.e, wa:s.w}); };
    btns[2].onclick = function(e) { e.stopPropagation(); toast('WhatsApp opened for ' + s.n, '', 'message'); };
    btns[3].onclick = function(e) { e.stopPropagation(); showConfirm({title:'Block Sailor', msg:'Block ' + s.n + '? They will lose app access.', danger:true, confirmText:'Block'}, function(){ toast(s.n + ' blocked', 'danger', 'ban'); }); };
  });
};

/* ─── ORDERS ─── */
PAGES.orders = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Orders Management</h1><p class="pg-sub"><span>184 orders today</span><span class="sep">·</span><span>Full lifecycle visibility</span></p></div>
    <div class="pg-actions">
      <div class="input-wrap"><i class="ti ti-search pre"></i><input type="text" class="form-input has-icon" placeholder="Search orders…" style="width:240px"></div>
      <select class="form-select"><option>All Status</option><option>New</option><option>Verifying</option><option>In Progress</option><option>Delivering</option><option>Delivered</option><option>Cancelled</option></select>
      <button class="btn btn-secondary btn-sm"><i class="ti ti-calendar"></i>Date Range</button>
      <button class="btn btn-primary btn-sm" onclick="exportData()"><i class="ti ti-download"></i>Export</button>
    </div>
  </div>
  <div class="filter-row">
    <div class="fchip active" onclick="segClick(this)">All (184)</div>
    <div class="fchip" onclick="segClick(this)">New (12)</div>
    <div class="fchip" onclick="segClick(this)">Verifying (8)</div>
    <div class="fchip" onclick="segClick(this)">Awaiting Payment (12)</div>
    <div class="fchip" onclick="segClick(this)">In Progress (47)</div>
    <div class="fchip" onclick="segClick(this)">Delivering (38)</div>
    <div class="fchip" onclick="segClick(this)">Delivered (129)</div>
    <div class="fchip" onclick="segClick(this)">Cancelled (6)</div>
  </div>
  <div class="card" id="orders-table"></div>`;

  var orders = [
    {id:'#AM2458',s:'Lois Becket',it:'Titan Watch, Card Holder',sh:'0123456 · Anch.2',pt:'Rahul Singh',pay:'Card ✓',cp:'SHIP10',t:'$84.00',st:'In Progress',sc:'warning'},
    {id:'#AM2461',s:'Ali Mahmoud',it:'Nu Republic ×2, Protein Bar',sh:'MSC Marvela · B7',pt:'Rahul Singh',pay:'Card ✓',cp:'—',t:'$70.45',st:'Verifying',sc:'info'},
    {id:'#AM2463',s:'James Wren',it:'Coffee, Tablets, Side table',sh:'Evergreen · Brani',pt:'Pita Havili',pay:'Card ✓',cp:'FREESHIP',t:'$48.00',st:'Delivering',sc:'teal'},
    {id:'#AM2465',s:'Sara Chen',it:'Echo Dot 5th Gen, Echo Buds',sh:'APL Vanda · PSA',pt:'Marco Reyes',pay:'Card ✓',cp:'—',t:'$94.99',st:'Delivered',sc:'success'},
    {id:'#AM2467',s:'Ravi Patel',it:'Express items ×6',sh:'IMO 0123456',pt:'Unassigned',pay:'Pending',cp:'—',t:'$32.00',st:'New',sc:'neutral'},
    {id:'#AM2451',s:'Maria Santos',it:'KILLER Running Shoes',sh:'MSC Marvela',pt:'—',pay:'Refund',cp:'—',t:'$67.00',st:'Cancelled',sc:'danger'},
  ];

  var tbody = '<div class="tbl-wrap"><table><thead><tr><th>Order ID</th><th>Sailor</th><th>Items</th><th>Ship / Terminal</th><th>Partner</th><th>Payment</th><th>Coupon</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  orders.forEach(function(o) {
    var pc = o.pt === 'Unassigned' ? 'var(--danger-text)' : 'var(--t3)';
    var payc = o.pay.includes('✓') ? 'var(--success-text)' : o.pay === 'Pending' ? 'var(--warning-text)' : 'var(--danger-text)';
    tbody += '<tr class="tr-click">' +
      '<td class="td-id">'+o.id+'</td>' +
      '<td><div class="flex aic g8"><div class="av av-sm av-navy">'+o.s[0]+'</div><span class="td-p">'+o.s+'</span></div></td>' +
      '<td><span class="sm c3 w5 trunc" style="max-width:170px;display:block">'+o.it+'</span></td>' +
      '<td class="td-m">'+o.sh+'</td>' +
      '<td style="color:'+pc+';font-size:12.5px;font-weight:600">'+o.pt+'</td>' +
      '<td style="color:'+payc+';font-size:12.5px;font-weight:700">'+o.pay+'</td>' +
      '<td class="td-m">'+o.cp+'</td>' +
      '<td class="td-p w7">'+o.t+'</td>' +
      '<td><span class="badge badge-'+o.sc+'">'+o.st+'</span></td>' +
      '<td><div class="td-acts">' +
        '<button class="btn btn-ghost btn-sm btn-icon" data-action="view" title="View"><i class="ti ti-eye"></i></button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" data-action="assign" title="Reassign"><i class="ti ti-transfer"></i></button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" data-action="msg" title="Message"><i class="ti ti-message"></i></button>' +
        '<button class="btn btn-danger btn-sm btn-icon" data-action="cancel" title="Cancel"><i class="ti ti-x"></i></button>' +
      '</div></td></tr>';
  });
  tbody += '</tbody></table></div><div class="pagination"><span class="sm c4 w6" style="margin-right:auto">Showing 6 of 184</span><div class="pg-btn"><i class="ti ti-chevron-left" style="font-size:14px"></i></div><div class="pg-btn active">1</div><div class="pg-btn">2</div><div class="pg-btn">3</div><div class="pg-btn"><i class="ti ti-chevron-right" style="font-size:14px"></i></div></div>';

  document.getElementById('orders-table').innerHTML = tbody;

  /* Wire events */
  var trs = document.getElementById('orders-table').querySelectorAll('tbody tr');
  trs.forEach(function(tr, i) {
    var o = orders[i];
    var orderData = {id:o.id,sailor:o.s,ship:'0123456',terminal:'Anchorage 2',partner:o.pt,payment:o.pay.includes('✓')?'Card · Paid':'Pending',coupon:o.cp,total:o.t,status:o.st,items:[{name:'Titan Watch',qty:1,price:'$75.00'},{name:'Card Holder',qty:1,price:'$12.00'}]};
    tr.onclick = function() { drawerOrderDetail(orderData); };
    tr.querySelector('[data-action="view"]').onclick    = function(e){ e.stopPropagation(); drawerOrderDetail(orderData); };
    tr.querySelector('[data-action="assign"]').onclick  = function(e){ e.stopPropagation(); modalAssignPartner(o.id); };
    tr.querySelector('[data-action="msg"]').onclick     = function(e){ e.stopPropagation(); toast('Message sent to ' + o.s, 'success', 'message'); };
    tr.querySelector('[data-action="cancel"]').onclick  = function(e){ e.stopPropagation(); showConfirm({title:'Cancel Order', msg:'Cancel '+o.id+'? A refund will be processed.', danger:true, confirmText:'Cancel Order'}, function(){ toast('Order '+o.id+' cancelled', 'danger', 'x'); }); };
  });
};

/* ─── INTENTS ─── */
PAGES.intents = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Intent Requests</h1><p class="pg-sub"><span>Sailor order intents pending review & confirmation</span></p></div>
    <div class="pg-actions">
      <div class="input-wrap"><i class="ti ti-search pre"></i><input type="text" class="form-input has-icon" placeholder="Search intents…" style="width:200px"></div>
      <select class="form-select"><option>All Status</option><option>New</option><option>Under Review</option><option>Awaiting Payment</option><option>Substitution Needed</option></select>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-card sc-navy"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Total Intents</div><div class="stat-icon"><i class="ti ti-file-invoice"></i></div></div><div class="stat-val">23</div><div class="stat-foot"><span>8 pending review</span></div></div>
    <div class="stat-card sc-amber"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Awaiting Payment</div><div class="stat-icon"><i class="ti ti-clock"></i></div></div><div class="stat-val">7</div><div class="stat-foot"><span>48hr window active</span></div></div>
    <div class="stat-card sc-red"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Substitutions Needed</div><div class="stat-icon"><i class="ti ti-refresh"></i></div></div><div class="stat-val">4</div><div class="stat-foot"><span>Items unavailable</span></div></div>
    <div class="stat-card sc-green"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Confirmed Today</div><div class="stat-icon"><i class="ti ti-check"></i></div></div><div class="stat-val">12</div><div class="stat-foot"><span>Moved to orders</span></div></div>
  </div>
  <div class="card" id="intents-table"></div>`;

  var intents = [
    {r:'#INT-0047',s:'Lois Becket',it:'Titan Watch, Card Holder (2)',sh:'0123456 · Anch.1',ar:'24 Apr',sy:'>5 days',cm:'WhatsApp',sb:'22 Apr 14:32',st:'Awaiting Payment',sc:'warning'},
    {r:'#INT-0048',s:'Ali Mahmoud',it:'Nu Republic, Protein Bar, Kit (3)',sh:'MSC Marvela · B7',ar:'22 Apr',sy:'3 days',cm:'Email',sb:'22 Apr 11:20',st:'Under Review',sc:'info'},
    {r:'#INT-0049',s:'James Wren',it:'Coffee, Organizer, Tablets (4)',sh:'Evergreen · Brani',ar:'23 Apr',sy:'2 days',cm:'WhatsApp',sb:'22 Apr 10:05',st:'Items Confirmed',sc:'teal'},
    {r:'#INT-0050',s:'Sara Chen',it:'Echo Dot 5th Gen, Echo Buds (2)',sh:'APL Vanda · PSA',ar:'24 Apr',sy:'1 day',cm:'Email',sb:'22 Apr 09:41',st:'Substitution Needed',sc:'danger'},
    {r:'#INT-0051',s:'Ravi Patel',it:'Shaving Kit, Water Bottle ×2 (3)',sh:'IMO 0123456',ar:'25 Apr',sy:'3 days',cm:'WhatsApp',sb:'22 Apr 08:15',st:'New',sc:'neutral'},
  ];

  var rows = intents.map(function(i){
    var csc = i.cm === 'WhatsApp' ? 'success' : 'info';
    return '<tr class="tr-click">' +
      '<td class="td-id xs">'+i.r+'</td>' +
      '<td><div class="flex aic g8"><div class="av av-sm av-teal">'+i.s[0]+'</div><span class="td-p">'+i.s+'</span></div></td>' +
      '<td class="td-m" style="max-width:190px"><span class="trunc" style="display:block">'+i.it+'</span></td>' +
      '<td class="td-m">'+i.sh+'</td><td class="td-m">'+i.ar+'</td><td class="td-m">'+i.sy+'</td>' +
      '<td><span class="badge badge-'+csc+'" style="font-size:10.5px">'+i.cm+'</span></td>' +
      '<td class="td-m">'+i.sb+'</td>' +
      '<td><span class="badge badge-'+i.sc+'">'+i.st+'</span></td>' +
      '<td><div class="td-acts"><button class="btn btn-ghost btn-sm btn-icon"><i class="ti ti-eye"></i></button><button class="btn btn-primary btn-xs" data-action="review">Review</button></div></td>' +
    '</tr>';
  }).join('');

  document.getElementById('intents-table').innerHTML =
    '<div class="tbl-wrap"><table><thead><tr><th>Reference</th><th>Sailor</th><th>Items Requested</th><th>Ship</th><th>Arrival</th><th>Stay</th><th>Comm.</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';

  document.getElementById('intents-table').querySelectorAll('tbody tr').forEach(function(tr, i) {
    var intent = intents[i];
    tr.onclick = function() { modalReviewIntent(intent.r); };
    tr.querySelector('[data-action="review"]').onclick = function(e){ e.stopPropagation(); modalReviewIntent(intent.r); };
    tr.querySelector('.btn-icon').onclick = function(e){ e.stopPropagation(); modalReviewIntent(intent.r); };
  });
};

/* ─── PRODUCTS ─── */
PAGES.products = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Products & Catalog</h1><p class="pg-sub"><span>1,284 products</span><span class="sep">·</span><span style="color:var(--danger-text);font-weight:700">86 out of stock</span></p></div>
    <div class="pg-actions">
      <div class="input-wrap"><i class="ti ti-search pre"></i><input type="text" class="form-input has-icon" placeholder="Search products…" style="width:200px"></div>
      <select class="form-select"><option>All Categories</option><option>Fashion</option><option>Beauty</option><option>Fitness</option><option>Electronics</option><option>Marine Emergency</option><option>Living</option></select>
      <select class="form-select"><option>All Status</option><option>In Stock</option><option>Out of Stock</option><option>Low Stock</option></select>
      <button class="btn btn-primary" onclick="modalAddProduct()"><i class="ti ti-plus"></i>Add Product</button>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-card sc-navy"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Total Products</div><div class="stat-icon"><i class="ti ti-box-seam"></i></div></div><div class="stat-val">1,284</div><div class="stat-foot"><span>12 categories</span></div></div>
    <div class="stat-card sc-green"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">In Stock</div><div class="stat-icon"><i class="ti ti-check"></i></div></div><div class="stat-val">1,198</div><div class="stat-foot"><span>93.3% availability</span></div></div>
    <div class="stat-card sc-red"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Out of Stock</div><div class="stat-icon"><i class="ti ti-package-off"></i></div></div><div class="stat-val">86</div><div class="stat-foot"><span>Needs attention</span></div></div>
    <div class="stat-card sc-amber"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Featured / Deals</div><div class="stat-icon"><i class="ti ti-star"></i></div></div><div class="stat-val">48</div><div class="stat-foot"><span>Active promotions</span></div></div>
  </div>
  <div class="tab-row"><div class="tab-item active" onclick="segClick(this)">All Products</div><div class="tab-item" onclick="segClick(this)">Deal Products</div><div class="tab-item" onclick="segClick(this)">Out of Stock</div><div class="tab-item" onclick="segClick(this)">Special Requests</div></div>
  <div class="card" id="products-table"></div>`;

  var prods = [
    {ic:'ti-device-speaker',n:'Echo Dot 5th Gen',d:'Smart speaker with Alexa',c:'Electronics',p:'$39.99',sk:124,so:'1,284+',r:4.7,f:true,s:'Active',sc:'success'},
    {ic:'ti-watch',n:'Titan Quartz Analog Watch',d:'Car wheel multicolour dial',c:'Accessories',p:'$75.00',sk:38,so:'100+',r:4.5,f:true,s:'Active',sc:'success'},
    {ic:'ti-cup',n:'Lavazza IL Mattino Coffee',d:'Ground coffee powder',c:'Beverages',p:'$11.30',sk:210,so:'547+',r:4.8,f:false,s:'Active',sc:'success'},
    {ic:'ti-droplet',n:'Aquaminder Water Bottle',d:'770ml smart water bottle',c:'Fitness',p:'$13.77',sk:0,so:'100+',r:4.3,f:false,s:'Out of Stock',sc:'danger'},
    {ic:'ti-shoe',n:'KILLER Trendy Running Shoes',d:'For Men',c:'Fashion',p:'$67.00',sk:14,so:'50+',r:4.6,f:true,s:'Low Stock',sc:'warning'},
    {ic:'ti-tool',n:'Bombay Shaving Kit 5 Piece',d:'Complete grooming kit',c:'Beauty',p:'$18.00',sk:56,so:'200+',r:4.4,f:false,s:'Active',sc:'success'},
  ];

  var rows = prods.map(function(p) {
    var skc = p.sk === 0 ? 'var(--danger-text)' : p.sk < 20 ? 'var(--warning-text)' : 'var(--t3)';
    var skw = p.sk < 20 ? '700' : '500';
    var stars = '★'.repeat(Math.floor(p.r)) + '☆'.repeat(5-Math.floor(p.r));
    var feat = p.f ? '<span class="badge badge-amber"><i class="ti ti-star"></i>Yes</span>' : '<span class="td-m">—</span>';
    return '<tr class="tr-click">' +
      '<td><div class="prod-thumb"><i class="ti '+p.ic+'"></i></div></td>' +
      '<td><div class="td-p">'+p.n+'</div><div class="td-m">'+p.d+'</div></td>' +
      '<td><span class="badge badge-navy">'+p.c+'</span></td>' +
      '<td class="td-p w7">'+p.p+'</td>' +
      '<td style="color:'+skc+';font-weight:'+skw+'">'+p.sk+'</td>' +
      '<td class="td-m">'+p.so+'</td>' +
      '<td><span class="stars">'+stars+'</span><span class="xs c4 w6"> '+p.r+'</span></td>' +
      '<td>'+feat+'</td>' +
      '<td><span class="badge badge-'+p.sc+'">'+p.s+'</span></td>' +
      '<td><div class="td-acts">' +
        '<button class="btn btn-ghost btn-sm btn-icon" data-action="edit" title="Edit"><i class="ti ti-edit"></i></button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" data-action="feat" title="Toggle featured"><i class="ti ti-star"></i></button>' +
        '<button class="btn btn-danger btn-sm btn-icon" data-action="del" title="Remove"><i class="ti ti-trash"></i></button>' +
      '</div></td></tr>';
  }).join('');

  document.getElementById('products-table').innerHTML =
    '<div class="tbl-wrap"><table><thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Sold</th><th>Rating</th><th>Featured</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';

  document.getElementById('products-table').querySelectorAll('tbody tr').forEach(function(tr, i) {
    var p = prods[i];
    tr.onclick = function() { modalAddProduct({name:p.n, desc:p.d, price:p.p.replace('$',''), stock:String(p.sk), featured:p.f}); };
    tr.querySelector('[data-action="edit"]').onclick = function(e){ e.stopPropagation(); modalAddProduct({name:p.n, desc:p.d, price:p.p.replace('$',''), stock:String(p.sk), featured:p.f}); };
    tr.querySelector('[data-action="feat"]').onclick = function(e){ e.stopPropagation(); toast((p.f ? 'Removed from' : 'Added to') + ' featured', '', 'star'); };
    tr.querySelector('[data-action="del"]').onclick  = function(e){ e.stopPropagation(); showConfirm({title:'Remove Product', msg:'Remove "'+p.n+'"? Cannot be undone.', danger:true, confirmText:'Remove'}, function(){ toast('Product removed', 'danger', 'trash'); }); };
  });
};

PAGES.inventory = function(c){
  c.innerHTML = `
    <div class="pe-top">
      <div class="pg-header" style="align-items:center;gap:12px">
        <div class="pg-header-l"><div style="display:flex;flex-direction:column"><div style="font-weight:700">Inventory Dashboard</div><div class="sm c4">Track stock, locations, and low inventory alerts.</div></div></div>
        <div class="pg-actions" style="gap:8px"><button class="btn btn-secondary" onclick="refreshPage()"><i class="ti ti-refresh"></i> Refresh</button></div>
      </div>
    </div>
    <div class="grid-2 mt16">
      <div class="card"><div class="card-hd"><div class="card-ttl">In Stock</div></div><div class="card-body"><div style="font-size:28px;font-weight:800;margin-bottom:10px">1,248</div><div class="sm c4">Products ready for fulfillment</div></div></div>
      <div class="card"><div class="card-hd"><div class="card-ttl">Low Stock</div></div><div class="card-body"><div style="font-size:28px;font-weight:800;margin-bottom:10px">87</div><div class="sm c4">Items below re-order threshold</div></div></div>
      <div class="card"><div class="card-hd"><div class="card-ttl">Locations</div></div><div class="card-body"><div style="font-size:28px;font-weight:800;margin-bottom:10px">8</div><div class="sm c4">Active storage and pickup points</div></div></div>
      <div class="card"><div class="card-hd"><div class="card-ttl">Backordered</div></div><div class="card-body"><div style="font-size:28px;font-weight:800;margin-bottom:10px">14</div><div class="sm c4">Products awaiting replenishment</div></div></div>
    </div>
    <div class="card mt16">
      <div class="card-hd"><div class="card-ttl">Stock by Location</div></div>
      <div class="card-body"><div class="table-responsive"><table><thead><tr><th>Location</th><th>Available</th><th>Reserved</th><th>Last update</th></tr></thead><tbody><tr><td>Bayview Warehouse</td><td>624</td><td>34</td><td>5m ago</td></tr><tr><td>Harbor Fulfillment</td><td>318</td><td>12</td><td>12m ago</td></tr><tr><td>Portside Retail</td><td>176</td><td>8</td><td>18m ago</td></tr><tr><td>Express Locker</td><td>130</td><td>4</td><td>2h ago</td></tr></tbody></table></div></div>
    </div>
    <div class="card mt16">
      <div class="card-hd"><div class="card-ttl">Alert Items</div></div>
      <div class="card-body"><div class="table-responsive"><table><thead><tr><th>SKU</th><th>Product</th><th>Available</th><th>Threshold</th></tr></thead><tbody><tr><td>AM-01234</td><td>OceanWave Speaker</td><td>9</td><td>15</td></tr><tr><td>AM-04567</td><td>Coastal Charger</td><td>6</td><td>10</td></tr><tr><td>AM-08901</td><td>Port Pro Headphones</td><td>3</td><td>8</td></tr></tbody></table></div></div>
    </div>
  `;
};

function toggleEditorPreview(){
  var html = document.getElementById('pe-desc').innerHTML;
  showModal({ title: 'Product Description Preview', size: 'lg', icon: 'eye', body: '<div class="rte-preview">'+html+'</div>', footer: '<button class="btn btn-secondary" onclick="closeModal()">Close</button>' });
}

function computeSEO(){
  var descEl = document.getElementById('pe-desc')||{innerText:''};
  var txt = descEl.innerText || '';
  var words = txt.trim().split(/\s+/).filter(Boolean).length;
  var chars = txt.length;
  var title = (document.getElementById('pe-title')||{value:''}).value || '';
  var metaTitle = (document.getElementById('pe-meta-title')||{value:''}).value.trim();
  var metaDesc = (document.getElementById('pe-meta-desc')||{value:''}).value.trim();
  var score = 0;
  if (title.length>10 && title.length<70) score += 30;
  if (words>80) score += 30;
  if (chars>200) score += 20;
  var status = score >= 70 ? 'Good' : score >= 40 ? 'Fair' : 'Needs improvement';
  var seoText = 'SEO: ' + score + '/100 · ' + words + ' words';
  var el = document.getElementById('rte-seo-score'); if (el) el.textContent = seoText;
  var previewTitle = document.getElementById('seo-preview-title'); if (previewTitle) previewTitle.textContent = metaTitle || title || 'Meta title preview';
  var previewDesc = document.getElementById('seo-preview-desc'); if (previewDesc) previewDesc.textContent = metaDesc || (txt.substring(0,160) || 'Meta description preview. Keep it concise and keyword rich for search results.');
  var seoState = document.getElementById('vc-seo'); if (seoState) seoState.textContent = status;
}

function computePricing(){
  var p = parseFloat(document.getElementById('pe-price').value) || 0;
  var c = parseFloat(document.getElementById('pe-cost').value) || 0;
  var comp = parseFloat(document.getElementById('pe-compare').value) || 0;
  var margin = p && c ? ((p - c) / p) * 100 : null;
  var markup = p && c ? ((p - c) / c) * 100 : null;
  var txt = [];
  if (margin !== null) txt.push('Profit margin: ' + margin.toFixed(1) + '%'); else txt.push('Profit margin: —');
  if (markup !== null) txt.push('Markup: ' + markup.toFixed(1) + '%'); else txt.push('Markup: —');
  if (comp) txt.push('Compare-at: $' + comp.toFixed(2));
  var el = document.getElementById('pe-price-meta'); if(el) el.textContent = txt.join(' · ');
}

function previewEditorMedia(files) {
  var grid = document.getElementById('pe-media-grid'); if(!grid) return; grid.innerHTML='';
  files = Array.from(files || []);
  if (!files.length) { grid.innerHTML='<div class="empty-state"><i class="ti ti-image"></i><div class="sm c4">No media uploaded</div></div>'; updateValidation(); return; }
  files.slice(0,24).forEach(function(f, idx){
    var item=document.createElement('div'); item.className='media-item'; item.setAttribute('draggable','true');
    if (f.type && f.type.startsWith('image/')) {
      var r=new FileReader(); r.onload=function(e){ item.style.backgroundImage='url('+e.target.result+')'; item.dataset.src = e.target.result; };
      r.readAsDataURL(f);
    } else {
      item.innerHTML='<div style="padding:8px;">'+(f.name||'file')+'</div>';
      item.dataset.src = f.name || '';
    }
    // actions
    var acts=document.createElement('div'); acts.className='mi-actions'; acts.innerHTML='<button class="btn btn-xs btn-ghost" onclick="this.parentElement.parentElement.remove(); updateValidation();"><i class="ti ti-trash"></i></button>';
    item.appendChild(acts);
    // primary toggle on click (excluding action clicks)
    item.addEventListener('click', function(e){ if (e.target.closest('.mi-actions')) return; var prev = grid.querySelector('.media-item.primary'); if(prev && prev!==item) prev.classList.remove('primary'); item.classList.toggle('primary'); if(item.classList.contains('primary')) item.dataset.primary = '1'; else delete item.dataset.primary; saveProductDraft(); updateValidation(); });
    // drag handlers
    item.addEventListener('dragstart', function(e){ item.classList.add('dragging'); window._am_dragEl = item; e.dataTransfer.effectAllowed = 'move'; });
    item.addEventListener('dragend', function(e){ item.classList.remove('dragging'); window._am_dragEl = null; saveProductDraft(); });
    grid.appendChild(item);
  });
  // dragover reorder
  grid.addEventListener('dragover', function(e){ e.preventDefault(); var after = getDragAfterElement(grid, e.clientY); var dragEl = window._am_dragEl; if(!dragEl) return; if (!after) grid.appendChild(dragEl); else grid.insertBefore(dragEl, after); });
  updateValidation();
}

function openCategoryPicker(){
  showModal({
    title: 'Select or Create Category', icon: 'list', size: 'md',
    body: `
      <div class="fg"><label class="fg-label">Search categories</label><input id="cat-search" class="form-input" placeholder="Search or create"></div>
      <div id="cat-list" style="max-height:260px;overflow:auto;padding-top:8px"></div>
      <div class="fg"><label class="fg-label">Create new category</label><input id="cat-new" class="form-input" placeholder="e.g. Electronics > Audio"></div>
    `,
    footer: '<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="createCategory()">Create & Select</button>'
  });
  renderCategoryList();
}

function renderCategoryList(){
  var list = ['Electronics > Audio','Fashion > Men','Home & Living > Furniture','Beauty > Skincare','Grocery > Pantry','Automotive > Parts'];
  var el = document.getElementById('cat-list'); if(!el) return; el.innerHTML = list.map(function(c){ return '<div class="ecard" style="cursor:pointer;padding:8px" onclick="selectCategory(\''+c.replace(/'/g,'\\\'')+'\')">'+c+'</div>'; }).join('');
}

function selectCategory(cat){ document.getElementById('pe-category').value = cat; closeModal(); toast('Category selected: ' + cat, 'success'); }

function createCategory(){ var v = document.getElementById('cat-new').value.trim(); if(!v){ toast('Enter a category name','warning'); return; } document.getElementById('pe-category').value = v; closeModal(); toast('Category created: ' + v, 'success'); }

function selectProductType(el){ var siblings = el.parentElement.querySelectorAll('.pill-btn'); siblings.forEach(function(s){ s.classList.remove('active'); }); el.classList.add('active'); var t = el.getAttribute('data-type'); document.getElementById('pe-inventory').style.display = (t==='service' || t==='digital') ? 'none' : ''; }

function generateSKU(){ var s = 'AM-'+Math.floor(Math.random()*90000+10000); document.getElementById('pe-sku').value = s; document.getElementById('pe-sku-sample').textContent = s; }

function addInventoryLocation(){ var name = (document.getElementById('pe-location-name')||{value:''}).value.trim(); var stock = (document.getElementById('pe-location-stock')||{value:'0'}).value.trim(); if(!name){ toast('Enter a location name','warning'); return; } var list = document.getElementById('pe-location-list'); if(!list) return; var item = document.createElement('div'); item.className='inventory-location'; item.dataset.name = name; item.dataset.stock = stock; item.innerHTML = '<div><strong>'+name+'</strong><div class="sm c4">Stock: '+(stock||'0')+'</div></div><button class="btn btn-ghost btn-xs" onclick="removeInventoryLocation(this)">Remove</button>'; list.appendChild(item); document.getElementById('pe-location-name').value=''; document.getElementById('pe-location-stock').value=''; saveProductDraft(); }

function removeInventoryLocation(btn){ var item = btn.closest('.inventory-location'); if(item) item.remove(); saveProductDraft(); }

function addProductAttribute(){ var key = (document.getElementById('pe-attr-key')||{value:''}).value.trim(); var value = (document.getElementById('pe-attr-value')||{value:''}).value.trim(); if(!key || !value){ toast('Attribute name and value required','warning'); return; } var list = document.getElementById('pe-attributes-list'); if(!list) return; var item = document.createElement('div'); item.className='attribute-item'; item.innerHTML = '<div><strong class="attr-key">'+key+'</strong><div class="sm c4 attr-val">'+value+'</div></div><button class="btn btn-ghost btn-xs" onclick="removeProductAttribute(this)">Remove</button>'; list.appendChild(item); document.getElementById('pe-attr-key').value=''; document.getElementById('pe-attr-value').value=''; saveProductDraft(); }

function removeProductAttribute(btn){ var item = btn.closest('.attribute-item'); if(item) item.remove(); saveProductDraft(); }

function renderInventoryLocations(locations){ var list = document.getElementById('pe-location-list'); if(!list) return; list.innerHTML=''; locations.forEach(function(loc){ var item = document.createElement('div'); item.className='inventory-location'; item.dataset.name = loc.name || ''; item.dataset.stock = loc.stock || ''; item.innerHTML = '<div><strong>'+loc.name+'</strong><div class="sm c4">Stock: '+(loc.stock||'0')+'</div></div><button class="btn btn-ghost btn-xs" onclick="removeInventoryLocation(this)">Remove</button>'; list.appendChild(item); }); }

function renderProductAttributes(attrs){ var list = document.getElementById('pe-attributes-list'); if(!list) return; list.innerHTML=''; attrs.forEach(function(attr){ var item = document.createElement('div'); item.className='attribute-item'; item.innerHTML = '<div><strong class="attr-key">'+attr.key+'</strong><div class="sm c4 attr-val">'+attr.value+'</div></div><button class="btn btn-ghost btn-xs" onclick="removeProductAttribute(this)">Remove</button>'; list.appendChild(item); }); }

function scrollWizardTo(id){ var el = document.getElementById(id); if(!el) return; el.scrollIntoView({behavior:'smooth', block:'start'}); }

function saveProductDraft(btn){
  try {
    var data = {};
    data.title = (document.getElementById('pe-title')||{value:''}).value;
    data.desc = (document.getElementById('pe-desc')||{innerHTML:''}).innerHTML;
    data.price = (document.getElementById('pe-price')||{value:''}).value;
    data.cost = (document.getElementById('pe-cost')||{value:''}).value;
    data.compare = (document.getElementById('pe-compare')||{value:''}).value;
    data.metaTitle = (document.getElementById('pe-meta-title')||{value:''}).value;
    data.metaDesc = (document.getElementById('pe-meta-desc')||{value:''}).value;
    data.category = (document.getElementById('pe-category')||{value:''}).value;
    data.sku = (document.getElementById('pe-sku')||{value:''}).value;
    data.status = (document.getElementById('pe-status')||{value:'draft'}).value;
    // collect media
    data.media = []; var mediaEls = document.querySelectorAll('#pe-media-grid .media-item'); mediaEls.forEach(function(mi){ data.media.push({ src: mi.dataset.src || '', primary: !!mi.dataset.primary }); });
    // collect structured variants
    data.variants = getVariantsFromTable();
    data.locations = [];
    document.querySelectorAll('#pe-location-list .inventory-location').forEach(function(li){ data.locations.push({ name: li.dataset.name || '', stock: li.dataset.stock || '' }); });
    data.attributes = [];
    document.querySelectorAll('#pe-attributes-list .attribute-item').forEach(function(ai){ var key = ai.querySelector('.attr-key'); var val = ai.querySelector('.attr-val'); data.attributes.push({ key: key ? key.textContent : '', value: val ? val.textContent : '' }); });
    localStorage.setItem('am_product_draft', JSON.stringify(data));
    if (btn){ btn.disabled=true; var orig=btn.innerHTML; btn.innerHTML='<i class="ti ti-loader" style="animation:lspin .7s linear infinite"></i> Saving…'; setTimeout(function(){ if(btn){ btn.disabled=false; btn.innerHTML=orig; } toast('Draft saved','success'); var ind = document.getElementById('auto-save-ind'); if(ind) ind.textContent='All changes saved'; },600); }
    else { var ind = document.getElementById('auto-save-ind'); if(ind) ind.textContent='All changes saved'; }
  } catch(err){ console.error('saveProductDraft', err); toast('Failed to save draft','error'); }
}

function publishProduct(btn){
  if(btn){ btn.disabled=true; var orig=btn.innerHTML; btn.innerHTML='<i class="ti ti-loader" style="animation:lspin .7s linear infinite"></i> Publishing…'; setTimeout(function(){ if(btn){ btn.disabled=false; btn.innerHTML=orig; } // set status and save
    document.getElementById('pe-status').value='active'; saveProductDraft(); toast('Product published (local)','success'); },1000); }
}

function loadProductDraft(){
  try {
    var raw = localStorage.getItem('am_product_draft'); if(!raw) return;
    var data = JSON.parse(raw);
    if (!data) return;
    if (data.title) document.getElementById('pe-title').value = data.title;
    if (data.desc) document.getElementById('pe-desc').innerHTML = data.desc;
    if (data.price) document.getElementById('pe-price').value = data.price;
    if (data.cost) document.getElementById('pe-cost').value = data.cost;
    if (data.compare) document.getElementById('pe-compare').value = data.compare;
    if (data.category) document.getElementById('pe-category').value = data.category;
    if (data.sku) document.getElementById('pe-sku').value = data.sku;
    if (data.metaTitle) document.getElementById('pe-meta-title').value = data.metaTitle;
    if (data.metaDesc) document.getElementById('pe-meta-desc').value = data.metaDesc;
    if (data.status) document.getElementById('pe-status').value = data.status;
    if (data.locations && data.locations.length) renderInventoryLocations(data.locations);
    if (data.attributes && data.attributes.length) renderProductAttributes(data.attributes);
    if (data.variants && data.variants.length) renderVariants(data.variants);
    // media
    var grid = document.getElementById('pe-media-grid'); if(grid && data.media && data.media.length){ grid.innerHTML=''; data.media.forEach(function(m){ var item=document.createElement('div'); item.className='media-item'; item.style.backgroundImage = m.src ? 'url('+m.src+')' : ''; if(m.src) item.dataset.src = m.src; if(m.primary) { item.classList.add('primary'); item.dataset.primary='1'; }
        var acts=document.createElement('div'); acts.className='mi-actions'; acts.innerHTML='<button class="btn btn-xs btn-ghost" onclick="this.parentElement.parentElement.remove(); updateValidation();"><i class="ti ti-trash"></i></button>'; item.appendChild(acts);
        item.setAttribute('draggable','true');
        item.addEventListener('click', function(e){ if (e.target.closest('.mi-actions')) return; var prev = grid.querySelector('.media-item.primary'); if(prev && prev!==item) prev.classList.remove('primary'); item.classList.toggle('primary'); if(item.classList.contains('primary')) item.dataset.primary = '1'; else delete item.dataset.primary; saveProductDraft(); updateValidation(); });
        item.addEventListener('dragstart', function(e){ item.classList.add('dragging'); window._am_dragEl = item; });
        item.addEventListener('dragend', function(e){ item.classList.remove('dragging'); window._am_dragEl = null; saveProductDraft(); });
        grid.appendChild(item);
    });
      }
  } catch(e){ console.warn('loadProductDraft', e); }
  updateValidation();
  computePricing();
  computeSEO();
}

function getDragAfterElement(container, y) {
  var draggableElements = [...container.querySelectorAll('.media-item:not(.dragging)')];
  return draggableElements.reduce(function(closest, child){
    var box = child.getBoundingClientRect(); var offset = y - box.top - box.height/2; if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function duplicateProduct(){ toast('Product duplicated','success'); }

function openVariantModal(){
  var existing = getVariantsFromTable();
  showModal({
    title: 'Variant Manager', icon: 'list-check', size: 'lg',
    body: `
      <div class="form-row">
        <div class="fg"><label class="fg-label">Attributes (comma separated)</label><input id="vm-attrs" class="form-input" placeholder="Size, Color, Material"></div>
        <div class="fg"><label class="fg-label">Values (one per attribute, semicolon separated)</label><input id="vm-values" class="form-input" placeholder="S,M,L; Red,Blue; Cotton,Poly"></div>
      </div>
      <div class="fg"><label class="fg-label">Generated Variants</label><div id="vm-list" style="max-height:240px;overflow:auto;border:1px solid var(--border-xs);border-radius:8px;padding:10px;background:var(--surface-alt)">` + (existing.length ? existing.map(function(v){ return '<div style="padding:8px;border-bottom:1px dashed var(--border-xs);font-weight:600">' + v.title + ' · SKU: ' + v.sku + '</div>'; }).join('') : 'No variants yet') + `</div></div>
    `,
    footer: '<button class="btn btn-secondary" onclick="closeModal()">Close</button><button class="btn btn-primary" onclick="vmGenerate()"><i class="ti ti-play"></i> Generate</button>'
  });
}

function getVariantsFromTable(){
  var tbody = document.getElementById('pe-variants-body'); if(!tbody) return [];
  var variants = [];
  tbody.querySelectorAll('tr').forEach(function(tr){
    var title = (tr.children[0] || {}).innerText || '';
    var skuInput = tr.querySelector('input[data-field="sku"]');
    var priceInput = tr.querySelector('input[data-field="price"]');
    var stockInput = tr.querySelector('input[data-field="stock"]');
    var statusSelect = tr.querySelector('select');
    if (!title || title === 'No variants defined') return;
    variants.push({
      title: title,
      sku: skuInput ? skuInput.value : (tr.children[1] ? tr.children[1].innerText : ''),
      price: priceInput ? parseFloat(priceInput.value || 0).toFixed(2) : '0.00',
      stock: stockInput ? parseInt(stockInput.value || 0, 10) : 0,
      status: statusSelect ? statusSelect.value : 'Draft'
    });
  });
  return variants;
}

function renderVariants(variants){
  var tbody = document.getElementById('pe-variants-body'); if(!tbody) return;
  tbody.innerHTML = '';
  if (!variants || !variants.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="sm c4">No variants defined</td></tr>';
    return;
  }
  variants.forEach(function(v){
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>'+v.title+'</td>' +
      '<td class="mono"><input class="form-input form-input-sm" data-field="sku" value="'+(v.sku||'')+'"></td>' +
      '<td><input class="form-input form-input-sm" type="number" step="0.01" data-field="price" value="'+(parseFloat(v.price)||0).toFixed(2)+'"></td>' +
      '<td><input class="form-input form-input-sm" type="number" data-field="stock" value="'+(v.stock||0)+'"></td>' +
      '<td><select class="form-select form-select-sm"><option'+((v.status||'Draft')==='Active'?' selected':'')+'>Active</option><option'+((v.status||'Draft')==='Draft'?' selected':'')+'>Draft</option><option'+((v.status||'Draft')==='Archived'?' selected':'')+'>Archived</option></select></td>';
    tr.querySelectorAll('input,select').forEach(function(el){ el.addEventListener('change', saveProductDraft); });
    tbody.appendChild(tr);
  });
}

function vmGenerate(){
  var attrs = (document.getElementById('vm-attrs').value||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
  var valsRaw = (document.getElementById('vm-values').value||'').split(';').map(function(s){return s.trim();}).filter(Boolean);
  if (!attrs.length || !valsRaw.length || valsRaw.length !== attrs.length) { toast('Please provide matching attribute values','warning'); return; }
  var lists = valsRaw.map(function(v){ return v.split(',').map(function(x){return x.trim();}).filter(Boolean); });
  var combos = [[]];
  lists.forEach(function(list){ var tmp=[]; combos.forEach(function(c){ list.forEach(function(val){ tmp.push(c.concat([val])); }); }); combos = tmp; });
  var variants = combos.map(function(c, idx){ return {
    title: attrs.map(function(a,i){ return a+': '+c[i]; }).join(' / '),
    sku: 'AMV-'+(1000 + idx),
    price: parseFloat(document.getElementById('pe-price').value || 0).toFixed(2),
    stock: parseInt(document.getElementById('pe-stock').value || 0, 10) || 0,
    status: 'Draft'
  }; });
  var list = document.getElementById('vm-list'); if(list){ list.innerHTML = variants.map(function(v){ return '<div style="padding:8px;border-bottom:1px dashed var(--border-xs);font-weight:600">'+v.title+' · SKU: '+v.sku+'</div>'; }).join(''); }
  renderVariants(variants);
  closeModal(); toast('Variants generated: ' + variants.length, 'success');
}

function setVariantSuggestion(value){
  document.getElementById('pe-variant-option-name').value = value;
  document.getElementById('pe-variant-option-values').focus();
}

function addVariantOption(){
  var name = (document.getElementById('pe-variant-option-name')||{value:''}).value.trim();
  var values = (document.getElementById('pe-variant-option-values')||{value:''}).value.trim();
  if (!name || !values) { toast('Enter both option name and values','warning'); return; }
  var list = document.getElementById('pe-variant-card-list'); if(!list) return;
  var item = document.createElement('div'); item.className = 'variant-card';
  item.innerHTML = '<div class="variant-card-head"><div><strong>'+name+'</strong><div class="sm c4">'+values+'</div></div><button class="btn btn-ghost btn-xs" onclick="this.closest(\'.variant-card\').remove(); updateVariantCardState();">Delete</button></div><div class="variant-card-body"><div class="sm c4">Add options like size or color to define inventory variations and pricing.</div></div><div class="variant-card-actions"><button class="btn btn-ghost btn-xs" onclick="this.closest(\'.variant-card\').classList.toggle(\'done\'); this.textContent = this.closest(\'.variant-card\').classList.contains(\'done\') ? \'Done\' : \'Done\';">Done</button></div>';
  list.appendChild(item);
  document.getElementById('pe-variant-option-name').value = '';
  document.getElementById('pe-variant-option-values').value = '';
  document.getElementById('pe-variant-option-name').focus();
  updateVariantCardState();
}

function updateVariantCardState(){
  var cards = document.querySelectorAll('#pe-variant-card-list .variant-card');
  var container = document.getElementById('pe-variant-card-list');
  if(container) container.style.display = cards.length ? '' : 'none';
}

function updateValidation(){ var title = document.getElementById('pe-title').value.trim(); document.getElementById('vc-title').textContent = title ? 'OK' : 'Missing'; var imgs = document.querySelectorAll('#pe-media-grid .media-item').length; document.getElementById('vc-image').textContent = imgs? 'OK':'Missing'; var price = document.getElementById('pe-price').value; document.getElementById('vc-price').textContent = price? 'OK':'Missing'; var variants = getVariantsFromTable().length; if(document.getElementById('vc-variants')) document.getElementById('vc-variants').textContent = variants ? 'OK' : 'None'; }

/* ─── EXPRESS, REWARDS, PARTNERS, ASSIGNMENTS, VERIFICATION, NOTIFICATIONS, CHAT, SUPPORT, SELLERS, SETTINGS ─── */
/* These pages have simpler onclick needs - just use goTo() or direct function calls */

PAGES.express = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Express Items</h1><p class="pg-sub"><span>Fast-delivery everyday essentials</span></p></div>
    <div class="pg-actions">
      <select class="form-select"><option>All Categories</option><option>Beverages</option><option>Snacks</option><option>Personal Care</option></select>
      <button class="btn btn-primary" onclick="modalAddProduct()"><i class="ti ti-plus"></i>Add Express Item</button>
    </div>
  </div>
  <div class="grid-3 mb20">
    <div class="card" style="cursor:pointer" onclick="filterTable('Beverages')"><div class="card-body"><div class="flex aic g14"><div class="stat-icon sc-teal" style="width:48px;height:48px"><i class="ti ti-cup" style="font-size:22px"></i></div><div><div class="w7 c1 mb4">Beverages</div><div class="sm c4 w5">24 items · Top: Bisleri Water 1L</div></div><span class="badge badge-teal mla">24</span></div></div></div>
    <div class="card" style="cursor:pointer" onclick="filterTable('Snacks')"><div class="card-body"><div class="flex aic g14"><div class="stat-icon sc-amber" style="width:48px;height:48px"><i class="ti ti-cookie" style="font-size:22px"></i></div><div><div class="w7 c1 mb4">Snacks</div><div class="sm c4 w5">18 items · Top: Lay's Classic</div></div><span class="badge badge-amber mla">18</span></div></div></div>
    <div class="card" style="cursor:pointer" onclick="filterTable('Personal Care')"><div class="card-body"><div class="flex aic g14"><div class="stat-icon sc-navy" style="width:48px;height:48px"><i class="ti ti-heart-rate-monitor" style="font-size:22px"></i></div><div><div class="w7 c1 mb4">Personal Care</div><div class="sm c4 w5">12 items · Top: Dettol Antiseptic</div></div><span class="badge badge-navy mla">12</span></div></div></div>
  </div>
  <div class="card" id="express-table"></div>`;

  var items = [
    {n:'Bisleri Water 1L',c:'Beverages',p:'$2.00',sz:'1 Litre',sk:500,so:1284,s:'Active'},
    {n:"Lay's Classic",c:'Snacks',p:'$3.00',sz:'Standard pack',sk:320,so:986,s:'Active'},
    {n:'Tetley Green Tea',c:'Beverages',p:'$5.00',sz:'25 bags',sk:180,so:742,s:'Active'},
    {n:'Amul Taaza Milk',c:'Beverages',p:'$2.50',sz:'500ml',sk:240,so:584,s:'Active'},
    {n:'Colgate Strong Teeth',c:'Personal Care',p:'$5.50',sz:'100g',sk:156,so:421,s:'Active'},
    {n:'Dettol Antiseptic',c:'Personal Care',p:'$6.00',sz:'250ml',sk:0,so:621,s:'Out of Stock'},
  ];
  var rows = items.map(function(e) {
    var sc = e.sk === 0 ? 'var(--danger-text)' : 'var(--t3)';
    var sw = e.sk === 0 ? '700' : '500';
    return '<tr class="tr-click">' +
      '<td class="td-p">'+e.n+'</td><td><span class="tag">'+e.c+'</span></td>' +
      '<td class="td-p w7">'+e.p+'</td><td class="td-m">'+e.sz+'</td>' +
      '<td style="color:'+sc+';font-weight:'+sw+'">'+e.sk+'</td>' +
      '<td class="td-p">'+e.so.toLocaleString()+'</td>' +
      '<td><span class="badge badge-'+(e.s==='Active'?'success':'danger')+'">'+e.s+'</span></td>' +
      '<td><div class="td-acts">' +
        '<button class="btn btn-ghost btn-sm btn-icon" data-action="edit" title="Edit"><i class="ti ti-edit"></i></button>' +
        '<button class="btn btn-danger btn-sm btn-icon" data-action="del" title="Remove"><i class="ti ti-trash"></i></button>' +
      '</div></td></tr>';
  }).join('');

  document.getElementById('express-table').innerHTML =
    '<div class="tbl-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Size</th><th>Stock</th><th>Units Sold</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';

  document.getElementById('express-table').querySelectorAll('tbody tr').forEach(function(tr, i) {
    var e = items[i];
    tr.onclick = function() { modalAddProduct({name:e.n, price:e.p.replace('$',''), stock:String(e.sk)}); };
    tr.querySelector('[data-action="edit"]').onclick = function(ev){ ev.stopPropagation(); modalAddProduct({name:e.n, price:e.p.replace('$',''), stock:String(e.sk)}); };
    tr.querySelector('[data-action="del"]').onclick  = function(ev){ ev.stopPropagation(); showConfirm({title:'Remove Item', msg:'Remove '+e.n+'?', danger:true, confirmText:'Remove'}, function(){ toast('Item removed','danger','trash'); }); };
  });
};

PAGES.rewards = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Rewards & Coupons</h1><p class="pg-sub"><span>Loyalty · Referrals · Coupons</span></p></div>
    <div class="pg-actions">
      <button class="btn btn-secondary btn-sm" onclick="modalAddCoupon()"><i class="ti ti-ticket"></i>Create Coupon</button>
      <button class="btn btn-primary btn-sm"><i class="ti ti-settings"></i>Configure Points</button>
    </div>
  </div>
  <div class="grid-2 mb20">
    <div class="card">
      <div class="card-hd"><div class="card-ttl"><i class="ti ti-star"></i>Loyalty Program Overview</div></div>
      <div class="card-body">
        <div class="grid-2 mb16" style="gap:10px">
          <div class="infobox"><div class="info-lbl">Total Points Issued</div><div style="font-size:24px;font-weight:800;color:var(--amber-600);margin-top:6px">4.82M</div></div>
          <div class="infobox"><div class="info-lbl">Total Value</div><div style="font-size:24px;font-weight:800;color:var(--teal-600);margin-top:6px">$48.2k</div></div>
          <div class="infobox"><div class="info-lbl">Points Redeemed</div><div style="font-size:18px;font-weight:700;color:var(--t1);margin-top:4px">1.24M pts</div></div>
          <div class="infobox"><div class="info-lbl">Active Loyalty Users</div><div style="font-size:18px;font-weight:700;color:var(--t1);margin-top:4px">842</div></div>
        </div>
        <div class="sec-label">Program Rules</div>
        <div class="infobox">
          <div class="flex aic jb mb10 sm"><span class="c3 w6">Per delivery completed</span><span class="c1 w8">+250 pts</span></div>
          <div class="flex aic jb mb10 sm"><span class="c3 w6">Successful referral</span><span class="c1 w8">+500 pts</span></div>
          <div class="flex aic jb sm"><span class="c3 w6">Redemption rate</span><span class="c1 w8">100 pts = $1.00</span></div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><div class="card-ttl"><i class="ti ti-ticket"></i>Active Coupons</div><button class="btn btn-primary btn-sm" onclick="modalAddCoupon()"><i class="ti ti-plus"></i>Add</button></div>
      <div class="card-body-sm" id="coupons-list"></div>
    </div>
  </div>
  <div class="card">
    <div class="card-hd"><div class="card-ttl"><i class="ti ti-history"></i>Recent Reward Activity</div><button class="btn btn-ghost btn-sm" onclick="exportData()"><i class="ti ti-download"></i>Export</button></div>
    <div class="tbl-wrap">
      <table><thead><tr><th>Sailor</th><th>Activity</th><th>Points</th><th>Reference</th><th>Date</th></tr></thead>
      <tbody id="rewards-activity"></tbody>
      </table>
    </div>
  </div>`;

  var coupons = [
    {code:'SHIP10',d:'10% off shipping',m:'Min. order $50',e:'Oct 31, 2026',u:284},
    {code:'FREESHIP',d:'20% off shipping',m:'Min. order $75',e:'Oct 30, 2026',u:142},
    {code:'REFERRAL',d:'10% off (referral)',m:'First order only',e:'Oct 30, 2026',u:97},
  ];
  var coupEl = document.getElementById('coupons-list');
  coupons.forEach(function(cp) {
    var div = document.createElement('div');
    div.className = 'ecard mb10';
    div.style.cssText = 'border-left:3px solid var(--teal-500);cursor:pointer';
    div.innerHTML = '<div class="flex aic g12"><div class="f1"><div class="flex aic g8 mb6"><span class="w8 mono cteal" style="font-size:14px">'+cp.code+'</span><span class="badge badge-success" style="font-size:10.5px">Active</span></div><div class="sm c4 w5">'+cp.d+' · '+cp.m+'</div><div class="xs c4 mt4">'+cp.u+' uses · Expires '+cp.e+'</div></div><div class="td-acts"><button class="btn btn-ghost btn-sm btn-icon" data-action="edit"><i class="ti ti-edit"></i></button><button class="btn btn-danger btn-sm btn-icon" data-action="del"><i class="ti ti-trash"></i></button></div></div>';
    div.onclick = function() { modalAddCoupon({code:cp.code, value:'10'}); };
    div.querySelector('[data-action="edit"]').onclick = function(e){ e.stopPropagation(); modalAddCoupon({code:cp.code, value:'10'}); };
    div.querySelector('[data-action="del"]').onclick  = function(e){ e.stopPropagation(); showConfirm({title:'Delete Coupon', msg:'Delete coupon '+cp.code+'?', danger:true, confirmText:'Delete'}, function(){ toast('Coupon '+cp.code+' deleted','danger','trash'); }); };
    coupEl.appendChild(div);
  });

  var activity = [
    ['Lois Becket','Order Delivered','+ 250 pts','Order #AM2458','May 20'],
    ['Lois Becket','Coupon Redeemed','− 550 pts','SHIP10','May 18'],
    ['James Wren','Referral Bonus','+ 500 pts','WhatsApp referral','May 15'],
    ['Sara Chen','Order Delivered','+ 250 pts','Order #AM2463','May 14'],
    ['Ali Mahmoud','Coupon Redeemed','− 920 pts','FREESHIP','May 12'],
  ];
  var actTbody = document.getElementById('rewards-activity');
  activity.forEach(function(row) {
    var tr = document.createElement('tr');
    var ptColor = row[2].startsWith('+') ? 'var(--success-text)' : 'var(--danger-text)';
    tr.innerHTML = '<td><div class="flex aic g8"><div class="av av-sm av-amber">'+row[0][0]+'</div><span class="td-p">'+row[0]+'</span></div></td><td class="td-m">'+row[1]+'</td><td class="w7" style="color:'+ptColor+'">'+row[2]+'</td><td class="td-m">'+row[3]+'</td><td class="td-m">'+row[4]+'</td>';
    actTbody.appendChild(tr);
  });
};

PAGES.partners = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Delivery Partners</h1><p class="pg-sub"><span>64 partners</span><span class="sep">·</span><span class="sdot on sm w6 csuccess">28 on duty</span></p></div>
    <div class="pg-actions">
      <div class="input-wrap"><i class="ti ti-search pre"></i><input type="text" class="form-input has-icon" placeholder="Search partners…" style="width:200px"></div>
      <select class="form-select"><option>All Status</option><option>On Duty</option><option>Available</option><option>Inactive</option></select>
      <button class="btn btn-primary" onclick="modalAddPartner()"><i class="ti ti-user-plus"></i>Onboard Partner</button>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-card sc-navy"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Total Partners</div><div class="stat-icon"><i class="ti ti-users"></i></div></div><div class="stat-val">64</div><div class="stat-foot"><span>Across all ports</span></div></div>
    <div class="stat-card sc-green"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">On Duty Now</div><div class="stat-icon"><i class="ti ti-circle-check"></i></div></div><div class="stat-val">28</div><div class="stat-foot"><span class="sdot on xs csuccess">All active</span></div></div>
    <div class="stat-card sc-amber"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Active Deliveries</div><div class="stat-icon"><i class="ti ti-motorbike"></i></div></div><div class="stat-val">38</div><div class="stat-foot"><span>In progress</span></div></div>
    <div class="stat-card sc-teal"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Weekly Earnings</div><div class="stat-icon"><i class="ti ti-currency-dollar"></i></div></div><div class="stat-val">$3.4k</div><div class="stat-foot"><span>Total paid out</span></div></div>
  </div>
  <div class="card" id="partners-table"></div>`;

  var partners = [
    {n:'Rahul Singh',id:'DP-00124',p:'Port of Singapore',j:'Mar 2023',s:'On Duty',c:3,w:'$84.50',t:124,r:'4.9'},
    {n:'Pita Havili',id:'DP-00087',p:'Port of Singapore',j:'Jun 2023',s:'On Duty',c:2,w:'$61.00',t:98,r:'4.7'},
    {n:'Marco Reyes',id:'DP-00201',p:'Port of Singapore',j:'Oct 2023',s:'On Duty',c:1,w:'$42.00',t:87,r:'4.8'},
    {n:'Aisha Karimi',id:'DP-00056',p:'Port of Singapore',j:'Jan 2023',s:'Available',c:0,w:'$0',t:76,r:'4.6'},
    {n:'David Lim',id:'DP-00033',p:'Jurong Port',j:'Nov 2022',s:'Inactive',c:0,w:'$0',t:52,r:'4.4'},
    {n:'Sari Wijaya',id:'DP-00145',p:'Keppel Terminal',j:'May 2023',s:'On Duty',c:2,w:'$58.00',t:67,r:'4.5'},
  ];
  var rows = partners.map(function(d) {
    var sc = d.s==='On Duty'?'teal':d.s==='Available'?'success':'neutral';
    var cc = d.c > 0 ? 'var(--teal-700)' : 'var(--t4)';
    return '<tr class="tr-click">' +
      '<td><div class="flex aic g10"><div class="av av-teal">'+d.n[0]+'</div><div class="td-p">'+d.n+'</div></div></td>' +
      '<td class="td-id">'+d.id+'</td><td class="td-m">'+d.p+'</td><td class="td-m">'+d.j+'</td>' +
      '<td><span class="badge badge-'+sc+'">'+d.s+'</span></td>' +
      '<td class="w7" style="color:'+cc+'">'+d.c+'</td>' +
      '<td class="cteal w7">'+d.w+'</td><td class="td-m">'+d.t+'</td>' +
      '<td><span class="stars">★</span><span class="w7 camber"> '+d.r+'</span></td>' +
      '<td><div class="td-acts">' +
        '<button class="btn btn-ghost btn-sm btn-icon" data-action="view"><i class="ti ti-eye"></i></button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" data-action="msg"><i class="ti ti-message"></i></button>' +
        '<button class="btn btn-ghost btn-sm btn-icon" data-action="edit"><i class="ti ti-edit"></i></button>' +
        '<button class="btn btn-danger btn-sm btn-icon" data-action="deact"><i class="ti ti-user-off"></i></button>' +
      '</div></td></tr>';
  }).join('');

  document.getElementById('partners-table').innerHTML =
    '<div class="tbl-wrap"><table><thead><tr><th>Partner</th><th>ID</th><th>Port Zone</th><th>Joined</th><th>Status</th><th>Active Orders</th><th>This Week</th><th>Total Deliveries</th><th>Rating</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';

  document.getElementById('partners-table').querySelectorAll('tbody tr').forEach(function(tr, i) {
    var d = partners[i];
    tr.onclick = function() { drawerProfile(d.n, 'partner'); };
    tr.querySelector('[data-action="view"]').onclick  = function(e){ e.stopPropagation(); drawerProfile(d.n,'partner'); };
    tr.querySelector('[data-action="msg"]').onclick   = function(e){ e.stopPropagation(); toast('Chat opened with '+d.n,'','message'); };
    tr.querySelector('[data-action="edit"]').onclick  = function(e){ e.stopPropagation(); modalAddPartner({name:d.n,id:d.id}); };
    tr.querySelector('[data-action="deact"]').onclick = function(e){ e.stopPropagation(); showConfirm({title:'Deactivate Partner',msg:'Deactivate '+d.n+'?',danger:true,confirmText:'Deactivate'},function(){toast(d.n+' deactivated','danger','user-off');}); };
  });
};

PAGES.assignments = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Order Assignments</h1><p class="pg-sub"><span>Assign, reassign and monitor active delivery operations</span></p></div>
    <div class="pg-actions"><button class="btn btn-primary btn-sm" onclick="modalAssignPartner('new')"><i class="ti ti-plus"></i>New Assignment</button></div>
  </div>
  <div class="grid-2" style="grid-template-columns:1.4fr 1fr">
    <div>
      <div class="card mb16">
        <div class="card-hd"><div class="card-ttl"><i class="ti ti-clipboard-list"></i>Active Assignments</div></div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>ENQ</th><th>Partner</th><th>Order</th><th>Shop</th><th>Deliver To</th><th>Status</th><th>ETA</th><th></th></tr></thead>
            <tbody id="assignments-body"></tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-hd"><div class="card-ttl"><i class="ti ti-route"></i>ENQ-0042 — Live Steps</div><span class="badge badge-teal">Delivering</span></div>
        <div class="card-body">
          <div class="dstep done"><div class="dstep-icon"><i class="ti ti-check"></i></div><div class="f1"><div class="sm w7 c1">Items verified at shop</div><div class="xs c4">2 available · 1 substituted · 10:04 AM</div></div><span class="badge badge-success">Done</span></div>
          <div class="dstep done"><div class="dstep-icon"><i class="ti ti-currency-dollar"></i></div><div class="f1"><div class="sm w7 c1">Payment confirmed — $70.45</div><div class="xs c4">Via payment link · 10:52 AM</div></div><span class="badge badge-success">Done</span></div>
          <div class="dstep active"><div class="dstep-icon"><i class="ti ti-package"></i></div><div class="f1"><div class="sm w7 c1">Items picked up from shop</div><div class="xs c4">Rahul Singh en route to Berth 7</div></div><span class="badge badge-warning">Active</span></div>
          <div class="dstep pending"><div class="dstep-icon"><i class="ti ti-anchor"></i></div><div class="f1"><div class="sm w7 c1">Deliver to ship</div><div class="xs c4">Handover to Ali Mahmoud · Berth 7</div></div><span class="badge badge-neutral">Pending</span></div>
          <div class="flex g8 mt16">
            <button class="btn btn-secondary btn-sm" onclick="toast('Chat opened with Rahul','','message')"><i class="ti ti-message"></i>Chat Partner</button>
            <button class="btn btn-accent btn-sm" onclick="toast('Sailor notified of ETA','success','bell')"><i class="ti ti-bell"></i>Notify Sailor</button>
          </div>
        </div>
      </div>
    </div>
    <div>
      <div class="card mb16">
        <div class="card-hd"><div class="card-ttl"><i class="ti ti-alert-circle"></i>Unassigned Orders</div><span class="badge badge-danger">2 urgent</span></div>
        <div class="card-body-sm" id="unassigned-orders"></div>
      </div>
      <div class="card">
        <div class="card-hd"><div class="card-ttl"><i class="ti ti-user-check"></i>Available Partners</div></div>
        <div class="card-body-sm">
          <div class="flex aic g10 mb14"><div class="av av-green" style="cursor:pointer" onclick="drawerProfile('Aisha Karimi','partner')">A</div><div class="f1"><div class="sm w7 c1">Aisha Karimi</div><div class="xs c4">DP-00056 · Singapore</div></div><span class="badge badge-success">Free</span><button class="btn btn-ghost btn-sm" onclick="modalAssignPartner('new')">Assign</button></div>
          <div class="flex aic g10 mb14"><div class="av av-green" style="cursor:pointer" onclick="drawerProfile('David Lim','partner')">D</div><div class="f1"><div class="sm w7 c1">David Lim</div><div class="xs c4">DP-00033 · Jurong</div></div><span class="badge badge-success">Free</span><button class="btn btn-ghost btn-sm" onclick="modalAssignPartner('new')">Assign</button></div>
          <div class="divider"></div>
          <div class="sec-label mt12">Busy (can take more)</div>
          <div class="flex aic g10"><div class="av av-teal" style="cursor:pointer" onclick="drawerProfile('Pita Havili','partner')">P</div><div class="f1"><div class="sm w7 c1">Pita Havili</div><div class="xs c4">DP-00087 · 2 active orders</div></div><span class="badge badge-warning">Busy</span><button class="btn btn-ghost btn-sm" onclick="modalAssignPartner('new')">Assign</button></div>
        </div>
      </div>
    </div>
  </div>`;

  var assignments = [
    {e:'ENQ-0042',p:'Rahul Singh',o:'#AM2461',sh:'Wegmans PSA',d:'MSC Marvela·B7',s:'Delivering',sc:'teal',t:'12:02 PM'},
    {e:'ENQ-0047',p:'Pita Havili',o:'#AM2463',sh:'EuroSpar Keppel',d:'Evergreen·Brani',s:'Verifying',sc:'warning',t:'3:00 PM'},
    {e:'ENQ-0039',p:'Marco Reyes',o:'#AM2458',sh:'Port Marine',d:'APL Vanda·B14',s:'Delivering',sc:'teal',t:'11:45 AM'},
    {e:'ENQ-0051',p:'Rahul Singh',o:'#AM2467',sh:'Wegmans PSA',d:'IMO 0123456',s:'New',sc:'info',t:'1:30 PM'},
  ];
  var abody = document.getElementById('assignments-body');
  assignments.forEach(function(a) {
    var tr = document.createElement('tr');
    tr.className = 'tr-click';
    tr.innerHTML = '<td class="td-id">'+a.e+'</td><td><div class="flex aic g6"><div class="av av-sm av-teal">'+a.p[0]+'</div><span class="sm c1 w7">'+a.p.split(' ')[0]+'</span></div></td><td class="td-id xs">'+a.o+'</td><td class="td-m">'+a.sh+'</td><td class="td-m">'+a.d+'</td><td><span class="badge badge-'+a.sc+'">'+a.s+'</span></td><td class="td-m">'+a.t+'</td><td><button class="btn btn-ghost btn-sm btn-icon" title="Reassign"><i class="ti ti-transfer"></i></button></td>';
    tr.onclick = function() { drawerOrderDetail({id:a.o,sailor:'Sailor',ship:'0123456',terminal:'Berth 7',partner:a.p,payment:'Card · Paid',coupon:'—',total:'$70.00',status:a.s,items:[{name:'Items',qty:3,price:'$70.00'}]}); };
    tr.querySelector('button').onclick = function(e){ e.stopPropagation(); modalAssignPartner(a.o); };
    abody.appendChild(tr);
  });

  var unassigned = [
    {id:'#AM2467',s:'Ravi Patel',it:'Express items ×6',p:'PSA Terminal',pr:'High'},
    {id:'#AM2469',s:'Omar Karim',it:'Water Bottle, Tablets ×2',p:'Keppel',pr:'Normal'},
  ];
  var uEl = document.getElementById('unassigned-orders');
  unassigned.forEach(function(u) {
    var div = document.createElement('div');
    div.className = 'ecard mb10';
    div.style.borderLeft = '3px solid var(--danger-icon)';
    div.innerHTML = '<div class="flex aic g10"><div class="f1"><div class="flex aic g8 mb4"><span class="w8 mono cteal">'+u.id+'</span><span class="badge badge-'+(u.pr==='High'?'danger':'info')+'" style="font-size:10.5px">'+u.pr+'</span></div><div class="sm c2 w6">'+u.s+'</div><div class="xs c4">'+u.it+' · '+u.p+'</div></div></div>';
    var btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = 'Assign';
    btn.onclick = function() { modalAssignPartner(u.id); };
    div.querySelector('.flex').appendChild(btn);
    uEl.appendChild(div);
  });
};

PAGES.verification = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Product Verifications</h1><p class="pg-sub"><span>Partner in-store checks, availability reports, substitutions</span></p></div>
  </div>
  <div class="stats-row">
    <div class="stat-card sc-navy"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">In Verification</div><div class="stat-icon"><i class="ti ti-checklist"></i></div></div><div class="stat-val">8</div><div class="stat-foot"><span>Currently active</span></div></div>
    <div class="stat-card sc-green"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Verified Today</div><div class="stat-icon"><i class="ti ti-check"></i></div></div><div class="stat-val">34</div><div class="stat-foot"><span>Reports submitted</span></div></div>
    <div class="stat-card sc-red"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Unavailable Items</div><div class="stat-icon"><i class="ti ti-x"></i></div></div><div class="stat-val">6</div><div class="stat-foot"><span>Action needed</span></div></div>
    <div class="stat-card sc-amber"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Substitutions</div><div class="stat-icon"><i class="ti ti-refresh"></i></div></div><div class="stat-val">4</div><div class="stat-foot"><span>Awaiting approval</span></div></div>
  </div>
  <div class="card mb20" id="verif-table"></div>
  <div class="card">
    <div class="card-hd">
      <div class="card-ttl"><i class="ti ti-package"></i>ENQ-0042 — Item Detail</div>
      <div class="card-acts">
        <button class="btn btn-secondary btn-sm" onclick="toast('PDF report downloaded','success','download')"><i class="ti ti-download"></i>PDF Report</button>
        <button class="btn btn-primary btn-sm" onclick="toast('Sailor notified','success','send')"><i class="ti ti-send"></i>Notify Sailor</button>
      </div>
    </div>
    <div class="card-body">
      <div class="grid-3 g16" id="verif-items"></div>
    </div>
  </div>`;

  var verifs = [
    {e:'ENQ-0042',p:'Rahul Singh',s:'Wegmans PSA',t:3,a:2,u:1,r:'Submitted',sc:'warning'},
    {e:'ENQ-0047',p:'Pita Havili',s:'EuroSpar Keppel',t:5,a:5,u:0,r:'Submitted',sc:'success'},
    {e:'ENQ-0039',p:'Marco Reyes',s:'Port Marine JNPT',t:2,a:2,u:0,r:'Submitted',sc:'success'},
    {e:'ENQ-0051',p:'Rahul Singh',s:'Wegmans PSA',t:4,a:null,u:null,r:'In Progress',sc:'info'},
  ];
  var vRows = verifs.map(function(v) {
    var uc = v.u > 0 ? 'var(--danger-text)' : 'var(--t4)';
    return '<tr class="tr-click">' +
      '<td class="td-id">'+v.e+'</td>' +
      '<td><div class="flex aic g8"><div class="av av-sm av-teal">'+v.p[0]+'</div><span class="td-p">'+v.p.split(' ')[0]+'</span></div></td>' +
      '<td class="td-m">'+v.s+'</td>' +
      '<td class="td-p w7">'+v.t+'</td>' +
      '<td class="w7 csuccess">'+(v.a!==null?v.a:'—')+'</td>' +
      '<td class="w7" style="color:'+uc+'">'+(v.u!==null?v.u:'—')+'</td>' +
      '<td><span class="badge badge-'+v.sc+'">'+v.r+'</span></td>' +
      '<td>'+(v.u>0?'<button class="btn btn-primary btn-sm" style="font-size:11.5px" data-action="sub">Suggest Substitute</button>':'<span class="xs c4 w6">No action needed</span>')+'</td>' +
    '</tr>';
  }).join('');

  document.getElementById('verif-table').innerHTML =
    '<div class="card-hd"><div class="card-ttl"><i class="ti ti-list-check"></i>Verification Reports</div></div>' +
    '<div class="tbl-wrap"><table><thead><tr><th>ENQ</th><th>Partner</th><th>Shop</th><th>Total</th><th>Available</th><th>Unavailable</th><th>Status</th><th>Action</th></tr></thead><tbody>'+vRows+'</tbody></table></div>';

  document.getElementById('verif-table').querySelectorAll('tbody tr').forEach(function(tr, i) {
    var v = verifs[i];
    tr.onclick = function() { if(v.u>0) modalSubstitute('Bombay Shaving Kit'); };
    var subBtn = tr.querySelector('[data-action="sub"]');
    if (subBtn) subBtn.onclick = function(e){ e.stopPropagation(); modalSubstitute('Bombay Shaving Kit'); };
  });

  var itemsData = [
    {n:'Nu Republic Powerpo X1 Power Bank',q:'×1',a:'—',st:'Available',sc:'success'},
    {n:'21g Protein Bar Variety Pack',q:'×2',a:'Aisle 4',st:'Available',sc:'success'},
    {n:'Bombay Shaving Company 5 Piece Kit',q:'×1',a:'Aisle 2',st:'Unavailable',sc:'danger'},
  ];
  var itemsEl = document.getElementById('verif-items');
  itemsData.forEach(function(item) {
    var bc = item.sc === 'success' ? 'var(--success-icon)' : 'var(--danger-icon)';
    var div = document.createElement('div');
    div.className = 'ecard';
    div.style.borderLeft = '3px solid ' + bc;
    div.innerHTML = '<div class="sm w7 c1 mb8">'+item.n+'</div><div class="flex aic g8 mb10"><span class="tag">'+item.q+'</span>'+(item.a!=='—'?'<span class="tag">'+item.a+'</span>':'')+'</div><div class="flex aic jb"><span class="badge badge-'+item.sc+'">'+item.st+'</span>'+(item.st==='Unavailable'?'<button class="btn btn-secondary btn-xs">Find Alt</button>':'')+'</div>';
    if (item.st === 'Unavailable') {
      div.querySelector('.btn-xs').onclick = function() { modalSubstitute(item.n); };
    }
    itemsEl.appendChild(div);
  });
};

PAGES.notifications = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Notifications</h1><p class="pg-sub"><span>Push notifications, announcements, and history</span></p></div>
    <div class="pg-actions"><button class="btn btn-primary" onclick="modalSendNotif()"><i class="ti ti-bell-plus"></i>Send Notification</button></div>
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="card-hd"><div class="card-ttl"><i class="ti ti-send"></i>Compose Notification</div></div>
      <div class="card-body">
        <div class="fg"><label class="fg-label">Target Audience</label><select class="form-select"><option>All Sailors</option><option>All Delivery Partners</option><option>Specific Sailor</option><option>Specific Partner</option><option>Port-specific Sailors</option><option>Sailors with Pending Payment</option></select></div>
        <div class="fg"><label class="fg-label">Notification Type</label><select class="form-select"><option>🔔 Payment Required</option><option>📦 Order Confirmed</option><option>🚗 Out for Delivery</option><option>🎁 Gift / Reward</option><option>⚠️ Product Update</option><option>📢 General Announcement</option><option>📋 Assignment (Partner)</option></select></div>
        <div class="fg"><label class="fg-label">Message</label><textarea class="form-input" style="height:90px" placeholder="Notification message…"></textarea><div class="fg-hint">Max 280 characters · Use {name}, {order_id} for personalisation.</div></div>
        <div class="form-row"><div class="fg"><label class="fg-label">Send Time</label><select class="form-select"><option>Send Immediately</option><option>Schedule</option></select></div><div class="fg"><label class="fg-label">Channel</label><select class="form-select"><option>Push + WhatsApp</option><option>Push Only</option><option>Email Only</option></select></div></div>
        <button class="btn btn-primary wf" onclick="toast('Notification sent successfully','success','send')"><i class="ti ti-send"></i>Send Notification</button>
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><div class="card-ttl"><i class="ti ti-history"></i>Recent Notifications</div><button class="btn btn-ghost btn-sm" onclick="toast('All marked as read','','check')">Mark all read</button></div>
      <div class="card-body-sm" id="notif-list"></div>
    </div>
  </div>`;

  var notifs = [
    {t:'Payment Required',tg:'Lois Becket',m:'Complete payment for Order #AM2458 within 48 hours.',tm:'1m ago',i:'ti-currency-dollar',bg:'var(--warning-bg)',c:'var(--warning-icon)'},
    {t:'Order Confirmed',tg:'Ali Mahmoud',m:'Titan Watch confirmed and being packed.',tm:'10m ago',i:'ti-package',bg:'var(--success-bg)',c:'var(--success-icon)'},
    {t:'Product Update',tg:'Sara Chen',m:'Shaving Kit unavailable — substitute suggested.',tm:'18m ago',i:'ti-alert-triangle',bg:'var(--danger-bg)',c:'var(--danger-icon)'},
    {t:'Assignment',tg:'Rahul Singh (DP)',m:'New ENQ-0051 assigned — deliver by 1:30 PM.',tm:'22m ago',i:'ti-motorbike',bg:'var(--info-bg)',c:'var(--info-icon)'},
    {t:'Gift Unlocked',tg:'James Wren',m:'Special gift unlocked for your next order!',tm:'38m ago',i:'ti-gift',bg:'var(--purple-bg)',c:'var(--purple-icon)'},
  ];
  var nEl = document.getElementById('notif-list');
  notifs.forEach(function(n) {
    var row = document.createElement('div');
    row.className = 'notif-item';
    row.style.cursor = 'pointer';
    row.innerHTML = '<div class="notif-icon" style="background:'+n.bg+';color:'+n.c+'"><i class="ti '+n.i+'"></i></div><div class="f1"><div class="flex aic g8 mb4"><span class="w7 c1 sm">'+n.t+'</span><span class="xs c4">→ '+n.tg+'</span></div><div class="sm c3 w5">'+n.m+'</div></div><div class="notif-time">'+n.tm+'</div>';
    row.onclick = function() { modalSendNotif({audience:n.tg, msg:n.m}); };
    nEl.appendChild(row);
  });
};

PAGES.chat = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Chat Monitor</h1><p class="pg-sub"><span>Admin ↔ Delivery Partner real-time communication</span></p></div>
  </div>
  <div style="display:grid;grid-template-columns:264px 1fr;gap:16px;height:580px">
    <div class="card" style="display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:12px;border-bottom:1px solid var(--border-xs)">
        <div class="input-wrap wf"><i class="ti ti-search pre"></i><input type="text" class="form-input has-icon wf" placeholder="Search partners…" style="height:34px"></div>
      </div>
      <div style="flex:1;overflow-y:auto" id="chat-threads"></div>
    </div>
    <div class="card" style="display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:15px 18px;border-bottom:1px solid var(--border-xs);display:flex;align-items:center;gap:12px">
        <div class="av av-teal">R</div>
        <div style="flex:1"><div class="w7 c1">Rahul Singh</div><div class="sdot on xs csuccess">On duty · ENQ-0042 delivering</div></div>
        <span class="badge badge-teal">DP-00124</span>
        <button class="btn btn-ghost btn-sm" onclick="toast('Chat archived','','archive')"><i class="ti ti-archive"></i></button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="drawerProfile('Rahul Singh','partner')"><i class="ti ti-user"></i></button>
      </div>
      <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px"></div>
      <div style="padding:13px;border-top:1px solid var(--border-xs);display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm btn-icon" onclick="toast('Attachment sent','success','paperclip')" title="Attach file"><i class="ti ti-paperclip"></i></button>
        <input type="text" id="chat-input" class="form-input" style="flex:1;height:40px" placeholder="Type a message…">
        <button class="btn btn-primary btn-icon" style="height:40px;width:40px" onclick="sendChatMsg()"><i class="ti ti-send"></i></button>
      </div>
    </div>
  </div>`;

  var threads = [
    {n:'Rahul Singh',id:'DP-00124',l:'All 3 items collected. Heading now',tm:'2m',on:true,un:0,sel:true},
    {n:'Pita Havili',id:'DP-00087',l:'All items confirmed at shop',tm:'8m',on:true,un:2,sel:false},
    {n:'Marco Reyes',id:'DP-00201',l:'Heading to Berth 14-B now',tm:'15m',on:true,un:0,sel:false},
    {n:'Aisha Karimi',id:'DP-00056',l:'Available for next assignment',tm:'1h',on:false,un:0,sel:false},
  ];
  var threadsEl = document.getElementById('chat-threads');
  threads.forEach(function(ch) {
    var div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border-xs);cursor:pointer;background:'+(ch.sel?'var(--navy-25)':'transparent');
    div.innerHTML = '<div style="position:relative"><div class="av av-teal">'+ch.n[0]+'</div>'+(ch.on?'<div style="position:absolute;bottom:-1px;right:-1px;width:8px;height:8px;background:var(--green-icon);border-radius:50%;border:2px solid var(--surface)"></div>':'')+'</div><div style="flex:1;min-width:0"><div class="sm w7 c1">'+ch.n+'</div><div class="xs c4 w5 trunc">'+ch.l+'</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="xs c4 w6">'+ch.tm+'</span>'+(ch.un>0?'<span class="badge badge-danger" style="padding:1px 5px;font-size:10px">'+ch.un+'</span>':'')+'</div>';
    div.onclick = function() {
      threadsEl.querySelectorAll('div[style*="padding:12px"]').forEach(function(d){ d.style.background='transparent'; });
      div.style.background = 'var(--navy-25)';
    };
    threadsEl.appendChild(div);
  });

  var messages = [
    {f:'admin',t:'Green signal is live for order #ORD-0047. 3 items from Port Marine Supplies, JNPT Gate 3. Deliver to Berth 14-B.'},
    {f:'partner',t:'Confirmed. Leaving for the store now.'},
    {f:'admin',t:'Note: Item 3 is a hydraulic hose, JIC fittings. Verify spec before accepting — do NOT substitute without checking.'},
    {f:'partner',t:'At the store. Rope and nav lights collected. Checking the hose with staff now.'},
    {f:'partner',t:'They have BSP fittings only, not JIC. Take it or wait for back stock?'},
    {f:'admin',t:'Wait for back stock. 10 minutes — if nothing, I will call the store directly.'},
    {f:'partner',t:'Found 2 in the back — JIC, correct spec. All 3 items collected. Heading to Berth 14-B.'},
    {f:'admin',t:'Perfect. Mark collected in the app. Ping me once at the berth.'},
  ];
  var msgsEl = document.getElementById('chat-messages');
  messages.forEach(function(m) {
    var div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;align-items:'+(m.f==='admin'?'flex-end':'flex-start');
    div.innerHTML = '<div class="chat-bubble '+(m.f==='admin'?'sent':'recv')+'">'+m.t+'</div>';
    msgsEl.appendChild(div);
  });
  msgsEl.scrollTop = msgsEl.scrollHeight;
};

PAGES.support = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Support & Activity</h1><p class="pg-sub"><span>Tickets · delivery issues · activity logs</span></p></div>
    <div class="pg-actions"><button class="btn btn-primary btn-sm" onclick="modalTicket()"><i class="ti ti-plus"></i>New Ticket</button></div>
  </div>
  <div class="stats-row">
    <div class="stat-card sc-red"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Open Tickets</div><div class="stat-icon"><i class="ti ti-lifebuoy"></i></div></div><div class="stat-val">18</div><div class="stat-foot"><span>4 urgent</span></div></div>
    <div class="stat-card sc-amber"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Avg Response</div><div class="stat-icon"><i class="ti ti-clock"></i></div></div><div class="stat-val">2.4h</div><div class="stat-foot"><span>SLA: 4 hours</span></div></div>
    <div class="stat-card sc-green"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Resolved (Week)</div><div class="stat-icon"><i class="ti ti-check"></i></div></div><div class="stat-val">47</div><div class="stat-foot"><span>94% satisfaction</span></div></div>
    <div class="stat-card sc-navy"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Activity Logs Today</div><div class="stat-icon"><i class="ti ti-list-details"></i></div></div><div class="stat-val">1,284</div><div class="stat-foot"><span>All systems normal</span></div></div>
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="card-hd"><div class="card-ttl"><i class="ti ti-lifebuoy"></i>Open Tickets</div><button class="btn btn-primary btn-sm" onclick="modalTicket()"><i class="ti ti-plus"></i>New</button></div>
      <div class="tbl-wrap">
        <table><thead><tr><th>Ticket</th><th>From</th><th>Issue</th><th>Priority</th><th>Action</th></tr></thead><tbody id="tickets-body"></tbody></table>
      </div>
    </div>
    <div class="card" style="display:flex;flex-direction:column">
      <div class="card-hd"><div class="card-ttl"><i class="ti ti-activity"></i>Live Activity Log</div><span class="sdot on sm w6 csuccess">Live</span></div>
      <div style="flex:1;overflow-y:auto;padding:8px 18px 16px;max-height:420px" id="activity-log"></div>
    </div>
  </div>`;

  var tickets = [
    {id:'#SUP-084',f:'Lois Becket (Sailor)',i:'Missing item in delivered order',p:'Urgent',sc:'danger'},
    {id:'#SUP-083',f:'Rahul Singh (Partner)',i:'App not updating order status',p:'High',sc:'warning'},
    {id:'#SUP-082',f:'Ali Mahmoud (Sailor)',i:'Payment deducted, order not confirmed',p:'Urgent',sc:'danger'},
    {id:'#SUP-081',f:'Sara Chen (Sailor)',i:'Coupon SHIP10 not applied',p:'Low',sc:'info'},
    {id:'#SUP-080',f:'Pita Havili (Partner)',i:'Cannot mark item as picked up',p:'High',sc:'warning'},
  ];
  var tbody = document.getElementById('tickets-body');
  tickets.forEach(function(t) {
    var tr = document.createElement('tr');
    tr.className = 'tr-click';
    tr.innerHTML = '<td class="td-id">'+t.id+'</td><td class="sm c3 w6">'+t.f+'</td><td class="sm c3 w5">'+t.i+'</td><td><span class="badge badge-'+t.sc+'">'+t.p+'</span></td><td><button class="btn btn-ghost btn-xs">Open</button></td>';
    tr.onclick = function() { modalTicket({id:t.id,from:t.f,issue:t.i,priority:t.p,type:'Sailor'}); };
    tr.querySelector('button').onclick = function(e){ e.stopPropagation(); modalTicket({id:t.id,from:t.f,issue:t.i,priority:t.p,type:'Sailor'}); };
    tbody.appendChild(tr);
  });

  var logs = [
    {a:'Order #AM2468 placed',u:'Maria Santos',tm:'14:32:01',c:'var(--teal-500)'},
    {a:'ENQ-0042 marked delivered',u:'Rahul Singh (DP)',tm:'14:30:12',c:'var(--green-icon)'},
    {a:'Payment $84 processed',u:'Lois Becket',tm:'14:28:45',c:'var(--green-icon)'},
    {a:'Coupon SHIP10 redeemed',u:'Ali Mahmoud',tm:'14:25:10',c:'var(--amber-400)'},
    {a:'Intent #INT-0051 submitted',u:'Ravi Patel',tm:'14:20:03',c:'var(--info-icon)'},
    {a:'DP-00124 went on duty',u:'Rahul Singh',tm:'14:10:22',c:'var(--teal-500)'},
    {a:'Product Aquaminder flagged OOS',u:'System',tm:'14:02:11',c:'var(--danger-icon)'},
    {a:'Order #AM2451 cancelled',u:'Maria Santos',tm:'13:55:34',c:'var(--danger-icon)'},
    {a:'Seller application received',u:'Blue Ocean Supplies',tm:'13:45:00',c:'var(--purple-icon)'},
    {a:'Intent verified — ENQ-0047',u:'Admin',tm:'13:40:11',c:'var(--teal-500)'},
  ];
  var logEl = document.getElementById('activity-log');
  logs.forEach(function(l) {
    var div = document.createElement('div');
    div.className = 'feed-row';
    div.innerHTML = '<div class="feed-dot" style="background:'+l.c+'"></div><div class="f1"><div class="feed-txt">'+l.a+'</div><div class="feed-sub">'+l.u+'</div></div><div class="feed-time">'+l.tm+'</div>';
    logEl.appendChild(div);
  });
};

PAGES.sellers = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Seller Applications</h1><p class="pg-sub"><span>Review and manage seller applications from sailors</span></p></div>
  </div>
  <div class="stats-row">
    <div class="stat-card sc-amber"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Pending</div><div class="stat-icon"><i class="ti ti-clock"></i></div></div><div class="stat-val">4</div><div class="stat-foot"><span>Awaiting review</span></div></div>
    <div class="stat-card sc-green"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Approved (Month)</div><div class="stat-icon"><i class="ti ti-check"></i></div></div><div class="stat-val">12</div><div class="stat-foot"><span>Now active</span></div></div>
    <div class="stat-card sc-red"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Rejected</div><div class="stat-icon"><i class="ti ti-x"></i></div></div><div class="stat-val">3</div><div class="stat-foot"><span>This month</span></div></div>
    <div class="stat-card sc-navy"><div class="stat-stripe"></div><div class="stat-top"><div class="stat-lbl">Active Sellers</div><div class="stat-icon"><i class="ti ti-building-store"></i></div></div><div class="stat-val">48</div><div class="stat-foot"><span>On platform</span></div></div>
  </div>
  <div class="card" id="sellers-table"></div>`;

  var sellers = [
    {n:'James Wren',e:'jwren@shipco.net',b:'Marine Supplies Co.',p:'Marine equipment, safety gear',d:'Uploaded',dt:'Apr 22',s:'Pending',sc:'warning'},
    {n:'Sara Chen',e:'sara.c@marine.io',b:'Blue Ocean Supplies',p:'Electronics, accessories',d:'Uploaded',dt:'Apr 20',s:'Reviewing',sc:'info'},
    {n:'Omar Karim',e:'omar@porttrader.com',b:'Port Trader Ltd.',p:'Beverages, snacks',d:'Missing',dt:'Apr 18',s:'Pending',sc:'warning'},
    {n:'Maria Santos',e:'msantos@seafarer.ph',b:'—',p:'Fashion, accessories',d:'Uploaded',dt:'Apr 15',s:'Approved',sc:'success'},
  ];
  var rows = sellers.map(function(s) {
    return '<tr class="tr-click">' +
      '<td><div class="flex aic g10"><div class="av av-purple">'+s.n[0]+'</div><span class="td-p">'+s.n+'</span></div></td>' +
      '<td class="td-m">'+s.e+'</td>' +
      '<td class="w7 c1">'+s.b+'</td>' +
      '<td class="td-m" style="max-width:150px"><span class="trunc" style="display:block">'+s.p+'</span></td>' +
      '<td><span class="badge badge-'+(s.d==='Uploaded'?'success':'danger')+'">'+s.d+'</span></td>' +
      '<td class="td-m">'+s.dt+'</td>' +
      '<td><span class="badge badge-'+s.sc+'">'+s.s+'</span></td>' +
      '<td><div class="td-acts">' +
        '<button class="btn btn-success btn-sm" data-action="approve"><i class="ti ti-check"></i>Approve</button>' +
        '<button class="btn btn-danger btn-sm" data-action="reject"><i class="ti ti-x"></i>Reject</button>' +
      '</div></td></tr>';
  }).join('');

  document.getElementById('sellers-table').innerHTML =
    '<div class="tbl-wrap"><table><thead><tr><th>Applicant</th><th>Email</th><th>Business</th><th>Products</th><th>Documents</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table></div>';

  document.getElementById('sellers-table').querySelectorAll('tbody tr').forEach(function(tr, i) {
    var s = sellers[i];
    tr.onclick = function() { modalSellerReview({n:s.n,b:s.b,p:s.p}, false); };
    tr.querySelector('[data-action="approve"]').onclick = function(e){ e.stopPropagation(); modalSellerReview({n:s.n,b:s.b,p:s.p}, true); };
    tr.querySelector('[data-action="reject"]').onclick  = function(e){ e.stopPropagation(); modalSellerReview({n:s.n,b:s.b,p:s.p}, false); };
  });
};

PAGES.settings = function(c) {
  c.innerHTML = `
  <div class="pg-header">
    <div class="pg-header-l"><h1 class="pg-title">Settings</h1><p class="pg-sub"><span>Platform configuration, admin accounts, preferences</span></p></div>
    <div class="pg-actions"><button class="btn btn-primary" onclick="saveSettings()"><i class="ti ti-device-floppy"></i>Save Changes</button></div>
  </div>
  <div class="grid-2">
    <div class="card">
      <div class="card-hd"><div class="card-ttl"><i class="ti ti-settings"></i>Platform Configuration</div></div>
      <div class="card-body">
        <div class="fg"><label class="fg-label">Order cancellation window</label><input class="form-input" value="36 hours after ship arrival"></div>
        <div class="fg"><label class="fg-label">Payment confirmation timeout</label><input class="form-input" value="48 hours"></div>
        <div class="fg"><label class="fg-label">Loyalty points per delivery</label><input class="form-input" value="250"></div>
        <div class="fg"><label class="fg-label">Referral bonus points</label><input class="form-input" value="500"></div>
        <div class="fg"><label class="fg-label">Points to $ conversion rate</label><input class="form-input" value="100 pts = $1.00"></div>
        <div class="fg"><label class="fg-label">Max special request description</label><input class="form-input" value="500 characters"></div>
        <div class="divider"></div>
        <div class="fg"><label class="switch"><input type="checkbox" checked><div class="switch-track"></div><span class="switch-label">Enable Express Delivery</span></label></div>
        <div class="fg"><label class="switch"><input type="checkbox" checked><div class="switch-track"></div><span class="switch-label">Auto-assign partner to new orders</span></label></div>
        <div class="fg mb0"><label class="switch"><input type="checkbox"><div class="switch-track"></div><span class="switch-label">Maintenance mode</span></label></div>
      </div>
    </div>
    <div>
      <div class="card mb16">
        <div class="card-hd"><div class="card-ttl"><i class="ti ti-users"></i>Admin Accounts</div><button class="btn btn-ghost btn-sm" id="add-admin-btn"><i class="ti ti-plus"></i>Add Admin</button></div>
        <div class="card-body-sm" id="admin-accounts"></div>
      </div>
      <div class="card">
        <div class="card-hd"><div class="card-ttl"><i class="ti ti-help-circle"></i>Help & FAQ Management</div><button class="btn btn-ghost btn-sm" id="add-faq-btn"><i class="ti ti-plus"></i>Add FAQ</button></div>
        <div class="card-body-sm" id="faq-list"></div>
      </div>
    </div>
  </div>`;

  /* Wire settings buttons using JS */
  document.getElementById('add-admin-btn').onclick = function() {
    showModal({title:'Add Admin Account',icon:'user-plus',body:'<div class="fg"><label class="fg-label">Full Name</label><input class="form-input" placeholder="Admin name"></div><div class="fg"><label class="fg-label">Email</label><input class="form-input" type="email" placeholder="admin@anchormart.io"></div><div class="fg"><label class="fg-label">Role</label><select class="form-select"><option>Super Admin</option><option>Operations</option><option>Support</option></select></div>',
      footer:'<button class="btn btn-primary" onclick="closeModal();toast(\'Admin invited\',\'success\',\'send\')"><i class="ti ti-send"></i>Send Invite</button>'});
  };
  document.getElementById('add-faq-btn').onclick = function() {
    showModal({title:'Add FAQ Item',icon:'help-circle',body:'<div class="fg"><label class="fg-label">Question</label><input class="form-input" placeholder="FAQ question"></div><div class="fg"><label class="fg-label">Answer</label><textarea class="form-input" style="height:90px" placeholder="FAQ answer…"></textarea></div>',
      footer:'<button class="btn btn-primary" onclick="closeModal();toast(\'FAQ added\',\'success\',\'plus\')"><i class="ti ti-plus"></i>Add FAQ</button>'});
  };

  var admins = [{n:'Super Admin',r:'Super Admin',e:'admin@anchormart.io'},{n:'Ops Manager',r:'Operations',e:'ops@anchormart.io'},{n:'Support Agent',r:'Support',e:'support@anchormart.io'}];
  var aEl = document.getElementById('admin-accounts');
  admins.forEach(function(a) {
    var div = document.createElement('div');
    div.className = 'flex aic g10 mb12 ecard';
    div.innerHTML = '<div class="av av-navy">'+a.n[0]+'</div><div class="f1 mw0"><div class="sm w7 c1">'+a.n+'</div><div class="xs c4">'+a.r+' · '+a.e+'</div></div><span class="badge badge-success">Active</span><button class="btn btn-ghost btn-sm btn-icon" title="Edit"><i class="ti ti-edit"></i></button><button class="btn btn-danger btn-sm btn-icon" title="Remove"><i class="ti ti-trash"></i></button>';
    div.querySelector('.btn-ghost').onclick = function() { toast('Edit admin opened', '', 'edit'); };
    div.querySelector('.btn-danger').onclick = function() { showConfirm({title:'Remove Admin',msg:'Remove '+a.n+'?',danger:true,confirmText:'Remove'},function(){toast('Admin removed','danger','trash');}); };
    aEl.appendChild(div);
  });

  var faqs = ['How does ship delivery work?','Can I change my location after ordering?','How do I track my order?','Which payment methods are accepted?','How do I apply a coupon?','Is support available offshore?'];
  var fEl = document.getElementById('faq-list');
  faqs.forEach(function(q, i) {
    var div = document.createElement('div');
    div.className = 'flex aic g10 ecard mb6';
    div.style.padding = '9px 12px';
    div.innerHTML = '<span class="xs c4 w8" style="width:18px">'+(i+1)+'</span><span class="sm c2 w6 f1">'+q+'</span><button class="btn btn-ghost btn-xs btn-icon" title="Edit"><i class="ti ti-edit"></i></button><button class="btn btn-danger btn-xs btn-icon" title="Remove"><i class="ti ti-trash"></i></button>';
    div.querySelector('.btn-ghost').onclick = function() { toast('FAQ editor opened','','edit'); };
    div.querySelector('.btn-danger').onclick = function() { showConfirm({title:'Remove FAQ',msg:'Remove this FAQ item?',danger:true,confirmText:'Remove'},function(){toast('FAQ removed','danger','trash');}); };
    fEl.appendChild(div);
  });
};

/* ── INIT ── */
/* navigate() is called from launchApp() after login transition */

