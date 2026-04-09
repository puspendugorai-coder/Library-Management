title: Library Management System
emoji: 📚
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false📚 Library Management SystemA Modern, Full-Stack Solution for Seamless Book & Member Management🚀 Explore the Live Demo📖 OverviewThis Library Management System is a professional-grade web application designed to streamline the complexities of inventory tracking and member administration. Built with Flask and powered by a Supabase (PostgreSQL) backend, it ensures high performance, real-time data integrity, and enterprise-level security.✨ Key Features🔒 Intelligent AuthenticationSecure admin login with an integrated lockout mechanism (3 failed attempts trigger a 60-second cooldown) to prevent brute-force attacks.📈 Dynamic Inventory ControlReal-time synchronization between the database and UI. Book availability status updates instantly upon borrowing or returning.📊 Administrative Command CenterA centralized dashboard to monitor member details, track PRN numbers, and calculate overdue periods automatically.🛠️ Book Entry PortalAn intuitive interface for librarians to perform CRUD operations (Create, Read, Update, Delete) on the book repository.🔍 High-Performance SearchInstant, server-side filtering for both massive book catalogs and extensive customer databases.📱 Robust Data ValidationStrict regex-based enforcement for PRN formats, ID structures, and Mobile number integrity.🛠️ Tech StackComponentTechnologyBackendPython / FlaskDatabaseSupabase (PostgreSQL)DeploymentDocker / Hugging Face SpacesFrontendJinja2, CSS3 (Custom Modules), Vanilla JS📁 Project ArchitectureThe project follows a modular structure to ensure scalability and ease of maintenance:Plaintextlibrary_webapp/
├── 📄 app.py                # Core Flask application & RESTful API logic
├── 📋 requirements.txt      # Python package dependencies
├── 🐳 Dockerfile            # Containerization settings for cloud deployment
├── 🔑 .env                  # Environment variables (Sensitive Data)
├── 📂 templates/            # Dynamic Jinja2 HTML views
│   ├── login.html           # Secure entry point
│   ├── dashboard.html       # Member & Inventory overview
│   └── book_entry.html      # Librarian management tool
└── 📂 static/               # Optimized static assets
    ├── 🎨 css/              # Modular styles (auth, dashboard, book_entry)
    └── ⚡ js/               # Frontend logic (auth, dashboard, validation)
🚀 Getting StartedClone the RepositoryBashgit clone https://github.com/your-username/library-management.git
cd library-management
Environment SetupCreate a .env file and add your Supabase credentials:Code snippetSUPABASE_URL=your_url
SUPABASE_KEY=your_key
Run with DockerBashdocker build -t library-app .
docker run -p 7860:7860 library-app
Click here to open the Library AppDeveloped with ❤️ for efficient management.
