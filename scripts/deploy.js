'use strict';

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { REST } from '@discordjs/rest';
import { fileURLToPath } from 'node:url';
import { Routes } from 'discord-api-types/v10';

const commands = [];
const commandsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = (await import(filePath)).default;
	commands.push({ cmd: command.data.toJSON(), type: command.type || null });
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, process.env.DISCORD_SERVER_ID), { body: commands.map(c => c.cmd) })
	.then(() => console.log('Successfully deployed commands!'))
	.catch(console.error);

const globalCommands = commands.filter(command => command.type && command.type === 'global');

rest.put(Routes.applicationCommands(process.env.DISCORD_APP_ID), { body: globalCommands.map(c => c.cmd) })
	.then(() => console.log('Successfully deployed global commands!'))
	.catch(console.error);