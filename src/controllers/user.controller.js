import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndResfreshToken=async (userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken= user.generateAccessToken();
        const refreshToken= user.generateRefreshToken();

        //save refresh token to database
        user.refreshToken=refreshToken;

        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Error, While generating Access and Refresh token")
    }
}

const registerUser=asyncHandler(async (req, res)=>{
    //get user detail from frontend
    const {username, email, password, fullName} =req.body;
    // console.log("fullName", fullName,);
    

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

const loginUser=asyncHandler(async(req, res)=>{

    // console.log("---------------------");
    
    // get user => req.body
    const {email, username, password}=req.body;
    // const {email, username, password}=req.body;
    console.log(req.body);
    
    // username or email is required
    if(!email && !username){
        throw new ApiError(400, "Username or email is required")
    }

    
    //find the user by email or username
    const user=await User.findOne({ 
        $or: [{email}, {username}]
    })
    
    // console.log("---------------------");
    //check if user exist
    if(!user){
        throw new ApiError(404, "User not found");
    }

    //check if password is correct
    const isPasswordCorrect=await user.isPasswordCorrect(password);

    if(!isPasswordCorrect){
        throw new ApiError(401, "invalid password")
    }


    //access token annd referesh token
    const {accessToken, refreshToken}=await generateAccessAndResfreshToken(user._id);

    const loginUser=await User.findById(user._id).select("-password -refreshToken")


    // send cookies
    const options={
        httpOnly: true,
        secure: true,

    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loginUser, accessToken, refreshToken
            },
            "Login successfully"
        )
    )

    // send response

})

const logoutUser=asyncHandler(async(req, res)=>{
    console.log("---------------------");
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options={
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "Logout successfully")
    )
})


const refreshAccessToken=asyncHandler(async(req, res)=>{
    const incomingResfreshToken=req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingResfreshToken){
        throw new ApiError(401, "Unauthorized request token")
    }

    try {
        const decodedTokenJWT=jwt.verify(incomingResfreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user=await User.findById(decodedTokenJWT?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid Refresh token")
        }
    
        if(user.referenceToken!==incomingResfreshToken){
            throw new ApiError(401, "Invalid Refresh token")
        }
    
        const options={
            httpOnly: true,
            secure: true,
        }
    
        const {accessToken, newRefreshToken}=await generateAccessAndResfreshToken(user._id);
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, {accessToken, newRefreshToken}, "Token refreshed successfully")
        )
    
    } catch (error) {
        throw new ApiError(401, "Unauthorized request")
        
    }

})


const changeCurrentPassword=asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword}=req.body;

    const user=await User.findById(req.user?._id);
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid password")
    }

    user.password=newPassword;
    await user.save();

    return res.status(200)
    .json(
        new ApiResponse(200, {}, "Password changed successfully")
    )

})

const getCurrentUser=asyncHandler(async(req, res)=>{
    return res.status(200)
    .json(
        new ApiResponse(200, req.user, "User found successfully")
    )
})

const updateAccountDetails=asyncHandler(async(req, res)=>{

    const { email, fullName}=req.body;

    if(!email || !fullName){
        throw new ApiError(400, "All fields are required")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                email,
                fullName
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )


})

const updateUserAvatar=asyncHandler(async(req, res)=>{
    const avatarLocalPath=req.files?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    const avatar= await uploadCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error uploading avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
})

const updateUserCoverImage=asyncHandler(async(req, res)=>{
    const coverImageLocalPath=req.files?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image is required")
    }

    const coverImage= await uploadCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400, "Error uploading avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
})

const getUserProfileChannel=asyncHandler(async(req, res)=>{
    const {username}=req.params;

    if(!username?.trim()){
        throw new ApiError(400, "Username is required")
    }

    const chennal=await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            },
            
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "Subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribeTo"
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size: "$subscribers"
                },

                channelSubscribedToCount:{
                    $size: "$subscribeTo"
                },
                isSuscribed:{
                    $cond:{
                        if:{
                            $in: [req.user._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                        
                    }
                
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                channelSubscribedToCount: 1,
                isSuscribed: 1,
                email: 1,

            }
        }
    ])

})
    
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserProfileChannel,

}