import { list } from "@vercel/blob"

export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      return Response.json({ error: "Missing token" }, { status: 500 })
    }

    const files = await list({ token })

    // Filter video files
    const videos = files.blobs.filter(
      (file) => file.pathname.endsWith(".mp4") || file.pathname.endsWith(".mov") || file.pathname.endsWith(".webm"),
    )

    // Filter thumbnail files
    const thumbnails = files.blobs.filter((file) => file.pathname.includes(".thumbnail.jpg"))

    // Create gallery items by matching videos with their thumbnails
    const gallery = videos.map((video) => {
      // Extract the base filename to match with thumbnail
      const videoName = video.pathname
      // Find matching thumbnail
      const thumbnail = thumbnails.find((thumb) => thumb.pathname === `${videoName}.thumbnail.jpg`)

      return {
        videoUrl: video.url,
        thumbnailUrl: thumbnail ? thumbnail.url : null,
        name: videoName,
      }
    })

    return Response.json(gallery)
  } catch (error) {
    console.error("Error:", error)
    return Response.json({ error: "Failed to fetch gallery" }, { status: 500 })
  }
}

