import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

export const verifyJWT = asyncHandler(async (req, _, next)=>{
    try {
            const token=req.cookies?.accessToken || req.header("Authorizaion")?.replace("Bearer ", "");
            // console.log("token := ", token)
        
            if(!token){
                throw new ApiError(401, "Unauthorized request token");

            }
        
            const decodedTokenJWT=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

            // console.log(process.env.ACCESS_TOKEN_SECRET)
            // console.log("decodedTokenJWT := ", decodedTokenJWT)
        
            const user=await User.findById(decodedTokenJWT?._id).select("-password -refreshToken")
            // console.log("---------------------");
            // console.log("user := ", user)
        
            if(!user){
                throw new ApiError(401,  "Invalid token access")
            }
        
            req.user=user;
        
            next();
    } catch (error) {
        throw new ApiError(401, "Unauthorized request abc")
        
    }
})