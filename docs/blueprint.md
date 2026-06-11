# **App Name**: ControlFlow

## Core Features:

- User & Role Management: Secure staff authentication (Email/Password) with defined roles (Staff, HR, Finance, MD) and user profile management, including personal details, joined date, birthday, and avatar. User profiles are stored in Firestore.
- Attendance Tracking: A 'Clock In/Out' feature for recording staff attendance with timestamps and dates, preventing duplicate entries within the same day, and displaying real-time 'Online'/'Offline' status for colleagues. Attendance data is stored in Firestore.
- Multi-Stage Requisition Workflow: Allows staff to submit financial requisitions with description, amount, and image/PDF attachments (stored in Firebase Storage), alongside auto-generated serial numbers. These requests pass through a multi-level approval chain (HR, Finance, MD), with Finance marking approved requests as 'Paid'. Requisition data and status are managed in Firestore.
- Task Assignment & Management: Users can create and manage tasks with titles, descriptions, due dates, and specific deadline times. Includes options for setting 'Follow-up Reminders' for pending tasks and viewing a chronological task history via a vertical timeline. Task data is stored in Firestore.
- Executive Overview Dashboard: A centralized dashboard for executive and administrative oversight, featuring HR-managed 'Announcements' that can be pinned, progress indicators for 'Company Goals', counters for 'Pending Requisitions' and 'My Tasks', and a schedule of staff birthdays for the current month. All dynamic data is sourced from Firestore.
- Real-time Staff Communication: Enable private 1-on-1 real-time chat functionality between staff members for direct and immediate communication within the platform. Chat messages are stored and synchronized using Firestore.

## Style Guidelines:

- Color Anchor: The user's request for a 'Mission Control' aesthetic and a 'Slate/Indigo' color palette. This guided the selection towards a professional, focused, and organized feel. Scheme: Dark, to reduce eye strain and provide a contemporary 'Mission Control' ambiance for a data-intensive environment.
- Primary color: A deep, authoritative indigo blue (#6674D9). This choice reflects reliability and a modern professional feel, ensuring good visibility against the dark background.
- Background color: A very dark slate blue-gray (#1C1E24). This desaturated, muted tone creates a professional 'Mission Control' backdrop, allowing key information and interactive elements to stand out clearly.
- Accent color: A vibrant, clear aqua blue (#62C9EC). Used strategically for interactive components, crucial highlights, and to direct user attention efficiently due to its strong contrast.
- Headline font: 'Space Grotesk' (sans-serif) for its modern, techy, and functional appearance, resonating with the 'Mission Control' aesthetic. Body font: 'Inter' (sans-serif) chosen for its clean readability and neutrality, suitable for displaying various types of data and text content throughout the application.
- Minimalist and functional line icons will be used throughout the application to maintain a clean, professional look and facilitate intuitive navigation within the 'Mission Control' theme.
- The design prioritizes a desktop-first approach with a persistent sidebar navigation for efficient module access. It incorporates subtle glassmorphism effects and judiciously applied shadows to introduce depth and modernity without compromising the clean, professional interface.
- Subtle and fluid animations will be employed for state transitions and user interactions, aiming to enhance the user experience by providing responsive feedback without distracting from the primary functional elements.