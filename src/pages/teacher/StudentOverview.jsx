import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import classSubjects from '../../data/classSubjects'; 
import service from '../../appwrite/db';
import StudentAttendance from '../student/StudentAttendance';

export default function StudentOverview() {
    const { studentId } = useParams();
    const navigate = useNavigate();

    // Local State
    const [marks, setMarks] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [examSummaries, setExamSummaries] = useState([]);
    const [overallRank, setOverallRank] = useState(null);
    const [totalSubjects, setTotalSubjects] = useState(0);

    useEffect(() => {
        if (!studentId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const year = new Date().getFullYear();
                let stud = null;

                // 1️⃣ FETCH STUDENT (Try Document ID first, then fallback)
                try {
                    stud = await service.databases.getDocument(
                        service.conf.databaseId,
                        service.conf.colStudents,
                        studentId
                    );
                } catch (err) {
                    console.log("Document ID failed, trying lookup...", err);
                    // Fallback logic if needed
                }

                if (!stud) {
                    console.warn("Student not found");
                    setLoading(false);
                    return;
                }
                setStudent(stud);

                // Calculate Total Subjects
                if (classSubjects && stud.class) {
                    setTotalSubjects(classSubjects[String(stud.class)]?.length || 0);
                }

                // 2️⃣ Fetch OWN marks & Attendance
                const [marksRes, attRes] = await Promise.all([
                    service.getStudentMarks(stud.$id),
                    service.getAttendance(stud.$id, year)
                ]);

                const myMarks = marksRes?.documents || [];
                setMarks(myMarks);

                // Process Attendance
                const map = {};
                attRes?.documents?.forEach(doc => {
                    if (doc.month) map[doc.month] = doc.days || 0;
                });
                setAttendanceMap(map);

                // ============================================================
                // ✅ RANK LOGIC (Including Zeros & Full Class Count)
                // ============================================================

                // A. Fetch ALL students in the class (The Denominator)
                const classStudentsRes = await service.getStudentsByClass(stud.class);
                const classStudents = classStudentsRes?.documents || [];
                const totalClassCount = classStudents.length;

                const targetExams = ['1', '2', '3']; 
                const summaries = [];

                // B. Fetch All Marks for Class (Exams 1, 2, 3)
                const classDataPromises = targetExams.map(type => 
                    service.getExamMarksByClass(stud.class, type)
                );
                
                const classDataResults = await Promise.all(classDataPromises);
                const allClassMarksFlat = classDataResults.flatMap(res => res?.documents || []);

                targetExams.forEach((examType, index) => {
                    // --- 1. My Stats ---
                    const myExamMarks = myMarks.filter(m => String(m.examtype) === examType);
                    const hasMyData = myExamMarks.length > 0;
                    
                    const myTotal = myExamMarks.reduce((sum, m) => sum + Number(m.score), 0);
                    const maxTotal = myExamMarks.reduce((sum, m) => sum + Number(m.totalmarks), 0);
                    const percent = maxTotal > 0 ? Math.round((myTotal / maxTotal) * 100) : 0;

                    // --- 2. Class Stats (Ranking) ---
                    const examClassMarks = classDataResults[index]?.documents || [];
                    
                    // ✅ Initialize EVERY student with 0 (Crucial for correct rank)
                    const studentTotals = {};
                    classStudents.forEach(s => { studentTotals[s.$id] = 0; });

                    // Sum marks
                    examClassMarks.forEach(m => {
                        const score = Number(m.score) || 0;
                        if (studentTotals.hasOwnProperty(m.studentid)) {
                            studentTotals[m.studentid] += score;
                        } else {
                            // Try matching UserID if StudentID didn't work
                            const studentByUserId = classStudents.find(s => s.userid === m.studentid);
                            if (studentByUserId) {
                                studentTotals[studentByUserId.$id] += score;
                            }
                        }
                    });

                    // Sort High -> Low
                    const rankedList = Object.entries(studentTotals)
                        .map(([id, score]) => ({ id, score }))
                        .sort((a, b) => b.score - a.score);
                    
                    // Find My Rank
                    const myRankIndex = rankedList.findIndex(item => item.id === stud.$id);
                    const myRank = myRankIndex !== -1 ? myRankIndex + 1 : "-";

                    summaries.push({
                        type: examType,
                        myTotal,
                        maxTotal,
                        percent,
                        rank: myRank,
                        totalStudents: totalClassCount,
                        hasData: hasMyData
                    });
                });

                setExamSummaries(summaries);

                // --- OVERALL RANK (Grand Total) ---
                const overallMap = {};
                classStudents.forEach(s => { overallMap[s.$id] = 0; });

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
                
                const overallSorted = Object.entries(overallMap)
                    .map(([sid, total]) => ({ sid, total }))
                    .sort((a, b) => b.total - a.total);

                const myOverallIndex = overallSorted.findIndex(s => s.sid === stud.$id);
                
                if (myOverallIndex !== -1) {
                    setOverallRank({ 
                        rank: myOverallIndex + 1, 
                        total: totalClassCount 
                    });
                } else {
                    setOverallRank(null);
                }

            } catch (e) {
                console.error("Overview Fetch Error:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [studentId]);

    // UI Calculations
    const totalPresent = Object.values(attendanceMap).reduce((sum, days) => sum + Number(days), 0);
    const totalWorkingDays = 365;
    const attendancePercentage = totalWorkingDays > 0 ? Math.min(Math.round((totalPresent / totalWorkingDays) * 100), 100) : 0;
    const initials = student?.fullname ? student.fullname.substring(0, 2).toUpperCase() : "ST";

    // Detailed Lists
    const exam1Marks = marks.filter(m => String(m.examtype) === "1");
    const exam2Marks = marks.filter(m => String(m.examtype) === "2");
    const exam3Marks = marks.filter(m => String(m.examtype) === "3");

    // Helper Component
    const ExamDetailRow = ({ title, data, loading }) => (
        <div className="mx-4 mt-6">
            <h3 className="text-sm font-bold text-gray-600 ml-1 mb-3">{title}</h3>
            {data.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4 bg-white rounded-xl border border-dashed">
                    {loading ? "Loading..." : `No ${title} data available.`}
                </p>
            ) : (
                <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
                    {data.map((mark, i) => (
                        <div key={mark.$id} className={`flex justify-between items-center p-4 ${i !== data.length - 1 ? 'border-b border-gray-50' : ''}`}>
                            <div>
                                <p className="text-sm font-bold text-gray-800">{mark.subject}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Exam Type {mark.examtype}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-blue-600">{mark.score} <span className="text-gray-300">/</span> {mark.totalmarks}</p>
                                <p className={`text-[10px] font-bold ${mark.score >= 25 ? 'text-green-500' : 'text-red-400'}`}>
                                    {mark.score >= 25 ? 'PASS' : 'FAIL'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8f7f3] pb-24 safe-area-top">

            {/* Header & Back Button */}
            <div className="px-5 pt-6 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="bg-white p-2 rounded-full shadow-sm border border-gray-100 text-gray-600 hover:bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Student Overview</h1>
                </div>
                {loading && <span className="text-xs text-blue-500 animate-pulse font-bold">Loading...</span>}
            </div>

            {/* Profile Card */}
            <div className="mx-4 mt-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md ring-4 ring-purple-50">
                        {initials}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{student?.fullname || "Loading..."}</h2>
                        <p className="text-xs text-gray-500 mt-1">Roll No: {student?.roll}</p>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-100">
                                Class {student?.class} - Section {student?.section}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
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
                    
                    {/* Total Subjects */}
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

            {/* Academic Overview (Exam Cards) */}
            <div className="mx-4 mt-6">
                <h3 className="text-sm font-bold text-gray-600 ml-1 mb-3">Academic Overview</h3>
                <div className="flex flex-col gap-3">
                    {examSummaries.map((summary) => (
                        <div key={summary.type} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            {/* Left */}
                            <div>
                                <h4 className="font-bold text-black text-sm">Exam {summary.type}</h4>
                                <p className="text-[10px] text-gray-400">{summary.hasData ? "Total Marks" : "Status"}</p>
                            </div>

                            {/* Center */}
                            <div className="text-center">
                                {summary.hasData ? (
                                    <>
                                        <p className="text-sm font-extrabold text-blue-600">
                                            {summary.myTotal} <span className="text-gray-300 font-normal">/</span> {summary.maxTotal}
                                        </p>
                                        <p className={`text-[10px] font-bold ${summary.percent >= 35 ? 'text-green-500' : 'text-red-400'}`}>
                                            {summary.percent}% {summary.percent >= 35 ? 'PASS' : 'FAIL'}
                                        </p>
                                    </>
                                ) : (
                                    <span className="text-xs font-bold text-gray-300 bg-gray-100 px-2 py-1 rounded">PENDING</span>
                                )}
                            </div>

                            {/* Right */}
                            <div className="text-right">
                                {summary.hasData ? (
                                    <div className="bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">
                                        <p className="text-[10px] text-orange-400 font-bold uppercase">Rank</p>
                                        <p className="text-sm font-black text-orange-600">
                                            #{summary.rank} <span className="text-[10px] font-medium text-orange-400">/ {summary.totalStudents}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-gray-300 px-2">--</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detailed Results */}
            <ExamDetailRow title="Exam 1 Details" data={exam1Marks} loading={loading} />
            <ExamDetailRow title="Exam 2 Details" data={exam2Marks} loading={loading} />
            <ExamDetailRow title="Exam 3 Details" data={exam3Marks} loading={loading} />

            {/* Detailed Attendance View (Teacher Mode) */}
            <StudentAttendance attendanceMap={attendanceMap} totalWorkingDays={totalWorkingDays} loading={loading} isOverview={true} />

        </div>
    );
}