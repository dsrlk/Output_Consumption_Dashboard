# Development Instructions

## Tech Stack Overview
- **Frontend**: React.js configured with Vite, React Router DOM, Recharts for data visualization, and Lucide React for icons. Vanilla CSS for styling (Soft UI design).
- **Backend**: FastAPI (Python), SQLAlchemy (ORM), SQLite (Database), Pandas and OpenPyxl for data manipulation.

---

## 1. Local Environment Setup

### Prerequisites
- Node.js (v16+ recommended)
- Python (v3.9+ recommended)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd "d:\CONSUMPTION REPORT\backend"
   ```
2. Create and activate a Virtual Environment (Optional but recommended):
   ```bash
   python -m venv venv
   source venv/Scripts/activate # On Windows Git Bash/Powershell
   ```
3. Install Dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the Backend Application:
   ```bash
   uvicorn app.main:app --reload
   ```
   *The backend will be available at `http://localhost:8000`.*
   *(API documentation available at `http://localhost:8000/docs`).*

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd "d:\CONSUMPTION REPORT\frontend"
   ```
2. Install Node Dependencies:
   ```bash
   npm install
   ```
3. Start the Development Server:
   ```bash
   npm run dev
   ```
   *The frontend will be available at `http://localhost:5173`.*

---

## 2. Project Execution Scripts
- **START.bat**: A Windows batch file located at the project root `d:\CONSUMPTION REPORT\START.bat` can be used to quickly spin up both environments simultaneously based on its configuration.

## 3. Database Management & Checks
There are multiple utility scripts located in the `backend/` directory to manage and verify DB integrity:
- `python check_db.py` - Validates core tables.
- `python check_cols.py` / `python check_days.py` - Data profile debugging.
- `python test_api.py` - Verifies endpoint responses.

## 4. Linting and Formatting
- To conform frontend code to established standards, ESLint configuration is provided in `frontend/eslint.config.js`.

## 5. UI Design Principles
- The application uses a specific mapping for colors, visual hierarchy, and component guidelines (e.g., Black for Output, Red for Consumption). Refer to `docs/UI_DESIGN_PRINCIPLES.md` to maintain brand consistency and ensure the "Soft UI" aesthetic is upheld throughout the application.
