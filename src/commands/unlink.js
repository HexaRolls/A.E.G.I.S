'use strict';

import { SlashCommandBuilder } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('unlink')
		.setDescription('Détachez votre compte HexaRolls de votre compte Discord.'),
	async execute(interaction, { Client, Socket }) {

		await interaction.deferReply({
			ephemeral: true
		});

		Socket.send(JSON.stringify({
			type: 'get',
			collection: 'discord_user',
			query: {
				filter: {
					discord_id: {
						_eq: interaction.user.id
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
					return interaction.editReply({
						content: 'Vous n\'avez pas de compte Discord associé.'
					});
				} else {
					const discord_user = data.data[0];

					Socket.send(JSON.stringify({
						type: 'get',
						collection: 'directus_users',
						query: {
							filter: {
								discord: {
									_eq: discord_user.id
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
									type: 'patch',
									collection: 'directus_users',
									id: user.id,
									data: {
										discord: null
									}
								}));

								Socket.send(JSON.stringify({
									type: 'delete',
									collection: 'discord_user',
									id: discord_user.id,
								}));

								try {
									Client.guilds.fetch(process.env.DISCORD_SERVER_ID).then(async guild => {
										const role = await guild.roles.fetch(process.env.DISCORD_SUBSCRIBER_ROLE);
										const member = await guild.members.fetch(discord_user.discord_id);

										if (!role || !member) return;

										member.roles.remove(role)
									})
								} catch (error) {
									console.error(error);
								}

								interaction.editReply({
									content: 'Compte délié avec succès !'
								});
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
	},
};