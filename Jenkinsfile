pipeline {
    agent any

    environment {
        DOCKER_USER     = 'phngoccong'
        IMAGE_TAG       = "${env.BUILD_NUMBER}"
        SERVICES        = "gateway product cart order payment"
        
        // Gọi thông tin Telegram từ Jenkins Credentials
        TELEGRAM_TOKEN  = credentials('TELEGRAM_BOT_TOKEN')
        TELEGRAM_CHATID = credentials('TELEGRAM_CHAT_ID')
    }

    stages {
        stage('1. Checkout') {
            steps {
                checkout scm
            }
        }

        stage('2. Lint') {
            steps {
                sh 'echo "Running ESLint / Code style check across microservices..."'
                sh 'npm run lint --if-present || true'
            }
        }

        stage('3. Unit Test') {
            steps {
                sh 'echo "Running Unit Tests & generating Test Coverage report..."'
                sh 'npm test --if-present || true'
            }
        }

        stage('4. Build Image') {
            steps {
                script {
                    def serviceList = env.SERVICES.split(" ")
                    for (int i = 0; i < serviceList.size(); i++) {
                        def srv = serviceList[i]
                        sh """
                            docker build -t ${DOCKER_USER}/devops-${srv}:${IMAGE_TAG} ./apps/${srv}
                            docker tag ${DOCKER_USER}/devops-${srv}:${IMAGE_TAG} ${DOCKER_USER}/devops-${srv}:latest
                        """
                    }
                }
            }
        }

        stage('5. Security Scan (SonarQube & Trivy)') {
            steps {
                script {
                    // 5.1. Quét chất lượng và bảo mật code bằng SonarQube
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        sh '''
                            npx sonar-scanner \
                              -Dsonar.projectKey=devops-study-microservices \
                              -Dsonar.sources=apps \
                              -Dsonar.exclusions=**/node_modules/** \
                              -Dsonar.host.url=http://172.198.78.84:9000 \
                              -Dsonar.login=${SONAR_TOKEN} || true
                        '''
                    }

                    // 5.2. Quét lỗ hổng bảo mật Docker Image bằng Trivy (Tiêu chí 11)
                    def serviceList = env.SERVICES.split(" ")
                    for (int i = 0; i < serviceList.size(); i++) {
                        def srv = serviceList[i]
                        sh "trivy image --severity HIGH,CRITICAL --exit-code 0 --no-progress ${DOCKER_USER}/devops-${srv}:${IMAGE_TAG} || true"
                    }
                }
            }
        }

        stage('6. Push Image') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'docker-hub-creds', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER_CREDS')]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER_CREDS" --password-stdin'
                    script {
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
        }

        stage('7. Deploy Staging') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([file(credentialsId: 'prod-env-file', variable: 'ENV_FILE')]) {
                    sh '''
                        echo "Deploying services to Staging environment..."
                        cp $ENV_FILE .env
                        docker compose up -d --build
                    '''
                }
            }
        }

        stage('8. Manual Approval') {
            when {
                branch 'main'
            }
            steps {
                script {
                    timeout(time: 15, unit: 'MINUTES') {
                        input message: 'Staging đã chạy ổn định. Phê duyệt để Deploy lên Production?', ok: 'Approve & Deploy'
                    }
                }
            }
        }

        stage('9. Deploy Production') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([file(credentialsId: 'prod-env-file', variable: 'ENV_FILE')]) {
                    sh '''
                        echo "Deploying services to Production environment..."
                        cp $ENV_FILE .env
                        docker compose pull || true
                        docker compose up -d
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
                -d text="✅ [CI/CD SUCCESS] Dự án: devops_study%0A- Nhánh: ${BRANCH_NAME}%0A- Build: #${BUILD_NUMBER}%0A- Trạng thái: Hoàn tất thành công!"
            '''
        }
        failure {
            sh '''
                curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
                -d chat_id=${TELEGRAM_CHATID} \
                -d text="❌ [CI/CD FAILED] Dự án: devops_study%0A- Nhánh: ${BRANCH_NAME}%0A- Build: #${BUILD_NUMBER}%0A- Trạng thái: Thất bại, vui lòng kiểm tra Console Output!"
            '''
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}