import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import authimg from "./Images/authimg.png";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, getUserProfile } from "../api/login";

import ErrorModal from "./Components/ErrorModal";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    // DEMO BYPASS: Add mock credentials check for testing
    if (email === "demo@radisist.com" && password === "demo123") {
      localStorage.setItem("access_token", "mock_demo_access_token");
      localStorage.setItem("role", "PATIENT");
      localStorage.setItem("full_name", "Demo Patient");
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate("/userdashboard/scans");
      }, 1500);
      setLoading(false);
      return;
    }
    if (email === "radiologist@radisist.com" && password === "demo123") {
      localStorage.setItem("access_token", "mock_demo_access_token");
      localStorage.setItem("role", "RADIOLOGIST");
      localStorage.setItem("full_name", "Dr. Demo Radiologist");
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate("/radiologist");
      }, 1500);
      setLoading(false);
      return;
    }

    try {
      await loginUser({ email, password });

      // The access token is already saved by loginUser in localStorage
      const profile = await getUserProfile();

      // Determine Role: Try 'role' first, then 'is_teacher'
      let role = profile.role?.toUpperCase();
      if (!role) {
        role = profile.is_teacher ? "RADIOLOGIST" : "PATIENT";
      }

      localStorage.setItem("role", role);
      if (profile.full_name) {
        localStorage.setItem("full_name", profile.full_name);
      }

      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        if (role === "PATIENT") {
          navigate("/userdashboard/upload");
        } else if (role === "RADIOLOGIST") {
          navigate("/radiologist");
        } else if (role === "ADMIN") {
          window.location.href = "/admin/";
        } else {
          navigate("/dashboard");
        }
      }, 1500);

    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.join(" ")
        : detail || err.response?.data?.error || "Invalid email or password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row overflow-x-hidden">
      <ErrorModal
        isOpen={!!error || success}
        type={success ? "success" : "error"}
        title={success ? "Login successful!" : "Invalid credentials"}
        message={success ? "Redirecting you to your dashboard..." : error}
        onClose={() => { setError(""); setSuccess(false); }}
      />

      {/* LEFT SIDE (Image) - Visible on top in mobile, left in desktop */}
      <div className="w-full md:w-1/2 h-[35vh] md:h-screen relative">
        <img src={authimg} className="w-full h-full object-cover" />

        {/* Red Tint */}
        <div className="absolute inset-0 bg-[#7B1E38] mix-blend-multiply opacity-70"></div>
        {/* Dark for contrast */}
        <div className="absolute inset-0 bg-black/30"></div>

        {/* TOP TEXT - Simplified branding */}
        <div className="absolute top-10 md:top-20 left-8 md:left-14 text-white">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Radisist<span className="text-yellow-400">.</span>
          </h1>
        </div>

        {/* BOTTOM TEXT - Repurposed */}
        <div className="absolute bottom-10 md:bottom-20 left-8 md:left-14 text-white">
          <p className="text-sm md:text-base opacity-90 font-medium">
            Your Radiology Assistant, Ready 24/7.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE (Form) */}
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-center px-6 sm:px-12 md:px-20 py-12 md:py-0 overflow-y-auto min-h-[65vh] md:min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg mx-auto"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-[#7F2040] tracking-tight">
              Welcome back!
            </h2>
            <p className="text-gray-500 mt-2 font-normal">
              Please enter your details to sign in
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* EMAIL */}
            <div className="group">
              <label className="text-[#7F2040] text-sm font-semibold ml-4 mb-2 block group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">Email ID</label>
              <input
                type="email"
                placeholder="example@mail.com"
                className="w-full border border-gray-100 bg-gray-50/50 rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="group">
              <label className="text-[#7F2040] text-sm font-semibold ml-4 mb-2 block group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full border border-gray-100 bg-gray-50/50 rounded-full px-6 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-[#7B1E38] hover:bg-[#7B1E38]/10 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* REMEMBER + FORGOT */}
            <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 px-2 font-medium">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded-md border-gray-300 text-[#7B1E38] focus:ring-[#7B1E38]" />
                <span className="group-hover:text-[#7B1E38] transition-colors">Remember me</span>
              </label>
              <button type="button" className="text-[#7B1E38] font-bold hover:underline transition-all">
                Forgot Password?
              </button>
            </div>

            {/* SIGN IN */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7B1E38] text-white py-4 rounded-full text-lg font-semibold shadow-sm hover:shadow-md hover:bg-[#651A34] transition-all disabled:opacity-70 active:scale-[0.98] mt-2"
            >
              {loading ? "Logging in..." : "Sign In"}
            </button>
          </form>

          {/* CREATE ACCOUNT SECTION */}
          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-4 text-gray-400">
              <div className="h-[1px] bg-gray-200 flex-1"></div>
              <span className="text-xs font-semibold">New to Radisist?</span>
              <div className="h-[1px] bg-gray-200 flex-1"></div>
            </div>

            <Link
              to="/createaccount"
              className="block w-full border-2 border-[#7B1E38] text-[#7B1E38] py-4 rounded-full font-semibold text-center hover:bg-[#7B1E38] hover:text-white transition-all duration-300"
            >
              Create an account
            </Link>
          </div>

          {/* SOCIALS */}
          <div className="flex items-center justify-center gap-6 mt-10">
            {[
              { icon: "https://cdn-icons-png.flaticon.com/512/733/733547.png", label: "Facebook" },
              { icon: "https://cdn-icons-png.flaticon.com/512/300/300221.png", label: "Google" },
              { icon: "https://cdn-icons-png.flaticon.com/512/731/731985.png", label: "LinkedIn" }
            ].map((social, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4, scale: 1.05 }}
                className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-100 shadow-sm hover:shadow-md hover:border-[#7F2040]/20 transition-all cursor-pointer bg-white"
              >
                <img src={social.icon} className="w-6" alt={social.label} />
              </motion.div>
            ))}
          </div>

          {/* TERMS */}
          <p className="text-[10px] md:text-xs text-center text-gray-400 mt-10 font-medium px-4">
            By Logging In, you agree to our{" "}
            <span className="text-[#7B1E38] font-bold underline cursor-pointer">Terms of Service</span>{" "}
            and <span className="text-[#7B1E38] font-bold underline cursor-pointer">Privacy Policy</span>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
