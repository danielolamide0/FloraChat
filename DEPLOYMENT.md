# Deployment Guide for FloraChat

This guide covers different deployment options for FloraChat.

## Prerequisites

Before deploying, ensure you have:
- All required API keys (PlantNet, OpenAI, Firebase)
- Firebase project configured
- Database setup (if using PostgreSQL)

## Environment Variables Required

```env
# Database (Optional - for backup storage)
DATABASE_URL=your_postgresql_connection_string
PGHOST=your_pg_host
PGPORT=your_pg_port
PGUSER=your_pg_user
PGPASSWORD=your_pg_password
PGDATABASE=your_pg_database

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account_json

# Frontend Firebase Variables
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_APP_ID=your_firebase_app_id

# External APIs
PLANTNET_API_KEY=your_plantnet_api_key
OPENAI_API_KEY=your_openai_api_key
```

## Deployment Options

### 1. Replit Deployment (Recommended)

Replit provides the easiest deployment method:

1. Import your project to Replit
2. Set up all environment variables in Replit Secrets
3. Click the "Deploy" button
4. Your app will be available at `your-app-name.replit.app`

### 2. Vercel Deployment

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Set environment variables in Vercel dashboard

### 3. Netlify Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to Netlify:
   - Drag and drop the `dist` folder to Netlify
   - Or connect your GitHub repository
   - Set environment variables in Netlify dashboard

### 4. Heroku Deployment

1. Install Heroku CLI

2. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```

3. Set environment variables:
   ```bash
   heroku config:set OPENAI_API_KEY=your_key
   heroku config:set PLANTNET_API_KEY=your_key
   # ... set all other environment variables
   ```

4. Deploy:
   ```bash
   git push heroku main
   ```

### 5. DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure build settings:
   - Build command: `npm run build`
   - Run command: `npm start`
3. Set environment variables in the dashboard
4. Deploy

## Post-Deployment Configuration

### Firebase Configuration

After deployment, update Firebase settings:

1. Go to Firebase Console
2. Navigate to Authentication → Settings → Authorized domains
3. Add your deployment domain (e.g., `your-app.replit.app`)
4. This allows Firebase authentication to work on your deployed app

### Database Setup (Optional)

If using PostgreSQL:

1. Run database migrations:
   ```bash
   npm run db:push
   ```

2. Verify database connection in your deployment logs

## Monitoring and Maintenance

### Logs
- Check deployment platform logs for errors
- Monitor Firebase usage in Firebase Console
- Track API usage for PlantNet and OpenAI

### Updates
- Keep dependencies updated
- Monitor for security vulnerabilities
- Test thoroughly before deploying updates

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Verify all required variables are set
   - Check variable names match exactly
   - Restart the deployment after adding variables

2. **Firebase Authentication Not Working**
   - Ensure domain is added to authorized domains
   - Check Firebase configuration variables

3. **API Errors**
   - Verify API keys are valid and active
   - Check API rate limits and usage
   - Ensure API endpoints are accessible

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are properly installed
   - Review build logs for specific error messages

### Getting Help

If you encounter issues:
1. Check the deployment platform's documentation
2. Review Firebase Console for authentication issues
3. Monitor API usage dashboards
4. Check application logs for detailed error messages

## Security Considerations

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Regularly rotate API keys
- Monitor for unusual API usage patterns
- Keep dependencies updated for security patches