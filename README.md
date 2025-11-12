# LMS App

This repository contains a role-based Learning Management System built with React 18 and AWS Amplify. The front end renders dedicated dashboards for Admin, Instructor, and Student personas, while AWS Amplify coordinates authentication (Cognito), data access (AppSync + DynamoDB), file storage (S3), and operational Lambdas exposed through API Gateway.

## Architecture Overview

```mermaid
graph TD
  subgraph Client
    SPA[React SPA<br/>Amplify UI + Hooks]
  end

  SPA -->|Sign-in / token refresh| Cognito[(Amazon Cognito User Pool)]
  SPA -->|GraphQL queries & mutations| AppSync[(AWS AppSync API)]
  AppSync --> DynamoDB[(DynamoDB tables:<br/>User, Course, Lecture, Quiz, ...)]
  SPA -->|Upload/download lecture assets| S3[(Amazon S3 bucket)]
  SPA -->|Admin REST actions| APIGW[Amazon API Gateway]
  APIGW --> LambdaAdmin[Lambda: applms4426e4c8<br/>(Cognito admin ops)]
  APIGW --> LambdaExpress[Lambda: applms51482c72<br/>(Express admin endpoints)]
  LambdaAdmin --> Cognito

  subgraph Amplify Hosting
    BuildPipeline[Amplify Build<br/>(Node 18 -> npm install -> npm run build)]
    Hosting[Amplify Hosting + CloudFront]
  end

  BuildPipeline --> Hosting --> SPA
```

## AWS Infrastructure Components

- **Amplify Hosting / Build**: defined in `amplify.yml`, runs Node 18, installs dependencies, builds the React app, and serves it through CloudFront.
- **Amazon Cognito (auth/applms74700e61)**: email-based sign-up, optional MFA (OFF by default), user groups `Admin`, `Instructor`, `Student`.
- **AWS AppSync (api/applms)**: GraphQL API generated from `amplify/backend/api/applms/schema.graphql`, secured with the Cognito User Pool.
- **Amazon DynamoDB**: tables for each `@model` type such as `User`, `Course`, `Lecture`, `Quiz`, `Question`, `Enrollment`, `EnrollmentRequest`, and `Submission`.
- **Amazon S3 (storage/s357d74f7c)**: stores lecture files referenced through the `S3Object` type.
- **Amazon API Gateway + AWS Lambda**: `apie63ce51c` proxies to two Lambdas that execute Cognito admin operations (list users, assign groups, and create accounts).

## Repository Layout

```
lms-app/
|- amplify/
|  |- backend/
|  |  |- api/applms/        # GraphQL schema, resolvers, stacks
|  |  |- auth/              # Cognito configuration
|  |  |- function/          # Lambda sources (Admin Queries helpers)
|  |  |- storage/           # S3 bucket configuration
|  |  `- backend-config.json
|  `- ...
|- public/                  # CRA static assets
|- src/
|  |- App.js                # Chooses dashboard based on Cognito groups
|  |- AdminDashboard.jsx / InstructorDashboard.jsx / StudentDashboard.jsx
|  |- CourseDetail.jsx      # Course and lecture detail view
|  |- graphql/              # Amplify codegen operations
|  |- amplifyconfiguration.json / aws-exports.js
|  `- index.js, styles, tests
|- amplify.yml              # Amplify build specification
|- package.json
`- README.md
```

## Data Model Snapshot

- `User`: owner-restricted access, linked to `Course`, `Enrollment`, and `EnrollmentRequest` through `hasMany`.
- `Course`: references instructor (`belongsTo User`), exposes `lectures`, `quizzes`, `enrollments`, and `enrollmentRequests`.
- `Lecture`: metadata for course content stored in S3 (`S3Object`), CRUD allowed for Instructor/Admin groups.
- `Quiz` + `Question`: quiz definitions with options array and hidden `correctAnswerIndex`.
- `Enrollment` & `EnrollmentRequest`: connect students to courses with `PENDING | APPROVED | REJECTED` status.
- `Submission`: captures quiz scores and student answers.

