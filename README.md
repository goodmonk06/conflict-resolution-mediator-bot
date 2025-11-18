# Conflict Resolution Mediator Bot

An assistive tool for detecting potential conflicts in online communities and supporting human mediators through AI-powered suggestions and workflow management.

## ⚠️ Important: Ethical Boundaries

**This tool is designed to ASSIST, not REPLACE, human judgment in conflict resolution.**

### Core Principles

1. **Human Authority**: All mediation decisions must be made by qualified human mediators. AI suggestions are advisory only.

2. **Transparency**: All parties should be informed when AI is used for conflict detection or suggestion generation.

3. **Privacy**: Handle all conversation data with strict confidentiality. Ensure compliance with applicable privacy laws (GDPR, CCPA, etc.).

4. **No Automated Action**: This tool NEVER takes automated action on detected conflicts. Human review is always required.

5. **Bias Awareness**: AI models may reflect biases from training data. Mediators should critically evaluate all suggestions.

6. **Context Matters**: Automated detection cannot understand full context. False positives and negatives will occur.

### What This Tool IS

- ✅ A detection system to flag potential conflicts for human review
- ✅ A workflow management tool for mediators
- ✅ A suggestion generator to help craft mediation messages
- ✅ A tracking system for mediation progress

### What This Tool IS NOT

- ❌ An authority on what constitutes a conflict
- ❌ A replacement for trained human mediators
- ❌ A decision-making system for conflict resolution
- ❌ A surveillance or monitoring tool for punitive action
- ❌ A guarantee of conflict detection or resolution

---

## Features

### 1. Conflict Detection

- **AI-Powered Analysis**: Uses OpenAI GPT models to detect nuanced conflict patterns
- **Rule-Based Fallback**: Keyword-based detection when AI is unavailable
- **Scoring System**: 0-1 scale indicating conflict intensity
- **Signal Types**: Categorizes conflicts as potential, escalated, or resolved

### 2. Mediation Workflow

- **Case Management**: Track mediation cases from open to resolution
- **Step-by-Step Process**: Define and complete mediation steps
- **AI Suggestions**: Generate message drafts for different action types:
  - Reach out to parties
  - Schedule calls
  - Clarify misunderstandings
  - Reframe discussions
  - Document agreements

### 3. Admin Panel

- **Dashboard**: Overview of signals and cases
- **Case Detail View**: Full mediation workflow with step tracking
- **Signal Browser**: Review detected conflicts and their analysis

---

## Technology Stack

- **Backend**: Node.js, TypeScript, Fastify
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4 (optional, falls back to rule-based)
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Infrastructure**: Docker, Docker Compose

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- (Optional) OpenAI API key for AI-powered detection

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd conflict-resolution-mediator-bot
   ```

2. **Run the setup script**

   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

   This will:
   - Install all dependencies
   - Start PostgreSQL in Docker
   - Run database migrations
   - Seed demo data

3. **Configure environment variables**

   ```bash
   cp .env.example packages/backend/.env
   ```

   Edit `packages/backend/.env`:
   - `DATABASE_URL`: Already configured for local Docker
   - `OPENAI_API_KEY`: (Optional) Add your OpenAI API key
   - `PORT`: API server port (default: 3000)

4. **Start the development servers**

   ```bash
   npm run dev
   ```

   - Backend API: http://localhost:3000
   - Admin Panel: http://localhost:3001

---

## Usage

### Ingesting Conversations

Send conversation data to the detection API:

```bash
curl -X POST http://localhost:3000/api/detection/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "communityId": "my-community",
    "externalThreadId": "thread-123",
    "sourceType": "chat",
    "messages": [
      {
        "id": "msg-1",
        "author": "user1",
        "content": "I think approach A is better.",
        "timestamp": "2025-11-18T10:00:00Z"
      },
      {
        "id": "msg-2",
        "author": "user2",
        "content": "I disagree. Approach A is wrong and won'\''t work.",
        "timestamp": "2025-11-18T10:05:00Z"
      }
    ]
  }'
```

**Response:**

```json
{
  "thread": {
    "id": "...",
    "communityId": "my-community",
    "externalThreadId": "thread-123"
  },
  "detection": {
    "hasConflict": true,
    "score": 0.65,
    "signalType": "potential",
    "detectionMethod": "ai",
    "confidence": 0.82
  },
  "signal": {
    "id": "...",
    "signalType": "potential"
  },
  "mediationCase": null
}
```

### Managing Cases

1. **View cases in the admin panel** at http://localhost:3001/cases
2. **Click on a case** to see details and mediation steps
3. **Update case status** (open → in_progress → resolved)
4. **Assign mediators** by setting their email/ID
5. **Track step completion** by checking off completed steps

### Generating AI Suggestions

Use the API to generate mediation message suggestions:

```bash
curl -X POST http://localhost:3000/api/cases/{caseId}/steps/generate \
  -H "Content-Type: application/json" \
  -d '{
    "actionType": "reach_out"
  }'
