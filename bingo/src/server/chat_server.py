import asyncio
import websockets
import json
from pathlib import Path
from datetime import datetime
import datetime as dt
import signal
import sys
import re
import sqlite3
import os
import copy
import time
from soulid import soulFromID
from daft import main as daftgen
from collections import defaultdict

HEX_COLOR_PATTERN = re.compile(r'^#(?:[0-9a-fA-F]{3}){1,2}$')
bingochance = [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], 
               [15, 16, 17, 18, 19], [20, 21, 22, 23, 24], [0, 5, 10, 15, 20], 
               [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], 
               [4, 9, 14, 19, 24], [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]]

colors = [{ "#D3D3D3": "#D3D3D3" },
{ "#ff4f4f" : "#DB1111" },
{ "#4fd6ff": "#195BD7" },
{"#80ff93": "#159C0E" },
{ "#ff80fd": "#FF69B4" },
{ "#a480ff": "#8013E0" }]
def committodb(init_board_db, queue, winnerUsers, duration, start_time, teams):
    try:

        for winner in winnerUsers:
            cursor.execute("UPDATE users SET wins = wins + 1 WHERE username = ?", (winner,))
   
        for player in teams:
            cursor.execute("UPDATE users SET time_played = time_played + ? WHERE username = ?", (duration, player['name']))
    
        cursor.execute(
            "INSERT INTO games (duration, start_time, init_board, board_changes) VALUES (?, ?, ?, ?)", 
            (int(duration), str(start_time), json.dumps(init_board_db), json.dumps(queue))
        )
  
        game_id = cursor.lastrowid
        
        for player in teams:
            
            if player['team'] != "#D3D3D3":
                cursor.execute("SELECT id FROM users WHERE username = ?", (player['name'],))
                user_id = cursor.fetchone() 
                if user_id != None:
               
                    cursor.execute(
                        "INSERT INTO user_games (user_id, game_id, created_at) VALUES (?, ?, datetime('now'))",
                        (user_id[0], game_id)
                    )
                else:

                    temp_password = player['name'] 


                    temp_password = "temp_password" 
                    temp_email = player['name'] + "@noemail.com" 

              
                    cursor.execute(
                        "INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, datetime('now'))",
                        (player['name'], temp_password, temp_email)
                    )
                    new_user_id = cursor.lastrowid

                    cursor.execute(
                        "INSERT INTO user_games (user_id, game_id, created_at) VALUES (?, ?, datetime('now'))",
                        (new_user_id, game_id)
                    )

        connection.commit()
    except Exception as e:
        print(f"Error updating database: {e}")
    

    return

class IRCChatServer:
    def __init__(self, host='0.0.0.0', port=12001):
        self.clients = {}
        self.host = host
        self.port = port
        self.messages_file = Path('messages.json')
        self.load_messages()
        self.board_file = Path("board.json")
        self.load_board()
        self.teams = []
        self.game_active = False
        self.start_time = None
        self.automark_names = []
        self.queue = []
        self.lastsnipe = None

    def has_won(self, board, teams):
        #calculate points per team
        team_points = {}
        for square in board:
            color = square['color']
            if color != "#101010":  #ignore empty squares
                team_points[color] = team_points.get(color, 0) + 1

        if not team_points:
            return None  #no winner if no points

        #determine the team with the most points
        winner = max(team_points, key=team_points.get)
        winnerUsers = []
        for player in teams:
            if player['team'] == winner:
                winnerUsers.append(player['name'])
        

        self.game_active = False
        duration = (time.time_ns() - self.start_time) /1000
        if duration > 60000:
            committodb(self.init_board[:], self.queue[:], winnerUsers, duration, self.start_time, self.teams)
        
        return winner


    def load_messages(self):
        
        if self.messages_file.exists():
            with open(self.messages_file, 'r') as f:
                try:
                    self.messages = json.load(f)
                except json.JSONDecodeError:
                    self.messages = []
        else:
            self.messages = []

    def load_board(self):
    #load board data from board.json file.
        if self.board_file.exists():
            with open(self.board_file, 'r') as f:
                try:
                    self.board = json.load(f)
                    # ensure that each board item has a 'color' field
                    for item in self.board:
                        if 'color' not in item:
                            item['color'] = "#101010"  # default color
                    self.init_board = copy.deepcopy(self.board)  # make a deep copy
                
                except json.JSONDecodeError:
                    print("Invalid JSON in board.json. Initializing default board.")
                    self.initialize_default_board()
        else:
            print("board.json file not found. Initializing default board.")
            self.initialize_default_board()


    def initialize_default_board(self):
        
        default_names = [f"Tile-{i+1}" for i in range(25)]
        self.board = [{"name": name, "color": "#101010"} for name in default_names]
        self.save_board()
        self.init_board = self.board

    def save_messages(self):
        
        with open(self.messages_file, 'w') as f:
            json.dump(self.messages, f, indent=4)

    def save_board(self):
        with open(self.board_file, 'w') as f:
            json.dump(self.board, f, indent=4)

    async def send_teams(self, websocket):
        if self.teams:
            await websocket.send(json.dumps({"type": "user_list", "data": self.teams}))

    async def register(self, websocket, username):
        self.clients[websocket] = username
        await self.send_previous_messages(websocket)
        await self.send_board(websocket)
        await self.send_teams(websocket)
        await self.send_time(websocket)
        print(f"New client connected: {websocket.remote_address} as {username}")

    async def unregister(self, websocket):

        username_data = self.clients.pop(websocket, "Unknown")
        
        #check if username_data is actually JSON and extract the username
        try:
            username = json.loads(username_data).get("username", "Unknown")
        except json.JSONDecodeError:
            username = username_data  # If it's not JSON, use it as is
        
        #filter out the player by username
        self.teams = [player for player in self.teams if player.get('name') != username]

        if username == "automarker":
            self.automark_names = []
            await self.set_automark(self.automark_names)
        
        if self.teams == []:
            self.game_active = False
        
        await self.broadcast(json.dumps({"type": "user_list", "data": self.teams}))
        print(f"Client disconnected: {websocket.remote_address} ({username})")

        await websocket.close()

    async def send_previous_messages(self, websocket):
        
        if self.messages:
            await websocket.send(json.dumps({"type": "history", "data": self.messages}))

    async def send_time(self, websocket):
        try :   
            if self.game_active:
                await websocket.send(json.dumps({"type" : "game_start", "data" : { "result": "true", "timestamp": str(self.start_time)} }))
        except Exception as e:
            print(f"Error sending time {e}")
    async def send_board(self, websocket):
        
        if self.board:
            await websocket.send(json.dumps({"type": "board", "data": self.board}))

    async def broadcast(self, message):
        
        if self.clients:
            tasks = [asyncio.create_task(client.send(message)) for client in self.clients]
            await asyncio.gather(*tasks)

    async def broadcast_board(self, new):
        
        if self.clients:
            if new:
                board_message = json.dumps({"type": "new_board", "data": self.board})
                
            else:
                board_message = json.dumps({"type": "board", "data": self.board})
            tasks = [asyncio.create_task(client.send(board_message)) for client in self.clients]
            await asyncio.gather(*tasks)


    async def detect_snipes(self):
        seen = {}
        msgs = []
        for entry in self.queue:
            idx = entry['index']
            user = entry['user']
            time = entry['time']
            
            if idx in seen:
                previous = seen[idx]
                target = f"{previous['user']} "
                time_diff = (time - previous['time']) / 1000
                message = json.dumps({"sniper" : target, "sniped" : user, "goal" : self.board[idx].get('name'), "time" :  time_diff})
                msgs.append((message))
            seen[idx] = entry
        
        if len(msgs) > 0:
            self.lastsnipe = msgs[-1]
        return msgs


    async def handle_message(self, message):
        
        try:
            #get username and message content
            username = message["username"]
            content = message["content"]
            color = next((k for d in colors for k, v in d.items() if v == message.get("selectedColor")), "#ffffff")
            if content == "gg":
                result = self.has_won(self.board, self.teams)
                self.game_active = False  #game is over
                await self.broadcast(json.dumps({
                    "type": "result",
                    "data": {"winner" : result, "time" : time.time_ns()}
                }))
            elif content == "start":
                await self.check_game_start()
            elif content == "snipes":
                return
            elif content == "autokick":
                await self.kick({"kicker" : username, "user" : "automarker"})
                return


            
            #prepare to export message content
            message_data = {}
            message_data["content"] = content
            message_data["username"] = username
            message_data["color"] = color
            message_data["timestamp"] = str(dt.datetime.now(dt.UTC))
            if self.game_active:
                message_data["in_game_time"] = (time.time_ns() - self.start_time) // 1000000000
            else:
                message_data["in_game_time"] = None
            #save formatted data
            self.messages.append(message_data)
            self.save_messages()
            #broadcast to everyone
            await self.broadcast(json.dumps({"type": "message", "data": message_data}))
        except json.JSONDecodeError:
            print("Received an invalid JSON message.")
        except Exception as e:
            print(f"Error handling message: {e}")


    async def handle_board_update(self, websocket, update_data, automark):
        
        try:
            index = update_data['data'].get("index")
            new_color = update_data['data'].get("color")
            user = update_data['data'].get("user")
            time = update_data['data'].get("timern")
            print(index, user, time, new_color)
            if index is None or new_color is None:
                print("Invalid board update data received.")
                return
            if not HEX_COLOR_PATTERN.match(new_color):
                print(f"Invalid color code received: {new_color}")
                return
            if not (0 <= index < len(self.board)):
                print(f"Board index {index} out of range.")
                return

            self.queue.append({
                "index": index,
                "new_color": new_color,
                "user": user,
                "time": time
            })

            self.queue = sorted(self.queue, key=lambda x: x.get("time"), reverse=False)
            updated_board = copy.deepcopy(self.init_board)

            marked = False
            for change in self.queue:
                index = change['index']
                new_color = change['new_color']
                if 0 <= index < len(updated_board):
                    if updated_board[index]['color'] == new_color:
                        if not automark:
                            updated_board[index]['color'] = "#101010"
                            marked = False
                    elif updated_board[index]['color'] == "#101010":
                        updated_board[index]['color'] = new_color
                        marked = True
                    else:
                        temp = self.lastsnipe
                        await self.detect_snipes()
                        if temp != self.lastsnipe:
                            print(type(temp))
                            await self.broadcast(json.dumps({"type" : "notification", "data" : {"type" : "snipe", "data" : json.loads(self.lastsnipe)}}))

            if self.board != updated_board: #basically if the board ACTUALLY changes, then this hting announces if it gets marked
                action = "marked " if marked else "unmarked "
                auto_text = " [AUTOMARK]" if automark else ""
                update_log = f"{auto_text} {user} {action}{self.board[index]['name']}"

                await self.handle_message({
                    'content': update_log,
                    'username': user,
                    'selectedColor' : new_color
                }
            )

            self.board = updated_board
            self.save_board()
            await self.broadcast_board(False)
            
        except Exception as e:
            print(f"Error handling board update: {e}")



    async def handle_new_board(self, new_board_data):
        try:
            self.board = new_board_data
            self.init_board = new_board_data
            self.queue.clear()
            for item in self.board:
                if not item.get('name'):
                    item['name'] = f"Tile-{self.board.index(item) + 1}"
                if 'color' not in item:
                    item['color'] = "#101010"  
            self.save_board()
            await self.broadcast_board(True)
            print("New board created and broadcasted.")
            await self.broadcast(json.dumps({
                "type": "user_list",
                "data": self.teams
                }))
        except Exception as e:
            print(f"Error creating new board: {e}")
    
    async def team_handler(self, websocket, data):
        
        name = data.get("user")
        new_team = data.get("color")

        if not name or not new_team:
            await websocket.send("Invalid data format")
            return

    
        if new_team == "spectator":
    
            self.teams = [player for player in self.teams if player['name'] != name]
        else:
          
            existing_player = next((player for player in self.teams if player['name'] == name), None)

            if existing_player:
                
                existing_player['team'] = new_team
            else:
     
                self.teams.append({"name": name, "team": new_team, "automark": False})
        
        #set automark also broadcasts teams
        await self.set_automark(self.automark_names)

    async def set_automark(self, names):
        
        for player in self.teams:
            if player['name'] in names:
                player['automark'] = True
            else:
                player['automark'] = False
        await self.broadcast(json.dumps({
            "type": "user_list",
            "data": self.teams  
        }))


    async def countdown(self):
        
        for count in ["3", "2", "1", "GO!"]:
            await self.handle_message({"content": count, "username": "SERVER"})
            await asyncio.sleep(1)
    
    async def minutetimer(self):
        await asyncio.sleep(57)
        await self.countdown()

    async def check_game_start(self):
        if self.game_active:
            return  
        
        
        await self.countdown()
        
        
        await self.broadcast(json.dumps({
            "type": "game_start", 
            "data": { 
                "result": "true", 
                "timestamp": time.time_ns() 
            }
        }))


        self.game_active = True
        self.start_time = time.time_ns()

        print("Game started!")
    


    async def automark_handler(self, data):
        #expected data structure player : string, unlock : string time:string
        data = data["data"]
        playername = data['playerName']
        unlock = soulFromID(data)
        time = data["time"]
        
        print(playername, unlock, time)
        player_team = None
        for player in self.teams:
            if player["name"] == playername:
                player_team = player["team"]
                break
        
        index = -1

        for i, entry in enumerate(self.board):
            if entry["name"] == unlock:
                index = i

        if index != -1 and player_team != None:
            message = {'data' : {'user' : playername, 'index' : index, 'color' : player_team, 'timern' : time}}
            await self.handle_board_update(self, message, True)
        return
    
    async def daft_board(self):
        board = daftgen()
        await self.handle_new_board(board)

    async def kick(self, data):
        kicklog = kicklog = f"{data['kicker']} kicked {data['user']} PUMA"
        for client in self.clients.items():
            websocket, userdata = client
            if json.loads(userdata)['username'] == data['user']:
                kickmsg = {'type' : "kick", 'data' : {"user" : data['kicker']}}
                await websocket.send(json.dumps(kickmsg))
                await self.handle_message({"username": "SERVER", "content": kicklog})
                return

    async def infohandler(self, websocket, data):
        senddata = ""
        match data.get("type"):
            case "Snipes":
                snips = await self.detect_snipes()
                senddata = json.dumps({"type" : "Snipes", "data" : snips}) #json.dumps(self.detect_snipes())
            case "Queue":
                senddata = json.dumps({"type" : "Queue", "data" : self.queue})
            case "Teams":
                senddata = json.dumps({"type" : "Teams", "data" : self.teams})
            case "Automark Names":
                senddata = json.dumps({"type" : "Automark Names", "data" : self.automark_names})
            case "Start Time":
                senddata = json.dumps({"type" : "Start Time", "data" : self.start_time})
            case "Game Active":
                senddata = json.dumps({"type" : "Game Active", "data" : self.game_active})
            case _:
                senddata = json.dumps({"type" : "unknown", "data" : "Unknown Message Type"})
        await websocket.send(json.dumps({"type" : "info", "data" : senddata}))
        return

    async def main_handler(self, websocket, path):
        
        username = None
        try:
            async for message in websocket:
                if username is None:
                    #first message should be the username
                    username = message
                    await self.register(websocket, username)
                else:
                    data = json.loads(message)
                    datatype = data.get("type") or "message"
                    match datatype:
                        case "message":
                            await self.handle_message(data["data"])
                        case "board_update":
                            await self.handle_board_update(websocket, data, False)
                        case "new_board":
                            await self.handle_new_board(data['data'])
                            self.game_active = False
                        case "team_update":
                            await self.team_handler(websocket, data['data'])
                        case "startreq":
                            await self.check_game_start()
                        case "automark":
                            await self.automark_handler(data)
                        case "set_automark":
                            self.automark_names = data['data']['names']
                            await self.set_automark(self.automark_names)
                        case "daft_board":
                            await self.daft_board()
                        case "kick":
                            await self.kick(data['data'])
                        case "info":
                            await self.infohandler(websocket, data['data'])
                        case _:
                            print(f"Unknown message type: {datatype}")
        except websockets.exceptions.ConnectionClosed:
            print(f"Connection closed: {username}")
        except Exception as e:
            print(f"Error in connection: {e}")
        finally:
            await self.unregister(websocket)

    async def start(self):
        
        async with websockets.serve(self.main_handler, self.host, self.port):
            print(f"Server started on ws://{self.host}:{self.port}")
            await asyncio.Future()  
def signal_handler(signal, frame):
    print("Stopping the server...")
    asyncio.get_event_loop().stop()
    sys.exit(0)

if __name__ == "__main__":
    connection = sqlite3.connect(os.path.abspath(os.path.join(os.path.dirname(__file__), "../db/mydatabase.db")))
    cursor = connection.cursor() #3
    signal.signal(signal.SIGINT, signal_handler)
    if len(sys.argv) > 2:
        ip = sys.argv[1]
        port = sys.argv[2]
        server = IRCChatServer(ip, port)
        asyncio.run(server.start())
    else:
        server = IRCChatServer()