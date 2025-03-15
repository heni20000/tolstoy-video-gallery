"use client"

import { useState } from "react"

/**
 * VideoUploader Component
 *
 * Handles uploading of video files with visual progress indicators
 * and communicates with parent component when uploads are complete.
 *
 * @param {Object} props
 * @param {Function} props.onUploadComplete - Callback function when uploads finish
 */
export default function VideoUploader({ onUploadComplete }) {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({}) // Tracks progress for each file
  const [uploadedVideos, setUploadedVideos] = useState([])

  // --- UI Helper Functions ---

  /**
   * Returns the appropriate CSS class for progress bar color
   */
  const getProgressBarColor = (progressValue) => {
    if (progressValue === "Error") return "bg-red-500"
    if (progressValue === 100) return "bg-green-500"
    return "bg-blue-500"
  }

  /**
   * Calculates the width for the progress bar
   */
  const getProgressBarWidth = (progressValue) => {
    return progressValue === "Error" ? 100 : progressValue
  }

  /**
   * Returns status text with appropriate styling
   */
  const getProgressStatusText = (progressValue) => {
    if (progressValue === "Error") {
      return <span className="text-red-500">Upload failed</span>
    }
    if (progressValue === 100) {
      return <span className="text-green-500">Upload complete</span>
    }
    if (progressValue > 80) {
      return <span className="text-blue-500">Processing...</span>
    }
    return <span className="text-blue-500">Uploading: {progressValue}%</span>
  }

  // --- Event Handlers ---

  /**
   * Handles file selection from the input
   */
  function handleFileChange(event) {
    const files = Array.from(event.target.files)

    // Initialize progress tracking for each file
    const initialProgress = {}
    files.forEach((file) => {
      initialProgress[file.name] = 0
    })

    setProgress(initialProgress)
    setSelectedFiles(files)
  }

  /**
   * Uploads selected files with progress tracking
   */
  async function handleUpload() {
    if (!selectedFiles.length) return

    setUploading(true)
    const newUploadedVideos = []

    // Process each file sequentially
    for (const file of selectedFiles) {
      const formData = new FormData()
      formData.append("file", file)

      try {
        // Set initial progress
        setProgress((prev) => ({ ...prev, [file.name]: 5 }))

        // Upload file and track progress
        const result = await uploadFileWithProgress(file, formData)

        // Update progress and store result
        setProgress((prev) => ({ ...prev, [file.name]: 100 }))
        newUploadedVideos.push(result)
      } catch (error) {
        console.error("Upload error:", error)
        setProgress((prev) => ({ ...prev, [file.name]: "Error" }))
      }
    }

    // Update state with newly uploaded videos
    setUploadedVideos((prev) => [...prev, ...newUploadedVideos])
    setUploading(false)

    // Notify parent component
    if (onUploadComplete && typeof onUploadComplete === "function") {
      onUploadComplete(newUploadedVideos)
    }

    // Clear selected files after a delay (so user can see completion)
    setTimeout(() => {
      setSelectedFiles([])
      setProgress({})
    }, 3000)
  }

  /**
   * Uploads a file with progress tracking using XMLHttpRequest
   */
  function uploadFileWithProgress(file, formData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Set up progress tracking
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          // Max 60% for upload (reserve 40% for server processing including Cloudinary)
          const uploadPercentage = Math.round((event.loaded / event.total) * 60)
          setProgress((prev) => ({ ...prev, [file.name]: uploadPercentage }))
        }
      })

      // Handle completion
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Set to 85% while processing thumbnail
          setProgress((prev) => ({ ...prev, [file.name]: 85 }))

          // Parse the response
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch (e) {
            reject(new Error("Invalid response format"))
          }
        } else {
          reject(new Error(`HTTP Error: ${xhr.status}`))
        }
      }

      // Handle network errors
      xhr.onerror = () => reject(new Error("Network Error"))

      // Configure and send request
      xhr.open("POST", "/api/upload")
      xhr.send(formData)
    })
  }

  return (
    <div className="p-6 border rounded-lg shadow-lg bg-white">
      {/* Header */}
      <h2 className="text-xl text-black font-semibold mb-4 flex items-center">
        <span className="text-2xl mr-2 ">📤</span> Upload Videos
      </h2>

      {/* File Selection Area - Consistent size */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-4 text-center hover:border-blue-500 transition-colors">
        <label className="cursor-pointer block">
          <input type="file" multiple accept="video/*" onChange={handleFileChange} className="hidden" />
          <div className="flex flex-col items-center justify-center">
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {selectedFiles.length > 0
                ? `${selectedFiles.length} file(s) selected. Click to add more videos.`
                : "Drag & drop videos here or click to browse"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Supports MP4, MOV, and other video formats</p>
          </div>
        </label>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 mb-4">
          <h3 className="text-md font-medium mb-2 text-blue-700">Selected Videos ({selectedFiles.length})</h3>
          <div className="space-y-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="bg-black-50 rounded-lg p-3">
                {/* File Name and Size */}
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium truncate text-black" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getProgressBarColor(progress[file.name])}`}
                    style={{
                      width: `${getProgressBarWidth(progress[file.name])}%`,
                    }}
                  ></div>
                </div>

                {/* Status Text */}
                <div className="mt-1 text-xs">{getProgressStatusText(progress[file.name])}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || selectedFiles.length === 0}
        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {uploading
          ? "Uploading..."
          : `Upload ${selectedFiles.length > 0 ? selectedFiles.length : ""} Video${selectedFiles.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  )
}

