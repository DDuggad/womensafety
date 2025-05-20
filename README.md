# womensafety
Hackathon project

## About SAFEHer

SAFEHer is a comprehensive women's safety application developed initially as part of a hackathon at BMS College of Engineering, later re-worked and enhanced to create a complete production-ready solution. The application leverages modern technologies including AI-powered safety analysis to help women feel more secure when traveling alone.

## 🔒 Core Features

### Real-time Safety Tools
- **Voice Detection Alert**: Automatically detects distress keywords (like "help") and triggers emergency protocols
- **Shake Detection**: Shake your phone to trigger emergency alerts without unlocking your device
- **One-Touch Panic Button**: Instantly send your location and distress signal to emergency contacts

### Smart Navigation
- **AI-Powered Safe Route Planning**: Analyzes multiple routes and recommends the safest path based on real-time safety data
- **Location Safety Analysis**: Evaluates your current location and provides safety scores using Google's Gemini AI
- **Safety Tips**: Provides contextual safety recommendations for your specific route or location

### Emergency Response
- **Multi-Channel Alerts**: Sends emergency alerts through WhatsApp, SMS, and email
- **Live Location Sharing**: Shares precise GPS coordinates with emergency contacts
- **Automated Safety Analysis**: Continuously monitors surrounding areas as you move

## 🛠️ Technologies Used

- **Frontend**: HTML, CSS, JavaScript, EJS templating
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: Session-based authentication with bcrypt
- **APIs**:
  - Google Maps JavaScript API for mapping and location services
  - Google Places API for location search and autocomplete
  - Google Gemini AI for safety analysis and route recommendations
- **Other Services**:
  - Email notifications
  - GPS location tracking
  - Voice recognition
  - Device motion detection

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Google Maps API key
- Google Gemini API key

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/safeher.git
   cd safeher
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root with the following variables:
   ```
   MONGO_URI=mongodb://127.0.0.1:27017/womensafety
   GOOGLE_MAPS_KEY=your_google_maps_api_key
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key
   EMAIL_USER=your_email_address
   EMAIL_PASS=your_email_password
   SESSION_SECRET=your_session_secret
   ```

4. Start the application:
   ```bash
   npm start
   ```

5. Access the application at: `http://localhost:8080`

## 📱 How to Use

### Initial Setup
1. Create an account with your email and password
2. Add at least one emergency contact (phone number and email)
3. Allow location and microphone permissions when prompted

### Daily Use
1. Open the app when you're traveling
2. Enable voice detection to activate hands-free emergency mode
3. Use the map to plan your journey with the safest routes
4. In case of emergency:
   - Press the panic button
   - Say "help" loudly (if voice detection is enabled)
   - Shake your phone vigorously (if shake detection is enabled)

## 🌟 Project Evolution

This project was initially developed as an entry for a hackathon at BMS College of Engineering. After the hackathon, several significant improvements were made to transform it into a production-ready application:

- **Enhanced AI Integration**: Added Google Gemini AI for more accurate safety analysis
- **Improved UI/UX**: Completely redesigned interface for better user experience
- **Expanded Safety Features**: Added voice recognition and shake detection
- **Better Route Analysis**: Implemented multi-route safety comparison
- **Mobile Optimization**: Improved responsive design for all device sizes
- **Performance Enhancements**: Optimized server communication and data processing
- **Security Improvements**: Enhanced authentication and data protection

## 👥 Contributors

- Original Hackathon Team - BMS College of Engineering
  - Divyansh Duggad
  - Chirag M (teammate who helped during the hackathon)
- Testing during hackathon by Priyanka Chourasia
- Further development and enhancements by Divyansh Duggad

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Gradient.ai & BMS College of Engineering for organizing the hackathon that initiated this project
- Google Cloud for providing the AI and mapping technologies
- All contributors and testers who helped improve the application

---

**Note:** SAFEHer is designed as a safety tool but cannot guarantee absolute safety in all situations. Always exercise caution and contact local emergency services in case of immediate danger.
