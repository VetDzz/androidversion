# Custom Email Configuration for VetDz

## Problem
Currently, password reset emails are sent from Supabase's default email service, which can be confusing when you have multiple projects. Users receive emails from "supabase.co" instead of "vetdz.com".

## Solution: Configure Custom SMTP

### Step 1: Get Email Service Provider
You need an email service provider that supports SMTP. Options:
- **SendGrid** (recommended) - Free tier: 100 emails/day
- **Mailgun** - Free tier: 1000 emails/month  
- **Amazon SES** - Very cheap, $0.10 per 1000 emails
- **Gmail SMTP** - Free but limited

### Step 2: Configure Supabase SMTP Settings

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings** → **SMTP Settings**
3. Enable **Enable custom SMTP**
4. Fill in your SMTP details:

#### For SendGrid:
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: [Your SendGrid API Key]
Sender Email: noreply@vetdz.com
Sender Name: VetDz
```

#### For Gmail (if you have a custom domain):
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: noreply@vetdz.com
SMTP Pass: [App Password - not your regular password]
Sender Email: noreply@vetdz.com
Sender Name: VetDz
```

### Step 3: Custom Email Templates

In Supabase Dashboard → **Authentication** → **Email Templates**:

#### Password Reset Template:
```html
<h2>Réinitialisation de votre mot de passe VetDz</h2>
<p>Bonjour,</p>
<p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte VetDz.</p>
<p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
<p><a href="{{ .ConfirmationURL }}">Réinitialiser mon mot de passe</a></p>
<p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
<p>Cordialement,<br>L'équipe VetDz</p>
```

### Step 4: Domain Configuration (Optional but Recommended)

If you own vetdz.com domain:
1. Add SPF record: `v=spf1 include:sendgrid.net ~all`
2. Add DKIM records (provided by your email service)
3. Add DMARC record: `v=DMARC1; p=none; rua=mailto:admin@vetdz.com`

### Step 5: Test Configuration

1. Save SMTP settings in Supabase
2. Test password reset from your app
3. Check that emails come from "noreply@vetdz.com" instead of Supabase

## Quick Setup with SendGrid (Recommended)

1. **Create SendGrid Account**: https://sendgrid.com/
2. **Create API Key**: 
   - Go to Settings → API Keys
   - Create new key with "Mail Send" permissions
3. **Configure Supabase**:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - User: `apikey`
   - Password: [Your API Key]
   - From: `noreply@vetdz.com`

## Benefits
- ✅ Professional emails from your domain
- ✅ Better deliverability 
- ✅ No confusion with other Supabase projects
- ✅ Custom branding and templates
- ✅ Email analytics and tracking

## Cost
- SendGrid: Free for 100 emails/day
- Mailgun: Free for 1000 emails/month
- Amazon SES: ~$0.10 per 1000 emails

This will solve the email confusion issue and make your password reset emails look professional.