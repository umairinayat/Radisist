import React from 'react';

const SectionHeader = ({ title, subtitle }) => {
    return (
        <div className="flex flex-col gap-1 mb-8">
            <h1 className="font-bold text-2xl md:text-3xl text-[#7d1f3f] tracking-tight">
                {title}
            </h1>
            {subtitle && (
                <p className="text-gray-500 text-sm md:text-base max-w-2xl">
                    {subtitle}
                </p>
            )}
        </div>
    );
};

export default SectionHeader;
