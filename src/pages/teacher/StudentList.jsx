import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import service from '../../appwrite/db';
import { getSubjectsForClass } from '../../data/classSubjects';
import { setMarks, setAttendance } from '../../store/academicSlice';

export default function StudentList() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const academic = useSelector((s) => s.academic || {});
  const { marks = [], attendance = {} } = academic;
  const { userData } = useSelector((s) => s.auth);


  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState('None');
  const [selectedExam, setSelectedExam] = useState('1');
  const [selectedMonth, setSelectedMonth] = useState('None');

  // ✅ New State for User Statuses
  const [studentStatuses, setStudentStatuses] = useState({}); // { studentId: 'active' | 'blocked' }

  const months = ['None', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const [inputs, setInputs] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSubjects(getSubjectsForClass(classId));
    loadStudentsAndAcademics();
  }, [classId]);

  // 1. LOAD DATA
  const loadStudentsAndAcademics = async () => {
    setLoading(true);
    try {
      // A. Fetch Students
      const res = await service.getStudentsByClass(classId);
      const studs = res.documents || [];
      setStudents(studs);

      // ============================================================
      // 🚀 NEW: FETCH USER STATUSES FROM DB
      // ============================================================
      const statusMap = {};

      // Fetch user details for all students in parallel
      await Promise.all(studs.map(async (std) => {
        if (std.userid) {
          try {
            const userDoc = await service.getUserRole(std.userid);

            // Handle different response structures (List vs Document)
            let status = 'active';
            if (userDoc) {
              if (userDoc.documents && userDoc.documents.length > 0) {
                status = userDoc.documents[0].status;
              } else if (userDoc.status) {
                status = userDoc.status;
              }
            }
            // Store in map: { studentDocumentID : status }
            statusMap[std.$id] = status || 'active';
          } catch (e) {
            console.warn(`Could not fetch status for student: ${std.fullname}`);
          }
        }
      }));

      // Save to State
      setStudentStatuses(statusMap);
      // ============================================================


      // B. Fetch Marks
      const marksResArr = await Promise.all(studs.map(s => service.getStudentMarks(s.$id)));
      const allMarks = marksResArr.flatMap(r => r.documents || []);
      dispatch(setMarks(allMarks));

      // C. Fetch Attendance
      const year = new Date().getFullYear();
      const attResArr = await Promise.all(studs.map(s => service.getAttendance(s.$id, year)));

      const attMap = {};
      studs.forEach((s, idx) => {
        const docs = attResArr[idx]?.documents || [];
        const studentMonthMap = {};
        docs.forEach(doc => {
          if (doc.month) studentMonthMap[doc.month] = doc;
        });
        attMap[s.$id] = studentMonthMap;
      });
      dispatch(setAttendance(attMap));

      // D. Update Inputs
      setTimeout(() => loadSavedForCurrentSelection(studs, allMarks, attMap), 0);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (studentId, value) => {
    setInputs(prev => ({ ...prev, [studentId]: value }));
  };

  // ✅ TOGGLE STATUS HANDLER
  const handleStatusToggle = async (student) => {
    const currentStatus = studentStatuses[student.$id] || 'active';
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    const userId = student.userid; // Get the User Collection ID

    // Optimistic UI Update (Update state immediately)
    setStudentStatuses(prev => ({ ...prev, [student.$id]: newStatus }));

    try {
      await service.updateUserStatus(userId, newStatus);
      console.log(`Updated ${student.fullname} to ${newStatus}`);
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status. Please try again.");
      // Revert on error
      setStudentStatuses(prev => ({ ...prev, [student.$id]: currentStatus }));
    }
  };

  // 🕵️‍♀️ Debugger: Runs every time 'studentStatuses' changes
  // useEffect(() => {
  //   console.log("🔥 STATUSES UPDATED:", studentStatuses);
  // }, [studentStatuses]);

  // 2. POPULATE INPUTS
  useEffect(() => {
    loadSavedForCurrentSelection();
  }, [selectedSubject, selectedExam, selectedMonth, students, marks, attendance]);

  const loadSavedForCurrentSelection = (givenStudents, givenMarks, givenAttendance) => {
    const studs = givenStudents || students;
    const mks = givenMarks || marks;
    const att = givenAttendance || attendance;
    const newInputs = {};

    if (selectedMonth !== 'None') {
      // --- ATTENDANCE MODE ---
      studs.forEach(s => {
        const studentMonths = att[s.$id] || {};
        const monthDoc = studentMonths[selectedMonth];
        if (monthDoc && monthDoc.days !== undefined) {
          newInputs[s.$id] = monthDoc.days;
        } else {
          newInputs[s.$id] = '';
        }
      });
    } else if (selectedSubject !== 'None') {
      // --- MARKS MODE ---
      studs.forEach(s => {
        const found = (mks || []).find(mm => mm.studentid === s.$id && mm.subject === selectedSubject && String(mm.examtype) === String(selectedExam));
        newInputs[s.$id] = found ? String(found.score) : '';
      });
    } else {
      // --- RESET ---
      studs.forEach(s => { newInputs[s.$id] = ''; });
    }

    setInputs(newInputs);
  };

  // 3. SAVE DATA
  const handleSave = async () => {
    const isAttendance = (selectedMonth !== 'None');
    if (!isAttendance && selectedSubject === 'None') return alert('Select a subject or a month first.');

    setLoading(true);
    try {
      const year = new Date().getFullYear();

      const promises = Object.entries(inputs).map(async ([studentId, value]) => {
        if (value === '' || value === null) return null;

        if (isAttendance) {
          const studentMonths = attendance[studentId] || {};
          const existingDoc = studentMonths[selectedMonth];

          return service.markAttendance({
            docId: existingDoc ? existingDoc.$id : null,
            studentId,
            teacherId: userData?.$id,
            year,
            month: selectedMonth,
            count: value
          });

        } else {
          const existing = (marks || []).find(mm => mm.studentid === studentId && mm.subject === selectedSubject && String(mm.examtype) === String(selectedExam));
          if (existing && existing.$id) {
            return service.updateMark(existing.$id, Number(value));
          } else {
            // console.log(studentId, selectedSubject, selectedExam, value, classId, typeof classId);
            return service.createMark({ studentId, subject: selectedSubject, examType: String(selectedExam), score: Number(value), totalMarks: 100, class: classId });
          }
        }
      });

      await Promise.all(promises);
      alert(isAttendance ? `Attendance for ${selectedMonth} saved ✅` : 'Marks saved ✅');
      await loadStudentsAndAcademics();

    } catch (err) {
      console.error(err);
      alert('Error saving: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f3] pb-24 p-4">

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-6 justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Class {classId} - Section A</h1>
            <p className="text-sm text-gray-500">{students.length} Students</p>
          </div>

          <div className="min-w-[110px]">
            <label className="text-sm font-medium text-gray-700 sr-only">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                // ✅ MUTUAL EXCLUSIVITY: Selecting Month clears Subject
                setSelectedMonth(e.target.value);
                if (e.target.value !== 'None') setSelectedSubject('None');
              }}
              className={`w-full mt-0 p-2 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all ${selectedMonth !== 'None' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'bg-white border-gray-200'}`}
            >
              {months.map(m => <option key={m} value={m}>{m === 'None' ? 'All Months' : m}</option>)}
            </select>
          </div>

          <button onClick={() => navigate('/teacher/classes')} className=" px-3 py-2 bg-blue-300 rounded-lg border">Back</button>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="min-w-[150px]">
            <label className="text-sm font-medium text-gray-700">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                // ✅ MUTUAL EXCLUSIVITY: Selecting Subject clears Month
                setSelectedSubject(e.target.value);
                if (e.target.value !== 'None') setSelectedMonth('None');
              }}
              className={`w-full mt-2 p-3 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 transition-all ${selectedSubject !== 'None' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'bg-white border-gray-200'}`}
            >
              <option value="None">Select subject</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="min-w-[100px]">
            <label className="text-sm font-medium text-gray-700">Exam Type</label>
            <select className="w-full mt-2 p-3 rounded-lg border bg-white text-sm font-medium border-gray-200 outline-none" value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>
              <option value="1">Exam 1</option>
              <option value="2">Exam 2</option>
              <option value="3">Exam 3</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              disabled={loading || (selectedSubject === 'None' && selectedMonth === 'None')}
              onClick={handleSave}
              className={`mt-2 px-4 py-3 rounded-lg font-bold ${(loading || (selectedSubject === 'None' && selectedMonth === 'None')) ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white'}`}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {/* Grid Container */}
      <div className="space-y-2">

        {/* Header Row - Matches requested grid columns */}
        <div className="grid grid-cols-[70px_140px_50px_1fr] px-2 text-xs text-gray-400 mb-2 ml-2 uppercase tracking-wide font-bold items-center">
          <span className="text-center">Roll</span>
          <span>Student Name</span>
          <span className="text-center">Status</span>
          <span className="text-right pr-4">{selectedMonth !== 'None' ? 'Days' : 'Score'}</span>
        </div>

        {/* Student Rows */}
       {students.map(std => {
            const isActive = studentStatuses[std.$id] === 'active';
            
            return (
              <div key={std.$id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 grid grid-cols-[70px_140px_50px_1fr] items-center hover:border-blue-200 transition-colors">
                
                {/* 1. Roll Number */}
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-xs mx-auto">
                    {std.roll}
                </span>
                
                {/* 2. ✅ Student Name (Clickable Link) */}
                <span 
                    onClick={() => navigate(`/teacher/student/${std.$id}`)}
                    className="font-semibold text-gray-700 truncate pr-2 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                    title="View Student Profile"
                >
                    {std.fullname}
                </span>

                {/* 3. Status Toggle Button */}
                <div className="flex justify-center">
                    <button 
                        onClick={() => handleStatusToggle(std)}
                        className={`
                            relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none 
                            ${isActive ? 'bg-green-500' : 'bg-gray-200'}
                        `}
                        title={isActive ? "Block User" : "Activate User"}
                    >
                        <span className="sr-only">Toggle Status</span>
                        <span
                            className={`
                                inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform shadow-sm
                                ${isActive ? 'translate-x-3.5' : 'translate-x-0.5'}
                            `}
                        />
                    </button>
                </div>

                {/* 4. Score/Attendance Input */}
                <div className="justify-self-end">
                  {(selectedSubject !== 'None' || selectedMonth !== 'None') ? (
                    <input
                      type="number"
                      placeholder={selectedMonth !== 'None' ? "0" : "-"}
                      className={`w-20 h-10 font-bold text-center rounded-lg outline-none border-2 transition-all
                        ${selectedMonth !== 'None' ? 'bg-green-50 border-green-100 text-green-700 focus:border-green-400' : 'bg-blue-50 border-blue-100 text-blue-100 text-blue-700 focus:border-blue-400'}
                      `}
                      value={inputs[std.$id] || ''}
                      onChange={(e) => handleInputChange(std.$id, e.target.value)}
                    />
                  ) : (
                    <span className="text-xs text-gray-400 italic pr-2">--</span>
                  )}
                </div>
              </div>
            );
        })}

        {/* Empty State */}
        {students.length === 0 && !loading && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400 text-sm">No students found in this class.</p>
          </div>
        )}
      </div>
    </div>
  );
}