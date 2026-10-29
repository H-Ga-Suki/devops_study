cat << 'EOF' > Jenkinsfile
pipeline {
    agent any
    stages {
        stage('Build') {
            steps { echo 'Building microservices...' }
        }
        stage('Test') {
            steps { echo 'Running unit tests...' }
        }

    }
}
EOF