#  Finance Tracker

A smart, feature-rich personal finance tracker built with vanilla HTML, CSS, and JavaScript.

##  Features

- ** Balance Dashboard** – Real-time total balance with income, expense & savings rate
- ** Pie Chart** – Live income vs expense breakdown using Chart.js
- ** Budget Manager** – Set monthly spending limits per category with progress bars & alerts
- ** Search & Filter** – Filter transactions by keyword, category, or type (income/expense)
- ** Export CSV** – Download all transactions as a `.csv` file (Excel/Sheets ready)
- ** Smart Suggest** – Auto-suggests category from description using keyword matching
- ** 3 Themes** – Light, Dark & Glassmorphism modes (saved to localStorage)
- ** Persistent Data** – Transactions & budgets saved in localStorage
- ** Animations** – Smooth slide-in rows, hover effects, micro-interactions

##  Getting Started

### Option 1 – Open directly
Just open `index.html` in your browser.

### Option 2 – Live dev server
```bash
npx live-server --port=3000
```

## 🛠️ Tech Stack

| Layer      | Tech                  |
|------------|-----------------------|
| Structure  | HTML5                 |
| Styling    | Vanilla CSS           |
| Logic      | Vanilla JavaScript    |
| Charts     | Chart.js (CDN)        |
| Fonts      | Google Fonts – Inter  |

##  Project Structure

```
financial project/
├── index.html    # App structure & layout
├── style.css     # Themes, components, animations
└── script.js     # All logic (transactions, budget, filters, export)
```

##  AI Category Suggestion (Optional)

The app includes a smart local keyword engine that suggests categories automatically.
To upgrade to GPT-4o-mini AI suggestions, add your OpenAI API key in `script.js`:

```js
const OPENAI_API_KEY = "your-key-here"
```

##  Themes Preview

| Light | Dark | Glass |
|-------|------|-------|
| Clean white UI | Deep navy/dark blue | Purple gradient glassmorphism |

## 📄 License

MIT
