'use strict';

import { EmbedBuilder } from 'discord.js';

export const DiffBuilder = (diff, oldMessage, newMessage, deletion = null) => {
	return new EmbedBuilder()
		.setAuthor({
			name: `${oldMessage.author.tag} (${oldMessage.author.id})`,
			iconURL: oldMessage.author.displayAvatarURL({ format: 'png', dynamic: true }),
			url: deletion ? null : `https://discord.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id}`
		})
		.setDescription(
			`Nouveau message ${deletion ? 'supprimé' : 'modifié'} dans ${oldMessage.channel.toString()}\n`
			+ diff +
			(deletion ? '' : `\n([Voir le message original](https://discord.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id}))`)
		)
		.setTimestamp(deletion ? deletion.getTime() : newMessage.editedAt)
		.setFooter({
			text: `Message ID: ${oldMessage.id}`
		})
		.setColor(deletion ? '#FF446D' : '#6C83F7')
};