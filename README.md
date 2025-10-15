# CBT (Computer-Based Testing) System

A comprehensive, secure, and scalable web-based examination platform built with modern technologies.

## 🚀 Features

### For Students
- ✅ Account creation and profile management
- ✅ Take exams with countdown timer
- ✅ Multiple question types support
- ✅ Auto-save functionality
- ✅ View results and performance history
- ✅ Responsive design for all devices

### For Administrators
- ✅ Secure admin dashboard with 2FA
- ✅ Create and manage exams
- ✅ Bulk import/export (students, questions)
- ✅ Real-time exam monitoring
- ✅ Automatic and manual grading
- ✅ Comprehensive analytics and reporting
- ✅ Export results to PDF, CSV, Excel, DOCX
- ✅ Anti-cheating features

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (React 18, TypeScript)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: Zustand, React Query
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Rich Text**: Tiptap

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js (TypeScript)
- **Database**: MongoDB Atlas
- **Cache**: Redis
- **Authentication**: JWT + Passport.js
- **File Storage**: Cloudinary / AWS S3
- **Email**: Nodemailer + SendGrid
- **PDF/Excel**: Puppeteer, ExcelJS

### DevOps
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry
- **Version Control**: Git + GitHub

## 📁 Project Structure

```
cbt-system/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js 14 app router
│   │   ├── components/      # Reusable components
│   │   ├── lib/             # Utilities and helpers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # Zustand stores
│   │   └── types/           # TypeScript types
│   ├── public/              # Static assets
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                  # Express.js backend application
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # Mongoose models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Custom middleware
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   └── config/          # Configuration files
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                     # Documentation
│   └── PRD.md               # Product Requirements Document
│
├── architecture/             # Architecture documentation
│   └── ARCHITECTURE.md
│
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ LTS
- MongoDB Atlas account
- Redis instance (optional for development)
- Git

### Installation

#### 1. Clone the repository
```bash
git clone <repository-url>
cd cbt-system
```

#### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### 3. Setup Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your configuration
npm run dev
```

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=your_redis_url (optional)

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com

# File Upload
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_APP_NAME=CBT System
```

## 📚 API Documentation

API documentation is available at `http://localhost:5000/api-docs` when running the backend in development mode.

### Key API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

#### Exams (Admin)
- `GET /api/v1/exams` - Get all exams
- `POST /api/v1/exams` - Create new exam
- `GET /api/v1/exams/:id` - Get exam details
- `PUT /api/v1/exams/:id` - Update exam
- `DELETE /api/v1/exams/:id` - Delete exam

#### Student Exams
- `GET /api/v1/student/exams` - Get assigned exams
- `POST /api/v1/student/exams/:id/start` - Start exam
- `PUT /api/v1/student/exams/:id/answer` - Save answer
- `POST /api/v1/student/exams/:id/submit` - Submit exam

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

## 🏗️ Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy automatically on push to main

### Backend (Render)
1. Push code to GitHub
2. Connect repository to Render
3. Set environment variables
4. Configure health check endpoint: `/api/v1/health`
5. Deploy automatically on push to main

## 📊 Performance

- **Page Load Time**: < 2 seconds
- **API Response Time**: < 500ms (95th percentile)
- **Concurrent Users**: 10,000+
- **Uptime**: 99.9% SLA

## 🔐 Security Features

- JWT authentication with refresh tokens
- 2FA for admin accounts (TOTP)
- Password hashing with bcrypt (cost factor 12)
- Rate limiting on all endpoints
- CORS configuration
- Helmet.js security headers
- Input validation and sanitization
- XSS and CSRF protection
- Full-screen enforcement during exams
- Tab switching detection
- Copy/paste prevention
- Anti-cheating logging

## 📈 Monitoring & Logging

- Error tracking with Sentry
- Application Performance Monitoring
- Structured logging with Winston
- Uptime monitoring
- Real-time alerts for critical issues

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- Product Manager: [Name]
- Lead Developer: [Name]
- Frontend Developer: [Name]
- Backend Developer: [Name]
- UI/UX Designer: [Name]

## 📞 Support

For support, email support@cbt-system.com or join our Slack channel.

## 🗺️ Roadmap

### Phase 1 (Completed)
- ✅ User authentication
- ✅ Basic exam creation
- ✅ Exam taking interface
- ✅ Automatic grading

### Phase 2 (In Progress)
- 🔄 Advanced analytics
- 🔄 Bulk import/export
- 🔄 Email notifications
- 🔄 2FA implementation

### Phase 3 (Planned)
- 📋 AI-powered question generation
- 📋 Advanced proctoring
- 📋 Mobile app
- 📋 LMS integrations

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- shadcn for the beautiful UI components
- MongoDB for the flexible database
- All contributors and supporters

---

**Built with ❤️ by the CBT System Team**

