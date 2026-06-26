// =====================
// DOM ELEMENTS
// =====================
let addBtn = document.getElementById("add-btn")
let resetBtn = document.getElementById("reset-btn")
let exportBtn = document.getElementById("export-btn")
let descriptionInput = document.getElementById("description")
let amountInput = document.getElementById("amount")
let tableBody = document.getElementById("table-body")
let balanceDisplay = document.getElementById("balance")
let categoryInput = document.getElementById("category")
let totalIncomeDisplay = document.getElementById("total-income")
let totalExpenseDisplay = document.getElementById("total-expense")
let savingsRateDisplay = document.getElementById("savings-rate")
let suggestBtn = document.getElementById("suggest-btn")
let searchInput = document.getElementById("search-input")
let filterCategorySelect = document.getElementById("filter-category")
let filterTypeSelect = document.getElementById("filter-type")
let filterCount = document.getElementById("filter-count")
let budgetContent = document.getElementById("budget-content")
let budgetToggleIcon = document.getElementById("budget-toggle-icon")

const OPENAI_API_KEY = "" // Optional: add your OpenAI key here to enable AI suggestions
const BUDGET_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Other']

// =====================
// DATA
// =====================
let transactions = JSON.parse(localStorage.getItem("transactions")) || []
let budgets = JSON.parse(localStorage.getItem("budgets")) || {}
let totalBalance = 0
let budgetOpen = false

// Filter state
let searchQuery = ""
let filterCategory = ""
let filterType = ""

// =====================
// INIT
// =====================
transactions.forEach(function(t) {
    totalBalance += t.amount
})

// Chart must come before updateChart calls
let ctx = document.getElementById("myChart").getContext("2d")
let myChart = new Chart(ctx, {
    type: "pie",
    data: {
        labels: ["Income", "Expense"],
        datasets: [{
            data: [0, 0],
            backgroundColor: ["#2ecc71", "#e74c3c"],
            borderWidth: 0
        }]
    },
    options: {
        plugins: {
            legend: { position: "bottom" }
        }
    }
})

updateBalance()
updateSummary()
updateChart()
renderTable()
loadBudgetInputs()
updateBudgetDisplay()
applySavedTheme()

// =====================
// EVENT LISTENERS
// =====================
addBtn.addEventListener("click", addTransaction)
resetBtn.addEventListener("click", resetAll)
exportBtn.addEventListener("click", exportCSV)
suggestBtn.addEventListener("click", suggestCategory)
descriptionInput.addEventListener("keydown", handleEnter)
amountInput.addEventListener("keydown", handleEnter)

searchInput.addEventListener("input", function() {
    searchQuery = this.value
    renderTable()
})
filterCategorySelect.addEventListener("change", function() {
    filterCategory = this.value
    renderTable()
})
filterTypeSelect.addEventListener("change", function() {
    filterType = this.value
    renderTable()
})

// =====================
// CORE FUNCTIONS
// =====================
function handleEnter(event) {
    if (event.key === "Enter") {
        event.preventDefault()
        addTransaction()
    }
}

function formatAmount(amount) {
    return Math.abs(amount).toLocaleString('en-IN')
}

function addTransaction() {
    let description = descriptionInput.value.trim()
    let category = categoryInput.value
    let amount = Number(amountInput.value)

    if (description === "" || amountInput.value === "" || categoryInput.value === "") {
        alert("Please fill in all fields!")
        return
    }

    let transaction = {
        description: description,
        category: category,
        amount: amount,
        date: new Date().toLocaleString('en-IN')
    }

    transactions.push(transaction)
    localStorage.setItem("transactions", JSON.stringify(transactions))
    totalBalance += amount

    descriptionInput.value = ""
    categoryInput.value = ""
    amountInput.value = ""
    suggestBtn.textContent = "🤖 Suggest"

    updateBalance()
    updateSummary()
    updateChart()
    renderTable()
    updateBudgetDisplay()
    checkBudgetAlert(transaction)
}

