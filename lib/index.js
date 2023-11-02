"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const promises_1 = require("fs/promises");
const string_similarity_js_1 = require("string-similarity-js");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const sqlite3_1 = require("sqlite3");
const util_1 = require("util");
const sql = (0, sqlite3_1.verbose)();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server);
app.use((0, cors_1.default)());
app.use(express_1.default.static("../pijanka-app/")); //GITHUB PAGES
app.use(express_1.default.json());
//conect to database
let db = new sql.Database('./pijanka.db', function (error) {
    if (error) {
        return console.log(error.message);
    }
    console.log('Connected to the songs.db SQlite database.');
});
// Use the promise pattern for SQLite so we don't end up in callback hell.
const asyncGet = (0, util_1.promisify)(db.get).bind(db);
const asyncAll = (0, util_1.promisify)(db.all).bind(db);
const asyncRun = (0, util_1.promisify)(db.run).bind(db);
// db.on("trace", (sql) => {
//     console.log("Statment:",)
// })
function createDBtable() {
    //create new table
    let instruction = "CREATE TABLE songs(id INTEGER PRIMARY KEY AUTOINCREMENT,UNIQUE(name))";
    db.run(instruction);
}
function copyToDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        let instruction = "INSERT into songs(name) VALUES(?)";
        let songs = yield readFromPath("songs.json");
        for (let i = 0; i < songs.length; i++) {
            let name = songs[i].name;
            db.run(instruction, [name], function (err) {
                if (err) {
                    return console.log(err.message);
                }
                console.log("upis");
            });
        }
    });
}
function deleteTable() {
    let instDlt = "DELETE FROM event";
    db.run(instDlt, []);
}
// //read all
// let nesto1 = "SELECT * FROM songs"
// db.all(nesto1, [], function (err, rows) {
//     if (err != null) {
//         return console.log(err.message)
//     }
//     rows.forEach(function (row) {
//         console.log(row)
//     })
// })
//get all songs
app.get("/api/songs", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let instruction = "SELECT * FROM songs";
            let songs = [];
            db.all(instruction, [], function (err, rows) {
                if (err != null) {
                    return console.log(err.message);
                }
                let i = 0;
                rows.forEach(r => {
                    songs[i++] = r;
                    resp.send(songs);
                });
            });
        }
        catch (e) {
            resp.send({}); //todo wrong user id..
        }
    });
});
//get eventID
app.get("/api/eventID", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let d = new Date();
            let day = d.getDate();
            let month = d.getMonth() + 1;
            let year = d.getFullYear();
            let date = "" + day + "." + month + "." + year + ".";
            let eventIns = "INSERT into event(date) VALUES(?)";
            db.run(eventIns, [date], function (err) {
                if (err) {
                    return console.log(err.message);
                }
                console.log("upis");
            });
            let eventId = yield getID(date);
            //let eventId = 1
            let citaj = "SELECT * FROM songs";
            db.all(citaj, [], function (err, rows) {
                if (err) {
                    return console.log(err.message);
                }
                rows.forEach(function (row) {
                    let pisi = "INSERT into remaining(song_id,event_id) VALUES(?,?)";
                    db.run(pisi, [row.id, eventId]);
                });
                resp.send({ id: eventId });
            });
        }
        catch (e) {
            console.log("greska se desila ", e);
            resp.send({}); //todo wrong user id..
        }
    });
});
function getID(date) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield asyncGet(`SELECT id from event WHERE date="${date}"`);
        return res.id;
    });
}
//check ID
app.get("/api/checkID/:eventID", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let id = parseInt(req.params.eventID);
            let eventGet = "SELECT date from event WHERE id=?";
            db.get(eventGet, [id], function (err, row) {
                if (err != null) {
                    return console.log(err.message);
                }
                if (row != null) {
                    resp.send(true);
                }
                else {
                    resp.send(false);
                }
            });
        }
        catch (e) {
            console.log("greska se desila ", e);
            resp.send(false); //todo wrong user id..
        }
    });
});
//add song
app.post("/api/songs", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let insertIns = "INSERT into songs(name) VALUES(?)";
            db.run(insertIns, [req.body.name], function (err) {
                if (err) {
                    resp.send("Doslo je do greske");
                    return console.log(err.message);
                }
                console.log("upis");
                resp.send({});
            });
        }
        catch (e) {
            console.log("greska se dogodila");
            resp.send({}); //todo wrong user id..
        }
    });
});
//similarity
app.post("/api/songs/sim", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let instruction = "SELECT * FROM songs";
            let songs = [];
            db.all(instruction, [], function (err, rows) {
                if (err != null) {
                    return console.log(err.message);
                }
                let i = 0;
                rows.forEach(r => {
                    songs[i++] = r;
                });
                let matchs = [];
                for (let i = 0; i < songs.length; i++) {
                    let similarity = (0, string_similarity_js_1.stringSimilarity)(songs[i].name, req.body.name);
                    if (similarity >= 0.3) {
                        matchs.push(songs[i].name);
                    }
                }
                resp.send(matchs);
            });
        }
        catch (e) {
            console.log("greska se dogodila", e);
            resp.send({}); //todo wrong user id..
        }
    });
});
//get event songs
app.get("/api/event/songs/:eventID", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        let remSongs = `SELECT songs.* FROM remaining 
                        INNER JOIN songs ON remaining.song_id == songs.id 
                    WHERE event_id=${req.params.eventID}`;
        let songs = yield asyncAll(remSongs);
        resp.send(songs);
    });
});
//get listened songs
app.get("/api/event/listened/:eventID", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        let songsID = yield asyncAll(`SELECT song_id FROM listened WHERE event_id=${req.params.eventID}`);
        let songs = [];
        for (let i = 0; i < songsID.length; i++) {
            songs[i] = (yield asyncGet(`SELECT name FROM songs WHERE id=${songsID[i].song_id}`));
        }
        resp.send(songs);
    });
});
//order song
app.get("/api/event/songs/:eventID/:songID", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let song = yield asyncGet(`SELECT * FROM songs WHERE id=${req.params.songID}`);
            let eventID = parseInt(req.params.eventID);
            yield asyncRun(`DELETE from remaining WHERE song_id=${req.params.songID} AND event_id=${req.params.eventID}`);
            db.run("INSERT into listened(song_id,event_id) VALUES(?,?)", [song.id, eventID], function (err) {
                if (err) {
                    return console.log(err.message);
                }
                console.log("upis");
            });
            io.emit('last ordered', song.name);
            resp.send({});
        }
        catch (e) {
            console.log("kurcina", e);
            resp.send({}); //todo wrong user id..
        }
    });
});
function getLastOrderedId() {
    return __awaiter(this, void 0, void 0, function* () {
        let cukam = yield asyncGet(`SELECT MAX(id) as maxID FROM listened`);
        return cukam.maxID;
    });
}
// //last ordered
// app.get("/api/event/last/:eventID", async function (req, resp) {
//     try {
//         let id: number = await getLastOrderedId()
//         if (id >= 1) {
//             let get = await asyncGet(`SELECT song_id from listened WHERE id=${id}`) as { song_id: number }
//             let songID = get.song_id
//             let song = await asyncGet(`SELECT name from songs WHERE id=${songID}`) as string
//             resp.send(song)
//         } else {
//             resp.send({ name: "" })
//         }
//     } catch (e) {
//         console.log("kurcina")
//         resp.send({}) //todo wrong user id..
//     }
// })
//server
const PORT = 5000;
server
    .listen(PORT, function () {
    console.log(`Server is running on port ${PORT}.`);
})
    .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.log("Error: address already in use");
    }
    else {
        console.log(err);
    }
});
//read & write to files
function readFromPath(path) {
    return __awaiter(this, void 0, void 0, function* () {
        const content = yield (0, promises_1.readFile)(path, "utf-8");
        //do something with content...
        //to parse json use
        //Converts a JavaScript Object Notation (JSON) string into an object.
        let songs = JSON.parse(content);
        return songs;
    });
}
function writeToPath(path, content) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, promises_1.writeFile)(path, content, "utf-8");
    });
}
function uredi() {
    return __awaiter(this, void 0, void 0, function* () {
        let songs = yield readFromPath("songs.json");
        let newSongs = [];
        let n = 0;
        for (let i = 0; i < songs.length; i++) {
            let song = songs[i];
            song.id = i;
            newSongs[n++] = song;
        }
        writeToPath("songs.json", JSON.stringify(newSongs));
    });
}
io.on('connection', function (socket) {
    socket.on('last ordered', function (msg) {
        return __awaiter(this, void 0, void 0, function* () {
            let id = yield getLastOrderedId();
            if (id >= 1) {
                let get = yield asyncGet(`SELECT song_id from listened WHERE id=${id}`);
                let songID = get.song_id;
                let name = yield asyncGet(`SELECT name from songs WHERE id=${songID}`);
                let song = name.name;
                io.emit("last ordered", song);
            }
            else {
                io.emit("last ordered", "");
            }
        });
    });
});
// db.get("SELECT MAX(id) as maxID FROM listened", [], function (e, r: { maxID: number }) {
//     console.log(r)
//     let id = r.maxID
// })
//# sourceMappingURL=index.js.map