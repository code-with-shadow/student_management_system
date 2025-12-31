const conf = {
    // 1. Core Appwrite Config (defaults to empty string if env var missing)
    appwriteUrl: String(import.meta.env.VITE_APPWRITE_URL ?? ''),
    projectId: String(import.meta.env.VITE_APPWRITE_PROJECT_ID ?? ''),
    databaseId: String(import.meta.env.VITE_APPWRITE_DATABASE_ID ?? ''), // Make sure .env spelling is fixed!
    bucketId: String(import.meta.env.VITE_APPWRITE_BUCKET_ID ?? ''),
    
    // 2. Collection IDs (defaults to empty string if env var missing)
    colUsers: String(import.meta.env.VITE_COL_USERS ?? ''),
    colStudents: String(import.meta.env.VITE_COL_STUDENTS ?? ''),
    colTeachers: String(import.meta.env.VITE_COL_TEACHERS ?? ''),
    colAttendance: String(import.meta.env.VITE_COL_ATTENDANCE ?? ''),
    colMarks: String(import.meta.env.VITE_COL_MARKS ?? ''),
    colMessages: String(import.meta.env.VITE_COL_MESSAGES ?? ''),
    colChatSettings: String(import.meta.env.VITE_COL_CHAT_SETTINGS ?? ''),
    colClassSubjects: String(import.meta.env.VITE_COL_CLASS_SUBJECTS ?? ''),
    
    // Optional: If you ever add Notices later
    // colNotices: String(import.meta.env.VITE_COL_NOTICES),
}

export default conf;