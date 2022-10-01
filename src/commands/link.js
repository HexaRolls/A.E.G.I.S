'use strict';

import { SlashCommandBuilder } from 'discord.js';
import fetch from 'node-fetch';

export default {
	data: new SlashCommandBuilder()
		.setName('link')
		.setDescription('Permet de lier un compte HexaRolls à ton compte Discord !'),
	async execute(interaction, { Client, Socket }) {

		await interaction.deferReply({
			ephemeral: true
		});

		fetch(process.env.SUB_API_URL + '/create-user-link-code', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'hexarolls-signature': process.env.SUB_API_TOKEN
			},
			body: JSON.stringify({
				id: interaction.user.id
			})
		}).then(async response => {
			const data = await response.json();
			if (data.error) {
				return interaction.editReply({ content: data.error });
			}

			interaction.editReply({
				embeds: [{
					title: 'Lie maintenant ton compte !',
					description: `Pour lier ton compte au site, copie ce code dans la section [compte discord de tes paramètres](https://hexarolls.com/account/settings/) : \`\`\`${data.code}\`\`\``,
				}]
			});
		});
	},
};