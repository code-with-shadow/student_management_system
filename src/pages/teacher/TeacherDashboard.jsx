import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import service from '../../appwrite/db';

export default function TeacherDashboard() {
    const { userData } = useSelector((state) => state.auth);
    const [profile, setProfile] = useState(null);
    
    // State for the Class Leaders List
    const [classOverviews, setClassOverviews] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const navigate = useNavigate();
    const location = useLocation(); 

    useEffect(() => {
        if (userData) {
            loadTeacherData();
            loadClassToppers();
        }
    }, [userData, location]);

    const loadTeacherData = async () => {
        try {
            const p = await service.getTeacherProfile(userData.$id);
            setProfile(p || null);
        } catch (e) {
            console.error("Error loading teacher profile:", e);
        }
    };

    // =========================================================================
    // 🏆 CALCULATE OVERALL TOPPERS (Exam 1 + 2 + 3)
    // =========================================================================
    const loadClassToppers = async () => {
        console.clear(); 
        console.log("🚀 STARTING OVERALL TOPPER CALCULATION...");
        setLoading(true);
        
        const targetClasses = ['5', '6', '7', '8', '9', '10', '11', '12'];
        const targetExams = ['1', '2', '3']; // ✅ We will fetch ALL of these
        
        const results = await Promise.all(targetClasses.map(async (className) => {
            try {
                // 1. Get Students
                const studRes = await service.getStudentsByClass(className);
                const students = studRes?.documents || [];
                const totalStudents = students.length; 

                if (totalStudents === 0) {
                    return { className, topper: null, totalStudents: 0 };
                }

                // 2. Get Marks for ALL Exams (1, 2, 3) in Parallel
                const examPromises = targetExams.map(examType => 
                    service.getExamMarksByClass(className, examType)
                );
                
                // Wait for all exams to return
                const examResults = await Promise.all(examPromises);
                
                // Flatten results: [ [Exam1Marks], [Exam2Marks] ] -> [ AllMarks ]
                const allMarks = examResults.flatMap(res => res?.documents || []);

                // 3. Calculate Overall Totals per Student
                const studentTotals = {}; 
                allMarks.forEach(m => {
                    const score = Number(m.score) || 0;
                    if(m.studentid) {
                        // Sum up scores from all exams
                        studentTotals[m.studentid] = (studentTotals[m.studentid] || 0) + score;
                    }
                });

                // 4. Sort (High to Low - Based on Grand Total)
                const sortedIDs = Object.keys(studentTotals).sort((a, b) => studentTotals[b] - studentTotals[a]);

                // 5. Find Topper Student
                let topper = null;
                if (sortedIDs.length > 0) {
                    const topperId = sortedIDs[0];
                    const topperScore = studentTotals[topperId]; // This is the Grand Total Score

                    // Try matching $id OR userid
                    const topperStudent = students.find(s => s.$id === topperId || s.userid === topperId);
                    
                    if (topperStudent) {
                        topper = {
                            name: topperStudent.fullname,
                            roll: topperStudent.roll,
                            score: topperScore,
                            id: topperStudent.$id
                        };
                    }
                }

                return { className, topper, totalStudents };

            } catch (err) {
                console.error(`❌ ERROR in Class ${className}:`, err);
                return { className, topper: null, totalStudents: 0, error: true };
            }
        }));

        const validResults = results.filter(Boolean).sort((a, b) => Number(a.className) - Number(b.className));
        setClassOverviews(validResults);
        setLoading(false);
    };

    if (loading && !profile) return (
        <div className="min-h-screen bg-[#f8f7f3] p-4 flex flex-col gap-4 animate-pulse">
            <div className="h-20 bg-gray-200 rounded-xl"></div>
            <div className="h-60 bg-gray-200 rounded-xl"></div>
        </div>
    );

    const initials = profile?.fullname ? profile.fullname.substring(0, 2).toUpperCase() : 'TC';
    const totalStudentsAll = classOverviews.reduce((acc, item) => acc + item.totalStudents, 0);

    return (
        <div className="min-h-screen bg-[#f8f7f3] pb-20 safe-area-top">
            
            {/* Header */}
            <div className="px-5 pt-6 pb-2 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-800">Teacher Dashboard</h1>
            </div>

            {/* Profile Card */}
            <div className="mx-4 mt-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md ring-4 ring-purple-50">
                        {initials}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{profile?.fullname || "Teacher"}</h2>
                        <p className="text-xs text-gray-500 mt-1">{userData?.email}</p>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-100">
                                {profile?.subject || 'Faculty'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="mx-4 mt-6">
                <h3 className="text-sm font-bold text-gray-600 mb-3 ml-1">Quick Overview</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-purple-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-purple-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Classes</p>
                        <p className="text-2xl font-bold">{classOverviews.length}</p>
                    </div>
                    <div className="bg-emerald-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-emerald-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Students</p>
                        <p className="text-2xl font-bold">{totalStudentsAll}</p>
                    </div>
                    <div className="bg-blue-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-blue-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Active</p>
                        <p className="text-2xl font-bold">100%</p>
                    </div>
                </div>
            </div>

            {/* Class Leaders List */}
            <div className="mx-4 mt-8">
                <h3 className="text-sm font-bold text-gray-600 mb-3 ml-1 grid grid-cols-4">
                    <span>Class</span>
                    <span>Performance</span>
                    <span>Leaders</span>
                    {/* ✅ UPDATED BADGE: Now shows "Overall Rank" instead of "Exam 3" */}
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-center">Overall Rank</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {loading ? (
                        <p className="col-span-full text-center text-xs text-gray-400 py-10">Calculating rankings...</p>
                    ) : (
                        classOverviews.map((item) => (
                            <div 
                                key={item.className} 
                                // onClick={() => navigate(`/teacher/class/${item.className}`)} 
                                className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all active:scale-[0.98]"
                            >
                                {/* LEFT: Class + Name */}
                                <div className="flex items-center gap-3 w-[40%]">
                                    <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center font-bold text-gray-500 text-sm border border-gray-100 shadow-inner">
                                        {item.className}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Topper</p>
                                        {item.topper ? (
                                            <p className="text-sm font-bold text-purple-700 truncate">
                                                {item.topper.name.split(' ')[0]}
                                            </p>
                                        ) : (
                                            <p className="text-xs font-bold text-gray-300 italic">No Data</p>
                                        )}
                                    </div>
                                </div>

                                {/* MIDDLE: Score Display (Grand Total) */}
                                <div className="flex flex-col items-center justify-center w-[30%] border-l border-r border-gray-50 mx-1">
                                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Total Score</p>
                                    <p className={`text-sm font-black ${item.topper ? 'text-gray-800' : 'text-gray-200'}`}>
                                        {item.topper ? item.topper.score : '-'}
                                    </p>
                                </div>

                                {/* RIGHT: Rank Badge */}
                                <div className="text-right w-[30%] flex justify-end">
                                    {item.topper ? (
                                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                            <span className="text-xs">👑</span>
                                            <span className="text-xs font-bold text-amber-600">
                                                1 <span className="text-amber-300 text-[10px]">/ {item.totalStudents}</span>
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-300 font-medium">
                                            {item.totalStudents} Std
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}