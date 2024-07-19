import multer from "multer";



const storage = multer.diskStorage({ //multers disk storage settings 
    destination: function (req, file, cb) { // Destination to store image 
        cb(null, "./public/test"); // Uploads is the Upload_folder_name 
    },
    
    filename: function (req, file, cb) { // Image name to be stored in database
        cb(null, file.originalname);   
    },
});

const upload = multer({ storage: storage });
