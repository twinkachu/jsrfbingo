hi so like life happened and im going to have to relinquish management of this project. anyone is welcome to host you just have to setup.
this is my terrible code i wrote for a school project, (which i ended up failing anyway)



1st thing is prerequistes
i use node v18.19.1 and python 3.12.3

2nd thing is to setup the database

run node src/db/setup-db.js

3rd thing is run the python server

run python3 src/server/chat_server.py '[IP]'PORT,
an example is python3 src/server/chat_server.py '127.0.0.1' 6969,

4th is to setup your .env file
the VITE_HOST and VITE_PORT is the address of your svelte web server where you can access all the gui, make sure to set that to something you can expose publically (more on that later), and your PUBLIC_WEB_POINTER, which is where your clients connect to the python server, you will have to also expose this locally.

5th is to setup your reverse proxy / port forwarding with apache / nginx / nginx reverse proxy manager etc. (OPTIONAL) my nginx conf looks like this 
location / {
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_pass http://127.0.0.1:6969;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
}

for both my websocket server (NOTE : firefox, chrome, basically any browser built this millenia does not support ws protocol, you will have to get certs -- i use lets encrypt, would recommend -- and expose on wss, self signed run into less issues, but i do not recommend) and the svelte vite server, this works for me, adjust for your liking, collect more data if you want for your liking.

6th
run npm run dev in the root and hopefully, if all is well, everything will work.
any questions contact me on github
