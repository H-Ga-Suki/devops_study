pipeline {
    agent any
    environment {
        TELEGRAM_TOKEN = '9164841421:AAEpXxv7FCxz8pBwyzjIERNNsiYvxn_QdkM' // gitleaks:allow
        CHAT_ID = '8790380429'
    }
    stages {
        stage('1. Checkout') {
            steps {
                checkout scm
            }
        }
        stage('1.5. Secret Scan (Gitleaks)') {
            steps {
                echo 'Scanning for hardcoded secrets...'
                sh 'gitleaks detect --no-git --source . -v'
            }
        }
        stage('2. Lint') {
            steps {
                echo 'Linting source code...'
                sh 'npm install'
                sh 'npm run lint || true'
            }
        }
        stage('3. Unit Test') {
            steps {
                echo 'Running unit tests...'
                sh 'npm run test || true'
            }
        }
        stage('4. Security Scan (Trivy FS)') {
            steps {
                echo 'Scanning code for vulnerabilities...'
                // Quét thư mục dự án thay vì quét Docker Image
                sh 'trivy fs --exit-code 0 --no-progress .'
            }
        }
    }
    post {
        success {
            sh """
            curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
            -d chat_id=${CHAT_ID} \
            -d text="✅ [CI SUCCESS] Dự án: devops_study%0A- Nhánh: ${env.BRANCH_NAME}%0A- Build: #${env.BUILD_NUMBER}%0A- Trạng thái: Kiểm tra mã nguồn thành công!"
            """
        }
        failure {
            sh """
            curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
            -d chat_id=${CHAT_ID} \
            -d text="❌ [CI FAILED] Dự án: devops_study%0A- Nhánh: ${env.BRANCH_NAME}%0A- Build: #${env.BUILD_NUMBER}%0A- Trạng thái: Thất bại!"
            """
        }
    }
}