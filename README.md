# pipeline-jenkins

A simple Node.js + TypeScript + Express app with a Jenkins CI/CD pipeline that builds, tests, packages it as a Docker image, pushes it to Docker Hub and deploys it to an AWS EC2 instance.

## Architecture

```mermaid
flowchart LR
    dev([Developer]) -->|git push| gh[GitHub repo]
    gh -->|checkout| jenkins

    subgraph jenkins[Jenkins server]
        direction TB
        s1[Checkout] --> s2[Install/Build] --> s3[Test] --> s4[Docker Build] --> s5[Push Image] --> s6[Deploy to EC2] --> s7[Verify Deployment]
    end

    s5 -->|docker push| hub[(Docker Hub)]
    s6 -->|SSH| ec2
    hub -->|docker pull| ec2

    subgraph ec2[AWS EC2 · Amazon Linux 2023]
        app[Docker container<br/>Express app :3000]
    end

    user([User]) -->|HTTP :80| app
```

## Pipeline stages

| Stage             | What it does                                                                    |
| ----------------- | ------------------------------------------------------------------------------- |
| Checkout          | Clone the repository                                                            |
| Install/Build     | `npm ci` and compile TypeScript                                                 |
| Test              | Run Jest tests with coverage and publish JUnit results                          |
| Docker Build      | Build the image tagged with the build number and `latest`                       |
| Push Image        | Push both tags to Docker Hub                                                    |
| Deploy to EC2     | SSH to the instance, pull the image, replace the old container, run the new one |
| Verify Deployment | Call `/health` on the instance until the app responds                           |

## Tech stack

Node.js · TypeScript · Express · Jest · Docker · Jenkins · Docker Hub · AWS EC2

## Project structure

```
src/
  app.ts            Express app
  server.ts         Entry point
  routes/health.ts  Health check route
tests/              Jest + Supertest tests
Dockerfile          Multi-stage production image
Jenkinsfile         CI/CD pipeline
```

## API

| Method | Path      | Response                                              |
| ------ | --------- | ----------------------------------------------------- |
| GET    | `/`       | `{ "message": "Hello from pipeline-jenkins" }`        |
| GET    | `/health` | `{ "status": "ok", "uptime": ..., "timestamp": ... }` |

## Run locally

```bash
npm ci
npm run dev        # http://localhost:3000
npm test
npm run lint
```

With Docker:

```bash
docker build -t pipeline-jenkins .
docker run -p 3000:3000 pipeline-jenkins
```

## Jenkins setup

**Plugins:** Pipeline, Git, JUnit, Credentials Binding, SSH Agent, Timestamper, Workspace Cleanup

**Credentials:**

| ID                         | Type                          | Purpose                    |
| -------------------------- | ----------------------------- | -------------------------- |
| `domo7-dockerhub`          | Username with password        | Docker Hub login           |
| `jenkins-agent-key`        | SSH Username with private key | SSH access to the EC2 host |
| `jenkins-pipeline-secrets` | Secret file                   | Deployment target (`.env`) |

The secret file uses `KEY=value` lines (no spaces around `=`):

```bash
EC2_HOST=<ec2-public-ip>
EC2_USER=ec2-user
CONTAINER_NAME=pipeline-jenkins
APP_PORT=3000
HOST_PORT=80
```

**EC2 instance:** Docker installed, the SSH user in the `docker` group, and the security group allowing SSH (22) from Jenkins and HTTP (80).

## Screenshots

**Successful pipeline run**

![Pipeline logs](screenshots/pipeline-logs.png)

**App running on EC2**

![App in browser](screenshots/app-in-browser.png)

**Jenkins version**

![Jenkins version](screenshots/jenkins-version.png)

**Docker and OS on the EC2 instance**

![Docker and OS versions](screenshots/versions.png)
