"use client"

import { useEffect, useState } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Pagination, Navigation } from "swiper/modules"
import "swiper/css"
import "swiper/css/pagination"
import "swiper/css/navigation"

/**
 * VideoGallery Component
 *
 * Displays a responsive gallery of videos with thumbnails and playback functionality.
 *
 * @param {Object} props
 * @param {number} props.refreshTrigger - Value that changes to trigger a refresh of the gallery
 */
export default function VideoGallery({ refreshTrigger }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingIndex, setPlayingIndex] = useState(null) // Track which video is playing

  // Fetch videos when component mounts or refreshTrigger changes
  useEffect(() => {
    setLoading(true)

    fetch("/api/videos")
      .then((res) => res.json())
      .then((data) => {
        setVideos(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching videos:", err)
        setLoading(false)
      })
  }, [refreshTrigger])

  /**
   * Renders the appropriate content for a video item based on its state
   *
   * @param {Object} video - The video object
   * @param {number} index - The index of the video in the array
   * @returns {JSX.Element} - The rendered content (video player, thumbnail, or fallback)
   */
  const renderVideoContent = (video, index) => {
    // When this item is the currently playing video
    if (playingIndex === index) {
      return (
        <video
          src={video.videoUrl}
          controls
          autoPlay
          className="w-full h-64 object-cover rounded-lg"
          onClick={(e) => e.stopPropagation()} // Prevent stopping when clicking on controls
          onPlay={(e) => e.stopPropagation()} // Additional event handling for controls
        />
      )
    }

    // when this item has a thumbnail
    if (video.thumbnailUrl) {
      return (
        <img
          src={video.thumbnailUrl || "/placeholder.svg"}
          alt={`Thumbnail for ${video.name || "video"}`}
          className="w-full h-64 object-cover rounded-lg"
        />
      )
    }

    //when no thumbnail is available
    return (
      <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-lg">
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          ></path>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
      </div>
    )
  }

  // Render loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading videos...</p>
        </div>
      </div>
    )
  }

  // Render empty state
  if (videos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No videos uploaded yet. Upload some videos to see them here!</p>
        </div>
      </div>
    )
  }

  // Render gallery with videos
  return (
    <div className="max-w-4xl mx-auto">
      <Swiper
        modules={[Pagination, Navigation]}
        spaceBetween={10}
        slidesPerView={1}
        breakpoints={{
          640: {
            slidesPerView: 2,
          },
          1024: {
            slidesPerView: 3,
          },
        }}
        pagination={{
          clickable: true,
          dynamicBullets: false,
        }}
        navigation
        className="gallery-swiper"
      >
        {videos.map((video, index) => (
          <SwiperSlide key={index}>
            <div
              className="relative w-full h-auto rounded-lg shadow-md cursor-pointer hover:opacity-80"
              onClick={() => setPlayingIndex(index)}
            >
              {renderVideoContent(video, index)}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}

