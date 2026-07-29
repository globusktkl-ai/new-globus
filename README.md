# Globus Technical Academy ERP v1.00

## Office ERP Foundation (Part 1 of 4)

### Overview
Professional mobile-friendly web ERP for educational institutions.
White-label ready — institute name, logo, colors, and structure are fully configurable.

### Technology Stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6)
- **Backend:** Supabase
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth

### Project Structure
```
project/
├── index.html                  # Landing / redirect
├── signup.html                 # Office signup
├── README.md
├── assets/
│   ├── css/                    # Global styles
│   ├── js/
│   │   └── supabase.js         # Supabase client init
│   └── shared/
│       ├── components.js       # Reusable UI components
│       ├── ui.js               # UI utilities (toast, modal, loader)
│       └── helpers.js          # Date, format, validation helpers
└── office/
    ├── login.html
    ├── index.html              # Dashboard
    ├── new-admission.html
    ├── students.html
    ├── old-students.html
    ├── fees.html
    ├── student-profile.html
    ├── edit-student.html
    ├── modules.html
    ├── css/
    │   ├── common.css
    │   ├── login.css
    │   ├── dashboard.css
    │   ├── admission.css
    │   ├── students.css
    │   ├── profile.css
    │   └── fees.css
    └── js/
        ├── login.js
        ├── dashboard.js
        ├── new-admission.js
        ├── students.js
        ├── old-students.js
        ├── fees.js
        ├── student-profile.js
        ├── edit-student.js
        └── modules.js
```

### Setup Instructions

#### 1. Create Supabase Project
1. Go to https://supabase.com and create a new project.
2. Note your **Project URL** and **Anon Key**.

#### 2. Run Database SQL
Execute the SQL from `database.sql` in the Supabase SQL Editor (all tables, RLS, functions).

#### 3. Configure Supabase Credentials
Open `assets/js/supabase.js` and replace:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

#### 4. Create Office User
1. Open `signup.html` in browser.
2. Register with email + password.
3. Confirm email if required.
4. Login at `office/login.html`.

#### 5. Seed Institute Settings
Insert a row into `institute_settings` via Supabase dashboard or the Admin Portal (Part 4).

### Parts Roadmap
- **Part 1:** Office ERP Foundation ✅
- **Part 2:** Student Portal ✅
- **Part 3:** Teacher Portal ✅
- **Part 4:** Admin Portal (upcoming)

### Part 2 - Student Portal Structure
```
student/
├── login.html
├── dashboard.html
├── profile.html
├── fees.html
├── attendance.html
├── notifications.html
├── settings.html
├── css/
│   ├── student.css
│   ├── profile.css
│   ├── fees.css
│   └── attendance.css
└── js/
    ├── login.js
    ├── dashboard.js
    ├── profile.js
    ├── fees.js
    ├── attendance.js
    ├── notifications.js
    └── settings.js
```

### Part 3 - Teacher Portal Structure
```
teacher/
├── login.html
├── dashboard.html
├── students.html
├── attendance.html
├── module-progress.html
├── reports.html
├── notifications.html
├── settings.html
├── css/
│   ├── teacher.css
│   ├── attendance.css
│   └── reports.css
└── js/
    ├── login.js
    ├── dashboard.js
    ├── students.js
    ├── attendance.js
    ├── module-progress.js
    ├── reports.js
    ├── notifications.js
    └── settings.js
```

### Database Setup
Run all SQL files in order:
1. `database.sql` (Part 1 - Core tables)
2. `database-part2.sql` (Part 2 - Student portal additions)
3. `database-part3.sql` (Part 3 - Teacher portal additions)

### License
Proprietary — Globus Technical Academy
