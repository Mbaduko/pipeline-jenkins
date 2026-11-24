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
6. **Deploy to EC2** – SSH to the instance, pull the image, replace the running container
7. **Verify Deployment** – poll `/health` on the instance until the app responds

### Jenkins setup

- Agent labelled `built-in` with Node.js 20+ and Docker installed (the Jenkins user must be able to run `docker`)
- Plugins: Pipeline, Git, JUnit, Credentials Binding, Timestamper, Workspace Cleanup
- Credential `domo7-dockerhub` (Username with password, use a Docker Hub access token as the password)
- Update `DOCKER_IMAGE` in the `Jenkinsfile` to your Docker Hub namespace
- Plugin: SSH Agent; credential `jenkins-agent-key` (SSH Username with private key, the EC2 key pair `.pem`)
- Credential `jenkins-pipeline-secrets` (Secret file) holding the deployment target:

  ```bash
  EC2_HOST=3.120.45.10
  EC2_USER=ubuntu            # 'ec2-user' on Amazon Linux
  CONTAINER_NAME=pipeline-jenkins
  APP_PORT=3000              # port the app listens on in the container
  HOST_PORT=80               # port exposed on the instance
  ```

- The instance needs Docker and `curl`, and the SSH user must be in the `docker` group
- Allow inbound SSH (22) from Jenkins and HTTP (`HOST_PORT`) in the instance security group
- Create a Pipeline (or Multibranch Pipeline) job using _Pipeline script from SCM_ pointing at this repository
