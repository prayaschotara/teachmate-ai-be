# 🚀 TeachMate AI - Backend API

> Express.js REST API with AI-powered educational agents

A robust backend API that powers the TeachMate AI platform, featuring AI agents for content generation, vector search capabilities, and comprehensive educational management.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [AI Agents](#ai-agents)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Database Models](#database-models)

## ✨ Features

### Core Features
- 🔐 JWT-based authentication and authorization
- 👥 Multi-role support (Student, Parent, Admin)
- 📚 Content management system
- 📝 Assessment creation and submission
- 📊 Performance analytics
- 💬 AI-powered chatbot
- 🎤 Voice interaction with Retell AI

### AI-Powered Features
- 🤖 Automated lesson plan generation
- 📄 PDF content extraction and chunking
- ✅ Smart assessment creation
- 🔍 Vector-based semantic search (Pinecone)
- 💡 Intelligent content recommendations

### Parent Features
- 👨‍👩‍👧 Multi-child management
- 📈 Child performance tracking
- 💬 Parent AI assistant
- 📊 Detailed analytics

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js v4.21
- **Database:** MongoDB with Mongoose v8.19
- **Authentication:** JWT (jsonwebtoken v9.0)
- **Password Hashing:** bcrypt v5.1
- **Validation:** express-validator v7.2
- **AI/ML:**
  - OpenRouter API (via axios)
  - Pinecone Vector Database v6.1
  - Retell SDK v4.58
- **PDF Processing:** pdf2json v3.1
- **Text Chunking:** @chonkiejs/core v0.0.5
- **File Upload:** multer v1.4
- **Scheduling:** node-cron v4.2
- **Logging:** morgan v1.10
- **CORS:** cors v2.8

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- MongoDB v6 or higher
- npm or yarn

### Installation

1. **Clone and navigate to backend**
```bash
cd teachmate-ai-be
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/teachmate

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# AI Services
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free

# Vector Database
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=teachmate-content
PINECONE_ENVIRONMENT=us-east-1

# Voice AI
RETELL_API_KEY=your_retell_api_key

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

4. **Start MongoDB**
```bash
mongod
```

5. **Run the development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 📁 Project Structure

```
teachmate-ai-be/
├── src/
│   ├── agents/                    # AI agent implementations
│   │   ├── agent1-lesson-plan.js  # Lesson plan generator
│   │   ├── agent2-content.js      # Content curator
│   │   └── agent3-assessment.js   # Assessment generator
│   │
│   ├── controllers/               # Request handlers
│   │   ├── auth.controller.js
│   │   ├── student.controller.js
│   │   ├── parent.controller.js
│   │   ├── assessment.controller.js
│   │   ├── content.controller.js
│   │   └── chatbot.controller.js
│   │
│   ├── models/                    # MongoDB schemas
│   │   ├── Student.model.js
│   │   ├── Parent.model.js
│   │   ├── Admin.model.js
│   │   ├── Assessment.model.js
│   │   ├── Submission.model.js
│   │   ├── Content.model.js
│   │   └── ChatSession.model.js
│   │
│   ├── routes/                    # API routes
│   │   ├── auth.router.js
│   │   ├── student.router.js
│   │   ├── parent.router.js
│   │   ├── assessment.router.js
│   │   └── chatbot.router.js
│   │
│   ├── services/                  # Business logic
│   │   ├── auth.service.js
│   │   ├── pinecone.service.js
│   │   ├── openrouter.service.js
│   │   └── pdf.service.js
│   │
│   ├── middlewares/               # Custom middleware
│   │   ├── auth.middleware.js     # JWT validation
│   │   ├── error.middleware.js    # Error handling
│   │   └── validation.middleware.js
│   │
│   ├── helpers/                   # Utility functions
│   │   ├── response.helper.js
│   │   └── templates/
│   │
│   └── scripts/                   # CLI tools & tests
│       ├── generate-resource.js
│       ├── test-pinecone.js
│       ├── test-openrouter.js
│       ├── test-agent1-no-db.js
│       ├── test-agent2.js
│       ├── test-agent3-session.js
│       └── index-content.js
│
├── uploads/                       # File uploads directory
├── app.js                        # Express app configuration
├── package.json
└── .env
```

## 📡 API Documentation

### Authentication Endpoints

#### Register Student
```http
POST /api/auth/register/student
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "class": "10",
  "grade": "A"
}
```

#### Register Parent
```http
POST /api/auth/register/parent
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securePassword123",
  "children": [
    {
      "student_id": "507f1f77bcf86cd799439011",
      "name": "John Doe"
    }
  ]
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "student"
}
```

### Student Endpoints

#### Get Student Performance
```http
GET /api/assessment/student/performance
Authorization: Bearer <token>
```

#### Submit Assessment
```http
POST /api/assessment/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "assessment_id": "507f1f77bcf86cd799439011",
  "answers": [
    {
      "question_id": "q1",
      "answer": "Paris"
    }
  ]
}
```

### Parent Endpoints

#### Get Child Performance
```http
GET /api/assessment/child/performance?child_id=507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

#### Parent Chat Session
```http
POST /api/chatbot/parent/session
Authorization: Bearer <token>
Content-Type: application/json

{
  "parent_id": "507f1f77bcf86cd799439011",
  "child_id": "507f1f77bcf86cd799439012"
}
```

### Content Endpoints

#### Upload PDF Content
```http
POST /api/content/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <pdf-file>
subject: "Mathematics"
class: "10"
grade: "A"
```

#### Search Content
```http
GET /api/content/search?query=algebra&subject=Mathematics
Authorization: Bearer <token>
```

### Assessment Endpoints

