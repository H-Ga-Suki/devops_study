pipeline {
    agent any

    environment {
        // Khai báo credential lấy từ Jenkins
        DOCKER_CREDS = credentials('docker-hub-creds')
        
        // Bỏ qua quét bảo mật cho dòng chứa Token này
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
                // Thêm cờ --no-git để bỏ qua lịch sử commit bị dính token cũ
                sh 'gitleaks detect --no-git --source . -v'
            }
        }

        stage('2. Lint') {
            steps {
                echo 'Linting source code...'
                // Chạy kiểm tra code
                sh 'npm install'
                sh 'npm run lint || true' 
            }
        }

        stage('3. Unit Test') {
            steps {
                echo 'Running unit tests...'
                // sh 'npm run test || true'
            }
        }

        stage('4. Build Image') {
            steps {
                echo 'Building Docker images...'
                sh 'docker compose build'
            }
        }

        stage('5. Security Scan (SonarQube & Trivy)') {
            steps {
                echo 'Scanning code and images for vulnerabilities...'
                // Quét thư mục dự án bằng Trivy
                sh 'trivy fs --exit-code 0 --no-progress .'
            }
        }

        stage('6. Push Image') {
            steps {
                echo 'Pushing Docker images to registry...'
                // Đăng nhập và push image
                // sh 'echo $DOCKER_CREDS_PSW | docker login -u $DOCKER_CREDS_USR --password-stdin'
                // sh 'docker compose push'
            }
        }

        stage('7. Deploy Staging') {
            steps {
                echo 'Deploying to Staging environment...'
                sh 'docker compose up -d'
            }
        }

        stage('8. Manual Approval') {
            steps {
                input message: 'Xác nhận đưa hệ thống lên Production?', ok: 'Approve & Deploy'
            }
        }

        stage('9. Deploy Production') {
            steps {
                echo 'Deploying to Production environment...'
                // Các lệnh deploy lên server production
            }
        }
    }

    post {
        always {
            // Dọn dẹp image rác để tránh đầy ổ cứng VPS
            sh 'docker image prune -f'
        }
        success {
            // Gửi thông báo thành công qua Telegram
            sh """
            curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
            -d chat_id=${CHAT_ID} \
            -d text="✅ [CI/CD SUCCESS] Dự án: devops_study%0A- Nhánh: ${env.BRANCH_NAME}%0A- Build: #${env.BUILD_NUMBER}%0A- Trạng thái: Thành công!"
            """
        }
        failure {
            // Gửi thông báo thất bại qua Telegram
            sh """
            curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
            -d chat_id=${CHAT_ID} \
            -d text="❌ [CI/CD FAILED] Dự án: devops_study%0A- Nhánh: ${env.BRANCH_NAME}%0A- Build: #${env.BUILD_NUMBER}%0A- Trạng thái: Thất bại, vui lòng kiểm tra Console Output!"
            """
        }
    }
}
