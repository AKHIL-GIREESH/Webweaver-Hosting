pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub')
        GITHUB_REPO_URL = sh(script: 'cat /var/jenkins_home/config/github_url.txt', returnStdout: true).trim()
        ENTRY_POINT = sh(script: 'cat /var/lib/jenkins/entrypoint.txt', returnStdout: true).trim()
        CUSTOM_EMAIL = sh(script: 'cat /var/lib/jenkins/recipient_email.txt', returnStdout: true).trim()
    }

    stages {
        stage('Git Clone') {
            steps {
                echo env.GITHUB_REPO_URL
                git(
                    url: env.GITHUB_REPO_URL,
                    branch: 'main'
                )
            }
        }
        
        stage('Set Image Name from GitHub Repo') {
            steps {
                script {
                    def repoName = env.GITHUB_REPO_URL.tokenize('/').last() // Extracts "reactTesting"
                    env.IMAGE_NAME = "akhilgireesh/${repoName.toLowerCase()}:latest"
                    echo "Docker Image Name: ${env.IMAGE_NAME}"
                }
            }
        }

        stage('Create Dockerfile') {
            steps {
                script {
                    def dockerfileContent = """# Use Node.js as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first (for better caching)
COPY \${ENTRY_POINT}/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY \${ENTRY_POINT} .

# Build the React project
RUN npm run build

# Expose the port your app runs on
EXPOSE 5173

# Start the application
CMD ["sh", "-c", "npm run dev -- --host"]
"""

                    // Create Dockerfile
                    writeFile file: 'Dockerfile', text: dockerfileContent.replace("\${ENTRY_POINT}", env.ENTRY_POINT)

                    // Debugging: Ensure Dockerfile is created
                    sh 'ls -lah'
                    sh 'cat Dockerfile'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $IMAGE_NAME .'
            }
        }

        stage('Docker Login') {
            steps {
				sh 'echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin'
			}
        }

        stage('Push to Docker Hub') {
            steps {
                sh 'docker push $IMAGE_NAME'
            }
        }

        // stage('Run Container') {
        //     steps {
        //         sh 'docker run -d --name my_app_container -p 3000:5173 $IMAGE_NAME'
        //     }
        // }
        stage('Deploy to k3s') {
    steps {
        script {
            def deploymentYaml = """
                apiVersion: apps/v1
                kind: Deployment
                metadata:
                name: webweaver-deployment
                spec:
                replicas: 2
                selector:
                    matchLabels:
                    app: webweaver
                template:
                    metadata:
                    labels:
                        app: webweaver
                    spec:
                    containers:
                    - name: webweaver-container
                        image: ${env.IMAGE_NAME}
                        ports:
                        - containerPort: 5173
                        resources:
                        requests:
                            cpu: "100m"
                            memory: "128Mi"
                        limits:
                            cpu: "500m"
                            memory: "256Mi"
                ---
                apiVersion: v1
                kind: Service
                metadata:
                name: webweaver-service
                spec:
                selector:
                    app: webweaver
                ports:
                    - protocol: TCP
                    port: 3000
                    targetPort: 5173
                type: LoadBalancer
                """
                        writeFile file: 'k3s-deploy.yaml', text: deploymentYaml
                            sh 'kubectl --kubeconfig=/var/lib/jenkins/.kube/config apply -f k3s-deploy.yaml'
                            
                            // Autoscaler stage (merged in here or separated)
                            sh '''
                            kubectl --kubeconfig=/var/lib/jenkins/.kube/config autoscale deployment webweaver-deployment \
                            --cpu-percent=50 \
                            --min=2 \
                            --max=5
                            '''
                            
                            sh 'kubectl --kubeconfig=/var/lib/jenkins/.kube/config get hpa'


        }
    }
}

    }

    // post {
    //     success {
    //         emailext (
    //             subject: "✅ Jenkins Pipeline Success: ${env.JOB_NAME}",
    //             body: "The pipeline for ${env.JOB_NAME} completed successfully! 🎉",
    //             to: "${env.CUSTOM_EMAIL}",
    //         )
    //     }
    //     failure {
    //         emailext (
    //             subject: "❌ Jenkins Pipeline Failed: ${env.JOB_NAME}",
    //             body: "The pipeline for ${env.JOB_NAME} failed. Please check the logs.",
    //             to: "${env.CUSTOM_EMAIL}",
    //         )
    //     }
    // }
}