```

---

## API Reference

### Detection Endpoints

- `POST /api/detection/ingest` - Ingest conversation and detect conflicts
- `GET /api/detection/status` - Check detection service status

### Case Endpoints

- `GET /api/cases` - List all cases (filterable by status, mediator)
- `GET /api/cases/:id` - Get case details
- `PATCH /api/cases/:id` - Update case (status, mediator, notes)
- `POST /api/cases/:id/steps` - Add a mediation step
- `POST /api/cases/:id/steps/generate` - Generate AI suggestion
- `PATCH /api/cases/:caseId/steps/:stepId` - Update a step
- `GET /api/cases/stats/summary` - Get case statistics

### Signal Endpoints

- `GET /api/signals` - List conflict signals (filterable)
- `GET /api/signals/:id` - Get signal details
- `GET /api/signals/stats/summary` - Get signal statistics

### Thread Endpoints

- `GET /api/threads` - List conversation threads
- `GET /api/threads/:id` - Get thread details
- `DELETE /api/threads/:id` - Delete thread

---

## Development

### Project Structure

```
conflict-resolution-mediator-bot/
├── packages/
│   ├── backend/              # Fastify API server
│   │   ├── src/
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic
│   │   │   ├── lib/          # Database, logger
│   │   │   └── types/        # TypeScript types & schemas
│   │   └── prisma/
│   │       ├── schema.prisma # Database schema
│   │       └── seed.ts       # Demo data
│   └── frontend/             # Next.js admin panel
│       └── app/              # Pages and components
├── scripts/
│   └── setup.sh              # Setup automation
└── docker-compose.yml        # PostgreSQL container
```

### Running Tests

```bash
cd packages/backend
npm test
```

### Database Management

```bash
# View database in Prisma Studio
npm run db:studio --workspace=backend

# Create a new migration
npm run db:migrate --workspace=backend

# Re-seed database
npm run db:seed --workspace=backend
```

### Building for Production

```bash
# Build all packages
npm run build

# Start backend in production mode
cd packages/backend
npm start

# Start frontend in production mode
cd packages/frontend
npm run build
npm start
```

---

## Configuration

### Environment Variables

**Backend (`packages/backend/.env`)**

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/conflict_mediator?schema=public"

# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# OpenAI (optional)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4-turbo-preview

# CORS
CORS_ORIGIN=http://localhost:3001
```

**Frontend (`packages/frontend/.env.local`)**

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Detection Methods

### AI Detection (Recommended)

When `OPENAI_API_KEY` is configured:

- Uses GPT-4 for nuanced analysis
- Higher accuracy and contextual understanding
- Generates detailed summaries
- Confidence typically 75-95%

### Rule-Based Detection (Fallback)

When AI is unavailable:

- Keyword matching across categories:
  - Disagreement: disagree, wrong, incorrect
  - Frustration: frustrated, annoying, ridiculous
  - Personal: always, never, attack
  - Escalation: unacceptable, demand, refuse
  - Resolution: agree, understand, sorry
- Heuristics for rapid exchanges, ALL CAPS, message length
- Confidence typically 50-80%

---

## Responsible Use Guidelines

### For Community Managers

1. **Inform Members**: Let your community know this tool is in use
2. **Review Regularly**: Don't rely solely on automated detection
3. **Respect Privacy**: Only analyze conversations with proper authorization
4. **Avoid Bias**: Don't use signals as proof of wrongdoing
5. **Train Mediators**: Ensure human mediators are properly trained

### For Developers

1. **Secure Data**: Encrypt conversation data in transit and at rest
2. **Audit Logs**: Track who accesses what case information
3. **Rate Limiting**: Prevent abuse of the detection API
4. **Model Updates**: Stay informed about AI model limitations
5. **Testing**: Test detection accuracy on your specific use case

### For Mediators

1. **Verify Context**: Always review original conversations
2. **Cultural Sensitivity**: Be aware of communication style differences
3. **Question Suggestions**: Don't copy AI suggestions verbatim
4. **Document Decisions**: Record why you agreed/disagreed with suggestions
5. **Continuous Learning**: Share feedback on detection accuracy

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart database
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs postgres
```

### AI Detection Not Working

- Verify `OPENAI_API_KEY` is set correctly
- Check API quota and billing status
- Review backend logs for error messages
- System will automatically fall back to rule-based detection

### Frontend Can't Connect to Backend

- Ensure backend is running on port 3000
- Check `NEXT_PUBLIC_API_URL` in frontend
- Verify CORS settings in backend

---

## Contributing

We welcome contributions that improve conflict detection accuracy, mediation workflows, or ethical safeguards.

### Areas for Contribution

- Additional detection heuristics
- Multilingual support
- Integration examples (Slack, Discord, etc.)
- Improved UI/UX for mediators
- Documentation and guides

### Before Contributing

Please ensure your changes:
- Include tests for new functionality
- Update documentation as needed
- Follow existing code style
- Respect ethical boundaries outlined above

---

## License

MIT License - See LICENSE file for details

---

## Support & Feedback

- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Share ideas and ask questions in GitHub Discussions
- **Documentation**: Full API docs available at `/api/docs` (when running)

---

## Acknowledgments

This tool is built on the understanding that:

- Conflict is natural in communities
- Early detection can prevent escalation
- Human empathy is irreplaceable in mediation
- Technology should empower, not replace, human mediators

We are grateful to the conflict resolution and community management professionals who informed this project's ethical guidelines.

---

**Remember**: This tool provides suggestions, not solutions. The path to resolution always involves human understanding, empathy, and judgment.
