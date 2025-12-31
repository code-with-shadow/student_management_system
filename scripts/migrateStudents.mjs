import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { Client, Databases, Query } from 'appwrite'

// Load .env if present
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) dotenv.config({ path: envPath })

const REQUIRED = [
  'VITE_APPWRITE_URL',
  'VITE_APPWRITE_PROJECT_ID',
  'VITE_APPWRITE_DATABASE_ID',
  'VITE_COL_STUDENTS'
]

for (const k of REQUIRED) {
  if (!process.env[k]) {
    console.error('Missing env var:', k)
    process.exit(1)
  }
}

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_URL)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)

// For migrations that modify documents, we require an API key with appropriate permissions
if (!process.env.APPWRITE_API_KEY) {
  console.error('Missing APPWRITE_API_KEY in .env; create a server API key in Appwrite and add APPWRITE_API_KEY to .env (do NOT commit it).')
  process.exit(1)
}
client.setKey(process.env.APPWRITE_API_KEY)

const db = new Databases(client)

async function run() {
  console.log('Fetching students...')
  // Use Query.limit to fetch up to 1000 students in one go (adjust if you have more)
  const res = await db.listDocuments(process.env.VITE_APPWRITE_DATABASE_ID, process.env.VITE_COL_STUDENTS, [Query.limit(1000)])
  const docs = res.documents || []
  console.log(`Found ${docs.length} student documents`)

  for (const doc of docs) {
    const patch = {}
    if (!doc.phone) patch.phone = '+0000000000'
    if (doc.age === undefined || doc.age === null) patch.age = 0
    if (!doc.fathername) patch.fathername = 'Unknown'
    if (!doc.address) patch.address = ''
    if (!doc.section) patch.section = 'A'
    if (patch && Object.keys(patch).length > 0) {
      console.log('Patching', doc.$id, patch)
      await db.updateDocument(process.env.VITE_APPWRITE_DATABASE_ID, process.env.VITE_COL_STUDENTS, doc.$id, patch)
    }
  }

  console.log('Migration complete')
}

run().catch(err => {
  console.error('Migration failed', err)
  process.exit(1)
})