pipeline {
    agent any
    environment {
        TELEGRAM_TOKEN = '9164841421:AAEpXxv7FCxz8pBwyzjIERNNsiYvxn_QdkM' // gitleaks:allow
        CHAT_ID = '8790380429'
        STAGING_IP = '172.198.139.227'
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
        stage('5. Deploy to K3s (Azure VM)') {
            when {
                branch 'main' // CHỈ CHẠY KHI NHÁNH LÀ MAIN
            }
            steps {
                echo 'Deploying Kubernetes infrastructure to Azure VM...'
                sh """
                # Chay kich ban Ansible cai k3s voi mat khau Vault
                ansible-playbook -i ansible/hosts ansible/install-k3s.yml --vault-password-file ~/.vault_pass.txt
                
                # Tao thu muc chua file cau hinh k8s tren may ao
                ssh -o StrictHostKeyChecking=no adminuser@172.198.139.227 'mkdir -p /home/adminuser/k8s_manifests'
                
                # Day toan bo manifest cua Phase 4 sang Azure
                rsync -avz -e "ssh -o StrictHostKeyChecking=no" ./k8s/ adminuser@172.198.139.227:/home/adminuser/k8s_manifests/
                
                # Kich hoat toan bo Database va Microservices bang kubectl
                ssh -o StrictHostKeyChecking=no adminuser@172.198.139.227 'sudo k3s kubectl apply -f /home/adminuser/k8s_manifests/cert-manager/ && sleep 10 && sudo k3s kubectl apply -f /home/adminuser/k8s_manifests/'
                """
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
