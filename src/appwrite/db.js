import conf from "./conf.js";
import { Client, Databases, Storage, ID, Query } from "appwrite";

export class Service {
  client = new Client();
  databases;
  storage;
  conf;

  // ✅ Hardcoded Bucket ID
  bucketId = "6953494d001264b87ba6";

  constructor() {
    this.conf = conf;
    this.client.setEndpoint(conf.appwriteUrl).setProject(conf.projectId);
    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
  }

  // ============================================================
  // 1. USER & ROLE SERVICES (Crucial for Login)
  // ============================================================
  async createUserRole({ userId, email, fullname, role, status }) {
    const roleMapping = {
      teacher: "techer",
      pending_teacher: "pending_techer",
    };
    return await this.databases.createDocument(
      conf.databaseId,
      conf.colUsers,
      userId,
      {
        userid: userId,
        email,
        fullname,
        role: roleMapping[role] || role,
        status,
      }
    );
  }

  // db.js
  // ✅ FIXED
  async getStudentClass(userId) {
    try {
      return await this.databases.listDocuments(
        this.conf.databaseId,
        this.conf.colStudents,
        [Query.equal("userid", userId)]
      );
    } catch (error) {
      console.error("Error in getStudentClass:", error);
      return { documents: [] };
    }
  }

  // ============================================================
  // UPDATE USER STATUS (Active / Blocked)
  // ============================================================
  async updateUserStatus(userId, status) {
    try {
      return await this.databases.updateDocument(
        this.conf.databaseId,
        this.conf.colUsers,
        userId, // Document ID is the userId
        { status: status }
      );
    } catch (error) {
      console.error("Error updating user status:", error);
      throw error;
    }
  }

  // ✅ This function MUST exist to fix your error
  async getUserRole(userId) {
    try {
      return await this.databases.getDocument(
        conf.databaseId,
        conf.colUsers,
        userId
      );
    } catch (error) {
      console.error("Error in getUserRole:", error);
      return null;
    }
  }

  // ============================================================
  // 2. PROFILE SERVICES
  // ============================================================
  async createStudentProfile(data) {
    return await this.databases.createDocument(
      conf.databaseId,
      conf.colStudents,
      ID.unique(),
      {
        userid: data.userid,
        fullname: data.fullname,
        phone: data.phone,
        class: data.classId,
        roll: Number(data.roll),
        age: Number(data.age),
        fathername: data.fathername,
        address: data.address,
        section: data.section,
      }
    );
  }

  async getStudentProfile(userId) {
    try {
      return await this.databases.listDocuments(
        conf.databaseId,
        conf.colStudents,
        [Query.equal("userid", userId)]
      );
    } catch (error) {
      return { documents: [] };
    }
  }

  async createTeacherProfile(data) {
    return await this.databases.createDocument(
      conf.databaseId,
      conf.colTeachers,
      ID.unique(),
      {
        userid: data.userid,
        fullname: data.fullname,
        phone: data.phone,
        status: "active",
        subject: data.subject,
        isclassteacher: "false",
      }
    );
  }

  async getTeacherProfile(userId) {
    try {
      const res = await this.databases.listDocuments(
        conf.databaseId,
        conf.colTeachers,
        [Query.equal("userid", userId)]
      );
      return res.documents[0];
    } catch (error) {
      return null;
    }
  }

  async getStudentsByClass(className) {
    try {
      return await this.databases.listDocuments(
        conf.databaseId,
        conf.colStudents,
        [Query.equal("class", className), Query.orderAsc("roll")]
      );
    } catch (error) {
      return { documents: [] };
    }
  }

  // ============================================================
  // 3. ATTENDANCE (Schema: days [int], month [string])
  // ============================================================

  async getAttendance(studentId, year) {
    try {
      return await this.databases.listDocuments(
        conf.databaseId,
        conf.colAttendance,
        [Query.equal("studentid", studentId), Query.equal("year", year)]
      );
    } catch (error) {
      return { documents: [] };
    }
  }

