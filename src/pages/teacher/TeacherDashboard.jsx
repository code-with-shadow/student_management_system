import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import service from '../../appwrite/db';

export default function TeacherDashboard() {
    const { userData } = useSelector((state) => state.auth);
    const [profile, setProfile] = useState(null);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (userData) loadTeacherData();
    }, [userData]);

    const loadTeacherData = async () => {
        try {
            // 1. Get Teacher Profile
            const p = await service.getTeacherProfile(userData.$id);
            setProfile(p || null);

            // 2. For now, show placeholder classes (you can replace with DB-driven classes later)
            // In a real app you might fetch classes assigned to the teacher from DB
            const cls = [
                { id: '6', name: 'Class 6', section: 'A', students: 45 },
                { id: '7', name: 'Class 7', section: 'B', students: 32 }
            ];
            setClasses(cls);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#f8f7f3] p-4 flex flex-col gap-4 animate-pulse">
            <div className="h-20 bg-gray-200 rounded-xl"></div>
            <div className="h-40 bg-gray-200 rounded-xl"></div>
            <div className="h-24 bg-gray-200 rounded-xl"></div>
        </div>
    );

    if (!profile) return <div className="p-10 text-center text-gray-500">Profile not found.</div>;

    const initials = profile.fullname ? profile.fullname.substring(0, 2).toUpperCase() : 'TC';
    const totalStudents = classes.reduce((s, c) => s + (c.students || 0), 0);

    return (
        <div className="min-h-screen bg-[#f8f7f3] pb-20 safe-area-top">
            <div className="px-5 pt-6 pb-2 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-800">Teacher Profile</h1>
                <Link to="/teacher/class-manager" className="text-sm text-blue-600 font-bold">Manage Classes</Link>
            </div>

            <div className="mx-4 mt-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md ring-4 ring-purple-50">
                        {initials}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{profile.fullname}</h2>
                        <p className="text-xs text-gray-500 mt-1">{profile.subject || 'Teacher'}</p>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-100">Subject {profile.subject || ''}</span>
                            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200">Phone {profile.phone || '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-4 mt-6">
                <h3 className="text-sm font-bold text-gray-600 mb-3 ml-1">Quick Stats</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-purple-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-purple-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Total Classes</p>
                        <p className="text-2xl font-bold">{classes.length}</p>
                    </div>

                    <div className="bg-emerald-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-emerald-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Total Students</p>
                        <p className="text-2xl font-bold">{totalStudents}</p>
                    </div>

                    <div className="bg-blue-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-blue-200">
                        <p className="text-xs font-medium opacity-80 mb-1">Messages</p>
                        <p className="text-2xl font-bold">0</p>
                    </div>
                </div>
            </div>

            <div className="mx-4 mt-6">
                <h3 className="text-sm font-bold text-gray-600 mb-3 ml-1">My Classes</h3>
                <div className="space-y-4">
                    {classes.map((cls) => (
                        <div key={cls.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                </div>
                                <div className="flex-1">
                                    <h2 className="font-bold text-lg text-gray-800">{cls.name} - {cls.section}</h2>
                                    <p className="text-sm text-gray-400">{cls.students} Students</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => navigate(`/teacher/class-manager`)}
                                className="w-full mt-4 py-3 border border-purple-100 text-purple-600 font-bold rounded-xl text-sm hover:bg-purple-50 transition"
                            >
                                Manage Class
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}