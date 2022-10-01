'use strict';

import { EmbedBuilder } from 'discord.js';

export const MemberBuilder = (member, joining = false, leaving = false) => {
	return new EmbedBuilder()
		.setAuthor({
			name: `${member.user.tag}`
		})
		.setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }))
		.setDescription(joining ? 'A rejoint le serveur.' : leaving ? 'A quitté le serveur.' : null)
		.setTimestamp(member.joinedAt)
		.setFooter({
			text: `ID: ${member.user.id}`
		})
		.setColor(joining ? '#4BC145' : leaving ? '#FF446D' : '#6C83F7')
		.addFields(
			{
				name: 'Rôles',
				value: joining ? 'Aucun' : member.roles.cache.map(role => role.toString()).join(', '),
			},
			{
				name: 'Nom sur le serveur',
				value: member.nickname ? member.nickname : 'Aucun',
			}
		)
};