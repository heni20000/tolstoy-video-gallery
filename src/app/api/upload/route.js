import { put } from "@vercel/blob";
// import ffmpeg from "fluent-ffmpeg";
// import ffmpegStatic from "ffmpeg-static";
// //ffmpeg.setFfmpegPath(ffmpegStatic);
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { exec } from "child_process";

const execPromise = promisify(exec);

export async function POST(req) {
    try {
        // Extract form data from the request
        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
            console.log("No file received!"); 
            return new Response(JSON.stringify({ error: "No file uploaded" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log("File received:", file.name, file.type); 

        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (!token) {
            console.error("Missing BLOB_READ_WRITE_TOKEN!");
            return new Response(JSON.stringify({ error: "Server misconfiguration: Missing token" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Convert file to Buffer
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        // Upload video file
        const videoBlob = await put(file.name, fileBuffer, { access: "public", token });

        try {
            const { stdout, stderr } = await execPromise("which ffmpeg");
            console.log("✅ FFmpeg found at:", stdout.trim());
        } catch (ffmpegError) {
            console.error("❌ FFmpeg not found!", ffmpegError);
            return new Response(JSON.stringify({ error: "FFmpeg is not available on the server" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
      

        // Ensure /tmp directory exists
        const tempDir = "/tmp";
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);


        const trytempFilePath = path.join("/tmp", file.name);
        try {
            await fs.promises.writeFile(trytempFilePath, "Test data");
            console.log("✅ Successfully wrote to /tmp");
        } catch (fsError) {
            console.error("❌ Failed to write to /tmp:", fsError);
            return new Response(JSON.stringify({ error: "Cannot write to /tmp directory" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        const tempFilePath = path.join(tempDir, file.name);
        const thumbnailPath = path.join(tempDir, `${file.name}.jpg`);
        

        // Download video from Vercel Blob Storage
        const videoResponse = await fetch(videoBlob.url);
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        // await fs.promises.writeFile(tempFilePath, videoBuffer);

        // // Run FFmpeg to generate thumbnail
        // try {
        //     await execPromise(`ffmpeg -i ${tempFilePath} -ss 00:00:02 -vframes 1 ${thumbnailPath}`);
        // } catch (err) {
        //     console.error("FFmpeg error:", err);
        //     return new Response(JSON.stringify({ error: "FFmpeg processing failed" }), {
        //         status: 500,
        //         headers: { "Content-Type": "application/json" }
        //     });
        // }

        // Upload the thumbnail
        //const thumbnailBlob = await put(`${file.name}.jpg`, fs.createReadStream(thumbnailPath), { access: "public", token });

        // Cleanup temporary files
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        //if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);

        return new Response(JSON.stringify({
            videoUrl: videoBlob.url,
            //thumbnailUrl: thumbnailBlob.url
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: "Failed to upload video" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}