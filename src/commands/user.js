'use strict';

import { InteractionCollector, SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, PermissionFlagsBits } from 'discord.js';
import { UserBuilder } from '../utils/embeds/User.js';

const buildUserMenu = (users, selected = null) => {
	return new ActionRowBuilder()
		.addComponents(new SelectMenuBuilder()
			.setCustomId('username')
			.setPlaceholder('Sélectionnez un utilisateur parmis la liste')
			.addOptions(
				users.slice(0, 25).map(user => ({
					label: user.username,
					value: user.id,
					description: `${user.email} - (${user.title})`,
					default: user.id === selected
				}))
			),
		);
}

export default {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Commandes utilisateur')
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
		.addSubcommand(subcommand => subcommand.setName('get')
			.addStringOption(option => option.setName('id')
				.setRequired(true)
				.setDescription('ID de l\'utilisateur')
			)
			.setDescription('Récupère un utilisateur dans la base de données')
		)
		.addSubcommand(subcommand => subcommand.setName('search')
			.addStringOption(option => option.setName('username')
				.setRequired(true)
				.setDescription('Nom d\'utilisateur')
			)
			.setDescription('Recherche un utilisateur dans la base de données')
		),
	async execute(interaction, { Client, Socket }) {
		switch (interaction.options.getSubcommand()) {
			case 'get':
				await interaction.deferReply({
					ephemeral: true
				});
				const id = interaction.options.getString('id');
				Socket.send(JSON.stringify({
					type: 'get',
					collection: 'directus_users',
					query: {
						filter: {
							id: {
								_eq: id
							}
						},
						fields: ['id', 'username', 'description', 'title', 'email', 'avatar', 'color_theme.hex', 'role.name', 'badges.badge_id.name'],
						limit: 25
					}
				}));

				Socket.addEventListener('message', (e) => {
					const data = JSON.parse(e.data);
					if (data.type !== 'ERROR') {
						if (data.data.length === 0) {
							interaction.editReply({ content: 'Aucun utilisateur trouvé' });
						} else {
							const user = data.data[0];
							interaction.editReply({
								embeds: [
									UserBuilder(user)
								]
							}).catch(err => {
								console.error(err);
								interaction.editReply({ content: 'Une erreur est survenue' });
							});
						}
					} else {
						interaction.editReply({ content: 'Mauvais format pour une ID' });
					}
				}, { once: true });
				break;
			case 'search':
				await interaction.deferReply({
					ephemeral: true
				});
				const username = interaction.options.getString('username');
				Socket.send(JSON.stringify({
					type: 'get',
					collection: 'directus_users',
					query: {
						search: username,
						fields: ['id', 'username', 'description', 'title', 'email', 'avatar', 'color_theme.hex', 'role.name', 'badges.badge_id.name'],
					}
				}));

				Socket.addEventListener('message', async (e) => {
					const data = JSON.parse(e.data);
					if (data.type !== 'ERROR') {
						if (data.data.length === 0) {
							interaction.editReply({ content: 'Aucun utilisateur trouvé' });
						} else {
							if (data.data.length === 1) {
								const user = data.data[0];
								await interaction.editReply({
									embeds: [
										UserBuilder(user)
									]
								}).catch(err => {
									console.error(err);
									interaction.editReply({ content: 'Une erreur est survenue' });
								});
							} else {
								const list = buildUserMenu(data.data)
								await interaction.editReply({
									components: [
										list
									],
									content: 'Plusieurs utilisateurs ont été trouvés'
								}).catch(err => {
									console.error(err);
									interaction.editReply({ content: 'Une erreur est survenue' });
								});

								const collector = new InteractionCollector(Client, {
									type: 'MESSAGE_COMPONENT',
									time: 60000 * 5,
								});

								let lastUser = null;

								collector.on('collect', async i => {
									if (!i.isSelectMenu()) return;

									if (i.customId === 'username') {
										await i.deferUpdate()
										const user = data.data.find(u => u.id === i.values[0]);
										if (user) {
											lastUser = user;
											i.editReply({
												embeds: [
													UserBuilder(user)
												],
												components: [
													buildUserMenu(data.data, user.id)
												],
											}).catch(err => {
												console.error(err);
												i.editReply({ content: 'Une erreur est survenue' });
											});
										}
									}
								});

								collector.on('end', (collected, reason) => {
									if (reason === 'time') {

										interaction.editReply({
											components: [],
											embeds: lastUser ? [
												UserBuilder(lastUser)
											]: [],
											content: 'La commande a expiré...'
										});
									}
								});
							}
						}
					}
				}, { once: true });
				break;
			default:
				interaction.editReply({ content: 'Commande inconnue' });
				break;
		}
	},
};