import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle } from "lucide-react";

/**
 * Shared Status Modal for Auth Feedbacks
 * @param {Object} props
 * @param {boolean} props.isOpen - Is the modal visible
 * @param {string} props.type - 'success' or 'error'
 * @param {string} props.title - Optional custom title
 * @param {string} props.message - The main descriptive text
 * @param {function} props.onClose - Function to close the modal
 */
const StatusModal = ({ isOpen, type = "error", title, message, onClose }) => {
    const isSuccess = type === "success";
    const accentColor = isSuccess ? "bg-green-500" : "bg-red-500";
    const iconBg = isSuccess ? "bg-green-50" : "bg-red-50";
    const iconColor = isSuccess ? "text-green-500" : "text-red-500";
    const defaultTitle = isSuccess ? "Success!" : "Error occurred";

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full relative overflow-hidden"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background Accent */}
                        <div className={`absolute top-0 left-0 w-full h-2 ${accentColor}`} />

                        {/* Icon */}
                        <motion.div
                            initial={{ rotate: -15, scale: 0.8 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                            className={`w-20 h-20 rounded-full ${iconBg} flex items-center justify-center shadow-inner`}
                        >
                            {isSuccess ? (
                                <CheckCircle size={44} className={iconColor} strokeWidth={2.5} />
                            ) : (
                                <AlertCircle size={44} className={iconColor} strokeWidth={2.5} />
                            )}
                        </motion.div>

                        <div className="text-center">
                            <h2 className="text-2xl font-semibold text-[#7F2040] tracking-tight mb-2">
                                {title || defaultTitle}
                            </h2>
                            <p className="text-gray-600 font-normal leading-relaxed">
                                {message || (isSuccess ? "Action completed successfully." : "An unexpected error happened. Please try again.")}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className={`w-full ${isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-[#7F2040] hover:bg-[#651A34]'} text-white rounded-full py-4 font-semibold shadow-lg transition-all active:scale-[0.98] focus:outline-none`}
                        >
                            OK
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StatusModal;