function renderTable() {
    let filtered = transactions.filter(function(t) {
        let matchSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchQuery.toLowerCase())
        let matchCategory = !filterCategory || t.category === filterCategory
        let matchType = !filterType ||
            (filterType === "income" ? t.amount >= 0 : t.amount < 0)
        return matchSearch && matchCategory && matchType
    })

    tableBody.innerHTML = ""

    if (filtered.length === 0) {
        let emptyRow = document.createElement("tr")
        emptyRow.id = "empty-state"
        emptyRow.innerHTML = `
            <td colspan="5">
                <div class="empty-state">
                    <p>🏦</p>
                    <p>${transactions.length === 0 ? "No transactions yet" : "No results found"}</p>
                    <p>${transactions.length === 0 ? "Add one above!" : "Try adjusting your filters"}</p>
                </div>
            </td>
        `
        tableBody.appendChild(emptyRow)
    } else {
        filtered.forEach(function(transaction) {
            let index = transactions.indexOf(transaction)
            displayTransaction(transaction, index)
        })
    }

    // Filter count badge
    if (searchQuery || filterCategory || filterType) {
        filterCount.textContent = `Showing ${filtered.length} of ${transactions.length}`
        filterCount.style.display = "inline-block"
    } else {
        filterCount.style.display = "none"
    }
}

function displayTransaction(transaction, index) {
    let newRow = document.createElement("tr")
    newRow.classList.add("new-row")
    let isIncome = transaction.amount >= 0
    let catKey = transaction.category.toLowerCase()

    newRow.innerHTML = `
        <td class="desc-cell">${transaction.description}</td>
        <td><span class="cat-badge cat-${catKey}">${transaction.category}</span></td>
        <td class="${isIncome ? 'income' : 'expense'}">
            ${isIncome ? '+' : '–'}₹${formatAmount(transaction.amount)}
        </td>
        <td class="date-cell">${transaction.date || 'N/A'}</td>
        <td><button class="delete-btn" onclick="deleteTransaction(${index})">🗑️</button></td>
    `
    tableBody.appendChild(newRow)
}

function deleteTransaction(index) {
    totalBalance -= transactions[index].amount
    transactions.splice(index, 1)
    localStorage.setItem("transactions", JSON.stringify(transactions))
    updateBalance()
    updateSummary()
    updateChart()
    renderTable()
    updateBudgetDisplay()
}

function updateChart() {
    let totalIncome = 0
    let totalExpense = 0
    transactions.forEach(function(t) {
        if (t.amount >= 0) totalIncome += t.amount
        else totalExpense += Math.abs(t.amount)
    })
    myChart.data.datasets[0].data = [totalIncome, totalExpense]
    myChart.update()
}

function updateBalance() {
    balanceDisplay.textContent = "₹ " + formatAmount(totalBalance)
    balanceDisplay.style.color = totalBalance < 0 ? "#e74c3c" : "#2ecc71"
}

function updateSummary() {
    let totalIncome = 0
    let totalExpense = 0
    transactions.forEach(function(t) {
        if (t.amount >= 0) totalIncome += t.amount
        else totalExpense += Math.abs(t.amount)
    })

    totalIncomeDisplay.textContent = "₹ " + formatAmount(totalIncome)
    totalExpenseDisplay.textContent = "₹ " + formatAmount(totalExpense)

    if (totalIncome > 0) {
        let rate = Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
        savingsRateDisplay.textContent = rate + "%"
        savingsRateDisplay.style.color = rate >= 0 ? "#2ecc71" : "#e74c3c"
    } else {
        savingsRateDisplay.textContent = "–"
        savingsRateDisplay.style.color = ""
    }
}

function resetAll() {
    if (!window.confirm("Are you sure you want to delete ALL transactions?")) return
    transactions = []
    totalBalance = 0
    localStorage.removeItem("transactions")
    updateBalance()
    updateSummary()
    updateChart()
    renderTable()
    updateBudgetDisplay()
}

// =====================
// THEME
// =====================
function setTheme(theme, clickedBtn) {
    document.documentElement.classList.remove('dark', 'glass')
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else if (theme === 'glass') document.documentElement.classList.add('glass')

    document.querySelectorAll('.theme-btn').forEach(function(btn) {
        btn.classList.remove('active')
    })
    if (clickedBtn) clickedBtn.classList.add('active')
    localStorage.setItem('theme', theme)
}

function applySavedTheme() {
    let saved = localStorage.getItem('theme')
    if (!saved) return
    document.documentElement.classList.remove('dark', 'glass')
    if (saved === 'dark') document.documentElement.classList.add('dark')
    else if (saved === 'glass') document.documentElement.classList.add('glass')
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'))
    let btn = document.getElementById('theme-' + saved)
    if (btn) btn.classList.add('active')
}

