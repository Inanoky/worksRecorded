import React from "react";

export function PhotoGalleryGrid() {
  return (
    <div className="my-8">
      {/* First row */}
      <div className="flex gap-8 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="w-[260px] h-[160px] border-2 border-red-500 rounded-xl flex items-center justify-center text-gray-500 text-xl"
            style={{ minWidth: 180, minHeight: 120 }}
          >
            {/* Placeholder for image or upload */}
          </div>
        ))}
      </div>
      {/* Second row */}
      <div className="flex gap-8">
        {[5, 6, 7].map(i => (
          <div
            key={i}
            className="w-[260px] h-[160px] border-2 border-red-500 rounded-xl flex items-center justify-center text-gray-500 text-xl"
            style={{ minWidth: 180, minHeight: 120 }}
          >
            {/* Placeholder for image or upload */}
          </div>
        ))}
      </div>
    </div>
  );
}
