# Project Report: FloraChat by Synaptide AI

## Project Idea

FloraChat is an innovative plant identification application designed for plant lovers and gardening enthusiasts. The platform combines advanced image recognition technology with conversational AI to transform botanical discovery into an intuitive, educational experience. Users can upload plant images for instant species identification and engage with an AI-powered chatbot that provides detailed botanical information in a conversational format.

## Functionalities & Applications

### Plant Identification
- Real-time plant species recognition using PlantNet API integration
- Detailed identification results including scientific name, common name, family, genus, and confidence score
- Reference images from Wikimedia for comparison and verification

### Interactive AI-Powered Chatbot
- OpenAI GPT-powered assistant that provides contextual plant information
- Conversational interface for learning about care requirements, growing conditions, and interesting facts
- Structured responses similar to ChatGPT's information formatting

### User Management System
- Simple username-based authentication with Firebase
- Personalized experience with user-specific data storage
- Secure user data handling with Firebase Admin SDK implementation

### History & Favorites Management
- Reliable localStorage-first approach for saving identification history
- Ability to mark plants as favorites for future reference
- Background synchronization with Firebase for cross-device access
- Clean interface for browsing past identifications

### Image Processing
- Support for both camera capture and file uploads
- Large image handling (up to 25MB) with automatic compression
- Data persistence for offline viewing of previously identified plants

## Software Stack & Framework

### Frontend Technologies
- **React** with TypeScript for UI development
- **Tailwind CSS** with Shadcn UI components for responsive design
- **Space Grotesk** font family for consistent typography
- Translucent UI elements to showcase nature theme and background imagery

### Backend Framework
- **Express.js** on Node.js runtime for API endpoints and server logic
- **TypeScript** for type-safe development across the stack

### Storage & Data Management
- **localStorage** as primary storage for reliability and offline access
- **Firebase Firestore** for cloud synchronization and backup
- **Firebase Storage** for image persistence
- **PostgreSQL** database with Drizzle ORM as tertiary backup

### External APIs
- **PlantNet API** for plant species recognition
- **OpenAI API** (GPT-4o) for conversational plant information
- **Wikimedia Commons API** for reference plant images

### Authentication & Security
- **Firebase Authentication** for user management
- **Firebase Admin SDK** for server-side validation and security

## Conclusion

FloraChat successfully bridges the gap between technology and botanical discovery, making plant identification and learning accessible to anyone with a smartphone or computer. The application's unique combination of visual recognition and conversational AI creates an engaging platform that not only identifies plants but also educates users about them.

The implementation of a localStorage-first approach with remote synchronization ensures that users can reliably save their plant discoveries and access them across sessions, even in areas with limited connectivity. This design choice prioritizes user experience while maintaining the benefits of cloud storage.

The use of transparent UI elements and a nature-focused design language creates an immersive experience that complements the application's purpose. The Space Grotesk typography provides a modern, clean aesthetic that enhances readability while maintaining visual appeal.

FloraChat demonstrates how combining multiple APIs (PlantNet, OpenAI, and Wikimedia) can create a seamless experience greater than the sum of its parts. The project serves as an excellent example of how modern web technologies can be leveraged to create specialized tools that enhance our connection with and understanding of the natural world.