import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import service from '../../appwrite/db';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
    const { userData } = useSelector((state) => state.auth);
    const [profile, setProfile] = useState(null);
    const [marks, setMarks] = useState([]);
    const [attendance, setAttendance] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData) loadStudentData();
    }, [userData]);

    const loadStudentData = async () => {
        try {
            // 1. Get Profile
            const p = await service.getStudentProfile(userData.$id);
            if (p.documents.length > 0) {
                const studData = p.documents[0];
                setProfile(studData);

                // 2. Get Marks
                const m = await service.getStudentMarks(studData.$id);
                setMarks(m.documents);

                // 3. Get Attendance
                const a = await service.getAttendance(studData.$id, new Date().getFullYear());
                if (a.documents.length > 0) {
                    const total = a.documents[0].presentDays.reduce((a, b) => a + b, 0);
                    setAttendance(total);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- CALCULATIONS ---
    const totalScore = marks.reduce((sum, m) => sum + Number(m.score), 0);
    const totalMax = marks.reduce((sum, m) => sum + Number(m.totalMarks), 0);
    const avgPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    // Loading Skeleton
    if (loading) return (
        <div className="min-h-screen bg-[#f8f7f3] p-4 flex flex-col gap-4 animate-pulse">
            <div className="h-20 bg-gray-200 rounded-xl"></div>
            <div className="h-40 bg-gray-200 rounded-xl"></div>
            <div className="h-24 bg-gray-200 rounded-xl"></div>
        </div>
    );

    if (!profile) return <div className="p-10 text-center text-gray-500">Profile not found.</div>;

    // Helper to get initials
    const initials = profile.fullname ? profile.fullname.substring(0, 2).toUpperCase() : "ST";

    return (
        <div className="min-h-screen bg-[#f8f7f3] pb-24 safe-area-top">
            
            {/* 1. Header */}
            <div className="px-5 pt-6 pb-2 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-800">Student Profile</h1>
                
                {/* Chat Button (Top Right) */}
                <Link to={`/chat/${profile.class}`} className="relative">
                    <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    {/* Notification Dot */}
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-[#f8f7f3] rounded-full"></span>
                </Link>
            </div>

            {/* 2. Profile Card */}
            <div className="mx-4 mt-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md ring-4 ring-blue-50">
                        {initials}
                    </div>
                    
                    {/* Info */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{profile.fullname}</h2>
                        <p className="text-xs text-gray-500 mt-1">{profile.email}</p>
                        <div className="flex gap-2 mt-2">
                             <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                                Class {profile.class}
                            </span>
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200">
                                Roll {profile.roll}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Quick Stats (3 Columns) */}
            <div className="mx-4 mt-6">
                <h3 className="text-sm font-bold text-gray-600 mb-3 ml-1">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-3">
                    
                    {/* Marks */}
                    <div className="bg-blue-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-blue-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Avg Marks</p>
                        <p className="text-2xl font-bold">{avgPercentage}%</p>
                    </div>

                    {/* Attendance */}
                    <div className="bg-emerald-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-emerald-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Attendance</p>
                        <p className="text-2xl font-bold">{attendance}</p>
                    </div>

                    {/* Exams */}
                    <div className="bg-orange-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-orange-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Exams</p>
                        <p className="text-2xl font-bold">{marks.length}</p>
                    </div>
                </div>
            </div>

            {/* 4. Details Section (List Layout) */}
            <div className="mx-4 mt-6 space-y-3">
                
                {/* Row 1: Overall Attendance */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <span className="text-sm font-medium text-gray-600">Total Present Days</span>
                    </div>
                    <span className="font-bold text-gray-800">{attendance} Days</span>
                </div>

                {/* Row 2: Average Marks */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <span className="text-sm font-medium text-gray-600">Academic Score</span>
                    </div>
                    <span className="font-bold text-gray-800">{avgPercentage}%</span>
                </div>

                {/* Row 3: Class Section */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <span className="text-sm font-medium text-gray-600">Assigned Section</span>
                    </div>
                    <span className="font-bold text-gray-800">Section {profile.section || "A"}</span>
                </div>

            </div>

             {/* 5. Performance History (Collapsible or List) */}
             <div className="mx-4 mt-6">
                <h3 className="text-sm font-bold text-gray-600 mb-3 ml-1">Recent Exams</h3>
                {marks.length === 0 ? (
                     <p className="text-center text-xs text-gray-400 py-4">No exam data available.</p>
                ) : (
                    <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
                        {marks.slice(0, 5).map((mark, i) => (
                             <div key={mark.$id} className={`flex justify-between items-center p-4 ${i !== marks.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{mark.subject}</p>
                                    <p className="text-[10px] text-gray-400 uppercase">{mark.examtype}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-blue-600">{mark.score}/{mark.totalMarks}</p>
                                    <p className="text-[10px] text-gray-400">{Math.round((mark.score/mark.totalMarks)*100)}%</p>
                                </div>
                             </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}