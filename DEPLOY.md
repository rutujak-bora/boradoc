# Deployment Guide for AWS EC2

This guide walks you through deploying the **Boradocs** application to an AWS EC2 instance.

## Prerequisites

1.  **AWS Account**: You need access to the AWS Console.
2.  **EC2 Instance**: Launch an instance (e.g., Ubuntu 22.04 LTS or Amazon Linux 2023).
    *   **Instance Type**: `t2.micro` or `t3.micro` (free tier eligible) is sufficient for testing.
    *   **Security Group**: key requirements:
        *   SSH (Port 22): My IP (for your access).
        *   HTTP (Port 80): Anywhere (0.0.0.0/0).
        *   Custom TCP (Port 5000): Anywhere (0.0.0.0/0) - OR just Port 80 if utilizing a reverse proxy (recommended) or port forwarding.
3.  **Domain Name (Optional)**: If you want HTTPS.

## 1. Prepare the Artifacts

We have already updated the code to be "production-ready":
*   **Frontend**: Configured to use relative API paths (`/api`) in production.
*   **Backend**: Configured to serve the frontend static files.

You need to package the application.
1.  Ensure you have run `npm run build` in the root directory (I have already done this).
2.  The critical folders are:
    *   `server/` (Backend code)
    *   `dist/` (Built frontend code)
    *   `package.json` (Root dependencies, though mostly dev)
    *   `server/package.json` (Backend dependencies)

**Zip the project:**
Create a zip file of the `boradocs` folder (excluding `node_modules` to save space).
*   Include: `server`, `dist`, `package.json` (optional but good for reference).
*   Exclude: `node_modules`, `.git` (if cloning is not preferred).

Alternatively, you can just `git clone` your repository on the EC2 instance.

## 2. Connect to EC2

```bash
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

## 3. Install Dependencies on EC2

Update the system and install Node.js (Version 18+ recommended):

```bash
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:
```bash
node -v
npm -v
```

## 4. Setup the Project

Upload your code or clone your repository.
Suppose your code is in `~/boradocs`.

```bash
cd ~/boradocs/server
npm install
```

**Environment Variables:**
Create the `.env` file in the `server` directory.

```bash
nano .env
```

Paste your environment variables (from your local `.env`):
```env
PORT=5000
JWT_SECRET=boradoc_secret
MONGO_RUSSIA_URI=...
MONGO_DUBAI_URI=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET=...
AWS_REGION=...
```
*Note: Ensure your MongoDB URIs allow access from the EC2 IP address (0.0.0.0/0 or specific IP in MongoDB Atlas Network Access).*

## 5. Start the Application

To test if it works:
```bash
npm start
```
Visit `http://your-ec2-ip:5000`. You should see the application.

**Keep it running with PM2:**
To keep the application running after you close SSH:

```bash
sudo npm install -g pm2
pm2 start index.js --name "boradocs"
pm2 save
pm2 startup
```

## 6. (Optional but Recommended) Setup Nginx & Port 80

Running on port 5000 is okay for testing, but standard web traffic uses port 80.

Install Nginx:
```bash
sudo apt install nginx -y
```

Configure Nginx to proxy port 80 to 5000:
```bash
sudo nano /etc/nginx/sites-available/default
```

Replace the `location /` block with:
```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Restart Nginx:
```bash
sudo systemctl restart nginx
```

Now you can visit `http://your-ec2-ip` (without :5000).

## Troubleshooting

*   **API 404s**: Ensure you are accessing `/api/...`.
*   **Database Connection Error**: Check MongoDB Atlas Network Access whitelist. Add your EC2 public IP.
*   **S3 Errors**: Allow the EC2 instance (or the IAM user credentials you provided) access to the S3 bucket.
