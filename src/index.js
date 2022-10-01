'use strict';

import 'dotenv/config';
import { diffLines } from 'diff';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocket } from 'ws';
import { fileURLToPath } from 'node:url';
import { Client as DiscordClient, GatewayIntentBits, Partials, Collection, ChannelType, InteractionType } from 'discord.js';

import { UserBuilder } from './utils/embeds/User.js';
import { RpBuilder } from './utils/embeds/Rp.js';
import { DiffBuilder } from './utils/embeds/Diff.js';
import { MemberBuilder } from './utils/embeds/Member.js';

const Socket = new WebSocket(`wss://${process.env.API_HOSTNAME}${process.env.API_SOCKET_PATH}?access_token=${process.env.API_TOKEN}`);
const Client = new DiscordClient({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent], partials: [Partials.Channel] });

Client.commands = new Collection();
const commandsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = (await import(filePath)).default;
	Client.commands.set(command.data.name, command);
}

Client.once('ready', client => {
	console.log(`Logged in as ${client.user.tag}!`);
});

Client.on('messageUpdate', (oldMessage, newMessage) => {
	if (oldMessage.author.bot) return;
	if (oldMessage.content === newMessage.content) return;
	if (oldMessage.channel.type === 'DM') return;
	if (oldMessage.guild.id !== process.env.DISCORD_SERVER_ID) return;

	const diff = diffLines(oldMessage.content, newMessage.content, {
		newlineIsToken: true,
	});

	let diffContent = [
		'\`\`\`diff',
		...diff.map(part =>
			part.value.split('\n').map(line =>
				`${part.added ? '+' : part.removed ? '-' : '|'} ${line}`
			).join('\n')
		),
		'\`\`\`'
	].join('\n');

	Client.channels.fetch(process.env.DISCORD_LOG_MESSAGE).then(channel => {
		channel.send({
			embeds: [
				DiffBuilder(diffContent, oldMessage, newMessage),
			]
		});
	});
})

Client.on('messageDelete', message => {
	if (message.author.bot) return;
	if (message.channel.type === ChannelType.DM) return;
	if (message.guild.id !== process.env.DISCORD_SERVER_ID) return;

	let content = '\`\`\`diff';
	message.content.split('\n').forEach(line => {
		content += `\n- ${line}`;
	})
	content += '\n\`\`\`';

	Client.channels.fetch(process.env.DISCORD_LOG_MESSAGE).then(channel => {
		channel.send({
			embeds: [
				DiffBuilder(content, message, null, new Date()),
			]
		});
	});
})

Client.on('guildMemberAdd', member => {
	if (member.guild.id !== process.env.DISCORD_SERVER_ID) return;

	Client.channels.fetch(process.env.DISCORD_LOG_TRAFIC).then(channel => {
		channel.send({
			embeds: [
				MemberBuilder(member, true, false),
			]
		});
	});
})

Client.on('guildMemberRemove', member => {
	if (member.guild.id !== process.env.DISCORD_SERVER_ID) return;

	Client.channels.fetch(process.env.DISCORD_LOG_TRAFIC).then(channel => {
		channel.send({
			embeds: [
				MemberBuilder(member, false, true),
			]
		});
	});
})

Socket.on('open', () => {
	console.log('Connected to API Gateway');

	Socket.send(JSON.stringify({
		type: 'subscribe',
		collection: 'directus_users',
	}))
	console.log('Subscribed to directus_users');

	Socket.send(JSON.stringify({
		type: 'subscribe',
		collection: 'roleplay',
	}))
	console.log('Subscribed to roleplay');

	setInterval(() => {
		console.log('Sending heartbeat to API Gateway');
		Socket.ping();
	}, 60000);
});

