import React, { useEffect, useState } from 'react'

// Icons
import BellIcon from '../../Images/Icons/bell.svg'
import { MdKeyboardArrowDown } from "react-icons/md";
import profileAvatar from '../../Images/Icons/avatar.png'
import { getNotifications, getUnreadNotificationCount, markNotificationRead } from '../../api/notifications';

function PatientHeader() {

  const userName = localStorage.getItem("full_name") || "User";
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const [items, countPayload] = await Promise.all([
          getNotifications(),
          getUnreadNotificationCount(),
        ]);
        setNotifications(items || []);
        setUnreadCount(countPayload?.count || 0);
      } catch {
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    loadNotifications();
  }, []);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((current) =>
          current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        // Notification read state should not block the patient dashboard.
      }
    }
  };

  const notificationPanel = (
    open && (
      <div className='absolute right-0 top-14 z-50 w-[min(92vw,360px)] rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)]'>
        <h3 className='text-sm font-black text-[#7B1E3D]'>Notifications</h3>
        <div className='mt-3 max-h-80 space-y-2 overflow-auto'>
          {notifications.length ? (
            notifications.slice(0, 8).map((notification) => (
              <button
                key={notification.id}
                type='button'
                onClick={() => handleNotificationClick(notification)}
                className={`block w-full rounded-2xl px-4 py-3 text-left text-sm ${notification.is_read ? 'bg-[#fcfbfd] text-gray-600' : 'bg-emerald-50 text-emerald-800'}`}
              >
                <p className='font-black'>{notification.title}</p>
                <p className='mt-1 text-xs leading-5'>{notification.message}</p>
              </button>
            ))
          ) : (
            <p className='rounded-2xl bg-[#fcfbfd] px-4 py-6 text-center text-sm text-gray-500'>No notifications yet.</p>
          )}
        </div>
      </div>
    )
  );

  return (
    <section className="w-full">
      <div className="lg:hidden fixed top-0 left-0 w-full bg-[#8C2347] flex items-center justify-between px-4 py-3 z-40 shadow-md">
        <div></div>

        <div className='flex items-center gap-2'>
          <div className='relative bg-white p-2.5 rounded-lg cursor-pointer hover:bg-gray-100' onClick={() => setOpen((value) => !value)}>
            <img className='w-5 h-5' src={BellIcon} alt="Notification icon" />
            {unreadCount > 0 && (
              <div className='absolute top-0 right-0 bg-red-600 min-w-4 h-4 px-1 rounded-full text-[8px] flex items-center justify-center font-bold text-white'>{unreadCount}</div>
            )}
            {notificationPanel}
          </div>

          <div className='bg-white p-2 rounded-lg cursor-pointer flex items-center justify-center gap-1'>
            <img className='w-7 h-7 rounded-full border-2' src={profileAvatar} alt="User Avatar" />
            <div className='hover:bg-black hover:text-white bg-gray-200 w-4 rounded-full h-4 flex items-center justify-center'>
              <MdKeyboardArrowDown className='font-light text-[12px]' />
            </div>
          </div>
        </div>
      </div>

      <div id='PATIENT HEADER' className='hidden lg:flex items-center justify-between mt-2'>
        <div>
          <h1 className='font-black text-3xl text-[#7B1E3D]'>User Dashboard</h1>
          <p className='text-[#878787]'>Welcome back, {userName.toUpperCase()}</p>
        </div>

        <div className='flex items-center justify-center gap-2'>
          <div className='relative bg-white p-3 rounded-lg cursor-pointer hover:bg-gray-100' onClick={() => setOpen((value) => !value)}>
            <img className='w-6 h-6' src={BellIcon} alt="Notification icon" />
            {unreadCount > 0 && (
              <div className='absolute top-0 right-0 bg-red-600 min-w-4 h-4 px-1 rounded-full text-[8px] flex items-center justify-center font-bold text-white'>{unreadCount}</div>
            )}
            {notificationPanel}
          </div>
          <div className='bg-white p-2 rounded-lg cursor-pointer flex items-center justify-center gap-2'>
            <img className='w-8 h-8 rounded-full border-2' src={profileAvatar} alt="User Avatar" />
            <div className='hover:bg-black hover:text-white bg-gray-200 w-4 rounded-full h-4 flex items-center justify-center'>
              <MdKeyboardArrowDown className='font-light' />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PatientHeader
