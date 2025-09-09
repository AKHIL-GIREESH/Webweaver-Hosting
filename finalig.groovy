pipeline {
    agent any

    environment {
        GITHUB_REPO_URL = sh(script: 'cat /var/lib/jenkins/github_url.txt', returnStdout: true).trim()
        ENTRY_POINT = sh(script: 'cat /var/lib/jenkins/entrypoint.txt', returnStdout: true).trim()
        FRAMEWORK_TYPE = sh(script: 'cat /var/lib/jenkins/framework.txt', returnStdout: true).trim()
        DOCKERHUB_USERNAME = sh(script: 'cat /var/lib/jenkins/docker_username.txt', returnStdout: true).trim()
        DOCKERHUB_PAT = sh(script: 'cat /var/lib/jenkins/docker_pat.txt', returnStdout: true).trim()
    }
    
    triggers {
        cron('* * * * *')
    }

    stages {
        stage('Git Clone') {
            steps {
                echo "Cloning repository: ${env.GITHUB_REPO_URL}"
                git(
                    url: env.GITHUB_REPO_URL,
                    branch: 'main'
                )
            }
        }
        
        stage('Set Image Name from GitHub Repo') {
            steps {
                script {
                    def repoName = env.GITHUB_REPO_URL.tokenize('/').last()
                    env.IMAGE_NAME = "${env.DOCKERHUB_USERNAME}/${repoName.toLowerCase()}:latest"
                    echo "Docker Image Name: ${env.IMAGE_NAME}"
                }
            }
        }

        stage('Create Dockerfile') {
            steps {
                script {
                    def dockerfileContent
                    if (env.FRAMEWORK_TYPE == 'react') {
                        dockerfileContent = """# Use Node.js as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first (for better caching)
COPY \${ENTRY_POINT}/package*.json ./

# Copy the .env file if it exists. This allows your app to use environment variables.
COPY .env .

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
                    } else {
                        error "Unsupported framework type: ${env.FRAMEWORK_TYPE}"
                    }
                    // Copy the .env file from the Jenkins home directory to the current workspace
                    sh 'cp /var/lib/jenkins/.env .'
                    writeFile file: 'Dockerfile', text: dockerfileContent.replace("\${ENTRY_POINT}", env.ENTRY_POINT)

                    sh 'ls -lah'
                    sh 'cat Dockerfile'
                }
            }
        }

        stage('Docker Login') {
            steps {
                sh 'echo $DOCKERHUB_PAT | docker login -u $DOCKERHUB_USERNAME --password-stdin'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $IMAGE_NAME .'
            }
        }

        stage('Push to Docker Hub') {
            steps {
                sh 'docker push $IMAGE_NAME'
            }
        }

        stage('Deploy to k3s') {
            steps {
                script {
                    def redeployTimestamp = new Date().getTime().toString()
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
      annotations:
        redeploy-timestamp: "${redeployTimestamp}"
    spec:
      containers:
      - name: webweaver-container
        image: ${env.IMAGE_NAME}
        imagePullPolicy: Always
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
                    def hpaYaml = """
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webweaver-deployment
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webweaver-deployment
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
"""
                    writeFile file: 'k3s-deploy.yaml', text: deploymentYaml
                    writeFile file: 'k3s-hpa.yaml', text: hpaYaml
                    
                    sh 'kubectl --kubeconfig=/var/lib/jenkins/.kube/config apply -f k3s-deploy.yaml'
                    sh 'kubectl --kubeconfig=/var/lib/jenkins/.kube/config apply -f k3s-hpa.yaml'
                    sh 'kubectl --kubeconfig=/var/lib/jenkins/.kube/config get hpa'
                }
            }
        }
    }
}
