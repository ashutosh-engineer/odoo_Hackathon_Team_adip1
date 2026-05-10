# 🔧 Development Workflow & Final Checklist

---

## Git Commit Strategy

Every feature goes through this cycle **before** moving to the next one:

```
Code → Test → Stage → Commit → Push
```

### Commit Flow

| Step | Action | Example |
|------|--------|---------|
| 1 | Implement the feature fully | Write models, routes, templates |
| 2 | Stage all related changes | `git add .` |
| 3 | Commit with a clear message | `git commit -m "feat: add employee model with CRUD operations"` |
| 4 | Push to remote | `git push origin main` |
| 5 | Move to next feature | Repeat |

### Commit Message Convention

```
<type>: <short description>

Types:
  init     → project setup, boilerplate
  feat     → new feature
  fix      → bug fix
  refactor → code restructure (no new feature)
  style    → UI/CSS changes
  docs     → README, comments, documentation
  db       → database schema, migrations
  security → auth, validation, vulnerability fixes
  test     → adding/updating tests
```

**Examples:**
```
init: project scaffold with Odoo module structure
feat: add leave request model with approval workflow
db: create employee and department tables with relationships
style: implement dashboard UI with modern card layout
docs: add full README with architecture and API docs
security: add input validation and CSRF protection
```

### What Gets Grouped in ONE Commit

> [!IMPORTANT]
> One commit = one logical unit of work. Not one file, not one line — one **feature/change**.

| ✅ One Commit | ❌ Separate Commits |
|---------------|---------------------|
| Model + its routes + its template | Model in one, routes in another |
| CSS for a specific page | Random CSS fixes across pages |
| Full CRUD for an entity | Create in one, Read in another |
| README update after a feature | Partial README updates |

---

## Development Order (Phase by Phase)

Each phase below = **at least 1 commit + push**

### Phase 1: Project Setup
```
- Initialize project structure
- Set up database connection
- Create base configuration
- Commit: "init: project scaffold with base config and DB setup"
- Push
```

### Phase 2: Database & Models
```
- Create all tables/models with relationships
- Add indexing
- Commit: "db: create core models with schema and relationships"
- Push
```

### Phase 3: Backend Logic (per feature)
```
- Implement feature X (model + service + routes)
- Commit: "feat: add <feature X> with full CRUD and business logic"
- Push
- Repeat for each feature
```

### Phase 4: UI/UX (per page)
```
- Build page layout + styling + interactions
- Commit: "style: implement <page name> with responsive layout"
- Push
- Repeat for each page
```

### Phase 5: Security
```
- Add auth, validation, CSRF, sanitization
- Commit: "security: add authentication and input validation layer"
- Push
```

### Phase 6: Polish & Edge Cases
```
- Error handling, logging, edge cases
- Commit: "fix: add error handling and logging across modules"
- Push
```

### Phase 7: Documentation
```
- Write full README with all 12 sections
- Commit: "docs: add comprehensive README with architecture and decisions"
- Push
```

---

## README Structure (What Goes Where)

The README will be written as the **final phase**, covering everything built:

```markdown
# Project Name

## 1. Problem Statement
   - What problem we're solving
   - Inputs, outputs, constraints
   - Core entities identified

## 2. Features
   - MVP features (what's built)
   - Optional features (if implemented)

## 3. Tech Stack
   - Each technology + WHY it was chosen
   - Why alternatives were rejected

## 4. Architecture (HLD)
   - System design diagram (Mermaid)
   - Component breakdown
   - Data flow explanation
   - Why this architecture
   - Known trade-offs and limitations

## 5. Database Design
   - ER diagram (Mermaid)
   - Table schemas with field types
   - Relationships explained
   - Indexing strategy + reasoning
   - Limitations acknowledged

## 6. API Documentation
   - Endpoint table (method, path, description)
   - Request/response examples
   - Business logic flow per endpoint
   - Edge cases handled

## 7. UI/UX Decisions
   - Pages and components
   - Layout reasoning
   - User flow explanation

## 8. Security
   - Auth mechanism + why
   - Validation approach
   - Vulnerabilities prevented

## 9. Scalability
   - Current capacity
   - Growth strategy
   - Caching possibilities
   - Trade-offs

## 10. Logging & Debugging
   - Logging strategy
   - Error handling approach
   - How to trace issues

## 11. Setup & Installation
   - Prerequisites
   - Step-by-step setup
   - Environment variables
   - How to run

## 12. Design Decisions
   - Every major "WHY" consolidated
   - Trade-offs accepted
   - What would change at scale
```

---

## Final Output Checklist

Before declaring "done", verify every item:

| # | Check | Status |
|---|-------|--------|
| 1 | Code is clean, modular, well-structured | ⬜ |
| 2 | Every function/block has meaningful comments | ⬜ |
| 3 | Minimal third-party dependencies | ⬜ |
| 4 | Local database used (no Firebase/external) | ⬜ |
| 5 | Consistent, modern UI across all pages | ⬜ |
| 6 | All commits are pushed to GitHub | ⬜ |
| 7 | Commit messages follow convention | ⬜ |
| 8 | README covers all 12 sections | ⬜ |
| 9 | Security measures in place | ⬜ |
| 10 | Error handling and logging implemented | ⬜ |
| 11 | Code looks human-written, not AI-generated | ⬜ |
| 12 | Ready for demo video | ⬜ |

---

> [!TIP]
> **Golden Rule:** After every feature — commit and push. Never accumulate uncommitted work across multiple features.
