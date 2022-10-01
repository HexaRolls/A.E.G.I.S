'use strict';

import { SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';

export default {
	type: 'global',
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Vérifie la latence du bot et de l\'API !'),
	async execute(interaction, { Client }) {
		await interaction.deferReply({
			ephemeral: true
		});

		const startTime = performance.now()

		await fetch(`https://${process.env.API_HOSTNAME}/server/ping`)

		const endTime = performance.now()

		interaction.editReply({
			content: `La latence du bot est de ${Client.ws.ping}ms et ${Math.floor(endTime - startTime)}ms pour l'API d'HexaRolls.`
		});
	},
};