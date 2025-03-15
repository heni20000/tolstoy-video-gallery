"use client"

import { useState } from "react"
import VideoUploader from "../components/VideoUploader"
import VideoGallery from "../components/VideoGallery"

/**
 * Home Component
 *
 * Main page of the Video Gallery application that integrates
 * the video uploader and video gallery components.
 *
 * @returns {JSX.Element} The rendered home page
 */
export default function Home() {
  // State to track when new videos are uploaded
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  /**
   * Handles completion of video uploads
   * Triggers a refresh of the video gallery to show newly uploaded videos
   */
  const handleUploadComplete = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="container mx-auto p-4 min-h-screen">
      {/* Header Section */}
      <header className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
          <span className="text-blue-600">Tolstoy</span> Video Gallery
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Upload your videos and watch them in a beautiful carousel gallery. Click on any thumbnail to play the video.
        </p>
      </header>

      {/* Upload Section */}
      <section className="mb-12" aria-labelledby="upload-heading">
        <h2 id="upload-heading" className="text-2xl font-bold text-center mb-6">
          <span role="img" aria-hidden="true">
            📤
          </span>{" "}
          Video Upload
        </h2>
        <VideoUploader onUploadComplete={handleUploadComplete} />
      </section>

      {/* Gallery Section */}
      <section aria-labelledby="gallery-heading">
        <h2 id="gallery-heading" className="text-2xl font-semibold text-center mb-6">
          <span role="img" aria-hidden="true">
            📂
          </span>{" "}
          Video Gallery
        </h2>
        <VideoGallery refreshTrigger={refreshTrigger} />
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>Tolstoy Video Gallery</p>
      </footer>
    </div>
  )
}

