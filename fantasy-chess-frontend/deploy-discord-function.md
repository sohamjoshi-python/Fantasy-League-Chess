# Discord Function Deployment Instructions

## 🚀 **Option 1: Deploy via Supabase Dashboard (Recommended)**

1. **Go to Supabase Dashboard** → **Edge Functions** → **discord-bot**
2. **Click "Edit"** to open the function editor
3. **Replace the entire content** with the updated code from `supabase/functions/discord-bot/index.ts`
4. **Click "Save"** - this will automatically deploy the function
5. **Wait for deployment** to complete (should show green status)

## 🚀 **Option 2: Install Supabase CLI**

If you prefer command line deployment:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the function
supabase functions deploy discord-bot
```

## 🔧 **Current Function Code**

The updated function code with debug logging is in:
`fantasy-chess-frontend/supabase/functions/discord-bot/index.ts`

## 📋 **What Changed**

1. **Fixed import URLs** - Removed bare specifiers since import maps are disabled
2. **Added debug logging** - Shows exactly what the function receives
3. **Better error handling** - More detailed error messages

## 🎯 **After Deployment**

Once deployed, run:
```bash
node test-discord-debug.js
```

Then check **Supabase Dashboard** → **Edge Functions** → **discord-bot** → **Logs** to see the debug output.

## 💡 **Expected Debug Output**

After deployment, the logs should show:
- Raw request body
- Parsed JSON body
- Extracted action value
- Any parsing errors

This will tell us exactly why the function is returning "Invalid action". 