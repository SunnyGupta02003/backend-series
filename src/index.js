import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./.env"
});


connectDB()
.then(()=>{

    app.listen(process.env.PORT || 8080, ()=>{
        console.log(`Server is running on port ${process.env.PORT}`);
    });
}).catch((error)=>{
    console.log(`Error: ${error}`);
});






/*

(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        app.on("error", (error)=>{
            console.error(`Error: ${error}`)
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`Server is running on port ${process.env.PORT}`)
        })
    }catch(error){
        console.error(`Error: ${error}`)
    }
})();

*/

