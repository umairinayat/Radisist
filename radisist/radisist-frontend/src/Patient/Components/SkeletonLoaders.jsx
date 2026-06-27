import React from "react";

const Shimmer = () => (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
);

export const SectionHeaderSkeleton = () => (
    <div className="py-2 mb-8">
        <div className="h-10 w-64 bg-gray-200 rounded-xl mb-4 relative overflow-hidden">
            <Shimmer />
        </div>
        <div className="h-5 w-full max-w-lg bg-gray-100 rounded-lg relative overflow-hidden">
            <Shimmer />
        </div>
    </div>
);

export const DashboardSkeleton = () => {
    return (
        <div className="py-8 min-h-screen">
            <SectionHeaderSkeleton />

            {/* Top Cards Skeleton */}
            <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6 mb-12">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-48 bg-white rounded-4xl border border-gray-50 shadow-sm relative overflow-hidden p-8">
                        <div className="flex justify-between mb-6">
                            <div className="h-6 w-24 bg-gray-100 rounded-lg" />
                            <div className="h-10 w-10 bg-gray-50 rounded-2xl" />
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="h-16 w-20 bg-gray-100 rounded-2xl" />
                            <div className="h-4 w-24 bg-gray-50 rounded-lg" />
                        </div>
                        <Shimmer />
                    </div>
                ))}
            </div>

            {/* Table Skeleton */}
            <div className="h-10 w-48 bg-gray-200 rounded-xl mb-6 relative overflow-hidden">
                <Shimmer />
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-16 bg-[#7d1f3f]/10" />
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex gap-4 items-center">
                            <div className="h-10 w-10 bg-gray-100 rounded-xl" />
                            <div className="space-y-2">
                                <div className="h-4 w-48 bg-gray-100 rounded" />
                                <div className="h-3 w-32 bg-gray-50 rounded" />
                            </div>
                        </div>
                        <div className="h-8 w-24 bg-gray-100 rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ScansSkeleton = () => (
    <div className="py-8 min-h-screen">
        <SectionHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                        <div className="h-12 w-12 bg-gray-100 rounded-2xl" />
                        <div className="h-6 w-20 bg-gray-50 rounded-full" />
                    </div>
                    <div className="h-6 w-3/4 bg-gray-100 rounded-lg mb-2" />
                    <div className="h-4 w-1/4 bg-gray-50 rounded-md mb-6" />
                    <div className="pt-4 border-t border-gray-50">
                        <div className="h-4 w-28 bg-gray-100 rounded" />
                    </div>
                    <Shimmer />
                </div>
            ))}
        </div>
    </div>
);
