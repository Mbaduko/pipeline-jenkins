# pipeline-jenkins

A minimal Node.js + TypeScript + Express service.

## Endpoints

| Method | Path      | Description          |
| ------ | --------- | -------------------- |
| GET    | `/`       | Greeting message     |
| GET    | `/health` | Liveness/health info |

## Getting started

Requires Node.js 20+ (see `.nvmrc`).

```bash
npm ci
cp .env.example .env
npm run dev          # start with hot reload on http://localhost:3000
```

## Scripts

| Script                  | Description                    |
| ----------------------- | ------------------------------ |
| `npm run dev`           | Run in watch mode with `tsx`   |
| `npm run build`         | Compile TypeScript to `dist/`  |
| `npm start`             | Run the compiled app           |
| `npm test`              | Run tests                      |
| `npm run test:coverage` | Run tests with coverage        |
| `npm run lint`          | Lint with ESLint               |
| `npm run format:check`  | Check formatting with Prettier |
| `npm run typecheck`     | Type-check sources and tests   |

## Docker

```bash
docker build -t pipeline-jenkins .
docker run -p 3000:3000 pipeline-jenkins
```

## CI/CD (Jenkins)

The `Jenkinsfile` defines a declarative pipeline:

1. **Checkout** – check out the source from SCM
2. **Install/Build** – `npm ci` and compile TypeScript
3. **Test** – Jest with coverage; JUnit results published to Jenkins
4. **Docker Build** – build the image tagged `<build-number>` and `latest`
5. **Push Image** – push both tags to Docker Hub

### Jenkins setup

- Agent labelled `built-in` with Node.js 20+ and Docker installed (the Jenkins user must be able to run `docker`)
- Plugins: Pipeline, Git, JUnit, Credentials Binding, Timestamper, Workspace Cleanup
- Credential `dockerhub-credentials` (Username with password, use a Docker Hub access token as the password)
- Update `DOCKER_IMAGE` in the `Jenkinsfile` to your Docker Hub namespace
- Create a Pipeline (or Multibranch Pipeline) job using _Pipeline script from SCM_ pointing at this repository
