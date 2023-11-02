import express, { Application } from "express";
import cors from "cors"
import { readFile, writeFile } from "fs/promises"
import { stringSimilarity } from "string-similarity-js";
import http from "http"
import { Server } from "socket.io"
import { verbose } from "sqlite3"
import { promisify } from "util"

const sql = verbose()
const app: Application = express();
const server = http.createServer(app)
const io = new Server(server)

app.use(cors())
app.use(express.static("../pijanka-app/")) //GITHUB PAGES
app.use(express.json())

type Song = {
    id: number
    name: string
}

//conect to database
let db = new sql.Database('./pijanka.db', function (error) {
    if (error) {
        return console.log(error.message)
    }
    console.log('Connected to the songs.db SQlite database.');
})

// Use the promise pattern for SQLite so we don't end up in callback hell.
const asyncGet = promisify(db.get).bind(db);
const asyncAll = promisify(db.all).bind(db);
const asyncRun = promisify(db.run).bind(db);

// db.on("trace", (sql) => {
//     console.log("Statment:",)
// })

function createDBtable() {
    //create new table
    let instruction = "CREATE TABLE songs(id INTEGER PRIMARY KEY AUTOINCREMENT,UNIQUE(name))"
    db.run(instruction)
}

async function copyToDatabase() {

    let instruction = "INSERT into songs(name) VALUES(?)"
    let songs: Song[] = await readFromPath("songs.json")

    for (let i = 0; i < songs.length; i++) {
        let name = songs[i].name
        db.run(instruction, [name], function (err) {
            if (err) {
                return console.log(err.message)
            }
            console.log("upis")
        })
    }
}

function deleteTable() {
    let instDlt = "DELETE FROM event"
    db.run(instDlt, [])
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
app.get("/api/songs", async function (req, resp) {
    try {
        let instruction = "SELECT * FROM songs"
        let songs: Song[] = []

        db.all(instruction, [], function (err, rows) {
            if (err != null) {
                return console.log(err.message)
            }
            let i = 0
            rows.forEach(r => {
                songs[i++] = r as Song
                resp.send(songs)
            })
        })
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

        let date: string = "" + day + "." + month + "." + year + "."

        let eventIns = "INSERT into event(date) VALUES(?)"
        db.run(eventIns, [date], function (err) {
            if (err) {
                return console.log(err.message)
            }
            console.log("upis")
        })

        let eventId: number = await getID(date)
        //let eventId = 1

        let citaj = "SELECT * FROM songs"
        db.all(citaj, [], function (err, rows) {
            if (err) {
                return console.log(err.message)
            }
            rows.forEach(function (row: any) {
                let pisi = "INSERT into remaining(song_id,event_id) VALUES(?,?)"
                db.run(pisi, [row.id, eventId])
            })
            resp.send({ id: eventId })
        })

    } catch (e) {
        console.log("greska se desila ", e)
        resp.send({}) //todo wrong user id..
    }
})

async function getID(date: string) {
    const res: any = await asyncGet(`SELECT id from event WHERE date="${date}"`);
    return res.id
}

//check ID
app.get("/api/checkID/:eventID", async function (req, resp) {
    try {
        let id = parseInt(req.params.eventID)

        let eventGet = "SELECT date from event WHERE id=?"
        db.get(eventGet, [id], function (err: any, row: any) {
            if (err != null) {
                return console.log(err.message)
            }
            if (row != null) {
                resp.send(true)
            } else {
                resp.send(false)
            }
        })

    } catch (e) {
        console.log("greska se desila ", e)
        resp.send(false) //todo wrong user id..
    }
})
//add song
app.post("/api/songs", async function (req, resp) {
    try {

        let insertIns = "INSERT into songs(name) VALUES(?)"

        db.run(insertIns, [req.body.name], function (err) {
            if (err) {
                resp.send("Doslo je do greske")
                return console.log(err.message)
            }
            console.log("upis")
            resp.send({})
        })

    } catch (e) {
        console.log("greska se dogodila")
        resp.send({}) //todo wrong user id..
    }
})
//similarity
app.post("/api/songs/sim", async function (req, resp) {
    try {

        let instruction = "SELECT * FROM songs"
        let songs: Song[] = []

        db.all(instruction, [], function (err, rows) {
            if (err != null) {
                return console.log(err.message)
            }
            let i = 0
            rows.forEach(r => {
                songs[i++] = r as Song
            })
            let matchs: string[] = []
            for (let i = 0; i < songs.length; i++) {
                let similarity = stringSimilarity(songs[i].name, req.body.name)
                if (similarity >= 0.3) {
                    matchs.push(songs[i].name)
                }
            }
            resp.send(matchs)
        })
    } catch (e) {
        console.log("greska se dogodila", e)
        resp.send({}) //todo wrong user id..
    }
})

//get event songs
app.get("/api/event/songs/:eventID", async function (req, resp) {
    let remSongs = `SELECT songs.* FROM remaining 
                        INNER JOIN songs ON remaining.song_id == songs.id 
                    WHERE event_id=${req.params.eventID}`

    let songs = await asyncAll(remSongs)

    resp.send(songs)
})
//get listened songs
app.get("/api/event/listened/:eventID", async function (req, resp) {
    let songsID = await asyncAll(`SELECT song_id FROM listened WHERE event_id=${req.params.eventID}`) as { song_id: number }[]

    let songs: { name: string }[] = []
    for (let i = 0; i < songsID.length; i++) {
        songs[i] = await asyncGet(`SELECT name FROM songs WHERE id=${songsID[i].song_id}`) as { name: string }
    }
    resp.send(songs)
})

//order song
app.get("/api/event/songs/:eventID/:songID", async function (req, resp) {
    try {

        let song = await asyncGet(`SELECT * FROM songs WHERE id=${req.params.songID}`) as Song

        let eventID = parseInt(req.params.eventID)

        await asyncRun(`DELETE from remaining WHERE song_id=${req.params.songID} AND event_id=${req.params.eventID}`)

        db.run("INSERT into listened(song_id,event_id) VALUES(?,?)", [song.id, eventID], function (err) {
            if (err) {
                return console.log(err.message)
            }
            console.log("upis")
        })

        io.emit('last ordered', song.name);
        resp.send({})

    } catch (e) {
        console.log("kurcina", e)
        resp.send({}) //todo wrong user id..
    }
})
async function getLastOrderedId() {
    let cukam = await asyncGet(`SELECT MAX(id) as maxID FROM listened`) as { maxID: number }
    return cukam.maxID
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
        let id: number = await getLastOrderedId()
        if (id >= 1) {

            let get = await asyncGet(`SELECT song_id from listened WHERE id=${id}`) as { song_id: number }
            let songID = get.song_id

            let name = await asyncGet(`SELECT name from songs WHERE id=${songID}`) as { name: string }
            let song = name.name

            io.emit("last ordered", song)
        } else {
            io.emit("last ordered", "")
        }
    });
});

// db.get("SELECT MAX(id) as maxID FROM listened", [], function (e, r: { maxID: number }) {
//     console.log(r)
//     let id = r.maxID
// })


