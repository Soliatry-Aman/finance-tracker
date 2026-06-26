// ============================================================
// CONSTANTS & CONFIG
// ============================================================
const BUDGET_CATS = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Other']
const OPENAI_KEY  = '' // paste your key here to enable AI suggestions

const CAT_EMOJI = { Income:'💰', Food:'🍔', Transport:'🛻', Entertainment:'🎥', Shopping:'🛍️', Other:'📦' }

// ============================================================
// STATE
// ============================================================
let transactions  = JSON.parse(localStorage.getItem('transactions')) || []
let budgets       = JSON.parse(localStorage.getItem('budgets'))      || {}
let currentTheme  = localStorage.getItem('theme') || 'light'
let budgetOpen    = false
let searchQ       = ''
let filterCatV    = ''
let filterTypeV   = ''
let periodFilter  = 'all'
let currentChart  = 'doughnut'
let editIndex     = -1
let _prevBal      = 0
let totalBalance  = transactions.reduce((s, t) => s + t.amount, 0)

_prevBal = totalBalance

// ============================================================
// CHART SETUP
// ============================================================
const chartCtx = document.getElementById('myChart').getContext('2d')
const myChart  = new Chart(chartCtx, {
    type: 'doughnut',
    data: {
        labels: ['Income', 'Expense'],
        datasets: [{ data: [0, 0], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
        cutout: '72%',
        plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12, weight: '600' }, padding: 20, usePointStyle: true, pointStyleWidth: 10, color: '#4a5080' } },
            tooltip: { callbacks: { label: c => ` ₹${fmt(c.parsed)}` }, padding: 12, cornerRadius: 10 }
        },
        animation: { animateScale: true, animateRotate: true, duration: 700 }
    }
})

// ============================================================
// DOM REFS
// ============================================================
const $ = id => document.getElementById(id)
const balanceEl     = $('balance')
const incomeEl      = $('total-income')
const expenseEl     = $('total-expense')
const savingsEl     = $('savings-rate')
const chartPctEl    = $('chart-center-pct')
const chartCenter   = $('chart-center')
const stickyNav     = $('topnav')
const stickyIncome  = $('sticky-income')
const stickyExpense = $('sticky-expense')
const stickyBalance = $('sticky-balance')
const budgetPanel   = $('budget-content')
const budgetIcon    = $('budget-toggle-icon')
const budgetHead    = $('budget-header-btn')
const filterCount   = $('filter-count')
const txnList       = $('txn-list')
const searchInput   = $('search-input')
const searchClear   = $('search-clear')
const descEl        = $('description')
const amountEl      = $('amount')
const catEl         = $('category')

// ============================================================
// INIT
// ============================================================
applyTheme(currentTheme)
updateBalance()
updateSummary()
updateChart()
renderTxns()
loadBudgetInputs()
updateBudgetBars()

// ============================================================
// EVENTS
// ============================================================
$('add-btn').addEventListener('click', addTransaction)
$('reset-btn').addEventListener('click', resetAll)
$('export-btn').addEventListener('click', exportCSV)
$('suggest-btn').addEventListener('click', suggestCategory)

descEl.addEventListener('keydown',   e => e.key === 'Enter' && (e.preventDefault(), addTransaction()))
amountEl.addEventListener('keydown', e => e.key === 'Enter' && (e.preventDefault(), addTransaction()))

searchInput.addEventListener('input', function () {
    searchQ = this.value
    searchClear.classList.toggle('show', searchQ.length > 0)
    renderTxns()
})
$('filter-category').addEventListener('change', function () { filterCatV = this.value; renderTxns() })
$('filter-type').addEventListener('change', function () { filterTypeV = this.value; renderTxns() })

window.addEventListener('scroll', () => {
    const atTop = scrollY < 60
    stickyNav.classList.toggle('at-top', atTop)
    stickyNav.classList.toggle('scrolled', scrollY > 240)
}, { passive: true })
// Initialise nav state immediately
if (scrollY < 60) stickyNav.classList.add('at-top')
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEditModal() })

