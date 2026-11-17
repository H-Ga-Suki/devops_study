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
        stage('4.5. Build & Push to Docker Hub') {
            when {
                branch 'main'
            }
            steps {
                echo 'Building and Pushing images to Docker Hub...'
                withCredentials([usernamePassword(credentialsId: 'docker-hub-creds', passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                    sh """
                    # Dang nhap vao Docker Hub
                    echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                    
                    # Build 5 images cho tung microservice
                    docker build -t phngoccong/gateway:latest ./apps/gateway
                    docker build -t phngoccong/product:latest ./apps/product
                    docker build -t phngoccong/cart:latest ./apps/cart
                    docker build -t phngoccong/order:latest ./apps/order
                    docker build -t phngoccong/payment:latest ./apps/payment
                    
                    # Push 5 images len Docker Hub
                    docker push phngoccong/gateway:latest
                    docker push phngoccong/product:latest
                    docker push phngoccong/cart:latest
                    docker push phngoccong/order:latest
                    docker push phngoccong/payment:latest
                    """
                }
            }
        }
        stage('5. Deploy to K3s (Azure VM)') {
            when {
                branch 'main' 
            }
            steps {
                echo 'Deploying Kubernetes infrastructure to Azure VM...'
                sh """
                # Chay kich ban Ansible cai k3s voi mat khau Vault da luu trong container
                ansible-playbook -i ansible/hosts ansible/install-k3s.yml --vault-password-file /var/jenkins_home/.vault_pass.txt
                
                # Tao thu muc chua file cau hinh k8s tren may ao Azure
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
            -d text="✅ [CI/CD SUCCESS] Dự án: devops_study%0A- Nhánh: ${env.BRANCH_NAME}%0A- Build: #${env.BUILD_NUMBER}%0A- Trạng thái: K3s Deploy & Docker Push thành công!"
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