## Getting Started

### Prerequisites

- Node.js 18 or newer (matches the Amplify build pipeline).
- Amplify CLI v12+ (`npm install -g @aws-amplify/cli`).
- AWS IAM credentials with permissions for AppSync, Cognito, DynamoDB, S3, Lambda, and CloudFormation.

### Local Setup

1. Install dependencies: `npm install`.
2. Sync Amplify backend config (for fresh clones): `amplify pull --appId <APP_ID> --envName <ENV>` to refresh `src/amplifyconfiguration.json` and the `amplify/` directory.
3. (Optional) Add or switch environments: `amplify env add` / `amplify env checkout`.
4. Start the dev server: `npm start` -> http://localhost:3000.
5. Sign in with a Cognito user that belongs to the proper group to see the corresponding dashboard.

### npm Scripts

- `npm start`: CRA development server with hot reload.
- `npm test`: Jest + Testing Library watch mode.
- `npm run build`: Production bundle consumed by Amplify Hosting.

## Operating the Amplify Backend

| Task | Command |
| --- | --- |
| View resource status | `amplify status` |
| Deploy backend changes | `amplify push` |
| Publish frontend to Amplify Hosting | `amplify publish` |
| Pull latest backend definitions | `amplify pull --appId <APP_ID> --envName <ENV>` |
| Add a new environment | `amplify env add` |
| Update auth (for example enable MFA) | `amplify auth update` |

The Amplify Console executes the steps in `amplify.yml` automatically (set Node 18, install packages, run `npm run build`, upload the `build/` directory).

## Admin REST Endpoints (API Gateway + Lambda)

These endpoints allow the Admin dashboard to manage Cognito groups without visiting the AWS console:

- `GET /listUsers`: list Cognito users.
- `GET /listGroupsForUser?username=<user>`: inspect group memberships.
- `POST /addUserToGroup`: body `{ "username": "...", "groupName": "Instructor" }`.
- `POST /removeUserFromGroup`: body `{ "username": "...", "groupName": "Student" }`.
- `POST /createUser`: body `{ "email": "...", "groupName": "Admin?" }`; sends a welcome email via Cognito.

Secure these routes with IAM, API keys, or Amplify environment rules to avoid exposing privileged operations publicly.

## Recommended Development Workflow

1. Model data in `amplify/backend/api/applms/schema.graphql`.
2. Run `amplify push` to update CloudFormation stacks and DynamoDB tables.
3. Generate updated operations (`amplify codegen` or the Amplify UI workflow) for the React app.
4. Build or adjust dashboard components (`AdminDashboard.jsx`, `InstructorDashboard.jsx`, `StudentDashboard.jsx`) using the Amplify GraphQL helpers.
5. Add tests for isolated logic (`npm test`) and verify role-specific rendering manually.

## Troubleshooting

- **Missing roles in the UI**: confirm the Cognito user is assigned to a group and that `fetchAuthSession` runs after sign-in.
- **GraphQL 401/403 errors**: ensure `amplifyconfiguration.json` matches the current environment (endpoint, region, user pool id).
- **S3 upload failures**: grant the authenticated role access to `Storage.put` or adjust auth rules on the `S3Object`.
- **Amplify Console build failures**: double-check environment variables and secrets configured in the Amplify Console and verify Node.js version compatibility.

## References

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Amplify Admin UI](https://docs.amplify.aws/console/adminui/intro/)
- [AppSync Security & Authorization](https://docs.aws.amazon.com/appsync/latest/devguide/security.html)
- [Amplify UI React](https://ui.docs.amplify.aws/react)

> The original Create React App boilerplate README has been replaced with project-specific guidance so contributors can understand the LMS architecture and deployment flow quickly.
