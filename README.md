# Event Engine

Event Engine allows workshop attendees to self-provision themselves into Lacework instances in real-time during a workshop event. This avoids the need to pre-provision the full registration list of users when a smaller number actually attend the event. Event Engine was inspired by AWS Event Engine.

Event Engine is hosted at [https://ee.laceworkalliances.com/](https://ee.laceworkalliances.com/). Request access so that you can create your own sessions. Access is via Google. Once you have access, you can do the following:

1. Access the sessions page and click '+' to create a new session for your workshop event.
   ![Screen Shot 2022-10-19 at 11 37 24 AM](https://user-images.githubusercontent.com/6440106/196813117-732d2850-8612-410c-b4ec-4144b3721eb4.png)
2. Enter the session name, the Lacework instance URL and API credentials to create your own session.
   ![Screen Shot 2022-10-19 at 3 03 36 PM](https://user-images.githubusercontent.com/6440106/196813286-f25daf89-24bd-4aba-a39e-952a30343175.png)
3. Copy and provide the Session Link to workshop attendees at the event.
4. Workshop attendees then use the Session Link to submit their user details and get themselves provisoned into the Lacework instance. They are provisioned with 'Account User' permissions. They will get a Lacework one-time login email as usual.
   <img width="838" alt="Screen Shot 2022-10-19 at 11 37 01 AM" src="https://user-images.githubusercontent.com/6440106/196813743-698d7c6c-1dab-4c05-b704-d2cb6ad90669.png">

## Prerequisites

- Oauth provider (like Google, Azure AD)

## Deployment

### Create VPC

```
aws ec2 create-vpc --cidr-block 10.0.0.0/16
```

### Create Subnets

```


### EKS Cluster Creation (using AWS profile)

```
AWS_PROFILE=<profile
eksctl create cluster --name <cluster-name> --region <region> --nodegroup-name standard-workers --node-type t2.micro --nodes 2 --nodes-min 1 --nodes-max 3 --managed
```

### Oauth2 Proxy Setup

1. Generate cookie secret.
```
python3 -c 'import os,base64; print(base64.b64encode(os.urandom(16)).decode("ascii"))'
```
2. Install the Oauth2 proxy with Helm.
```
helm repo add oauth2-proxy https://oauth2-proxy.github.io/manifests

helm upgrade --install oauth2-proxy oauth2-proxy/oauth2-proxy \
   --namespace <namespace>
   --set config.clientID="GOOGLE_CLIENT_ID_HERE" \
   --set config.clientSecret="GOOGLE_CLIENT_SECRET_HERE" \
   --set config.cookieSecret="GENERATED_COOKIE_SECRET_HERE" \
   --set extraArgs.provider="google"
```
3. Verify.
```
kubectl --namespace=<namespace> get pods -l "app=oauth2-proxy"

NAME                            READY   STATUS    RESTARTS   AGE
oauth2-proxy-747b4f7849-qpdn9   1/1     Running   0          8s
```

### NGINX Ingress Controller Setup

1. Install with NGINX Ingress Controller with AWS Network Load Balancer.
```
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

helm install nginx ingress-nginx/ingress-nginx \
    --namespace eventengine \
    --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"="nlb" \
    --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-cross-zone-load-balancing-enabled"="true"
```
2. Monitor the ingress controller.
```
kubectl --namespace <namespace> get services -o wide -w nginx-ingress-nginx-controller

NAME                             TYPE           CLUSTER-IP       EXTERNAL-IP                                                                     PORT(S)                      AGE   SELECTOR
nginx-ingress-nginx-controller   LoadBalancer   10.100.232.198   a4464e7d23959442e9fceed65fe29560-0406c327cae32e19.elb.us-west-2.amazonaws.com   80:31677/TCP,443:31845/TCP   10m   app.kubernetes.io/component=controller,app.kubernetes.io/instance=nginx,app.kubernetes.io/name=ingress-nginx
```
3. Add the EXTERNAL-IP as a CNAME DNS record.
4. Apply deployments/ingress.yaml to create the eventengine and oauth2 ingresses.
```
kubectl apply -f ingress.yaml -n eventengine
```

### SSL Certificate Setup

1. Install CertManager.
```
helm repo add jetstack https://charts.jetstack.io

helm install \
  cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.9.1 \
  --set installCRDs=true
  
kubectl get pods --namespace cert-manager

NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-6b5d76bf77-hgb9f              1/1     Running   0          101m
cert-manager-cainjector-7c5667645b-qhjvv   1/1     Running   0          101m
cert-manager-webhook-59846cdfb6-xncff      1/1     Running   1          101m
```
2a. Set up GCP service account and credentials for DNS configuration if using Cloud DNS.
```
PROJECT_ID=lacework-dev

gcloud iam service-accounts create dns01-solver --display-name "dns01-solver"

gcloud projects add-iam-policy-binding $PROJECT_ID \
   --member serviceAccount:dns01-solver@$PROJECT_ID.iam.gserviceaccount.com \
   --role roles/dns.admin
   
gcloud iam service-accounts keys create key.json \
   --iam-account dns01-solver@$PROJECT_ID.iam.gserviceaccount.com
   
kubectl create secret generic clouddns-dns01-solver-svc-acct \
   --from-file=key.json --namespace cert-manager
```
2b. Set up AWS and roles for DNS configuration if using route 53.

Create a user with the following policy.
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "route53:GetChange",
      "Resource": "arn:aws:route53:::change/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/*"
    },
    {
      "Effect": "Allow",
      "Action": "route53:ListHostedZonesByName",
      "Resource": "*"
    }
  ]
}

```

The create access key for the user and the create a secret.
```
kubectl create secret generic prod-route53-credentials-secret --from-literal=secret-access-key=<secret access key> -n cert-manager
```
3. Create the Let's Encrypt Certificate Issuer.
```
kubectl apply -f letsencrypt-issuer-production.yaml
```
4. Create the certificate.
```
kubectl apply -f cert-production.yaml 
```

[Certificate Troubleshooting Steps](https://cert-manager.io/docs/troubleshooting/acme/)

### Backend Golang

1. Build the Docker image.

```
docker build -t eventengine-backend:<tag> .

ex.
docker build -t eventengine-backend:1 .
docker buildx build --platform linux/amd64 -t eventengine-backend:1 . (mac->eks)
```
2. Run the Docker image locally.
```
docker run -it --rm -p 8080:8080 -e AWS_ACCESS_KEY_ID=x -e AWS_SECRET_ACCESS_KEY=x -e eventengine_db_region=<region> \
-e eventengine_def_instance_url=<LW instance url> -e eventengine_def_access_key_id=<LW access key id> \ 
-e eventengine_def_secret_key=<LW secert key> -e eventengine_serverPort=8080 -e lwteventengine_db_disable_ssl=true \
--name my-backend-service eventengine-backend:<tag>

ex.
docker run -it --rm -p 8080:8080 -e AWS_ACCESS_KEY_ID=x -e AWS_SECRET_ACCESS_KEY=x -e eventengine_db_region=us-west-2 \
 -e eventengine_serverPort=8080 -e lwteventengine_db_disable_ssl=true -e eventengine_def_instance_url=partner-demo.lacework.net \
  -e eventengine_def_access_key_id=xxx -e eventengine_def_secret_key=xxx --name my-backend-service eventengine-backend:1
```

3. Push the image to ECR.

```
aws ecr get-login-password --region <region> --profile <profile> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com

docker tag eventengine-backend:<tag> <aws_account_id>.dkr.ecr.<region>.amazonaws.com/eventengine-backend:<tag>

docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/eventengine-backend:<tag>

ex.
aws ecr get-login-password --region us-west-2 --profile alliances-admin | docker login --username AWS --password-stdin 961341558131.dkr.ecr.us-west-2.amazonaws.com

docker tag eventengine-backend:1 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine-backend:1
docker tag eventengine-backend:1 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine-backend:latest

docker push -a 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine-backend
```

### Frontend React 

Change directory to the /frontend folder.

1. Ensure you have a node .env file with the following value set.

```
REACT_APP_API_URL=https://ee.lwalliances.com
```

2. Build the Docker image.
```
docker build -t eventengine-frontend:<tag> .

ex.
docker build -t eventengine-frontend:1 .
docker buildx build --platform linux/amd64 -t eventengine-frontend:1 . (mac->eks)
```
3. Run the Docker image locally.
```
docker run -it --rm -p 3000:3000 --name my-frontend-service eventengine-frontend:<tag>

ex.
docker run -it --rm -p 3000:3000 --name my-frontend-service eventengine-frontend:1
```

4. Push the image to ECR.
```
aws ecr get-login-password --region <region> --profile <profile> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com

docker tag eventengine-frontend:<tag> <aws_account_id>.dkr.ecr.<region>.amazonaws.com/eventengine-frontend:<tag>

docker push -a <aws_account_id>.dkr.ecr.<region>.amazonaws.com/eventengine-frontend

ex.
aws ecr get-login-password --region us-west-2 --profile alliances-admin | docker login --username AWS --password-stdin 961341558131.dkr.ecr.us-west-2.amazonaws.com

docker tag eventengine-frontend:1 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine-frontend:1 
docker tag eventengine-frontend:1 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine-frontend:latest

docker push -a 961341558131.dkr.ecr.us-west-2.amazonaws.com/eventengine-frontend
```

### Create a K8s Secret for the default Lacework instance environment variables

```
kubectl create secret generic defaultinstance \
 --from-literal=defaultLwUrl=partner-demo.lacework.net \
 --from-literal=defaultLwAccessKeyID='xxxx' \
 --from-literal=defaultLwSecretKey='xxxx' \
 --from-literal=defaultLwSubAcct='xxxSubAcct'
```

### Create a K8s Secret for CTF access

```
kubectl create secret generic ctf \
 --from-literal=ctf_secret='xxx' \
```

### Map Backend Service IAM Role to K8s Service Account
Follow [these instructions](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html) to map an IAM role to a K8s service account. This is required for the backend service. Ensure
that the IAM role has the AmazonDynamoDBFullAccess policy attached.

### Deploy via K8s Manifest

1. Store AWS Credentials as K8s secrets to be accessed as environment variables.

Follow these [instructions](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/#convert-your-secret-data-to-a-base-64-representation).

2. Store ECR Credentials as K8s secrets to be used to pull the images from ECR.

```
kubectl create secret docker-registry regcred \
  --docker-server=${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password) \
  --namespace=<namespace>
  
ex.
kubectl create secret docker-registry regcred \
  --docker-server=961341558131.dkr.ecr.us-west-2.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password) \
  --namespace=eventengine

```

3. Deploy!
```
kubectl apply -f deployment.yaml -n eventengine
```

## Renewing the Certificate
The certificate should renew on its own. If it doesn't, you can manually renew it by deleting the ee-ingress-cert secret and then delete the certificate. Cert-manager will recreate a new certificate.
If this fails, check that the cluster issue AWS access key credentials have not expired.