// =====================
// BUDGET MANAGER
// =====================
function loadBudgetInputs() {
    BUDGET_CATEGORIES.forEach(function(cat) {
        let input = document.getElementById('budget-' + cat)
        if (input && budgets[cat]) input.value = budgets[cat]
    })
}

function saveAllBudgets() {
    BUDGET_CATEGORIES.forEach(function(cat) {
        let input = document.getElementById('budget-' + cat)
        let val = Number(input.value)
        if (val > 0) {
            budgets[cat] = val
        } else {
            delete budgets[cat]
        }
    })
    localStorage.setItem("budgets", JSON.stringify(budgets))
    updateBudgetDisplay()

    let btn = document.getElementById("save-budgets-btn")
    btn.textContent = "✅ Saved!"
    setTimeout(function() { btn.textContent = "💾 Save Budgets" }, 1500)
}

function toggleBudget() {
    budgetOpen = !budgetOpen
    budgetContent.style.maxHeight = budgetOpen ? budgetContent.scrollHeight + 500 + "px" : "0"
    budgetContent.style.opacity = budgetOpen ? "1" : "0"
    budgetToggleIcon.textContent = budgetOpen ? "▲ Collapse" : "▼ Expand"
}

function updateBudgetDisplay() {
    let barsContainer = document.getElementById("budget-bars")
    if (!barsContainer) return

    // Calculate spending per category from transactions
    let spending = {}
    transactions.forEach(function(t) {
        if (t.amount < 0) {
            spending[t.category] = (spending[t.category] || 0) + Math.abs(t.amount)
        }
    })

    let hasBudgets = Object.keys(budgets).length > 0
    if (!hasBudgets) {
        barsContainer.innerHTML = '<p class="budget-hint">👆 Set your monthly limits above and click Save Budgets to track spending.</p>'
        return
    }

    let html = '<div class="budget-progress-list">'
    BUDGET_CATEGORIES.forEach(function(cat) {
        if (!budgets[cat]) return
        let budget = budgets[cat]
        let spent = spending[cat] || 0
        let percent = Math.min((spent / budget) * 100, 100)
        let isOver = spent > budget
        let isWarning = percent >= 80 && !isOver

        let barClass = isOver ? 'bar-danger' : isWarning ? 'bar-warning' : 'bar-safe'
        let statusIcon = isOver ? '🚨' : isWarning ? '⚠️' : '✅'

        html += `
            <div class="budget-progress-item ${isOver ? 'budget-over' : ''}">
                <div class="budget-progress-header">
                    <span class="budget-cat-name">${statusIcon} ${cat}</span>
                    <span class="budget-amounts">
                        <span class="${isOver ? 'text-danger' : ''}"">₹${formatAmount(spent)}</span>
                        <span class="text-muted"> / ₹${formatAmount(budget)}</span>
                    </span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill ${barClass}" style="width: ${percent}%"></div>
                </div>
                <div class="budget-remaining">
                    ${isOver
                        ? `<span class="text-danger">🔴 Over by ₹${formatAmount(spent - budget)}</span>`
                        : `<span class="text-success">₹${formatAmount(budget - spent)} remaining (${Math.round(100 - percent)}%)</span>`
                    }
                </div>
            </div>
        `
    })
    html += '</div>'
    barsContainer.innerHTML = html
}

function checkBudgetAlert(transaction) {
    if (transaction.amount >= 0) return
    let cat = transaction.category
    if (!budgets[cat]) return

    let spent = 0
    transactions.forEach(function(t) {
        if (t.amount < 0 && t.category === cat) spent += Math.abs(t.amount)
    })

    let percent = (spent / budgets[cat]) * 100
    if (spent > budgets[cat]) {
        setTimeout(function() {
            alert(`🚨 Budget Exceeded!\nYou've gone over your ${cat} budget.\n\nBudget: ₹${formatAmount(budgets[cat])}\nSpent: ₹${formatAmount(spent)}\nOver by: ₹${formatAmount(spent - budgets[cat])}`)
        }, 200)
    } else if (percent >= 80) {
        setTimeout(function() {
            alert(`⚠️ Budget Warning!\nYou've used ${Math.round(percent)}% of your ${cat} budget.\n\nBudget: ₹${formatAmount(budgets[cat])}\nSpent: ₹${formatAmount(spent)}\nRemaining: ₹${formatAmount(budgets[cat] - spent)}`)
        }, 200)
    }
}

