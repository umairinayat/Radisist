import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import { activateUser } from "../api/register";

const Activation = () => {
    const { uid, token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState("loading"); // loading, success, error
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const verifyAccount = async () => {
            try {
                await activateUser(uid, token);
                setStatus("success");
            } catch (err) {
                console.error("Activation Error:", err.response?.data);
                setStatus("error");
                setErrorMessage(err.response?.data?.detail || "The activation link is invalid or has expired.");
            }
        };

        if (uid && token) {
            verifyAccount();
        }
    }, [uid, token]);

    return (
        <section className="min-h-screen w-full bg-[#F7F7F7] flex flex-col items-center justify-center py-10 px-4 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#7F2040]/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[700px] h-[700px] bg-[#7F2040]/10 rounded-full blur-[120px] opacity-40 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl shadow-[#7F2040]/5 p-12 md:p-16 flex flex-col items-center relative z-10 border border-gray-50"
            >
                {status === "loading" && (
                    <div className="flex flex-col items-center gap-8 text-center">
                        <div className="w-24 h-24 rounded-full bg-[#7F2040]/5 flex items-center justify-center relative">
                            <Loader2 className="w-12 h-12 text-[#7F2040] animate-spin" strokeWidth={2.5} />
                            <div className="absolute inset-0 rounded-full border-4 border-[#7F2040]/10 border-t-[#7F2040] animate-[spin_2s_linear_infinite]" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-[#7F2040] tracking-tight mb-3">Verifying Account</h2>
                            <p className="text-gray-500 font-medium">Please wait while we activate your credentials...</p>
                        </div>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex flex-col items-center gap-8 text-center animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center shadow-inner">
                            <CheckCircle className="w-12 h-12 text-green-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">Activation Complete!</h2>
                            <p className="text-gray-500 font-medium px-4">Your account is now verified. You can sign in and start using Radisist.</p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate("/login")}
                            className="w-full bg-[#7F2040] text-white rounded-full py-5 px-10 font-bold text-lg shadow-lg shadow-[#7F2040]/20 hover:bg-[#651A34] transition-all flex items-center justify-center gap-3 group"
                        >
                            Sign In Now
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                    </div>
                )}

                {status === "error" && (
                    <div className="flex flex-col items-center gap-8 text-center animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center shadow-inner">
                            <XCircle className="w-12 h-12 text-red-500" strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">Activation Failed</h2>
                            <p className="text-red-500/80 font-semibold bg-red-50/50 py-3 px-6 rounded-2xl border border-red-100 inline-block">
                                {errorMessage}
                            </p>
                            <p className="text-gray-400 mt-6 text-sm">If you think this is a mistake, please try registering again or contact support.</p>
                        </div>
                        <div className="w-full flex flex-col gap-4">
                            <button
                                onClick={() => navigate("/createaccount")}
                                className="w-full bg-gray-900 text-white rounded-full py-5 px-10 font-bold text-lg hover:bg-black transition-all"
                            >
                                Back to Signup
                            </button>
                            <Link to="/" className="text-gray-500 font-bold hover:text-[#7F2040] transition-colors">Return to Home</Link>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Bottom Footer Credit */}
            <div className="absolute bottom-8 left-0 w-full text-center">
                <p className="text-gray-400 text-sm font-medium tracking-wide">
                    &copy; 2026 Radisist AI. Secure medical verification system.
                </p>
            </div>
        </section>
    );
};

export default Activation;
