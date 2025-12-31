import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const months = ['None', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [chatClass, setChatClass] = useState(classId || '6');
  const [inputs, setInputs] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSubjects(getSubjectsForClass(classId));
    loadStudentsAndAcademics();
  }, [classId]);

  // Load students and prefetch marks & attendance for fast access
  const loadStudentsAndAcademics = async () => {
    setLoading(true);
    try {
      const res = await service.getStudentsByClass(classId);
      const studs = res.documents || [];
      setStudents(studs);

      // Prefetch marks for all students in parallel
      const marksResArr = await Promise.all(studs.map(s => service.getStudentMarks(s.$id)));
      const allMarks = marksResArr.flatMap(r => r.documents || []);
      dispatch(setMarks(allMarks));

      // Prefetch attendance per student (current year)
      const year = new Date().getFullYear();
      const attResArr = await Promise.all(studs.map(s => service.getAttendance(s.$id, year)));
      const attMap = {};
      studs.forEach((s, idx) => {
        const docs = attResArr[idx]?.documents || [];
        attMap[s.$id] = docs.length > 0 ? docs[0] : null;
      });
      dispatch(setAttendance(attMap));

      // Prefill inputs for current selection
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

  // Populate inputs when subject/exam/month change from cached marks/attendance (no save)
  useEffect(() => {
    loadSavedForCurrentSelection();
  }, [selectedSubject, selectedExam, selectedMonth, students, marks, attendance]);

  const loadSavedForCurrentSelection = (givenStudents, givenMarks, givenAttendance) => {
    const studs = givenStudents || students;
    const mks = givenMarks || marks;
    const att = givenAttendance || attendance;
    const newInputs = {};

    // Attendance mode (selectedMonth active and no subject chosen)
    if (selectedMonth !== 'None' && selectedSubject === 'None') {
      const monthIndex = months.indexOf(selectedMonth) - 1; // -1 because months[0] is 'None'
      studs.forEach(s => {
        const aDoc = att[s.$id];
        if (aDoc && aDoc.presentdays) {
          newInputs[s.$id] = aDoc.presentdays[monthIndex] ?? '';
        } else {
          newInputs[s.$id] = '';
        }
      });
    } else if (selectedSubject !== 'None') {
      // Marks mode
      studs.forEach(s => {
        const found = (mks || []).find(mm => mm.studentid === s.$id && mm.subject === selectedSubject && String(mm.examtype) === String(selectedExam));
        newInputs[s.$id] = found ? String(found.score) : '';
      });
    } else {
      // No selection - clear inputs
      studs.forEach(s => { newInputs[s.$id] = ''; });
    }

    setInputs(newInputs);
  };

  const handleSave = async () => {
    // Attendance save if month chosen and no subject
    const isAttendance = (selectedMonth !== 'None' && selectedSubject === 'None');
    if (!isAttendance && selectedSubject === 'None') return alert('Select a subject or a month first.');

    setLoading(true);
    try {
      const year = new Date().getFullYear();

      const promises = Object.entries(inputs).map(async ([studentId, value]) => {
        if (value === '' || value === null || typeof value === 'undefined') return null;

        if (isAttendance) {
          // Build presentDays array from existing attendance or zeros
          const existing = attendance[studentId];
          const arr = existing && existing.presentdays ? [...existing.presentdays] : [0,0,0,0,0,0,0,0,0,0,0,0];
          const monthIndex = months.indexOf(selectedMonth) - 1;
          arr[monthIndex] = parseInt(value) || 0;

          if (existing && existing.$id) {
            // update
            return service.markAttendance({ docId: existing.$id, studentId, teacherId: userData?.$id, year, presentDays: arr });
          } else {
            // create
            return service.markAttendance({ docId: null, studentId, teacherId: userData?.$id, year, presentDays: arr });
          }
        } else {
          // Marks save: update if exists else create
          const existing = (marks || []).find(mm => mm.studentid === studentId && mm.subject === selectedSubject && String(mm.examtype) === String(selectedExam));
          if (existing && existing.$id) {
            return service.updateMark(existing.$id, Number(value));
          } else {
            return service.createMark({ studentId, subject: selectedSubject, examType: String(selectedExam), score: Number(value), totalMarks: 100 });
          }
        }
      });

      await Promise.all(promises);
      alert(isAttendance ? 'Attendance saved ✅' : 'Marks saved ✅');

      // Refresh class academics after save
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
    
      {/* Controls row: Subject | Exam Type | Save | Back */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 
        justify-between items-start md:items-center">
        <div className="flex-1 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Class {classId} - Section A</h1>
            <p className="text-sm text-gray-500">{students.length} Students</p>
          </div>

          <div className="min-w-[110px]">
            <label className="text-sm font-medium text-gray-700 sr-only">Month</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full mt-0 p-2 rounded-lg border bg-white text-sm">
              {months.map(m => <option key={m} value={m}>{m === 'None' ? 'All Months' : m}</option>)}
            </select>
          </div>

          <button onClick={() => navigate('/teacher/classes')} className=" px-3 py-2 bg-blue-300 rounded-lg border">Back</button>
          {/* <button  >back</button> */}
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="min-w-[150px]">
            <label className="text-sm font-medium text-gray-700">Subject</label>
            <select className="w-full mt-2 p-3 rounded-lg border bg-white" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
              <option value="None">Select subject</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="min-w-[100px]">
            <label className="text-sm font-medium text-gray-700">Exam Type</label>
            <select className="w-full mt-2 p-3 rounded-lg border bg-white" value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>
              <option value="1">Exam 1</option>
              <option value="2">Exam 2</option>
              <option value="3">Exam 3</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              disabled={loading || (selectedSubject === 'None' && selectedMonth === 'None')}
              onClick={handleSave}
              className={`mt-2 px-4 py-3 rounded-lg font-bold ${(loading || (selectedSubject === 'None' && selectedMonth === 'None')) ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white'}`}>
              {loading ? 'Saving...' : (selectedMonth !== 'None' && selectedSubject === 'None' ? 'Save' : 'Save')}
            </button>

          </div>

          {/* <div className="flex items-end">
            <button onClick={() => navigate('/teacher/classes')} className="mt-2 px-3 py-3 bg-white rounded-lg border">Back</button>
          </div> */}
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-3">
        <div className="grid grid-cols-[60px_1fr_120px] text-xs text-gray-400 mb-2 ml-2 uppercase tracking-wide font-bold">
          <span>Roll</span>
          <span>Student Name</span>
          <span className="text-right">Score</span>
        </div>

        {students.map(std => (
          <div key={std.$id} className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 grid grid-cols-[60px_1fr_120px] items-center">
            <span className="font-bold text-gray-400">{std.roll}</span>
            <span className="font-semibold text-gray-800 truncate pr-2">{std.fullname}</span>

            <div className="justify-self-end">
              {(selectedSubject !== 'None' || (selectedMonth !== 'None' && selectedSubject === 'None')) ? (
                <input
                  type="number"
                  placeholder={selectedMonth !== 'None' && selectedSubject === 'None' ? 'Days' : '0'}
                  className="w-20 h-10 bg-green-50 text-green-900 font-bold text-center rounded-lg outline-none"
                  value={inputs[std.$id] || ''}
                  onChange={(e) => handleInputChange(std.$id, e.target.value)}
                />
              ) : (
                <span className="text-xs text-gray-400">Select subject or month</span>
              )}
            </div>
          </div>
        ))}

        {students.length === 0 && !loading && (<div className="text-center text-gray-400 mt-10">No students found.</div>)}
      </div>
    </div>
  );
}
