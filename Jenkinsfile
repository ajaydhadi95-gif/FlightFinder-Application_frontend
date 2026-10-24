pipeline {
    agent any

    environment {
        AWS_REGION  = 'ap-south-1'
        EKS_CLUSTER = 'devops-eks'
        KUBECONFIG  = '/var/lib/jenkins/.kube/config'

        IMAGE_NAME  = 'ajaydhadi95/booking_frontend'
        IMAGE_TAG   = "${BUILD_NUMBER}"

        APP_NAME    = 'booking-frontend'
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
                    set -eux

                    echo "Checking frontend project..."
                    pwd
                    ls -la

                    test -f package.json
                    test -f Dockerfile
                    test -f nginx.conf

                    echo "Frontend files verified."
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -e

                    docker build \
                      -t ${IMAGE_NAME}:${IMAGE_TAG} \
                      .

                    echo "Docker image built successfully."
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
                    set -e

                    aws eks update-kubeconfig \
                      --region ${AWS_REGION} \
                      --name ${EKS_CLUSTER}

                    kubectl get nodes
                '''
            }
        }

        
stage('Deploy to EKS') {
    steps {
        sh '''
            set -eu

            echo "Deploying frontend stable and canary resources..."

            # Verify Kubernetes manifest exists
            test -f k8s/frontend.yaml

            # Update the stable image to the image built in this pipeline.
            # The manifest must contain a container named booking-frontend.
            
            kubectl set image deployment/booking-frontend \
              booking-frontend=${IMAGE_NAME}:${IMAGE_TAG} \
              --record=false

            # Apply the stable and canary Kubernetes resources
            kubectl apply -f k8s/frontend.yaml

            echo "Waiting for stable rollout..."
            kubectl rollout status deployment/booking-frontend \
              --timeout=180s

            echo "Waiting for canary rollout..."
            if kubectl get deployment booking-frontend-canary >/dev/null 2>&1; then
                kubectl rollout status deployment/booking-frontend-canary \
                  --timeout=180s
            fi

            echo "Deployment status:"
            kubectl get deployments
            kubectl get pods -o wide
            kubectl get services
        '''
    }
}

    post {
        success {
            echo "Deployment Successful!"
            cleanWs()
            sh 'docker image prune -f'
        }

        failure {
            echo "Deployment Failed!"
            cleanWs()
        }
    }
}

