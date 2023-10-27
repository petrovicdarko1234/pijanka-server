import express, { Application } from "express";
import cors from "cors"
import { readFile, writeFile } from "fs/promises"
import { stringSimilarity } from "string-similarity-js";
import http from "http"
import { Server } from "socket.io"

const app: Application = express();
const server = http.createServer(app)
const io = new Server(server)

app.use(cors())
app.use(express.static("../pijanka.APP.1.0/")) //GITHUB PAGES

app.use(express.json());

type Song = {
    id: number
    name: string
}
//get all songs
app.get("/api/songs", async function (req, resp) {
    let path: string = "songs.json"
    try {
        let songs: Song[] = await readFromPath(path)
        resp.send(songs)
    } catch (e) {
        resp.send({}) //todo wrong user id..
    }
})
//get eventID
app.get("/api/eventID", async function (req, resp) {
    try {
        let d = new Date()
        let day: number = d.getDate()
        let month: number = d.getMonth() + 1
        let year: number = d.getFullYear()

        let id: string = "" + day + "." + month + "." + year + "."

        let path: string = id + "event_songs.json"
        let pathToListened: string = id + "listened_songs.json"

        let songs: Song[] = await readFromPath("songs.json")
        writeToPath(path, JSON.stringify(songs))
        writeToPath(pathToListened, JSON.stringify([]))

        resp.send({ id: id })
    } catch (e) {
        console.log("greska se desila ", e)
        resp.send({}) //todo wrong user id..
    }
})

//check ID
app.get("/api/checkID/:eventID", async function (req, resp) {
    try {
        let path: string = req.params.eventID + "event_songs.json"

        let songs: Song[] = await readFromPath(path)
        if (songs != null) {
            resp.send(true)
        } else {
            resp.send(false)
        }
    } catch (e) {
        console.log("greska se desila ", e)
        resp.send(false) //todo wrong user id..
    }
})
//add song
app.post("/api/songs", async function (req, resp) {
    let path: string = "songs.json"
    try {
        let songs: Song[] = await readFromPath(path)
        let index: number = songs[songs.length - 1].id + 1

        console.log("body: ", req.body)
        let newSong: Song = {
            id: index,
            name: req.body.name
        }

        songs.push(newSong)

        writeToPath(path, JSON.stringify(songs))

        resp.send({})
    } catch (e) {
        console.log("greska se dogodila")
        resp.send({}) //todo wrong user id..
    }
})
//similarity
app.post("/api/songs/sim", async function (req, resp) {
    let path: string = "songs.json"
    try {
        let songs: Song[] = await readFromPath(path)

        console.log("body: ", req.body)

        let matchs: string[] = []
        for (let i = 0; i < songs.length; i++) {
            let similarity = stringSimilarity(songs[i].name, req.body.name)
            if (similarity >= 0.3) {
                matchs.push(songs[i].name)
            }
        }
        resp.send(matchs)
    } catch (e) {
        console.log("greska se dogodila")
        resp.send({}) //todo wrong user id..
    }
})

//get event songs
app.get("/api/event/songs/:eventID", async function (req, resp) {
    let path = req.params.eventID + "event_songs.json"
    try {
        let songs: Song[] = await readFromPath(path)
        resp.send(songs)
    } catch (e) {
        console.log("kurcina")
        resp.send({}) //todo wrong user id..
    }
})
//get listened songs
app.get("/api/event/listened/:eventID", async function (req, resp) {
    let path = req.params.eventID + "listened_songs.json"
    try {
        let songs: Song[] = await readFromPath(path)
        resp.send(songs)
    } catch (e) {
        console.log("kurcina")
        resp.send({}) //todo wrong user id..
    }
})

//order song
app.get("/api/event/songs/:eventID/:songID", async function (req, resp) {
    let pathToSongs = req.params.eventID + "event_songs.json"
    let pathToListened = req.params.eventID + "listened_songs.json"
    try {
        let songs: Song[] = await readFromPath(pathToSongs)
        let newSongs: Song[] = []
        let n = 0
        let listened: Song[] = await readFromPath(pathToListened)
        let song: Song = { id: -1, name: "cukam" }
        for (let i = 0; i < songs.length; i++) {
            if (songs[i].id == parseInt(req.params.songID)) {
                song = songs[i]
                continue
            }
            newSongs[n++] = songs[i]
        }
        writeToPath(pathToSongs, JSON.stringify(newSongs))

        if (song.id == -1) {
            resp.send({ error: "song not found:" + req.params.songID }) //nesto debelo zasrano
        } else {
            listened.push(song)
            writeToPath(pathToListened, JSON.stringify(listened))

            io.emit('last ordered', song.name);
            resp.send({})
        }

    } catch (e) {
        console.log("kurcina", e)
        resp.send({}) //todo wrong user id..
    }
})

//last ordered
app.get("/api/event/last/:eventID", async function (req, resp) {
    let path = req.params.eventID + "listened_songs.json"
    try {
        let songs: Song[] = await readFromPath(path)
        if (songs.length >= 1) {
            let song: Song = songs[songs.length - 1]

            resp.send(song)
        } else {
            resp.send({ name: "" })
        }

    } catch (e) {
        console.log("kurcina")
        resp.send({}) //todo wrong user id..
    }
})

//server
const PORT = 5000

server
    .listen(PORT, function () {
        console.log(`Server is running on port ${PORT}.`);
    })
    .on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
            console.log("Error: address already in use");
        } else {
            console.log(err);
        }
    });

//read & write to files
async function readFromPath(path: string): Promise<Song[]> {
    const content = await readFile(path, "utf-8")

    //do something with content...

    //to parse json use
    //Converts a JavaScript Object Notation (JSON) string into an object.
    let songs = JSON.parse(content) as Song[]
    return songs
}

async function writeToPath(path: string, content: string) {
    await writeFile(path, content, "utf-8")
}

async function uredi() {
    let songs: Song[] = await readFromPath("songs.json")
    let newSongs: Song[] = []
    let n = 0

    for (let i = 0; i < songs.length; i++) {
        let song: Song = songs[i]
        song.id = i
        newSongs[n++] = song
    }
    writeToPath("songs.json", JSON.stringify(newSongs))
}

io.on('connection', function (socket) {

    socket.on('last ordered', async function (msg: any) {
        let path = msg + "listened_songs.json"

        let songs: Song[] = await readFromPath(path)
        if (songs.length >= 1) {
            let song: Song = songs[songs.length - 1]

            io.emit('last ordered', song.name);
        } else {
            io.emit('last ordered', "");
        }

    });
});