#### Create Assessment
```http
POST /api/assessment/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Chapter 1 Quiz",
  "subject": "Mathematics",
  "class": "10",
  "grade": "A",
  "questions": [...]
}
```

#### Get Assessments
```http
GET /api/assessment/list?class=10&grade=A
Authorization: Bearer <token>
```

## 🤖 AI Agents

### Agent 1: Lesson Plan Generator
Generates structured lesson plans based on curriculum requirements.

**Features:**
- Topic breakdown
- Learning objectives
- Teaching strategies
- Time allocation

**Usage:**
```bash
npm run test-agent1
```

### Agent 2: Content Curator
Extracts and organizes content from PDF documents.

**Features:**
- PDF text extraction
- Intelligent chunking
- Metadata extraction
- Vector embedding generation

**Usage:**
```bash
npm run test-agent2
```

### Agent 3: Assessment Generator
Creates assessments based on content and learning objectives.

**Features:**
- Multiple question types
- Difficulty levels
- Auto-grading support
- Performance analytics

**Usage:**
```bash
npm run test-agent3-session
npm run test-agent3-chapter
```

## 📜 Scripts

### Development
```bash
npm run dev                    # Start development server with nodemon
```

### Resource Generation
```bash
npm run generate-resource <name>  # Generate controller, service, and router
```

### Testing & Utilities
```bash
npm run test-pinecone         # Test Pinecone connection
npm run test-openrouter       # Test OpenRouter API
npm run test-chunking         # Test text chunking
npm run check-setup           # Verify API configurations
npm run test-agent1           # Test lesson plan agent
npm run test-agent2           # Test content curation agent
npm run test-agent3-session   # Test assessment agent (session)
npm run test-agent3-chapter   # Test assessment agent (chapter)
npm run test-agent4           # Test grading agent
npm run test-agent4-db        # Test grading agent with DB
npm run test-chatbots         # Test chatbot functionality
npm run test-voice-functions  # Test voice features
npm run test-submission       # Test submission workflow
npm run index-content         # Index content to Pinecone
npm run chunk-science         # Chunk science content
```

## 🔐 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT | Yes | - |
| `JWT_EXPIRES_IN` | JWT expiration time | No | 7d |
| `OPENROUTER_API_KEY` | OpenRouter API key | Yes | - |
| `OPENROUTER_MODEL` | AI model to use | No | meta-llama/llama-3.1-8b-instruct:free |
| `PINECONE_API_KEY` | Pinecone API key | Yes | - |
| `PINECONE_INDEX_NAME` | Pinecone index name | Yes | - |
| `PINECONE_ENVIRONMENT` | Pinecone environment | Yes | - |
| `RETELL_API_KEY` | Retell AI API key | Yes | - |
| `MAX_FILE_SIZE` | Max upload file size (bytes) | No | 10485760 |
| `UPLOAD_PATH` | Upload directory path | No | ./uploads |

## 💾 Database Models

### Student
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  class: String,
  grade: String,
  created_at: Date,
  updated_at: Date
}
```

### Parent
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  children: [{
    student_id: ObjectId,
    name: String
  }],
  created_at: Date,
  updated_at: Date
}
```

### Assessment
```javascript
{
  title: String,
  subject: String,
  class: String,
  grade: String,
  questions: [{
    question_id: String,
    question_text: String,
    options: [String],
    correct_answer: String,
    marks: Number
  }],
  total_marks: Number,
  duration: Number,
  created_by: ObjectId,
  created_at: Date
}
```

### Submission
```javascript
{
  student_id: ObjectId,
  assessment_id: ObjectId,
  answers: [{
    question_id: String,
    answer: String,
    is_correct: Boolean,
    marks_obtained: Number
  }],
  total_marks_obtained: Number,
  percentage: Number,
  submitted_at: Date
}
```

### Content
```javascript
{
  title: String,
  subject: String,
  class: String,
  grade: String,
  content_type: String,
  file_path: String,
  chunks: [{
    text: String,
    embedding: [Number],
    metadata: Object
  }],
  created_at: Date
}
```

## 🔧 Middleware

### Authentication Middleware
Validates JWT tokens and attaches user information to requests.

```javascript
const { validateToken } = require('./middlewares/auth.middleware');

router.get('/protected', validateToken, controller.method);
```

### Error Handling Middleware
Centralized error handling with consistent response format.

```javascript
app.use(errorHandler);
```

### Validation Middleware
Request validation using express-validator.

```javascript
const { body } = require('express-validator');

router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], controller.register);
```

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

## 🧪 Testing

Run individual test scripts to verify functionality:

```bash
# Test API connections
npm run check-setup

# Test AI agents
npm run test-agent1
npm run test-agent2
npm run test-agent3-session

# Test integrations
npm run test-pinecone
npm run test-openrouter
npm run test-chatbots
```

## 🤝 Contributing

1. Follow the existing code structure
2. Use the resource generator for new features: `npm run generate-resource <name>`
3. Add appropriate validation and error handling
4. Update documentation for new endpoints
5. Test thoroughly before submitting PRs

## 📝 Additional Documentation

- [Child Performance API](./CHILD_PERFORMANCE_API.md)
- [Agent Workflow](./AGENT_WORKFLOW.md) (if exists)

## 🐛 Common Issues

### MongoDB Connection Error
Ensure MongoDB is running: `mongod`

### JWT Secret Missing
Set `JWT_SECRET` in your `.env` file

### Pinecone Index Not Found
Create index in Pinecone dashboard or run: `npm run index-content`

### File Upload Fails
Check `UPLOAD_PATH` directory exists and has write permissions

## 📄 License

ISC License

---

Built with ❤️ for better education
