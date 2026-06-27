import React, { useState } from "react";
import { motion } from "framer-motion";
import authimg from "./Images/authimg.png";
import { Link, useNavigate } from "react-router-dom";
import RoleSelect from "./RoleSelect";
import { registerUser } from "../api/register";

import ErrorModal from "./Components/ErrorModal";

function CreateAccount() {

  const navigate = useNavigate();
  const [showRoleSelect, setShowRoleSelect] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    re_password: "",
    age: "",
    gender: "",
    role: "",
    // RADIOLOGIST FIELDS
    hospital: "",
    license_id: "",
    // PATIENT FIELDS
    previous_breast_disease: "",
    family_breast_cancer: "No",
    hormonal_therapy: "No",
    symptoms: "",
    lifestyle: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // ... (keeping existing handlers same as they are stable) ...
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowRoleSelect(false);

    if (role === "Radiologist") {
      setFormData((prev) => ({
        ...prev,
        role: "RADIOLOGIST",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        role: "PATIENT",
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      const currentList = formData[name] || [];
      if (checked) {
        setFormData({ ...formData, [name]: [...currentList, value] });
      } else {
        setFormData({ ...formData, [name]: currentList.filter((i) => i !== value) });
      }
    } else {
      setFormData({
        ...formData,
        [name]: name === "age" ? parseInt(value, 10) || "" : value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);
    setError("");
    try {
      // 1. Start with common fields mapping to backend schema
      const payload = {
        email: formData.email,
        password: formData.password,
        re_password: formData.re_password,
        full_name: formData.full_name,
        role: formData.role,
        age: formData.age,
        gender: formData.gender,
      };

      // 2. Add role-specific fields
      if (formData.role === "RADIOLOGIST") {
        payload.hospital = formData.hospital;
        payload.license_id = formData.license_id;
      } else if (formData.role === "PATIENT") {
        payload.previous_breast_disease = formData.previous_breast_disease;
        payload.family_breast_cancer = formData.family_breast_cancer;
        payload.hormonal_therapy = formData.hormonal_therapy;
        payload.symptoms = formData.symptoms;
        payload.lifestyle = formData.lifestyle;
      }

      // 3. Strict Cleaning: Remove any fields that are empty strings or null
      Object.keys(payload).forEach(key => {
        if (payload[key] === "" || payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });

      await registerUser(payload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        navigate("/login");
      }, 2200);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData && typeof errorData === "object") {
        const errorMessages = Object.keys(errorData).map((field) => {
          const fieldErrors = errorData[field];
          return `${field}: ${Array.isArray(fieldErrors) ? fieldErrors.join(" ") : fieldErrors}`;
        });
        setError(errorMessages.join(" | "));
      } else {
        setError(errorData?.message || errorData?.detail || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen w-full bg-[#F7F7F7] flex flex-col items-center py-10 md:py-20 px-4 sm:px-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#7F2040]/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[700px] h-[700px] bg-[#7F2040]/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />

      {/* Floating Highlight Cards (Visible on large screens) */}
      <div className="hidden xl:block absolute top-1/4 left-10 animate-bounce-slow">
        <div className="bg-white/40 backdrop-blur-md border border-white/40 p-6 rounded-3xl shadow-xl shadow-[#7F2040]/5 flex flex-col gap-2 max-w-[200px]">
          <span className="text-2xl">🧪</span>
          <h4 className="font-bold text-[#7F2040]">AI Powered</h4>
          <p className="text-xs text-gray-500 font-medium">Advanced diagnosis assistance system.</p>
        </div>
      </div>

      <div className="hidden xl:block absolute bottom-1/4 right-10 animate-bounce-slow" style={{ animationDelay: '1s' }}>
        <div className="bg-white/40 backdrop-blur-md border border-white/40 p-6 rounded-3xl shadow-xl shadow-[#7F2040]/5 flex flex-col gap-2 max-w-[200px]">
          <span className="text-2xl">🔒</span>
          <h4 className="font-bold text-[#7F2040]">Secure Data</h4>
          <p className="text-xs text-gray-500 font-medium">Your medical records are encrypted.</p>
        </div>
      </div>

      <div className="hidden 2xl:block absolute top-20 right-20 animate-pulse">
        <div className="bg-[#7F2040]/5 p-5 rounded-full border border-[#7F2040]/10 backdrop-blur-sm">
          <span className="text-[#7F2040] font-bold text-sm tracking-widest uppercase italic">Radisist 24/7</span>
        </div>
      </div>

      <RoleSelect visible={showRoleSelect} onSelect={handleRoleSelect} />

      <ErrorModal
        isOpen={!!error || success}
        type={success ? "success" : "error"}
        title={success ? "Welcome!" : "Registration failed"}
        message={success ? "Your account is ready. Redirecting..." : error}
        onClose={() => { setError(""); setSuccess(false); }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-xl shadow-[#7F2040]/5 p-8 md:p-16 flex flex-col items-center relative z-10"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#7F2040] tracking-tight">
            {selectedRole ? `Create your ${selectedRole} account` : "Create account"}
          </h2>
          <p className="text-gray-500 mt-3 text-md font-normal max-w-md mx-auto">
            Join Radisist's intelligent network and start your journey towards better healthcare.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-10"
        >
          {/* SECTION: BASIC INFO */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 mb-2">
              <span className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-black font-bold text-sm">1</span>
              <h3 className="text-xl font-semibold text-black">Account Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2 group">
                <label className="text-[#7F2040] text-[13px] font-semibold ml-5 group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="rounded-full bg-gray-50/50 border border-gray-100 px-7 py-5 focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 group">
                <label className="text-[#7F2040] text-[13px] font-semibold ml-5 group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="rounded-full bg-gray-50/50 border border-gray-100 px-7 py-5 focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 group">
                <label className="text-[#7F2040] text-[13px] font-semibold ml-5 group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="rounded-full bg-gray-50/50 border border-gray-100 px-7 py-5 focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 group">
                <label className="text-[#7F2040] text-[13px] font-semibold ml-5 group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">Confirm Password</label>
                <input
                  type="password"
                  name="re_password"
                  placeholder="Confirm your password"
                  value={formData.re_password}
                  onChange={handleChange}
                  className="rounded-full bg-gray-50/50 border border-gray-100 px-7 py-5 focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 group">
                <label className="text-[#7F2040] text-[13px] font-semibold ml-5 group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">Age</label>
                <input
                  type="number"
                  name="age"
                  placeholder="Age"
                  value={formData.age}
                  onChange={handleChange}
                  className="rounded-full bg-gray-50/50 border border-gray-100 px-7 py-5 focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 group">
                <label className="text-[#7F2040] text-[13px] font-semibold ml-5 group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="rounded-full bg-gray-50/50 border border-gray-100 px-7 py-5 focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium appearance-none"
                  required
                >
                  <option value="">Select Gender</option>
                  <option>MALE</option>
                  <option>FEMALE</option>
                  <option>Other</option>
                </select>
              </div>

              {selectedRole === "Radiologist" && (
                <div className="flex flex-col gap-2 group">
                  <label className="text-[#7F2040] text-[13px] font-semibold ml-5 group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">Hospital / Clinic Name</label>
                  <input
                    name="hospital"
                    placeholder="Enter hospital name"
                    value={formData.hospital || ""}
                    onChange={handleChange}
                    className="rounded-full bg-gray-50/50 border border-gray-100 px-7 py-5 focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium"
                    required
                  />
                </div>
              )}

              {selectedRole === "Radiologist" && (
                <div className="flex flex-col gap-2 group">
                  <label className="text-[#7F2040] text-[13px] font-semibold ml-5 group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">Medical License Number</label>
                  <input
                    name="license_id"
                    placeholder="MLN-123456"
                    value={formData.license_id || ""}
                    onChange={handleChange}
                    className="rounded-full bg-gray-50/50 border border-gray-100 px-7 py-5 focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION: PATIENT MEDICAL PROFILE */}
          {selectedRole === "Patient" && (
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-black font-bold text-sm">2</span>
                <h3 className="text-xl font-semibold text-black">Medical Profile</h3>
              </div>

              <div className="flex flex-col gap-4 group">
                <label className="text-[#7F2040] text-[13px] font-semibold ml-5 flex items-center gap-2 group-focus-within:text-[#7B1E38] group-focus-within:translate-x-1 group-focus-within:scale-105 transition-all duration-300 origin-left">
                  Previous Breast Disease Details
                  <span className="text-gray-400 font-normal italic">(optional)</span>
                </label>
                <textarea
                  name="previous_breast_disease"
                  placeholder="Describe your medical history or any previous breast-related conditions..."
                  value={formData.previous_breast_disease}
                  onChange={handleChange}
                  className="rounded-[2rem] bg-gray-50/50 border border-gray-100 px-8 py-6 min-h-[140px] focus:outline-none focus:ring-2 focus:ring-[#7F2040]/10 transition-all font-medium resize-none shadow-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Family History Card */}
                <div className="bg-white p-7 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col gap-4">
                  <p className="text-[10px] font-semibold text-gray-400 tracking-wider">Family Breast Cancer History</p>
                  <div className="flex gap-8">
                    {["Yes", "No"].map(choice => (
                      <label key={choice} className="flex items-center gap-3 cursor-pointer group">
                        <input type="radio" name="family_breast_cancer" value={choice} checked={formData.family_breast_cancer === choice} onChange={handleChange} className="hidden" />
                        <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${formData.family_breast_cancer === choice ? 'border-[#7F2040]' : 'border-gray-200 group-hover:border-gray-300'}`}>
                          {formData.family_breast_cancer === choice && <div className="w-3 h-3 rounded-full bg-[#7F2040]" />}
                        </div>
                        <span className={`text-[13px] md:text-sm font-semibold ${formData.family_breast_cancer === choice ? 'text-[#7F2040]' : 'text-gray-400'}`}>{choice}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Hormonal Therapy Card */}
                <div className="bg-white p-7 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col gap-4">
                  <p className="text-[10px] font-semibold text-gray-400 tracking-wider">Previous Hormonal Therapy</p>
                  <div className="flex gap-8">
                    {["Yes", "No"].map(choice => (
                      <label key={choice} className="flex items-center gap-3 cursor-pointer group">
                        <input type="radio" name="hormonal_therapy" value={choice} checked={formData.hormonal_therapy === choice} onChange={handleChange} className="hidden" />
                        <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${formData.hormonal_therapy === choice ? 'border-[#7F2040]' : 'border-gray-200 group-hover:border-gray-300'}`}>
                          {formData.hormonal_therapy === choice && <div className="w-3 h-3 rounded-full bg-[#7F2040]" />}
                        </div>
                        <span className={`text-sm font-semibold ${formData.hormonal_therapy === choice ? 'text-[#7F2040]' : 'text-gray-400'}`}>{choice}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Symptoms Radio Grid */}
              <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-sm overflow-hidden p-8">
                <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-6 px-1">Current Primary Symptom</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Lump in breast", value: "LUMP" },
                    { label: "Nipple discharge", value: "NIPPLE_DISCHARGE" },
                    { label: "Breast pain", value: "PAIN" },
                    { label: "Others", value: "OTHERS" }
                  ].map(choice => (
                    <label key={choice.value} className="flex items-center gap-4 cursor-pointer group">
                      <input type="radio" name="symptoms" value={choice.value} checked={formData.symptoms === choice.value} onChange={handleChange} className="hidden" />
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.symptoms === choice.value ? 'border-[#7F2040]' : 'border-gray-100 bg-gray-50/50 group-hover:border-gray-200'}`}>
                        {formData.symptoms === choice.value && <div className="w-2.5 h-2.5 rounded-full bg-[#7F2040]" />}
                      </div>
                      <span className={`text-[13px] md:text-sm font-semibold transition-colors ${formData.symptoms === choice.value ? 'text-[#7F2040]' : 'text-gray-400'}`}>{choice.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Lifestyle Radio Grid */}
              <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-sm overflow-hidden p-8">
                <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-6 px-1">Primary Lifestyle Factor</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {[
                    { label: "Smoking", value: "SMOKING" },
                    { label: "Alcohol", value: "ALCOHOL" },
                    { label: "Sedentary", value: "SEDENTARY" },
                    { label: "Active", value: "ACTIVE" },
                    { label: "Others", value: "OTHERS" }
                  ].map(choice => (
                    <label key={choice.value} className="flex items-center gap-4 cursor-pointer group">
                      <input type="radio" name="lifestyle" value={choice.value} checked={formData.lifestyle === choice.value} onChange={handleChange} className="hidden" />
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.lifestyle === choice.value ? 'border-[#7F2040]' : 'border-gray-100 bg-gray-50/50 group-hover:border-gray-200'}`}>
                        {formData.lifestyle === choice.value && <div className="w-2.5 h-2.5 rounded-full bg-[#7F2040]" />}
                      </div>
                      <span className={`text-[13px] md:text-sm font-semibold transition-colors ${formData.lifestyle === choice.value ? 'text-[#7F2040]' : 'text-gray-400'}`}>{choice.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-6 mt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto md:min-w-[300px] bg-[#7F2040] text-white rounded-full py-5 px-12 font-semibold text-lg shadow-sm hover:shadow-md hover:bg-[#651A34] transition-all disabled:opacity-70 active:scale-[0.98]"
            >
              {loading ? "Joining the network..." : "Create account"}
            </button>
            <p className="text-gray-500 font-medium text-center">
              Already have an account? <Link to="/login" className="text-[#7F2040] font-bold hover:underline transition-all">Sign in</Link>
            </p>
          </div>
        </form>
      </motion.div>

      {/* Modal is now handled by the shared StatusModal above */}
    </section>
  );
}

export default CreateAccount;
