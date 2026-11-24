pipeline {
    agent { label 'built-in' }

    options {
        skipDefaultCheckout()
        timeout(time: 10, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '5'))
    }

    environment {
        CI           = 'true'
        DOCKER_IMAGE = 'mbaduko/pipeline-jenkins'   // <registry-namespace>/<repo>
        IMAGE_TAG    = "${env.BUILD_NUMBER}"

        // Deployment target (EC2_HOST, EC2_USER, CONTAINER_NAME, APP_PORT, HOST_PORT)
        // comes from the 'jenkins-pipeline-secrets' Secret file credential (.env format).
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    def scmVars = checkout scm
                    env.GIT_COMMIT = scmVars.GIT_COMMIT
                }
            }
        }

        stage('Install/Build') {
            steps {
                sh '''
                    node --version
                    npm --version
                    npm ci
                    npm run build
                '''
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/junit.xml'
                    archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                    docker build \
                      --label org.opencontainers.image.revision="$GIT_COMMIT" \
                      -t "$DOCKER_IMAGE:$IMAGE_TAG" \
                      -t "$DOCKER_IMAGE:latest" \
                      .
                '''
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'domo7-dockerhub',
                                                  usernameVariable: 'REGISTRY_USER',
                                                  passwordVariable: 'REGISTRY_PASS')]) {
                    sh '''
                        echo "$REGISTRY_PASS" | docker login -u "$REGISTRY_USER" --password-stdin
                        docker push "$DOCKER_IMAGE:$IMAGE_TAG"
                        docker push "$DOCKER_IMAGE:latest"
                    '''
                }
            }
            post {
                always {
                    sh 'docker logout || true'
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                sshagent(credentials: ['jenkins-agent-key']) {
                    withCredentials([
                        file(credentialsId: 'jenkins-pipeline-secrets', variable: 'ENV_FILE'),
                        usernamePassword(credentialsId: 'domo7-dockerhub',
                                         usernameVariable: 'REGISTRY_USER',
                                         passwordVariable: 'REGISTRY_PASS')
                    ]) {
                        sh '''
                            set -e
                            # $ENV_FILE is the PATH to a temporary copy of the .env secret file
                            set -a
                            . "$ENV_FILE"
                            set +a
                            SSH="ssh -o StrictHostKeyChecking=accept-new $EC2_USER@$EC2_HOST"

                            echo "==> 1. Connecting to the EC2 instance"
                            $SSH "docker --version"

                            echo "==> 2. Pulling $DOCKER_IMAGE:$IMAGE_TAG"
                            echo "$REGISTRY_PASS" | $SSH "docker login -u '$REGISTRY_USER' --password-stdin"
                            $SSH "docker pull $DOCKER_IMAGE:$IMAGE_TAG"

                            echo "==> 3. Stopping and removing old container"
                            $SSH "docker stop $CONTAINER_NAME 2>/dev/null || true; docker rm $CONTAINER_NAME 2>/dev/null || true"

                            echo "==> 4. Starting new container"
                            $SSH "docker run -d --name $CONTAINER_NAME --restart unless-stopped \
                                  -p $HOST_PORT:$APP_PORT -e NODE_ENV=production \
                                  $DOCKER_IMAGE:$IMAGE_TAG"

                            $SSH "docker logout >/dev/null; docker image prune -f >/dev/null"
                        '''
                    }
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                sshagent(credentials: ['jenkins-agent-key']) {
                    withCredentials([file(credentialsId: 'jenkins-pipeline-secrets', variable: 'ENV_FILE')]) {
                        sh '''
                            # $ENV_FILE is the PATH to a temporary copy of the .env secret file
                            set -a
                            . "$ENV_FILE"
                            set +a
                            SSH="ssh -o StrictHostKeyChecking=accept-new $EC2_USER@$EC2_HOST"

                            echo "==> 5. Checking http://localhost:$HOST_PORT/health on the EC2 instance"
                            for i in $(seq 1 10); do
                              if $SSH "curl -fsS http://localhost:$HOST_PORT/health"; then
                                echo
                                echo "App is responding"
                                exit 0
                              fi
                              echo "Attempt $i/10: not ready yet, retrying in 3s..."
                              sleep 3
                            done
                            echo "App did not respond, container logs:"
                            $SSH "docker logs --tail 50 $CONTAINER_NAME" || true
                            exit 1
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Deployed ${DOCKER_IMAGE}:${IMAGE_TAG} to EC2"
        }
        always {
            sh 'docker image rm "$DOCKER_IMAGE:$IMAGE_TAG" "$DOCKER_IMAGE:latest" || true'
            cleanWs()
        }
    }
}