// ============================================================
// HELPERS
// ============================================================
function fmt(n)      { return Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }) }
function fmtShort(n) {
    const a = Math.abs(n)
    if (a >= 1e7) return (a/1e7).toFixed(1) + 'Cr'
    if (a >= 1e5) return (a/1e5).toFixed(1) + 'L'
    if (a >= 1e3) return (a/1e3).toFixed(1) + 'K'
    return fmt(a)
}

function fmtDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d)) return dateStr
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function dateLabel(dateStr) {
    if (!dateStr) return 'Earlier'
    const d = new Date(dateStr)
    if (isNaN(d)) return 'Earlier'
    const now  = new Date()
    const diff = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
                             Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000)
    if (diff === 0)  return 'Today'
    if (diff === 1)  return 'Yesterday'
    if (diff <= 7)   return 'This Week'
    if (diff <= 30)  return 'This Month'
    return 'Earlier'
}

function inPeriod(t) {
    if (periodFilter === 'all') return true
    const d = new Date(t.date)
    if (isNaN(d)) return true
    const now = new Date()
    if (periodFilter === 'week') {
        const diff = (now - d) / 86400000
        return diff <= 7
    }
    if (periodFilter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
    return true
}

function chartLegendColor() {
    return currentTheme === 'light' ? '#4a5080' : 'rgba(255,255,255,0.7)'
}

function scrollToAdd() {
    $('section-add').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ============================================================
// THEME — uses body class so explicit CSS overrides work
// ============================================================
function applyTheme(theme) {
    currentTheme = theme
    document.body.className = 'theme-' + theme

    // Sync all theme buttons
    document.querySelectorAll('.tgl-btn').forEach(b => b.classList.remove('active'))
    const navBtn  = $('sticky-theme-' + theme)
    if (navBtn)  navBtn.classList.add('active')

    localStorage.setItem('theme', theme)

    // Update chart legend & grid colors
    myChart.options.plugins.legend.labels.color = chartLegendColor()
    if (myChart.options.scales?.y) {
        const tc = chartLegendColor()
        myChart.options.scales.y.ticks.color = tc
        myChart.options.scales.x.ticks.color = tc
        myChart.options.scales.y.grid.color  = theme === 'light' ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.06)'
    }
    myChart.update()
}

function setTheme(theme) { applyTheme(theme) }

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'info', ms = 3500) {
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' }
    const el    = Object.assign(document.createElement('div'), { className: `toast ${type}` })
    el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span><button class="toast-close" onclick="dismissToast(this.parentElement)">✕</button>`
    $('toast-container').appendChild(el)
    el._t = setTimeout(() => dismissToast(el), ms)
}
function dismissToast(el) {
    if (!el || el.classList.contains('removing')) return
    clearTimeout(el._t); el.classList.add('removing')
    el.addEventListener('animationend', () => el.remove(), { once: true })
}

// ============================================================
// CONFETTI
// ============================================================
function confetti() {
    const c   = $('confetti-canvas')
    const ctx = c.getContext('2d')
    c.width   = innerWidth; c.height = innerHeight
    const cols  = ['#6366f1','#10b981','#f59e0b','#ec4899','#60a5fa','#34d399','#fbbf24']
    const bits  = Array.from({ length: 110 }, () => ({
        x:  Math.random() * c.width,  y:  -Math.random() * c.height * .5,
        w:  Math.random() * 10 + 5,   h:  Math.random() * 5 + 3,
        r:  Math.random() * Math.PI * 2, dr: (Math.random() - .5) * .22,
        vy: Math.random() * 3 + 2,    vx: (Math.random() - .5) * 2,
        c:  cols[0 | Math.random() * cols.length]
    }))
    let alive = true
    ;(function draw() {
        ctx.clearRect(0, 0, c.width, c.height)
        let any = false
        bits.forEach(b => {
            if (b.y > c.height + 10) return; any = true
            b.x += b.vx; b.y += b.vy; b.r += b.dr; b.vy += .05
            ctx.save()
            ctx.globalAlpha = Math.max(0, 1 - b.y / c.height * .8)
            ctx.translate(b.x, b.y); ctx.rotate(b.r)
            ctx.fillStyle = b.c
            ctx.fillRect(-b.w/2, -b.h/2, b.w, b.h)
            ctx.restore()
        })
        if (any && alive) requestAnimationFrame(draw)
        else ctx.clearRect(0, 0, c.width, c.height)
    })()
    setTimeout(() => { alive = false; ctx.clearRect(0, 0, c.width, c.height) }, 3500)
}

// ============================================================
// QUICK CHIPS
// ============================================================
function quickCat(cat) {
    catEl.value = cat
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'))
    const map = { Income:'chip-income', Food:'chip-food', Transport:'chip-trans', Entertainment:'chip-enter', Shopping:'chip-shop', Other:'chip-other' }
    const el  = document.querySelector('.' + map[cat])
    if (el) el.classList.add('selected')
    descEl.focus(); scrollToAdd()
}

// ============================================================
// ADD TRANSACTION
// ============================================================
function addTransaction() {
    const desc = descEl.value.trim()
    const cat  = catEl.value
    const amt  = Number(amountEl.value)
    let ok     = true

    ;[['field-description', desc === ''], ['field-amount', amountEl.value === ''], ['field-category', cat === '']].forEach(([id, err]) => {
        const f = $(id)
        if (err) { f.classList.add('field-error'); setTimeout(() => f.classList.remove('field-error'), 600); ok = false }
    })
    if (!ok) { showToast('Please fill in all fields.', 'error'); return }

    const t = { id: Date.now(), description: desc, category: cat, amount: amt, date: new Date().toLocaleString('en-IN') }
    transactions.push(t)
    save()
    totalBalance += amt

    descEl.value = ''; catEl.value = ''; amountEl.value = ''
    $('suggest-icon').textContent = '🤖'; $('suggest-text').textContent = 'Suggest'
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'))

    updateBalance(true); updateSummary(); updateChart(); renderTxns(); updateBudgetBars()
    checkBudgetAlert(t)

    if (amt >= 0) { showToast(`💰 <strong>+₹${fmt(amt)}</strong> added as ${cat}`, 'success'); confetti() }
    else          { showToast(`📝 <strong>${desc}</strong> — ${cat}`, 'info') }
}

// ============================================================
// RENDER TRANSACTIONS
// ============================================================
function renderTxns() {
    const now = new Date()
    const filtered = transactions.filter(t => {
        const mS = t.description.toLowerCase().includes(searchQ.toLowerCase()) || t.category.toLowerCase().includes(searchQ.toLowerCase())
        const mC = !filterCatV  || t.category === filterCatV
        const mT = !filterTypeV || (filterTypeV === 'income' ? t.amount >= 0 : t.amount < 0)
        const mP = inPeriod(t)
        return mS && mC && mT && mP
    })

    txnList.innerHTML = ''

    if (!filtered.length) {
        txnList.innerHTML = `
            <div class="empty-state">
                <span class="empty-art">${transactions.length === 0 ? '💸' : '🔍'}</span>
                <p class="empty-h">${transactions.length === 0 ? 'No transactions yet' : 'Nothing found'}</p>
                <p class="empty-sub">${transactions.length === 0 ? 'Add your first one above' : 'Try different search or filters'}</p>
                ${transactions.length === 0 ? '<button class="btn btn-primary" onclick="scrollToAdd();descEl.focus()">Get Started ↑</button>' : ''}
            </div>`
        filterCount.style.display = 'none'
        return
    }

    // Group by date label (most recent first)
    const groups = {}
    ;[...filtered].reverse().forEach(t => {
        const lbl = dateLabel(t.date)
        ;(groups[lbl] = groups[lbl] || []).push(t)
    })

    Object.entries(groups).forEach(([lbl, txns]) => {
        const g = document.createElement('div')
        g.className = 'txn-group-label'; g.textContent = lbl
        txnList.appendChild(g)
        txns.forEach(t => txnList.appendChild(buildCard(t, transactions.indexOf(t))))
    })

    // Count badge
    if (searchQ || filterCatV || filterTypeV || periodFilter !== 'all') {
        filterCount.textContent = `${filtered.length} of ${transactions.length}`
        filterCount.style.display = 'inline-block'
    } else {
        filterCount.style.display = 'none'
    }
}

function buildCard(t, idx) {
    const isInc  = t.amount >= 0
    const catKey = t.category.toLowerCase()
    const emoji  = CAT_EMOJI[t.category] || '📦'
    const el     = document.createElement('div')
    el.className = 'txn-card card-in'
    el.setAttribute('data-idx', idx)
    el.innerHTML = `
        <div class="txn-emoji ei-${catKey}">${emoji}</div>
        <div class="txn-info">
            <div class="txn-desc">${t.description}</div>
            <div class="txn-meta">
                <span class="cat-badge cb-${catKey}">${t.category}</span>
                <span class="txn-date">${fmtDate(t.date)}</span>
            </div>
        </div>
        <div class="txn-right">
            <div class="txn-amount ${isInc ? 'pos' : 'neg'}">${isInc ? '+' : '–'}₹${fmt(t.amount)}</div>
            <div class="txn-actions">
                <button class="txn-btn edit-btn"   onclick="openEdit(${idx})"   title="Edit">✏️</button>
                <button class="txn-btn delete-btn" onclick="deleteTxn(${idx})"  title="Delete">🗑️</button>
            </div>
        </div>`
    return el
}

// ============================================================
// DELETE
// ============================================================
function deleteTxn(idx) {
    const cards = txnList.querySelectorAll('.txn-card')
    let target  = null
    cards.forEach(c => { if (Number(c.getAttribute('data-idx')) === idx) target = c })

    const go = () => {
        const removed = transactions.splice(idx, 1)[0]
        totalBalance -= removed.amount
        save(); updateBalance(true); updateSummary(); updateChart(); renderTxns(); updateBudgetBars()
        showToast('Transaction deleted.', 'info', 2200)
    }
    if (target) { target.classList.add('card-out'); target.addEventListener('animationend', go, { once: true }) }
    else go()
}

// ============================================================
// EDIT
// ============================================================
function openEdit(idx) {
    editIndex = idx
    const t = transactions[idx]
    $('edit-description').value = t.description
    $('edit-amount').value      = t.amount
    $('edit-category').value    = t.category
    const modal = $('edit-modal')
    modal.classList.add('open')
    setTimeout(() => $('edit-description').focus(), 80)
}

function closeEditModal(e) {
    if (e && e.target !== $('edit-modal')) return
    $('edit-modal').classList.remove('open')
    editIndex = -1
}

function saveEdit() {
    if (editIndex < 0) return
    const desc = $('edit-description').value.trim()
    const amt  = Number($('edit-amount').value)
    const cat  = $('edit-category').value
    if (!desc || $('edit-amount').value === '' || !cat) { showToast('Fill all fields.', 'error'); return }

    const old = transactions[editIndex]
    totalBalance = totalBalance - old.amount + amt
    transactions[editIndex] = { ...old, description: desc, amount: amt, category: cat }
    save()

    $('edit-modal').classList.remove('open')
    editIndex = -1
    updateBalance(true); updateSummary(); updateChart(); renderTxns(); updateBudgetBars()
    showToast('✏️ Transaction updated!', 'success')
}

// ============================================================
// PERIOD FILTER
// ============================================================
function setPeriod(p, btn) {
    periodFilter = p
    document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    renderTxns()
}

// ============================================================
// SEARCH CLEAR
// ============================================================
function clearSearch() {
    searchInput.value = ''; searchQ = ''
    searchClear.classList.remove('show')
    renderTxns(); searchInput.focus()
}

// ============================================================
// BALANCE & SUMMARY
// ============================================================
function animateNum(el, from, to, dur = 600, pre = '₹ ') {
    const t0 = performance.now()
    ;(function tick(now) {
        const p = Math.min((now - t0) / dur, 1)
        const e = 1 - Math.pow(1 - p, 4)
        el.textContent = pre + fmt(from + (to - from) * e)
        if (p < 1) requestAnimationFrame(tick)
        else el.textContent = pre + fmt(to)
    })(performance.now())
}

function updateBalance(anim = false) {
    const isNeg = totalBalance < 0
    balanceEl.className = 'bc-amount' + (isNeg ? ' neg' : '')
    if (anim) animateNum(balanceEl, _prevBal, totalBalance, 600, '₹ ')
    else balanceEl.textContent = '₹ ' + fmt(totalBalance)
    _prevBal = totalBalance
}

function updateSummary() {
    let inc = 0, exp = 0
    transactions.filter(inPeriod).forEach(t => { t.amount >= 0 ? (inc += t.amount) : (exp += Math.abs(t.amount)) })

    incomeEl.textContent  = '₹ ' + fmt(inc)
    expenseEl.textContent = '₹ ' + fmt(exp)
    stickyIncome.textContent  = '₹' + fmtShort(inc)
    stickyExpense.textContent = '₹' + fmtShort(exp)
    stickyBalance.textContent = (totalBalance < 0 ? '-' : '') + '₹' + fmtShort(totalBalance)

    if (inc > 0) {
        const rate = Math.round(((inc - exp) / inc) * 100)
        savingsEl.textContent  = rate + '%'
        savingsEl.style.color  = rate >= 0 ? 'var(--c-green)' : 'var(--c-red)'
        chartPctEl.textContent = rate + '%'
    } else {
        savingsEl.textContent  = '–'; savingsEl.style.color = ''; chartPctEl.textContent = '–'
    }
}

// ============================================================
// CHART
// ============================================================
function updateChart() {
    let inc = 0, exp = 0
    transactions.forEach(t => { t.amount >= 0 ? (inc += t.amount) : (exp += Math.abs(t.amount)) })

    myChart.options.plugins.legend.labels.color = chartLegendColor()

    if (currentChart === 'doughnut') {
        myChart.data.labels                   = ['Income', 'Expense']
        myChart.data.datasets[0].data         = [inc, exp]
        myChart.data.datasets[0].backgroundColor = ['#10b981', '#f43f5e']
    } else {
        const sp = {}; BUDGET_CATS.forEach(c => { sp[c] = 0 })
        transactions.forEach(t => { if (t.amount < 0 && sp[t.category] !== undefined) sp[t.category] += Math.abs(t.amount) })
        myChart.data.labels                   = Object.keys(sp)
        myChart.data.datasets[0].data         = Object.values(sp)
        myChart.data.datasets[0].backgroundColor = ['#f97316','#3b82f6','#8b5cf6','#f43f5e','#64748b']
    }
    myChart.update()
}

function switchChart(type, btn) {
    currentChart = type
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    btn.classList.add('active')
    const isDoughnut = type === 'doughnut'

    myChart.config.type     = isDoughnut ? 'doughnut' : 'bar'
    myChart.options.cutout  = isDoughnut ? '72%' : undefined
    myChart.options.plugins.legend.display = isDoughnut
    chartCenter.classList.toggle('hidden', !isDoughnut)

    const canvas = $('myChart')
    canvas.className = isDoughnut ? '' : 'bar-mode'

    if (!isDoughnut) {
        const tc = chartLegendColor()
        const gc = currentTheme === 'light' ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.06)'
        myChart.options.scales = {
            y: { grid: { color: gc }, ticks: { callback: v => '₹' + fmtShort(v), color: tc } },
            x: { ticks: { color: tc } }
        }
    } else {
        delete myChart.options.scales
    }
    updateChart()
}

// ============================================================
// BUDGET
// ============================================================
function loadBudgetInputs() {
    BUDGET_CATS.forEach(c => { const el = $('budget-' + c); if (el && budgets[c]) el.value = budgets[c] })
}

function saveAllBudgets() {
    BUDGET_CATS.forEach(c => {
        const v = Number($('budget-' + c).value)
        if (v > 0) budgets[c] = v; else delete budgets[c]
    })
    localStorage.setItem('budgets', JSON.stringify(budgets))
    updateBudgetBars()
    showToast('Budgets saved! 🎯', 'success')
    if (budgetOpen) budgetPanel.style.maxHeight = budgetPanel.scrollHeight + 400 + 'px'
}

function toggleBudget() {
    budgetOpen = !budgetOpen
    budgetPanel.classList.toggle('open', budgetOpen)
    budgetPanel.style.maxHeight = budgetOpen ? budgetPanel.scrollHeight + 600 + 'px' : '0'
    budgetIcon.classList.toggle('open', budgetOpen)
    budgetHead.setAttribute('aria-expanded', budgetOpen)
}

function updateBudgetBars() {
    const el = $('budget-bars')
    if (!el) return
    const sp = {}
    transactions.forEach(t => { if (t.amount < 0) sp[t.category] = (sp[t.category] || 0) + Math.abs(t.amount) })

    if (!Object.keys(budgets).length) { el.innerHTML = '<p class="budget-hint">Set monthly limits above, then click Save Budgets.</p>'; return }

    let html = '<div class="budget-bars-list" style="margin-top:16px">'
    BUDGET_CATS.forEach(c => {
        if (!budgets[c]) return
        const b = budgets[c], s = sp[c] || 0, rawP = (s / b) * 100, p = Math.min(rawP, 100)
        const over = s > b, warn = rawP >= 80 && !over
        const cls  = over ? 'prog-danger' : warn ? 'prog-warn' : 'prog-safe'
        const icon = over ? '🚨' : warn ? '⚠️' : '✅'
        html += `
        <div class="bbar${over ? ' over' : ''}">
            <div class="bbar-head">
                <span class="bbar-name">${icon} ${CAT_EMOJI[c] || ''} ${c}</span>
                <span class="bbar-amts"><span class="${over ? 't-danger' : ''}">₹${fmt(s)}</span><span class="t-muted"> / ₹${fmt(b)}</span></span>
            </div>
            <div class="prog-bg"><div class="prog-fill ${cls}" style="width:${p}%"></div></div>
            <div class="bbar-remain">${over ? `<span class="t-danger">Over by ₹${fmt(s-b)}</span>` : `<span class="t-success">₹${fmt(b-s)} left (${Math.round(100-rawP)}%)</span>`}</div>
        </div>`
    })
    html += '</div>'
    el.innerHTML = html
    if (budgetOpen) budgetPanel.style.maxHeight = budgetPanel.scrollHeight + 200 + 'px'
}

function checkBudgetAlert(t) {
    if (t.amount >= 0 || !budgets[t.category]) return
    const spent = transactions.filter(x => x.amount < 0 && x.category === t.category).reduce((s, x) => s + Math.abs(x.amount), 0)
    const pct   = (spent / budgets[t.category]) * 100
    if (spent > budgets[t.category])  setTimeout(() => showToast(`🚨 <strong>${t.category}</strong> budget exceeded! Over by ₹${fmt(spent - budgets[t.category])}`, 'error', 6000), 500)
    else if (pct >= 80)               setTimeout(() => showToast(`⚠️ <strong>${t.category}</strong> at ${Math.round(pct)}% of budget`, 'warning', 5000), 500)
}

// ============================================================
// RESET & EXPORT
// ============================================================
function resetAll() {
    if (!confirm('Delete ALL transactions? This cannot be undone.')) return
    transactions = []; totalBalance = 0; _prevBal = 0
    localStorage.removeItem('transactions')
    updateBalance(); updateSummary(); updateChart(); renderTxns(); updateBudgetBars()
    showToast('All data cleared.', 'info')
}

function exportCSV() {
    if (!transactions.length) { showToast('No transactions to export!', 'warning'); return }
    const rows = transactions.map(t => [`"${t.description.replace(/"/g,'""')}"`, t.category, Math.abs(t.amount).toFixed(2), t.amount >= 0 ? 'Income' : 'Expense', `"${t.date || ''}"`].join(','))
    const csv  = ['Description,Category,Amount,Type,Date', ...rows].join('\n')
    const a    = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })),
        download: `finsight-${new Date().toISOString().split('T')[0]}.csv`
    })
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    showToast('📥 CSV exported!', 'success')
}

