import {v2 as cloudinary} from "cloudinary"
import fs from "fs" // File system module to delete the file after uploading it to cloudinary


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY // Click 'View Credentials' below to copy your API secret
});


// Function to upload file to cloudinary
const uploadCloudinary = async (file) => {
    try{
        // Check if file is not empty
        if(!file) return null;

        // Upload file to cloudinary
        const response= await cloudinary.uploader.upload(file, {
            resource_type: "auto",
        })


        console.log("file uploaded successfully to cloudinary", response); // Log the response from cloudinary
        return response;
    }catch(error){
        

        fs.unlinkSync(file); // Delete the file from the server if it fails to upload to cloudinary
        return null;
    }
}

export {uploadCloudinary}; // Export the function to be used in other files