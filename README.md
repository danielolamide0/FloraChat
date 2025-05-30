# FloraChat by Synaptide AI

A cutting-edge plant species identification and exploration platform that leverages advanced image recognition technology to transform botanical discovery into an interactive, educational experience.

![FloraChat Banner](./client/src/assets/relaxing-in-nature.webp)

## 🌱 Features

- **Plant Species Identification**: Real-time plant recognition using PlantNet API
- **AI-Powered Chatbot**: Interactive OpenAI GPT-powered assistant for plant information
- **User Authentication**: Secure Firebase-based user management
- **History & Favorites**: Save and organize your plant discoveries
- **Reference Images**: Compare your photos with professional botanical images
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Offline-First Storage**: Reliable localStorage with cloud synchronization

## 🚀 Technology Stack

### Frontend
- **React** with TypeScript
- **Tailwind CSS** + **Shadcn UI** components
- **Wouter** for routing
- **TanStack React Query** for data fetching
- **Space Grotesk** typography

### Backend
- **Express.js** on Node.js
- **TypeScript** for type safety
- **Firebase Admin SDK** for authentication
- **Drizzle ORM** with PostgreSQL

### External APIs
- **PlantNet API** - Plant species recognition
- **OpenAI API** - Conversational plant information
- **Wikimedia Commons API** - Reference plant images

### Storage & Database
- **Firebase Firestore** - Primary cloud storage
- **Firebase Storage** - Image persistence
- **PostgreSQL** - Backup database
- **localStorage** - Offline-first approach

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** database (optional - for backup storage)

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=your_postgresql_connection_string
PGHOST=your_pg_host
PGPORT=your_pg_port
PGUSER=your_pg_user
PGPASSWORD=your_pg_password
PGDATABASE=your_pg_database

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account_json

# Frontend Firebase Variables
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_APP_ID=your_firebase_app_id

# External APIs
PLANTNET_API_KEY=your_plantnet_api_key
OPENAI_API_KEY=your_openai_api_key
```

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/danielolamide0/FloraChat.git
   cd FloraChat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication and Firestore Database
   - Enable Google sign-in method in Authentication
   - Download the service account key and add it to your environment variables
   - Add your domain to authorized domains in Firebase Authentication settings

4. **Set up PlantNet API**
   - Register at [PlantNet API](https://my.plantnet.org/)
   - Get your API key and add it to environment variables

5. **Set up OpenAI API**
   - Create an account at [OpenAI Platform](https://platform.openai.com/)
   - Generate an API key and add it to environment variables

6. **Set up PostgreSQL (Optional)**
   - Create a PostgreSQL database
   - Add connection details to environment variables

7. **Run database migrations** (if using PostgreSQL)
   ```bash
   npm run db:push
   ```

8. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 📱 Usage

1. **Plant Identification**
   - Upload an image or take a photo of a plant
   - Wait for the AI to identify the species
   - View detailed information including scientific name, family, and confidence score

2. **AI Chatbot**
   - Ask questions about identified plants
   - Get care tips, growing conditions, and interesting facts
   - Engage in natural conversation about botany

3. **Save Favorites**
   - Mark interesting plants as favorites
   - Access your favorites from the navigation menu
   - Organize your botanical discoveries

4. **View History**
   - Browse all your previous plant identifications
   - Search through your identification history
   - Re-examine past discoveries

## 🏗️ Project Structure

```
FloraChat/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and configurations
│   │   └── assets/         # Static assets
├── server/                 # Backend Express application
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Data storage interfaces
│   ├── firebase.ts         # Firebase client configuration
│   ├── firebase-admin.ts   # Firebase Admin SDK
│   └── utils/              # Server utilities
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle database schemas
└── package.json            # Project dependencies
```

## 🔐 Security

- User authentication handled by Firebase
- API keys stored securely in environment variables
- Input validation using Zod schemas
- CORS protection and rate limiting implemented

## 🚀 Deployment

### Replit Deployment (Recommended)
1. Import the project to Replit
2. Set up environment variables in Replit Secrets
3. Click "Deploy" button for automatic deployment

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy to your preferred hosting platform
3. Set up environment variables in your hosting platform
4. Configure your domain in Firebase authorized domains

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Daniel Olamide**
- GitHub: [@danielolamide0](https://github.com/danielolamide0)
- Email: danielolamid3@gmail.com

## 🙏 Acknowledgments

- **PlantNet** for providing the plant identification API
- **OpenAI** for the conversational AI capabilities
- **Wikimedia Commons** for botanical reference images
- **Firebase** for authentication and cloud storage
- **Replit** for development and hosting platform

## 📈 Project Report

For a detailed project report including technical specifications and implementation details, see [PROJECT_REPORT.md](PROJECT_REPORT.md).

---

Built with ❤️ for plant lovers and gardening enthusiasts worldwide.