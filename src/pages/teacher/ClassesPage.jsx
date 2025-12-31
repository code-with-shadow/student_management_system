import React from 'react';
import { useNavigate } from 'react-router-dom';
import service from '../../appwrite/db';

// SVG Icon Helper
const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

export default function ClassesPage() {
  const navigate = useNavigate();

  const [classData, setClassData] = React.useState([]);

  React.useEffect(() => {
    // Generate classes 5..12 and fetch student counts
    const classes = Array.from({ length: 8 }, (_, i) => ({
      id: String(5 + i),
      name: `Class ${5 + i}`,
      section: 'A'
    }));

    // Fetch students count for each class
    Promise.all(classes.map(async (c) => {
      return service.getStudentsByClass(c.id).then(r => ({ ...c, students: r.documents.length })).catch(() => ({ ...c, students: 0 }));
    }))
    .then(setClassData);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f7f3] pb-20 p-4">
      <h1 className="text-xl font-bold text-gray-800 mb-6 mt-2">My Classes</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {classData.map((cls) => (
          <div key={cls.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <BookIcon />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg text-gray-800">{cls.name} - {cls.section}</h2>
                <p className="text-sm text-gray-400">{cls.students ?? 0} Students</p>
              </div>
            </div>
            
            <button 
                onClick={() => navigate(`/teacher/class/${cls.id}`)}
                className="w-full mt-4 py-3 border border-blue-100 text-blue-600 font-bold rounded-xl text-sm hover:bg-blue-50 transition"
            >
                Open Class
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}