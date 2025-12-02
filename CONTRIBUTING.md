# Contributing to Platinum Courier Services

This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Branch Workflow](#branch-workflow)
- [Making Changes](#making-changes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Development Setup](#development-setup)

## Getting Started

1. **Fork the repository** Clone directly
2. **Set up your development environment** following the instructions in [README.md](README.md)
3. **Check existing issues** or create a new one to discuss your proposed changes

## Branch Workflow

We follow a structured branching strategy to maintain code quality and enable smooth collaboration:

### Branch Structure

```
main (production-ready code)
  ↑
  └── dev (active development)
       ↑
       ├── feature/feature-name
       ├── bugfix/bug-description
       ├── hotfix/critical-fix
       └── refactor/refactor-description
```

### Branch Descriptions

- **`main`**: Production-ready code. Only updated via pull requests from `dev` after thorough testing.
- **`dev`**: Active development branch. All feature branches are created from here and merged back here.
- **`feature/*`**: New features or enhancements
- **`bugfix/*`**: Bug fixes for issues found during development
- **`hotfix/*`**: Critical fixes that need to go directly to production
- **`refactor/*`**: Code refactoring without changing functionality

### Creating a Feature Branch

Always create your feature branch from the latest `dev` branch:

```bash
# Switch to dev and get the latest changes
git checkout dev
git pull origin dev

# Create and switch to your feature branch
git checkout -b feature/your-feature-name

# Examples:
# git checkout -b feature/parcel-bulk-import
# git checkout -b bugfix/tracking-code-validation
# git checkout -b refactor/scanning-service
```

### Branch Naming Conventions

Use descriptive, kebab-case names:

- **Features**: `feature/user-authentication`, `feature/sms-notifications`
- **Bug fixes**: `bugfix/tracking-code-duplication`, `bugfix/payment-validation`
- **Hotfixes**: `hotfix/security-patch`, `hotfix/database-connection`
- **Refactors**: `refactor/prisma-queries`, `refactor/auth-module`

## Making Changes

### Development Workflow

1. **Create a branch** from `dev`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our [code standards](#code-standards)

3. **Commit your changes** following our [commit guidelines](#commit-guidelines)

4. **Keep your branch updated** with `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout feature/your-feature-name
   git rebase dev
   ```

5. **Push your changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a pull request** to merge into `dev`

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for clear and meaningful commit history.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semi-colons, etc.)
- **refactor**: Code refactoring without changing functionality
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates

### Examples

```bash
# Feature
git commit -m "feat(parcels): add bulk import functionality"

# Bug fix
git commit -m "fix(tracking): resolve duplicate tracking code generation"

# Documentation
git commit -m "docs(api): update Swagger documentation for payment endpoints"

# Refactor
git commit -m "refactor(scanning): optimize database queries in scanning service"
```

### Commit Message Best Practices

- Use the imperative mood ("add feature" not "added feature")
- Keep the subject line under 72 characters
- Capitalize the subject line
- Don't end the subject line with a period
- Provide detailed description in the body if needed
- Reference issue numbers in the footer (e.g., `Closes #123`)

## Pull Request Process

### Creating a Pull Request

1. **Ensure your branch is up to date** with `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout feature/your-feature-name
   git rebase dev
   ```

2. **Push your branch** to the remote repository:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Open a Pull Request** on GitHub targeting the `dev` branch

4. **Fill out the PR template** with:
   - Clear description of changes
   - Related issue numbers
   - Testing performed
   - Screenshots (if UI changes)
   - Breaking changes (if any)

### PR Title Format

Follow the same convention as commit messages:

```
feat(parcels): add bulk import functionality
fix(tracking): resolve duplicate tracking code generation
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Related Issues
Closes #123
Related to #456

## Changes Made
- Added bulk import functionality for parcels
- Updated validation logic
- Added unit tests

## Testing
- [x] Backend tests pass
- [x] Frontend tests pass
- [x] Manually tested on development environment
- [x] Database migrations work correctly

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Breaking Changes
None / List any breaking changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No console errors or warnings
```

### Review Process

1. **At least one approval** is required before merging
3. **Address review comments** by making additional commits

### After PR is Merged

1. **Delete your feature branch**:
   ```bash
   git checkout dev
   git pull origin dev
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

2. **Update your local `dev` branch**:
   ```bash
   git checkout dev
   git pull origin dev
   ```

## Code Standards

### Backend (NestJS/TypeScript)

- Follow [NestJS best practices](https://docs.nestjs.com/)
- Use TypeScript strict mode
- Use dependency injection
- Write modular, testable code
- Use DTOs for request/response validation
- Follow RESTful API conventions
- Document endpoints with Swagger decorators

#### Backend Code Style

```typescript
// Use meaningful variable names
const parcelTrackingCode = generateTrackingCode();

// Use async/await instead of promises
async createParcel(createParcelDto: CreateParcelDto): Promise<Parcel> {
  return await this.prismaService.parcel.create({
    data: createParcelDto,
  });
}

// Use guard clauses for early returns
if (!user) {
  throw new UnauthorizedException('User not authenticated');
}

// Add JSDoc comments for complex functions
/**
 * Generates a unique tracking code for a parcel
 * @param route - The route object
 * @param office - The destination office
 * @returns Formatted tracking code (e.g., RTE-ABC-12345)
 */
```

### Frontend (Angular/TypeScript)

- Follow [Angular Style Guide](https://angular.io/guide/styleguide)
- Use reactive forms
- Use RxJS operators properly
- Unsubscribe from observables (use `takeUntil` or `async` pipe)
- Use Angular Material components consistently
- Follow mobile-first responsive design
- Use TailwindCSS utility classes

#### Frontend Code Style

```typescript
// Use OnPush change detection for performance
@Component({
  selector: 'app-parcel-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
})

// Use RxJS properly
this.parcels$ = this.parcelService.getParcels().pipe(
  takeUntilDestroyed(),
  catchError(error => {
    this.errorHandler.handle(error);
    return of([]);
  })
);

// Use typed forms
parcelForm = this.fb.group({
  description: ['', [Validators.required, Validators.maxLength(200)]],
  size: ['MEDIUM' as ParcelSize, Validators.required],
});
```

### General Standards

- **Linting**: Code must pass ESLint/TSLint checks
- **Formatting**: Use Prettier for consistent formatting
- **Type Safety**: Avoid using `any` type unless absolutely necessary
- **Error Handling**: Proper error handling and user-friendly error messages
- **Security**: Validate all user inputs, sanitize data
- **Performance**: Optimize queries, avoid N+1 problems
- **Accessibility**: Follow WCAG guidelines for frontend

## Testing Requirements

### Backend Testing

- **Unit Tests**: Test individual services and controllers
- **Integration Tests**: Test API endpoints
- **Minimum Coverage**: Aim for 70%+ code coverage

```bash
# Run tests
cd backend
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- parcel.service.spec.ts
```

### Frontend Testing

- **Component Tests**: Test component logic
- **Service Tests**: Test services and HTTP calls
- **E2E Tests**: Test critical user flows (optional)

```bash
# Run tests
cd frontend
npm test

# Run tests in headless mode
npm test -- --browsers=ChromeHeadless --watch=false
```

### Writing Tests

```typescript
// Backend - Service test example
describe('ParcelService', () => {
  it('should create a parcel with valid data', async () => {
    const createDto: CreateParcelDto = {
      customerId: 'customer-id',
      receiverId: 'receiver-id',
      officeId: 'office-id',
      description: 'Test parcel',
    };

    const result = await service.create(createDto);

    expect(result).toBeDefined();
    expect(result.parcelNumber).toBeDefined();
  });
});

// Frontend - Component test example
describe('ParcelListComponent', () => {
  it('should display parcels', () => {
    component.parcels = mockParcels;
    fixture.detectChanges();

    const parcelElements = fixture.debugElement.queryAll(By.css('.parcel-item'));
    expect(parcelElements.length).toBe(mockParcels.length);
  });
});
```

## Development Setup

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL client (optional, for direct DB access)

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd pcs-zambia

# Start infrastructure
docker volume create postgres_data
docker compose up -d postgres redis

# Backend setup
cd backend
npm install
cp .env.example .env  # Edit with your configuration
npm run prisma:dev
npm run start:dev

# Frontend setup (in new terminal)
cd frontend
npm install
npm start
```

### Database Migrations

When making schema changes:

```bash
# Create migration
cd backend
npx prisma migrate dev -n descriptive_migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```
