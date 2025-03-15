import { put } from "@vercel/blob"
import { v2 as cloudinary } from "cloudinary"

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req) {
  try {
    // Extract form data from the request
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file) {
      console.log("No file received!")
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("File received:", file.name, file.type)

    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      console.error("Missing BLOB_READ_WRITE_TOKEN!")
      return new Response(JSON.stringify({ error: "Server misconfiguration: Missing token" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Convert file to Buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Upload video file to Vercel Blob
    const videoBlob = await put(file.name, fileBuffer, { access: "public", token })
    console.log("Video uploaded to Vercel Blob:", videoBlob.url)

    // Upload video to Cloudinary for thumbnail generation
    // We need to create a temporary file URL for Cloudinary to access
    const uploadResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        videoBlob.url,
        {
          resource_type: "video",
          // Generate a thumbnail at 2 seconds into the video
          eager: [
            { format: "jpg", transformation: [{ width: 640, height: 360, crop: "fill" }, { start_offset: "2" }] },
          ],
          eager_async: false,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error)
            reject(error)
          } else {
            console.log("Cloudinary upload success:", result)
            resolve(result)
          }
        },
      )
    })

    // Get the thumbnail URL from Cloudinary
    const thumbnailUrl = uploadResponse.eager[0].secure_url
    console.log("Thumbnail generated at:", thumbnailUrl)

    // Download the thumbnail from Cloudinary
    const thumbnailResponse = await fetch(thumbnailUrl)
    const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer())

    // Upload the thumbnail to Vercel Blob
    const thumbnailBlob = await put(`${file.name}.thumbnail.jpg`, thumbnailBuffer, {
      access: "public",
      token,
    })
    console.log("Thumbnail uploaded to Vercel Blob:", thumbnailBlob.url)

    return new Response(
      JSON.stringify({
        videoUrl: videoBlob.url,
        thumbnailUrl: thumbnailBlob.url,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(JSON.stringify({ error: "Failed to upload video" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

