# Smile Artist

## Project Vision
Smile Artist is a platform designed to foster a supportive community where users can share their thoughts, feelings, and experiences. It aims to connect individuals with motivators, share positive content, and provide a safe space for expression and mutual support. The vision is to create a digital haven that promotes mental well-being and personal growth. A social media platform designed particularly for poets authors and writers

## Features

*   **User Authentication & Profiles:** Secure login/signup, customizable user profiles with avatars, bios, and interests.
*   **Post Creation & Interaction:** Users can create posts, like, comment, and share them. Support for various categories and tags.
*   **Motivator System:** Designated users can be motivators, offering guidance and support through specialized content and interactions.
*   **Real-time Chat (Buddy System):** A unique matchmaking queue connects users for temporary or permanent buddy chats based on roles (seeker/listener).
*   **Notifications:** Real-time updates for likes, comments, follows, and chat requests.
*   **Content Collections & Reading History:** Users can save posts to collections and track their reading history.
*   **Follow System:** Users can follow other profiles to stay updated with their content.
*   **Search & Trending:** Functionality to search for posts and users, and view trending content.
*   **Responsive Design:** Optimized for both mobile and desktop experiences.
*   **Internationalization (i18n):** Support for multiple languages to cater to a global audience.
*   **Theme Customization:** Users can personalize their app theme.

## Technologies Used (Tech Stack)

### Frontend
*   **React:** A declarative, component-based JavaScript library for building user interfaces.
*   **Vite:** A fast frontend build tool that provides an extremely quick development experience.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript, enhancing code quality and maintainability.
*   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom designs.
*   **Shadcn/ui:** A collection of re-usable components built with Radix UI and Tailwind CSS.
*   **Radix UI:** An open-source component library for building high-quality, accessible design systems and web apps.
*   **Lucide React:** A beautiful and consistent icon toolkit.

### Backend & Database
*   **Supabase:** An open-source Firebase alternative providing a PostgreSQL database, Authentication, instant APIs, and Realtime subscriptions.
    *   **PostgreSQL:** Robust relational database.
    *   **Supabase Client (`@supabase/supabase-js`):** Client library for interacting with Supabase services.
*   **Hono:** A small, simple, and ultrafast web framework for the Edge.

### Other Tools & Libraries
*   **`react-router-dom`:** For client-side routing.
*   **`react-hook-form`:** For flexible and extensible forms with easy validation.
*   **`recharts`:** A composable charting library built on React components.
*   **`sonner`:** An opinionated toast component for React.
*   **`class-variance-authority`, `clsx`, `tailwind-merge`:** For managing CSS classes dynamically.
*   **`next-themes`:** For managing themes in React applications.
*   **`embla-carousel-react`:** A lightweight carousel library.
*   **`react-day-picker`:** A flexible date picker component.
*   **`input-otp`:** For one-time password input fields.
*   **`react-resizable-panels`:** For resizable panel layouts.
*   **`cmdk`:** A command menu component.
*   **`vaul`:** A dialog component for React.

## Workflow

### Getting Started
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Smileartist/SmileA.git
    cd SmileA
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up Supabase:**
    *   Create a new project on [Supabase](https://supabase.com/).
    *   Configure your database schema using the `DATABASE_SOURCE_OF_TRUTH.sql` file provided in the project root.
    *   Obtain your Supabase Project URL and Anon Key.
    *   Create a `.env` file in the project root and add your Supabase credentials:
        ```
        VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
        VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```
4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be accessible at `http://localhost:5173` (or another port if 5173 is in use).

### Project Structure (Key Directories)
*   `src/components/`: Contains all reusable React components.
*   `src/utils/`: Utility functions, helper modules, and API interaction logic.
*   `src/supabase/`: Supabase-related configurations, functions, and database interactions.
*   `src/styles/`: Global styles and Tailwind CSS configurations.
*   `public/`: Static assets and service worker.
*   `DATABASE_SOURCE_OF_TRUTH.sql`: The complete SQL schema for the Supabase database.

## Contributing
We welcome contributions to Smile Artist! Please refer to our [Contribution Guidelines](link-to-contribution-guidelines) for more information on how to get started.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