// ============================================================
// SAVE
// ============================================================
function save() { localStorage.setItem('transactions', JSON.stringify(transactions)) }

// ============================================================
// SMART SUGGEST
// ============================================================
const CAT_RULES = {
    Income:        ['salary','income','wage','bonus','freelance','stipend','refund','dividend','interest','profit','earning','credit','allowance'],
    Food:          ['food','restaurant','cafe','coffee','lunch','dinner','breakfast','pizza','burger','swiggy','zomato','grocery','groceries','snack','meal','eat','drink','tea','biryani','dosa','chai','bakery','milk','canteen','dhaba','dominos','mcdonalds','kfc'],
    Transport:     ['uber','ola','taxi','auto','bus','metro','train','flight','petrol','fuel','gas','parking','toll','cab','travel','transport','rickshaw','rapido','irctc','railway','airport','ferry','ride'],
    Entertainment: ['netflix','amazon prime','hotstar','spotify','movie','cinema','game','gaming','youtube','subscription','concert','show','ticket','party','outing','disney','hbo','zee5','sonyliv','club','bar','pub','gym','sport'],
    Shopping:      ['amazon','flipkart','myntra','shopping','clothes','shoes','fashion','mall','purchase','buy','order','delivery','online','meesho','ajio','nykaa','electronics','mobile','laptop','furniture','jewellery','watch']
}

