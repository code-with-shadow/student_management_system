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
                // ✅ FIXED LOGIC: FORCE CHECK EXAM 1, 2, 3
                // ============================================================


                const targetExams = ['1', '2', '3'];
                const summaries = [];

                // Fetch class data for ALL 3 exams in parallel to calculate ranks
                const classDataPromises = targetExams.map(type =>
                    service.getExamMarksByClass(stud.class, type)
                );

                // Wait for all class data
                const classDataResults = await Promise.all(classDataPromises);

                // Also gather all class marks for Overall Rank calculation
                const allClassMarksFlat = classDataResults.flatMap(res => res?.documents || []);
                // console.log(allClassMarksFlat);

                // console.log("Class Data Results:", classDataResults);
                // console.log("All Class Marks Flat:", allClassMarksFlat);

                targetExams.forEach((examType, index) => {
                    // A. My Data for this exam
                    const myExamMarks = myMarks.filter(m => String(m.examtype) === examType);
                    const hasMyData = myExamMarks.length > 0;

                    const myTotal = myExamMarks.reduce((sum, m) => sum + Number(m.score), 0);
                    const maxTotal = myExamMarks.reduce((sum, m) => sum + Number(m.totalmarks), 0);
                    const percent = maxTotal > 0 ? Math.round((myTotal / maxTotal) * 100) : 0;

                    // B. Class Data (for Rank)
                    const examClassMarks = classDataResults[index]?.documents || [];

                    // Group marks by student ID to get totals per student
                    const studentTotals = {};
                    examClassMarks.forEach(m => {
                        const sid = m.studentid;
                        if (!studentTotals[sid]) studentTotals[sid] = 0;
                        studentTotals[sid] += Number(m.score);
                    });

                    // Sort scores high to low
                    const scores = Object.values(studentTotals).sort((a, b) => b - a);

                    // Find my rank (1-based index)
                    let myRank = "-";
                    if (hasMyData) {
                        const rankIndex = scores.indexOf(myTotal);
                        myRank = rankIndex !== -1 ? rankIndex + 1 : "-";
                    }

                    const totalStudents = scores.length || 0;
                    // alert(totalStudents);

                    // Save summary

                    summaries.push({
                        type: examType,
                        myTotal,
                        maxTotal,
                        percent,
                        rank: myRank,
                        totalStudents,
                        hasData: hasMyData
                    });
                });

                setExamSummaries(summaries);

                // --- OVERALL RANK CALCULATION ---
                // console.group("🏆 DEBUG OVERALL RANK");
                // console.log("1. My Student Profile ID:", stud.$id);
                // console.log("2. Total Class Marks Found:", allClassMarksFlat.length);

                const overallMap = {};
                allClassMarksFlat.forEach(m => {
                    const sid = m.studentid;
                    if (!overallMap[sid]) overallMap[sid] = 0;
                    overallMap[sid] += Number(m.score);
                });

                const overallSorted = Object.entries(overallMap)
                    .map(([sid, total]) => ({ sid, total }))
                    .sort((a, b) => b.total - a.total);

                // console.log("3. Calculated Totals (First 3):", overallSorted.slice(0, 3));

                // 🔍 CHECK FOR ID MATCH
                const myEntry = overallSorted.find(s => s.sid === stud.$id);
                // console.log("4. Did I find myself?", myEntry ? "YES ✅" : "NO ❌");

                const myOverallIndex = overallSorted.findIndex(s => s.sid === stud.$id);

                if (myOverallIndex !== -1) {
                    const finalRank = { rank: myOverallIndex + 1, total: overallSorted.length };
                    setOverallRank(finalRank);
                    // console.log("✅ SETTING RANK:", finalRank);
                    // console.log(finalRank);
                } else {
                    // console.warn("⚠️ Rank not set. Possible ID Mismatch. Check 'studentid' in marks vs 'stud.$id'.");
                    // Fallback: If no match, try finding by UserData ID just in case
                    const fallbackIndex = overallSorted.findIndex(s => s.sid === userData.$id);
                    if (fallbackIndex !== -1) {
                        // console.log("✅ Found using UserAuth ID instead!");
                        setOverallRank({ rank: fallbackIndex + 1, total: overallSorted.length });
                    } else {
                        setOverallRank(null);
                    }
                }
                // console.groupEnd();
                // console.log(overallRank?.rank, overallRank?.total);


                // ============================================================
                // calculate total subjects
                setTotalSubjects(classSubjects[String(stud.class)].length)
                
                
            } catch (e) {
                console.error("Dashboard Fetch Error:", e);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [userData]);

    // ============================================================
    // 2. CALCULATIONS
    // ============================================================
    const totalPresent = Object.values(attendanceMap).reduce((sum, days) => sum + Number(days), 0);
    const totalWorkingDays = 365;
    const attendancePercentage = totalWorkingDays > 0 ? Math.min(Math.round((totalPresent / totalWorkingDays) * 100), 100) : 0;
    const initials = student?.fullname ? student.fullname.substring(0, 2).toUpperCase() : "ST";

    // Filter Marks for Detailed Rows
    const exam1Marks = marks.filter(m => String(m.examtype) === "1");
    const exam2Marks = marks.filter(m => String(m.examtype) === "2");
    const exam3Marks = marks.filter(m => String(m.examtype) === "3");

    // ============================================================
    // 3. COMPONENT: Detailed Exam Row
    // ============================================================
    const ExamRow = ({ title, data, loading }) => (
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
                                {/* <p className="text-sm font-bold text-blue-600">{mark.score} <span className="text-gray-300 font-normal">/</span> {mark.totalmarks}</p>
                                <p className={`text-[10px] font-bold ${mark.score >= 25 ? 'text-green-500' : 'text-red-400'}`}>
                                    {mark.score >= 25 ? 'PASS' : 'FAIL'}
                                </p> */}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
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

            {/* ============================================================ */}
            {/* ✅ ACADEMIC OVERVIEW (3 Fixed Rows: Exam 1, 2, 3)           */}
            {/* ============================================================ */}

            <div className="mx-4 mt-6">
                <h3 className="text-sm font-bold text-gray-600 ml-1 mb-3">Academic Overview</h3>

                <div className="flex flex-col gap-3">
                    {['1', '2', '3'].map((examType) => {
                        // Check if we have calculated data for this exam type
                        const summary = examSummaries.find(s => s.type === examType);
                        const hasData = !!summary;

                        return (
                            <div key={examType} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                                {/* Left: Exam Name */}
                                <div>
                                    <h4 className="font-bold text-black text-sm">Exam {examType}</h4>
                                </div>

                                {/* Center: Score & Percent */}
                                <div className="text-center">
                                    {hasData ? (
                                        <>
                                            <p className="text-xs text-gray-800 font-bold uppercase">{hasData ? "Total Marks" : "Status"}</p>
                                            <p className="text-sm font-extrabold text-blue-600">
                                                {summary.myTotal} <span className="text-gray-300 font-normal">/</span> {summary.maxTotal}
                                            </p>
                                            {/* <p className={`text-[10px] font-bold ${summary.percent >= 35 ? 'text-green-500' : 'text-red-400'}`}>
                                                {summary.percent}% {summary.percent >= 35 ? 'PASS' : 'FAIL'}
                                            </p> */}
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

            {/* --- DETAILED RESULTS --- */}

            {/* <ExamRow title="Exam 1 Results" data={exam1Marks} loading={loading} />
            <ExamRow title="Exam 2 Results" data={exam2Marks} loading={loading} />
            <ExamRow title="Exam 3 Results" data={exam3Marks} loading={loading} /> */}

        </div>
    );
}