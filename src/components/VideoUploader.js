"use client"

import { useState, useRef } from "react"

/**
 * VideoUploader Component
 *
 * A component that allows users to select and upload multiple video files
 * with progress tracking for each file. The component handles file selection,
 * upload progress visualization, and status updates.
 *
 * @param {Object} props
 * @param {Function} props.onUploadComplete - Callback function called when uploads finish successfully
 *                                           with an array of upload results
 */
export default function VideoUploader({ onUploadComplete }) {
  // State management for files and upload process
  const [files, setFiles] = useState([]) // Stores the selected files
  const [uploading, setUploading] = useState(false) // Tracks if uploads are in progress
  const [uploadProgress, setUploadProgress] = useState({}) // Tracks upload progress percentage by file ID
  const [uploadStatus, setUploadStatus] = useState({}) // Tracks status (ready, uploading, processing, complete, error)
  const fileInputRef = useRef(null) // Reference to the file input element

  /**
   * Handles file selection from the file input
   * Creates unique IDs for each file and initializes their progress and status
   *
   * @param {Event} event - The file input change event
   */
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files)
    if (selectedFiles.length === 0) return

    // Check for file size limits in production
    const oversizedFiles = selectedFiles.filter((file) => isFileTooLarge(file))
    if (oversizedFiles.length > 0) {
      alert(
        `The following files exceed the 5MB limit for the live demo:\n${oversizedFiles.map((f) => f.name).join("\n")}\n\nPlease select smaller files or run the app locally for larger uploads.`,
      )

      // Filter out oversized files
      const validFiles = selectedFiles.filter((file) => !isFileTooLarge(file))
      if (validFiles.length === 0) {
        // Reset the file input if all files were too large
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        return
      }

      // Continue with valid files only
      const fileObjects = validFiles.map((file) => ({
        id: `${file.name}-${Date.now()}`,
        file,
        status: "ready",
      }))

      setFiles((prevFiles) => [...prevFiles, ...fileObjects])

      const newProgress = {}
      const newStatus = {}
      fileObjects.forEach((fileObj) => {
        newProgress[fileObj.id] = 0
        newStatus[fileObj.id] = "ready"
      })

      setUploadProgress((prev) => ({ ...prev, ...newProgress }))
      setUploadStatus((prev) => ({ ...prev, ...newStatus }))
    } else {
      // No oversized files, proceed normally
      const fileObjects = selectedFiles.map((file) => ({
        id: `${file.name}-${Date.now()}`,
        file,
        status: "ready",
      }))

      setFiles((prevFiles) => [...prevFiles, ...fileObjects])

      const newProgress = {}
      const newStatus = {}
      fileObjects.forEach((fileObj) => {
        newProgress[fileObj.id] = 0
        newStatus[fileObj.id] = "ready"
      })

      setUploadProgress((prev) => ({ ...prev, ...newProgress }))
      setUploadStatus((prev) => ({ ...prev, ...newStatus }))
    }

    // Reset the file input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  /**
   * Uploads a single file with progress tracking using XMLHttpRequest
   * Updates status and progress throughout the upload process
   *
   * @param {Object} fileObj - The file object containing id and file
   * @returns {Promise} - Resolves with the server response or rejects with an error
   */
  const uploadFile = async (fileObj) => {
    const { id, file } = fileObj
    const formData = new FormData()
    formData.append("file", file)

    try {
      // Update status to uploading
      setUploadStatus((prev) => ({ ...prev, [id]: "uploading" }))

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          // Max 60% for upload (reserve 40% for server processing)
          const uploadPercentage = Math.round((event.loaded / event.total) * 60)
          setUploadProgress((prev) => ({ ...prev, [id]: uploadPercentage }))
        }
      })

      // Create a promise to handle the XHR request
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Set to 80% while processing thumbnail
            setUploadProgress((prev) => ({ ...prev, [id]: 80 }))
            setUploadStatus((prev) => ({ ...prev, [id]: "processing" }))

            try {
              const response = JSON.parse(xhr.responseText)
              // Set to 100% when complete
              setUploadProgress((prev) => ({ ...prev, [id]: 100 }))
              setUploadStatus((prev) => ({ ...prev, [id]: "complete" }))
              resolve(response)
            } catch (e) {
              setUploadStatus((prev) => ({ ...prev, [id]: "error" }))
              reject(new Error("Invalid response format"))
            }
          } else {
            setUploadStatus((prev) => ({ ...prev, [id]: "error" }))
            reject(new Error(`HTTP Error: ${xhr.status}`))
          }
        }

        xhr.onerror = () => {
          setUploadStatus((prev) => ({ ...prev, [id]: "error" }))
          reject(new Error("Network Error"))
        }

        xhr.open("POST", "/api/upload")
        xhr.send(formData)
      })

      return await uploadPromise
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error)
      setUploadStatus((prev) => ({ ...prev, [id]: "error" }))
      throw error
    }
  }

  /**
   * Uploads all files simultaneously that haven't been uploaded yet
   * Manages the overall upload process and calls the onUploadComplete callback
   * when finished successfully
   */
  const uploadAllFiles = async () => {
    // Don't proceed if there are no files or uploads are already in progress
    if (files.length === 0 || uploading) return

    setUploading(true)
    const uploadResults = []
    const uploadPromises = []

    // Start all uploads simultaneously
    files.forEach((fileObj) => {
      // Only upload files that aren't already complete
      if (uploadStatus[fileObj.id] !== "complete") {
        const promise = uploadFile(fileObj)
          .then((result) => {
            uploadResults.push(result)
            return result
          })
          .catch((error) => {
            console.error(`Failed to upload ${fileObj.file.name}:`, error)
            // We don't rethrow to allow other uploads to continue
            return null
          })

        uploadPromises.push(promise)
      }
    })

    // Wait for all uploads to complete
    await Promise.allSettled(uploadPromises)

    setUploading(false)

    // Filter out null results (failed uploads)
    const successfulUploads = uploadResults.filter((result) => result !== null)

    // Only proceed if there were successful uploads
    if (onUploadComplete && typeof onUploadComplete === "function" && successfulUploads.length > 0) {
      // Add a 1-second delay before refreshing both the uploader and gallery
      setTimeout(() => {
        // Notify parent component to refresh the gallery
        onUploadComplete(successfulUploads)

        // Clear the uploader after the delay
        setFiles([])
        setUploadProgress({})
        setUploadStatus({})
      }, 1000) // 1 second delay
    }
  }

  /**
   * Determines the appropriate status text and styling based on file status
   *
   * @param {string} id - The file ID
   * @returns {Object} - Object containing text, text color, and background color
   */
  const getStatusInfo = (id) => {
    const status = uploadStatus[id]
    const progress = uploadProgress[id] || 0

    switch (status) {
      case "uploading":
        return {
          text: `Uploading: ${progress}%`,
          color: "text-blue-500",
          bgColor: "bg-blue-500",
        }
      case "processing":
        return {
          text: "Processing...",
          color: "text-purple-500",
          bgColor: "bg-purple-500",
        }
      case "complete":
        return {
          text: "Complete",
          color: "text-green-500",
          bgColor: "bg-green-500",
        }
      case "error":
        return {
          text: "Failed",
          color: "text-red-500",
          bgColor: "bg-red-500",
        }
      default:
        return {
          text: "Ready",
          color: "text-gray-500",
          bgColor: "bg-gray-300",
        }
    }
  }

  /**
   * Determines the button text based on the current state
   * Extracted to avoid nested ternary operations
   *
   * @returns {string} - The text to display on the upload button
   */
  const getButtonText = () => {
    if (uploading) {
      return "Uploading..."
    }

    if (files.length === 0) {
      return "Select Files to Upload"
    }

    if (files.every((f) => uploadStatus[f.id] === "complete")) {
      return "All Files Uploaded"
    }

    const pendingCount = files.filter((f) => uploadStatus[f.id] !== "complete").length
    return `Upload ${pendingCount} Video${pendingCount !== 1 ? "s" : ""}`
  }

  /**
   * Checks if a file exceeds the size limit in production environment
   * Only applies the 5MB limit in production (live demo)
   *
   * @param {File} file - The file to check
   * @returns {boolean} - True if the file is too large in production
   */
  const isFileTooLarge = (file) => {
    // Only apply 5MB limit in production (live demo)
    if (process.env.NODE_ENV === "production") {
      const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes
      return file.size > MAX_FILE_SIZE
    }
    return false // No limit in development
  }

  return (
    <div className="p-6 border rounded-lg shadow-lg bg-white">
      {/* Component Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center text-blue-700">
          <span className="text-2xl mr-2">📤</span> Upload Videos
        </h2>
      </div>

      {/* File Selection Section */}
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-700">Select videos to upload</label>
        <div className="flex items-center gap-2">
          <label className="block cursor-pointer">
            <span className="inline-block px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
              Choose Files
            </span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/*"
              multiple
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Supports MP4, MOV, AVI, and WebM formats
          {process.env.NODE_ENV === "production" && (
            <span className="ml-1 text-red-500 font-medium">(5MB max file size in live demo)</span>
          )}
        </p>
      </div>

      {/* File List Section - Only shown when files are selected */}
      {files.length > 0 && (
        <div className="mt-4 mb-4">
          <h3 className="text-md font-medium mb-2 text-blue-700">Selected Videos ({files.length})</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {files.map(({ id, file }) => {
              const { text, color, bgColor } = getStatusInfo(id)
              const progress = uploadProgress[id] || 0

              return (
                <div key={id} className="bg-gray-50 rounded-lg p-3">
                  {/* File Information */}
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium truncate text-blue-500" title={file.name}>
                      {file.name}
                    </span>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${bgColor}`}
                      style={{ width: `${progress}%` }}
                      role="progressbar"
                      aria-valuenow={progress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>

                  {/* Status Text */}
                  <div className="mt-1 text-xs">
                    <span className={color}>{text}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={uploadAllFiles}
        disabled={uploading || files.length === 0 || files.every((f) => uploadStatus[f.id] === "complete")}
        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        aria-busy={uploading}
      >
        {getButtonText()}
      </button>
    </div>
  )
}