  async markAttendance({ docId, studentId, teacherId, year, month, count }) {
    const payload = {
      studentid: studentId,
      teacherid: teacherId,
      year: Number(year),
      month: month, // String (e.g., "Jan")
      days: Number(count), // Integer (e.g., 20)
    };

    if (docId) {
      // Update existing document (Only update the count)
      return await this.databases.updateDocument(
        conf.databaseId,
        conf.colAttendance,
        docId,
        { days: Number(count) }
      );
    } else {
      // Create new document
      return await this.databases.createDocument(
        conf.databaseId,
        conf.colAttendance,
        ID.unique(),
        payload
      );
    }
  }

  // ============================================================
  // 4. MARKS SERVICES
  // ============================================================

  async createMark(data) {
    // console.log(
    //   "studentId:",
    //   data.studentId,
    //   "subject:",
    //   data.subject,
    //   "examType:",
    //   data.examType,
    //   "score:",
    //   data.score,
    //   "class:",
    //   data.class
    // );

    return await this.databases.createDocument(
      conf.databaseId,
      conf.colMarks,
      ID.unique(),
      {
        studentid: data.studentId, // student profile ID
        subject: data.subject,
        examtype: String(data.examType), // ✅ MUST BE STRING
        score: Number(data.score),
        totalmarks: Number(data.totalMarks),
        class: data.class, // required for rank
      }
    );
  }

  // Get all marks of a student
  async getStudentMarks(studentId) {
    try {
      return await this.databases.listDocuments(
        conf.databaseId,
        conf.colMarks,
        [Query.equal("studentid", studentId)]
      );
    } catch {
      return { documents: [] };
    }
  }

  // Update marks
  async updateMark(docId, score) {
    return await this.databases.updateDocument(
      conf.databaseId,
      conf.colMarks,
      docId,
      { score: Number(score) }
    );
  }

  // Rank calculation helper
  async getExamMarksByClass(className, examType) {
    try {
      return await this.databases.listDocuments(
        conf.databaseId,
        conf.colMarks,
        [
          Query.equal("class", String(className)),
          Query.equal("examtype", String(examType)), // ✅ STRING
        ]
      );
    } catch {
      return { documents: [] };
    }
  }

  // ============================================================
  // 5. CHAT & STORAGE (Fixed Preview)
  // ============================================================
  async sendMessage({ classId, senderId, senderName, role, message, file }) {
    let fileId = null;
    let fileType = null;
    if (file) {
      try {
        const uploaded = await this.storage.createFile(
          this.bucketId,
          ID.unique(),
          file
        );
        fileId = uploaded.$id;
        fileType =
          file.type && file.type.startsWith("image/") ? "image" : "file";
      } catch (error) {
        throw new Error("Failed to upload file");
      }
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
        message: message || "",
        fileid: fileId,
        filetype: fileType,
      }
    );
  }

  async getMessages(classId, limit = 100, before = null) {
    const queries = [
      Query.equal("classid", classId),
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ];
    if (before) queries.push(Query.lessThan("$createdAt", before));
    return await this.databases.listDocuments(
      conf.databaseId,
      conf.colMessages,
      queries
    );
  }

  getFilePreview(fileId) {
    if (!fileId) return null;
    try {
      const url = this.storage.getFileView(this.bucketId, fileId);
      return url.href ? url.href : url.toString();
    } catch (e) {
      return `${conf.appwriteUrl}/storage/buckets/${this.bucketId}/files/${fileId}/view?project=${conf.projectId}`;
    }
  }

  getFileDownload(fileId) {
    if (!fileId) return null;
    try {
      const url = this.storage.getFileView(this.bucketId, fileId);
      return url.href ? url.href : url.toString();
    } catch (e) {
      return `${conf.appwriteUrl}/storage/buckets/${this.bucketId}/files/${fileId}/view?project=${conf.projectId}`;
    }
  }

  async getChatSetting(classId) {
    try {
      return await this.databases.listDocuments(
        conf.databaseId,
        conf.colChatSettings,
        [Query.equal("classid", classId)]
      );
    } catch (error) {
      return { documents: [] };
    }
  }

  async setChatSetting({ docId, classId, teacherId, isLocked }) {
    const payload = { classid: classId, islocked: Boolean(isLocked) };
    if (docId)
      return await this.databases.updateDocument(
        conf.databaseId,
        conf.colChatSettings,
        docId,
        payload
      );
    else
      return await this.databases.createDocument(
        conf.databaseId,
        conf.colChatSettings,
        ID.unique(),
        payload
      );
  }
}

const service = new Service();
export default service;
