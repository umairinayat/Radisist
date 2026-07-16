import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram } from 'react-icons/fa';
import { MdEmail, MdPhone, MdLocationOn } from 'react-icons/md';
import Logo from "../Components/Logo";

function Footer() {
    const currentYear = new Date().getFullYear();

    const quickLinks = [
        { name: 'Home', to: '/' },
        { name: 'About Us', to: '/about' },
        { name: 'Mission', to: '/mission' },
        { name: 'Contact', to: '/contact' },
        { name: 'How It Works', href: '/#how-it-works' },
        { name: 'For Patients', to: '/login' },
        { name: 'For Radiologists', to: '/login' },
    ];

    const legalLinks = [
        { name: 'Privacy Policy', href: '#' },
        { name: 'Terms of Service', href: '#' },
        { name: 'HIPAA Compliance', href: '#' },
        { name: 'Data Security', href: '#' },
    ];

    const socialLinks = [
        { icon: <FaFacebookF />, href: '#', label: 'Facebook' },
        { icon: <FaTwitter />, href: '#', label: 'Twitter' },
        { icon: <FaLinkedinIn />, href: '#', label: 'LinkedIn' },
        { icon: <FaInstagram />, href: '#', label: 'Instagram' },
    ];

    return (
        <footer id="contact" className="relative bg-black text-white overflow-hidden">
            {/* Main Footer Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-16 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

                    {/* Brand Section */}
                    <div className="lg:col-span-1">
                        <Logo white={true} />
                        <p className="mt-4 text-gray-400 text-sm">
                            AI-powered radiology diagnostics that deliver fast, accurate, and reliable results.
                            Bridging technology with medical expertise.
                        </p>

                        {/* Social Links */}
                        <div className="flex gap-3 mt-6">
                            {socialLinks.map((social, index) => (
                                <a
                                    key={index}
                                    href={social.href}
                                    aria-label={social.label}
                                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-[#780F32] hover:text-white hover:border-[#780F32] transition-all duration-300"
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-semibold text-[#C9DCF6] mb-4">Quick Links</h3>
                        <ul className="space-y-3">
                            {quickLinks.map((link, index) => (
                                <li key={index}>
                                    {link.to ? (
                                        <Link
                                            to={link.to}
                                            className="text-gray-400 text-sm hover:text-white hover:pl-2 transition-all duration-300"
                                        >
                                            {link.name}
                                        </Link>
                                    ) : (
                                        <a
                                            href={link.href}
                                            className="text-gray-400 text-sm hover:text-white hover:pl-2 transition-all duration-300"
                                        >
                                            {link.name}
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-lg font-semibold text-[#C9DCF6] mb-4">Legal</h3>
                        <ul className="space-y-3">
                            {legalLinks.map((link, index) => (
                                <li key={index}>
                                    <a
                                        href={link.href}
                                        className="text-gray-400 text-sm hover:text-white hover:pl-2 transition-all duration-300"
                                    >
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-lg font-semibold text-[#C9DCF6] mb-4">Contact Us</h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <MdEmail className="text-[#780F32] text-xl mt-0.5 flex-shrink-0" />
                                <span className="text-gray-400 text-sm">support@radisist.com</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <MdPhone className="text-[#780F32] text-xl mt-0.5 flex-shrink-0" />
                                <span className="text-gray-400 text-sm">+1 (555) 123-4567</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <MdLocationOn className="text-[#780F32] text-xl mt-0.5 flex-shrink-0" />
                                <span className="text-gray-400 text-sm">
                                    123 Medical Innovation Drive,<br />
                                    Healthcare City, HC 12345
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Divider */}
                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-500 text-sm text-center md:text-left">
                            © {currentYear} Radisist. All rights reserved.
                        </p>
                        <p className="text-gray-500 text-xs text-center md:text-right">
                            Designed with care for better healthcare outcomes.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
