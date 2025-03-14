import { put } from "@vercel/blob";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";

const execPromise = promisify(exec); // Promisify exec to use async/await

  
export async function POST(req) {
  try {
    //Extract form data from the request 
    const formData = await req.formData();
    // gets the uploaded file
    const file = formData.get("file");

    
    if (!file) {
        console.log(" No file received!"); // Debugging log
        return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    
    console.log("File received:", file.name, file.type); // Debugging log

    // Retrieve environment variable for Vercel Blob token
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
        console.error("Missing BLOB_READ_WRITE_TOKEN!");// Debugging log
        return Response.json({ error: "Server misconfiguration: Missing token" }, { status: 500 });
    }

    // Upload the video file to Vercel Blob Storage and make it publicly accessible
    const videoBlob = await put(file.name, file, { access: "public", token });

    

    //Define temporary file paths
    const tempFilePath = path.join("/tmp", file.name); // Path to store the video temporarily
    const thumbnailPath = path.join("/tmp", `${file.name}.jpg`); // Path for the generated thumbnail

    //Download the uploaded video to the temp directory
    const videoResponse = await fetch(videoBlob.url); // Fetch the uploaded video from Vercel Blob
    const videoBuffer = await videoResponse.arrayBuffer(); //Converts the fetched video into an ArrayBuffer.
    /*
    Transforms the ArrayBuffer into a Node.js Buffer, which is necessary for writing to a file. 
    And then Writes the buffered video to a temporary file (tempFilePath).\
    This creates a local copy of the video on the server for processing.
    */
    await fs.promises.writeFile(tempFilePath, Buffer.from(videoBuffer)); 


    //Use FFmpeg to extract a thumbnail from the video
    await execPromise(// Extracts a frame at 2 seconds and extracts 1 frame
        `ffmpeg -i ${tempFilePath} -ss 00:00:02 -vframes 1 ${thumbnailPath}`
    );

    //Upload the generated thumbnail to Vercel Blob storage
    const thumbnailBlob = await put(
        `${file.name}.jpg`,
        fs.createReadStream(thumbnailPath),
        { access: "public", token }
    );

    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(thumbnailPath);

    
    return Response.json({
        videoUrl: videoBlob.url,
        thumbnailUrl: thumbnailBlob.url,
      });


    //return a 500 Internal Server Error response
  } catch (error) {
    console.error(" Error:", error);
    return Response.json({ error: "Failed to upload video" }, { status: 500 });
  }

}

