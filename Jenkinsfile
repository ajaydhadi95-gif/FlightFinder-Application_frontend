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
                    set -e

                    echo "Creating or updating deployment..."

                    kubectl create deployment ${APP_NAME} \
                      --image=${IMAGE_NAME}:${IMAGE_TAG} \
                      --dry-run=client -o yaml | kubectl apply -f -

                    echo "Updating application image..."

                    kubectl set image deployment/${APP_NAME} \
                      ${APP_NAME}=${IMAGE_NAME}:${IMAGE_TAG} \
                      --record=false 2>/dev/null || \
                    kubectl set image deployment/${APP_NAME} \
                      $(kubectl get deployment ${APP_NAME} \
                        -o jsonpath='{.spec.template.spec.containers[0].name}')=${IMAGE_NAME}:${IMAGE_TAG}

                    echo "Waiting for rollout..."

                    kubectl rollout status deployment/${APP_NAME} \
                      --timeout=180s

                    echo "Creating LoadBalancer service..."

                    kubectl expose deployment ${APP_NAME} \
                      --name=${SERVICE_NAME} \
                      --type=LoadBalancer \
                      --port=80 \
                      --target-port=80 \
                      --dry-run=client -o yaml | kubectl apply -f -

                    echo "Deployment status:"
                    kubectl get deployments
                    kubectl get pods -o wide
                    kubectl get svc ${SERVICE_NAME}
                '''
            }
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

