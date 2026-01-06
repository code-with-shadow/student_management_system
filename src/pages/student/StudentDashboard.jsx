import React, { useEffect, useState } from 'react';
import classSubjects from '../../data/classSubjects';
import { useSelector } from 'react-redux';
import service from '../../appwrite/db';

export default function StudentDashboard() {
    const { userData } = useSelector((state) => state.auth);

    // Local State
    const [marks, setMarks] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [examSummaries, setExamSummaries] = useState([]);
    const [overallRank, setOverallRank] = useState(null);
    const [totalSubjects, setTotalSubjects] = useState(0);

    // ============================================================
    // 1. FETCH DATA & CALCULATE RANK
    // ============================================================
    useEffect(() => {
        if (!userData) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const year = new Date().getFullYear();

                // 1️⃣ Get student profile FIRST
                const profileRes = await service.getStudentProfile(userData.$id);
                const stud = profileRes?.documents?.[0];

                if (!stud) {
                    console.warn("No student profile found");
                    return;
                }
                setStudent(stud);

                // 2️⃣ Fetch marks + attendance
                const [marksRes, attRes] = await Promise.all([
                    service.getStudentMarks(stud.$id),
                    service.getAttendance(stud.$id, year)
                ]);

                const myMarks = marksRes?.documents || [];
                setMarks(myMarks);

                // --- PROCESS ATTENDANCE ---
                const map = {};
                attRes?.documents?.forEach(doc => {
                    if (doc.month) map[doc.month] = doc.days || 0;
                });
                setAttendanceMap(map);

                // ============================================================
                // ✅ RANK LOGIC (Including Zeros & Full Class Count)
                // ============================================================

                // A. Fetch ALL students in the class first (to get the correct total count)
                const classStudentsRes = await service.getStudentsByClass(stud.class);
                const classStudents = classStudentsRes?.documents || [];
                const totalClassCount = classStudents.length;

                const targetExams = ['1', '2', '3'];
                const summaries = [];

                // B. Fetch marks for all exams in parallel
                const classDataPromises = targetExams.map(type =>
                    service.getExamMarksByClass(stud.class, type)
                );
                
                const classDataResults = await Promise.all(classDataPromises);
                
                // Also gather ALL class marks for Overall Rank calculation later
                const allClassMarksFlat = classDataResults.flatMap(res => res?.documents || []);

                targetExams.forEach((examType, index) => {
                    // --- 1. My Stats ---
                    const myExamMarks = myMarks.filter(m => String(m.examtype) === examType);
                    const hasMyData = myExamMarks.length > 0;

                    const myTotal = myExamMarks.reduce((sum, m) => sum + Number(m.score), 0);
                    const maxTotal = myExamMarks.reduce((sum, m) => sum + Number(m.totalmarks), 0);
                    
                    // --- 2. Class Stats (Ranking) ---
                    const examClassMarks = classDataResults[index]?.documents || [];

                    // Initialize every student with 0 (so those with no marks are still ranked at bottom)
                    const studentTotals = {};
                    classStudents.forEach(s => {
                        studentTotals[s.$id] = 0; // Use $id as key
                    });

                    // Add up marks for those who have them
                    examClassMarks.forEach(m => {
                        const score = Number(m.score) || 0;
                        // Handle potential ID mismatch ($id vs userid)
                        if (studentTotals.hasOwnProperty(m.studentid)) {
                            studentTotals[m.studentid] += score;
                        } else {
                            // Try matching by UserID if StudentID didn't work
                            const studentByUserId = classStudents.find(s => s.userid === m.studentid);
                            if (studentByUserId) {
                                studentTotals[studentByUserId.$id] += score;
                            }
                        }
                    });

                    // Sort scores high to low
                    const scores = Object.values(studentTotals).sort((a, b) => b - a);

                    // Find my rank
                    // Note: We search for 'myTotal' in the sorted list.
                    // Ideally we search by ID, but searching by score value is safe enough here if sorted correctly.
                    // Better approach: Sort [ {id, score} ] and find index of my ID.
                    
                    const rankedList = Object.entries(studentTotals)
                        .map(([id, score]) => ({ id, score }))
                        .sort((a, b) => b.score - a.score);

                    const myRankIndex = rankedList.findIndex(item => item.id === stud.$id);
                    const myRank = myRankIndex !== -1 ? myRankIndex + 1 : "-";

                    summaries.push({
                        type: examType,
                        myTotal,
                        maxTotal,
                        rank: myRank,
                        totalStudents: totalClassCount, // Show full class size
                        hasData: hasMyData
                    });
                });

                setExamSummaries(summaries);

                // --- OVERALL RANK CALCULATION ---
                
                // 1. Initialize Everyone with 0
                const overallMap = {};
                classStudents.forEach(s => { overallMap[s.$id] = 0; });

                // 2. Sum ALL marks
                allClassMarksFlat.forEach(m => {
                    const score = Number(m.score) || 0;
                    if (overallMap.hasOwnProperty(m.studentid)) {
                        overallMap[m.studentid] += score;
                    } else {
                        const studentByUserId = classStudents.find(s => s.userid === m.studentid);
                        if (studentByUserId) {
                            overallMap[studentByUserId.$id] += score;
                        }
                    }
                });

                // 3. Sort & Find Me
                const overallSorted = Object.entries(overallMap)
                    .map(([sid, total]) => ({ sid, total }))
                    .sort((a, b) => b.total - a.total);

                const myOverallIndex = overallSorted.findIndex(s => s.sid === stud.$id);

                if (myOverallIndex !== -1) {
                    setOverallRank({ rank: myOverallIndex + 1, total: totalClassCount });
                } else {
                    setOverallRank(null);
                }

                // Calculate Total Subjects
                if (classSubjects[String(stud.class)]) {
                    setTotalSubjects(classSubjects[String(stud.class)].length);
                }
                
            } catch (e) {
                console.error("Dashboard Fetch Error:", e);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [userData]);

    // ============================================================
    // 2. CALCULATIONS (UI)
    // ============================================================
    const totalPresent = Object.values(attendanceMap).reduce((sum, days) => sum + Number(days), 0);
    const totalWorkingDays = 365;
    const attendancePercentage = totalWorkingDays > 0 ? Math.min(Math.round((totalPresent / totalWorkingDays) * 100), 100) : 0;
    const initials = student?.fullname ? student.fullname.substring(0, 2).toUpperCase() : "ST";

    return (
        <div className="min-h-screen bg-[#f8f7f3] pb-24 safe-area-top">

            {/* Header */}
            <div className="px-5 pt-6 pb-2 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-800">Student Profile</h1>
                {loading && <span className="text-xs text-blue-500 animate-pulse font-bold">Refreshing...</span>}
            </div>

            {/* Profile Card */}
            <div className="mx-4 mt-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md ring-4 ring-blue-50">
                        {initials}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{student?.fullname || "Loading..."}</h2>
                        <p className="text-xs text-gray-500 mt-1">Roll No: {student?.roll}</p>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-100">
                                Class {student?.class} - Section {student?.section}
                            </span>
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-100">
                                Phone {student?.phone}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="mx-4 mt-6">
                <h3 className="text-sm font-bold text-gray-600 mb-3 ml-1">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-blue-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Present</p>
                        <p className="text-2xl font-bold">{totalPresent}</p>
                        <p className="text-[10px] opacity-70">Days</p>
                    </div>
                    <div className="bg-emerald-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-emerald-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Attendance</p>
                        <p className="text-2xl font-bold">{attendancePercentage}%</p>
                        <p className="text-[10px] opacity-70">Yearly</p>
                    </div>
                    <div className="bg-orange-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-orange-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Subjects</p>
                        <p className="text-2xl font-bold">{totalSubjects}</p>
                        <p className="text-[10px] opacity-70">Total</p>
                    </div>
                </div>
            </div>

            {/* Overall Rank Card */}
            <div className="mx-4 mt-3">
                <div className="bg-white border border-orange-200 text-orange-600 rounded-xl p-3 flex justify-between items-center shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wider">Overall Class Rank</span>
                    <span className="text-lg font-black">
                        {overallRank ? `#${overallRank.rank}` : '--'}
                        <span className="text-xs text-gray-400 font-normal ml-1">/ {overallRank ? overallRank.total : 0}</span>
                    </span>
                </div>
            </div>

            {/* Academic Overview */}
            <div className="mx-4 mt-6">
                <h3 className="text-sm font-bold text-gray-600 ml-1 mb-3">Academic Overview</h3>

                <div className="flex flex-col gap-3">
                    {['1', '2', '3'].map((examType) => {
                        const summary = examSummaries.find(s => s.type === examType);
                        const hasData = !!summary;

                        return (
                            <div key={examType} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                                {/* Left: Exam Name */}
                                <div>
                                    <h4 className="font-bold text-black text-sm">Exam {examType}</h4>
                                </div>

                                {/* Center: Score */}
                                <div className="text-center">
                                    {hasData ? (
                                        <>
                                            <p className="text-xs text-gray-800 font-bold uppercase">{hasData ? "Total Marks" : "Status"}</p>
                                            <p className="text-sm font-extrabold text-blue-600">
                                                {summary.myTotal} <span className="text-gray-300 font-normal">/</span> {summary.maxTotal}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-xs font-bold text-gray-300">Pending</p>
                                    )}
                                </div>

                                {/* Right: Rank */}
                                <div className="text-right">
                                    {hasData ? (
                                        <div className="bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">
                                            <p className="text-[10px] text-orange-400 font-bold uppercase">Rank</p>
                                            <p className="text-sm font-black text-orange-600">
                                                #{summary.rank} <span className="text-[10px] font-medium text-orange-400">/ {summary.totalStudents}</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="px-3 py-1">
                                            <p className="text-[10px] text-gray-300">--</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}