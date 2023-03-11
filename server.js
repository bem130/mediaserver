const express = require("express");
const multer = require("multer");
const path = require('path');

const fs = require("fs");
let app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const filedir = __dirname+"/data";

const upload = multer({ dest:filedir+"/tmp" })

let server = app.listen(3000, function(){
    console.log("Node.js is listening to PORT:" + server.address().port);
});

app.get("/data/*",fileget);
function fileget(req,res,next) {
    if(req.params[0]==undefined) {req.params[0]="";}
    let fpath = `${filedir}/${req.params[0]}`;
    console.log(req.params[0])
    fs.stat( fpath , ( er , stat ) => {
        if( er ){
            if (er.code === "ENOENT") {} else {console.log( er.message );}
            res.status(404).send("<h1>404 Not Found</h1><p>No such Files or Directories</p>");
        }else{
            if (stat.isFile()) {
                res.sendFile(fpath)
            }
        }
    });
}

app.get("/mgr/*", filemgr);
function filemgr(req,res,next) {
    let path2 = req.params[0];
    let path1 = req.params[0];
    if(path.join(path1)=="\\") {path1="/";path2="";}
    let fpath = `${filedir}/${path2}`.replace(/\\/g, "/");
    console.log(req.params[0],path1,path2,path.join(path1))
    fs.stat( fpath , ( er , stat ) => {
        if( er ){
            if (er.code === "ENOENT") {
                res.status(404).send("<h1>404 Not Found</h1><p>No such Files or Directories</p>");
            } else {
                console.log( er.message );
                res.status(404).send("<h1>404 Not Found</h1>");
            }
        }else{
           // console.log( stat );
            if (stat.isFile()) {
                res.sendFile(fpath)
            }
            else if (stat.isDirectory) {
                let dirui = (new TextDecoder("utf-8")).decode(new Uint8Array(fs.readFileSync(__dirname+"/filemgr.html")));
                let dir = fs.readdirSync(fpath);
                let list = "<table><thead><th>Name</th><th>Class</th><th>GET</th><th>Last Edit (JST)</th><th>Last Change (JST)</th><th>Last Access (JST)</th></thead><tbody>";
                for (let i=0;i<dir.length;i++) {
                    const fstats = fs.statSync(path.join(fpath,dir[i]));
                    list += `<tr> <td><a href="${path.join(req.url,dir[i])}">${dir[i]}</a></td> <td>${fstats.isFile()?"File":"Dir"}</td> <td>${fstats.isFile()?`<a href="/${path.join("data/",path2,dir[i])}">Jump</a>`:"-"}</td> <td><a href="${fstats.isFile()?`/${path.join("ctrl/delfile/",path2,dir[i])}`:`/${path.join("ctrl/deldir/",path2,dir[i])}`}">Delete</a></td> <td>${fstats.mtime.toLocaleString({timeZone:'Asia/Tokyo'})}</td> <td>${fstats.ctime.toLocaleString({timeZone:'Asia/Tokyo'})}</td> <td>${fstats.atime.toLocaleString({timeZone:'Asia/Tokyo'})}</td> </tr>`;
                }
                list += "</tbody></table>";
                dirui = dirui .replace("<!--dir-->",list) .replace(/\<\!\-\-path\-\-\>/g,"/"+path2)
                dirui = dirui .replace("<!--upload-->",`<a href="/ctrl/sendfile/${path1}">File Upload</a>`)
                dirui = dirui .replace(/\:path\:/g,path1)
                if (path2.length>0) {
                    dirui = dirui .replace("<!--parentpath-->",`<a href="/mgr/${path.dirname(path1)}">./</a>`)
                }
                res.send(dirui);
            }
        }
    });
}

app.post('/ctrl/newdir/*', function (req, res) {
    console.log(path.join(filedir,req.params[0],req.body.dir))
    fs.mkdir(path.join(filedir,req.params[0],req.body.dir), { recursive: true }, (err) => {
        if (err) {res.send("Error: Failed Making");}
        else {res.redirect(303,"/mgr/"+req.params[0]);}
    });
});

app.get('/ctrl/deldir/*', function (req, res) {
    console.log(path.join(filedir,req.params[0]))
    console.log(req.params[0])
    if(req.params[0]=="tmp") {
        res.end("Error: This Dir Can't Delete")
    }
    else {
        fs.rmdir(path.join(filedir,req.params[0]), (err) => {
            if (err) {res.send("Error: Failed Delete");console.log(err)}
            else {res.redirect(303,path.dirname("/mgr/"+req.params[0])+"/")};
        });
    }
});
app.get('/ctrl/delfile/*', function (req, res) {
    console.log(path.join(filedir,req.params[0]))
    fs.unlink(path.join(filedir,req.params[0]), (err) => {
        if (err) {res.send("Error: Failed Delete")}
        else {res.redirect(303,path.dirname("/mgr/"+req.params[0])+"/");}
    });
});

app.post('/ctrl/sendfile/*', upload.array('file', 50), function (req, res) {
    console.log(req.params)
    if(req.params[0]==undefined) {req.params[0]="";}
    const n = req.files.length;
    try {
        for (let i = 0; i < n; i++) {
            const path = req.files[i].path.replace(/\\/g, "/");
            const dest = `${filedir}/${req.params[0]}/${req.files[i].originalname}`;
            fs.renameSync(path, dest);
        }
        res.redirect(303,"/mgr/"+req.params[0])
    }
    catch (err) {
        res.send("Error: Failed Upload");
    }
});


app.use((req, res, next) => {
    console.log(req.method,req.url)
    res.status(404).send("404 Not Found");
});