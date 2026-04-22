<div align="center">
<img width="1200" height="475" alt="Cloud Computing Crime Reporting App" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Cloud Computing Crime Reporting Application

A modern, responsive crime reporting and management system built with React, TypeScript, and Firebase. Features real-time crime mapping, evidence management, and AI-powered chatbot assistance.

## [**Live Application**](https://princekumarjha83-oss.github.io/cloud-computing-project/) - Click to view deployed application

![GitHub Pages Deployment](https://github.com/princekumarjha83-oss/cloud-computing-project/actions/workflows/deploy.yml/badge.svg) 

## Features

- **Real-time Crime Dashboard** - Interactive dashboard with crime statistics and trends
- **Interactive Crime Map** - Geographic visualization of crime incidents
- **Evidence Vault** - Secure storage and management of case evidence
- **AI Chatbot Assistant** - 24/7 intelligent assistance for reporting and queries
- **Admin Panel** - Comprehensive administrative controls and analytics
- **Real-time Notifications** - Instant alerts and updates
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices

## Technology Stack

- **Frontend**: React 19, TypeScript, TailwindCSS, Framer Motion
- **Backend**: Firebase (Firestore, Authentication)
- **Deployment**: AWS Amplify
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Charts**: Recharts

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/princekumarjha83-oss/cloud-computing-project.git
   cd cloud-computing-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your Firebase configuration and API keys

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`

## Deployment

### GitHub Pages (Recommended)

This application is configured for automatic deployment to GitHub Pages:

1. **Automatic Deployment**: The app automatically deploys when you push to the `master` branch
2. **Live URL**: https://princekumarjha83-oss.github.io/cloud-computing-project/
3. **Build Status**: Check the badge above for deployment status

### Manual Deployment

To deploy manually:

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to GitHub Pages**:
   ```bash
   npm run deploy
   ```

### Environment Setup

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Add your API keys** to the `.env` file:
   - `GEMINI_API_KEY`: For AI chatbot features (optional)
   - `VITE_FIREBASE_*`: Firebase configuration (optional)

### AWS Amplify (Alternative)

You can also deploy to AWS Amplify:

1. **Visit AWS Amplify Console**: https://console.aws.amazon.com/amplify/home
2. **Connect GitHub Repository**: Select `princekumarjha83-oss/cloud-computing-project`
3. **Configure Build Settings**: Use the provided `amplify.yml`
4. **Deploy**: Your app will be live at `https://master.[appid].amplifyapp.com`

### Manual Build

```bash
# Build for production
npm run build

# Preview the build
npm run preview
```

## Project Structure

```
src/
  components/          # Reusable UI components
    - AdminPanel.tsx
    - Chatbot.tsx
    - CrimeMap.tsx
    - Dashboard.tsx
    - EvidenceVault.tsx
    - ReportCrime.tsx
  lib/                # Utility functions
  firebase.ts         # Firebase configuration
  App.tsx             # Main application component
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue on GitHub or contact the development team.

---

**Built with React, TypeScript, and AWS Amplify**