// =====================
// CSV EXPORT
// =====================
function exportCSV() {
    if (transactions.length === 0) {
        alert("No transactions to export!")
        return
    }

    let headers = ["Description", "Category", "Amount", "Type", "Date"]
    let rows = transactions.map(function(t) {
        return [
            `"${t.description.replace(/"/g, '""')}"`,
            t.category,
            Math.abs(t.amount).toFixed(2),
            t.amount >= 0 ? "Income" : "Expense",
            `"${t.date || ''}"`
        ].join(",")
    })

    let csv = [headers.join(","), ...rows].join("\n")
    let blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    let url = URL.createObjectURL(blob)
    let a = document.createElement("a")
    a.href = url
    a.download = `finance-tracker-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    exportBtn.textContent = "✅ Exported!"
    setTimeout(function() { exportBtn.textContent = "📥 Export CSV" }, 2000)
}

// =====================
// SMART SUGGEST (local keyword engine + optional OpenAI fallback)
// =====================
const CATEGORY_RULES = {
    'Income':        ['salary', 'income', 'wage', 'bonus', 'freelance', 'stipend',
                      'refund', 'dividend', 'interest', 'profit', 'earning', 'payment received',
                      'reimbursement', 'allowance', 'grant', 'credit'],
    'Food':          ['food', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner',
                      'breakfast', 'pizza', 'burger', 'swiggy', 'zomato', 'grocery',
                      'groceries', 'snack', 'meal', 'eat', 'drink', 'tea', 'biryani',
                      'dosa', 'chai', 'bakery', 'dairy', 'vegetables', 'fruit', 'milk',
                      'canteen', 'dhaba', 'takeaway', 'dominos', 'mcdonalds', 'kfc'],
    'Transport':     ['uber', 'ola', 'taxi', 'auto', 'bus', 'metro', 'train', 'flight',
                      'petrol', 'fuel', 'gas', 'parking', 'toll', 'cab', 'travel',
                      'transport', 'rickshaw', 'bike', 'rapido', 'irctc', 'railway',
                      'airways', 'airport', 'ferry', 'ride'],
    'Entertainment': ['netflix', 'amazon prime', 'hotstar', 'spotify', 'movie', 'cinema',
                      'game', 'gaming', 'youtube', 'subscription', 'concert', 'show',
                      'ticket', 'fun', 'party', 'outing', 'disney', 'hbo', 'prime video',
                      'zee5', 'sonyliv', 'club', 'bar', 'pub', 'bowling', 'gym', 'sport'],
    'Shopping':      ['amazon', 'flipkart', 'myntra', 'shopping', 'clothes', 'shoes',
                      'fashion', 'mall', 'purchase', 'buy', 'order', 'delivery', 'online',
                      'meesho', 'ajio', 'nykaa', 'electronics', 'mobile', 'laptop',
                      'furniture', 'decor', 'apparel', 'jewellery', 'watch']
}

function localSuggest(description) {
    let lower = description.toLowerCase()
    for (let [category, keywords] of Object.entries(CATEGORY_RULES)) {
        for (let keyword of keywords) {
            if (lower.includes(keyword)) return category
        }
    }
    return 'Other'
}

async function suggestCategory() {
    let description = descriptionInput.value.trim()
    if (description === "") {
        alert("Please type a description first!")
        return
    }

    suggestBtn.textContent = "⌛ Thinking..."
    suggestBtn.disabled = true

    // Simulate a brief "thinking" delay for UX
    await new Promise(r => setTimeout(r, 600))

    let suggested = localSuggest(description)

    // Try OpenAI only if key looks valid (not the placeholder)
    if (OPENAI_API_KEY && !OPENAI_API_KEY.startsWith("sk-proj-YOUR")) {
        try {
            let response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{
                        role: "user",
                        content: `You are a finance categorizer. Based on this transaction description: "${description}", suggest the most appropriate category from ONLY these options: Income, Food, Transport, Entertainment, Shopping, Other. Reply with ONLY the category name, nothing else.`
                    }],
                    max_tokens: 10
                })
            })
            let data = await response.json()
            if (data.choices && data.choices[0]) {
                suggested = data.choices[0].message.content.trim()
            }
        } catch(e) {
            console.warn("OpenAI fallback failed, using local suggestion:", e)
        }
    }

    categoryInput.value = suggested
    suggestBtn.textContent = "✅ " + suggested

    setTimeout(function() {
        suggestBtn.textContent = "🤖 Suggest"
        suggestBtn.disabled = false
    }, 1800)
}