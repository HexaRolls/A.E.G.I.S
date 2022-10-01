function extendDefaults(source, properties) {
	let property;
	for (property in properties) {
		if (properties.hasOwnProperty(property)) {
			source[property] = properties[property];
		}
	}
	return source;
}

export const drawprogressbar = (config) => {

	let options;
	const defaults = {
		openCharacter: "[",
		loadedCharacter: "#",
		backgroundCharacter: " ",
		closeCharacter: "]",

		length: 60,
		value: 0,
		completeAt: 100,
	}

	// Create options by extending defaults with the passed in arguments
	if (config && typeof config === "object") {
		options = extendDefaults(defaults, config);
	} else {
		options = defaults
	}

	var amountPerBlock = options.completeAt / options.length
	var blocks = Math.ceil(options.value / amountPerBlock);

	let str = ""
	str += options.openCharacter
	str += options.loadedCharacter.repeat(blocks)
	str += options.backgroundCharacter.repeat(options.length - blocks)
	str += options.closeCharacter

	return str
}