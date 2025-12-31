import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import service from '../../appwrite/db';
import { getSubjectsForClass } from '../../data/classSubjects';

const months = ["None", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ClassManager() {
    const { userData } = useSelector((state) => state.auth);
    
    // State
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [selectedMonth, setSelectedMonth] = useState("None"); // Index string "1", "2" etc
    const [selectedSubject, setSelectedSubject] = useState("None");
    const [selectedExam, setSelectedExam] = useState("1"); // Default Exam Type (1,2,3)

    // Inputs Store
    const [inputs, setInputs] = useState({}); // Stores marks or attendance data temporarily

    // Derived State
    const isAttendanceMode = selectedMonth !== "None";
    const isMarksMode = selectedMonth === "None" && selectedSubject !== "None";

    useEffect(() => {
        loadClassData();
    }, []);

    // Load Students & Subjects
    const loadClassData = async () => {
        setLoading(true);
        try {
            // Hardcoded "6" for now, or fetch from teacher profile
            const classId = "6"; 
            
            const studentRes = await service.getStudentsByClass(classId);
            const subjectRes = getSubjectsForClass(classId);

            setStudents(studentRes.documents);
            setSubjects(["None", ...subjectRes]); // Add "None" to start

            // Prefill inputs with existing marks/attendance for faster edits
            // For attendance: nothing prefilled unless month is selected
            // For marks: gather existing marks for default subject/exam if applicable
            // We'll lazy-load when teacher selects options (handled via inputs map)
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Handle Input Change
    const handleInputChange = (studentId, value) => {
        setInputs(prev => ({
            ...prev,
            [studentId]: value
        }));
    };

    // SAVE DATA
    const handleSave = async () => {
        setLoading(true);
        try {
            const updates = Object.entries(inputs).map(async ([studentId, value]) => {
                if(!value && value !== 0) return;

                if (isAttendanceMode) {
                    // 1. Fetch existing record first
                    const monthIndex = months.indexOf(selectedMonth) - 1; // months[0] is 'None'
                    const records = await service.getAttendance(studentId, new Date().getFullYear());
                    
                    let presentDays = [0,0,0,0,0,0,0,0,0,0,0,0];
                    let docId = null;

                    if(records.documents.length > 0) {
                        // Note: collection uses lowercase 'presentdays'
                        presentDays = [...(records.documents[0].presentdays || records.documents[0].presentDays || presentDays)];
                        docId = records.documents[0].$id;
                    }

                    presentDays[monthIndex] = parseInt(value) || 0;

                    // Use unified markAttendance helper that does create or update
                    return service.markAttendance({ docId, studentId, teacherId: userData.$id, year: new Date().getFullYear(), presentDays });
                } 
                else if (isMarksMode) {
                    // Check if mark exists for this student / subject / exam
                    const existingRes = await service.getStudentMarks(studentId);
                    const existing = (existingRes.documents || []).find(m => m.subject === selectedSubject && String(m.examtype) === String(selectedExam));

                    if (existing && existing.$id) {
                        // Update
                        return service.updateMark(existing.$id, parseInt(value));
                    } else {
                        // Create
                        return service.createMark({
                            studentId,
                            subject: selectedSubject,
                            examType: String(selectedExam),
                            score: parseInt(value),
                            totalMarks: 100 // Default, or add input for it
                        });
                    }
                }
            });

            await Promise.all(updates);
            alert("Saved Successfully! ✅");
            setInputs({}); // Clear inputs
        } catch (error) {
            alert("Error saving: " + (error?.message || error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#f8f7f3]">
            {/* Header */}
            <div className="px-4 pt-6 flex justify-between items-start sticky top-0 bg-[#f8f7f3] z-20">
                <div>
                    <h1 className="text-xl font-semibold text-gray-800">Class 6</h1>
                    <span className="text-sm text-gray-500">{students.length} Students</span>
                </div>
                
                {/* Save Button (Only visible when typing) */}
                {Object.keys(inputs).length > 0 && (
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg animate-bounce"
                    >
                        {loading ? "Saving..." : "Save All"}
                    </button>
                )}
            </div>

            {/* Controls Bar */}
            <div className="px-4 mt-4 flex flex-col gap-3">
                <div className="flex gap-2">
                    {/* Month Selector */}
                    <select 
                        value={selectedMonth}
                        onChange={(e) => { setSelectedMonth(e.target.value); setSelectedSubject("None"); }}
                        className={`flex-1 text-sm border-none shadow-sm rounded-xl px-3 py-3 font-medium outline-none ${isAttendanceMode ? 'bg-blue-100 text-blue-800' : 'bg-white'}`}
                    >
                        {months.map(m => <option key={m} value={m}>{m === "None" ? "Attendance (None)" : m}</option>)}
                    </select>

                    {/* Subject Selector */}
                    <select 
                        value={selectedSubject}
                        onChange={(e) => { setSelectedSubject(e.target.value); setSelectedMonth("None"); }}
                        className={`flex-1 text-sm border-none shadow-sm rounded-xl px-3 py-3 font-medium outline-none ${isMarksMode ? 'bg-green-100 text-green-800' : 'bg-white'}`}
                    >
                        <option value="None">Marks (None)</option>
                        {subjects.filter(s => s !== "None").map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Exam Selector (Only if Marks Mode) */}
                {isMarksMode && (
                    <div className="flex justify-end">
                         <select 
                            value={selectedExam}
                            onChange={(e) => setSelectedExam(e.target.value)}
                            className="text-xs bg-white border border-green-200 rounded-lg px-2 py-1 outline-none"
                        >
                            <option value="1">Exam 1</option>
                            <option value="2">Exam 2</option>
                            <option value="3">Exam 3</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Scrollable Content */}
            <div className="px-4 mt-6 flex-1 overflow-auto">
                {/* Table Header */}
                <div className="grid grid-cols-[45px_1fr_90px] text-xs text-gray-400 mb-2 ml-2 uppercase tracking-wide font-bold">
                    <span>Roll</span>
                    <span>Student Name</span>
                    <span className="text-right">
                        {isAttendanceMode ? "Days Present" : isMarksMode ? "Score" : "Action"}
                    </span>
                </div>

                {/* List */}
                <div className="space-y-3">
                    {students.map((std) => (
                        <div key={std.$id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 grid grid-cols-[45px_1fr_90px] items-center">
                            
                            {/* Roll */}
                            <span className="font-bold text-gray-400">{std.roll}</span>
                            
                            {/* Name */}
                            <span className="font-semibold text-gray-800 truncate pr-2">{std.fullname}</span>

                            {/* Input Area */}
                            <div className="justify-self-end">
                                {isAttendanceMode ? (
                                    <input 
                                        type="number" 
                                        placeholder="0"
                                        className="w-16 h-10 bg-blue-50 text-blue-900 font-bold text-center rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={inputs[std.$id] || ""}
                                        onChange={(e) => handleInputChange(std.$id, e.target.value)}
                                    />
                                ) : isMarksMode ? (
                                    <input 
                                        type="number" 
                                        placeholder="0"
                                        className="w-16 h-10 bg-green-50 text-green-900 font-bold text-center rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        value={inputs[std.$id] || ""}
                                        onChange={(e) => handleInputChange(std.$id, e.target.value)}
                                    />
                                ) : (
                                    <button className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-2 rounded-lg">
                                        View
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {students.length === 0 && !loading && (
                        <div className="text-center text-gray-400 mt-10">No students found.</div>
                    )}
                </div>
            </div>

            {/* Floating Chat Button for Class Chat */}
            <div className="fixed right-4 bottom-6 z-40">
                <a href={`/chat/6`} className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </a>
            </div>
        </div>
    );
}