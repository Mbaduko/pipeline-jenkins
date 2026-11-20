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
    }

    post {
        always {
            cleanWs()
        }
    }
}
