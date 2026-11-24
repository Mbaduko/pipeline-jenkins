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

        // Deployment target
        EC2_HOST       = '<ec2-public-ip-or-dns>'   // e.g. 3.120.45.10
        EC2_USER       = 'ubuntu'                   // 'ec2-user' on Amazon Linux
        CONTAINER_NAME = 'pipeline-jenkins'
        APP_PORT       = '3000'                     // port the app listens on in the container
        HOST_PORT      = '80'                       // port exposed on the EC2 instance
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
                sshagent(credentials: ['ec2-ssh-key']) {
                    withCredentials([usernamePassword(credentialsId: 'domo7-dockerhub',
                                                      usernameVariable: 'REGISTRY_USER',
                                                      passwordVariable: 'REGISTRY_PASS')]) {
                        sh '''
                            set -e
                            SSH="ssh -o StrictHostKeyChecking=accept-new $EC2_USER@$EC2_HOST"

                            echo "==> 1. Connecting to $EC2_HOST"
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
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
                        echo "==> 5. Checking http://localhost:$HOST_PORT/health on $EC2_HOST"
                        for i in $(seq 1 10); do
                          if ssh $EC2_USER@$EC2_HOST "curl -fsS http://localhost:$HOST_PORT/health"; then
                            echo
                            echo "App is responding"
                            exit 0
                          fi
                          echo "Attempt $i/10: not ready yet, retrying in 3s..."
                          sleep 3
                        done
                        echo "App did not respond, container logs:"
                        ssh $EC2_USER@$EC2_HOST "docker logs --tail 50 $CONTAINER_NAME" || true
                        exit 1
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "Deployed ${DOCKER_IMAGE}:${IMAGE_TAG} to http://${EC2_HOST}:${HOST_PORT}"
        }
        always {
            sh 'docker image rm "$DOCKER_IMAGE:$IMAGE_TAG" "$DOCKER_IMAGE:latest" || true'
            cleanWs()
        }
    }
}
