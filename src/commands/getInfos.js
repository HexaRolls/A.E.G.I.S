'use strict';

import { ContextMenuCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { MemberBuilder } from '../utils/embeds/Member.js';

export default {
	data: new ContextMenuCommandBuilder()
		.setName(`Voir les infos`)
		.setType(ApplicationCommandType.User)
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
	async execute(interaction, { Client, Socket }) {
		interaction.reply({
			embeds: [
				MemberBuilder(interaction.targetMember),
			],
			ephemeral: true
		})
	}
};