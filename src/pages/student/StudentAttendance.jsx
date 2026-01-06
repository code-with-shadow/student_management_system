import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import service from '../../appwrite/db';

export default function StudentAttendance({ 
    attendanceMap: propMap,   // Data passed from parent (Teacher View)
    loading: propLoading,     // Loading state from parent
    isOverview = false        // Flag to disable internal fetch
}) {
    const { userData } = useSelector((state) => state.auth);
    
    // Internal State (Only used if isOverview is false)
    const [internalMap, setInternalMap] = useState({});
    const [internalLoading, setInternalLoading] = useState(true);
    
    // 🚀 DECIDE DATA SOURCE: Props (Teacher) vs Internal State (Student)
    const attendanceMap = isOverview ? (propMap || {}) : internalMap;
    const loading = isOverview ? propLoading : internalLoading;

    // Month names must match what is saved in DB ("Jan", "Feb"...)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth(); // 0 = Jan

    // ============================================================
    // FETCH DATA (ONLY FOR STUDENT VIEW)
    // ============================================================
    useEffect(() => {
        // 🛑 If Teacher/Overview mode, DO NOT fetch. Use props.
        if (isOverview) return; 

        if (userData) loadAttendance();
    }, [userData, isOverview]);

    const loadAttendance = async () => {
        setInternalLoading(true);
        try {
            // 1. Get Student Profile ID
            const p = await service.getStudentProfile(userData.$id);
            const stud = p.documents && p.documents[0];
            
            if (stud) {
                // 2. Fetch all month records for this year
                const res = await service.getAttendance(stud.$id, currentYear);
                
                // 3. Convert List to Map: { "Jan": 20, "Feb": 18 }
                const map = {};
                if (res && res.documents) {
                    res.documents.forEach(doc => {
                        if(doc.month) {
                            map[doc.month] = doc.days || 0;
                        }
                    });
                }
                setInternalMap(map);
            }
        } catch (e) {
            console.error("❌ Attendance Fetch Error:", e);
        } finally {
            setInternalLoading(false);
        }
    };

    // Calculate Total Present by summing all values in the map
    const totalPresent = Object.values(attendanceMap).reduce((sum, days) => sum + Number(days), 0);

    return (
        <div className={`bg-[#f8f7f3] safe-area-top ${isOverview ? 'pb-0 mt-6' : 'min-h-screen pb-20 p-4'}`}>
            
            {/* Header Card (Hide title in overview if desired, or keep it) */}
            <div className={`bg-white p-5 rounded-2xl shadow-sm mb-6 border border-gray-100 ${isOverview ? 'mx-4' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold text-gray-800">
                        {isOverview ? "Attendance Detail" : "My Attendance"}
                    </h1>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">
                        {currentYear}
                    </span>
                </div>
                <div className="flex items-end gap-2">
                    <span className="text-4xl font-extrabold text-blue-600">{totalPresent}</span>
                    <span className="text-sm text-gray-400 font-medium mb-1">days present this year</span>
                </div>
            </div>

            {/* Months Grid */}
            {loading ? (
                <div className="flex justify-center mt-10">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${isOverview ? 'mx-4' : ''}`}>
                    {months.map((monthName, index) => {
                        // Logic for UI states
                        const days = attendanceMap[monthName]; // Value from DB or undefined
                        const isFuture = index > currentMonthIndex;
                        const hasData = days !== undefined;

                        // Roughly calculating percentage (assuming 26 working days)
                        // Using 30 as denominator purely for visual bar scaling
                        const percentage = hasData ? Math.min(Math.round((days / 26) * 100), 100) : 0;

                        return (
                            <div key={monthName} className={`
                                p-4 rounded-xl border relative overflow-hidden transition-all
                                ${isFuture ? 'bg-gray-50 border-gray-100 opacity-50' : 'bg-white border-gray-200 shadow-sm'}
                            `}>
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-gray-700">{monthName}</h3>
                                    {hasData && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${percentage >= 75 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {percentage}%
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-end gap-1">
                                    {isFuture ? (
                                        <span className="text-xs text-gray-400 italic font-medium">Upcoming</span>
                                    ) : hasData ? (
                                        <>
                                            <span className="text-2xl font-bold text-gray-800">{days}</span>
                                            <span className="text-xs text-gray-400 mb-1">days</span>
                                        </>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Not updated</span>
                                    )}
                                </div>

                                {/* Visual Progress Bar */}
                                {!isFuture && (
                                    <div className="w-full h-1 bg-gray-100 mt-3 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${percentage >= 75 ? 'bg-green-500' : 'bg-orange-400'}`} 
                                            style={{ width: hasData ? `${percentage}%` : '0%' }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}