#!/bin/bash

cd ~
cd minotaur-inventory-manager
git pull
npm install
npm run build
pm2 restart minotaur || pm2 start npm --name minotaur -- start
pm2 save