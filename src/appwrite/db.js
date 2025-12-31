import conf from './conf.js';
import { Client, Databases, Storage, ID, Query } from "appwrite";

export class Service {
    client = new Client();
    databases;
    storage;
    conf; // 1. Added to fix "undefined" error

    constructor() {
        this.conf = conf; // 2. Assign conf here
        this.client
            .setEndpoint(conf.appwriteUrl)
            .setProject(conf.projectId);
        this.databases = new Databases(this.client);
        this.storage = new Storage(this.client);
    }

    // ============================================================
    // 1. USER & PROFILE SERVICES
    // ============================================================

    async createUserRole({ userId, email, fullname, role, status }) {
        // The Appwrite DB enum uses 'techer' and 'pending_techer' (typo) — map common values
        const roleMapping = {
            teacher: 'techer',
            pending_teacher: 'pending_techer',
        };
        const dbRole = roleMapping[role] || role;

        return await this.databases.createDocument(
            conf.databaseId,
            conf.colUsers,
            userId,
            {
                userid: userId,
                email: email,
                fullname: fullname,
                role: dbRole,
                status: status // Must be "active" (String) to match Enum
            }
        );
    }

    async getUserRole(userId) {
        try {
            return await this.databases.getDocument(
                conf.databaseId,
                conf.colUsers,
                userId
            );
        } catch (error) {
            console.warn("Service.getUserRole failed:", error?.message || error);
            // Return null so callers can fallback safely
            return null;
        }
    }

    // STUDENT PROFILE
    async createStudentProfile({ userid, fullname, phone, classId, roll, age, fathername, address, section }) {
        return await this.databases.createDocument(
            conf.databaseId,
            conf.colStudents,
            ID.unique(),
            {
                userid: userid,
                fullname: fullname,
                phone: phone,          // Added
                class: classId,
                roll: Number(roll),    // Ensure Integer
                age: Number(age),      // Added & Integer
                fathername: fathername,// Added
                address: address,      // Added
                section: section       // Added
            }
        );
    }

    async getStudentProfile(userId) {
        try {
            return await this.databases.listDocuments(
                conf.databaseId,
                conf.colStudents,
                [Query.equal('userid', userId)]
            );
        } catch (error) {
            console.warn("Service.getStudentProfile failed:", error?.message || error);
            return { documents: [] };
        }
    }

    // TEACHER PROFILE
    async createTeacherProfile({ userid, fullname, email, phone, subject }) {
        return await this.databases.createDocument(
            conf.databaseId,
            conf.colTeachers,
            ID.unique(),
            {
                userid: userid,
                fullname: fullname,
                phone: phone,        // Required by your schema
                status: "active",    // Required Enum
                subject: subject,    // Required
                isclassteacher: "false" // Optional string
            }
        );
    }

    async getTeacherProfile(userId) {
        try {
            const res = await this.databases.listDocuments(
                conf.databaseId,
                conf.colTeachers,
                [Query.equal('userid', userId)]
            );
            return res.documents[0];
        } catch (error) {
            console.warn("Service.getTeacherProfile failed:", error?.message || error);
            return null;
        }
    }

    // ============================================================
    // 2. ACADEMIC SERVICES (Fixed Lowercase Keys)
    // ============================================================

    async getStudentsByClass(className) {
        try {
            return await this.databases.listDocuments(
                conf.databaseId,
                conf.colStudents,
                [
                    Query.equal('class', className),
                    Query.orderAsc('roll')
                ]
            );
        } catch (error) {
            console.warn("Service.getStudentsByClass failed:", error?.message || error);
            return { documents: [] };
        }
    }

    async markAttendance({ docId, studentId, teacherId, year, presentDays }) {
        const payload = {
            studentid: studentId,
            teacherid: teacherId,
            year: year,
            presentdays: presentDays // ✅ Fixed: Lowercase 'presentdays' to match DB
        };

        if (docId) {
            return await this.databases.updateDocument(conf.databaseId, conf.colAttendance, docId, { presentdays: presentDays });
        } else {
            return await this.databases.createDocument(conf.databaseId, conf.colAttendance, ID.unique(), payload);
        }
    }

