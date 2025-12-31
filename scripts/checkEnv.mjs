import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

const envPath = path.resolve(process.cwd(), '.env')
let env = {}
if (fs.existsSync(envPath)) {
  env = dotenv.parse(fs.readFileSync(envPath))
}

const required = [
  'VITE_APPWRITE_URL',
  'VITE_APPWRITE_PROJECT_ID',
  'VITE_APPWRITE_DATABASE_ID',
  'VITE_APPWRITE_BUCKET_ID',
  'VITE_COL_USERS'
]

const missing = required.filter(k => !env[k])

if (missing.length === 0) {
  console.log('✅ All required env vars are present in .env')
  process.exit(0)
} else {
  console.error('⚠️ Missing env vars in .env:', missing.join(', '))
  console.log('\nPlease copy `.env.example` to `.env` and fill in the values, then re-run `npm run check-env`')
  process.exit(1)
}
