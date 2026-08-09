# Crucible 🛠️

Crucible is an AI-powered project ideation and refinement platform designed for hackathons. Instead of spending precious hours struggling to find a viable idea, Crucible acts as your AI co-founder—helping you instantly generate, refine, and stress-test your project concepts.

**[🚀 View Live](https://crucible-livid.vercel.app/)** 

## ✨ Features

- **Instant Ideation:** Generate highly tailored project proposals based on your theme, constraints, and team size.
- **AI Chat Refinement:** Chat directly with the AI agent in a dedicated project dashboard to iteratively refine your problem statement, technical stack, and features.
- **Real-time Generation:** Watch your ideas forge in real-time with Server-Sent Events (SSE) streaming.
- **Collaboration:** Secure user accounts and project sharing capabilities.

## 🚀 Tech Stack

- **Frontend:** React, Vite, Modern CSS
- **Backend:** Python, FastAPI, Pydantic
- **Database:** Supabase (PostgreSQL)
- **AI Integration:** OpenAI API
- **Deployment:** Vercel (Frontend), Render/Railway (Backend)

## 💻 Local Development

Follow these instructions to run the Crucible stack locally on your machine.

### Prerequisites
- Node.js & npm
- Python 3.10+
- A Supabase PostgreSQL database
- An OpenAI API Key
- Google OAuth Client ID (for authentication)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/crucible.git
cd crucible
```

### 2. Backend Setup
Create a virtual environment and install the Python dependencies:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the root directory and add your keys:
```env
FEATHERLESS_API_KEY=your_openai_api_key
SUPABASE_DATABASE_URL=your_supabase_connection_string
SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_CLIENT_ID=your_google_client_id
```

Start the FastAPI server:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
Open a new terminal window and navigate to the frontend directory:
```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend` directory (optional for local, required for prod):
```env
VITE_API_BASE=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Start the Vite development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
