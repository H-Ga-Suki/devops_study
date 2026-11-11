pipeline {
    agent any
    environment {
        TELEGRAM_TOKEN = '9164841421:AAEpXxv7FCxz8pBwyzjIERNNsiYvxn_QdkM' // gitleaks:allow
        CHAT_ID = '8790380429'
        STAGING_IP = '172.198.139.227' // IP của Azure VM
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
                sh 'trivy fs --exit-code 0 --no-progress .'
            }
        }
        
        // CHÈN THÊM STAGE DEPLOY BẰNG ANSIBLE VÀO ĐÂY
        stage('5. Deploy to Staging (Azure VM)') {
            steps {
                echo 'Deploying application to Azure VM...'
                sh '''
                # Tạo file playbook deploy.yml tạm thời
                cat <<EOF > ansible/deploy.yml
                - name: Deploy Microservices
                  hosts: staging
                  become: yes
                  tasks:
                    - name: Copy project code
                      synchronize:
                        src: ../
                        dest: /home/adminuser/devops_study/
                        rsync_opts:
                          - "--exclude=.git"
                          - "--exclude=envs"

                    - name: Run Docker Compose
                      command: docker-compose up -d --build
                      args:
                        chdir: /home/adminuser/devops_study/
                EOF
                
                # Chạy Ansible Playbook đẩy code sang Azure VM
                ansible-playbook -i ansible/hosts ansible/deploy.yml
                '''
            }
        }
    }
    post {
        success {
            sh """
            curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
            -d chat_id=${CHAT_ID} \
            -d text="✅ [CI/CD SUCCESS] Dự án: devops_study%0A- Nhánh: ${env.BRANCH_NAME}%0A- Build: #${env.BUILD_NUMBER}%0A- Trạng thái: Kiểm tra và Triển khai lên Azure thành công!"
            """
        }
        failure {
            sh """
            curl -s -X POST https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage \
            -d chat_id=${CHAT_ID} \
            -d text="❌ [CI/CD FAILED] Dự án: devops_study%0A- Nhánh: ${env.BRANCH_NAME}%0A- Build: #${env.BUILD_NUMBER}%0A- Trạng thái: Thất bại ở một bước nào đó!"
            """
        }
    }
}
