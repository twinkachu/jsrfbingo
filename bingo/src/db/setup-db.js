import Database from 'better-sqlite3';

const db = new Database('mydatabase.db');

//Create the users tableerg
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        time_played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

//Create the games table
db.exec(`
    CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        duration INTEGER,
        start_time TEXT DEFAULT CURRENT_TIMESTAMP,
        init_board JSON,
        board_changes JSON
    );
`);

//Create the user_games table (for the err many-to-many relationship between users and games easy 100 marks im him)
db.exec(`
    CREATE TABLE IF NOT EXISTS user_games (
        user_id INTEGER,
        game_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id),
        PRIMARY KEY (user_id, game_id)
    );
`);

console.log('it work!');
db.close();
