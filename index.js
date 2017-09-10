const express = require('express');
const app = express();
const {hashPassword, checkPassword} = require("./Config/hashing.js");
const {updatePic, addNewUser, getHash, updateBio, getOtherUserData} = require("./sql/dbqueries.js");
const {middleware} = require("./express/middleware.js");
const knox = require('knox');
let secrets = require('./secrets.json');
var multer = require('multer');
var uidSafe = require('uid-safe');
var path = require('path');
const fs = require('fs');

//AWS
const client = knox.createClient({
    key: secrets.AWS_KEY,
    secret: secrets.AWS_SECRET,
    bucket: 'mypracticesn'
});

var uploadToS3 = (reqfile) => {
    return new Promise((resolve, reject) => {
        const s3Request = client.put(reqfile.filename, {
            'Content-Type': reqfile.mimetype,
            'Content-Length': reqfile.size,
            'x-amz-acl': 'public-read'
        });
        resolve(s3Request);
    });
};

var diskStorage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, __dirname + "/uploads");
    },
    filename: function(req, file, callback) {
        uidSafe(24).then(function(uid) {
            callback(null, uid + path.extname(file.originalname));
        });
    }
});

var uploader = multer({
    storage: diskStorage,
    limits: {
        filesize: 2097152
    }
});


//MIDDLEWARE
app.use(express.static(__dirname + "/public"));

if (process.env.NODE_ENV != 'production') {
    app.use(require('./build'));
}

middleware(app);


//ROUTES
app.get("/", (req, res) => {
    if(!req.session.user) {
        return res.redirect("/welcome");
    }
    res.sendFile(__dirname + "/index.html");
});


app.get("/welcome", (req, res) => {
    if(req.session.user) {
        return res.redirect("/");
    }
    res.sendFile(__dirname + "/index.html");
});


app.post("/register", (req, res) => {
    let first = req.body.first;
    let last = req.body.last;
    let email = req.body.email;
    let pw = req.body.pw;

    hashPassword(pw)
        .then((hash) => {
            let data = [first, last, email, hash];
            addNewUser(data)
                .then((result) => {
                    const {id, email, image, bio} = result.rows[0];
                    req.session.user = {
                        id,
                        email,
                        first,
                        last,
                        image,
                        bio
                    };
                })
                .then(() => {
                    res.json({
                        success: true
                    });
                })
                .catch((err) => {
                    console.log(err);
                    res.json({
                        success: false
                    });
                });
        });
});


app.post("/login" , (req, res) => {

    let email = [req.body.email];
    let pw = req.body.pw;

    getHash(email)
        .then((hash) => {
            const {id, email, first, last, image, bio} = hash.rows[0];

            checkPassword(pw, hash.rows[0].pw)
                .then((result) => {
                    if(result) {
                        req.session.user = {
                            id,
                            email,
                            first,
                            last,
                            image,
                            bio
                        };
                        res.json({
                            success: true
                        });
                    } else {
                        res.json({
                            success: false
                        });
                    }
                });
        })
        .catch((err) => {
            console.log(err);
            res.json({
                success: false
            });
        });
});

app.post("/upload", uploader.single('file'), (req, res) => {
    if(req.file) {
        uploadToS3(req.file)
            .then((s3Request) => {
                const readStream = fs.createReadStream(req.file.path);
                readStream.pipe(s3Request);
                s3Request.on("response", s3Response => {
                    const wasSuccessful = s3Response.statusCode == 200;
                    console.log("statuscode", s3Response.statusCode);
                    res.json({
                        success: wasSuccessful
                    });
                });
            })
            .then(() => {
                let data = [req.file.filename, req.session.user.email];
                req.session.user.image = req.file.filename;
                updatePic(data);
            });
    } else {
        res.json({
            success: false
        });
    }
});

app.get("/api/user", (req, res) => {
    const {id, first, last, image, bio} = req.session.user;
    res.json({
        id,
        first,
        last,
        image,
        bio
    });
});

app.post("/bio", (req, res) => {
    let data = [req.body.bio, req.session.user.email];

    updateBio(data)
        .then((resp) => {
            console.log(resp);
        });
});

app.get("/api/user/:id", (req, res) => {
    let id = [req.params.id];

    getOtherUserData(id)
        .then((results) => {
            let {first, last, image, bio} = results.rows[0];
            res.json({
                first,
                last,
                image,
                bio
            });
        });
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/welcome");
});


//KEEP this at the bottom:
app.get('*', function(req, res) {
    if(!req.session.user) {
        return res.redirect("/welcome");
    }
    res.sendFile(__dirname + '/index.html');
});

app.listen(8080, function() {
    console.log("Listening on port 8080");
});