function localSuggest(d) {
    const l = d.toLowerCase()
    for (const [c, ks] of Object.entries(CAT_RULES)) for (const k of ks) if (l.includes(k)) return c
    return 'Other'
}

async function suggestCategory() {
    const desc = descEl.value.trim()
    if (!desc) { showToast('Type a description first!', 'warning'); return }
    const icon = $('suggest-icon'), text = $('suggest-text')
    icon.textContent = '⏳'; text.textContent = '…'; $('suggest-btn').disabled = true
    await new Promise(r => setTimeout(r, 500))
    let s = localSuggest(desc)
    if (OPENAI_KEY && !OPENAI_KEY.startsWith('sk-YOUR')) {
        try {
            const r = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+OPENAI_KEY}, body: JSON.stringify({ model:'gpt-4o-mini', max_tokens:10, messages:[{role:'user',content:`Categorize: "${desc}". Choose one: Income, Food, Transport, Entertainment, Shopping, Other. Reply ONLY with the category.`}] }) })
            const d = await r.json()
            if (d.choices?.[0]) s = d.choices[0].message.content.trim()
        } catch {}
    }
    catEl.value = s; quickCat(s)
    icon.textContent = '✅'; text.textContent = s
    showToast(`Suggested: <strong>${s}</strong>`, 'success', 2000)
    setTimeout(() => { icon.textContent = '🤖'; text.textContent = 'Suggest'; $('suggest-btn').disabled = false }, 2000)
}