"use client"

import { useState, useRef } from "react"

/**
 * VideoUploader Component
 *
 * Simplified version with multiple file selection and upload
 * with progress tracking for each file
 *
 * @param {Object} props
 * @param {Function} props.onUploadComplete - Callback function when uploads finish
 */
export default function VideoUploader({ onUploadComplete }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadStatus, setUploadStatus] = useState({})
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef(null)

  // Handle file selection from input
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files)
    if (selectedFiles.length === 0) return

    // Create a new array with the newly selected files
    const fileObjects = selectedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}`, // Create a unique ID
      file,
      status: "ready", // Initial status
    }))

    // Add new files to the existing files
    setFiles((prevFiles) => [...prevFiles, ...fileObjects])

    // Initialize progress for new files
    const newProgress = {}
    const newStatus = {}
    fileObjects.forEach((fileObj) => {
      newProgress[fileObj.id] = 0
      newStatus[fileObj.id] = "ready"
    })

    setUploadProgress((prev) => ({ ...prev, ...newProgress }))
    setUploadStatus((prev) => ({ ...prev, ...newStatus }))

    // Reset the file input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith("video/"))
      addNewFiles(droppedFiles)
    }
  }

  // Add new files to the state
  const addNewFiles = (newFiles) => {
    // Create a new array with the newly accepted files
    const fileObjects = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}`, // Create a unique ID
      file,
      status: "ready", // Initial status
    }))

    // Add new files to the existing files
    setFiles((prevFiles) => [...prevFiles, ...fileObjects])

    // Initialize progress for new files
    const newProgress = {}
    const newStatus = {}
    fileObjects.forEach((fileObj) => {
      newProgress[fileObj.id] = 0
      newStatus[fileObj.id] = "ready"
    })

    setUploadProgress((prev) => ({ ...prev, ...newProgress }))
    setUploadStatus((prev) => ({ ...prev, ...newStatus }))
  }

  // Trigger file input click
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Remove a file from the queue
  const removeFile = (id) => {
    setFiles((prevFiles) => prevFiles.filter((fileObj) => fileObj.id !== id))

    // Also clean up progress and status
    setUploadProgress((prev) => {
      const newProgress = { ...prev }
      delete newProgress[id]
      return newProgress
    })

    setUploadStatus((prev) => {
      const newStatus = { ...prev }
      delete newStatus[id]
      return newStatus
    })
  }

  // Clear all files
  const clearFiles = () => {
    setFiles([])
    setUploadProgress({})
    setUploadStatus({})
  }

  // Upload a single file with progress tracking
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

  // Upload all files simultaneously
  const uploadAllFiles = async () => {
    if (files.length === 0 || uploading) return

    setUploading(true)
    const uploadResults = []
    const uploadPromises = []

    // Start all uploads simultaneously
    files.forEach((fileObj) => {
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

    // Notify parent component
    if (onUploadComplete && typeof onUploadComplete === "function" && successfulUploads.length > 0) {
      onUploadComplete(successfulUploads)

      // Clear the uploader after successful uploads
      setFiles([])
      setUploadProgress({})
      setUploadStatus({})
    }
  }

  // Retry a failed upload
  const retryUpload = async (id) => {
    const fileObj = files.find((f) => f.id === id)
    if (!fileObj) return

    setUploadProgress((prev) => ({ ...prev, [id]: 0 }))
    setUploadStatus((prev) => ({ ...prev, [id]: "ready" }))

    try {
      setUploading(true)
      const result = await uploadFile(fileObj)
      setUploading(false)

      // Notify parent component
      if (onUploadComplete && typeof onUploadComplete === "function") {
        onUploadComplete([result])
      }
    } catch (error) {
      setUploading(false)
      console.error(`Failed to retry upload for ${fileObj.file.name}:`, error)
    }
  }

  // Get appropriate status text and color
  const getStatusInfo = (id) => {
    const status = uploadStatus[id]
    const progress = uploadProgress[id]

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

  return (
    <div className="p-6 border rounded-lg shadow-lg bg-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center text-blue-700">
          <span className="text-2xl mr-2">📤</span> Upload Videos
        </h2>
        {files.length > 0 && (
          <button onClick={clearFiles} className="text-sm text-gray-500 hover:text-gray-700" disabled={uploading}>
            Clear All
          </button>
        )}
      </div>

      {/* File Selection */}
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
        <p className="mt-1 text-xs text-gray-500">Supports MP4, MOV, AVI, and WebM formats</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 mb-4">
          <h3 className="text-md font-medium mb-2 text-blue-700">Selected Videos ({files.length})</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {files.map(({ id, file }) => {
              const { text, color, bgColor } = getStatusInfo(id)
              const progress = uploadProgress[id] || 0
              const status = uploadStatus[id]

              return (
                <div key={id} className="bg-gray-50 rounded-lg p-3">
                  {/* File Info */}
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium truncate text-blue-500" title={file.name}>
                      {file.name}
                    </span>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-2">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>

                      {/* Action buttons based on status */}
                      {status === "error" ? (
                        <button
                          onClick={() => retryUpload(id)}
                          disabled={uploading}
                          className="text-xs text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Retry
                        </button>
                      ) : (
                        status !== "uploading" &&
                        status !== "processing" && (
                          <button
                            onClick={() => removeFile(id)}
                            disabled={uploading}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Remove
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${bgColor}`} style={{ width: `${progress}%` }}></div>
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
      >
        {uploading
          ? "Uploading..."
          : files.length === 0
            ? "Select Files to Upload"
            : files.every((f) => uploadStatus[f.id] === "complete")
              ? "All Files Uploaded"
              : `Upload ${files.filter((f) => uploadStatus[f.id] !== "complete").length} Video${
                  files.filter((f) => uploadStatus[f.id] !== "complete").length !== 1 ? "s" : ""
                }`}
      </button>
    </div>
  )
}

