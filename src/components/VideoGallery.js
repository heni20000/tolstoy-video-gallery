"use client";

import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

export default function VideoGallery({ refreshTrigger }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingIndex, setPlayingIndex] = useState(null); // Track which video is playing
  
  useEffect(() => {
    setLoading(true);
    
    fetch("/api/videos")
      .then((res) => res.json())
      .then((data) => {
        setVideos(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching videos:", err);
        setLoading(false);
      });
  }, [refreshTrigger]); // Add refreshTrigger as a dependency
  
  // Render loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading videos...</p>
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (videos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No videos uploaded yet. Upload some videos to see them here!</p>
        </div>
      </div>
    );
  }
  
  // render gallery with videos
  return (
    <div className="max-w-4xl mx-auto">
      <Swiper
        modules={[Pagination, Navigation]}
        spaceBetween={10}
        slidesPerView={3}
        pagination={{ 
          clickable: true,
          position: 'bottom'
        }}
        navigation
        className="pb-10"
      >
        {videos.map((video, index) => (
          <SwiperSlide key={index}>
            <div className="relative w-full h-auto rounded-lg shadow-md cursor-pointer hover:opacity-80" onClick={() => setPlayingIndex(index)}> 
            
              {/* render either video player or thumbnail based on playing state */}
              {playingIndex === index ? (
                // when this item is the currently playing video
                <video 
                  src={video.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-64 object-cover rounded-lg"
                  onClick={(e) => e.stopPropagation()} // Prevent stopping when clicking on controls
                  onPlay={(e) => e.stopPropagation()}  // Additional event handling for controls
                />
              ) : (
                // when this item is not playing, show thumbnail
                <img 
                  src={video.thumbnailUrl}
                  alt="Video Thumbnail"
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}