# Smile Artist

<div align="center">
  <img src="./src/assets/logo.png" alt="Smile Artist Logo" width="120" />
</div>

<div align="center">
  <p><strong>A digital haven promoting mental well-being and personal growth, specifically designed for poets, authors, and writers.</strong></p>
</div>

---

## 📖 Project Vision

**Smile Artist** is a robust platform intended to foster a supportive community where users—especially creative minds like poets and writers—can share their thoughts, feelings, and experiences. 

It aims to organically connect individuals with "motivators," share positive content, and provide a safe space for expression. At its core, the vision is to build a social media platform that diverges from traditional norms by focusing intensely on emotional support, mutual growth, and meaningful peer-to-peer matchmaking through the built-in "Buddy System".

---

## ✨ Core Features

*   **Secure Authentication & Profiles:** 
    *   Powered by Supabase Auth (JWT).
    *   Customizable user profiles featuring avatars, cover photos, rich bios, locations, and interest tags.
*   **Rich Content Creation & Social Interaction:** 
    *   Create detailed posts and poems.
    *   Categorize content dynamically using tags and categories.
    *   Engage via fully functional liking and commenting systems, along with nested comment likes.
*   **AI-Powered Writing Companion (VerseVibe Integration):** ✨
    *   **TalkingBuddy AI:** Integrated with **Google Gemini 2.5 Flash**, offering empathic, real-time sentiment analysis and constructive pacing/word-choice advice for poets.
    *   **Sentiment-Reactive UI:** Beautiful, dynamic backgrounds powered by **Framer Motion** that instantly shift colors and animations to match the emotional tone of your writing.
*   **Unique Motivator System:** 
    *   Designated authoritative users can be "Motivators," complete with specialized titles and bios.
    *   They offer guidance and support through specialized content.
*   **Anonymous/Direct Real-time Chat (Buddy System):** 
    *   A sophisticated matchmaking queue connecting users temporarily (24-hour expiry) or permanently.
    *   Role-based queuing: users join as a "Seeker" or "Listener".
    *   Real-time bidirectional messaging handled via Supabase Realtime and custom PostgreSQL RPCs.
*   **Notifications Engine:** 
    *   Real-time, in-app updates for likes, comments, follows, and buddy requests.
*   **Content Curation & History:** 
    *   **Collections:** Curate and save posts into colored, descriptive collections.
    *   **Reading History:** Automatically track recently viewed poets and posts.
*   **Follow Graph:** 
    *   A relational follow system to curate timelines.
*   **Theming & i18n:** 
    *   Light/Dark mode support seamlessly blended with the AI Sentiment UI.
    *   Internationalization structure for a global audience.

---

## 🛠️ Technology Stack

### Frontend Architecture
*   **Framework:** [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/) & SWC Plugin (Lightning-fast HMR)
*   **Styling & UI Components:** [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
*   **Animations:** `framer-motion` (for reactive backgrounds & Floating Orbs)
*   **Forms & Validation:** `react-hook-form`
*   **Data Visualization:** `recharts` for insightful dashboards/metrics
*   **Theme Management:** `next-themes`

### Backend & AI Architecture
*   **Local AI API Server:** Node.js + Express (serving the `/api/analyze` endpoint for VerseVibe)
*   **AI Integration:** `@google/generative-ai` (Gemini 2.5 Flash)
*   **BaaS Platform:** [Supabase](https://supabase.com/) (PostgreSQL Database)
*   **Security:** Row Level Security (RLS) policies strictly enforced on tables (Users, Posts, Messages).
*   **Logic:** Edge-native features leveraging PostgreSQL Stored Procedures (RPCs) to handle complex transactions atomically (like the Matchmaking Queue logic).

---

## 🗂️ Project Structure

An overview of the essential directories in the repository:

```text
smileartist/
├── src/
│   ├── components/       # Reusable React & Shadcn UI components (Navbars, Cards, Modals)
│   ├── styles/           # Global stylesheets and Tailwind entrypoints
│   ├── supabase/         # Supabase client configurations and custom hooks
│   ├── utils/            # Helper functions, formatters, and centralized API callers
│   ├── App.tsx           # Main application routing and layout
│   └── main.tsx          # React DOM entry point
├── public/               # Static assets (favicons, manifest.json)
├── supabase/             # Local Supabase configurations and edge functions
├── DATABASE_SOURCE_OF_TRUTH.sql # Full PostgreSQL schema, RPCs, and RLS policies
├── package.json          # Dependency definitions and scripts
└── vite.config.ts        # Vite configuration and plugins
```

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### 1. Clone the repository
```bash
git clone https://github.com/Smileartist/SmileA.git
cd SmileA
```

### 2. Install Dependencies
```bash
npm install
# or if using yarn: yarn install
```

### 3. Database & Backend Configuration (Supabase)
To run this project, you need a connected Supabase project to handle the Auth, Database, and Realtime features.

1. Create a new project on [Supabase.com](https://supabase.com/).
2. Navigate to the SQL Editor in your Supabase Dashboard.
3. Copy the entire contents of `DATABASE_SOURCE_OF_TRUTH.sql` from the root of this project and paste it into the SQL Editor, then click **Run**. This will create all necessary tables, constraints, RPCs, and RLS policies.
4. Retrieve your **Project URL** and **Anon Key** from Project Settings > API.

### 4. Environment Variables
Create a `.env` file in the root directory and add the following keys obtained from your Supabase dashboard and Google AI Studio:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_2.5_flash_api_key
```

### 5. Run the Application
Start the development server and the local AI backend via `concurrently`:

```bash
npm run dev
```
The frontend application will be accessible at [http://localhost:3000](http://localhost:3000) and the AI backend runs locally on port 8000.

---

## 🤝 Contributing

We welcome contributions to make Smile Artist a safer and better place.
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
