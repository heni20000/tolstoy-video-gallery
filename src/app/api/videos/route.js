import { list } from "@vercel/blob"; 
export async function GET(){
    try{

        const token = process.env.BLOB_READ_WRITE_TOKEN;
        if (!token) {
            return Response.json({ error: "Missing token" }, { status: 500 }); 
        }

        const files = await list({ token });// list of all the files stored in Vercel Blob storage. 
        /*The response looks like this:
            {
                "blobs": [
                    {
                    "pathname": "video1.mp4",
                    "url": "https://vercel.blob.storage/video1.mp4"
                    },
                    {
                    "pathname": "video1.mp4.jpg",
                    "url": "https://vercel.blob.storage/video1.mp4.jpg"
                    }
                ]
            }
        */
        const videos = files.blobs.filter(file =>file.pathname.endsWith(".mov") || file.pathname.endsWith(".mp4"));
        const thumbnails = files.blobs.filter(file => file.pathname.endsWith(".jpg"));

        //loops through all videos in storage , for each video, we try to find its corresponding thumbnail
        const gallery = videos.map(video =>{
            const videoName = video.pathname.split(".")[0]; // Get base filename
            const thumbnail = thumbnails.find(thumb => thumb.pathname.startsWith(videoName));

            return {
                videoUrl: video.url,
                thumbnailUrl: thumbnail ? thumbnail.url : null, //returns the matching thumbnail URL
            };

        });

        return Response.json(gallery);

    }catch (error){
        console.error("Error:", error); // 
        return Response.json({ error: "Failed to fetch gallery" }, { status: 500 }); 
    }

}
