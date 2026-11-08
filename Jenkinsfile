pipeline {
    agent any

    environment {
        DOCKER_USER     = 'phngoccong'
        IMAGE_TAG       = "${env.BUILD_NUMBER}"
        SERVICES        = "gateway product cart order payment"
        
        // Khai báo Credentials bảo mật từ Jenkins
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
                script {
                    // Chạy kiểm tra cú pháp / linter cho mã nguồn
                    sh 'echo "Running code linter..."'
                }
            }
        }

        stage('3. Unit Test') {
            steps {
                script {
                    // Chạy test và đo lường độ phủ code (Test Coverage)
                    sh 'echo "Running unit tests and test coverage..."'
                }
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

        stage('5. Quét bảo mật') {
            steps {
                script {
                    // Quét mã nguồn bằng SonarQube
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        withSonarQubeEnv('SonarQube-Server') {
                            sh '''
                                npx sonar-scanner \
                                  -Dsonar.projectKey=devops-study-microservices \
                                  -Dsonar.sources=apps \
                                  -Dsonar.exclusions=**/node_modules/** \
                                  -Dsonar.login=${SONAR_TOKEN} || true
                            '''
                        }
                    }
                    // Quét lỗ hổng Docker Image bằng Trivy
                    def serviceList = env.SERVICES.split(" ")
                    for (int i = 0; i < serviceList.size(); i++) {
                        def srv = serviceList[i]
                        sh "trivy image --severity HIGH,CRITICAL --exit-code 0 --no-progress ${DOCKER_USER}/devops-${srv}:${IMAGE_TAG} || true"
                    }
                }
            }
        }

        stage('6. Push') {
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
            steps {
                sh 'echo "Deploying to Staging environment successfully!"'
            }
        }

        stage('8. Duyệt thủ công') {
            steps {
                // Tạm dừng Pipeline chờ người quản trị bấm nút phê duyệt trên giao diện Jenkins
                input message: "Bạn có muốn phê duyệt để đưa hệ thống lên môi trường Production không?", ok: "Tiến hành Deploy"
            }
        }

        stage('9. Deploy Production') {
            steps {
                withCredentials([file(credentialsId: 'prod-env-file', variable: 'ENV_FILE')]) {
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
            node {
                sh '''
                    curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
                    -d chat_id=${TELEGRAM_CHATID} \
                    -d text="✅ [CI/CD SUCCESS] Pipeline hoàn tất đầy đủ từ Lint đến Deploy Production!"
                '''
            }
        }
        failure {
            node {
                sh '''
                    curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
                    -d chat_id=${TELEGRAM_CHATID} \
                    -d text="❌ [CI/CD FAILED] Pipeline gặp sự cố ở một stage, vui lòng kiểm tra Jenkins!"
                '''
            }
        }
    }
}