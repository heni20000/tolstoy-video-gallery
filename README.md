Tolstoy Video Gallery

A modern, responsive video gallery application that allows users to upload videos, automatically generate thumbnails, and display videos in an interactive carousel.

live demo : https://tolstoy-video-gallery.vercel.app/

Features

-Video Upload: Simple interface for uploading video files
-Automatic Thumbnail Generation: Creates thumbnails from uploaded videos
-Responsive Gallery: Displays videos in a responsive, swipeable carousel
-Video Playback: Click on thumbnails to play videos directly in the gallery
-Progress Tracking: Real-time upload progress indicators
-Status Updates: Visual feedback for upload and processing status

Project Structure

src/
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.js    # API route for video uploads
│   │   └── videos/
│   │       └── route.js    # API route for fetching videos
│   ├── globals.css         # Global styles
│   ├── layout.js           # Root layout
│   └── page.js             # Main page component
├── components/
│   ├── VideoGallery.js     # Video gallery component
│   └── VideoUploader.js    # Video upload component

Technologies Used

-Frontend:
  - Next.js 13+ (App Router)
  - React 18
  - Tailwind CSS for styling
  - Swiper for carousel functionality

-Backend:
  - Next.js API Routes
  - Vercel Blob Storage for video and thumbnail storage
  - Cloudinary for video processing and thumbnail generation

-Testing & Development:
  - Postman for API testing and validation


Environment Variables

Create a `.env.local` file in the root directory with the following variables:
