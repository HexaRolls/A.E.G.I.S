'use strict';

import { EmbedBuilder } from 'discord.js';
import { drawprogressbar } from '../drawProgressBar.js';

export const RpBuilder = (rp, offline = false) => {
	const fields = [];

	const options = {
		backgroundCharacter: '▫',
		length: 12,
		openCharacter: '< ',
		closeCharacter: ' >',
	}

	fields.push({
		name: 'Axes',
		value: `**Ressemblance :** \r\n\r\n${drawprogressbar({ value: rp.stat_r, loadedCharacter: '🟥', ...options })}\r\n` +
			`\r\n**Vraisemblance :** \r\n\r\n${drawprogressbar({ value: rp.stat_v, loadedCharacter: '🟪', ...options })}\r\n` +
			`\r\n**Bienveillance :** \r\n\r\n${drawprogressbar({ value: rp.stat_b, loadedCharacter: '🟦', ...options })}\r\n`,
		inline: false
	})

	if (rp.tags.length) fields.push({
		name: 'Tags',
		value: `\`${rp.tags.map(tag => tag.tag_id?.name).join('`, `')}\``,
		inline: true
	});

	if (rp.system && typeof rp.system !== 'string') fields.push({
		name: 'Système',
		value: [
			(rp.system.url ? `[${rp.system.name}](${rp.system.url})` : rp.system.name),
			(rp.system.author && typeof rp.system.author !== 'string' ? rp.system.author.url ? `[${rp.system.author.name}](${rp.system.author.url})` : rp.system.author.name : '')
		].join(' '),
		inline: true
	});

	let value = rp.available === 0 ?
		'**Aucune** places dispo'
		: rp.available > -1 ?
			`**${rp.available}** sur ${rp.max_players} places dispo`
			: rp.max_players ?
				`**${rp.max_players}** joueurs max`
				: 'Non spécifiés'


	if (rp.min_players) value += `(  ${rp.min_players} joueur${rp.available > 1 ? 's' : ''} min )`;

	fields.push({
		name: 'Places dispo',
		value,
		inline: true
	});

	return new EmbedBuilder()
		.setTitle(`${rp.name}`)
		.setURL(offline ? `https://${process.env.API_HOSTNAME}/admin/content/roleplay/${rp.id}` : `https://hexarolls.com/rp/${rp.slug}`)
		.setDescription(rp.synopsis.length > 256 ? rp.synopsis.substr(0, 253) + '...' : rp.synopsis)
		.setImage(offline ? null : `https://hexarolls.com/assets/images/roleplays/${rp.slug}.jpg`)
		.setFooter({
			text: `Créé par ${rp.author.username} | ID: ${rp.id}`,
			iconURL: rp.author.avatar ?
				`https://${process.env.API_HOSTNAME}/assets/${rp.author.avatar}.png` :
				`https://avatars.dicebear.com/api/identicon/${rp.author.username}.png`
		})
		.setColor(rp.theme?.hex || 0)
		.addFields(fields);
}