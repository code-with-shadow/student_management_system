// import React, { useEffect, useState } from 'react';
// import { useSelector } from 'react-redux';
// import service from '../../appwrite/db';

// export default function StudentMarks() {
//     const { userData } = useSelector((state) => state.auth);
//     const [profile, setProfile] = useState(null);
//     const [marks, setMarks] = useState([]);
//     const [selectedExam, setSelectedExam] = useState('Exam 1');
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         if (userData) loadMarks();
//     }, [userData]);

//     const loadMarks = async () => {
//         setLoading(true);
//         try {
//             const p = await service.getStudentProfile(userData.$id);
//             const stud = p.documents && p.documents[0];
//             setProfile(stud || null);
//             if (stud) {
//                 const m = await service.getStudentMarks(stud.$id);
//                 setMarks(m.documents || []);
//             }
//         } catch (e) {
//             console.error(e);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const exams = ['Exam 1', 'Exam 2', 'Exam 3'];

//     // Filter marks by selected exam
//     const marksForExam = marks.filter(m => (m.examtype || '').toLowerCase() === selectedExam.toLowerCase());

//     // Get unique subjects for this student
//     const subjects = Array.from(new Set(marks.map(m => m.subject))).filter(Boolean);

//     return (
//         <div className="min-h-screen bg-[#f8f7f3] pb-20 p-4 safe-area-top">
//             <h1 className="text-lg font-bold mb-4">My Marks</h1>

//             <div className="flex gap-3 mb-4 overflow-x-auto">
//                 {exams.map(ex => (
//                     <button key={ex} onClick={() => setSelectedExam(ex)}
//                         className={`min-w-[90px] py-3 px-4 rounded-2xl font-bold text-sm ${selectedExam === ex ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 shadow-sm'}`}>
//                         {ex}
//                     </button>
//                 ))}
//             </div>

//             {loading ? (
//                 <div className="animate-pulse space-y-3">
//                     <div className="h-8 bg-gray-200 rounded"></div>
//                     <div className="h-8 bg-gray-200 rounded"></div>
//                 </div>
//             ) : (
//                 <div className="space-y-3">
//                     {subjects.length === 0 ? (
//                         <p className="text-sm text-gray-500">No marks available yet.</p>
//                     ) : (
//                         <div className="grid grid-cols-1 gap-3">
//                             {subjects.map(sub => {
//                                 const examMark = marksForExam.find(m => m.subject === sub);
//                                 return (
//                                     <div key={sub} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
//                                         <div>
//                                             <p className="font-bold text-gray-800">{sub}</p>
//                                             <p className="text-xs text-gray-400">{examMark ? examMark.examtype : selectedExam}</p>
//                                         </div>
//                                         <div className="text-right">
//                                             <p className="font-bold text-blue-600">{examMark ? `${examMark.score}/${examMark.totalmarks}` : '—'}</p>
//                                             <p className="text-xs text-gray-400">{examMark ? `${Math.round((examMark.score / examMark.totalmarks) * 100)}%` : ''}</p>
//                                         </div>
//                                     </div>
//                                 );
//                             })}
//                         </div>
//                     )}
//                 </div>
//             )}
//         </div>
//     );
// }


import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import service from '../../appwrite/db';
import { getSubjectsForClass } from "../../data/classSubjects" ; // 👈 IMPORT THIS

export default function StudentMarks() {
    const { userData } = useSelector((state) => state.auth);
    const [profile, setProfile] = useState(null);
    const [marks, setMarks] = useState([]);
    
    // Make sure these match exactly what you save in Teacher Dashboard
    const exams = ["1", "2", "3"];
    const [selectedExam, setSelectedExam] = useState(exams[0]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userData) loadMarks();
    }, [userData]);

    const loadMarks = async () => {
        setLoading(true);
        try {
            // 1. Get Profile to know the Class (e.g., "6")
            const p = await service.getStudentProfile(userData.$id);
            const stud = p.documents && p.documents[0];
            setProfile(stud || null);

            // 2. Get Marks from DB
            if (stud) {
                const m = await service.getStudentMarks(stud.$id);
                setMarks(m.documents || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // 1. Get the Fixed List of Subjects for this student's class
    // (This ensures "Science" shows up even if there are no marks yet)
    const subjectList = profile ? getSubjectsForClass(profile.class) : [];

    return (
        <div className="min-h-screen bg-[#f8f7f3] pb-20 p-4 safe-area-top">
            <h1 className="text-lg font-bold mb-4">My Marks</h1>

            {/* Exam Tabs */}
            <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
                {exams.map(ex => (
                    <button key={ex} onClick={() => setSelectedExam(ex)}
                        className={`whitespace-nowrap py-2 px-4 rounded-xl font-bold text-sm border ${selectedExam === ex ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                        {ex}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center text-gray-400 mt-10">Loading...</div>
            ) : (
                <div className="space-y-3">
                    {subjectList.length === 0 ? (
                        <p className="text-gray-400">No subjects found.</p>
                    ) : (
                        subjectList.map(subjectName => {
                            // 2. Find the mark for this specific subject & exam
                            const markEntry = marks.find(m => 
                                m.subject === subjectName && 
                                m.examtype === selectedExam
                            );

                            return (
                                <div key={subjectName} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-gray-800">{subjectName}</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{selectedExam}</p>
                                    </div>
                                    
                                    <div className="text-right">
                                        {markEntry ? (
                                            // 3. If mark exists, show it
                                            <div>
                                                <span className="text-xl font-bold text-blue-600">{markEntry.score}</span>
                                                <span className="text-xs text-gray-400"> / {markEntry.totalmarks || 100}</span>
                                            </div>
                                        ) : (
                                            // 4. If NO mark exists, show "Not Graded" (Instead of hiding it!)
                                            <span className="text-xs font-bold text-gray-300 italic">Not Graded</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}