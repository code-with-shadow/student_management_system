import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import authService from '../../appwrite/auth';
import service from '../../appwrite/db';
import { login as authLogin } from '../../store/authSlice';

function TeacherSignup() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    
    const SECRET_CODE = "ADMIN2025"; 
    const [secretInput, setSecretInput] = useState("");
    
    const [formData, setFormData] = useState({
        fullname: "", email: "", password: "",
        phone: "", subject: ""
    });

    const handleSignup = async (e) => {
        e.preventDefault();
        if (secretInput !== SECRET_CODE) return alert("❌ Invalid School Code!");

        setLoading(true);
        try {
            await authService.logout(); // Force logout first

            const userData = await authService.createAccount({
                email: formData.email,
                password: formData.password,
                name: formData.fullname
            });

            if (userData) {
                // 1. Add to Users (For Login)
                await service.createUserRole({
                    userId: userData.$id,
                    email: formData.email,
                    fullname: formData.fullname,
                    role: "teacher",
                    status: "active"
                });

                // 2. Add to Teachers (Profile)
                await service.createTeacherProfile({
                    userid: userData.$id,
                    fullname: formData.fullname,
                    phone: formData.phone,
                    subject: formData.subject,
                    email: formData.email
                });

                // If getCurrentUser fails (401), fallback to the created userAccount
                const currentUser = (await authService.getCurrentUser()) || userData;
                dispatch(authLogin({ userData: currentUser, userRole: "teacher", classId: null }));
                navigate("/teacher/dashboard");
            }
        } catch (error) {
            alert("Signup Failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border-t-4 border-purple-600">
                <h2 className="text-2xl font-bold text-purple-600 mb-6 text-center">👨‍🏫 Teacher Registration</h2>
                <form onSubmit={handleSignup} className="space-y-4">
                    <input type="text" placeholder="School Code" required className="w-full p-2 border border-red-200 bg-red-50 rounded" value={secretInput} onChange={e => setSecretInput(e.target.value)} />
                    
                    <input type="text" placeholder="Full Name" required className="w-full p-2 border rounded" onChange={e => setFormData({...formData, fullname: e.target.value})} />
                    <input type="email" placeholder="Email" required className="w-full p-2 border rounded" onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input type="tel" placeholder="Phone Number" required className="w-full p-2 border rounded" onChange={e => setFormData({...formData, phone: e.target.value})} />
                    <input type="text" placeholder="Main Subject (e.g. Math)" required className="w-full p-2 border rounded" onChange={e => setFormData({...formData, subject: e.target.value})} />
                    <input type="password" placeholder="Password" required className="w-full p-2 border rounded" onChange={e => setFormData({...formData, password: e.target.value})} />

                    <button disabled={loading} className="w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700">
                        {loading ? "Verifying..." : "Sign Up"}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm">Have an account? <Link to="/teacher/login" className="text-purple-600 font-bold">Login</Link></p>
            </div>
        </div>
    );
}

export default TeacherSignup;