# FinSight — AI-Powered Personal Finance Management & Decision Support

FinSight is a full-stack personal finance management platform designed to help users understand their overall financial position through centralized financial records, meaningful analytics and AI-assisted decision support.

Instead of simply tracking income and expenses, FinSight brings transactions, budgets, savings goals, investments, financial health assessment and AI assistance together in one application.

Its key design principle is that **financial calculations are handled by deterministic backend services, while AI is used to explain financial information and assist users.**

## Key Features

### 1. Financial Dashboard
- Consolidated overview of financial activities.
- Income, expenses and available financial summaries.
- Visual analytics and spending patterns.

### 2. Bank Statement Processing
- Upload supported text-based bank statement PDFs.
- Extract transaction details automatically.
- Detect duplicate transactions using hash-based validation.
- Categorize recognized transactions.
- Send unrecognized transactions to a Review Queue for user verification.

### 3. Transaction Management
- Record and manage income and expenses.
- Categorize financial transactions.
- Track transaction history.
- Support transfers between the user's own accounts.

### 4. Budget Management
- Create monthly budgets for spending categories.
- Monitor expenses against budget limits.
- Track remaining budget amounts.

### 5. Savings Goals
- Create savings targets.
- Record contributions.
- Monitor goal progress.
- Identify emergency-fund goals.

### 6. Investments & Assets
- Maintain investment information for:
  - Stocks
  - Mutual Funds
  - Gold
  - Fixed Deposits
- Add and manage investment records.
- Maintain gold and fixed-deposit information through manual entry.

### 7. FinScore — Financial Health Assessment
FinScore provides an indicative financial health assessment out of 100 using available financial information.

Its assessment considers:
- Savings and cash flow
- Budget management
- Emergency fund preparedness
- Investment diversification
- Debt health

Missing financial information is handled separately rather than automatically being treated as zero.

### 8. FinAI — Local AI Financial Assistant
- Ask financial questions using natural language.
- Retrieve relevant user-specific financial information.
- Use locally hosted Qwen3:8B through Ollama.
- Use backend calculations for supported financial queries.
- Require user confirmation before applying proposed financial actions.

### 9. Analytics & Reports
- Review financial summaries and spending patterns.
- Compare financial activity across periods.
- Generate PDF and CSV reports.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, JavaScript |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | MySQL |
| ORM | Prisma |
| AI Model | Qwen3:8B |
| Local AI Runtime | Ollama |
| Voice Processing | whisper.cpp |
| Data Visualization | Recharts |
| PDF Processing | pdf-parse |
| Reports | PDFKit, CSV |
| Authentication | JWT, bcrypt |
| Validation | Zod |

## System Architecture

FinSight follows a layered architecture:

1. **Presentation Layer:** Next.js frontend and dashboard interfaces.
2. **API Layer:** Express REST API, authentication, validation and request handling.
3. **Business Logic Layer:** Financial calculations, transaction processing, budgets, goals, portfolio management and FinScore.
4. **Data Layer:** MySQL database managed through Prisma ORM.
5. **AI Layer:** Ollama-powered local language model using retrieved user-specific financial context.

The AI assistant does not act as the source of truth for financial calculations. Backend services provide verified financial values wherever applicable.

## Project Structure

```text
FinSight/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── ai/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── context/
│   │   └── lib/
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

Install the following before running FinSight:

- Node.js and npm
- MySQL
- Ollama
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/samarthsugandhi/Finsight-backup.git
cd Finsight-backup
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Configure the database connection and authentication secrets in `backend/.env`.

Example:

```env
DATABASE_URL="mysql://user:password@localhost:3306/finsight"
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=qwen3:8b
```

Create the database and apply the Prisma migrations using the project's configured Prisma commands.

Start the backend using the development script defined in `backend/package.json`.

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Start the frontend using the development script defined in `frontend/package.json`.

### 4. Local AI Setup

Install Ollama and download the required model:

```bash
ollama pull qwen3:8b
```

Start Ollama and ensure the backend can communicate with its local API.

### 5. Access the Application

Open the frontend development URL in your browser. The default development frontend address is:

```text
http://localhost:3000
```

## Privacy & Data Handling

FinSight is designed around user-controlled financial information.

- Financial records are associated with individual user accounts.
- Financial calculations are performed by backend services.
- FinAI uses a locally hosted language model through Ollama.
- Proposed assistant actions require explicit user confirmation.

Local processing reduces dependence on external AI and market-data services. Deployment configuration and infrastructure still determine where application data is stored.

## Current Limitations

- PDF extraction currently supports text-based bank statements; scanned PDFs requiring OCR are not supported.
- Gold and Fixed Deposit information requires manual entry.
- Automatic real-time market valuation through external market-data APIs is not provided.
- FinAI response speed and quality depend on available hardware and financial context.

## Future Enhancements

- OCR support for scanned bank statements.
- Advanced financial forecasting.
- Enhanced AI-assisted financial analysis.
- Advanced investment performance analysis.
- Dedicated mobile application.

## Disclaimer

FinSight is an educational personal finance management and decision-support project. Its financial health assessment and AI-generated explanations are intended to support financial awareness and should not be treated as professional financial advice.

---

**Developed as an academic project by students of the Department of Information Science and Engineering, Basaveshwar Engineering College, Bagalkote, Karnataka, India.**
