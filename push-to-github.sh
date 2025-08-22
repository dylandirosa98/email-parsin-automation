#!/bin/bash

echo "🚀 Pushing Email Parsing Automation to GitHub..."

# Add remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/dylandirosa/email-parsing-automation.git

# Push to GitHub
git branch -M main
git push -u origin main

echo "✅ Successfully pushed to GitHub!"
echo "🔗 Repository URL: https://github.com/dylandirosa/email-parsing-automation"
echo ""
echo "🚀 Ready for Railway deployment:"
echo "1. Go to railway.app"
echo "2. Connect your GitHub account"
echo "3. Deploy from this repository"
echo "4. Set environment variables"
echo "5. Deploy!"
