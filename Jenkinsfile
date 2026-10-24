pipeline {
    agent any

    environment {
        AWS_REGION   = 'ap-south-1'
        EKS_CLUSTER  = 'devops-eks'
        KUBECONFIG   = '/var/lib/jenkins/.kube/config'

        IMAGE_NAME   = 'ajaydhadi95/booking_frontend'
        IMAGE_TAG    = "${BUILD_NUMBER}"

        APP_NAME     = 'booking-frontend'
        SERVICE_NAME = 'booking-frontend-service'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Project') {
            steps {
                sh '''
                    set -eu

                    echo "Checking frontend project..."
                    pwd
                    ls -la

                    test -f package.json
                    test -f Dockerfile
                    test -f nginx.conf
                    test -f k8s/frontend.yaml

                    echo "Frontend files verified."
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -eu

                    docker build \
                      -t ${IMAGE_NAME}:${IMAGE_TAG} \
                      .

                    echo "Built image: ${IMAGE_NAME}:${IMAGE_TAG}"
                '''
            }
        }

        stage('Push Image to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKERHUB_USER',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        set -eu

                        echo "$DOCKERHUB_TOKEN" | docker login \
                          -u "$DOCKERHUB_USER" \
                          --password-stdin

                        docker push ${IMAGE_NAME}:${IMAGE_TAG}

                        docker logout
                    '''
                }
            }
        }

        stage('Connect to EKS') {
            steps {
                sh '''
                    set -eu
                    export KUBECONFIG="${KUBECONFIG}"

                    aws eks update-kubeconfig \
                      --region "${AWS_REGION}" \
                      --name "${EKS_CLUSTER}"

                    kubectl get nodes
                '''
            }
        }

        stage('Deploy to EKS') {
            steps {
                sh '''
                    set -eu
                    export KUBECONFIG="${KUBECONFIG}"

                    echo "Applying stable and canary resources..."

                    kubectl apply -f k8s/frontend.yaml

                    echo "Updating stable frontend image..."
                    kubectl set image deployment/${APP_NAME} \
                      ${APP_NAME}=${IMAGE_NAME}:${IMAGE_TAG}

                    echo "Waiting for stable deployment..."
                    kubectl rollout status deployment/${APP_NAME} \
                      --timeout=180s

                    echo "Checking canary deployment..."
                    if kubectl get deployment booking-frontend-canary \
                         >/dev/null 2>&1; then

                        echo "Waiting for canary deployment..."
                        kubectl rollout status \
                          deployment/booking-frontend-canary \
                          --timeout=180s
                    else
                        echo "Canary deployment not found."
                        exit 1
                    fi

                    echo "Final deployment status:"
                    kubectl get deployments
                    kubectl get pods -o wide
                    kubectl get services

                    echo "Production frontend service:"
                    kubectl get svc ${SERVICE_NAME}
                '''
            }
        }
    }

    post {
        success {
            echo 'Deployment Successful!'
            sh 'docker image prune -f'
            cleanWs()
        }

        failure {
            echo 'Deployment Failed! Check the stage logs.'
            cleanWs()
        }
    }
}
