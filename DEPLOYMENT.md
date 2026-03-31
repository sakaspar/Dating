# Doukhou Deployment Checklist

## 1. Raspberry Pi Deployment

### Prerequisites
```bash
# Ensure Node.js 18+ is installed
node --version

# Install PM2 globally
npm install -g pm2
```

### Backend Deploy
```bash
cd ~/dating/backend
npm install --production
pm2 start ecosystem.config.json
pm2 save
pm2 startup  # Enable auto-start on boot
```

### Verify Backend
```bash
curl https://your-rpi-url.com/health
# Should return: { "status": "ok", ... }
```

### SSL/DNS Verification
```bash
# Check SSL certificate
openssl s_client -connect your-rpi-url.com:443 -servername your-rpi-url.com

# Check DuckDNS
nslookup your-duckdns-sub.duckdns.org

# Renew Let's Encrypt if needed
sudo certbot renew --dry-run
```

---

## 2. Mobile App Build

### Expo Configuration (app.json)
```json
{
  "expo": {
    "name": "Doukhou",
    "slug": "doukhou",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#6C5CE7"
    },
    "ios": {
      "bundleIdentifier": "com.doukhou.app",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.doukhou.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#6C5CE7"
      }
    }
  }
}
```

### Required Assets
Create these in `mobile/assets/`:
- `icon.png` — 1024x1024 app icon
- `splash.png` — 1284x2778 splash screen (primary purple #6C5CE7 background)
- `adaptive-icon.png` — 1024x1024 Android adaptive icon foreground

### Build iOS (TestFlight)
```bash
cd mobile
npx eas build --platform ios --profile production
# Submit to TestFlight:
npx eas submit --platform ios
```

### Build Android (APK/AAB)
```bash
cd mobile
npx eas build --platform android --profile production
# Or build APK for direct install:
npx eas build --platform android --profile preview
```

---

## 3. Pre-Launch Checklist

### Backend
- [ ] Health endpoint returns 200
- [ ] SSL certificate valid (>30 days remaining)
- [ ] DuckDNS resolving correctly
- [ ] PM2 running with auto-restart
- [ ] Backup cron job active
- [ ] Rate limiting active (100/15min)
- [ ] CORS configured for mobile app
- [ ] Environment variables set (JWT_SECRET, etc.)

### Mobile App
- [ ] App icon (1024x1024) created
- [ ] Splash screen created
- [ ] API_URL pointing to production server
- [ ] OneSignal configured for push notifications
- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] All flows tested end-to-end

### App Store / Play Store
- [ ] App icon meets guidelines (no transparency)
- [ ] Screenshots for all required sizes
- [ ] App description written
- [ ] Privacy policy URL ready
- [ ] Terms of service URL ready
- [ ] Support email set up
- [ ] App category: Social / Dating
- [ ] Age rating: 17+ (dating app)
- [ ] Content warnings set

---

## 4. Environment Variables (.env)

```env
# Backend
PORT=3000
JWT_SECRET=your-secret-key-change-this
CORS_ORIGIN=*
DATA_DIR=./data
UPLOAD_DIR=./uploads
NODE_ENV=production

# OneSignal (push notifications)
ONESIGNAL_APP_ID=your-app-id
ONESIGNAL_API_KEY=your-api-key

# DuckDNS (if not using separate script)
DUCKDNS_TOKEN=your-token
DUCKDNS_DOMAIN=your-subdomain
```

---

## 5. Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name your-rpi-url.com;

    ssl_certificate /etc/letsencrypt/live/your-rpi-url.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-rpi-url.com/privkey.pem;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Static uploads with caching
    location /uploads/ {
        proxy_pass http://localhost:3000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000;
    }
}

server {
    listen 80;
    server_name your-rpi-url.com;
    return 301 https://$host$request_uri;
}
```
