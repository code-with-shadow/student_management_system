import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import authService from '../../appwrite/auth';
import service from '../../appwrite/db';
import { login as authLogin } from '../../store/authSlice';

// Icons for App Feel (Simple SVG)
const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);

function StudentSignup() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        fullname: "", email: "", password: "",
        classId: "6", roll: "", 
        phone: "", age: "", fathername: "", address: "", section: "A"
    });

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await authService.logout();

            // 1. Create Account
            const userData = await authService.createAccount({
                email: formData.email,
                password: formData.password,
                name: formData.fullname
            });

            if (userData) {
                // 2. Create User Role
                await service.createUserRole({
                    userId: userData.$id,
                    email: formData.email,
                    fullname: formData.fullname,
                    role: "student",
                    status: "active"
                });

                // 3. Create Student Profile
                await service.createStudentProfile({
                    userid: userData.$id,
                    fullname: formData.fullname,
                    phone: formData.phone,
                    classId: formData.classId,
                    roll: formData.roll,
                    age: formData.age,
                    fathername: formData.fathername,
                    address: formData.address,
                    section: formData.section
                });

                // 4. Login & Redirect
                // If getCurrentUser fails (401), fallback to the created userAccount
                const currentUser = (await authService.getCurrentUser()) || userData;
                dispatch(authLogin({ userData: currentUser, userRole: "student", classId: formData.classId }));
                navigate("/student/dashboard");
            }
        } catch (error) {
            alert("Signup Failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper for input styling
    const inputStyle = "w-full bg-gray-50 text-gray-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-3.5 border-none shadow-sm outline-none transition-all";
    const labelStyle = "block mb-1 text-xs font-bold text-gray-500 uppercase tracking-wide ml-1";

    return (
        <div className="min-h-screen bg-white flex flex-col">
            
            {/* 📱 APP HEADER (Sticky) */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
                    <BackIcon />
                </button>
                <h1 className="text-lg font-bold text-gray-800">New Student</h1>
                <div className="w-8"></div> {/* Spacer to center title */}
            </div>

            {/* 📜 SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto p-5 pb-24 safe-area-bottom">
                
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl shadow-sm">
                        🎒
                    </div>
                    <p className="text-gray-500 text-sm">Create your school profile to get started.</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-5">
                    
                    {/* Section: Credentials */}
                    <div className="space-y-4">
                        <div>
                            <label className={labelStyle}>Full Name</label>
                            <input type="text" placeholder="e.g. Rahul Kumar" required className={inputStyle} 
                                value={formData.fullname} onChange={e => setFormData({...formData, fullname: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelStyle}>Email Address</label>
                            <input type="email" placeholder="student@school.com" required className={inputStyle} 
                                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        <div>
                            <label className={labelStyle}>Password</label>
                            <input type="password" placeholder="••••••••" required className={inputStyle} 
                                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-4"></div>

                    {/* Section: Personal Info */}
                    <div className="space-y-4">
                        <div>
                            <label className={labelStyle}>Mobile Number</label>
                            <input type="tel" inputMode="numeric" placeholder="+91 98765 43210" required className={inputStyle} 
                                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelStyle}>Age</label>
                                <input type="number" inputMode="numeric" placeholder="12" required className={inputStyle} 
                                    value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} />
                            </div>
                            <div>
                                <label className={labelStyle}>Father's Name</label>
                                <input type="text" placeholder="Mr. Name" required className={inputStyle} 
                                    value={formData.fathername} onChange={e => setFormData({...formData, fathername: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className={labelStyle}>Address</label>
                            <textarea rows="2" placeholder="Village, City, District..." required className={inputStyle} 
                                value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-4"></div>

                    {/* Section: Academic Info */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                            <label className={labelStyle}>Class</label>
                            <select className={inputStyle} value={formData.classId} onChange={e => setFormData({...formData, classId: e.target.value})}>
                                {[5,6,7,8,9,10,11,12].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className={labelStyle}>Section</label>
                            <select className={inputStyle} value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})}>
                                {['A','B','C'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className={labelStyle}>Roll No</label>
                            <input type="number" inputMode="numeric" placeholder="01" required className={inputStyle} 
                                value={formData.roll} onChange={e => setFormData({...formData, roll: e.target.value})} />
                        </div>
                    </div>

                    {/* Bottom Action Area */}
                    <div className="pt-4">
                        <button 
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Creating...</span>
                                </>
                            ) : (
                                "Create Profile"
                            )}
                        </button>

                        <p className="mt-6 text-center text-sm text-gray-500">
                            Already registered? <Link to="/student/login" className="text-blue-600 font-bold">Log In</Link>
                        </p>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default StudentSignup;