Client.on('interactionCreate', async interaction => {
	switch (true) {
		case interaction.type === InteractionType.ApplicationCommand:
			console.log(`Received command: ${interaction.commandName}`);
			const command = Client.commands.get(interaction.commandName);
			if (!command) return;

			try {
				await command.execute(interaction, { Client, Socket });
			} catch (error) {
				console.error(error);
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
			break;
		default:
			console.log(`Received interaction: ${Object.entries(InteractionType).find(([key, value]) => value === interaction.type)[0]}`);
			break;
	}
});

Client.login(process.env.DISCORD_TOKEN);

const subStatus = (userID, status) => {
	try {
		Client.guilds.fetch(process.env.DISCORD_SERVER_ID).then(async guild => {
			const role = await guild.roles.fetch(process.env.DISCORD_SUBSCRIBER_ROLE);
			const member = await guild.members.fetch(userID);

			if (!role || !member) return;

			status ?
				member.roles.add(role)
				:
				member.roles.remove(role)

		})
	} catch (error) {
		console.error(error);
	}
}

Socket.on('message', (data) => {
	const message = JSON.parse(data);
	switch (message.type) {
		case 'SUBSCRIPTION':
			console.log(`Received subscription for ${message.collection}`);
			switch (message.collection) {
				case 'directus_users':
					switch (message.action) {
						case 'create':
							Client.channels.fetch(process.env.DISCORD_LOG_TRAFIC).then(channel => {
								channel.send({
									embeds: [UserBuilder(message.payload, true)],
									content: `> Le compte **${message.payload?.username || message.payload.email}** a été créé sur la base de données.`,
								});
							});
							break
						case 'update':
							if (typeof message.payload.subscribed !== 'undefined') {
								Socket.send(JSON.stringify({
									type: 'get',
									collection: 'directus_users',
									query: {
										filter: {
											id: {
												_eq: message.keys[0]
											}
										},
										fields: ['id', 'discord'],
										limit: 1
									}
								}));

								Socket.addEventListener('message', (e) => {
									const data = JSON.parse(e.data);
									if (data.type !== 'ERROR') {
										if (data.data.length === 0 || !data.data[0].discord) {
											return;
										} else {
											const user = data.data[0];

											Socket.send(JSON.stringify({
												type: 'get',
												collection: 'discord_user',
												query: {
													filter: {
														id: {
															_eq: user.discord
														}
													},
													fields: ['id', 'discord_id'],
													limit: 1
												}
											}));

											Socket.addEventListener('message', (e) => {
												const data = JSON.parse(e.data);
												if (data.type !== 'ERROR') {
													if (data.data.length === 0 || !data.data[0].discord_id) {
														return;
													} else {
														const discord_user = data.data[0];

														subStatus(discord_user.discord_id, message.payload.subscribed);
													}
												} else {
													return;
												}
											}, { once: true });
										}
									} else {
										return;
									}
								}, { once: true });
							} else if (typeof message.payload.discord !== 'undefined' && message.payload.discord !== null) {
								Socket.send(JSON.stringify({
									type: 'get',
									collection: 'discord_user',
									query: {
										filter: {
											id: {
												_eq: message.payload.discord
											}
										},
										fields: ['id', 'discord_id'],
										limit: 1
									}
								}));

								Socket.addEventListener('message', (e) => {
									const data = JSON.parse(e.data);
									if (data.type !== 'ERROR') {
										if (data.data.length === 0 || !data.data[0].discord_id) {
											return;
										} else {
											const discord_user = data.data[0];

											Socket.send(JSON.stringify({
												type: 'get',
												collection: 'directus_users',
												query: {
													filter: {
														id: {
															_eq: message.keys[0]
														}
													},
													fields: ['id', 'subscribed'],
													limit: 1
												}
											}));

											Socket.addEventListener('message', (e) => {
												const data = JSON.parse(e.data);
												if (data.type !== 'ERROR') {
													if (data.data.length === 0 || !data.data[0].subscribed) {
														return;
													} else {
														subStatus(discord_user.discord_id, true);
													}
												} else {
													return;
												}
											}, { once: true });
										}
									} else {
										return;
									}
								}, { once: true });
							}
							break;
						case 'roleplay':
							if (message.action !== 'create') return;
							Client.channels.fetch(process.env.DISCORD_LOG_STAFF).then(channel => {
								channel.send({
									embeds: [RpBuilder(message.payload, true)],
									content: `> Nouvelle demande de Roleplay: **${message.payload?.name}**`,
								});
							});
							break;
					}
					break;
			}
	}
});

Socket.on('close', () => {
	console.log('disconnected');
});

Socket.on('error', (error) => {
	console.log(error);
});
