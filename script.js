// ---------- User Management ----------
    let currentUser = null;
    
    // User storage keys
    const USER_KEYS = {
      users: 'sm_users',
      currentUser: 'sm_current_user'
    };

    // Get user-specific storage key
    const getUserKey = (userId, key) => `sm_${userId}_${key}`;

    // User management functions
    function saveUser(user) {
      const users = JSON.parse(localStorage.getItem(USER_KEYS.users) || '{}');
      users[user.id] = user;
      localStorage.setItem(USER_KEYS.users, JSON.stringify(users));
      localStorage.setItem(USER_KEYS.currentUser, user.id);
      currentUser = user;
    }

    function getUsers() {
      return JSON.parse(localStorage.getItem(USER_KEYS.users) || '{}');
    }

    function getCurrentUser() {
      const userId = localStorage.getItem(USER_KEYS.currentUser);
      if (!userId) return null;
      const users = getUsers();
      return users[userId] || null;
    }

    function loginUser(name, email) {
      const userId = btoa(email).replace(/[^a-zA-Z0-9]/g, '');
      const user = {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        createdAt: new Date().toISOString()
      };
      
      saveUser(user);
      loadUserData();
      showApp();
    }

    function logoutUser() {
      localStorage.removeItem(USER_KEYS.currentUser);
      currentUser = null;
      showLogin();
      resetAppState();
    }

    function showApp() {
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('app').classList.add('active');
      document.getElementById('welcomeUser').textContent = currentUser.name;
    }

    function showLogin() {
      document.getElementById('loginContainer').style.display = 'flex';
      document.getElementById('app').classList.remove('active');
      showLoginForm();
    }

    function showLoginForm() {
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('usersList').style.display = 'none';
      document.getElementById('userName').value = '';
      document.getElementById('userEmail').value = '';
    }

    function showUsersList() {
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('usersList').style.display = 'block';
      
      const users = getUsers();
      const container = document.getElementById('usersContainer');
      container.innerHTML = '';
      
      Object.values(users).forEach(user => {
        const userBtn = document.createElement('button');
        userBtn.className = 'login-btn';
        userBtn.style.marginBottom = '8px';
        userBtn.innerHTML = `
          <div style="text-align:left;">
            <div style="font-weight:600;">${escapeHtml(user.name)}</div>
            <div style="font-size:14px;opacity:0.7;">${escapeHtml(user.email)}</div>
          </div>
        `;
        userBtn.onclick = () => {
          currentUser = user;
          localStorage.setItem(USER_KEYS.currentUser, user.id);
          loadUserData();
          showApp();
        };
        container.appendChild(userBtn);
      });
    }

    // ---------- Storage Helpers (User-specific) ----------
    const readLS = (k, d) => { 
      if (!currentUser) return d;
      try { 
        return JSON.parse(localStorage.getItem(getUserKey(currentUser.id, k))) ?? d; 
      } catch { 
        return d; 
      } 
    };
    const writeLS = (k, v) => {
      if (!currentUser) return;
      localStorage.setItem(getUserKey(currentUser.id, k), JSON.stringify(v));
    };

    // ---------- App State ----------
    let expenses = [];
    let budget = { period:'Monthly', amount:0 };
    let baseCurrency = 'INR';
    let rates = {};

    function loadUserData() {
      if (!currentUser) return;
      
      expenses = readLS('expenses', []);
      budget = readLS('budget', { period:'Monthly', amount:0 });
      baseCurrency = readLS('base', 'INR');
      rates = readLS('rates', defaultRatesFor(baseCurrency));
      
      updateUI();
    }

    function resetAppState() {
      expenses = [];
      budget = { period:'Monthly', amount:0 };
      baseCurrency = 'INR';
      rates = defaultRatesFor(baseCurrency);
    }

    function updateUI() {
      // Update currency labels
      baseCurrencyEl.value = baseCurrency;
      baseCurrencyLabel.textContent = baseCurrency;
      baseCurrencyBadge.textContent = baseCurrency;
      amountCurLabel.textContent = baseCurrency;
      
      // Update budget
      budgetPeriodEl.value = budget.period;
      budgetAmountEl.value = budget.amount || '';
      budgetDisplayEl.textContent = fmt(budget.amount);
      
      updateRateBadges();
      renderExpenses();
      refreshOverview();
    }

    function defaultRatesFor(base){
      const presets = {
        INR:{ USD:0.012, EUR:0.011, GBP:0.0095, JPY:1.7, INR:1 },
        USD:{ INR:84, EUR:0.92, GBP:0.78, JPY:157, USD:1 },
        EUR:{ INR:91, USD:1.09, GBP:0.85, JPY:170, EUR:1 },
        GBP:{ INR:107, USD:1.28, EUR:1.18, JPY:200, GBP:1 },
        JPY:{ INR:0.55, USD:0.0064, EUR:0.0059, GBP:0.005, JPY:1 },
      };
      return presets[base] || presets.INR;
    }

    // ---------- Login Event Handlers ----------
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('userName').value.trim();
      const email = document.getElementById('userEmail').value.trim();
      
      if (!name || !email) {
        alert('Please fill in all fields');
        return;
      }
      
      if (!email.includes('@')) {
        alert('Please enter a valid email address');
        return;
      }
      
      loginUser(name, email);
    });

    document.getElementById('switchUser').addEventListener('click', () => {
      const users = getUsers();
      if (Object.keys(users).length === 0) {
        alert('No existing users found');
        return;
      }
      showUsersList();
    });

    document.getElementById('newUserBtn').addEventListener('click', () => {
      showLoginForm();
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        logoutUser();
      }
    });

    // ---------- UI Elements ----------
    const tabs = [
      { id:'overview', label:'Overview' },
      { id:'expenses', label:'Expenses' },
      { id:'converter', label:'Converter' },
    ];
    const tabsEl = document.getElementById('tabs');
    tabs.forEach(t=>{
      const b=document.createElement('button');
      b.textContent=t.label; b.dataset.target=t.id; b.onclick=()=>switchTab(t.id);
      if(t.id==='overview') b.classList.add('active');
      tabsEl.appendChild(b);
    });

    function switchTab(id){
      document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      tabsEl.querySelectorAll('button').forEach(b=>b.classList.toggle('active', b.dataset.target===id));
    }

    // ---------- Budget ----------
    const budgetPeriodEl = document.getElementById('budgetPeriod');
    const budgetAmountEl = document.getElementById('budgetAmount');
    const saveBudgetBtn = document.getElementById('saveBudget');
    const resetBudgetBtn = document.getElementById('resetBudget');
    const spentAmountEl = document.getElementById('spentAmount');
    const budgetDisplayEl = document.getElementById('budgetDisplay');
    const budgetProgressEl = document.getElementById('budgetProgress');

    saveBudgetBtn.onclick = ()=>{
      budget.period = budgetPeriodEl.value;
      budget.amount = Number(budgetAmountEl.value||0);
      writeLS('budget', budget);
      budgetDisplayEl.textContent = fmt(budget.amount);
      refreshOverview();
    }
    resetBudgetBtn.onclick = ()=>{
      budget = { period:'Monthly', amount:0 };
      writeLS('budget', budget);
      budgetPeriodEl.value = budget.period; budgetAmountEl.value=''; budgetDisplayEl.textContent='0';
      refreshOverview();
    }

    // ---------- Currency & Rates ----------
    const baseCurrencyEl = document.getElementById('baseCurrency');
    const baseCurrencyLabel = document.getElementById('baseCurrencyLabel');
    const baseCurrencyBadge = document.getElementById('baseCurrencyBadge');
    const amountCurLabel = document.getElementById('amountCurLabel');
    const rate1 = document.getElementById('rate1');
    const rate2 = document.getElementById('rate2');
    const rate3 = document.getElementById('rate3');
    const resetRatesBtn = document.getElementById('resetRates');
    const importRatesBtn = document.getElementById('importRates');
    const ratesJSON = document.getElementById('ratesJSON');
    const exportDataBtn = document.getElementById('exportData');
    const importDataFile = document.getElementById('importDataFile');

    baseCurrencyEl.onchange = ()=>{
      baseCurrency = baseCurrencyEl.value;
      writeLS('base', baseCurrency);
      rates = defaultRatesFor(baseCurrency);
      writeLS('rates', rates);
      baseCurrencyLabel.textContent = baseCurrency;
      baseCurrencyBadge.textContent = baseCurrency;
      amountCurLabel.textContent = baseCurrency;
      updateRateBadges();
      renderExpenses();
      refreshOverview();
    }

    function updateRateBadges(){
      const keys = Object.keys(rates).filter(k=>k!==baseCurrency).slice(0,3);
      rate1.textContent = keys[0]? `${keys[0]}: ${rates[keys[0]]}`:'—';
      rate2.textContent = keys[1]? `${keys[1]}: ${rates[keys[1]]}`:'—';
      rate3.textContent = keys[2]? `${keys[2]}: ${rates[keys[2]]}`:'—';
    }

    resetRatesBtn.onclick = ()=>{
      rates = defaultRatesFor(baseCurrency);
      writeLS('rates', rates);
      updateRateBadges();
    }
    importRatesBtn.onclick = ()=>{
      try{
        const obj = JSON.parse(ratesJSON.value||'{}');
        rates = { ...obj, [baseCurrency]:1 };
        writeLS('rates', rates);
        updateRateBadges();
      }catch(e){ alert('Invalid JSON'); }
    }

    exportDataBtn.onclick = ()=>{
      const data = {expenses,budget,baseCurrency,rates};
      const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href=url; 
      a.download=`smartmoney-${currentUser.name.replace(/[^a-zA-Z0-9]/g, '')}-data.json`; 
      a.click(); 
      URL.revokeObjectURL(url);
    }
    
    importDataFile.onchange = e=>{
      const file = e.target.files?.[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        try{
          const obj = JSON.parse(reader.result);
          expenses = obj.expenses||[]; 
          budget=obj.budget||budget; 
          baseCurrency=obj.baseCurrency||baseCurrency;
          rates=obj.rates||rates; 
          writeLS('expenses',expenses); 
          writeLS('budget',budget); 
          writeLS('base',baseCurrency); 
          writeLS('rates',rates);
          updateUI();
        }catch{ alert('Invalid data file'); }
      }
      reader.readAsText(file);
    }

    // ---------- Expenses ----------
    const expDate = document.getElementById('expDate');
    const expDesc = document.getElementById('expDesc');
    const expCat = document.getElementById('expCat');
    const expAmt = document.getElementById('expAmt');
    const expCurrency = document.getElementById('expCurrency');
    const addExpenseBtn = document.getElementById('addExpense');
    const searchEl = document.getElementById('search');
    const expTable = document.getElementById('expTable');
    const clearAllBtn = document.getElementById('clearAll');

    // default date today
    expDate.valueAsDate = new Date();

    addExpenseBtn.onclick = ()=>{
      const d = expDate.value; const desc = (expDesc.value||'').trim(); const cat = expCat.value;
      const amt = Number(expAmt.value||0); const cur = expCurrency.value;
      if(!d || !desc || !amt){ alert('Please fill date, description, and amount'); return; }
      expenses.push({ id: crypto.randomUUID(), date:d, desc, cat, amt, cur });
      writeLS('expenses', expenses);
      expDesc.value=''; expAmt.value='';
      renderExpenses(); refreshOverview();
    }

    function renderExpenses(){
      const q = (searchEl.value||'').toLowerCase();
      const rows = expenses.filter(e=>{
        return !q || e.desc.toLowerCase().includes(q) || e.cat.toLowerCase().includes(q);
      }).sort((a,b)=> b.date.localeCompare(a.date));

      expTable.innerHTML = rows.map(e=>{
        return `<tr>
          <td>${e.date}</td>
          <td>${escapeHtml(e.desc)}</td>
          <td><span class="badge">${e.cat}</span></td>
          <td class="right">${fmt(e.amt)}</td>
          <td>${e.cur}</td>
          <td class="right">
            <button onclick="editExpense('${e.id}')">✏ Edit</button>
            <button class="danger" onclick="delExpense('${e.id}')">🗑 Delete</button>
          </td>
        </tr>`
      }).join('');
    }

    window.editExpense = (id)=>{
      const e = expenses.find(x=>x.id===id); if(!e) return;
      const desc = prompt('Description:', e.desc); if(desc===null) return;
      const amt = Number(prompt('Amount:', e.amt)); if(!amt) return;
      const cat = prompt('Category (Food/Travel/Shopping/Bills/Entertainment/Other):', e.cat) || e.cat;
      const cur = prompt('Currency (INR/USD/EUR/GBP/JPY):', e.cur) || e.cur;
      Object.assign(e,{desc,amt,cat,cur}); writeLS('expenses',expenses); renderExpenses(); refreshOverview();
    }

    window.delExpense = (id)=>{
      if(!confirm('Delete this expense?')) return;
      expenses = expenses.filter(x=>x.id!==id); writeLS('expenses',expenses); renderExpenses(); refreshOverview();
    }

    clearAllBtn.onclick = ()=>{
      if(!confirm('This will remove ALL expenses. Continue?')) return;
      expenses = []; writeLS('expenses', expenses); renderExpenses(); refreshOverview();
    }

    searchEl.oninput = renderExpenses;

    // ---------- Charts & Overview Calculations ----------
    let pieChart, barChart;

    function refreshOverview(){
      if (!currentUser) return;
      
      const now = new Date();
      let start = new Date(now);
      if(budget.period==='Monthly'){ start = new Date(now.getFullYear(), now.getMonth(), 1); }
      else { 
        const day = (now.getDay()+6)%7;
        start = new Date(now); start.setDate(now.getDate()-day);
        start.setHours(0,0,0,0);
      }

      const periodExps = expenses.filter(e=> new Date(e.date) >= start);
      const spentBase = periodExps.reduce((sum,e)=> sum + toBase(e.amt, e.cur), 0);
      spentAmountEl.textContent = fmt(spentBase);

      const pct = budget.amount>0 ? Math.min(100, Math.round(spentBase*100 / budget.amount)) : 0;
      budgetProgressEl.style.width = pct + '%';
      budgetProgressEl.className = pct<70? 'ok' : pct<100? 'warn' : 'dangerbar';

      // Pie by category (current period)
      const byCat = {};
      for(const e of periodExps){ byCat[e.cat] = (byCat[e.cat]||0) + toBase(e.amt,e.cur); }
      const labels = Object.keys(byCat);
      const data = labels.map(k=> round2(byCat[k]));
      if(pieChart) pieChart.destroy();
      if(labels.length > 0) {
        pieChart = new Chart(document.getElementById('pieChart'), {
          type:'pie', data:{ labels, datasets:[{ data }] }, options:{ plugins:{ legend:{ labels:{ color:'#cbd5e1' } } } }
        });
      }

      // Bar: last 6 months in base
      const monthLabels=[], monthData=[];
      for(let i=5;i>=0;i--){
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        const key = d.toLocaleString(undefined,{ month:'short', year:'2-digit' });
        monthLabels.push(key);
        const sum = expenses.filter(e=>{
          const dt = new Date(e.date);
          return dt.getFullYear()===d.getFullYear() && dt.getMonth()===d.getMonth();
        }).reduce((s,e)=> s + toBase(e.amt,e.cur), 0);
        monthData.push(round2(sum));
      }
      if(barChart) barChart.destroy();
      barChart = new Chart(document.getElementById('barChart'), {
        type:'bar', data:{ labels:monthLabels, datasets:[{ data:monthData }] }, options:{ scales:{ x:{ ticks:{ color:'#9fb0c6' } }, y:{ ticks:{ color:'#9fb0c6' } } } }
      });
    }

    function toBase(amount, cur){
      if(cur===baseCurrency) return amount;
      const r = rates[cur];
      if(!r) return amount;
      return amount * (1 / r);
    }

    function fromTo(amount, from, to){
      if(from===to) return amount;
      const inBase = toBase(amount, from);
      const rTo = rates[to];
      if(to===baseCurrency) return inBase;
      if(!rTo) return inBase;
      return inBase * rTo;
    }

    function fmt(n){
      return (Number(n)||0).toLocaleString(undefined,{ maximumFractionDigits:2 });
    }
    function round2(n){ return Math.round(n*100)/100 }
    function escapeHtml(s){ return s.replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])) }

    // ---------- Converter ----------
    const convAmt = document.getElementById('convAmt');
    const convFrom = document.getElementById('convFrom');
    const convTo = document.getElementById('convTo');
    const doConvert = document.getElementById('doConvert');
    const convResult = document.getElementById('convResult');

    doConvert.onclick = ()=>{
      const a = Number(convAmt.value||0); const f = convFrom.value; const t = convTo.value;
      if(!a){ convResult.textContent = 'Result: —'; return; }
      const out = fromTo(a,f,t);
      convResult.textContent = `Result: ${fmt(out)} ${t}`;
    }

    // ---------- App Initialization ----------
    function initializeApp() {
      currentUser = getCurrentUser();
      
      if (currentUser) {
        loadUserData();
        showApp();
      } else {
        showLogin();
      }
    }

    // Start the app
    initializeApp();