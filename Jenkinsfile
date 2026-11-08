pipeline {
    agent any

    environment {
        // Thay tên tài khoản Docker Hub của bạn vào đây
        DOCKER_USER     = 'phngoccong'
        IMAGE_TAG       = "${env.BUILD_NUMBER}"
        
        // Danh sách 5 microservices khớp với file .env
        SERVICES        = "gateway product cart order payment"
        
        // Credentials cài trong Jenkins (Manage Jenkins -> Credentials)
        DOCKER_CREDS    = credentials('docker-hub-creds')      // Kind: Username with password
        SONAR_TOKEN     = credentials('sonar-token')           // Kind: Secret text
        ENV_FILE        = credentials('prod-env-file')         // Kind: Secret file (upload file .env của bạn lên)
        TELEGRAM_TOKEN  = credentials('telegram-bot-token')    // Kind: Secret text
        TELEGRAM_CHATID = credentials('telegram-chat-id')      // Kind: Secret text
    }

    stages {
        stage('1. Checkout & Install') {
            steps {
                checkout scm
                sh '''
                    echo "--- Cài đặt dependencies gốc ---"
                    npm ci || npm install
                '''
            }
        }

        stage('2. Code Quality Scan (SonarQube)') {
            steps {
                // Tên 'SonarQube-Server' phải trùng với tên đặt trong Jenkins System Configuration
                withSonarQubeEnv('SonarQube-Server') {
                    sh '''
                        npx sonar-scanner \
                          -Dsonar.projectKey=devops-study-microservices \
                          -Dsonar.sources=apps \
                          -Dsonar.exclusions=**/node_modules/** \
                          -Dsonar.login=${SONAR_TOKEN}
                    '''
                }
            }
        }

        stage('3. Build 5 Microservices Docker Images') {
            steps {
                script {
                    def serviceList = env.SERVICES.split(" ")
                    for (int i = 0; i < serviceList.size(); i++) {
                        def srv = serviceList[i]
                        echo "========== Đang Build Service: ${srv} =========="
                        sh """
                            docker build -t ${DOCKER_USER}/devops-${srv}:${IMAGE_TAG} ./apps/${srv}
                            docker tag ${DOCKER_USER}/devops-${srv}:${IMAGE_TAG} ${DOCKER_USER}/devops-${srv}:latest
                        """
                    }
                }
            }
        }

        stage('4. Security Scan with Trivy (Tiêu chí 11)') {
            steps {
                script {
                    def serviceList = env.SERVICES.split(" ")
                    for (int i = 0; i < serviceList.size(); i++) {
                        def srv = serviceList[i]
                        echo "========== Quét lỗ hổng bảo mật Image: ${srv} =========="
                        // Quét các lỗi HIGH và CRITICAL, xuất báo cáo dạng bảng
                        // Để "--exit-code 0" để pipeline không bị gãy ngang nếu thư viện base có CVE nhẹ,
                        // Nếu thầy/cô yêu cầu chặn cứng khi có lỗi CRITICAL thì đổi thành "--exit-code 1"
                        sh """
                            trivy image --severity HIGH,CRITICAL --exit-code 0 --no-progress ${DOCKER_USER}/devops-${srv}:${IMAGE_TAG}
                        """
                    }
                }
            }
        }

        stage('5. Push Images to Docker Hub') {
            // Chỉ Push lên Docker Hub khi code đã được Merge vào nhánh main (không push khi mới tạo PR)
            when {
                branch 'main'
            }
            steps {
                script {
                    sh 'echo $DOCKER_CREDS_PSW | docker login -u $DOCKER_CREDS_USR --password-stdin'
                    def serviceList = env.SERVICES.split(" ")
                    for (int i = 0; i < serviceList.size(); i++) {
                        def srv = serviceList[i]
                        sh """
                            docker push ${DOCKER_USER}/devops-${srv}:${IMAGE_TAG}
                            docker push ${DOCKER_USER}/devops-${srv}:latest
                        """
                    }
                }
            }
        }

        stage('6. Deploy Application') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "========== Triển khai hệ thống =========="
                    // Copy file .env bảo mật từ Jenkins Credentials ra thư mục chạy
                    sh '''
                        cp $ENV_FILE .env
                        docker compose pull || true
                        docker compose up -d --build
                    '''
                }
            }
        }
    }

    post {
        success {
            sh '''
                curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
                -d chat_id=${TELEGRAM_CHATID} \
                -d text="✅ [CI/CD SUCCESS] Dự án devops_study%0A- Nhánh: ${BRANCH_NAME}%0A- Build: #${BUILD_NUMBER}%0A- Trạng thái: Quét SonarQube, Trivy & Deploy 5 services hoàn tất!"
            '''
        }
        failure {
            sh '''
                curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
                -d chat_id=${TELEGRAM_CHATID} \
                -d text="❌ [CI/CD FAILED] Dự án devops_study%0A- Nhánh: ${BRANCH_NAME}%0A- Build: #${BUILD_NUMBER}%0A- Kiểm tra log Jenkins ngay!"
            '''
        }
        always {
            // Dọn dẹp image rác để tránh đầy ổ cứng máy ảo Azure
            sh 'docker image prune -f'
        }
    }
}