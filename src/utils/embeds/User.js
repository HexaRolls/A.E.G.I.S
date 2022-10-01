'use strict';

import { EmbedBuilder } from 'discord.js';

export const UserBuilder = (user = null, offline = false) => {
	if (!user || typeof user !== 'object') {
		return new EmbedBuilder()
			.setTitle(`Utilisateur inconnu`)
			.setDescription(`une erreur est survenue et aucun utilisateur n'as pu être récupéré`)
	}
	const fields = [];

	if (user.email) fields.push({
		name: 'Email',
		value: user.email,
		inline: true
	});

	if (user.role && typeof user.role !== 'string') fields.push({
		name: 'Rôle',
		value: user.role.name,
		inline: true
	});

	if (user.badges.length && !user.badges.some(b => b.badge_id === 'string')) fields.push({
		name: 'Badges',
		value: `\`${user.badges.map(badge => badge.badge_id?.name).join('`, `')}\``,
		inline: false
	});

	return new EmbedBuilder()
		.setTitle(`${user.username}`)
		.setURL(offline ? `https://${process.env.API_HOSTNAME}/admin/users/${user.id}` : null)
		.setThumbnail(user.avatar ? `https://${process.env.API_HOSTNAME}/assets/${user.avatar}.png`: `https://avatars.dicebear.com/api/identicon/${user.username}.png`)
		.setDescription(`${user.title ? `\`${user.title}\`\n\r` : ''}${user.description ? user.description : '*Aucune description*'}`)
		.setFooter({ text: `ID: ${user.id}` })
		.setColor(user.color_theme?.hex || 0)
		.addFields(fields);
}