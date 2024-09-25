# Event Engine

Event Engine allows workshop attendees to self-provision themselves into workshop events. This avoids the need to pre-provision the full registration list of users when a smaller number actually attend the event. Event Engine was inspired by AWS Event Engine.

## Deployment

### Mongodb User

```
db.createUser(
  {
    user: "<user>",
    pwd: "<password>",
    roles: [ { role: "readWrite", db: "eventengine" } ]
  }
)
```

### Create VPC

Create a VPC with two private and two public subnets. The subnets should be in different availability zones. The private subnets should not have a route to the internet.


### EKS Cluster Creation (using AWS profile)

```
eksctl create cluster \
--name eventengine-cluster \
--vpc-private-subnets=subnet-05146055a8cdc8ebe,subnet-0d88082c94fb7b221 \
--node-private-networking \
--profile AdministratorAccess-961341558131
```

### Updated kubeconfig

```
aws eks --region <region> update-kubeconfig --name <cluster-name> --profile <profile>
eg. aws eks --region us-west-2 update-kubeconfig --name eventengine-cluster --profile AdministratorAccess-961341558131
```

### Create the Event Engine Namespace
```
kubectl create namespace eventengine
```

### Create Service Account for Cluster-Admin Role

```
kubectl apply -f cluster-admin-role-sa.yaml --namespace=eventengine
```

### Backend Golang

1. Build the Docker image.

```
docker build -t eventengine/backend:<tag> .

ex.
docker build -t eventengine/backend:1 .
docker buildx build --platform linux/amd64 -t eventengine/backend:1 . (mac->eks)
```
2. Run the Docker image locally.
```
docker run -it --rm -p 8080:8080 -e AWS_ACCESS_KEY_ID=x -e AWS_SECRET_ACCESS_KEY=x -e eventengine_db_region=<region> \
-e eventengine_def_instance_url=<LW instance url> -e eventengine_def_access_key_id=<LW access key id> \ 
-e eventengine_def_secret_key=<LW secert key> -e eventengine_serverPort=8080 -e eventengine_db_disable_ssl=true \
--name my-backend-service eventengine/backend:<tag>

ex.
docker run -it --rm -p 8080:8080 -e AWS_ACCESS_KEY_ID=x -e AWS_SECRET_ACCESS_KEY=x -e eventengine_db_region=us-west-2 \
 -e eventengine_serverPort=8080 -e eventengine_db_disable_ssl=true -e eventengine_def_instance_url=partner-demo.lacework.net \
  -e eventengine_def_access_key_id=xxx -e eventengine_def_secret_key=xxx --name my-backend-service eventengine/backend:1
```

3. Push the image to ECR.

```
aws ecr get-login-password --region <region> --profile <profile> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com

docker tag eventengine/backend:<tag> <aws_account_id>.dkr.ecr.<region>.amazonaws.com/eventengine/backend:<tag>

docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/eventengine/backend:<tag>

ex.
aws ecr get-login-password --region us-west-2 --profile AdministratorAccess-961341558131 | docker login --username AWS --password-stdin 961341558131.dkr.ecr.us-west-2.amazonaws.com

docker tag eventengine/backend:1 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine/backend:1
docker tag eventengine/backend:1 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine/backend:latest

docker push -a 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine/backend
```

### Create a K8s Secret for the mongodb creds variables

```
kubectl create secret generic mongocreds\
--from-literal=usr='xxx' \
--from-literal=pwd='xxxx' \
--from-literal=host='xxxx' \
--namespace=eventengine
```

### Create a K8s Secret for the default event engine instance environment variables

```
kubectl create secret generic defaultinstance \
 --from-literal=defaultLwUrl=partner-demo.lacework.net \
 --from-literal=defaultLwAccessKeyID='xxxx' \
 --from-literal=defaultLwSecretKey='xxxx' \
 --from-literal=defaultLwSubAcct='xxxSubAcct' \
 --namespace=eventengine
```

### Deploy via K8s Manifest

1. Store AWS Credentials as K8s secrets to be accessed as environment variables.

Follow these [instructions](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/#convert-your-secret-data-to-a-base-64-representation).

2. Store ECR Credentials as K8s secrets to be used to pull the images from ECR.

```
kubectl create secret docker-registry regcred \
  --docker-server=${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --profile <profile>) \
  --namespace=<namespace>
  
ex.
kubectl create secret docker-registry regcred \
  --docker-server=961341558131.dkr.ecr.us-west-2.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --profile AdministratorAccess-961341558131) \
  --namespace=eventengine

```

3. Deploy the backend!
```
kubectl apply -f deployment-backend.yaml -n eventengine
```

4. Get the backend service external IP.
```
kubectl get svc -n eventengine
```

### Frontend React 

Change directory to the /frontend folder.

1. Ensure you have a node .env file with the following value set.

```
REACT_APP_API_URL=backend external ip
```

2. Build the Docker image.
```
docker build -t eventengine/frontend:<tag> .

ex.
docker build -t eventengine/frontend:1 .
docker buildx build --platform linux/amd64 -t eventengine/frontend:1 . (mac->eks)
```
3. Run the Docker image locally.
```
docker run -it --rm -p 3000:3000 --name my-frontend-service eventengine/frontend:<tag>

ex.
docker run -it --rm -p 3000:3000 --name my-frontend-service eventengine/frontend:1
```

4. Push the image to ECR.
```
aws ecr get-login-password --region <region> --profile <profile> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com

docker tag eventengine/frontend:<tag> <aws_account_id>.dkr.ecr.<region>.amazonaws.com/eventengine/frontend:<tag>

docker push -a <aws_account_id>.dkr.ecr.<region>.amazonaws.com/eventengine/frontend

ex.
aws ecr get-login-password --region us-west-2 --profile AdministratorAccess-961341558131 | docker login --username AWS --password-stdin 961341558131.dkr.ecr.us-west-2.amazonaws.com

docker tag eventengine/frontend:1 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine/frontend:1
docker tag eventengine/frontend:1 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine/frontend:latest

docker push -a 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine/frontend
```

3. Deploy the frontend!
```
kubectl apply -f deployment-frontend.yaml -n eventengine
```