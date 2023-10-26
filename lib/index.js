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
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.static("../pijanka.APP.1.0/")); //GITHUB PAGES
app.use(express_1.default.json());
//get all songs
app.get("/api/songs", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        let path = "songs.json";
        try {
            let songs = yield readFromPath(path);
            resp.send(songs);
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
            let id = "" + day + "." + month + "." + year + ".";
            let path = id + "event_songs.json";
            let pathToListened = id + "listened_songs.json";
            let songs = yield readFromPath("songs.json");
            writeToPath(path, JSON.stringify(songs));
            writeToPath(pathToListened, JSON.stringify([]));
            resp.send({ id: id });
        }
        catch (e) {
            console.log("greska se desila ", e);
            resp.send({}); //todo wrong user id..
        }
    });
});
//check ID
app.get("/api/checkID/:eventID", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let path = req.params.eventID + "event_songs.json";
            let songs = yield readFromPath(path);
            if (songs != null) {
                resp.send(true);
            }
            else {
                resp.send(false);
            }
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
        let path = "songs.json";
        try {
            let songs = yield readFromPath(path);
            let index = songs[songs.length - 1].id + 1;
            console.log("body: ", req.body);
            let newSong = {
                id: index,
                name: req.body.name
            };
            songs.push(newSong);
            writeToPath(path, JSON.stringify(songs));
            resp.send({});
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
        let path = "songs.json";
        try {
            let songs = yield readFromPath(path);
            console.log("body: ", req.body);
            let matchs = [];
            for (let i = 0; i < songs.length; i++) {
                let similarity = (0, string_similarity_js_1.stringSimilarity)(songs[i].name, req.body.name);
                if (similarity >= 0.3) {
                    matchs.push(songs[i].name);
                }
            }
            resp.send(matchs);
        }
        catch (e) {
            console.log("greska se dogodila");
            resp.send({}); //todo wrong user id..
        }
    });
});
//get event songs
app.get("/api/event/songs/:eventID", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        let path = req.params.eventID + "event_songs.json";
        try {
            let songs = yield readFromPath(path);
            resp.send(songs);
        }
        catch (e) {
            console.log("kurcina");
            resp.send({}); //todo wrong user id..
        }
    });
});
//get listened songs
app.get("/api/event/listened/:eventID", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        let path = req.params.eventID + "listened_songs.json";
        try {
            let songs = yield readFromPath(path);
            resp.send(songs);
        }
        catch (e) {
            console.log("kurcina");
            resp.send({}); //todo wrong user id..
        }
    });
});
//order song
app.get("/api/event/songs/:eventID/:songID", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        let pathToSongs = req.params.eventID + "event_songs.json";
        let pathToListened = req.params.eventID + "listened_songs.json";
        try {
            let songs = yield readFromPath(pathToSongs);
            let newSongs = [];
            let n = 0;
            let listened = yield readFromPath(pathToListened);
            let song = { id: -1, name: "cukam" };
            for (let i = 0; i < songs.length; i++) {
                if (songs[i].id == parseInt(req.params.songID)) {
                    song = songs[i];
                    continue;
                }
                newSongs[n++] = songs[i];
            }
            writeToPath(pathToSongs, JSON.stringify(newSongs));
            if (song.id == -1) {
                resp.send({ error: "song not found:" + req.params.songID }); //nesto debelo zasrano
            }
            else {
                listened.push(song);
                writeToPath(pathToListened, JSON.stringify(listened));
                resp.send({});
            }
        }
        catch (e) {
            console.log("kurcina", e);
            resp.send({}); //todo wrong user id..
        }
    });
});
//last ordered
app.get("/api/event/last/:eventID", function (req, resp) {
    return __awaiter(this, void 0, void 0, function* () {
        let path = req.params.eventID + "listened_songs.json";
        try {
            let songs = yield readFromPath(path);
            if (songs.length >= 1) {
                let song = songs[songs.length - 1];
                resp.send(song);
            }
            else {
                resp.send({ name: "" });
            }
        }
        catch (e) {
            console.log("kurcina");
            resp.send({}); //todo wrong user id..
        }
    });
});
//server
const PORT = 5000;
app
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
//# sourceMappingURL=index.js.map