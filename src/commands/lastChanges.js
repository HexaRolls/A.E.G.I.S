'use strict';

import { ContextMenuCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { SnowflakeUtil } from 'discord.js';

export default {
	data: new ContextMenuCommandBuilder()
		.setName('Voir les logs')
		.setType(ApplicationCommandType.User)
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
	async execute(interaction, { Client, Socket }) {

		await interaction.deferReply({
			ephemeral: true
		});

		Client.channels.fetch(process.env.DISCORD_LOG_MESSAGE).then(async channel => {
			const messages = await channel.messages.fetch({
				after: SnowflakeUtil.generate(new Date().getTime() - (30 * 24 * 60 * 60 * 1000)),
				limit: 100
			})

			const filter = (message) =>
				message.author.id === Client.user.id &&
				message.embeds.length > 0 &&
				message.embeds[0].author.name.indexOf(interaction.targetId) !== -1;

			const latestLogMessages = messages.filter(filter).toJSON().splice(0, 10);

			if (latestLogMessages.length === 0) {
				return interaction.editReply({ content: 'Aucune log trouvée depuis ce dernier mois.' });
			}

			const embeds = latestLogMessages.map(message => message.embeds[0]);

			interaction.editReply({
				content: `Voici les ${embeds.length} dernières logs datant de moins d'un mois.`,
				embeds,
			});
		});
	}
};