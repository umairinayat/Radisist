import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Upload,
  FolderOpen,
  Send,
  FileText,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { logoutUser } from "../../api/logout";
import { getUserProfile } from "../../api/login";

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoaded(true);
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile();
        setProfile(data);
      } catch (error) {
        console.error("Error fetching sidebar profile:", error);
      }
    };
    fetchProfile();
  }, []);

  const menuItems = [
    { name: "Home", path: "/userdashboard", icon: Home, end: true },
    { name: "Upload", path: "/userdashboard/upload", icon: Upload },
    { name: "My Scans", path: "/userdashboard/scans", icon: FolderOpen },
    { name: "Requests", path: "/userdashboard/requests", icon: Send },
    { name: "Reports", path: "/userdashboard/reports", icon: FileText },
  ];

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#7d1f3f] p-2.5 rounded-xl text-white shadow-md 
        active:scale-95 transition-all duration-300 hover:bg-[#6a1a36]"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-[#7d1f3f] fixed lg:sticky top-0 left-0 h-screen w-[260px] lg:w-[260px]
        flex flex-col py-8 text-white
        transition-all duration-300 z-40
        ${isOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
          }`}
      >
        {/* Top: Logo */}
        <div className={`px-6 mb-8 flex-shrink-0 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <h1 className="font-bold text-2xl tracking-wide">
            Radisist
          </h1>
          <p className="text-white/50 text-xs mt-1">Medical Imaging Platform</p>
        </div>

        {/* Middle: Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 space-y-6">
          <div className="px-3">
            <div className="h-px bg-white/10" />
          </div>

          <div className="flex flex-col gap-1">
            <div className={`px-3 mb-2 transition-all duration-500 delay-100 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Menu
              </span>
            </div>

            <nav className="flex flex-col gap-1">
              {menuItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className={`transition-all duration-500 ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                    style={{ transitionDelay: `${150 + idx * 50}ms` }}
                  >
                    <NavLink
                      to={item.path}
                      end={item.end}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200
                        ${isActive
                          ? "bg-white/15 text-white shadow-sm"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      <Icon size={20} strokeWidth={1.5} />
                      <span>{item.name}</span>
                    </NavLink>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom: Fixed Actions and Profile */}
        <div className="px-3 mt-auto pt-6 flex-shrink-0">
          <div className="px-3 mb-4">
            <div className="h-px bg-white/10" />
          </div>

          <div className={`flex flex-col gap-1 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
            <NavLink
              to="/userdashboard/settings"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200
                ${isActive ? "bg-white/15 text-white shadow-sm" : "text-white/70 hover:bg-white/5 hover:text-white"}`
              }
            >
              <Settings size={20} strokeWidth={1.5} />
              <span>Settings</span>
            </NavLink>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm
              text-white/70 hover:bg-white/5 hover:text-white transition-all duration-200 w-full text-left"
            >
              <LogOut size={20} strokeWidth={1.5} />
              <span>Logout</span>
            </button>
          </div>

          {/* User Profile Card */}
          <div className={`mt-4 px-3 py-3 bg-white/5 rounded-2xl transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '500ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sm font-bold flex-shrink-0 text-white/90 uppercase">
                {profile?.full_name ? profile.full_name.charAt(0) : "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white/90">
                  {profile?.full_name || "Loading..."}
                </p>
                <p className="text-[11px] text-white/40 truncate">
                  {profile?.email || "patient@email.com"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