    async getAttendance(studentId, year) {
        try {
            return await this.databases.listDocuments(
                conf.databaseId,
                conf.colAttendance,
                [
                    Query.equal('studentid', studentId),
                    Query.equal('year', year)
                ]
            );
        } catch (error) {
            console.warn("Service.getAttendance failed:", error?.message || error);
            return { documents: [] };
        }
    }

    async createMark({ studentId, subject, examType, score, totalMarks }) {
        return await this.databases.createDocument(
            conf.databaseId,
            conf.colMarks,
            ID.unique(),
            {
                studentid: studentId,
                subject: subject,
                examtype: examType,
                score: Number(score),
                totalmarks: Number(totalMarks) // ✅ Fixed: Lowercase 'totalmarks' to match DB
            }
        );
    }

    async getStudentMarks(studentId) {
        try {
            return await this.databases.listDocuments(
                conf.databaseId,
                conf.colMarks,
                [Query.equal('studentid', studentId)]
            );
        } catch (error) {
            console.warn("Service.getStudentMarks failed:", error?.message || error);
            return { documents: [] };
        }
    }

    async updateMark(docId, score) {
        try {
            return await this.databases.updateDocument(conf.databaseId, conf.colMarks, docId, { score: Number(score) });
        } catch (error) {
            console.warn('Service.updateMark failed:', error?.message || error);
            throw error;
        }
    }

    // ============================================================
    // 3. CHAT SERVICES
    // ============================================================

    async sendMessage({ classId, senderId, senderName, role, message, file }) {
        let fileId = null;
        let fileType = null;

        if (file) {
            const uploaded = await this.storage.createFile(conf.bucketId, ID.unique(), file);
            fileId = uploaded.$id;
            fileType = file.type.includes('image') ? 'image' : 'pdf';
        }

        return await this.databases.createDocument(
            conf.databaseId,
            conf.colMessages,
            ID.unique(),
            {
                classid: classId,
                senderid: senderId,
                sendername: senderName,
                role: role,
                message: message,
                fileid: fileId,
                filetype: fileType
            }
        );
    }

    // Get messages for a class with optional pagination.
    // - limit: number of messages to return (default 100)
    // - before: ISO datetime string; returns messages with $createdAt < before (older messages)
    async getMessages(classId, limit = 100, before = null) {
        const queries = [
            Query.equal('classid', classId),
            Query.orderDesc('$createdAt'),
            Query.limit(limit)
        ];

        if (before) {
            // Get messages older than `before` timestamp
            queries.push(Query.lessThan('$createdAt', before));
        }

        return await this.databases.listDocuments(
            conf.databaseId,
            conf.colMessages,
            queries
        );
    }

    // Chat settings (lock/unlock per class)
    async getChatSetting(classId) {
        try {
            return await this.databases.listDocuments(
                conf.databaseId,
                conf.colChatSettings,
                [Query.equal('classid', classId)]
            );
        } catch (error) {
            console.warn('Service.getChatSetting failed:', error?.message || error);
            return { documents: [] };
        }
    }

    async setChatSetting({ docId, classId, teacherId, isLocked }) {
        // Appwrite enforces collection schema: only send attributes that exist there.
        // The collection currently expects `classid` and `islocked` (lowercase).
        const payload = {
            classid: classId,
            islocked: Boolean(isLocked)
        };

        try {
            if (docId) {
                return await this.databases.updateDocument(conf.databaseId, conf.colChatSettings, docId, payload);
            } else {
                return await this.databases.createDocument(conf.databaseId, conf.colChatSettings, ID.unique(), payload);
            }
        } catch (error) {
            console.warn('Service.setChatSetting failed:', error?.message || error);
            throw error;
        }
    }
}

const service = new Service();
export default service;