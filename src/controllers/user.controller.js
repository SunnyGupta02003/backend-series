import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser=asyncHandler(async (req, res)=>{
    //get user detail from frontend
    const {username, email, password, fullName} =req.body;

    console.log(req.body)
    //validate user detail
    if(
        [username, email, password, fullName ].some((feild)=>feild?.trim()==="")
    ){
        throw new ApiError(400, "All fields are required")
    }

    //check if user already exist by username or email
    const existUser= await User.findOne(
        {
            $or: [{username}, {email}]
        }   
    )

    if(existUser){
        throw new ApiError(409, "User already exist")
    }
    //check for image or avatar
    const avatarLocalPath=req.files?.avatar[0]?.path;
    // const coverImageLocalPath=req.files?.coverImage[0]?.path;

    let coverImageLocalPath;

    

    if(req.files &&  Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ){
        coverImageLocalPath=req.files.coverImage[0].path
    }



    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    console.log(coverImageLocalPath)

    // upload image to cloudinary
    const avatar=await uploadCloudinary(avatarLocalPath)
    const coverImage=await uploadCloudinary(coverImageLocalPath)

    console.log(coverImage);

    console.log("----------------------");  
    
    

    if(!avatar){
        throw new ApiError(500, "Error uploading avatar")
    }

    // create user object and save to database
    const user=await User.create({
        username: username.toLowerCase(),
        email,
        password,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",

    })

    // remove password and refresh token from response
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    //check for user confirmation
    if(!createdUser){
        throw new ApiError(500, "Error creating user (Server error)")
    }
    console.log(createdUser)

    // return success message
    return res.status(201).json(
        new ApiResponse(200, "User created successfully", createdUser)
    )


})

export {registerUser}