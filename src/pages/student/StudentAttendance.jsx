import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import service from '../../appwrite/db';

export default function StudentAttendance() {
    const { userData } = useSelector((state) => state.auth);
    const [profile, setProfile] = useState(null);
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData) loadAttendance();
    }, [userData]);

    const loadAttendance = async () => {
        setLoading(true);
        try {
            const p = await service.getStudentProfile(userData.$id);
            const stud = p.documents && p.documents[0];
            setProfile(stud || null);

            if (stud) {
                const year = new Date().getFullYear();
                const a = await service.getAttendance(stud.$id, year);
                setAttendanceData(a.documents || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const totalPresent = attendanceData.length > 0 ? attendanceData[0].presentdays.reduce((a, b) => a + b, 0) : 0;

    return (
        <div className="min-h-screen bg-[#f8f7f3] pb-20 p-4 safe-area-top">
            <h1 className="text-lg font-bold mb-4">My Attendance</h1>

            {loading ? (
                <div className="animate-pulse space-y-3">
                    <div className="h-8 bg-gray-200 rounded"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-800">Total Present Days</p>
                            <p className="text-xs text-gray-400">Current Year</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-emerald-600">{totalPresent} Days</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <p className="text-sm text-gray-500">Detailed attendance data (per month) will show here when available.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
