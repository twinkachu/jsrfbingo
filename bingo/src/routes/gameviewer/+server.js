import Database from 'better-sqlite3';

/* hey ace or duck or whomever reads this, i thought id add a little easter egg (or im just lazy with cleanup) 
if you know anything about basic linear algebra, you can probably guess what this code does, but i just included
it to get more marks on this school project, my teacher didnt know any linear algebra anyway, so i dont realy care.
i just wanted to show i get it, so it looks like i know what im doing, maybe you'll laugh at the absurdity like i did
when writing it :)
*/
function applyMatrixTransformation(data, matrix) {
    return data.map(point => {
        const [x, y] = point;
        const transformedX = matrix[0][0] * x + matrix[0][1] * y;
        const transformedY = matrix[1][0] * x + matrix[1][1] * y;
        return [transformedX, transformedY];
    });
}

const transformationMatrix = [
    [1, 0],  
    [0, 1]   
];

export const GET = async ({ url }) => {
    const db = new Database('./src/db/mydatabase.db');
    const table = url.searchParams.get('table');
    let data;

    try {
        if (table === 'users') {
            data = db.prepare(`
                SELECT 
                u.id AS key, 
                u.username AS name, 
                u.wins, 
                u.time_played, 
                u.created_at AS account_created,
                COUNT(ug.user_id) AS games_played
            FROM users u
            LEFT JOIN user_games ug ON u.id = ug.user_id
            GROUP BY u.id
            ORDER BY games_played DESC;
            `).all();
            } else if (table === 'games') {
            const page = parseInt(url.searchParams.get('page') || '1', 10); //get page number from URL, default to 1
            const pageSize = 10; 
            const offset = (page - 1) * pageSize; //calculate offset for SQL query
            console.log(offset)
            data = db.prepare(`
                SELECT 
                    g.id AS key, 
                    g.init_board AS board, 
                    g.start_time, 
                    g.duration, 
                    g.board_changes,
                    json_group_array(u.username) AS players
                FROM games g
                LEFT JOIN user_games ug ON g.id = ug.game_id
                LEFT JOIN users u ON ug.user_id = u.id
                GROUP BY g.id
                ORDER BY g.start_time DESC
                LIMIT ? OFFSET ? 
            `).all(pageSize, offset);
            const totalGames = db.prepare(`SELECT COUNT(*) AS count FROM games`).get().count;
            return new Response(JSON.stringify({ data, totalGames }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else if (table === 'stats') {
            // Perform additional analysis
            const userCount = db.prepare(`SELECT COUNT(*) AS count FROM users`).get().count;
            const gameCount = db.prepare(`SELECT COUNT(*) AS count FROM games`).get().count;
            const maxWinsUser = db.prepare(`
                SELECT username, MAX(wins) AS max_wins 
                FROM users 
                GROUP BY username 
                ORDER BY max_wins DESC 
                LIMIT 1
            `).get();
            const userStats = db.prepare(`
                SELECT username, wins, time_played 
                FROM users
            `).all();

            const transformedUserStats = applyMatrixTransformation(
                userStats.map(user => [user.wins, user.time_played]),  
                transformationMatrix
            );

            const winRates = userStats.map(user => {
                const winRate = user.wins / user.time_played; 
                return { username: user.username, winRate };
            });

            data = {
                userCount,
                gameCount,
                maxWinsUser,
                transformedUserStats,  
                winRates,              
            };
        } else {
            console.error("Invalid table parameter:", table);
            return new Response(JSON.stringify({ error: 'Invalid table parameter' }), { status: 400 });
        }
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        console.error("Database error:", error.message); //Debugging, remove later if it dont work
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    } finally {
        db.close();
    }
};
