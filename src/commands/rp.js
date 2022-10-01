'use strict';

import { InteractionCollector, SlashCommandBuilder, ActionRowBuilder, SelectMenuBuilder, PermissionFlagsBits } from 'discord.js';
import { RpBuilder } from '../utils/embeds/Rp.js';

const buildRPMenu = (RPs, selected = null) => {
	return new ActionRowBuilder()
		.addComponents(new SelectMenuBuilder()
			.setCustomId('name')
			.setPlaceholder('Sélectionnez un RP parmis la liste')
			.addOptions(
				RPs.map(rp => ({
					label: rp.name,
					value: rp.id,
					description: `par ${rp.author.username} | \`${rp.tags.map(tag => tag.tag_id?.name).join('`, `')}\``,
					default: rp.id === selected
				}))
			),
		);
}

export default {
	data: new SlashCommandBuilder()
		.setName('rp')
		.setDescription('Commandes RP')
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
		.addSubcommand(subcommand => subcommand.setName('get')
			.addStringOption(option => option.setName('id')
				.setRequired(true)
				.setDescription('Identifiant du RP')
			)
			.setDescription('Récupère un RP dans la base de données')
		)
		.addSubcommand(subcommand => subcommand.setName('search')
			.addStringOption(option => option.setName('name')
				.setRequired(true)
				.setDescription('Nom du RP recherché')
			)
			.setDescription('Recherche un RP dans la base de données')
		),
	async execute(interaction, { Client, Socket }) {
		switch (interaction.options.getSubcommand()) {
			case 'get':
				await interaction.deferReply({
					ephemeral: true
				});
				const slug = interaction.options.getString('id');
				Socket.send(JSON.stringify({
					type: 'get',
					collection: 'roleplay',
					query: {
						filter: {
							id: {
								_eq: slug
							}
						},
						fields: [
							'id', 'name', 'slug', 'synopsis',
							'min_players', 'max_players', 'available',
							'location.platform.name', 'author.username', 'author.avatar',
							'system.name', 'system.url', 'system.author.name', 'system.author.url',
							'theme.hex', 'tags.tag_id.name',
							'stat_r', 'stat_v', 'stat_b'
						],
					}
				}));

				Socket.addEventListener('message', (e) => {
					const data = JSON.parse(e.data);
					if (data.type !== 'ERROR') {
						if (data.data.length === 0) {
							interaction.editReply({ content: 'Aucun RP trouvé' });
						} else {
							const rp = data.data[0];
							interaction.editReply({
								embeds: [
									RpBuilder(rp)
								]
							}).catch(err => {
								console.error(err);
								interaction.editReply({ content: 'Une erreur est survenue' });
							});
						}
					} else {
						interaction.editReply({ content: 'Mauvais format pour un slug' });
					}
				}, { once: true });
				break;
			case 'search':
				await interaction.deferReply({
					ephemeral: true
				});
				const name = interaction.options.getString('name');
				Socket.send(JSON.stringify({
					type: 'get',
					collection: 'roleplay',
					query: {
						search: name,
						fields: [
							'id', 'name', 'slug', 'synopsis',
							'min_players', 'max_players', 'available',
							'location.platform.name', 'author.username', 'author.avatar',
							'system.name', 'system.url', 'system.author.name', 'system.author.url',
							'theme.hex', 'tags.tag_id.name',
							'stat_r', 'stat_v', 'stat_b'
						],
					}
				}));

				Socket.addEventListener('message', async (e) => {
					const data = JSON.parse(e.data);
					if (data.type !== 'ERROR') {
						if (data.data.length === 0) {
							interaction.editReply({ content: 'Aucun RP trouvé' });
						} else {
							if (data.data.length === 1) {
								const rp = data.data[0];
								await interaction.editReply({
									embeds: [
										RpBuilder(rp)
									]
								}).catch(err => {
									console.error(err);
									interaction.editReply({ content: 'Une erreur est survenue' });
								});
							} else {
								const list = buildRPMenu(data.data)
								await interaction.editReply({
									components: [
										list
									],
									content: 'Plusieurs RPs ont été trouvés'
								}).catch(err => {
									console.error(err);
									interaction.editReply({ content: 'Une erreur est survenue' });
								});

								const collector = new InteractionCollector(Client, {
									type: 'MESSAGE_COMPONENT',
									time: 60000 * 5,
								});

								let lastRP = null;

								collector.on('collect', async i => {
									if (!i.isSelectMenu()) return;

									if (i.customId === 'name') {
										await i.deferUpdate()
										const rp = data.data.find(u => u.id === i.values[0]);
										if (rp) {
											lastRP = rp;
											i.editReply({
												embeds: [
													RpBuilder(rp)
												],
												components: [
													buildRPMenu(data.data, rp.id)
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
											embeds: lastRP ? [
												RpBuilder(lastRP)
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